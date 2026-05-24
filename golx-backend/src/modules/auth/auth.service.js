const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const env = require('../../config/env');
const eventBus = require('../../events/eventBus');
const AUTH_EVENTS = require('./auth.events');
const { UnauthorizedError, ConflictError, NotFoundError } = require('../../shared/errors');
const logger = require('../../shared/logger');

class AuthService {
    constructor(authRepository, redis) {
        this.repo = authRepository;
        this.redis = redis;
    }

    // ─── Register ───────────────────────────────────────────────────────
    async register({ email, phone, password, role, academyId }) {
        // Check if user already exists
        const existing = await this.repo.findByEmailOrPhone(email, phone);
        if (existing) {
            throw new ConflictError('User with this email or phone already exists');
        }

        const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

        const user = await this.repo.create({
            email: email || null,
            phone: phone || null,
            password_hash: passwordHash,
            role,
            academy_id: academyId || null,
            is_active: true,
        });

        eventBus.publish(AUTH_EVENTS.USER_REGISTERED, {
            userId: user.id,
            role: user.role,
            academyId: user.academy_id,
            email: user.email,
        });

        // Generate tokens
        const tokens = await this._generateTokens(user);

        return {
            user: this._sanitizeUser(user),
            ...tokens,
        };
    }

    // ─── Login ──────────────────────────────────────────────────────────
    async login({ email, phone, password }, ip, userAgent) {
        const user = await this.repo.findByEmailOrPhone(email, phone);
        if (!user) {
            throw new UnauthorizedError('Invalid credentials');
        }

        if (!user.is_active) {
            throw new UnauthorizedError('Account is deactivated');
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            throw new UnauthorizedError('Invalid credentials');
        }

        await this.repo.updateLastLogin(user.id);

        const tokens = await this._generateTokens(user, ip, userAgent);

        eventBus.publish(AUTH_EVENTS.USER_LOGGED_IN, {
            userId: user.id,
            role: user.role,
            ip,
        });

        // Audit log
        await this.repo.createAuditLog({
            user_id: user.id,
            action: 'login',
            table_name: 'auth_users',
            record_id: user.id,
            ip_address: ip,
        });

        return {
            user: this._sanitizeUser(user),
            ...tokens,
        };
    }

    // ─── Logout ─────────────────────────────────────────────────────────
    async logout(userId, refreshTokenHash) {
        if (refreshTokenHash) {
            const token = await this.repo.findRefreshTokenByHash(refreshTokenHash);
            if (token) {
                await this.repo.revokeRefreshToken(token.id);
            }
        }

        // Also remove from Redis if cached
        await this.redis.del(`golx:auth:refresh:${userId}`);

        eventBus.publish(AUTH_EVENTS.USER_LOGGED_OUT, { userId });
    }

    // ─── Refresh Token ──────────────────────────────────────────────────
    async refreshToken(refreshToken) {
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
        } catch {
            throw new UnauthorizedError('Invalid or expired refresh token');
        }

        // Hash the token to find it in DB
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        const storedToken = await this.repo.findRefreshTokenByHash(tokenHash);
        if (!storedToken) {
            throw new UnauthorizedError('Refresh token not found or revoked');
        }

        // Revoke old token (rotation)
        await this.repo.revokeRefreshToken(storedToken.id);

        // Get user
        const user = await this.repo.findById(decoded.userId);
        if (!user || !user.is_active) {
            throw new UnauthorizedError('User not found or deactivated');
        }

        // Generate new tokens
        const tokens = await this._generateTokens(user);

        eventBus.publish(AUTH_EVENTS.TOKEN_REFRESHED, { userId: user.id });

        return {
            user: this._sanitizeUser(user),
            ...tokens,
        };
    }

    // ─── Forgot Password ───────────────────────────────────────────────
    async forgotPassword(email) {
        const user = await this.repo.findByEmail(email);
        if (!user) {
            // Return success anyway to prevent email enumeration
            return { message: 'If the email exists, a reset link will be sent' };
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

        await this.repo.createPasswordReset({
            user_id: user.id,
            token_hash: tokenHash,
            expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
            is_used: false,
        });

        eventBus.publish(AUTH_EVENTS.PASSWORD_RESET_REQ, {
            userId: user.id,
            email: user.email,
            resetToken, // Notification worker will include this in the email
        });

        return { message: 'If the email exists, a reset link will be sent' };
    }

    // ─── Reset Password ────────────────────────────────────────────────
    async resetPassword(token, newPassword) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const resetRecord = await this.repo.findValidPasswordReset(tokenHash);
        if (!resetRecord) {
            throw new UnauthorizedError('Invalid or expired reset token');
        }

        const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
        await this.repo.update(resetRecord.user_id, { password_hash: passwordHash });
        await this.repo.markPasswordResetUsed(resetRecord.id);

        // Revoke all refresh tokens for security
        await this.repo.revokeAllUserTokens(resetRecord.user_id);

        eventBus.publish(AUTH_EVENTS.PASSWORD_CHANGED, { userId: resetRecord.user_id });

        return { message: 'Password reset successful' };
    }

    // ─── Private Helpers ────────────────────────────────────────────────
    async _generateTokens(user, ip, userAgent) {
        const payload = {
            userId: user.id,
            role: user.role,
            academyId: user.academy_id,
        };

        const accessToken = jwt.sign(payload, env.JWT_SECRET, {
            expiresIn: env.JWT_ACCESS_EXPIRY,
            algorithm: 'HS256',
        });

        const refreshToken = jwt.sign(
            { userId: user.id },
            env.JWT_REFRESH_SECRET,
            { expiresIn: env.JWT_REFRESH_EXPIRY, algorithm: 'HS256' },
        );

        // Store refresh token hash in DB
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await this.repo.createRefreshToken({
            user_id: user.id,
            token_hash: tokenHash,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });

        // Cache in Redis for quick lookup
        await this.redis.set(
            `golx:auth:refresh:${user.id}`,
            tokenHash,
            'EX',
            7 * 24 * 60 * 60,
        );

        return { accessToken, refreshToken };
    }

    _sanitizeUser(user) {
        return {
            id: user.id,
            email: user.email,
            phone: user.phone,
            role: user.role,
            academyId: user.academy_id,
            isActive: user.is_active,
            isVerified: user.is_verified,
            lastLoginAt: user.last_login_at,
            createdAt: user.created_at,
        };
    }
}

module.exports = AuthService;
