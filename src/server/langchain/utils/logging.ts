/**
 * Structured logging utilities for the agent system
 */

/**
 * Log levels for structured logging
 */
export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

/**
 * Log context interface for structured logging
 */
export type LogContext = Record<string, unknown>;

/**
 * Structured logger interface
 */
export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
}

/**
 * Creates a formatted log message with context
 */
const formatLogMessage = (
  level: LogLevel,
  message: string,
  context?: LogContext,
): string => {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  return `[${timestamp}] [${level}] ${message}${contextStr}`;
};

/**
 * Console-based logger implementation
 */
class ConsoleLogger implements Logger {
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(formatLogMessage(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    console.log(formatLogMessage(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(formatLogMessage(LogLevel.WARN, message, context));
  }

  error(message: string, context?: LogContext): void {
    console.error(formatLogMessage(LogLevel.ERROR, message, context));
  }
}

/**
 * Default logger instance
 */
export const logger: Logger = new ConsoleLogger();

/**
 * Creates a logger with a specific context prefix
 */
export const createContextLogger = (contextPrefix: string): Logger => ({
  debug: (message: string, context?: LogContext) =>
    logger.debug(`[${contextPrefix}] ${message}`, context),
  info: (message: string, context?: LogContext) =>
    logger.info(`[${contextPrefix}] ${message}`, context),
  warn: (message: string, context?: LogContext) =>
    logger.warn(`[${contextPrefix}] ${message}`, context),
  error: (message: string, context?: LogContext) =>
    logger.error(`[${contextPrefix}] ${message}`, context),
});

/**
 * Agent-specific logger factory
 */
export const createAgentLogger = (agentType: string): Logger =>
  createContextLogger(`Agent:${agentType}`);

/**
 * Utility logger factory
 */
export const createUtilityLogger = (utilityName: string): Logger =>
  createContextLogger(`Utility:${utilityName}`);
