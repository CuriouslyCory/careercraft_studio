/**
 * Error type definitions for the tailored resume generator service
 */

/**
 * Base error class for all resume generator errors
 */
export class ResumeGeneratorError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "ResumeGeneratorError";
    this.code = code;
    this.context = context;
    this.timestamp = new Date();

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ResumeGeneratorError);
    }
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause?.message,
    };
  }
}

/**
 * Error thrown when LLM processing fails
 */
export class LLMProcessingError extends ResumeGeneratorError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, "LLM_PROCESSING_ERROR", context, cause);
    this.name = "LLMProcessingError";
  }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends ResumeGeneratorError {
  public readonly field?: string;
  public readonly validationRule?: string;

  constructor(
    message: string,
    field?: string,
    validationRule?: string,
    context?: Record<string, unknown>,
  ) {
    super(message, "VALIDATION_ERROR", context);
    this.name = "ValidationError";
    this.field = field;
    this.validationRule = validationRule;
  }
}

/**
 * Error thrown when user data is not found or inaccessible
 */
export class UserDataError extends ResumeGeneratorError {
  public readonly userId?: string;

  constructor(
    message: string,
    userId?: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, "USER_DATA_ERROR", context, cause);
    this.name = "UserDataError";
    this.userId = userId;
  }
}

/**
 * Error thrown when job posting data is not found or inaccessible
 */
export class JobPostingError extends ResumeGeneratorError {
  public readonly jobPostingId?: string;

  constructor(
    message: string,
    jobPostingId?: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, "JOB_POSTING_ERROR", context, cause);
    this.name = "JobPostingError";
    this.jobPostingId = jobPostingId;
  }
}

/**
 * Error thrown when work experience classification fails
 */
export class ClassificationError extends ResumeGeneratorError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, "CLASSIFICATION_ERROR", context, cause);
    this.name = "ClassificationError";
  }
}

/**
 * Error thrown when resume formatting fails
 */
export class FormattingError extends ResumeGeneratorError {
  public readonly format?: string;

  constructor(
    message: string,
    format?: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, "FORMATTING_ERROR", context, cause);
    this.name = "FormattingError";
    this.format = format;
  }
}

/**
 * Error thrown when database operations fail
 */
export class DatabaseError extends ResumeGeneratorError {
  public readonly operation?: string;
  public readonly table?: string;

  constructor(
    message: string,
    operation?: string,
    table?: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, "DATABASE_ERROR", context, cause);
    this.name = "DatabaseError";
    this.operation = operation;
    this.table = table;
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends ResumeGeneratorError {
  public readonly configKey?: string;

  constructor(
    message: string,
    configKey?: string,
    context?: Record<string, unknown>,
  ) {
    super(message, "CONFIGURATION_ERROR", context);
    this.name = "ConfigurationError";
    this.configKey = configKey;
  }
}

/**
 * Error thrown when rate limits are exceeded
 */
export class RateLimitError extends ResumeGeneratorError {
  public readonly limit: number;
  public readonly resetTime?: Date;

  constructor(
    message: string,
    limit: number,
    resetTime?: Date,
    context?: Record<string, unknown>,
  ) {
    super(message, "RATE_LIMIT_ERROR", context);
    this.name = "RateLimitError";
    this.limit = limit;
    this.resetTime = resetTime;
  }
}

/**
 * Error thrown when external service calls fail
 */
export class ExternalServiceError extends ResumeGeneratorError {
  public readonly service: string;
  public readonly statusCode?: number;

  constructor(
    message: string,
    service: string,
    statusCode?: number,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, "EXTERNAL_SERVICE_ERROR", context, cause);
    this.name = "ExternalServiceError";
    this.service = service;
    this.statusCode = statusCode;
  }
}

/**
 * Error thrown when operations timeout
 */
export class TimeoutError extends ResumeGeneratorError {
  public readonly timeoutMs: number;
  public readonly operation: string;

  constructor(
    message: string,
    operation: string,
    timeoutMs: number,
    context?: Record<string, unknown>,
  ) {
    super(message, "TIMEOUT_ERROR", context);
    this.name = "TimeoutError";
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Union type of all possible resume generator errors
 */
export type ResumeGeneratorErrorType =
  | ResumeGeneratorError
  | LLMProcessingError
  | ValidationError
  | UserDataError
  | JobPostingError
  | ClassificationError
  | FormattingError
  | DatabaseError
  | ConfigurationError
  | RateLimitError
  | ExternalServiceError
  | TimeoutError;

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Error context for logging and debugging
 */
export interface ErrorContext {
  userId?: string;
  jobPostingId?: string;
  operation: string;
  timestamp: Date;
  severity: ErrorSeverity;
  metadata?: Record<string, unknown>;
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  logErrors: boolean;
  includeStackTrace: boolean;
  notifyOnCritical: boolean;
  retryableErrors: string[];
  maxRetries: number;
}

/**
 * Type guard to check if an error is a ResumeGeneratorError
 */
export const isResumeGeneratorError = (
  error: unknown,
): error is ResumeGeneratorError => {
  return error instanceof ResumeGeneratorError;
};

/**
 * Type guard to check if an error is retryable
 */
export const isRetryableError = (
  error: unknown,
  retryableErrorCodes: string[] = [
    "LLM_PROCESSING_ERROR",
    "EXTERNAL_SERVICE_ERROR",
    "TIMEOUT_ERROR",
    "DATABASE_ERROR",
  ],
): boolean => {
  if (!isResumeGeneratorError(error)) {
    return false;
  }
  return retryableErrorCodes.includes(error.code);
};

/**
 * Utility to create error context
 */
export const createErrorContext = (
  operation: string,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  metadata?: Record<string, unknown>,
): ErrorContext => {
  return {
    operation,
    timestamp: new Date(),
    severity,
    metadata,
  };
};

/**
 * Utility to wrap async operations with error handling
 */
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  config?: Partial<ErrorHandlerConfig>,
): Promise<T> => {
  const defaultConfig: ErrorHandlerConfig = {
    logErrors: true,
    includeStackTrace: true,
    notifyOnCritical: false,
    retryableErrors: ["LLM_PROCESSING_ERROR", "EXTERNAL_SERVICE_ERROR"],
    maxRetries: 2,
  };

  const finalConfig = { ...defaultConfig, ...config };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Log error if configured
      if (finalConfig.logErrors) {
        console.error("Operation failed:", {
          context,
          error: lastError.message,
          attempt: attempt + 1,
          maxRetries: finalConfig.maxRetries,
          stack: finalConfig.includeStackTrace ? lastError.stack : undefined,
        });
      }

      // Check if error is retryable and we have attempts left
      if (
        attempt < finalConfig.maxRetries &&
        isRetryableError(lastError, finalConfig.retryableErrors)
      ) {
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // If we reach here, either error is not retryable or we've exhausted retries
      break;
    }
  }

  // Throw the last error
  throw lastError;
};
