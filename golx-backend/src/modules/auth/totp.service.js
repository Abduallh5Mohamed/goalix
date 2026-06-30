const crypto = require('node:crypto');
const env = require('../../config/env');
const { UnauthorizedError, BadRequestError } = require('../../shared/errors');
const { decryptText, encryptText } = require('../../shared/crypto-at-rest');

function loadTotpDependencies() {
    return {
        otplib: require('otplib'),
        QRCode: require('qrcode'),
    };
}

function issuerForRole(role) {
    if (role === 'admin') return 'Goalix Academy Admin';
    if (role === 'coach') return 'Goalix Academy Coach';
    return env.TOTP_ISSUER;
}

function publicDevice(row) {
    return {
        id: row.id,
        deviceName: row.device_name,
        status: row.status,
        isPrimary: Boolean(row.is_primary),
        verifiedAt: row.verified_at,
        lastUsedAt: row.last_used_at,
        createdAt: row.created_at,
    };
}

function generateBackupCodes() {
    const backupCodes = [];
    const codeHashes = [];
    for (let i = 0; i < 10; i++) {
        const code = crypto.randomBytes(4).toString('hex');
        backupCodes.push(code);
        codeHashes.push(crypto.createHash('sha256').update(code).digest('hex'));
    }
    return { backupCodes, codeHashes };
}

class TotpService {
    constructor(authRepository) {
        this.repo = authRepository;
    }

    async setup(userId) {
        const user = await this.repo.findById(userId);
        if (!user) throw new UnauthorizedError('User not found');
        if (user.totp_enabled) throw new BadRequestError('2FA is already enabled');
        await this.repo.deletePendingTotpDevices(userId);

        const { otplib, QRCode } = loadTotpDependencies();
        const { generateSecret, generateURI } = otplib;
        const secret = generateSecret({ length: 20 });
        const encryptedSecret = encryptText(secret);
        await this.repo.setTotpSecret(userId, encryptedSecret);
        const device = await this.repo.createTotpDevice(userId, {
            deviceName: 'Primary device',
            secret: encryptedSecret,
            status: 'pending',
            isPrimary: true,
        });

        const otpauth = generateURI({
            accountName: user.email || user.username || user.phone || user.id,
            issuer: issuerForRole(user.role),
            secret,
        });
        const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

        return { deviceId: device.id, deviceName: device.device_name, issuer: issuerForRole(user.role), secret, qrCode: qrCodeDataUrl };
    }

    async verifyAndEnable(userId, token) {
        const user = await this.repo.findById(userId);
        if (!user || !user.totp_secret) throw new BadRequestError('2FA setup not initiated');
        if (user.totp_enabled) throw new BadRequestError('2FA is already enabled');

        const { verifySync } = loadTotpDependencies().otplib;
        const result = verifySync({ token, secret: decryptText(user.totp_secret) });
        if (!result.valid) throw new UnauthorizedError('Invalid TOTP code');

        const pendingDevices = await this.repo.db('auth_totp_devices')
            .where({ user_id: userId, status: 'pending' })
            .whereNull('revoked_at')
            .orderBy('created_at', 'desc');
        if (pendingDevices[0]) {
            await this.repo.activateTotpDevice(userId, pendingDevices[0].id);
        }
        await this.repo.enableTotp(userId);

        const { backupCodes, codeHashes } = generateBackupCodes();

        await this.repo.deleteBackupCodes(userId);
        await this.repo.createBackupCodes(userId, codeHashes);

        return { backupCodes };
    }

    async verify(userId, token) {
        const user = await this.repo.findById(userId);
        if (!user || !user.totp_enabled || !user.totp_secret) {
            throw new UnauthorizedError('2FA is not enabled');
        }

        const { verifySync } = loadTotpDependencies().otplib;
        const devices = await this.repo.findActiveTotpDevices(userId);
        for (const device of devices) {
            const result = verifySync({ token, secret: decryptText(device.secret) });
            if (result.valid) {
                await this.repo.touchTotpDevice(device.id);
                return true;
            }
        }

        if (devices.length > 0) throw new UnauthorizedError('Invalid TOTP code');

        const legacyResult = verifySync({ token, secret: decryptText(user.totp_secret) });
        if (!legacyResult.valid) throw new UnauthorizedError('Invalid TOTP code');

        return true;
    }

    async listDevices(userId) {
        const devices = await this.repo.findActiveTotpDevices(userId);
        return devices.map(publicDevice);
    }

    async setupDevice(userId, { deviceName } = {}) {
        const user = await this.repo.findById(userId);
        if (!user) throw new UnauthorizedError('User not found');
        if (!user.totp_enabled) throw new BadRequestError('Enable 2FA before adding another device');
        const activeDevices = await this.repo.findActiveTotpDevices(userId);

        const { otplib, QRCode } = loadTotpDependencies();
        const { generateSecret, generateURI } = otplib;
        const secret = generateSecret({ length: 20 });
        const device = await this.repo.createTotpDevice(userId, {
            deviceName: deviceName || 'Authenticator app',
            secret: encryptText(secret),
            status: 'pending',
            isPrimary: activeDevices.length === 0,
        });

        const otpauth = generateURI({
            accountName: user.email || user.username || user.phone || user.id,
            issuer: issuerForRole(user.role),
            secret,
        });
        const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

        return {
            deviceId: device.id,
            deviceName: device.device_name,
            issuer: issuerForRole(user.role),
            secret,
            qrCode: qrCodeDataUrl,
        };
    }

    async verifyDevice(userId, deviceId, token) {
        const device = await this.repo.findTotpDeviceById(userId, deviceId);
        if (!device || device.status !== 'pending') {
            throw new BadRequestError('MFA device setup not found');
        }

        const { verifySync } = loadTotpDependencies().otplib;
        const result = verifySync({ token, secret: decryptText(device.secret) });
        if (!result.valid) throw new UnauthorizedError('Invalid TOTP code');

        const activated = await this.repo.activateTotpDevice(userId, deviceId);
        return publicDevice(activated);
    }

    async revokeDevice(userId, deviceId) {
        const user = await this.repo.findById(userId);
        if (!user) throw new UnauthorizedError('User not found');
        const devices = await this.repo.findActiveTotpDevices(userId);
        const targetDevice = devices.find((device) => device.id === deviceId);
        if (targetDevice?.is_primary) {
            throw new BadRequestError('Primary MFA device cannot be removed');
        }
        if (
            devices.length <= 1 &&
            targetDevice &&
            !user.totp_secret
        ) {
            throw new BadRequestError('At least one active MFA device is required');
        }

        const revoked = await this.repo.revokeTotpDevice(userId, deviceId);
        if (!revoked) throw new BadRequestError('MFA device not found');
        return publicDevice(revoked);
    }

    async verifyBackupCode(userId, code) {
        const codeHash = crypto.createHash('sha256').update(code).digest('hex');
        const backupCode = await this.repo.findUnusedBackupCode(userId, codeHash);
        if (!backupCode) throw new UnauthorizedError('Invalid or already used backup code');

        await this.repo.markBackupCodeUsed(backupCode.id);
        return true;
    }

    async regenerateBackupCodes(userId, password) {
        const bcrypt = require('bcrypt');
        const user = await this.repo.findById(userId);
        if (!user || !user.totp_enabled) throw new UnauthorizedError('2FA is not enabled');

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) throw new UnauthorizedError('Invalid password');

        const { backupCodes, codeHashes } = generateBackupCodes();
        await this.repo.deleteBackupCodes(userId);
        await this.repo.createBackupCodes(userId, codeHashes);

        return { backupCodes };
    }

    async disable(userId, password) {
        const bcrypt = require('bcrypt');
        const user = await this.repo.findById(userId);
        if (!user) throw new UnauthorizedError('User not found');

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) throw new UnauthorizedError('Invalid password');

        await this.repo.disableTotp(userId);
        await this.repo.db('auth_totp_devices')
            .where({ user_id: userId })
            .whereNull('revoked_at')
            .update({
                status: 'revoked',
                revoked_at: new Date(),
                updated_at: new Date(),
            });
        await this.repo.deleteBackupCodes(userId);

        return { message: '2FA disabled successfully' };
    }
}

module.exports = TotpService;
