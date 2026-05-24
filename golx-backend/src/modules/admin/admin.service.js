class AdminService {
    constructor(adminRepository) {
        this.repo = adminRepository;
    }

    async getDashboard(academyId) {
        const [kpis, attendanceTrend, revenueTrend, topPlayers, recentAlerts] = await Promise.all([
            this.repo.getKPIs(academyId),
            this.repo.getAttendanceTrend(academyId),
            this.repo.getRevenueTrend(academyId),
            this.repo.getTopPlayers(academyId),
            this.repo.getRecentAlerts(academyId),
        ]);

        return { kpis, attendanceTrend, revenueTrend, topPlayers, recentAlerts };
    }

    // ─── Pending Registrations ───────────────────────────────────────────

    async getPendingRegistrations({ status, academyId } = {}) {
        return this.repo.getPendingRegistrations({ status, academyId });
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
