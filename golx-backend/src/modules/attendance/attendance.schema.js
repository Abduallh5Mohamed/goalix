const { z } = require('zod');

const uuidParam = z.object({ id: z.string().uuid() });

const createSessionSchema = z.object({
    groupId: z.string().uuid(),
    coachId: z.string().uuid().optional(),
    sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    location: z.string().max(100).optional(),
    sessionType: z.enum(['training', 'match', 'assessment', 'sports_day']).default('training'),
    notes: z.string().max(1000).optional(),
});

const updateSessionStatusSchema = z.object({
    status: z.enum(['scheduled', 'active', 'completed', 'cancelled']),
});

const batchAttendanceSchema = z.object({
    records: z.array(
        z.object({
            playerId: z.string().uuid(),
            status: z.enum(['present', 'absent', 'late', 'excused']),
            notes: z.string().max(500).optional(),
        }),
    ).min(1, 'At least one attendance record required'),
});

const attendanceOverviewQuery = z.object({
    branchId: z.string().uuid().optional(),
    groupId: z.string().uuid().optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
});

const listSessionsQuery = z.object({
    groupId: z.string().uuid().optional(),
    coachId: z.string().uuid().optional(),
    status: z.enum(['scheduled', 'active', 'completed', 'cancelled']).optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
});

module.exports = {
    uuidParam,
    createSessionSchema,
    updateSessionStatusSchema,
    batchAttendanceSchema,
    attendanceOverviewQuery,
    listSessionsQuery,
};
