import { z } from 'zod';

// Reserved slugs that cannot be used for agencies
const RESERVED_SLUGS = ['admin', 'api', 'www', 'app', 'dashboard', 'auth', 'settings'];

export const authSchemas = {
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase(),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),

  fullName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(
      /^[a-zA-ZÀ-ÿ\s'-]+$/,
      'Name can only contain letters, spaces, hyphens, and apostrophes'
    ),

  teamName: z
    .string()
    .trim()
    .min(2, 'Team name must be at least 2 characters')
    .max(100, 'Team name must be less than 100 characters'),

  teamCode: z
    .string()
    .trim()
    .length(8, 'Team code must be exactly 8 characters')
    .regex(/^[A-Z0-9]+$/, 'Team code must be alphanumeric'),

  agencySlug: z
    .string()
    .trim()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .refine((val) => !RESERVED_SLUGS.includes(val), {
      message: 'This slug name is reserved and cannot be used',
    }),

  birthday: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        const now = new Date();
        const age = now.getFullYear() - date.getFullYear();
        return age >= 18 && age <= 120;
      },
      { message: 'You must be at least 18 years old' }
    ),
};

export const signUpSchema = z.object({
  email: authSchemas.email,
  password: authSchemas.password,
  fullName: authSchemas.fullName,
  teamName: authSchemas.teamName.optional(),
  teamCode: authSchemas.teamCode.optional(),
  birthday: authSchemas.birthday,
});

export const signInSchema = z.object({
  email: authSchemas.email,
  password: z.string().min(1, 'Password is required'),
});

export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
