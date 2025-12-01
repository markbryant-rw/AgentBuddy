/**
 * Centralized image resizing utility for all image uploads across the platform
 * Handles resizing, compression, and format conversion with configurable presets
 */

export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1 for JPEG/WebP
  format?: 'jpeg' | 'png' | 'webp';
  mode?: 'cover' | 'contain'; // cover = fill and crop, contain = fit within bounds
}

const DEFAULT_OPTIONS: Required<ResizeOptions> = {
  maxWidth: 400,
  maxHeight: 400,
  quality: 0.85,
  format: 'jpeg',
  mode: 'cover',
};

/**
 * Resize an image file to specified dimensions
 * @param file - The image file to resize
 * @param options - Resize options (defaults to avatar preset)
 * @returns Promise<Blob> - The resized image as a Blob
 */
export const resizeImage = async (file: File, options: ResizeOptions = {}): Promise<Blob> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      try {
        let canvasWidth = opts.maxWidth;
        let canvasHeight = opts.maxHeight;
        let drawWidth: number;
        let drawHeight: number;
        let offsetX = 0;
        let offsetY = 0;

        const sourceAspect = img.width / img.height;
        const targetAspect = opts.maxWidth / opts.maxHeight;

        if (opts.mode === 'cover') {
          // Fill the canvas and crop excess (like CSS background-size: cover)
          canvas.width = opts.maxWidth;
          canvas.height = opts.maxHeight;
          
          if (sourceAspect > targetAspect) {
            // Image is wider - fit height and crop width
            drawHeight = opts.maxHeight;
            drawWidth = drawHeight * sourceAspect;
            offsetX = -(drawWidth - opts.maxWidth) / 2;
          } else {
            // Image is taller - fit width and crop height
            drawWidth = opts.maxWidth;
            drawHeight = drawWidth / sourceAspect;
            offsetY = -(drawHeight - opts.maxHeight) / 2;
          }
        } else {
          // Contain mode - fit within bounds maintaining aspect ratio
          if (img.width > opts.maxWidth || img.height > opts.maxHeight) {
            if (sourceAspect > targetAspect) {
              canvasWidth = opts.maxWidth;
              canvasHeight = opts.maxWidth / sourceAspect;
            } else {
              canvasHeight = opts.maxHeight;
              canvasWidth = opts.maxHeight * sourceAspect;
            }
          } else {
            canvasWidth = img.width;
            canvasHeight = img.height;
          }
          
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          drawWidth = canvasWidth;
          drawHeight = canvasHeight;
        }

        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Fill background (useful for transparent images converted to JPEG)
        if (opts.format === 'jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Draw image
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        // Convert to blob
        const mimeType = `image/${opts.format}`;
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          mimeType,
          opts.quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Preset configurations for different use cases
 */
export const RESIZE_PRESETS = {
  avatar: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.85,
    format: 'jpeg' as const,
    mode: 'cover' as const,
  },
  logo: {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.9,
    format: 'png' as const,
    mode: 'contain' as const,
  },
  message: {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.85,
    format: 'jpeg' as const,
    mode: 'contain' as const,
  },
  thumbnail: {
    maxWidth: 200,
    maxHeight: 200,
    quality: 0.8,
    format: 'jpeg' as const,
    mode: 'cover' as const,
  },
} as const;
