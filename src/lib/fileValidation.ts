/**
 * File Upload Security Validation
 * Implements magic byte validation, extension whitelisting, and filename sanitization
 */

// Magic bytes (file signatures) for allowed file types
const FILE_SIGNATURES = {
  // Images
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF], // JPEG/JPG
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG
  ],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50], // RIFF????WEBP
  ],
  // Documents
  'application/pdf': [
    [0x25, 0x50, 0x44, 0x46, 0x2D], // %PDF-
  ],
  'application/zip': [
    [0x50, 0x4B, 0x03, 0x04], // ZIP/DOCX/XLSX (ZIP-based)
    [0x50, 0x4B, 0x05, 0x06], // Empty ZIP
  ],
  // Audio
  'audio/webm': [
    [0x1A, 0x45, 0xDF, 0xA3], // WebM
  ],
  'audio/mpeg': [
    [0xFF, 0xFB], // MP3
    [0x49, 0x44, 0x33], // MP3 with ID3
  ],
} as const;

// Allowed file extensions mapped to MIME types
const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  // Images
  'jpg': ['image/jpeg'],
  'jpeg': ['image/jpeg'],
  'png': ['image/png'],
  'gif': ['image/gif'],
  'webp': ['image/webp'],
  // Documents
  'pdf': ['application/pdf'],
  'doc': ['application/msword'],
  'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  // Audio
  'webm': ['audio/webm', 'video/webm'],
  'mp3': ['audio/mpeg'],
};

// Maximum file sizes by category (in bytes)
export const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024,      // 10MB
  document: 20 * 1024 * 1024,   // 20MB
  audio: 20 * 1024 * 1024,      // 20MB
  video: 50 * 1024 * 1024,      // 50MB
} as const;

/**
 * Read file header bytes for magic byte validation
 */
async function readFileHeader(file: File, bytesToRead: number = 12): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      resolve(Array.from(bytes));
    };

    reader.onerror = () => reject(new Error('Failed to read file'));

    const slice = file.slice(0, bytesToRead);
    reader.readAsArrayBuffer(slice);
  });
}

/**
 * Check if file header matches expected magic bytes
 */
function matchesMagicBytes(headerBytes: number[], signature: (number | null)[]): boolean {
  if (headerBytes.length < signature.length) return false;

  return signature.every((byte, index) => {
    // null in signature means "any byte" (wildcard)
    return byte === null || headerBytes[index] === byte;
  });
}

/**
 * Validate file using magic byte signatures
 */
async function validateFileSignature(file: File, expectedMimeType: string): Promise<boolean> {
  const signatures = FILE_SIGNATURES[expectedMimeType as keyof typeof FILE_SIGNATURES];

  if (!signatures) {
    console.warn(`No magic byte signatures defined for ${expectedMimeType}`);
    return true; // Allow if no signature defined (for backwards compatibility)
  }

  try {
    const headerBytes = await readFileHeader(file, 12);

    // Check if header matches any of the valid signatures for this type
    return signatures.some(signature => matchesMagicBytes(headerBytes, signature));
  } catch (error) {
    console.error('Failed to read file signature:', error);
    return false;
  }
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and null bytes
  let sanitized = filename.replace(/[/\\:\0]/g, '');

  // Remove leading dots (hidden files)
  sanitized = sanitized.replace(/^\.+/, '');

  // Replace dangerous characters with underscores
  sanitized = sanitized.replace(/[<>"|?*\x00-\x1F]/g, '_');

  // Remove Unicode control characters
  sanitized = sanitized.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop() || '';
    const name = sanitized.substring(0, 200);
    sanitized = ext ? `${name}.${ext}` : name;
  }

  // Ensure filename isn't empty after sanitization
  if (!sanitized || sanitized === '.') {
    sanitized = `file_${Date.now()}`;
  }

  return sanitized;
}

/**
 * Extract and validate file extension
 */
function getFileExtension(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext || null;
}

/**
 * Check if extension is in whitelist
 */
function isExtensionAllowed(extension: string | null): boolean {
  if (!extension) return false;
  return extension in ALLOWED_EXTENSIONS;
}

/**
 * Validate file extension matches MIME type
 */
function validateExtensionMimeMatch(extension: string, mimeType: string): boolean {
  const allowedMimes = ALLOWED_EXTENSIONS[extension];
  if (!allowedMimes) return false;

  return allowedMimes.some(allowed => {
    // Handle wildcard matching (e.g., "image/*")
    if (allowed.endsWith('/*')) {
      const prefix = allowed.slice(0, -2);
      return mimeType.startsWith(prefix);
    }
    return mimeType === allowed;
  });
}

/**
 * Comprehensive file validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
  detectedType?: string;
}

/**
 * Validate uploaded file with magic byte checking
 *
 * Security checks performed:
 * 1. File size validation
 * 2. Extension whitelist check
 * 3. Extension/MIME type consistency
 * 4. Magic byte validation (content-based)
 * 5. Filename sanitization
 */
export async function validateUploadedFile(
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    requireMagicByteMatch?: boolean;
  } = {}
): Promise<FileValidationResult> {
  const {
    maxSize = MAX_FILE_SIZES.image,
    allowedTypes = Object.keys(FILE_SIGNATURES),
    requireMagicByteMatch = true,
  } = options;

  // 1. Validate file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds maximum of ${maxSizeMB}MB`,
    };
  }

  // 2. Sanitize filename
  const sanitizedFilename = sanitizeFilename(file.name);

  // 3. Validate extension
  const extension = getFileExtension(sanitizedFilename);
  if (!extension || !isExtensionAllowed(extension)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${Object.keys(ALLOWED_EXTENSIONS).join(', ')}`,
      sanitizedFilename,
    };
  }

  // 4. Validate MIME type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}`,
      sanitizedFilename,
    };
  }

  // 5. Validate extension matches MIME type
  if (!validateExtensionMimeMatch(extension, file.type)) {
    return {
      valid: false,
      error: `File extension "${extension}" does not match file type "${file.type}"`,
      sanitizedFilename,
    };
  }

  // 6. Magic byte validation (content-based)
  if (requireMagicByteMatch) {
    const signatureValid = await validateFileSignature(file, file.type);

    if (!signatureValid) {
      return {
        valid: false,
        error: 'File content does not match declared type (possible spoofing attempt)',
        sanitizedFilename,
      };
    }
  }

  return {
    valid: true,
    sanitizedFilename,
    detectedType: file.type,
  };
}

/**
 * Validate image file specifically
 */
export async function validateImageFile(file: File): Promise<FileValidationResult> {
  return validateUploadedFile(file, {
    maxSize: MAX_FILE_SIZES.image,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    requireMagicByteMatch: true,
  });
}

/**
 * Validate document file specifically
 */
export async function validateDocumentFile(file: File): Promise<FileValidationResult> {
  return validateUploadedFile(file, {
    maxSize: MAX_FILE_SIZES.document,
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    requireMagicByteMatch: true,
  });
}

/**
 * Validate audio file specifically
 */
export async function validateAudioFile(file: File): Promise<FileValidationResult> {
  return validateUploadedFile(file, {
    maxSize: MAX_FILE_SIZES.audio,
    allowedTypes: ['audio/webm', 'audio/mpeg'],
    requireMagicByteMatch: false, // WebM can be tricky, less critical for audio
  });
}
