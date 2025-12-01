import { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { cn } from '@/lib/utils';

interface OptimizedAvatarProps {
  src?: string | null;
  alt: string;
  fallback: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}

/**
 * Memoized Avatar component to prevent unnecessary re-renders
 * Use this for avatars that don't need to update frequently
 */
export const OptimizedAvatar = memo(({ 
  src, 
  alt, 
  fallback, 
  className,
  imageClassName,
  fallbackClassName 
}: OptimizedAvatarProps) => {
  return (
    <Avatar className={className}>
      {src && (
        <AvatarImage 
          src={src} 
          alt={alt}
          className={imageClassName}
        />
      )}
      <AvatarFallback className={cn("text-xs", fallbackClassName)}>
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
}, (prev, next) => {
  // Custom comparison to prevent re-renders when props haven't changed
  return prev.src === next.src && 
         prev.alt === next.alt && 
         prev.fallback === next.fallback &&
         prev.className === next.className;
});

OptimizedAvatar.displayName = 'OptimizedAvatar';
