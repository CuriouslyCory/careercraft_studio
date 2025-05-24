// =============================================================================
// TOOL ERROR CLASSES
// =============================================================================

export class ToolError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 400,
    public context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ToolError";
  }
}

export class UserNotFoundError extends ToolError {
  constructor(userId?: string) {
    super(
      "User ID is required but not provided. Please ensure you're logged in.",
      "USER_NOT_FOUND",
      401,
      { userId },
    );
  }
}

export class ResourceNotFoundError extends ToolError {
  constructor(resource: string, id?: string) {
    super(
      `${resource} not found${id ? ` with ID: ${id}` : ""}`,
      "RESOURCE_NOT_FOUND",
      404,
      { resource, id },
    );
  }
}

export class ValidationError extends ToolError {
  constructor(message: string, field?: string) {
    super(message, "VALIDATION_ERROR", 400, { field });
  }
}

export class DatabaseError extends ToolError {
  constructor(operation: string, originalError?: Error) {
    super(`Database operation failed: ${operation}`, "DATABASE_ERROR", 500, {
      operation,
      originalError: originalError?.message,
    });
  }
}

export class UnauthorizedError extends ToolError {
  constructor(resource: string, action: string) {
    super(`Unauthorized to ${action} ${resource}`, "UNAUTHORIZED", 403, {
      resource,
      action,
    });
  }
}

// =============================================================================
// ERROR HANDLING UTILITIES
// =============================================================================

/**
 * Standardized error handler for all tools
 * Converts errors to user-friendly strings
 */
export const handleToolError = (error: unknown, context?: string): string => {
  console.error(`Tool error${context ? ` in ${context}` : ""}:`, error);

  if (error instanceof ToolError) {
    return `Error [${error.code}]: ${error.message}`;
  }

  if (error instanceof Error) {
    // Handle known database errors
    if (error.message.includes("Unique constraint")) {
      return "Error [DUPLICATE]: This record already exists.";
    }
    if (error.message.includes("Foreign key constraint")) {
      return "Error [REFERENCE]: Referenced record does not exist.";
    }
    if (error.message.includes("timeout")) {
      return "Error [TIMEOUT]: Operation timed out. Please try again.";
    }

    return `Error: ${error.message}`;
  }

  return `Unexpected error: ${String(error)}`;
};

/**
 * Validates that a user ID is provided
 * @param userId - The user ID to validate
 * @throws UserNotFoundError if userId is falsy
 */
export const validateUserId: (
  userId: string | undefined,
) => asserts userId is string = (userId) => {
  if (!userId) {
    throw new UserNotFoundError(userId);
  }
};

/**
 * Wraps async tool functions with standardized error handling
 */
export const withErrorHandling = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string,
) => {
  return async (...args: T): Promise<string> => {
    try {
      const result = await fn(...args);

      // If result is already a string (success message), return it
      if (typeof result === "string") {
        return result;
      }

      // If result is an object, stringify it
      return JSON.stringify(result);
    } catch (error) {
      return handleToolError(error, context);
    }
  };
};

/**
 * Checks if a response indicates an error
 */
export const isErrorResponse = (response: string): boolean => {
  return (
    response.startsWith("Error") ||
    response.includes("not found") ||
    response.includes("failed") ||
    response.includes("unauthorized")
  );
};

// =============================================================================
// SUCCESS RESPONSE HELPERS
// =============================================================================

/**
 * Creates a standardized success message
 */
export const createSuccessMessage = (
  action: string,
  resource: string,
  details?: string,
): string => {
  const message = `Successfully ${action} ${resource}`;
  return details ? `${message}: ${details}` : message;
};

/**
 * Formats data for tool response
 */
export const formatToolResponse = <T>(data: T): string => {
  if (typeof data === "string") {
    return data;
  }

  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};
