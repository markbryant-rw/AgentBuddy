// New Zealand mobile phone number utilities

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string | null;
  error?: string;
}

/**
 * Normalizes NZ mobile numbers to +6427XXXXXXX format
 * Accepts formats like:
 * - 027 321 3749
 * - 0273213749
 * - +64 27 321 3749
 * - +6427321374
 * - 64 27 321 3749
 */
export function normalizeNZMobile(phone: string | null | undefined): PhoneValidationResult {
  if (!phone) {
    return { isValid: true, normalized: null }; // Mobile is optional
  }

  // Remove all non-numeric characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove leading + for processing
  const digits = cleaned.replace(/^\+/, '');
  
  let normalizedDigits: string;
  
  if (digits.startsWith('64')) {
    // Already has country code
    normalizedDigits = digits;
  } else if (digits.startsWith('0')) {
    // Local format (027...) -> convert to international
    normalizedDigits = '64' + digits.substring(1);
  } else {
    return {
      isValid: false,
      normalized: null,
      error: 'Invalid phone format. Use 027... or +6427...'
    };
  }
  
  // Validate NZ mobile pattern: 64 + 2X + 6-8 more digits (total 10-12 digits)
  // Accepts: 021613632, 027 321 3749, +64 27 321 3749, etc.
  const nzMobilePattern = /^64(2[0-9])[0-9]{6,8}$/;
  
  if (!nzMobilePattern.test(normalizedDigits)) {
    return {
      isValid: false,
      normalized: null,
      error: 'Invalid NZ mobile number. Use formats like: 027 321 3749 or 021613632'
    };
  }
  
  return {
    isValid: true,
    normalized: '+' + normalizedDigits
  };
}

/**
 * Format a normalized phone number for display
 * +6427321374 -> +64 27 321 3749
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const cleaned = phone.replace(/[^\d+]/g, '');
  const digits = cleaned.replace(/^\+/, '');
  
  if (digits.startsWith('64') && digits.length === 11) {
    // NZ format: +64 27 321 3749
    return `+64 ${digits.substring(2, 4)} ${digits.substring(4, 7)} ${digits.substring(7)}`;
  }
  
  return phone;
}
