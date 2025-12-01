import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number; // 1-5 scale
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StarRating = ({ value, onChange, readOnly = false, size = 'md' }: StarRatingProps) => {
  // Use value directly (1-5 scale)
  const starValue = value;
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const handleStarClick = (starIndex: number) => {
    if (readOnly || !onChange) return;
    // Return 1-5 value directly
    onChange(starIndex);
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((starIndex) => (
        <button
          key={starIndex}
          type="button"
          onClick={() => handleStarClick(starIndex)}
          disabled={readOnly}
          className={cn(
            "transition-all",
            !readOnly && "hover:scale-110 cursor-pointer",
            readOnly && "cursor-default"
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              "transition-colors",
              starIndex <= starValue
                ? "fill-yellow-400 text-yellow-400"
                : "fill-none text-muted-foreground"
            )}
          />
        </button>
      ))}
      {!readOnly && (
        <span className="ml-2 text-sm text-muted-foreground">
          {value}/5
        </span>
      )}
    </div>
  );
};
