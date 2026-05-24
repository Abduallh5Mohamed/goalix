const crypto = require('node:crypto');
const env = require('../../config/env');
const { UnauthorizedError, BadRequestError } = require('../../shared/errors');

function loadTotpDependencies() {
    return {
        otplib: require('otplib'),
        QRCode: require('qrcode'),
    };
}

class TotpService {
    constructor(authRepository) {
        this.repo = authRepository;
    }

    async setup(userId) {
        const user = await this.repo.findById(userId);
        if (!user) throw new UnauthorizedError('User not found');
        if (user.totp_enabled) throw new BadRequestError('2FA is already enabled');

        const { otplib, QRCode } = loadTotpDependencies();
        const { generateSecret, generateURI } = otplib;
        const secret = generateSecret({ length: 20 });
        await this.repo.setTotpSecret(userId, secret);

        const otpauth = generateURI({
            accountName: user.email || user.username || user.phone || user.id,
            issuer: env.TOTP_ISSUER,
            secret,
        });
        const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

        return { secret, qrCode: qrCodeDataUrl };
    }

    async verifyAndEnable(userId, token) {
        const user = await this.repo.findById(userId);
        if (!user || !user.totp_secret) throw new BadRequestError('2FA setup not initiated');
        if (user.totp_enabled) throw new BadRequestError('2FA is already enabled');

        const { verifySync } = loadTotpDependencies().otplib;
        const result = verifySync({ token, secret: user.totp_secret });
        if (!result.valid) throw new UnauthorizedError('Invalid TOTP code');

        await this.repo.enableTotp(userId);

        // Generate 10 backup codes
        const backupCodes = [];
        const codeHashes = [];
        for (let i = 0; i < 10; i++) {
            const code = crypto.randomBytes(4).toString('hex'); // 8-char hex
            backupCodes.push(code);
            codeHashes.push(crypto.createHash('sha256').update(code).digest('hex'));
        }

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
        const result = verifySync({ token, secret: user.totp_secret });
        if (!result.valid) throw new UnauthorizedError('Invalid TOTP code');

        return true;
    }

    async verifyBackupCode(userId, code) {
        const codeHash = crypto.createHash('sha256').update(code).digest('hex');
        const backupCode = await this.repo.findUnusedBackupCode(userId, codeHash);
        if (!backupCode) throw new UnauthorizedError('Invalid or already used backup code');

        await this.repo.markBackupCodeUsed(backupCode.id);
        return true;
    }

    async disable(userId, password) {
        const bcrypt = require('bcrypt');
        const user = await this.repo.findById(userId);
        if (!user) throw new UnauthorizedError('User not found');

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) throw new UnauthorizedError('Invalid password');

        await this.repo.disableTotp(userId);
        await this.repo.deleteBackupCodes(userId);

        return { message: '2FA disabled successfully' };
    }
}

module.exports = TotpService;
