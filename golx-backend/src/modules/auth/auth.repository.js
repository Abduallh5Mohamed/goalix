const BaseRepository = require('../../shared/base.repository');

class AuthRepository extends BaseRepository {
    constructor(db) {
        super('auth_users', db);
    }

    async findByEmail(email) {
        return this.db('auth_users')
            .where({ email })
            .whereNull('deleted_at')
            .first();
    }

    async findByPhone(phone) {
        return this.db('auth_users')
            .where({ phone })
            .whereNull('deleted_at')
            .first();
    }

    async findByEmailOrPhone(email, phone) {
        return this.db('auth_users')
            .whereNull('deleted_at')
            .where(function () {
                if (email) this.where('email', email);
                if (phone) this.orWhere('phone', phone);
            })
            .first();
    }

    async updateLastLogin(userId) {
        return this.db('auth_users')
            .where({ id: userId })
            .update({ last_login_at: new Date() });
    }

    // --- Refresh tokens (owned by auth module) ---

    async createRefreshToken(data) {
        const [row] = await this.db('auth_refresh_tokens').insert(data).returning('*');
        return row;
    }

    async findRefreshTokenByHash(tokenHash) {
        return this.db('auth_refresh_tokens')
            .where({ token_hash: tokenHash, is_revoked: false })
            .where('expires_at', '>', new Date())
            .first();
    }

    async revokeRefreshToken(id) {
        return this.db('auth_refresh_tokens')
            .where({ id })
            .update({ is_revoked: true });
    }

    async revokeAllUserTokens(userId) {
        return this.db('auth_refresh_tokens')
            .where({ user_id: userId, is_revoked: false })
            .update({ is_revoked: true });
    }

    // --- Password reset tokens (owned by auth module) ---

    async createPasswordReset(data) {
        const [row] = await this.db('auth_password_resets').insert(data).returning('*');
        return row;
    }

    async findValidPasswordReset(tokenHash) {
        return this.db('auth_password_resets')
            .where({ token_hash: tokenHash, is_used: false })
            .where('expires_at', '>', new Date())
            .first();
    }

    async markPasswordResetUsed(id) {
        return this.db('auth_password_resets')
            .where({ id })
            .update({ is_used: true });
    }

    // --- Audit logs (owned by auth module) ---

    async createAuditLog(data) {
        const [row] = await this.db('audit_logs').insert(data).returning('*');
        return row;
    }
}

module.exports = AuthRepository;
