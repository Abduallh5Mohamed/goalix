const { BadRequestError, ConflictError, NotFoundError } = require('../../shared/errors');

class AdminService {
    constructor(adminRepository) {
        this.repo = adminRepository;
    }

    async getDashboard(academyId) {
        const [kpis, attendanceTrend, revenueTrend, topPlayers, recentAlerts, weeklyMatches] = await Promise.all([
            this.repo.getKPIs(academyId),
            this.repo.getAttendanceTrend(academyId),
            this.repo.getRevenueTrend(academyId),
            this.repo.getTopPlayers(academyId),
            this.repo.getRecentAlerts(academyId),
            this.repo.getWeeklyMatches(academyId),
        ]);

        return { kpis, attendanceTrend, revenueTrend, topPlayers, recentAlerts, weeklyMatches };
    }

    // ─── Pending Registrations ───────────────────────────────────────────

    async getPendingRegistrations({ status, academyId } = {}) {
        return this.repo.getPendingRegistrations({ status, academyId });
    }

    async getAccessControl(academyId) {
        if (!academyId) throw new BadRequestError('Academy context is required');
        return this.repo.getAccessControl(academyId);
    }

    async createRole(academyId, userId, data) {
        if (!academyId) throw new BadRequestError('Academy context is required');
        try {
            const created = await this.repo.createAcademyRole(academyId, userId, data);
            const accessControl = await this.repo.getAccessControl(academyId);
            return accessControl.roles.find((role) => role.id === created.id) || created;
        } catch (err) {
            if (err.code === '23505') {
                throw new ConflictError('A role with this code already exists in this academy');
            }
            throw err;
        }
    }

    async updateRole(roleId, academyId, userId, data) {
        if (!academyId) throw new BadRequestError('Academy context is required');
        try {
            const role = await this.repo.updateAcademyRole(roleId, academyId, userId, data);
            if (!role) throw new NotFoundError('Editable role', roleId);
            const accessControl = await this.repo.getAccessControl(academyId);
            return accessControl.roles.find((item) => item.id === role.id) || role;
        } catch (err) {
            if (err.code === '23505') {
                throw new ConflictError('A role with this code already exists in this academy');
            }
            throw err;
        }
    }

    async deleteRole(roleId, academyId, userId) {
        if (!academyId) throw new BadRequestError('Academy context is required');
        const accessControl = await this.repo.getAccessControl(academyId);
        const role = accessControl.roles.find((item) => item.id === roleId);
        if (!role || role.isSystem) throw new NotFoundError('Editable role', roleId);
        if (role.userCount > 0) {
            throw new BadRequestError('Cannot delete a role while active users are assigned to it');
        }

        const deleted = await this.repo.softDeleteAcademyRole(roleId, academyId, userId);
        if (!deleted) throw new NotFoundError('Editable role', roleId);
        return { message: 'Role deleted' };
    }

    async approveRegistration(id, reviewedBy, _ip, _userAgent) {
        const pending = await this.repo.findPendingRegistrationById(id);
        if (!pending) throw Object.assign(new Error('Registration not found'), { statusCode: 404 });
        if (pending.status !== 'pending') {
            throw Object.assign(new Error(`Registration is already ${pending.status}`), { statusCode: 400 });
        }
        const user = await this.repo.approvePendingRegistration(id, reviewedBy);
        return { message: 'Registration approved', userId: user.id };
    }

    async rejectRegistration(id, reviewedBy, reason, _ip, _userAgent) {
        const pending = await this.repo.findPendingRegistrationById(id);
        if (!pending) throw Object.assign(new Error('Registration not found'), { statusCode: 404 });
        if (pending.status !== 'pending') {
            throw Object.assign(new Error(`Registration is already ${pending.status}`), { statusCode: 400 });
        }
        await this.repo.rejectPendingRegistration(id, reviewedBy, reason);
        return { message: 'Registration rejected' };
    }
}

module.exports = AdminService;
