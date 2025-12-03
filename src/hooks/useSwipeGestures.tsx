import { useRef, useState, TouchEvent } from 'react';

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export const useSwipeGestures = ({ onSwipeLeft, onSwipeRight, threshold = 50 }: SwipeConfig) => {
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e: TouchEvent) => {
    if (e.targetTouches.length > 0) {
      touchStartX.current = e.targetTouches[0].clientX;
      setIsSwiping(true);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.targetTouches.length > 0) {
      touchEndX.current = e.targetTouches[0].clientX;
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && onSwipeLeft) {
        // Swiped left
        onSwipeLeft();
      } else if (diff < 0 && onSwipeRight) {
        // Swiped right
        onSwipeRight();
      }
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  return {
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    isSwiping,
  };
};
