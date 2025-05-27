import { z } from "zod";
import { AgentError, ValidationError } from "../types/errors";
import type { ValidatedToolCall } from "../types/interfaces";
import { logger } from "./logging";

/**
 * Validation utilities for the agent system
 */

/**
 * Validates that a user ID is present and non-empty
 * @param userId - The user ID to validate
 * @returns The validated user ID
 * @throws AgentError if user ID is invalid
 */
export function validateUserId(userId?: string): string {
  if (!userId || userId.trim() === "") {
    throw new AgentError(
      "User ID is required but not provided",
      "validation",
      undefined,
      { userId },
    );
  }
  return userId;
}

/**
 * Validates and parses tool arguments using a Zod schema
 * @param args - The arguments to validate
 * @param schema - The Zod schema to validate against
 * @param toolName - The name of the tool for error context
 * @returns The validated and parsed arguments
 * @throws ValidationError if validation fails
 */
export function validateToolArgs<T>(
  args: unknown,
  schema: z.ZodSchema<T>,
  toolName: string,
): T {
  try {
    let parsedArgs: unknown;

    if (typeof args === "string") {
      try {
        parsedArgs = JSON.parse(args) as unknown;
      } catch {
        throw new ValidationError(
          `Failed to parse JSON arguments for tool ${toolName}`,
          new z.ZodError([]),
          args,
        );
      }
    } else {
      parsedArgs = args;
    }

    const result = schema.safeParse(parsedArgs);

    if (!result.success) {
      throw new ValidationError(
        `Invalid arguments for tool ${toolName}`,
        result.error,
        args,
      );
    }

    return result.data;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(
      `Failed to parse arguments for tool ${toolName}`,
      new z.ZodError([]),
      args,
    );
  }
}

/**
 * Processes and validates tool calls from LLM responses
 * @param toolCalls - Raw tool calls from LLM response
 * @returns Array of validated tool calls
 */
export function processToolCalls(
  toolCalls: Array<{
    name?: string;
    args?: unknown;
    id?: string;
    type?: string;
  }>,
): ValidatedToolCall[] {
  return toolCalls
    .filter(Boolean)
    .map((toolCall) => {
      if (!toolCall?.name || !toolCall?.id || toolCall?.type !== "tool_call") {
        logger.warn("Filtering out invalid tool call", { toolCall });
        return null;
      }

      let parsedArgs: Record<string, unknown>;
      try {
        parsedArgs =
          typeof toolCall.args === "string"
            ? (JSON.parse(toolCall.args) as Record<string, unknown>)
            : ((toolCall.args as Record<string, unknown>) ?? {});
      } catch (parseError) {
        logger.warn("Failed to parse tool call args, using empty object", {
          toolCall: toolCall.name,
          error: parseError,
        });
        parsedArgs = {};
      }

      return {
        name: toolCall.name,
        args: parsedArgs,
        id: toolCall.id,
        type: "tool_call" as const,
      };
    })
    .filter((tc): tc is ValidatedToolCall => tc !== null);
}

/**
 * Validates that a tool call has required properties
 * @param toolCall - The tool call to validate
 * @returns True if valid, false otherwise
 */
export function isValidToolCall(
  toolCall: unknown,
): toolCall is ValidatedToolCall {
  if (!toolCall || typeof toolCall !== "object") {
    return false;
  }

  const tc = toolCall as Record<string, unknown>;

  return (
    typeof tc.name === "string" &&
    typeof tc.id === "string" &&
    tc.type === "tool_call" &&
    typeof tc.args === "object" &&
    tc.args !== null
  );
}

/**
 * Sanitizes tool arguments by removing potentially dangerous properties
 * @param args - The arguments to sanitize
 * @returns Sanitized arguments
 */
export function sanitizeToolArgs(
  args: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized = { ...args };

  // Remove potentially dangerous properties using bracket notation
  const dangerousProps = ["__proto__", "constructor", "prototype"] as const;

  for (const prop of dangerousProps) {
    if (prop in sanitized) {
      delete sanitized[prop];
    }
  }

  return sanitized;
}
