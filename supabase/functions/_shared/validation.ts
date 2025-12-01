// =============================================================================
// REQUEST VALIDATION AND SANITIZATION UTILITIES
// =============================================================================

import { sanitizeInput, sanitizeEmail, ErrorCodes } from './security.ts';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  sanitizedData?: Record<string, any>;
}

/**
 * Field validation rules
 */
export interface FieldRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'uuid' | 'url' | 'date' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  customValidator?: (value: any) => boolean | string;
  sanitize?: boolean; // Whether to apply sanitization (default: true for strings)
}

/**
 * Schema definition for request validation
 */
export type ValidationSchema = Record<string, FieldRule>;

/**
 * UUID validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Email validation regex (RFC 5322 simplified)
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * URL validation regex
 */
const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

/**
 * Validate and sanitize request data against a schema
 *
 * @param data - Request data to validate
 * @param schema - Validation schema
 * @returns Validation result with errors or sanitized data
 */
export function validateRequest(
  data: Record<string, any>,
  schema: ValidationSchema
): ValidationResult {
  const errors: string[] = [];
  const sanitizedData: Record<string, any> = {};

  for (const [fieldName, rules] of Object.entries(schema)) {
    const value = data[fieldName];

    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${fieldName}' is required`);
      continue;
    }

    // Skip validation for optional fields that are not provided
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }

    // Type validation
    if (rules.type) {
      const typeValidation = validateType(fieldName, value, rules.type);
      if (!typeValidation.valid) {
        errors.push(typeValidation.error!);
        continue;
      }
    }

    // Apply sanitization for string fields
    let sanitizedValue = value;
    if (rules.sanitize !== false && typeof value === 'string') {
      if (rules.type === 'email') {
        sanitizedValue = sanitizeEmail(value);
      } else {
        sanitizedValue = sanitizeInput(value);
      }
    }

    // Length validation for strings
    if (typeof sanitizedValue === 'string') {
      if (rules.minLength !== undefined && sanitizedValue.length < rules.minLength) {
        errors.push(`Field '${fieldName}' must be at least ${rules.minLength} characters`);
        continue;
      }
      if (rules.maxLength !== undefined && sanitizedValue.length > rules.maxLength) {
        errors.push(`Field '${fieldName}' must be at most ${rules.maxLength} characters`);
        continue;
      }
    }

    // Numeric range validation
    if (typeof sanitizedValue === 'number') {
      if (rules.min !== undefined && sanitizedValue < rules.min) {
        errors.push(`Field '${fieldName}' must be at least ${rules.min}`);
        continue;
      }
      if (rules.max !== undefined && sanitizedValue > rules.max) {
        errors.push(`Field '${fieldName}' must be at most ${rules.max}`);
        continue;
      }
    }

    // Pattern validation
    if (rules.pattern && typeof sanitizedValue === 'string') {
      if (!rules.pattern.test(sanitizedValue)) {
        errors.push(`Field '${fieldName}' has invalid format`);
        continue;
      }
    }

    // Enum validation
    if (rules.enum && !rules.enum.includes(sanitizedValue)) {
      errors.push(`Field '${fieldName}' must be one of: ${rules.enum.join(', ')}`);
      continue;
    }

    // Custom validation
    if (rules.customValidator) {
      const customResult = rules.customValidator(sanitizedValue);
      if (customResult !== true) {
        const errorMessage = typeof customResult === 'string'
          ? customResult
          : `Field '${fieldName}' failed custom validation`;
        errors.push(errorMessage);
        continue;
      }
    }

    sanitizedData[fieldName] = sanitizedValue;
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, sanitizedData };
}

/**
 * Validate value type
 */
function validateType(
  fieldName: string,
  value: any,
  type: string
): { valid: boolean; error?: string } {
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return { valid: false, error: `Field '${fieldName}' must be a string` };
      }
      break;

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return { valid: false, error: `Field '${fieldName}' must be a number` };
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return { valid: false, error: `Field '${fieldName}' must be a boolean` };
      }
      break;

    case 'email':
      if (typeof value !== 'string' || !EMAIL_REGEX.test(value)) {
        return { valid: false, error: `Field '${fieldName}' must be a valid email address` };
      }
      break;

    case 'uuid':
      if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
        return { valid: false, error: `Field '${fieldName}' must be a valid UUID` };
      }
      break;

    case 'url':
      if (typeof value !== 'string' || !URL_REGEX.test(value)) {
        return { valid: false, error: `Field '${fieldName}' must be a valid URL` };
      }
      break;

    case 'date':
      const dateValue = new Date(value);
      if (isNaN(dateValue.getTime())) {
        return { valid: false, error: `Field '${fieldName}' must be a valid date` };
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        return { valid: false, error: `Field '${fieldName}' must be an array` };
      }
      break;

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { valid: false, error: `Field '${fieldName}' must be an object` };
      }
      break;
  }

  return { valid: true };
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(
  errors: string[],
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Validation failed',
      code: ErrorCodes.INVALID_INPUT,
      details: errors,
    }),
    {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Validate JSON body and return parsed data
 *
 * @param req - Request object
 * @returns Parsed JSON data or null if invalid
 */
export async function parseAndValidateJSON(
  req: Request
): Promise<{ data: Record<string, any> | null; error?: string }> {
  try {
    const contentType = req.headers.get('content-type');

    if (!contentType?.includes('application/json')) {
      return { data: null, error: 'Content-Type must be application/json' };
    }

    const data = await req.json();

    if (typeof data !== 'object' || data === null) {
      return { data: null, error: 'Request body must be a JSON object' };
    }

    return { data };
  } catch (error) {
    return { data: null, error: 'Invalid JSON in request body' };
  }
}

/**
 * Common validation schemas for reuse
 */
export const CommonSchemas = {
  email: {
    email: {
      required: true,
      type: 'email' as const,
      maxLength: 255,
    },
  },

  uuid: {
    id: {
      required: true,
      type: 'uuid' as const,
    },
  },

  pagination: {
    page: {
      required: false,
      type: 'number' as const,
      min: 1,
    },
    limit: {
      required: false,
      type: 'number' as const,
      min: 1,
      max: 100,
    },
  },

  dateRange: {
    startDate: {
      required: false,
      type: 'date' as const,
    },
    endDate: {
      required: false,
      type: 'date' as const,
    },
  },
};

/**
 * Sanitize object by removing potentially dangerous fields
 *
 * @param obj - Object to sanitize
 * @param allowedFields - List of allowed fields (if provided, only these fields will be kept)
 * @returns Sanitized object
 */
export function sanitizeObject(
  obj: Record<string, any>,
  allowedFields?: string[]
): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip if allowedFields is provided and field is not in the list
    if (allowedFields && !allowedFields.includes(key)) {
      continue;
    }

    // Skip potentially dangerous fields
    if (key.startsWith('_') || key.startsWith('$') || key === '__proto__' || key === 'constructor') {
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value, allowedFields);
    }
    // Sanitize strings
    else if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    }
    // Keep other primitive types as-is
    else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Detect SQL injection patterns
 *
 * @param input - Input string to check
 * @returns true if suspicious patterns detected
 */
export function detectSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\bOR\b|\bAND\b).*=.*=/i,
    /union.*select/i,
    /insert.*into/i,
    /delete.*from/i,
    /drop.*table/i,
    /update.*set/i,
    /exec(ute)?/i,
    /script.*>/i,
    /javascript:/i,
    /--/,
    /;.*drop/i,
    /xp_/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Detect XSS patterns
 *
 * @param input - Input string to check
 * @returns true if suspicious patterns detected
 */
export function detectXSS(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>.*<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Comprehensive malicious input detection
 *
 * @param input - Input to check
 * @returns Detection result with reason if malicious
 */
export function detectMaliciousInput(input: any): {
  isMalicious: boolean;
  reason?: string;
} {
  if (typeof input !== 'string') {
    return { isMalicious: false };
  }

  if (detectSQLInjection(input)) {
    return { isMalicious: true, reason: 'Potential SQL injection detected' };
  }

  if (detectXSS(input)) {
    return { isMalicious: true, reason: 'Potential XSS attack detected' };
  }

  // Check for excessive length (potential DoS)
  if (input.length > 100000) {
    return { isMalicious: true, reason: 'Input exceeds maximum allowed length' };
  }

  return { isMalicious: false };
}
