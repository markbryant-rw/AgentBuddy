/**
 * Image preloading utility to improve perceived performance
 * Preloads critical images in the background
 */

const preloadedImages = new Set<string>();

/**
 * Preload a single image
 */
export const preloadImage = (src: string): Promise<void> => {
  if (!src || preloadedImages.has(src)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      preloadedImages.add(src);
      resolve();
    };
    
    img.onerror = () => {
      console.warn(`Failed to preload image: ${src}`);
      reject(new Error(`Failed to preload: ${src}`));
    };
    
    img.src = src;
  });
};

/**
 * Preload multiple images in parallel
 */
export const preloadImages = (srcs: string[]): Promise<void[]> => {
  const validSrcs = srcs.filter(src => src && !preloadedImages.has(src));
  return Promise.all(validSrcs.map(preloadImage));
};

/**
 * Preload user avatar (call on login)
 */
export const preloadUserAvatar = (avatarUrl?: string | null): void => {
  if (avatarUrl) {
    preloadImage(avatarUrl).catch(() => {
      // Silently fail - not critical
    });
  }
};

/**
 * Preload team logo (call on dashboard load)
 */
export const preloadTeamLogo = (logoUrl?: string | null): void => {
  if (logoUrl) {
    preloadImage(logoUrl).catch(() => {
      // Silently fail - not critical
    });
  }
};

/**
 * Preload conversation avatars (call when loading conversation list)
 */
export const preloadConversationAvatars = (avatarUrls: (string | null | undefined)[]): void => {
  const validUrls = avatarUrls.filter((url): url is string => !!url);
  
  // Preload first 5 avatars
  const priorityUrls = validUrls.slice(0, 5);
  
  preloadImages(priorityUrls).catch(() => {
    // Silently fail - not critical
  });
};
