import { START, END, StateGraph } from "@langchain/langgraph";
import { AgentState } from "../types";
import {
  supervisorNode,
  dataManagerNode,
  resumeGeneratorNode,
  coverLetterGeneratorNode,
  userProfileNode,
  jobPostingManagerNode,
} from "../agents/index";
import { logger } from "../utils";

/**
 * Creates the agent team graph with all nodes and routing logic
 * @returns Compiled StateGraph for the agent team
 */
export function createAgentTeam() {
  try {
    logger.info("Creating StateGraph with agent nodes...");

    // Create the StateGraph with our agent state
    const workflow = new StateGraph(AgentState)
      // Add nodes for each agent
      .addNode("supervisor", supervisorNode)
      .addNode("data_manager", dataManagerNode)
      .addNode("resume_generator", resumeGeneratorNode)
      .addNode("cover_letter_generator", coverLetterGeneratorNode)
      .addNode("user_profile", userProfileNode)
      .addNode("job_posting_manager", jobPostingManagerNode);

    logger.info("Added all agent nodes to the graph");

    // Define edges - always start with the supervisor
    workflow.addEdge(START, "supervisor");
    logger.info("Added START -> supervisor edge");

    // Create a debug wrapper for the routing function
    const debugRouting = (state: typeof AgentState.State) => {
      logger.info(`Routing decision based on state.next: "${state.next}"`);
      // Convert "__end__" string to END symbol if needed
      return state.next === "__end__" ? END : state.next;
    };

    // From supervisor, route to the appropriate agent based on the 'next' state
    workflow.addConditionalEdges(
      "supervisor",
      debugRouting, // Use wrapped function with logging
      {
        data_manager: "data_manager",
        resume_generator: "resume_generator",
        cover_letter_generator: "cover_letter_generator",
        user_profile: "user_profile",
        job_posting_manager: "job_posting_manager",
        [END]: END, // Handle END symbol for internal routing
      },
    );
    logger.info("Added conditional edges from supervisor");

    // From each agent, return to supervisor for next decision
    workflow.addEdge("data_manager", "supervisor");
    workflow.addEdge("resume_generator", "supervisor");
    workflow.addEdge("cover_letter_generator", "supervisor");
    workflow.addEdge("user_profile", "supervisor");
    workflow.addEdge("job_posting_manager", "supervisor");
    logger.info("Added edges from specialized agents back to supervisor");

    // Compile the graph
    logger.info("Compiling the graph...");
    const compiledGraph = workflow.compile();
    logger.info("StateGraph successfully compiled");

    return compiledGraph;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Error creating agent team", { error: errorMessage });
    throw new Error(`Failed to create agent team: ${errorMessage}`);
  }
}

/**
 * Validates the graph structure and routing logic
 * @param graph - Compiled graph to validate
 * @returns Validation result
 */
export function validateAgentGraph(graph: ReturnType<typeof createAgentTeam>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Basic validation - ensure graph exists and is compiled
    if (!graph) {
      errors.push("Graph is null or undefined");
      return { isValid: false, errors, warnings };
    }

    // Check if graph has the expected structure
    // Note: LangGraph doesn't expose internal structure for validation
    // This is a placeholder for future validation logic

    logger.info("Agent graph validation completed", {
      isValid: errors.length === 0,
      errorCount: errors.length,
      warningCount: warnings.length,
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(`Validation failed: ${errorMessage}`);

    logger.error("Error during graph validation", { error: errorMessage });

    return {
      isValid: false,
      errors,
      warnings,
    };
  }
}

/**
 * Gets information about the agent graph structure
 * @returns Graph information object
 */
export function getGraphInfo(): {
  nodeCount: number;
  nodes: string[];
  entryPoint: string;
  description: string;
} {
  return {
    nodeCount: 6,
    nodes: [
      "supervisor",
      "data_manager",
      "resume_generator",
      "cover_letter_generator",
      "user_profile",
      "job_posting_manager",
    ],
    entryPoint: "supervisor",
    description:
      "Multi-agent system for resume and cover letter generation with specialized agents for different tasks",
  };
}
