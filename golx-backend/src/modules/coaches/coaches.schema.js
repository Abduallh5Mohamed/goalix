const { z } = require('zod');

const uuidParam = z.object({ id: z.string().uuid() });

const createCoachSchema = z.object({
    userId: z.string().uuid(),
    specialization: z.string().max(100).optional(),
    bio: z.string().max(2000).optional(),
    photoUrl: z.string().url()
        .refine((u) => u.startsWith('https://') || u.startsWith('http://'), {
            message: 'Photo URL must use HTTP or HTTPS',
        }).optional(),
    fullName: z.string().min(2).max(100),
});

const updateCoachSchema = z.object({
    specialization: z.string().max(100).optional(),
    bio: z.string().max(2000).optional(),
    photoUrl: z.string().url()
        .refine((u) => u.startsWith('https://') || u.startsWith('http://'), {
            message: 'Photo URL must use HTTP or HTTPS',
        }).optional(),
    fullName: z.string().min(2).max(100).optional(),
});

const assignGroupSchema = z.object({
    groupId: z.string().uuid(),
    role: z.enum(['head', 'assistant']).default('head'),
});

module.exports = {
    uuidParam,
    createCoachSchema,
    updateCoachSchema,
    assignGroupSchema,
};
