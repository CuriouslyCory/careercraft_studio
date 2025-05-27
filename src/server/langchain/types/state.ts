import { Annotation } from "@langchain/langgraph";
import { END } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";
import type { CompletedAction, PendingClarification } from "./schemas";

/**
 * State management for the agent system
 */

/**
 * Define the state that is passed between nodes in the graph
 */
export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  // The agent node that last performed work (for routing)
  next: Annotation<string>({
    reducer: (x, y) => y ?? x ?? END,
    default: () => "supervisor", // Start with the supervisor
  }),
  // User ID to be used by tools - not accessible to LLM directly
  userId: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  // Track completed actions to prevent duplicates
  completedActions: Annotation<CompletedAction[]>({
    reducer: (x, y) => [...x, ...y],
    default: () => [],
  }),
  // Track pending clarifications
  pendingClarification: Annotation<PendingClarification | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  // Track loop metrics for termination control
  loopMetrics: Annotation<{
    agentSwitches: number;
    toolCallsPerAgent: Record<string, number>;
    clarificationRounds: number;
    lastAgentType: string | null;
  }>({
    reducer: (x, y) => ({
      agentSwitches: y?.agentSwitches ?? x?.agentSwitches ?? 0,
      toolCallsPerAgent: { ...x?.toolCallsPerAgent, ...y?.toolCallsPerAgent },
      clarificationRounds:
        y?.clarificationRounds ?? x?.clarificationRounds ?? 0,
      lastAgentType: y?.lastAgentType ?? x?.lastAgentType ?? null,
    }),
    default: () => ({
      agentSwitches: 0,
      toolCallsPerAgent: {},
      clarificationRounds: 0,
      lastAgentType: null,
    }),
  }),
});

/**
 * Type for the agent state
 */
export type AgentStateType = {
  messages: BaseMessage[];
  next: string;
  userId?: string;
  completedActions?: CompletedAction[];
  pendingClarification?: PendingClarification | null;
  loopMetrics?: {
    agentSwitches: number;
    toolCallsPerAgent: Record<string, number>;
    clarificationRounds: number;
    lastAgentType: string | null;
  };
};

/**
 * Utility functions for state management
 */

/**
 * Creates initial state for a new conversation
 */
export const createInitialState = (userId?: string): AgentStateType => ({
  messages: [],
  next: "supervisor",
  userId,
  completedActions: [],
  pendingClarification: null,
  loopMetrics: {
    agentSwitches: 0,
    toolCallsPerAgent: {},
    clarificationRounds: 0,
    lastAgentType: null,
  },
});

/**
 * Validates state structure
 */
export const validateState = (state: unknown): state is AgentStateType => {
  if (!state || typeof state !== "object") {
    return false;
  }

  const s = state as Record<string, unknown>;

  return (
    Array.isArray(s.messages) &&
    typeof s.next === "string" &&
    (s.userId === undefined || typeof s.userId === "string") &&
    (s.completedActions === undefined || Array.isArray(s.completedActions)) &&
    (s.pendingClarification === undefined ||
      s.pendingClarification === null ||
      typeof s.pendingClarification === "object") &&
    (s.loopMetrics === undefined || typeof s.loopMetrics === "object")
  );
};
