/**
 * Logger utility that only logs in development mode
 * Prevents console statements from appearing in production
 */

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const logger = {
    log: (...args) => {
        if (isDev) {
            console.log(...args);
        }
    },
    error: (...args) => {
        // Always log errors, but could send to error tracking service in production
        if (isDev) {
            console.error(...args);
        } else {
            // In production, you could send to error tracking service
            // Example: Sentry.captureException(new Error(args.join(' ')));
        }
    },
    warn: (...args) => {
        if (isDev) {
            console.warn(...args);
        }
    },
    debug: (...args) => {
        if (isDev) {
            console.debug(...args);
        }
    }
};

