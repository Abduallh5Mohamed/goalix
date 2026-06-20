const { z } = require('zod');

const uuidParam = z.object({ id: z.string().uuid() });

const roleBodySchema = z.object({
    name: z.string().trim().min(2).max(120),
    code: z.string()
        .trim()
        .min(2)
        .max(60)
        .regex(/^[a-z][a-z0-9_]*$/, 'Role code must start with a letter and use lowercase letters, numbers, or underscores'),
    description: z.string().trim().max(1000).optional().nullable(),
    isActive: z.boolean().optional(),
    permissionIds: z.array(z.string().uuid()).max(300).default([]),
});

const roleUpdateSchema = roleBodySchema.partial().extend({
    permissionIds: z.array(z.string().uuid()).max(300).optional(),
});

module.exports = {
    uuidParam,
    roleBodySchema,
    roleUpdateSchema,
};
