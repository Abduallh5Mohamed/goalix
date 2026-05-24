const { z } = require('zod');

const registerSchema = z.object({
    email: z.string().email('Invalid email format').max(255).optional(),
    phone: z.string().min(8).max(20).optional(),
    // Minimum 8 chars + at least one uppercase + one digit + one special character
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128)
        .refine((p) => /[A-Z]/.test(p), { message: 'Password must contain at least one uppercase letter' })
        .refine((p) => /[0-9]/.test(p), { message: 'Password must contain at least one digit' })
        .refine((p) => /[^A-Za-z0-9]/.test(p), { message: 'Password must contain at least one special character' }),
    // Admins are seeded or promoted by an existing admin — never self-registerable
    role: z.enum(['coach', 'player', 'parent']),
    academyId: z.string().uuid().optional(),
    fullName: z.string().min(2).max(100).optional(),
}).refine((data) => data.email || data.phone, {
    message: 'Either email or phone is required',
});

const loginSchema = z.object({
    email: z.string().email().max(255).optional(),
    phone: z.string().min(8).max(20).optional(),
    password: z.string().min(1, 'Password is required'),
}).refine((data) => data.email || data.phone, {
    message: 'Either email or phone is required',
});

const refreshSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email format'),
});

const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    // Same complexity rules as registration — prevents policy bypass via reset flow
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128)
        .refine((p) => /[A-Z]/.test(p), { message: 'Password must contain at least one uppercase letter' })
        .refine((p) => /[0-9]/.test(p), { message: 'Password must contain at least one digit' })
        .refine((p) => /[^A-Za-z0-9]/.test(p), { message: 'Password must contain at least one special character' }),
});

module.exports = {
    registerSchema,
    loginSchema,
    refreshSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
};
