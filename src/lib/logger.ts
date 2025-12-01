// Centralized logging utility for error tracking
// Issue #21: Replace console.log with proper error tracking

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => isDev && console.log(...args),
  
  error: (message: string, error?: any, context?: Record<string, any>) => {
    // Always log errors, even in production
    // Sanitize error to avoid logging sensitive data
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] ${message}`, errorMessage, context);
    // In production, this would send to error tracking service (e.g., Sentry)
    // Example: Sentry.captureException(error, { extra: { message, ...context } });
  },

  warn: (message: string, context?: Record<string, any>) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, context);
    }
  },

  info: (message: string, context?: Record<string, any>) => {
    if (isDev) {
      console.info(`[INFO] ${message}`, context);
    }
  },

  debug: (message: string, context?: Record<string, any>) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, context);
    }
  },
};
