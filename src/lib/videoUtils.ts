/**
 * Extracts and converts video URLs to their embed format
 * Supports: Loom, YouTube, Vimeo, Scribe
 */
export function extractEmbedUrl(url: string): string | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');

    // Loom patterns
    if (hostname.includes('loom.com')) {
      // Already embed format
      if (urlObj.pathname.includes('/embed/')) {
        return url;
      }
      // Convert share to embed
      const shareMatch = urlObj.pathname.match(/\/share\/([a-zA-Z0-9]+)/);
      if (shareMatch) {
        return `https://www.loom.com/embed/${shareMatch[1]}`;
      }
    }

    // YouTube patterns
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      // Already embed format
      if (urlObj.pathname.includes('/embed/')) {
        return url;
      }
      
      // youtu.be short format
      if (hostname === 'youtu.be') {
        const videoId = urlObj.pathname.slice(1);
        return `https://www.youtube.com/embed/${videoId}`;
      }
      
      // youtube.com/watch?v=
      const videoId = urlObj.searchParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    // Vimeo patterns
    if (hostname.includes('vimeo.com')) {
      // Already embed format
      if (hostname.includes('player.vimeo.com')) {
        return url;
      }
      
      // Convert to embed
      const videoMatch = urlObj.pathname.match(/\/(\d+)/);
      if (videoMatch) {
        return `https://player.vimeo.com/video/${videoMatch[1]}`;
      }
    }

    // Scribe patterns
    if (hostname.includes('scribehow.com')) {
      // Already embed format
      if (urlObj.pathname.includes('/embed/')) {
        return url;
      }
      
      // Convert shared to embed
      const shareMatch = urlObj.pathname.match(/\/shared\/([a-zA-Z0-9_-]+)/);
      if (shareMatch) {
        return `https://scribehow.com/embed/${shareMatch[1]}`;
      }
    }

    return null;
  } catch (error) {
    // Invalid URL
    return null;
  }
}
