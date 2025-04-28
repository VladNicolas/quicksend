// Basic logger configuration using console

interface Logger {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    debug: (...args: any[]) => void;
}

const logger: Logger = {
    info: (...args) => console.log('[INFO]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    // Debug logs can be toggled based on environment if needed
    debug: (...args) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug('[DEBUG]', ...args);
        }
    },
};

// Export the logger instance
export { logger }; 