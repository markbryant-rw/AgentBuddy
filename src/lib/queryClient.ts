import { QueryClient } from "@tanstack/react-query";

// Utility function to throttle any function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let lastRan = 0;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const remainingTime = wait - (now - lastRan);

    if (remainingTime <= 0) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastRan = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastRan = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remainingTime);
    }
  };
}

// Optimized QueryClient configuration for 100+ daily users
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes before considering stale
      staleTime: 5 * 60 * 1000,
      
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000, // Renamed from cacheTime in v5
      
      // Don't refetch on window focus (too aggressive for this use case)
      refetchOnWindowFocus: false,
      
      // Retry failed queries once
      retry: 1,
      
      // Refetch on reconnect (handles offline/online)
      refetchOnReconnect: true,
      
      // Network mode for better offline handling
      networkMode: "online",
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      
      // Network mode for mutations
      networkMode: "online",
    },
  },
});
