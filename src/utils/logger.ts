/**
 * MCP Hub Logger Configuration
 * Simplified inline logger to avoid external dependencies
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface MCPLogger {
  debug: (message: string, context?: any) => void;
  info: (message: string, context?: any) => void;
  warn: (message: string, context?: any) => void;
  error: (message: string, context?: any) => void;
  child: (context: Record<string, any>) => MCPLogger;
}

function createSimpleLogger(name: string, parentContext: Record<string, any> = {}): MCPLogger {
  const log = (level: LogLevel, message: string, context?: any) => {
    const fullContext = { ...parentContext, ...context };
    const contextStr = Object.keys(fullContext).length > 0 ? ` ${JSON.stringify(fullContext)}` : '';
    console.log(`[${level.toUpperCase()}] [${name}]${contextStr} ${message}`);
  };

  return {
    debug: (message: string, context?: any) => log('debug', message, context),
    info: (message: string, context?: any) => log('info', message, context),
    warn: (message: string, context?: any) => log('warn', message, context),
    error: (message: string, context?: any) => log('error', message, context),
    child: (context: Record<string, any>) =>
      createSimpleLogger(name, { ...parentContext, ...context }),
  };
}

// Create main hub logger
export const logger = createSimpleLogger('mcp-hub');

// Create specialized loggers for different components
export const registryLogger = logger.child({ component: 'registry' });
export const intelligenceLogger = logger.child({ component: 'intelligence' });
export const cacheLogger = logger.child({ component: 'cache' });
export const processLogger = logger.child({ component: 'process-manager' });

/**
 * Migration helper to easily replace console.log
 * Usage:
 *   Before: console.log('[Hub] Starting server...')
 *   After:  log.info('Starting server...')
 */
export const log = {
  debug: (message: string, ...args: any[]) => {
    const context = args.length > 0 ? { data: args } : undefined;
    logger.debug(message, context);
  },

  info: (message: string, ...args: any[]) => {
    const context = args.length > 0 ? { data: args } : undefined;
    logger.info(message, context);
  },

  warn: (message: string, ...args: any[]) => {
    const context = args.length > 0 ? { data: args } : undefined;
    logger.warn(message, context);
  },

  error: (message: string, error?: any, ...args: any[]) => {
    const context = { ...args, error };
    logger.error(message, context);
  },

  // Backward compatibility (will be removed later)
  log: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      logger.info(message, { data: args });
    }
  },
};

// Compatibility wrapper so other modules can call createLogger in two ways:
// - createLogger('component') => child logger for component
// - createLogger('level', 'format') => base logger (args ignored)
export function createLogger(arg1?: string, arg2?: string): MCPLogger {
  if (arg2 === undefined && typeof arg1 === 'string') {
    return logger.child({ component: arg1 });
  }
  return logger;
}

// Types already exported above
export type LogContext = Record<string, any>;
