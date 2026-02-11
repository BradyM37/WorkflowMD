/**
 * Structured Logging System
 * Production-grade logging with log levels and context
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

interface LogContext {
  locationId?: string;
  workflowId?: string;
  userId?: string;
  requestId?: string;
  action?: string;
  [key: string]: any;
}

class Logger {
  private serviceName: string = 'ghl-workflow-debugger';
  private env: string = process.env.NODE_ENV || 'development';

  private formatLog(level: LogLevel, message: string, context?: LogContext, error?: Error): string {
    const timestamp = new Date().toISOString();
    const logEntry: any = {
      timestamp,
      level,
      service: this.serviceName,
      environment: this.env,
      message,
      ...context
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: this.env === 'development' ? error.stack : undefined
      };
    }

    return JSON.stringify(logEntry);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    console.error(this.formatLog(LogLevel.ERROR, message, context, error));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatLog(LogLevel.WARN, message, context));
  }

  info(message: string, context?: LogContext): void {
    console.info(this.formatLog(LogLevel.INFO, message, context));
  }

  debug(message: string, context?: LogContext): void {
    if (this.env === 'development') {
      console.debug(this.formatLog(LogLevel.DEBUG, message, context));
    }
  }

  // Request logging helper
  logRequest(method: string, path: string, statusCode: number, duration: number, context?: LogContext): void {
    this.info(`${method} ${path} ${statusCode}`, {
      ...context,
      method,
      path,
      statusCode,
      durationMs: duration
    });
  }

  // Analysis logging helper
  logAnalysis(workflowId: string, healthScore: number, issuesFound: number, context?: LogContext): void {
    this.info('Workflow analyzed', {
      ...context,
      workflowId,
      healthScore,
      issuesFound,
      action: 'analyze_workflow'
    });
  }
}

export const logger = new Logger();
