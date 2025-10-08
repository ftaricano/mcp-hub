/**
 * Simple Logger for MCP Hub (Temporary fix for tests)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface SimpleLogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

export function createLogger(component?: string): SimpleLogger {
  const prefix = component ? `[${component}]` : '[Hub]';
  
  return {
    debug: (message: string, meta?: any) => {
      if (process.env.LOG_LEVEL === 'debug') {
        console.log(`${prefix} DEBUG: ${message}`, meta || '');
      }
    },
    info: (message: string, meta?: any) => {
      if (['debug', 'info'].includes(process.env.LOG_LEVEL || 'info')) {
        console.log(`${prefix} INFO: ${message}`, meta || '');
      }
    },
    warn: (message: string, meta?: any) => {
      if (['debug', 'info', 'warn'].includes(process.env.LOG_LEVEL || 'info')) {
        console.warn(`${prefix} WARN: ${message}`, meta || '');
      }
    },
    error: (message: string, meta?: any) => {
      console.error(`${prefix} ERROR: ${message}`, meta || '');
    }
  };
}