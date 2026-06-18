const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const env = require('../../config/env');
const eventBus = require('../../events/eventBus');
const AUTH_EVENTS = require('./auth.events');
const {
    UnauthorizedError,
    ConflictError,
    NotFoundError,
    ForbiddenError,
} = require('../../shared/errors');
const logger = require('../../shared/logger');
const { ensureIamForAuthUser } = require('../../shared/iam-sync');

class AuthService {
    constructor(authRepository, redis) {
        this.repo = authRepository;
        this.redis = redis;
    }

    // ─── Signup (creates pending registration for approval) ─────────────
    async signup({ email, phone, password, role, fullName, linkedPlayerId, academyId }) {
        // Check if there's already an active account — return generic success to prevent enumeration
        const existing = await this.repo.findByEmailOrPhone(email, phone);
        if (existing) {
            // Don't reveal that the account exists — return same success message
            logger.info(`Signup attempt for existing email/phone: ${email}`);
            return {
                message: 'Registration submitted successfully. You will be notified once approved.',
                status: 'pending',
            };
        }

        // If parent: validate that the linked player exists
        if (role === 'parent') {
            if (!linkedPlayerId) {
                throw new ConflictError('Player ID is required for parent accounts');
            }
            const player = await this.repo.findPlayerById(linkedPlayerId);
            if (!player) {
                throw new NotFoundError('Player not found with the provided ID');
            }
        }

        const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

        const pending = await this.repo.createPendingRegistration({
            email: email || null,
            phone: phone || null,
            password_hash: passwordHash,
            full_name: fullName,
            role,
            academy_id: academyId || null,
            linked_player_id: linkedPlayerId || null,
            status: 'pending',
        });

        // Audit log for new signup
        await this.repo.createAuditLog({
            action: 'signup_submitted',
            table_name: 'pending_registrations',
            record_id: pending.id,
            metadata: JSON.stringify({ email, role }),
        });

        return {
            message: 'Registration submitted successfully. You will be notified once approved.',
            registrationId: pending.id,
            status: 'pending',
        };
    }

    // ─── Registration Status ─────────────────────────────────────────────
    async getRegistrationStatus(email) {
        const pending = await this.repo.findLatestPendingByEmail(email);
        if (!pending) {
            return { status: 'not_found' };
        }
        return {
            status: pending.status,
            role: pending.role,
            fullName: pending.full_name,
            rejectionReason: pending.rejection_reason || null,
            createdAt: pending.created_at,
            reviewedAt: pending.reviewed_at || null,
        };
    }

    // ─── Register (kept for coach/admin creation by admin) ───────────────
    async register({ username, email, phone, password, role, academyId }, actor = {}) {
        if (actor.role === 'coach' && !['player', 'parent'].includes(role)) {
            throw new ForbiddenError('Coaches can only create player or parent accounts');
        }

        const normalizedUsername = username ? username.trim().toLowerCase() : null;
        const normalizedEmail = email ? email.trim().toLowerCase() : null;

        // Check if user already exists
        const existing = await this.repo.findByEmailPhoneOrUsername(normalizedEmail, phone, normalizedUsername);
        if (existing) {
            throw new ConflictError('User with this email, username, or phone already exists');
        }

        const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

        const user = await this.repo.create({
            username: normalizedUsername,
            email: normalizedEmail,
            phone: phone || null,
            password_hash: passwordHash,
            role,
            academy_id: academyId || actor.academyId || null,
            is_active: true,
        });

        await ensureIamForAuthUser(this.repo.db, user, {
            fullName: username || normalizedEmail || phone,
            grantedBy: actor.userId || null,
        });

        eventBus.publish(AUTH_EVENTS.USER_REGISTERED, {
            userId: user.id,
            role: user.role,
            academyId: user.academy_id,
            email: user.email,
            username: user.username,
        });

        return {
            user: this._sanitizeUser(user),
        };
    }

    // ─── Login ──────────────────────────────────────────────────────────
    async login({ username, email, phone, password, role, allowedRoles }, ip, userAgent) {
        const normalizedUsername = username ? username.trim().toLowerCase() : null;
        const credentialMode = email ? 'email' : phone ? 'phone' : 'username';
        const user = await this.repo.findByEmailPhoneOrUsername(email, phone, normalizedUsername);
        if (!user) {
            throw new UnauthorizedError('Invalid credentials');
        }

        if (Array.isArray(allowedRoles) && !allowedRoles.includes(user.role)) {
            throw new UnauthorizedError('Invalid credentials');
        }

        if (role && user.role !== role) {
            throw new UnauthorizedError('Invalid credentials');
        }

        if (user.role === 'admin' && credentialMode !== 'email') {
            throw new UnauthorizedError('Invalid credentials');
        }

        if (user.role === 'admin') {
            const adminAccount = await this.repo.findActiveAdminAccount(user.id);
            if (!adminAccount) {
                throw new UnauthorizedError('Admin account is not active');
            }
        }

        if (user.role === 'coach' && !['email', 'username'].includes(credentialMode)) {
            throw new UnauthorizedError('Invalid credentials');
        }

        if (['player', 'parent'].includes(user.role) && credentialMode !== 'username') {
            throw new UnauthorizedError('Invalid credentials');
        }

        if (!user.is_active) {
            throw new UnauthorizedError('Account is deactivated');
        }

        // Check account lockout
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const remainingMs = new Date(user.locked_until) - new Date();
            const remainingMin = Math.ceil(remainingMs / 60000);
            throw new UnauthorizedError(`Account is locked. Try again in ${remainingMin} minutes`);
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            // Increment failed attempts
            await this.repo.incrementFailedAttempts(user.id);
            const maxAttempts = user.role === 'admin'
                ? env.ADMIN_MAX_FAILED_LOGIN_ATTEMPTS
                : env.MAX_FAILED_LOGIN_ATTEMPTS;
            const currentAttempts = (user.failed_login_attempts || 0) + 1;

            if (currentAttempts >= maxAttempts) {
                const lockoutMinutes = user.role === 'admin'
                    ? env.ADMIN_LOCKOUT_DURATION_MINUTES
                    : env.LOCKOUT_DURATION_MINUTES;
                const lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
                await this.repo.lockAccount(user.id, lockedUntil);

                // Audit log for lockout
                await this.repo.createAuditLog({
                    user_id: user.id,
                    action: 'account_locked',
                    table_name: 'auth_users',
                    record_id: user.id,
                    ip_address: ip,
                    user_agent: userAgent,
                    metadata: JSON.stringify({ attempts: currentAttempts, lockoutMinutes }),
                });
            }

            throw new UnauthorizedError('Invalid credentials');
        }

        // Reset failed attempts on successful password
        if (user.failed_login_attempts > 0) {
            await this.repo.resetFailedAttempts(user.id);
        }

        // Check if 2FA is required
        if (user.totp_enabled) {
            // Return a temporary token for 2FA verification
            const tempToken = jwt.sign(
                { userId: user.id, purpose: '2fa' },
                env.JWT_SECRET,
                { expiresIn: '5m', algorithm: 'HS256' },
            );

            return {
                requires2FA: true,
                tempToken,
                user: { id: user.id, email: user.email, username: user.username, role: user.role },
            };
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
            user_agent: userAgent,
        });

        return {
            user: this._sanitizeUser(await this._attachProfileName(user)),
            ...tokens,
        };
    }

    // ─── Complete Login After 2FA ───────────────────────────────────────
    async completeLoginAfter2FA(tempToken, ip, userAgent) {
        let decoded;
        try {
            decoded = jwt.verify(tempToken, env.JWT_SECRET);
        } catch {
            throw new UnauthorizedError('Invalid or expired 2FA token');
        }

        if (decoded.purpose !== '2fa') {
            throw new UnauthorizedError('Invalid token purpose');
        }

        const user = await this.repo.findById(decoded.userId);
        if (!user || !user.is_active) {
            throw new UnauthorizedError('User not found or deactivated');
        }

        await this.repo.updateLastLogin(user.id);
        const tokens = await this._generateTokens(user, ip, userAgent);

        eventBus.publish(AUTH_EVENTS.USER_LOGGED_IN, {
            userId: user.id,
            role: user.role,
            ip,
        });

        await this.repo.createAuditLog({
            user_id: user.id,
            action: 'login_2fa',
            table_name: 'auth_users',
            record_id: user.id,
            ip_address: ip,
            user_agent: userAgent,
        });

        return {
            user: this._sanitizeUser(await this._attachProfileName(user)),
            ...tokens,
        };
    }

    // ─── Logout ─────────────────────────────────────────────────────────
    async logout(userId, refreshTokenHash, ip, userAgent, accessJti) {
        if (refreshTokenHash) {
            const token = await this.repo.findRefreshTokenByHash(refreshTokenHash);
            if (token) {
                await this.repo.revokeRefreshToken(token.id);
            }
        }
        await this.repo.revokeAccessSessionByJti(userId, accessJti, 'logout');

        // Also remove from Redis if cached (best-effort)
        try { await this.redis.del(`golx:auth:refresh:${userId}`); } catch { /* Redis unavailable */ }

        // Audit log
        await this.repo.createAuditLog({
            user_id: userId,
            action: 'logout',
            table_name: 'auth_users',
            record_id: userId,
            ip_address: ip,
            user_agent: userAgent,
            session_jti: accessJti || null,
        });

        eventBus.publish(AUTH_EVENTS.USER_LOGGED_OUT, { userId });
    }

    // ─── Logout All Devices ─────────────────────────────────────────────
    async logoutAllDevices(userId, ip, userAgent) {
        await this.repo.revokeAllUserTokens(userId);
        try { await this.redis.del(`golx:auth:refresh:${userId}`); } catch { /* */ }

        await this.repo.createAuditLog({
            user_id: userId,
            action: 'logout_all_devices',
            table_name: 'auth_users',
            record_id: userId,
            ip_address: ip,
            user_agent: userAgent,
        });

        eventBus.publish(AUTH_EVENTS.USER_LOGGED_OUT, { userId });
        return { message: 'Logged out from all devices' };
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
            // ── Refresh token reuse detection ──────────────────────────
            // If the token is valid JWT but not in DB, it was already rotated.
            // This means a previously-rotated token was replayed → possible theft.
            // Revoke ALL tokens for this user as a security measure.
            logger.warn(`Refresh token reuse detected for userId=${decoded.userId} — revoking all tokens`);
            await this.repo.revokeAllUserTokens(decoded.userId);
            try { await this.redis.del(`golx:auth:refresh:${decoded.userId}`); } catch { /* */ }

            await this.repo.createAuditLog({
                user_id: decoded.userId,
                action: 'refresh_token_reuse_detected',
                table_name: 'auth_refresh_tokens',
                record_id: decoded.userId,
                metadata: JSON.stringify({ message: 'All sessions revoked due to token reuse' }),
            });

            throw new UnauthorizedError('Token reuse detected. All sessions have been revoked. Please log in again.');
        }

        // Revoke old token (rotation)
        await this.repo.revokeRefreshToken(storedToken.id);

        // Get user
        const user = await this.repo.findById(decoded.userId);
        if (!user || !user.is_active) {
            throw new UnauthorizedError('User not found or deactivated');
        }

        // Generate new tokens
        const tokens = await this._generateTokens(user, storedToken.ip_address, storedToken.user_agent);

        eventBus.publish(AUTH_EVENTS.TOKEN_REFRESHED, { userId: user.id });

        return {
            user: this._sanitizeUser(await this._attachProfileName(user)),
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
            resetToken, // Required by notification worker for email link — ensure event handlers don't log this
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
        const accessJti = crypto.randomUUID();
        const refreshJti = crypto.randomUUID();
        const payload = {
            userId: user.id,
            role: user.role,
            academyId: user.academy_id,
            linkedPlayerId: user.linked_player_id,
            jti: accessJti,
        };

        const accessToken = jwt.sign(payload, env.JWT_SECRET, {
            expiresIn: env.JWT_ACCESS_EXPIRY,
            algorithm: 'HS256',
        });

        const refreshToken = jwt.sign(
            { userId: user.id, jti: refreshJti },
            env.JWT_REFRESH_SECRET,
            { expiresIn: env.JWT_REFRESH_EXPIRY, algorithm: 'HS256' },
        );

        // Store refresh token hash in DB
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await this.repo.createRefreshToken({
            user_id: user.id,
            token_hash: tokenHash,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            access_jti: accessJti,
            ip_address: ip || null,
            user_agent: userAgent || null,
            last_seen_at: new Date(),
        });

        // Cache in Redis for quick lookup (best-effort)
        try {
            await this.redis.set(
                `golx:auth:refresh:${user.id}`,
                tokenHash,
                'EX',
                7 * 24 * 60 * 60,
            );
        } catch { /* Redis unavailable */ }

        return { accessToken, refreshToken };
    }

    async _attachProfileName(user) {
        if (user.role !== 'coach') {
            return user;
        }

        const profile = await this.repo.findCoachProfileByUserId(user.id);
        return {
            ...user,
            full_name: profile?.full_name || user.full_name || null,
        };
    }

    _sanitizeUser(user) {
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name || user.username || user.email,
            phone: user.phone,
            role: user.role,
            academyId: user.academy_id,
            linkedPlayerId: user.linked_player_id,
            isActive: user.is_active,
            isVerified: user.is_verified,
            totpEnabled: Boolean(user.totp_enabled),
            totpVerifiedAt: user.totp_verified_at,
            lastLoginAt: user.last_login_at,
            createdAt: user.created_at,
        };
    }
}

module.exports = AuthService;
