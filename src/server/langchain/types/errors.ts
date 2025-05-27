/**
 * Custom error types for structured error handling in the agent system
 */

/**
 * Base error class for agent-related errors
 * Provides context about which agent encountered the error
 */
export class AgentError extends Error {
  constructor(
    message: string,
    public readonly agentType: string,
    public readonly originalError?: Error,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AgentError";
  }
}

/**
 * Error class for validation failures
 * Includes the original Zod validation errors for debugging
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: import("zod").ZodError,
    public readonly input?: unknown,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Error class for LLM-related failures
 * Includes model configuration for debugging
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly modelConfig?: Record<string, unknown>,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = "LLMError";
  }
}
