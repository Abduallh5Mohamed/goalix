const { z } = require('zod');

const uuidParam = z.object({ id: z.string().uuid() });

const createPlayerSchema = z.object({
    fullName: z.string().min(2).max(100),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format: YYYY-MM-DD'),
    branchId: z.string().uuid(),
    groupId: z.string().uuid().optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'elite']).optional(),
    position: z.string().max(30).optional(),
    preferredFoot: z.enum(['left', 'right', 'both']).optional(),
    photoUrl: z.string().url()
        .refine((u) => u.startsWith('https://') || u.startsWith('http://'), {
            message: 'Photo URL must use HTTP or HTTPS',
        }).optional(),
    notes: z.string().max(1000).optional(),
    guardianName: z.string().max(100).optional(),
    guardianPhone: z.string().max(20).optional(),
    userId: z.string().uuid().optional(),
});

const updatePlayerSchema = createPlayerSchema.partial();

const listPlayersQuery = z.object({
    branchId: z.string().uuid().optional(),
    groupId: z.string().uuid().optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'elite']).optional(),
    isActive: z.coerce.boolean().optional(),
    search: z.string().max(100).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
});

const addMeasurementSchema = z.object({
    heightCm: z.number().positive().max(250).optional(),
    weightKg: z.number().positive().max(200).optional(),
    recordedMonth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format: YYYY-MM-DD'),
    notes: z.string().max(500).optional(),
});

const addInjurySchema = z.object({
    injuryType: z.string().min(2).max(100),
    bodyPart: z.string().max(50).optional(),
    severity: z.enum(['minor', 'moderate', 'severe']),
    occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    recoveredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    notes: z.string().max(1000).optional(),
});

const assignGroupSchema = z.object({
    groupId: z.string().uuid(),
});

module.exports = {
    uuidParam,
    createPlayerSchema,
    updatePlayerSchema,
    listPlayersQuery,
    addMeasurementSchema,
    addInjurySchema,
    assignGroupSchema,
};
