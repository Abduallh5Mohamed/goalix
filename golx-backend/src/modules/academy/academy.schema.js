const { z } = require('zod');

const uuidParam = z.object({ id: z.string().uuid() });

const createAcademySchema = z.object({
    name: z.string().min(2).max(100),
    logoUrl: z.string().url()
        .refine((u) => u.startsWith('https://') || u.startsWith('http://'), {
            message: 'Logo URL must use HTTP or HTTPS',
        }).optional(),
    address: z.string().max(500).optional(),
    phone: z.string().max(20).optional(),
    email: z.string().email().max(255).optional(),
    settings: z.record(z.unknown()).optional(),
});

const updateAcademySchema = createAcademySchema.partial();

const createBranchSchema = z.object({
    name: z.string().min(2).max(100),
    address: z.string().max(500).optional(),
    capacity: z.number().int().positive().optional(),
});

const updateBranchSchema = createBranchSchema.partial();

const createGroupSchema = z.object({
    branchId: z.string().uuid(),
    birthYearId: z.string().uuid(),
    name: z.string().min(1).max(50),
    maxPlayers: z.number().int().positive().max(100).default(25),
});

const updateGroupSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    maxPlayers: z.number().int().positive().max(100).optional(),
    isActive: z.boolean().optional(),
});

const createBirthYearSchema = z.object({
    branchId: z.string().uuid(),
    year: z.number().int().min(2000).max(2030),
    label: z.string().max(50).optional(),
});

const createScheduleSchema = z.object({
    groupId: z.string().uuid(),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time format must be HH:MM'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time format must be HH:MM'),
    location: z.string().max(100).optional(),
});

module.exports = {
    uuidParam,
    createAcademySchema,
    updateAcademySchema,
    createBranchSchema,
    updateBranchSchema,
    createGroupSchema,
    updateGroupSchema,
    createBirthYearSchema,
    createScheduleSchema,
};
