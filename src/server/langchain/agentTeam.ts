/**
 * @deprecated This file is deprecated. Use the modular structure instead:
 * - Graph creation: import from "~/server/langchain/graph"
 * - Message processing: import from "~/server/langchain/utils"
 * - Types: import from "~/server/langchain/types"
 * - Agents: import from "~/server/langchain/agents"
 * - Configuration: import from "~/server/langchain/config"
 *
 * This file will be removed in a future version.
 * Please update your imports to use the new modular structure.
 * See cursor-docs/agent-team-refactoring-plan.md for migration guide.
 */

// Re-export for backward compatibility
export { createAgentTeam } from "./graph";
export { convertToAgentStateInput } from "./utils";
export type { AgentStateType } from "./types";

// Legacy exports that may be used elsewhere
export { createLLM } from "./utils";

// Add runtime deprecation warning
console.warn(
  "⚠️  DEPRECATION WARNING: agentTeam.ts is deprecated. " +
    "Please update imports to use the modular structure. " +
    "See cursor-docs/agent-team-refactoring-plan.md for migration guide.",
);
