// Security utilities for input sanitization and token hashing
// Phase 1: Security Hardening

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Strips all HTML tags and dangerous content
 */
export const sanitizeHTML = (dirty: string): string => {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, { 
    ALLOWED_TAGS: [], // Remove all HTML tags
    ALLOWED_ATTR: [] // Remove all attributes
  });
};

/**
 * Sanitize user input for safe display and storage
 * Removes potential XSS vectors while preserving basic formatting
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .slice(0, 1000); // Limit length to prevent abuse
};

/**
 * Sanitize email address
 */
export const sanitizeEmail = (email: string): string => {
  if (!email) return '';
  
  return email
    .trim()
    .toLowerCase()
    .replace(/[^\w@.-]/g, '') // Only allow valid email characters
    .slice(0, 255);
};

/**
 * Sanitize phone number
 */
export const sanitizePhone = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-numeric characters except + at start
  return phone
    .trim()
    .replace(/[^\d+]/g, '')
    .slice(0, 20);
};

/**
 * Generate cryptographically secure token
 */
export const generateSecureToken = (): string => {
  // Generate 32 bytes of random data
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  
  // Convert to hex string
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Generate idempotency key for request deduplication
 */
export const generateIdempotencyKey = (): string => {
  return `${Date.now()}-${generateSecureToken().slice(0, 16)}`;
};

/**
 * Hash token using Web Crypto API (SHA-256)
 * Used for storing tokens securely in database
 */
export const hashToken = async (token: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Validate input length to prevent abuse
 */
export const validateLength = (
  input: string, 
  min: number, 
  max: number, 
  fieldName: string
): { valid: boolean; error?: string } => {
  if (input.length < min) {
    return { 
      valid: false, 
      error: `${fieldName} must be at least ${min} characters` 
    };
  }
  
  if (input.length > max) {
    return { 
      valid: false, 
      error: `${fieldName} must be less than ${max} characters` 
    };
  }
  
  return { valid: true };
};

/**
 * Rate limit check on client side (local storage based)
 */
export const checkClientRateLimit = (
  key: string, 
  maxAttempts: number, 
  windowMs: number
): { allowed: boolean; retryAfter?: number } => {
  const storageKey = `rate_limit_${key}`;
  const stored = localStorage.getItem(storageKey);

  if (!stored) {
    localStorage.setItem(storageKey, JSON.stringify({
      count: 1,
      windowStart: Date.now()
    }));
    return { allowed: true };
  }

  let data;
  try {
    data = JSON.parse(stored);
  } catch (error) {
    console.error('Failed to parse rate limit data:', error);
    localStorage.removeItem(storageKey);
    localStorage.setItem(storageKey, JSON.stringify({
      count: 1,
      windowStart: Date.now()
    }));
    return { allowed: true };
  }

  const elapsed = Date.now() - data.windowStart;
  
  // Reset window if expired
  if (elapsed > windowMs) {
    localStorage.setItem(storageKey, JSON.stringify({
      count: 1,
      windowStart: Date.now()
    }));
    return { allowed: true };
  }
  
  // Check if limit exceeded
  if (data.count >= maxAttempts) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((windowMs - elapsed) / 1000)
    };
  }
  
  // Increment count
  localStorage.setItem(storageKey, JSON.stringify({
    count: data.count + 1,
    windowStart: data.windowStart
  }));
  
  return { allowed: true };
};
