/**
 * Structured logging and monitoring utility
 *
 * This module provides a centralized logger for the application.
 * In production, it can be wired to external services (e.g., Sentry, LogRocket)
 * but currently uses console logging with structured output.
 *
 * Note: External service integration is stubbed out and not wired up.
 */

export interface LogContext {
  [key: string]: any;
}

interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Format log entry for console output
   */
  private formatLogEntry(entry: LogEntry): string {
    const { level, message, timestamp, context, error } = entry;
    const parts = [
      `[${timestamp}]`,
      `[${level.toUpperCase()}]`,
      message,
    ];

    if (context && Object.keys(context).length > 0) {
      parts.push(JSON.stringify(context));
    }

    if (error) {
      parts.push(`Error: ${error.message}`);
      if (error.stack && this.isDevelopment) {
        parts.push(`\n${error.stack}`);
      }
    }

    return parts.join(' ');
  }

  /**
   * Send log to external service (stub)
   *
   * In production, this would send logs to services like:
   * - Sentry (for errors)
   * - LogRocket (for session replay)
   * - DataDog (for monitoring)
   * - CloudWatch (for AWS deployments)
   *
   * Currently this is a stub and does nothing.
   */
  private sendToExternalService(entry: LogEntry): void {
    // STUB: External service integration goes here
    // Example:
    // if (entry.level === 'error' && typeof Sentry !== 'undefined') {
    //   Sentry.captureException(entry.error || new Error(entry.message), {
    //     level: 'error',
    //     extra: entry.context,
    //   });
    // }
  }

  /**
   * Log an informational message
   */
  info(message: string, context?: LogContext): void {
    const entry: LogEntry = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    console.log(this.formatLogEntry(entry));
    this.sendToExternalService(entry);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    const entry: LogEntry = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    console.warn(this.formatLogEntry(entry));
    this.sendToExternalService(entry);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const entry: LogEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      context,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : undefined,
    };

    console.error(this.formatLogEntry(entry));
    this.sendToExternalService(entry);
  }

  /**
   * Log a debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (!this.isDevelopment) return;

    const entry: LogEntry = {
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    console.debug(this.formatLogEntry(entry));
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger };
