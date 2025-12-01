// Comprehensive input validation schemas
// Issues #3, #4: Strong password and auth form validation

import { z } from 'zod';

// Password validation schema with strong requirements
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Email validation with additional checks
export const emailSchema = z
  .string()
  .trim()
  .email('Invalid email address')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase();

// Full name validation
export const fullNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

// Team code validation
export const teamCodeSchema = z
  .string()
  .trim()
  .min(6, 'Team code must be at least 6 characters')
  .max(20, 'Team code must be less than 20 characters')
  .regex(/^[A-Za-z0-9-_]+$/, 'Team code can only contain letters, numbers, hyphens, and underscores');

// Team name validation
export const teamNameSchema = z
  .string()
  .trim()
  .min(2, 'Team name must be at least 2 characters')
  .max(100, 'Team name must be less than 100 characters');

// Agency slug validation with reserved words check
const RESERVED_SLUGS = ['admin', 'api', 'auth', 'dashboard', 'settings', 'system'];

export const agencySlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Agency slug must be at least 3 characters')
  .max(50, 'Agency slug must be less than 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Agency slug can only contain lowercase letters, numbers, and hyphens')
  .refine((slug) => !RESERVED_SLUGS.includes(slug), {
    message: 'This slug is reserved and cannot be used',
  });

// Sign up form validation
export const signUpSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
  teamCode: teamCodeSchema.optional(),
  teamName: teamNameSchema.optional(),
});

// Sign in form validation
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Transaction link URL validation
export const transactionLinkSchema = z.object({
  url: z.string().url('Must be a valid URL').max(2000, 'URL is too long'),
  title: z.string().trim().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
});

// Sanitize HTML to prevent XSS
export const sanitizeText = (text: string): string => {
  return text
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
};
