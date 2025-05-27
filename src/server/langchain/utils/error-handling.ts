import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import { AgentError, ValidationError, LLMError } from "../types/errors";
import { logger } from "./logging";

/**
 * Error handling utilities for the agent system
 */

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  messages: BaseMessage[];
  next: string;
  error?: {
    type: string;
    message: string;
    context?: Record<string, unknown>;
  };
}

/**
 * Handles agent errors consistently across the system
 * @param error - The error that occurred
 * @param agentType - Type of agent where error occurred
 * @returns Standardized error response
 */
export function handleAgentError(
  error: unknown,
  agentType: string,
): ErrorResponse {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error(`Error in ${agentType} agent`, {
    error: errorMessage,
    agentType,
    stack: errorStack,
  });

  let userFriendlyMessage =
    "I encountered an unexpected error while processing your request.";
  let errorType = "unknown";
  let errorContext: Record<string, unknown> | undefined;

  // Handle specific known errors with better messages
  if (
    errorMessage.includes(
      "Cannot read properties of undefined (reading 'length')",
    ) &&
    errorStack?.includes("mapGenerateContentResultToChatResult")
  ) {
    logger.error("Detected LangChain Google GenAI bug in agent", { agentType });
    userFriendlyMessage =
      "I'm experiencing a temporary issue with the AI service. Let me try a different approach.";
    errorType = "langchain_genai_bug";
  } else if (
    errorMessage.includes("MALFORMED_FUNCTION_CALL") ||
    errorMessage.includes("Unknown field for Schema") ||
    errorMessage.includes("must be specified")
  ) {
    logger.error("Detected Google GenAI schema/function call error in agent", {
      agentType,
    });
    userFriendlyMessage =
      "I'm having trouble with my tools. Let me try to help you another way.";
    errorType = "genai_schema_error";
  } else if (error instanceof AgentError) {
    userFriendlyMessage = `I encountered an error: ${error.message}`;
    errorType = "agent_error";
    errorContext = error.context;
  } else if (error instanceof ValidationError) {
    userFriendlyMessage = `I encountered a validation error: ${error.message}`;
    errorType = "validation_error";
    errorContext = { input: error.input };
  } else if (error instanceof LLMError) {
    userFriendlyMessage =
      "I'm having trouble connecting to the AI service. Please try again.";
    errorType = "llm_error";
    errorContext = error.modelConfig;
  }

  return {
    messages: [new AIMessage(`${userFriendlyMessage} Please try again.`)],
    next: "supervisor",
    error: {
      type: errorType,
      message: errorMessage,
      context: errorContext,
    },
  };
}

/**
 * Handles validation errors with detailed feedback
 * @param error - Validation error
 * @param context - Additional context about what was being validated
 * @returns User-friendly error message
 */
export function handleValidationError(
  error: ValidationError,
  context?: string,
): string {
  const contextStr = context ? ` while ${context}` : "";

  if (error.validationErrors.issues.length > 0) {
    const issues = error.validationErrors.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");

    return `Validation failed${contextStr}: ${issues}`;
  }

  return `Validation failed${contextStr}: ${error.message}`;
}

/**
 * Handles LLM errors with appropriate retry logic
 * @param error - LLM error
 * @param retryCount - Current retry attempt
 * @param maxRetries - Maximum number of retries
 * @returns Error response with retry information
 */
export function handleLLMError(
  error: LLMError,
  retryCount = 0,
  maxRetries = 2,
): ErrorResponse & { shouldRetry: boolean } {
  const shouldRetry = retryCount < maxRetries;

  logger.error("LLM error occurred", {
    error: error.message,
    retryCount,
    maxRetries,
    shouldRetry,
    modelConfig: error.modelConfig,
  });

  let userMessage: string;

  if (shouldRetry) {
    userMessage = `I'm experiencing a temporary issue with the AI service. Retrying... (attempt ${retryCount + 1}/${maxRetries + 1})`;
  } else {
    userMessage =
      "I'm having persistent issues with the AI service. Please try again later or contact support if the problem continues.";
  }

  return {
    messages: [new AIMessage(userMessage)],
    next: shouldRetry ? "supervisor" : "__end__",
    shouldRetry,
    error: {
      type: "llm_error",
      message: error.message,
      context: {
        retryCount,
        maxRetries,
        modelConfig: error.modelConfig,
      },
    },
  };
}

/**
 * Handles timeout errors
 * @param operation - Name of the operation that timed out
 * @param timeout - Timeout value in milliseconds
 * @returns Error response for timeout
 */
export function handleTimeoutError(
  operation: string,
  timeout: number,
): ErrorResponse {
  const timeoutSeconds = Math.round(timeout / 1000);

  logger.error("Operation timed out", {
    operation,
    timeout,
    timeoutSeconds,
  });

  return {
    messages: [
      new AIMessage(
        `The ${operation} operation took too long (over ${timeoutSeconds} seconds). Please try again with a simpler request.`,
      ),
    ],
    next: "supervisor",
    error: {
      type: "timeout_error",
      message: `${operation} timed out after ${timeoutSeconds} seconds`,
      context: { operation, timeout },
    },
  };
}

/**
 * Handles network/connectivity errors
 * @param error - Network error
 * @returns Error response for network issues
 */
export function handleNetworkError(error: Error): ErrorResponse {
  logger.error("Network error occurred", {
    error: error.message,
    stack: error.stack,
  });

  return {
    messages: [
      new AIMessage(
        "I'm having trouble connecting to external services. Please check your internet connection and try again.",
      ),
    ],
    next: "supervisor",
    error: {
      type: "network_error",
      message: error.message,
    },
  };
}

/**
 * Creates a recovery strategy for different error types
 * @param errorType - Type of error that occurred
 * @param context - Additional context about the error
 * @returns Recovery strategy object
 */
export function createRecoveryStrategy(
  errorType: string,
  context?: Record<string, unknown>,
): {
  action: "retry" | "fallback" | "escalate" | "abort";
  message: string;
  delay?: number;
} {
  switch (errorType) {
    case "network_error":
    case "timeout_error":
      return {
        action: "retry",
        message: "Retrying with exponential backoff",
        delay: 1000,
      };

    case "llm_error":
      return {
        action: "fallback",
        message: "Switching to fallback model or simplified processing",
      };

    case "validation_error":
      return {
        action: "escalate",
        message: "Requesting user clarification or correction",
      };

    case "agent_error":
      return {
        action: "fallback",
        message: "Routing to different agent or simplified workflow",
      };

    default:
      return {
        action: "abort",
        message: "Unknown error type, aborting operation",
      };
  }
}

/**
 * Logs error metrics for monitoring and debugging
 * @param error - Error that occurred
 * @param agentType - Type of agent where error occurred
 * @param operation - Operation being performed when error occurred
 */
export function logErrorMetrics(
  error: unknown,
  agentType: string,
  operation: string,
): void {
  const errorType = error instanceof Error ? error.constructor.name : "Unknown";
  const errorMessage = error instanceof Error ? error.message : String(error);

  logger.error("Error metrics", {
    errorType,
    errorMessage,
    agentType,
    operation,
    timestamp: Date.now(),
    stack: error instanceof Error ? error.stack : undefined,
  });
}

/**
 * Checks if an error is recoverable
 * @param error - Error to check
 * @returns True if error is recoverable, false otherwise
 */
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof ValidationError) {
    return true; // Can ask user for correction
  }

  if (error instanceof LLMError) {
    return true; // Can retry or use fallback
  }

  if (error instanceof Error) {
    // Network errors are usually recoverable
    if (
      error.message.includes("network") ||
      error.message.includes("timeout")
    ) {
      return true;
    }

    // Rate limiting is recoverable
    if (
      error.message.includes("rate limit") ||
      error.message.includes("quota")
    ) {
      return true;
    }
  }

  return false;
}
