import type {
  CompletedAction,
  ValidatedToolCall,
  LoopMetrics,
  DuplicateCheckResult,
  LoopLimitCheckResult,
} from "../types";
import { AGENT_CONFIG } from "../config/agent-config";
import { logger } from "./logging";

/**
 * Loop control utilities for preventing infinite loops and managing duplicate actions
 */

/**
 * Creates a hash of content for duplicate detection
 * @param content - The content to hash
 * @returns A hash string for comparison
 */
export function createContentHash(content: string): string {
  // Simple hash function for content comparison
  // In production, consider using a more robust hashing algorithm
  let hash = 0;
  if (content.length === 0) return hash.toString();

  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
}

/**
 * Checks if an action is a duplicate of a previously completed action
 * @param newAction - The action to check
 * @param completedActions - Array of previously completed actions
 * @returns The duplicate action if found, null otherwise
 */
export function isDuplicateAction(
  newAction: Omit<CompletedAction, "id" | "timestamp">,
  completedActions: CompletedAction[],
): CompletedAction | null {
  if (completedActions.length === 0) return null;

  // Check for exact tool name and agent type match
  for (const completed of completedActions) {
    if (
      completed.agentType === newAction.agentType &&
      completed.toolName === newAction.toolName
    ) {
      // For content-based tools, only consider it a duplicate if content hashes match
      if (newAction.contentHash && completed.contentHash) {
        if (newAction.contentHash === completed.contentHash) {
          return completed;
        }
        // Different content hashes mean different content, not a duplicate
        continue;
      } else if (newAction.contentHash || completed.contentHash) {
        // One has content hash, the other doesn't - not a duplicate
        continue;
      } else {
        // For other tools, check args similarity
        const argsMatch =
          JSON.stringify(completed.args) === JSON.stringify(newAction.args);
        if (argsMatch) {
          return completed;
        }
      }
    }
  }

  return null;
}

/**
 * Determines if a tool call should be skipped due to duplication
 * @param toolCall - The tool call to check
 * @param agentType - The type of agent making the call
 * @param completedActions - Array of previously completed actions
 * @returns Object indicating whether to skip and why
 */
export function shouldSkipToolCall(
  toolCall: ValidatedToolCall,
  agentType: string,
  completedActions: CompletedAction[],
): DuplicateCheckResult {
  if (completedActions.length === 0) {
    return { skip: false };
  }

  // Create content hash for content-based tools
  let contentHash: string | undefined;
  if (
    toolCall.name === "parse_and_store_job_posting" &&
    typeof toolCall.args.content === "string"
  ) {
    contentHash = createContentHash(toolCall.args.content);
    logger.info("Created content hash for job posting", {
      toolName: toolCall.name,
      contentLength: toolCall.args.content.length,
      contentHash,
      agentType,
    });
  } else if (
    toolCall.name === "parse_and_store_resume" &&
    typeof toolCall.args.content === "string"
  ) {
    contentHash = createContentHash(toolCall.args.content);
    logger.info("Created content hash for resume", {
      toolName: toolCall.name,
      contentLength: toolCall.args.content.length,
      contentHash,
      agentType,
    });
  }

  const newAction: Omit<CompletedAction, "id" | "timestamp"> = {
    agentType,
    toolName: toolCall.name,
    args: toolCall.args,
    result: "", // Will be filled after execution
    contentHash,
  };

  const duplicate = isDuplicateAction(newAction, completedActions);

  if (duplicate) {
    const timeDiff = Date.now() - duplicate.timestamp;
    const isRecent = timeDiff < 5 * 60 * 1000; // 5 minutes

    logger.info("Duplicate action detected", {
      toolName: toolCall.name,
      agentType,
      timeDiff,
      isRecent,
      hasContentHash: !!contentHash,
      duplicateContentHash: duplicate.contentHash,
      contentHashMatch: contentHash === duplicate.contentHash,
    });

    // For content-based tools, only skip if it's the exact same content AND recent
    if (contentHash && duplicate.contentHash) {
      if (contentHash === duplicate.contentHash && isRecent) {
        logger.warn("Skipping duplicate content-based tool call", {
          toolName: toolCall.name,
          agentType,
          contentHash,
          timeDiff,
        });
        return {
          skip: true,
          reason: `This exact ${toolCall.name.replace(/_/g, " ")} content was already processed recently (${Math.round(timeDiff / 1000)}s ago)`,
          existingAction: duplicate,
        };
      }
      // Different content, allow processing
      logger.info("Allowing different content for content-based tool", {
        toolName: toolCall.name,
        agentType,
        newContentHash: contentHash,
        existingContentHash: duplicate.contentHash,
      });
      return { skip: false };
    }

    // For non-content-based tools, use the original logic
    logger.warn("Skipping duplicate non-content-based tool call", {
      toolName: toolCall.name,
      agentType,
      timeDiff,
      isRecent,
    });
    return {
      skip: true,
      reason: isRecent
        ? `This ${toolCall.name} was already executed recently (${Math.round(timeDiff / 1000)}s ago)`
        : `This ${toolCall.name} was already executed earlier in this conversation`,
      existingAction: duplicate,
    };
  }

  logger.info("No duplicate detected, allowing tool call", {
    toolName: toolCall.name,
    agentType,
    hasContentHash: !!contentHash,
    completedActionsCount: completedActions.length,
  });

  return { skip: false };
}

/**
 * Checks if loop limits have been exceeded
 * @param loopMetrics - Current loop metrics
 * @param agentType - Current agent type
 * @returns Object indicating if limits are exceeded
 */
export function checkLoopLimits(
  loopMetrics: LoopMetrics,
  agentType: string,
): LoopLimitCheckResult {
  const limits = AGENT_CONFIG.LOOP_LIMITS;

  // Check agent switches
  if (loopMetrics.agentSwitches >= limits.MAX_AGENT_SWITCHES) {
    return {
      exceeded: true,
      reason: `Maximum agent switches (${limits.MAX_AGENT_SWITCHES}) exceeded`,
      suggestion:
        "Consider breaking down your request into smaller, more specific tasks.",
    };
  }

  // Check tool calls per agent
  const agentToolCalls = loopMetrics.toolCallsPerAgent[agentType] ?? 0;
  if (agentToolCalls >= limits.MAX_TOOL_CALLS_PER_AGENT) {
    return {
      exceeded: true,
      reason: `Maximum tool calls for ${agentType} (${limits.MAX_TOOL_CALLS_PER_AGENT}) exceeded`,
      suggestion:
        "The agent has made many attempts. Please try rephrasing your request or provide more specific information.",
    };
  }

  // Check clarification rounds
  if (loopMetrics.clarificationRounds >= limits.MAX_CLARIFICATION_ROUNDS) {
    return {
      exceeded: true,
      reason: `Maximum clarification rounds (${limits.MAX_CLARIFICATION_ROUNDS}) exceeded`,
      suggestion:
        "Too many clarification attempts. Please provide a more direct request.",
    };
  }

  return { exceeded: false };
}

/**
 * Updates loop metrics for the current agent action
 * @param currentMetrics - Current loop metrics
 * @param agentType - Type of agent being executed
 * @param toolCallCount - Number of tool calls made
 * @returns Updated loop metrics
 */
export function updateLoopMetrics(
  currentMetrics: LoopMetrics,
  agentType: string,
  toolCallCount = 0,
): LoopMetrics {
  const agentSwitches =
    currentMetrics.lastAgentType && currentMetrics.lastAgentType !== agentType
      ? currentMetrics.agentSwitches + 1
      : currentMetrics.agentSwitches;

  const toolCallsPerAgent = {
    ...currentMetrics.toolCallsPerAgent,
    [agentType]:
      (currentMetrics.toolCallsPerAgent[agentType] ?? 0) + toolCallCount,
  };

  return {
    agentSwitches,
    toolCallsPerAgent,
    clarificationRounds: currentMetrics.clarificationRounds,
    lastAgentType: agentType,
  };
}

/**
 * Resets loop metrics to initial state
 * @returns Fresh loop metrics object
 */
export function resetLoopMetrics(): LoopMetrics {
  return {
    agentSwitches: 0,
    toolCallsPerAgent: {},
    clarificationRounds: 0,
    lastAgentType: null,
  };
}

/**
 * Increments clarification rounds in loop metrics
 * @param currentMetrics - Current loop metrics
 * @returns Updated loop metrics with incremented clarification rounds
 */
export function incrementClarificationRounds(
  currentMetrics: LoopMetrics,
): LoopMetrics {
  return {
    ...currentMetrics,
    clarificationRounds: currentMetrics.clarificationRounds + 1,
  };
}

/**
 * Gets a summary of current loop metrics for logging/debugging
 * @param metrics - Loop metrics to summarize
 * @returns Human-readable summary
 */
export function getLoopMetricsSummary(metrics: LoopMetrics): string {
  const totalToolCalls = Object.values(metrics.toolCallsPerAgent).reduce(
    (sum, count) => sum + count,
    0,
  );

  return `Agent switches: ${metrics.agentSwitches}, Total tool calls: ${totalToolCalls}, Clarification rounds: ${metrics.clarificationRounds}, Last agent: ${metrics.lastAgentType ?? "none"}`;
}
