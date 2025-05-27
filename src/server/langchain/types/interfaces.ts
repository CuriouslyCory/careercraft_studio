import type { BaseMessage } from "@langchain/core/messages";
import type { CompletedAction, PendingClarification } from "./schemas";

/**
 * TypeScript interfaces and types for the agent system
 */

/**
 * Type-safe tool call interface for validated tool calls
 */
export interface ValidatedToolCall {
  name: string;
  args: Record<string, unknown>;
  id: string;
  type: "tool_call";
}

/**
 * Agent configuration interface for the factory pattern
 */
export interface AgentConfig {
  agentType: string;
  systemMessage: string;
  getTools: (
    userId: string,
  ) => Array<{ name: string; invoke: (args: unknown) => Promise<string> }>;
  processToolCalls?: (
    toolCalls: ValidatedToolCall[],
    userId: string,
    response: {
      content?: unknown;
      tool_calls?: Array<{
        name?: string;
        args?: unknown;
        id?: string;
        type?: string;
      }>;
    },
    completedActions?: CompletedAction[],
  ) => Promise<string>;
  requiresUserId?: boolean;
}

/**
 * Loop metrics for tracking agent behavior and preventing infinite loops
 */
export interface LoopMetrics {
  agentSwitches: number;
  toolCallsPerAgent: Record<string, number>;
  clarificationRounds: number;
  lastAgentType: string | null;
}

/**
 * Result of duplicate action checking
 */
export interface DuplicateCheckResult {
  skip: boolean;
  reason?: string;
  existingAction?: CompletedAction;
}

/**
 * Result of loop limit checking
 */
export interface LoopLimitCheckResult {
  exceeded: boolean;
  reason?: string;
  suggestion?: string;
}

/**
 * LLM part types for content processing
 */
export type LLMPart =
  | { type: "text"; text: string }
  | { type: "functionCall"; functionCall: unknown }
  | Record<string, unknown>;

/**
 * Tool execution context
 */
export interface ToolExecutionContext {
  userId: string;
  agentType: string;
  completedActions: CompletedAction[];
  loopMetrics: LoopMetrics;
}
