import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { env } from "~/env";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { END, START, StateGraph } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import {
  getUserProfileTool,
  getDataManagerTools,
  getResumeGeneratorTools,
  getCoverLetterGeneratorTools,
  getUserProfileTools,
  getSupervisorTools,
  getJobPostingTools,
} from "./tools";
import { z } from "zod";

// Configuration constants
const AGENT_CONFIG = {
  MODEL: "gemini-2.0-flash",
  TEMPERATURE: {
    SUPERVISOR: 0.0,
    AGENTS: 0.2,
  },
  TIMEOUTS: {
    LLM_INVOKE: 30000,
    TOOL_EXECUTION: 15000,
  },
  LOOP_LIMITS: {
    MAX_AGENT_SWITCHES: 10,
    MAX_TOOL_CALLS_PER_AGENT: 5,
    MAX_CLARIFICATION_ROUNDS: 3,
    MAX_DUPLICATE_CHECKS: 100, // Prevent excessive duplicate checking
  },
} as const;

// Zod validation schemas
const RouteToAgentSchema = z.object({
  next: z.enum([
    "data_manager",
    "resume_generator",
    "cover_letter_generator",
    "user_profile",
    "job_posting_manager",
    "__end__",
  ]),
});

const StoreUserPreferenceSchema = z.object({
  category: z.string().min(1),
  preference: z.string().min(1),
});

const StoreWorkHistorySchema = z.object({
  jobTitle: z.string().min(1),
  companyName: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  responsibilities: z.array(z.string()).optional(),
  achievements: z.array(z.string()).optional(),
});

const GetUserProfileSchema = z.object({
  dataType: z.enum([
    "work_history",
    "education",
    "skills",
    "achievements",
    "preferences",
    "all",
  ]),
});

const ParseJobPostingSchema = z.object({
  content: z.string().min(1),
});

// NEW: Action tracking and clarification types
const _CompletedActionSchema = z.object({
  id: z.string(),
  agentType: z.string(),
  toolName: z.string(),
  args: z.record(z.unknown()),
  result: z.string(),
  timestamp: z.number(),
  contentHash: z.string().optional(),
});

const ClarificationOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  action: z.object({
    agentType: z.string(),
    toolName: z.string(),
    args: z.record(z.unknown()),
  }),
});

const _PendingClarificationSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(ClarificationOptionSchema),
  context: z.record(z.unknown()),
  timestamp: z.number(),
});

// TypeScript interfaces derived from schemas
type CompletedAction = z.infer<typeof _CompletedActionSchema>;
type PendingClarification = z.infer<typeof _PendingClarificationSchema>;

// Custom error types for structured error handling
class AgentError extends Error {
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

class ValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: z.ZodError,
    public readonly input?: unknown,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

class LLMError extends Error {
  constructor(
    message: string,
    public readonly modelConfig?: Record<string, unknown>,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

// Structured logging helper
const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    console.log(`[INFO] ${message}`, context ? JSON.stringify(context) : "");
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    console.warn(`[WARN] ${message}`, context ? JSON.stringify(context) : "");
  },
  error: (message: string, context?: Record<string, unknown>) => {
    console.error(`[ERROR] ${message}`, context ? JSON.stringify(context) : "");
  },
};

// Type-safe tool call interface
interface ValidatedToolCall {
  name: string;
  args: Record<string, unknown>;
  id: string;
  type: "tool_call";
}

// Utility function to validate user ID
function validateUserId(userId?: string): string {
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

// Utility function to validate and parse tool arguments
function validateToolArgs<T>(
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

// Utility function to create specialized LLM instances
async function createSpecializedLLM(
  agentType: "supervisor" | "agent",
  modelOverride?: string,
): Promise<ChatGoogleGenerativeAI> {
  try {
    const { GOOGLE_API_KEY } = env;

    if (!GOOGLE_API_KEY) {
      throw new LLMError(
        "GOOGLE_API_KEY is not defined in environment variables",
      );
    }

    // Validate Google API key format
    if (!GOOGLE_API_KEY.startsWith("AI") || GOOGLE_API_KEY.length < 20) {
      throw new LLMError(
        'GOOGLE_API_KEY appears to be invalid. Google API keys typically start with "AI" and are longer than 20 characters',
      );
    }

    const temperature =
      agentType === "supervisor"
        ? AGENT_CONFIG.TEMPERATURE.SUPERVISOR
        : AGENT_CONFIG.TEMPERATURE.AGENTS;

    const modelOptions = {
      apiKey: GOOGLE_API_KEY,
      model: modelOverride ?? AGENT_CONFIG.MODEL,
      temperature,
      // Add basic retry configuration
      maxRetries: 2,
    };

    logger.info(`Initializing ${agentType} LLM model`, {
      model: modelOptions.model,
      temperature: modelOptions.temperature,
      maxRetries: modelOptions.maxRetries,
      apiKey: "[REDACTED]",
    });

    return new ChatGoogleGenerativeAI(modelOptions);
  } catch (error) {
    if (error instanceof LLMError) {
      throw error;
    }
    throw new LLMError(
      `Failed to initialize ${agentType} LLM`,
      undefined,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

// Utility function to prepare messages for agents
function prepareAgentMessages(
  stateMessages: BaseMessage[],
  systemMessage: string,
): BaseMessage[] {
  // Filter to keep human, AI, and tool messages (tool messages contain tool call results)
  const userMessages = stateMessages.filter(
    (msg) =>
      msg._getType() === "human" ||
      msg._getType() === "ai" ||
      msg._getType() === "tool",
  );

  // Create new messages array with system message first, then user messages
  return [new SystemMessage(systemMessage), ...userMessages];
}

// Utility function to process validated tool calls
function processToolCalls(
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

// Utility function to safely convert message content to string
function contentToString(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (content === null || content === undefined) {
    return "";
  }

  // Handle array content (MessageContentComplex[])
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .join(" ");
  }

  // Handle object content - try to extract meaningful text
  if (typeof content === "object") {
    try {
      // Check if it's a structured response with a text field
      const obj = content as Record<string, unknown>;
      if (obj.text && typeof obj.text === "string") {
        return obj.text;
      }
      if (obj.content && typeof obj.content === "string") {
        return obj.content;
      }
      if (obj.message && typeof obj.message === "string") {
        return obj.message;
      }

      // If no meaningful text field found, stringify the whole object
      const jsonString = JSON.stringify(content);

      // Try to parse it as a structured response and extract text
      try {
        const parsed = JSON.parse(jsonString) as Record<string, unknown>;
        if (
          parsed.type === "text" &&
          parsed.text &&
          typeof parsed.text === "string"
        ) {
          return parsed.text;
        }
      } catch {
        // Ignore parse errors and continue
      }

      return jsonString;
    } catch {
      return "[Complex Content]";
    }
  }

  // Only primitives should reach here (number, boolean, bigint, symbol)
  if (
    typeof content === "number" ||
    typeof content === "boolean" ||
    typeof content === "bigint" ||
    typeof content === "symbol"
  ) {
    return String(content);
  }

  // Fallback for any unexpected types
  return "[Unknown Type]";
}

// NEW: Utility functions for duplicate detection and loop control

/**
 * Creates a hash of content for duplicate detection
 * @param content - The content to hash
 * @returns A hash string for comparison
 */
function createContentHash(content: string): string {
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
function isDuplicateAction(
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
function shouldSkipToolCall(
  toolCall: ValidatedToolCall,
  agentType: string,
  completedActions: CompletedAction[],
): { skip: boolean; reason?: string; existingAction?: CompletedAction } {
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
function checkLoopLimits(
  loopMetrics: {
    agentSwitches: number;
    toolCallsPerAgent: Record<string, number>;
    clarificationRounds: number;
    lastAgentType: string | null;
  },
  agentType: string,
): { exceeded: boolean; reason?: string; suggestion?: string } {
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
function updateLoopMetrics(
  currentMetrics: {
    agentSwitches: number;
    toolCallsPerAgent: Record<string, number>;
    clarificationRounds: number;
    lastAgentType: string | null;
  },
  agentType: string,
  toolCallCount = 0,
): {
  agentSwitches: number;
  toolCallsPerAgent: Record<string, number>;
  clarificationRounds: number;
  lastAgentType: string | null;
} {
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

// Utility function to handle agent errors consistently
function handleAgentError(
  error: unknown,
  agentType: string,
): { messages: BaseMessage[]; next: string } {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error(`Error in ${agentType} agent`, {
    error: errorMessage,
    agentType,
    stack: errorStack,
  });

  let userFriendlyMessage =
    "I encountered an unexpected error while processing your request.";

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
  } else if (error instanceof AgentError) {
    userFriendlyMessage = `I encountered an error: ${error.message}`;
  } else if (error instanceof ValidationError) {
    userFriendlyMessage = `I encountered a validation error: ${error.message}`;
  } else if (error instanceof LLMError) {
    userFriendlyMessage =
      "I'm having trouble connecting to the AI service. Please try again.";
  }

  return {
    messages: [new AIMessage(`${userFriendlyMessage} Please try again.`)],
    next: "supervisor",
  };
}

// Informal type for parts that can appear in LLM content arrays
type LLMPart =
  | { type: "text"; text: string }
  | { type: "functionCall"; functionCall: unknown } // functionCall structure not strictly needed here
  | Record<string, unknown>; // Allow other unknown part types, changed from {[key: string]: unknown}

function getCleanContentForAiMessage(
  rawLLMContent: unknown,
): string | Array<{ type: "text"; text: string }> {
  if (typeof rawLLMContent === "string") {
    // If the string itself is a JSON representation of Parts (due to earlier stringification)
    // This was observed in logs: contentPreview showing a string that is actually a JSON array.
    if (
      rawLLMContent.startsWith("[") &&
      rawLLMContent.endsWith("]") &&
      (rawLLMContent.includes('"type":"text"') ||
        rawLLMContent.includes('"functionCall"'))
    ) {
      try {
        const parsedParts = JSON.parse(rawLLMContent) as Array<LLMPart>; // Use LLMPart
        const textParts = parsedParts
          .filter(
            (
              part,
            ): part is { type: "text"; text: string } => // Type guard
              part.type === "text" && typeof part.text === "string",
          )
          .map((part) => ({ type: "text" as const, text: part.text }));
        if (textParts.length === 1 && textParts[0]) return textParts[0].text;
        return textParts.length > 0 ? textParts : "";
      } catch {
        if (rawLLMContent.includes('"functionCall"')) return "";
        return rawLLMContent;
      }
    }
    return rawLLMContent;
  }

  if (Array.isArray(rawLLMContent)) {
    const partsArray = rawLLMContent as Array<LLMPart>; // Use LLMPart
    const textParts = partsArray
      .filter(
        (
          part,
        ): part is { type: "text"; text: string } => // Type guard
          part.type === "text" && typeof part.text === "string",
      )
      .map((part) => ({ type: "text" as const, text: part.text }));

    if (textParts.length === 0) {
      return "";
    }
    if (textParts.length === 1 && textParts[0]) {
      return textParts[0].text;
    }
    return textParts;
  }

  return "";
}

// Define the state that is passed between nodes in the graph
const AgentState = Annotation.Root({
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
  // NEW: Track completed actions to prevent duplicates
  completedActions: Annotation<CompletedAction[]>({
    reducer: (x, y) => [...x, ...y],
    default: () => [],
  }),
  // NEW: Track pending clarifications
  pendingClarification: Annotation<PendingClarification | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  // NEW: Track loop metrics for termination control
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

// Define the type for the agent state
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

// All tools have been moved to src/server/langchain/tools.ts for better organization

// Initialize the model (updated to use new utilities)
export function createLLM(temperature = AGENT_CONFIG.TEMPERATURE.AGENTS) {
  try {
    return createSpecializedLLM("agent", undefined).then((model) => {
      // Override temperature if specified
      if (temperature !== AGENT_CONFIG.TEMPERATURE.AGENTS) {
        const { GOOGLE_API_KEY } = env;
        return new ChatGoogleGenerativeAI({
          apiKey: GOOGLE_API_KEY,
          model: AGENT_CONFIG.MODEL,
          temperature,
        });
      }
      return model;
    });
  } catch (error) {
    logger.error("Error initializing language model", { error });
    throw new LLMError(
      "Failed to initialize language model",
      undefined,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

// Routing tool has been moved to src/server/langchain/tools.ts

// Create specialized agents as graph nodes
async function supervisorNode(
  state: typeof AgentState.State,
): Promise<Partial<typeof AgentState.State>> {
  try {
    // Create LLM with specialized configuration
    const model = await createSpecializedLLM("supervisor");
    const llm = model.bindTools(getSupervisorTools());
    logger.info("Successfully initialized supervisor LLM with tools");

    const systemMessage = `You are the Supervisor Agent for CareerCraft Studio, an AI system that helps users create professional resumes and cover letters.

Your primary job is to analyze messages and route them to the correct specialized agent. Your routing decisions are critical to system functioning.

CLARIFICATION PATTERNS - Ask for clarification when:
1. User provides job posting content without clear intent: "Job post: [content]" or "Here's a job posting: [content]"
   - Ask: "I see you've shared a job posting. Would you like me to parse and store it, compare it to your skills, or analyze the requirements?"

2. User provides resume content without clear intent: "My resume: [content]" or "Here's my resume: [content]"
   - Ask: "I see you've shared resume content. Would you like me to parse and store this information in your profile, or are you looking for feedback on the resume?"

3. Ambiguous requests about skills: "What about my skills?" or "Skills analysis"
   - Ask: "I can help with skills in several ways. Would you like me to show your current skills, compare them to a job posting, or help you add new skills to your profile?"

ROUTING RULES:
1. For data storage or retrieval requests (work history, education, etc.) OR resume parsing: Route to 'data_manager'
   Example: "Can you store my work experience?", "Look up my skills", "Save my preferences", "Parse this resume", "I'm pasting my resume"

2. For resume creation, editing, or advice: Route to 'resume_generator'
   Example: "Create a resume", "How should I format my resume?", "Help with my resume"

3. For cover letter creation, editing, or advice: Route to 'cover_letter_generator'
   Example: "Write a cover letter", "Tailor a cover letter for this job", "Cover letter tips"

4. For job posting analysis, parsing, OR skill comparison: Route to 'job_posting_manager'
   Example: "Parse this job posting", "Analyze job requirements", "What does this job require?", "How do my skills match this job?", "Compare my skills to job requirements"
   Note: Job posting parsing and storage now happen automatically in one action

5. For general user profile questions: Route to 'user_profile'
   Example: "What information do you have about me?", "How is my data used?"

6. For general questions or completed tasks: Call 'route_to_agent' with '${END}'
   Example: "Thank you", "That's all for now"

IMPORTANT: When content is provided without clear intent, provide clarification options instead of assuming. Only route to agents when the user's intent is clear.

ROUTING RESPONSE FORMAT:
When you route to another agent, provide a brief acknowledgment in your response content, such as:
- "I'll look up your skills data for you." (when routing to data_manager)
- "Let me help you with your resume." (when routing to resume_generator)
- "I'll analyze that job posting for you." (when routing to job_posting_manager)

ALWAYS call the 'route_to_agent' tool with one of these exact destination values: 'data_manager', 'resume_generator', 'cover_letter_generator', 'job_posting_manager', 'user_profile', or '${END}'.

If you're unsure which specialized agent to route to, ask for clarification rather than guessing.

If you don't call 'route_to_agent', your response will be sent directly to the user, so only do this for clarification questions or simple informational responses.`;

    // Prepare messages using the utility function
    const messages = prepareAgentMessages(state.messages, systemMessage);

    logger.info("Supervisor invoking LLM", {
      messageCount: messages.length,
      userId: state.userId,
    });

    // Invoke the LLM
    const response = await llm.invoke(messages);

    // Debug logging to understand the response structure
    logger.info("Supervisor LLM response debug", {
      hasToolCalls: !!(response?.tool_calls && response.tool_calls.length > 0),
      toolCallsLength: response?.tool_calls?.length ?? 0,
      contentType: typeof response?.content,
      contentPreview:
        typeof response?.content === "string"
          ? response.content.substring(0, 200)
          : JSON.stringify(response?.content).substring(0, 200),
      rawResponse: JSON.stringify(response).substring(0, 500),
    });

    // Check if tool calls are embedded in content (workaround for Google GenAI bug)
    if (
      (!response?.tool_calls || response.tool_calls.length === 0) &&
      response?.content
    ) {
      const extractedToolCalls = extractToolCallsFromContent(response.content);

      if (extractedToolCalls && extractedToolCalls.length > 0) {
        logger.info("Successfully extracted tool calls from content", {
          extractedCount: extractedToolCalls.length,
          toolNames: extractedToolCalls.map((tc) => tc.name),
        });

        return await processSupervisorToolCalls(extractedToolCalls, response);
      }
    }

    // Process tool calls if present (normal path)
    if (response?.tool_calls && response.tool_calls.length > 0) {
      return await processSupervisorToolCalls(response.tool_calls, response);
    }

    // Handle direct response
    return handleSupervisorDirectResponse(response);
  } catch (error) {
    return handleAgentError(error, "supervisor");
  }
}

// Utility function to process supervisor tool calls with validation
async function processSupervisorToolCalls(
  toolCalls: Array<{
    name?: string;
    args?: unknown;
    id?: string;
    type?: string;
  }>,
  response: {
    content?: unknown;
    tool_calls?: Array<{
      name: string;
      args: Record<string, unknown>;
      id?: string;
      type?: "tool_call";
    }>;
  },
): Promise<{ messages: BaseMessage[]; next: string }> {
  try {
    const processedToolCalls = processToolCalls(toolCalls);
    const cleanContent = getCleanContentForAiMessage(response.content);

    if (processedToolCalls.length === 0) {
      logger.warn(
        "All supervisor tool calls were filtered out, providing direct response",
      );
      return {
        messages: [
          new AIMessage({
            content: cleanContent || "I understand your request.",
          }),
        ],
        next: END,
      };
    }

    const routingCall = processedToolCalls.find(
      (tc) => tc.name === "route_to_agent",
    ); // This is a ValidatedToolCall or undefined, where id is string

    if (routingCall) {
      try {
        const validatedArgs = validateToolArgs(
          routingCall.args,
          RouteToAgentSchema,
          "route_to_agent",
        );
        let destination = validatedArgs.next;

        if (destination === "__end__") {
          destination = END;
        }

        logger.info("Supervisor routing decision", { destination });

        return {
          messages: [
            new AIMessage({
              content: cleanContent || "I understand your request.",
              tool_calls: [routingCall],
            }),
          ],
          next: destination,
        };
      } catch (validationError) {
        logger.error("Invalid routing arguments", {
          args: routingCall.args,
          error: validationError,
        });

        return {
          messages: [
            new AIMessage(
              "I encountered an error with my routing decision. Let me try to help you directly.",
            ),
          ],
          next: END,
        };
      }
    }

    logger.warn("No route_to_agent tool call found, handling directly");
    return {
      messages: [
        new AIMessage({
          content: cleanContent || "I understand your request.",
        }),
      ],
      next: END,
    };
  } catch (error) {
    logger.error("Error processing supervisor tool calls", { error });
    return {
      messages: [
        new AIMessage(
          "I encountered an error while processing your request. Please try again.",
        ),
      ],
      next: END,
    };
  }
}

// Utility function to handle supervisor direct responses
function handleSupervisorDirectResponse(response: { content?: unknown }): {
  messages: BaseMessage[];
  next: string;
} {
  const cleanContent = getCleanContentForAiMessage(response.content);

  if (
    !cleanContent ||
    (typeof cleanContent === "string" && cleanContent.trim() === "")
  ) {
    logger.warn("Supervisor response had empty content");
    return {
      messages: [
        new AIMessage(
          "I apologize, but I don't have enough information to help with that specific request. Could you provide more details about what you're looking for?",
        ),
      ],
      next: END,
    };
  }

  logger.info("Supervisor providing direct response");
  return {
    messages: [new AIMessage({ content: cleanContent })],
    next: END,
  };
}

// Create specialized data manager tool call processor
async function processDataManagerToolCalls(
  toolCalls: ValidatedToolCall[],
  userId: string,
  response: { content?: unknown },
  completedActions: CompletedAction[] = [],
): Promise<string> {
  let toolCallSummary = "I've processed your request:\n\n";
  const agentType = "data_manager";

  for (const toolCall of toolCalls) {
    // Check for duplicates before processing
    const duplicateCheck = shouldSkipToolCall(
      toolCall,
      agentType,
      completedActions,
    );

    if (duplicateCheck.skip) {
      toolCallSummary += `• Skipped ${toolCall.name}: ${duplicateCheck.reason}\n`;
      if (duplicateCheck.existingAction) {
        toolCallSummary += `  Previous result: ${duplicateCheck.existingAction.result.substring(0, 200)}${duplicateCheck.existingAction.result.length > 200 ? "..." : ""}\n\n`;
      }
      continue;
    }

    if (toolCall.name === "store_user_preference") {
      try {
        const args = validateToolArgs(
          toolCall.args,
          StoreUserPreferenceSchema,
          "store_user_preference",
        );
        toolCallSummary += `• Stored preference for ${args.category}: ${args.preference}\n`;
      } catch (error) {
        toolCallSummary += `• Error storing preference: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else if (toolCall.name === "store_work_history") {
      try {
        const args = validateToolArgs(
          toolCall.args,
          StoreWorkHistorySchema,
          "store_work_history",
        );
        toolCallSummary += `• Stored work history: ${args.jobTitle} at ${args.companyName}\n`;
      } catch (error) {
        toolCallSummary += `• Error storing work history: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else if (toolCall.name === "get_user_profile") {
      try {
        const args = validateToolArgs(
          toolCall.args,
          GetUserProfileSchema,
          "get_user_profile",
        );
        const profileTool = getUserProfileTool(userId);
        const result = (await profileTool.invoke(args)) as string;

        // Format the data based on the type requested
        if (args.dataType === "skills") {
          try {
            const skillsData = JSON.parse(result) as Array<{
              name: string;
              category: string;
              proficiency: string;
              workContext?: string;
              yearsExperience?: number | null;
            }>;

            if (skillsData.length === 0) {
              toolCallSummary += `No skills found in your profile yet. You can add skills by describing your work experience or uploading a resume.`;
            } else {
              toolCallSummary += `## Your Skills\n\n`;

              // Group skills by proficiency level
              const expertSkills = skillsData.filter(
                (s) => s.proficiency === "EXPERT",
              );
              const advancedSkills = skillsData.filter(
                (s) => s.proficiency === "ADVANCED",
              );
              const intermediateSkills = skillsData.filter(
                (s) => s.proficiency === "INTERMEDIATE",
              );
              const beginnerSkills = skillsData.filter(
                (s) => s.proficiency === "BEGINNER",
              );

              if (expertSkills.length > 0) {
                toolCallSummary += `### Expert Level\n`;
                expertSkills.forEach((skill) => {
                  toolCallSummary += `- **${skill.name}**`;
                  if (skill.workContext) {
                    toolCallSummary += ` _(${skill.workContext})_`;
                  }
                  toolCallSummary += `\n`;
                });
                toolCallSummary += `\n`;
              }

              if (advancedSkills.length > 0) {
                toolCallSummary += `### Advanced Level\n`;
                advancedSkills.forEach((skill) => {
                  toolCallSummary += `- **${skill.name}**`;
                  if (skill.workContext) {
                    toolCallSummary += ` _(${skill.workContext})_`;
                  }
                  toolCallSummary += `\n`;
                });
                toolCallSummary += `\n`;
              }

              if (intermediateSkills.length > 0) {
                toolCallSummary += `### Intermediate Level\n`;
                intermediateSkills.forEach((skill) => {
                  toolCallSummary += `- **${skill.name}**`;
                  if (skill.workContext) {
                    toolCallSummary += ` _(${skill.workContext})_`;
                  }
                  toolCallSummary += `\n`;
                });
                toolCallSummary += `\n`;
              }

              if (beginnerSkills.length > 0) {
                toolCallSummary += `### Beginner Level\n`;
                beginnerSkills.forEach((skill) => {
                  toolCallSummary += `- **${skill.name}**`;
                  if (skill.workContext) {
                    toolCallSummary += ` _(${skill.workContext})_`;
                  }
                  toolCallSummary += `\n`;
                });
                toolCallSummary += `\n`;
              }

              toolCallSummary += `\n_Total: ${skillsData.length} skills in your profile_\n\n`;
            }
          } catch {
            // Fallback to raw JSON if parsing fails
            toolCallSummary += `• Retrieved ${args.dataType} data:\n\n\`\`\`json\n${result}\n\`\`\`\n\n`;
          }
        } else {
          // For other data types, format as JSON
          let formattedResult: string;
          try {
            const parsedResult = JSON.parse(result) as unknown;
            formattedResult = JSON.stringify(parsedResult, null, 2);
          } catch {
            formattedResult = result;
          }

          toolCallSummary += `• Retrieved ${args.dataType} data:\n\n\`\`\`json\n${formattedResult}\n\`\`\`\n\n`;
        }
      } catch (error) {
        const dataType =
          typeof toolCall.args?.dataType === "string"
            ? toolCall.args.dataType
            : "unknown";
        toolCallSummary += `Error retrieving ${dataType} data: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else if (toolCall.name === "parse_and_store_resume") {
      try {
        // The resume parsing tool handles its own processing and returns a detailed summary
        const resumeParsingTool = getDataManagerTools(userId).find(
          (t) => t.name === "parse_and_store_resume",
        );
        if (resumeParsingTool) {
          const result = (await resumeParsingTool.invoke(
            toolCall.args,
          )) as string;
          toolCallSummary += `${result}\n\n`;
        } else {
          toolCallSummary += `• Error: Resume parsing tool not found\n`;
        }
      } catch (error) {
        toolCallSummary += `• Error parsing resume: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else if (
      toolCall.name.startsWith("get_work_achievements") ||
      toolCall.name.includes("work_achievement")
    ) {
      try {
        // Find the appropriate work achievement tool
        const achievementTool = getDataManagerTools(userId).find(
          (t) => t.name === toolCall.name,
        );
        if (achievementTool) {
          const result = (await achievementTool.invoke(
            toolCall.args,
          )) as string;

          // Format the result nicely for work achievement operations
          if (toolCall.name === "get_work_achievements") {
            try {
              const parsedResult = JSON.parse(result) as {
                workHistory: { jobTitle: string; companyName: string };
                achievements: Array<{ id: string; description: string }>;
              };

              toolCallSummary += `• **${parsedResult.workHistory.jobTitle}** at **${parsedResult.workHistory.companyName}**\n`;
              toolCallSummary += `  Current achievements (${parsedResult.achievements.length}):\n`;
              parsedResult.achievements.forEach((achievement, index) => {
                toolCallSummary += `  ${index + 1}. ${achievement.description} *(ID: ${achievement.id})*\n`;
              });
              toolCallSummary += `\n`;
            } catch {
              toolCallSummary += `• ${result}\n`;
            }
          } else {
            toolCallSummary += `• ${result}\n`;
          }
        } else {
          toolCallSummary += `• Error: Tool ${toolCall.name} not found\n`;
        }
      } catch (error) {
        toolCallSummary += `• Error with ${toolCall.name}: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else if (toolCall.name === "deduplicate_and_merge_key_achievements") {
      try {
        // The deduplication tool handles its own processing and returns a formatted summary
        const deduplicationTool = getDataManagerTools(userId).find(
          (t) => t.name === "deduplicate_and_merge_key_achievements",
        );
        if (deduplicationTool) {
          const result = (await deduplicationTool.invoke(
            toolCall.args,
          )) as string;
          toolCallSummary += `${result}\n\n`;
        } else {
          toolCallSummary += `• Error: Key achievements deduplication tool not found\n`;
        }
      } catch (error) {
        toolCallSummary += `• Error deduplicating key achievements: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else if (toolCall.name === "deduplicate_and_merge_work_achievements") {
      try {
        // The work achievements deduplication tool handles its own processing and returns a formatted summary
        const deduplicationTool = getDataManagerTools(userId).find(
          (t) => t.name === "deduplicate_and_merge_work_achievements",
        );
        if (deduplicationTool) {
          const result = (await deduplicationTool.invoke(
            toolCall.args,
          )) as string;
          toolCallSummary += `${result}\n\n`;
        } else {
          toolCallSummary += `• Error: Work achievements deduplication tool not found\n`;
        }
      } catch (error) {
        toolCallSummary += `• Error deduplicating work achievements: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else {
      toolCallSummary += `• ${toolCall.name}: Processed successfully\n`;
    }
  }

  // Add any content from the response
  const responseContent = contentToString(response.content);
  if (responseContent?.trim()) {
    toolCallSummary += "\n" + responseContent;
  }

  return toolCallSummary;
}

// Create data manager node using the factory
const dataManagerNode = createAgentNode({
  agentType: "data_manager",
  systemMessage: `You are the Data Manager Agent for CareerCraft Studio.
  
Your job is to:
1. Look up information relating to the user, including work history, skills, achievements, and preferences.
2. Identify information in messages that should be stored
3. Store work history, skills, achievements, and user preferences
4. Parse and process resume text when users provide it
5. Organize and maintain the user's data
6. Format retrieved data in user-friendly formats (especially markdown when requested)

You have access to these tools:
- store_user_preference: For storing user preferences about grammar, phrases, resume style, etc.
- store_work_history: For storing details about previous jobs, responsibilities, achievements
- get_user_profile: For retrieving existing user data
- parse_and_store_resume: For parsing resume text and extracting/storing structured data

**Work Achievement Management Tools:**
- get_work_achievements: Get all achievements for a specific work history record by ID
- add_work_achievement: Add a single achievement to a work history record
- update_work_achievement: Update the description of a specific achievement
- delete_work_achievement: Delete a specific achievement
- replace_work_achievements: Replace all achievements for a work history with new ones
- merge_and_replace_work_achievements: Merge existing achievements with new ones using AI, then replace
- merge_work_achievements: Standalone tool to merge two sets of achievements using AI

**Key Achievements Management:**
- deduplicate_and_merge_key_achievements: Remove exact duplicate key achievements and intelligently merge similar ones using AI while preserving all important details. Use dryRun=true to preview changes first.

**Work Achievements Deduplication:**
- deduplicate_and_merge_work_achievements: Remove exact duplicate work achievements and intelligently merge similar ones for a specific work history using AI while preserving all important details. Requires workHistoryId parameter. Use dryRun=true to preview changes first.

**IMPORTANT**: When a user provides resume text (either by pasting it directly or asking you to parse a resume), use the parse_and_store_resume tool to process it. This will:
- Extract structured information using AI
- Store work history, education, skills, and achievements in their profile
- Save the resume as a document for future reference
- Provide a detailed summary of what was processed

**Work Achievement Workflow Examples:**
- To merge achievements for a specific job: Use merge_and_replace_work_achievements with the work history ID and new achievements
- To edit individual achievements: Use get_work_achievements to see current ones, then update_work_achievement or delete_work_achievement as needed
- To completely replace achievements: Use replace_work_achievements with the new list
- To add achievements without affecting existing ones: Use add_work_achievement

**Key Achievements Deduplication:**
- When users ask to clean up, deduplicate, or merge their key achievements, use deduplicate_and_merge_key_achievements
- Always offer to show a preview first by using dryRun=true
- This tool removes exact duplicates and uses AI to merge similar achievements while preserving all details
- No information is made up or lost during the merging process

When retrieving skills data, present it in a well-organized markdown format grouped by proficiency level.
When using these tools, you only need to specify the required parameters - all authentication and user identification happens automatically.

Always aim to provide helpful, formatted responses that directly address what the user is asking for.`,
  getTools: getDataManagerTools,
  processToolCalls: processDataManagerToolCalls,
});

// Create resume generator node using the factory
const resumeGeneratorNode = createAgentNode({
  agentType: "resume_generator",
  systemMessage: `You are the Resume Generator Agent for CareerCraft Studio.
  
Your job is to:
1. Create professional resumes based on user data
2. Format resumes according to industry standards and user preferences
3. Provide resume writing advice
4. Edit existing resumes

You have access to these tools:
- generate_resume: For creating formatted resumes in different styles
- get_user_profile: For retrieving user data needed for resume generation

When using these tools, you only need to specify the required parameters - all authentication and user identification happens automatically.`,
  getTools: getResumeGeneratorTools,
});

// Create cover letter generator node using the factory
const coverLetterGeneratorNode = createAgentNode({
  agentType: "cover_letter_generator",
  systemMessage: `You are the Cover Letter Generator Agent for CareerCraft Studio.
  
Your job is to:
1. Create tailored cover letters based on job descriptions and user data
2. Edit existing cover letters
3. Format cover letters according to user preferences
4. Provide cover letter writing advice

You have access to these tools:
- generate_cover_letter: For creating tailored cover letters for specific jobs
- get_user_profile: For retrieving user data needed for cover letter generation

When using these tools, you only need to specify the required parameters - all authentication and user identification happens automatically.`,
  getTools: getCoverLetterGeneratorTools,
});

// Create specialized user profile tool call processor
async function processUserProfileToolCalls(
  toolCalls: ValidatedToolCall[],
  userId: string,
  response: { content?: unknown },
  completedActions: CompletedAction[] = [],
): Promise<string> {
  let toolCallSummary = "Here's the information from your profile:\n\n";
  const agentType = "user_profile";

  for (const toolCall of toolCalls) {
    // Check for duplicates before processing
    const duplicateCheck = shouldSkipToolCall(
      toolCall,
      agentType,
      completedActions,
    );

    if (duplicateCheck.skip) {
      toolCallSummary += `• Skipped ${toolCall.name}: ${duplicateCheck.reason}\n`;
      if (duplicateCheck.existingAction) {
        toolCallSummary += `  Previous result: ${duplicateCheck.existingAction.result.substring(0, 200)}${duplicateCheck.existingAction.result.length > 200 ? "..." : ""}\n\n`;
      }
      continue;
    }

    if (toolCall.name === "get_user_profile") {
      try {
        const args = validateToolArgs(
          toolCall.args,
          GetUserProfileSchema,
          "get_user_profile",
        );
        const profileTool = getUserProfileTool(userId);
        const result = (await profileTool.invoke(args)) as string;

        let formattedResult: string;
        try {
          const parsedResult = JSON.parse(result) as unknown;
          formattedResult = JSON.stringify(parsedResult, null, 2);
        } catch {
          formattedResult = result;
        }

        toolCallSummary += `## ${args.dataType.replace("_", " ").toUpperCase()} ##\n\n\`\`\`json\n${formattedResult}\n\`\`\`\n\n`;
      } catch (error) {
        const dataType =
          typeof toolCall.args?.dataType === "string"
            ? toolCall.args.dataType
            : "unknown";
        toolCallSummary += `Error retrieving ${dataType} data: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    }
  }

  // Add any content from the response
  const responseContent = contentToString(response.content);
  if (responseContent?.trim()) {
    toolCallSummary += "\n" + responseContent;
  }

  return toolCallSummary;
}

// Create user profile node using the factory
const userProfileNode = createAgentNode({
  agentType: "user_profile",
  systemMessage: `You are the User Profile Agent for CareerCraft Studio.
  
Your job is to:
1. Retrieve user profile information
2. Help users understand what data is stored in their profile
3. Explain how stored data is used in resume and cover letter generation

You have access to these tools:
- get_user_profile: For retrieving different types of user data (work history, education, skills, achievements, preferences, or all)

You can retrieve different types of profile data using the get_user_profile tool. Simply specify which data type you need: work_history, education, skills, achievements, preferences, or all.`,
  getTools: getUserProfileTools,
  processToolCalls: processUserProfileToolCalls,
});

// Create specialized job posting tool call processor
async function processJobPostingToolCalls(
  toolCalls: ValidatedToolCall[],
  userId: string,
  response: { content?: unknown },
  completedActions: CompletedAction[] = [],
): Promise<string> {
  let toolCallSummary = "I've processed your job posting request:\n\n";
  const agentType = "job_posting_manager";

  for (const toolCall of toolCalls) {
    // Check for duplicates before processing
    const duplicateCheck = shouldSkipToolCall(
      toolCall,
      agentType,
      completedActions,
    );

    if (duplicateCheck.skip) {
      toolCallSummary += `• Skipped ${toolCall.name}: ${duplicateCheck.reason}\n`;
      if (duplicateCheck.existingAction) {
        toolCallSummary += `  Previous result: ${duplicateCheck.existingAction.result.substring(0, 200)}${duplicateCheck.existingAction.result.length > 200 ? "..." : ""}\n\n`;
      }
      continue;
    }

    if (toolCall.name === "parse_and_store_job_posting") {
      try {
        const args = validateToolArgs(
          toolCall.args,
          ParseJobPostingSchema,
          "parse_and_store_job_posting",
        );
        const tools = getJobPostingTools(userId);
        const parseAndStoreJobPostingTool = tools.find(
          (t) => t.name === "parse_and_store_job_posting",
        );

        if (parseAndStoreJobPostingTool) {
          const result = (await parseAndStoreJobPostingTool.invoke({
            content: args.content,
          })) as string;
          toolCallSummary += `${result}\n\n`;
        }
      } catch (error) {
        toolCallSummary += `• Error parsing and storing job posting: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else if (toolCall.name === "find_job_postings") {
      try {
        const tools = getJobPostingTools(userId);
        const findJobPostingsTool = tools.find(
          (t) => t.name === "find_job_postings",
        );

        if (findJobPostingsTool) {
          const result = (await findJobPostingsTool.invoke(
            toolCall.args,
          )) as string;
          toolCallSummary += `• Found job postings:\n${result}\n`;
        }
      } catch (error) {
        toolCallSummary += `• Error finding job postings: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else if (toolCall.name === "compare_skills_to_job") {
      try {
        const tools = getJobPostingTools(userId);
        const compareSkillsTool = tools.find(
          (t) => t.name === "compare_skills_to_job",
        );

        if (compareSkillsTool) {
          const result = (await compareSkillsTool.invoke(
            toolCall.args,
          )) as string;
          toolCallSummary += `• Skill comparison analysis:\n${result}\n`;
        }
      } catch (error) {
        toolCallSummary += `• Error comparing skills: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else if (toolCall.name === "get_user_profile") {
      try {
        const tools = getJobPostingTools(userId);
        const getUserProfileTool = tools.find(
          (t) => t.name === "get_user_profile",
        );

        if (getUserProfileTool) {
          const result = (await getUserProfileTool.invoke(
            toolCall.args,
          )) as string;
          toolCallSummary += `• Retrieved user profile data:\n${result}\n`;
        }
      } catch (error) {
        toolCallSummary += `• Error retrieving user profile: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else {
      toolCallSummary += `• ${toolCall.name}: Processed successfully\n`;
    }
  }

  // Add any content from the response
  const responseContent = contentToString(response.content);
  if (responseContent?.trim()) {
    toolCallSummary += "\n" + responseContent;
  }

  return toolCallSummary;
}

// Create job posting manager node using the factory
const jobPostingManagerNode = createAgentNode({
  agentType: "job_posting_manager",
  systemMessage: `You are the Job Posting Manager Agent for Resume Master.
  
Your job is to:
1. Parse and store job posting content automatically when users provide it
2. Help users understand job requirements and qualifications
3. Compare user skills against job posting requirements
4. Find and retrieve previously stored job postings

You have access to these tools:
- parse_and_store_job_posting: For parsing job posting text and automatically storing it in the database
- find_job_postings: For finding stored job postings by title, company, location, etc.
- compare_skills_to_job: For comparing user skills against job requirements
- get_user_profile: For retrieving user data including skills

IMPORTANT WORKFLOW:
- When users provide job posting content, use parse_and_store_job_posting to automatically parse and store it
- This tool combines parsing and storage into one seamless action
- After successful parsing and storage, offer to compare their skills against the job posting
- When comparing skills, use compare_skills_to_job to analyze their fit
- If you need to find a specific job posting, use find_job_postings with relevant criteria
- The tools automatically handle user authentication and identification

When using these tools, you only need to specify the required parameters - all authentication and user identification happens automatically.`,
  getTools: getJobPostingTools,
  processToolCalls: processJobPostingToolCalls,
});

// Create the agent team using StateGraph
export function createAgentTeam() {
  try {
    console.log("Creating StateGraph with agent nodes...");

    // Create the StateGraph with our agent state
    const workflow = new StateGraph(AgentState)
      // Add nodes for each agent
      .addNode("supervisor", supervisorNode)
      .addNode("data_manager", dataManagerNode)
      .addNode("resume_generator", resumeGeneratorNode)
      .addNode("cover_letter_generator", coverLetterGeneratorNode)
      .addNode("user_profile", userProfileNode)
      .addNode("job_posting_manager", jobPostingManagerNode);

    console.log("Added all agent nodes to the graph");

    // Define edges - always start with the supervisor
    workflow.addEdge(START, "supervisor");
    console.log("Added START -> supervisor edge");

    // Create a debug wrapper for the routing function
    const debugRouting = (state: typeof AgentState.State) => {
      console.log(`Routing decision based on state.next: "${state.next}"`);
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
    console.log("Added conditional edges from supervisor");

    // From each agent, return to supervisor for next decision
    workflow.addEdge("data_manager", "supervisor");
    workflow.addEdge("resume_generator", "supervisor");
    workflow.addEdge("cover_letter_generator", "supervisor");
    workflow.addEdge("user_profile", "supervisor");
    workflow.addEdge("job_posting_manager", "supervisor");
    console.log("Added edges from specialized agents back to supervisor");

    // Compile the graph
    console.log("Compiling the graph...");
    const compiledGraph = workflow.compile();
    console.log("StateGraph successfully compiled");

    return compiledGraph;
  } catch (error) {
    console.error("Error creating agent team:", error);
    throw new Error(
      `Failed to create agent team: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// Helper to convert message format between our tRPC API and LangChain
export function convertToAgentStateInput(
  messages: { role: string; content: string }[],
  userId?: string,
): AgentStateType {
  // Sort messages into system, non-system
  const systemMessages: BaseMessage[] = [];
  const nonSystemMessages: BaseMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemMessages.push(new SystemMessage(msg.content));
    } else if (msg.role === "user") {
      nonSystemMessages.push(new HumanMessage(msg.content));
    } else if (msg.role === "assistant") {
      nonSystemMessages.push(new AIMessage(msg.content));
    }
  }

  // Add a default system message if there are none
  if (systemMessages.length === 0) {
    systemMessages.push(
      new SystemMessage(
        "You are Resume Master, an AI assistant that helps with resume writing, cover letters, and job applications. Be helpful, concise, and professional.",
      ),
    );
  }

  // Ensure system messages come first, then the rest
  const formattedMessages = [...systemMessages, ...nonSystemMessages];

  console.log(
    "Formatted message types:",
    formattedMessages.map((m) => m._getType()),
  );

  return {
    messages: formattedMessages,
    next: "supervisor", // Always start with the supervisor
    userId, // Set userId directly in the state object
    completedActions: [], // Initialize empty completed actions
    pendingClarification: null, // No pending clarification initially
    loopMetrics: {
      agentSwitches: 0,
      toolCallsPerAgent: {},
      clarificationRounds: 0,
      lastAgentType: null,
    }, // Initialize loop metrics
  };
}

// Agent configuration interface for the factory
interface AgentConfig {
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

// Base agent factory to eliminate code duplication
function createAgentNode(config: AgentConfig) {
  return async (
    state: typeof AgentState.State,
  ): Promise<Partial<typeof AgentState.State>> => {
    try {
      // Check loop limits before processing
      const loopCheck = checkLoopLimits(
        state.loopMetrics ?? {
          agentSwitches: 0,
          toolCallsPerAgent: {},
          clarificationRounds: 0,
          lastAgentType: null,
        },
        config.agentType,
      );

      if (loopCheck.exceeded) {
        logger.warn(`Loop limit exceeded for ${config.agentType}`, {
          reason: loopCheck.reason,
          agentType: config.agentType,
        });

        return {
          messages: [
            new AIMessage(
              `${loopCheck.reason}. ${loopCheck.suggestion ?? "Please try a different approach or provide more specific information."}`,
            ),
          ],
          next: END,
        };
      }

      // Create LLM with specialized configuration
      const model = await createSpecializedLLM("agent");

      // Validate user ID if required (default: true)
      const requiresUserId = config.requiresUserId ?? true;
      if (requiresUserId) {
        validateUserId(state.userId);
      }

      const userId = state.userId || "";

      // Get tools and bind to LLM
      const tools = config.getTools(userId);
      const llm = model.bindTools(tools);

      logger.info(
        `Successfully initialized ${config.agentType} LLM with tools`,
        {
          agentType: config.agentType,
          toolCount: tools.length,
          userId: userId ? "[PRESENT]" : "[MISSING]",
          loopMetrics: state.loopMetrics,
        },
      );

      // Prepare messages using the utility function
      const messages = prepareAgentMessages(
        state.messages,
        config.systemMessage,
      );

      logger.info(`${config.agentType} invoking LLM`, {
        messageCount: messages.length,
        userId: userId ? "[PRESENT]" : "[MISSING]",
      });

      // Invoke the LLM
      const response = await llm.invoke(messages);

      // Count tool calls for loop metrics
      const toolCallCount = response?.tool_calls?.length ?? 0;

      // Update loop metrics
      const updatedLoopMetrics = updateLoopMetrics(
        state.loopMetrics ?? {
          agentSwitches: 0,
          toolCallsPerAgent: {},
          clarificationRounds: 0,
          lastAgentType: null,
        },
        config.agentType,
        toolCallCount,
      );

      // Handle tool calls properly using LangChain format
      if (response?.tool_calls && response.tool_calls.length > 0) {
        const result = await handleAgentToolCalls(
          response,
          config,
          userId,
          state,
        );
        return {
          ...result,
          loopMetrics: updatedLoopMetrics,
        };
      }

      // Handle direct response
      const result = handleDirectAgentResponse(response, config.agentType);
      return {
        ...result,
        loopMetrics: updatedLoopMetrics,
      };
    } catch (error) {
      return handleAgentError(error, config.agentType);
    }
  };
}

// Handle agent tool calls using proper LangChain format
async function handleAgentToolCalls(
  response: {
    content?: unknown;
    tool_calls?: Array<{
      name?: string;
      args?: unknown;
      id?: string;
      type?: string;
    }>;
  },
  config: AgentConfig,
  userId: string,
  state: typeof AgentState.State,
): Promise<{ messages: BaseMessage[]; next: string }> {
  try {
    let toolCallsToProcess = response.tool_calls;
    const cleanContent = getCleanContentForAiMessage(response.content);

    if (
      (!toolCallsToProcess || toolCallsToProcess.length === 0) &&
      response?.content
    ) {
      const extractedToolCalls = extractToolCallsFromContent(response.content);
      if (extractedToolCalls && extractedToolCalls.length > 0) {
        logger.info(
          `Successfully extracted tool calls from content for ${config.agentType}`,
          {
            extractedCount: extractedToolCalls.length,
            toolNames: extractedToolCalls.map((tc) => tc.name),
          },
        );
        toolCallsToProcess = extractedToolCalls;
      }
    }

    if (!toolCallsToProcess || toolCallsToProcess.length === 0) {
      return handleDirectAgentResponse(
        { content: cleanContent },
        config.agentType,
      );
    }

    const processedToolCalls = processToolCalls(toolCallsToProcess);

    if (processedToolCalls.length === 0) {
      logger.warn(`All ${config.agentType} tool calls were filtered out`, {
        agentType: config.agentType,
      });
      return handleDirectAgentResponse(
        { content: cleanContent },
        config.agentType,
      );
    }

    const aiMessageWithToolCalls = new AIMessage({
      content: cleanContent,
      tool_calls: (response.tool_calls ?? [])
        .map((tc) => {
          let parsedArgs: Record<string, unknown> = {};
          if (typeof tc.args === "string") {
            try {
              parsedArgs = JSON.parse(tc.args) as Record<string, unknown>;
            } catch (e) {
              logger.warn(
                "Failed to parse stringified tool call args for AIMessage",
                { args: tc.args, error: e },
              );
              // Keep parsedArgs as {} if parsing fails
            }
          } else if (typeof tc.args === "object" && tc.args !== null) {
            parsedArgs = tc.args as Record<string, unknown>;
          } // else tc.args is undefined or some other type, parsedArgs remains {}

          return {
            name: tc.name ?? "",
            args: parsedArgs,
            id: tc.id,
            type: "tool_call" as const,
          };
        })
        .filter((tc) => tc.id && tc.name), // Also ensure name is present for a valid tool_call
    });

    if (config.processToolCalls) {
      try {
        const customResult = await config.processToolCalls(
          processedToolCalls,
          userId,
          // Pass the original response structure, now AgentConfig.processToolCalls expects tool_calls
          { content: cleanContent, tool_calls: response.tool_calls },
          state.completedActions,
        );
        const customResultMessage = new ToolMessage({
          content: customResult,
          tool_call_id:
            processedToolCalls[0]?.id ?? `custom_processing_${Date.now()}`,
        });
        return {
          messages: [aiMessageWithToolCalls, customResultMessage],
          next: "supervisor",
        };
      } catch (customError) {
        logger.error(`Error in custom tool processor for ${config.agentType}`, {
          error:
            customError instanceof Error
              ? customError.message
              : String(customError),
          agentType: config.agentType,
        });
        // Fallback to default processing if custom processor fails
      }
    }

    const toolMessages: ToolMessage[] = [];
    const tools = config.getTools(userId);

    for (const toolCall of processedToolCalls) {
      try {
        const tool = tools.find((t) => t.name === toolCall.name);
        if (!tool) {
          logger.warn(`Tool ${toolCall.name} not found in available tools`, {
            agentType: config.agentType,
            availableTools: tools.map((t) => t.name),
          });
          toolMessages.push(
            new ToolMessage({
              content: `Error: Tool ${toolCall.name} not found`,
              tool_call_id: toolCall.id,
            }),
          );
          continue;
        }

        logger.info(`Executing tool ${toolCall.name}`, {
          agentType: config.agentType,
          toolArgs: toolCall.args,
        });
        const toolResult = await tool.invoke(toolCall.args);
        toolMessages.push(
          new ToolMessage({
            content:
              typeof toolResult === "string"
                ? toolResult
                : JSON.stringify(toolResult),
            tool_call_id: toolCall.id,
          }),
        );
        logger.info(`Tool ${toolCall.name} executed successfully`, {
          agentType: config.agentType,
          resultLength:
            typeof toolResult === "string"
              ? toolResult.length
              : JSON.stringify(toolResult).length,
        });
      } catch (toolError) {
        const errorMessage =
          toolError instanceof Error ? toolError.message : String(toolError);
        logger.error(`Error executing tool ${toolCall.name}`, {
          agentType: config.agentType,
          error: errorMessage,
          toolArgs: toolCall.args,
        });
        toolMessages.push(
          new ToolMessage({
            content: `Error executing ${toolCall.name}: ${errorMessage}`,
            tool_call_id: toolCall.id,
          }),
        );
      }
    }

    return {
      messages: [aiMessageWithToolCalls, ...toolMessages],
      next: "supervisor",
    };
  } catch (error) {
    logger.error(`Error in handleAgentToolCalls for ${config.agentType}`, {
      error: error instanceof Error ? error.message : String(error),
      agentType: config.agentType,
    });
    return {
      messages: [
        new AIMessage(
          "I encountered an error while processing the tool calls. Please try again.",
        ),
      ],
      next: "supervisor",
    };
  }
}

// Handle direct responses from agents using the factory
function handleDirectAgentResponse(
  response: { content?: unknown },
  agentType: string,
): { messages: BaseMessage[]; next: string } {
  const cleanContent = getCleanContentForAiMessage(response.content);

  if (
    !cleanContent ||
    (typeof cleanContent === "string" && cleanContent.trim() === "")
  ) {
    logger.warn(`${agentType} response had empty content`, { agentType });
    return {
      messages: [
        new AIMessage(
          "I processed your request but couldn't generate a proper response. Let me hand this back to the supervisor.",
        ),
      ],
      next: "supervisor",
    };
  }

  logger.info(`${agentType} generated response`, {
    agentType,
    responseLength:
      typeof cleanContent === "string"
        ? cleanContent.length
        : JSON.stringify(cleanContent).length,
  });

  return {
    messages: [new AIMessage({ content: cleanContent })],
    next: "supervisor",
  };
}

// Utility function to extract tool calls from content when they're embedded as text
function extractToolCallsFromContent(content: unknown): Array<{
  name: string;
  args: Record<string, unknown>;
  id: string;
  type: "tool_call";
}> | null {
  const contentStr = contentToString(content);

  if (
    !contentStr.includes("functionCall") &&
    !contentStr.includes("tool_call")
  ) {
    return null;
  }

  try {
    // Handle different possible formats
    const patterns = [
      // Format: {"functionCall":{"name":"tool_name","args":{...}}}
      /\{"functionCall":\{"name":"([^"]+)","args":\{([^}]*)\}\}\}/g,
      // Format: {"name":"tool_name","args":{...},"type":"tool_call"}
      /\{"name":"([^"]+)","args":\{([^}]*)\},"type":"tool_call"\}/g,
      // Format: "tool_call":{"name":"tool_name","args":{...}}
      /"tool_call":\{"name":"([^"]+)","args":\{([^}]*)\}\}/g,
    ];

    const extractedCalls: Array<{
      name: string;
      args: Record<string, unknown>;
      id: string;
      type: "tool_call";
    }> = [];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(contentStr)) !== null) {
        if (match[1] && match[2] !== undefined) {
          const toolName = match[1];
          const argsString = match[2];

          // Parse the arguments
          let args: Record<string, unknown> = {};
          try {
            // Handle simple key-value pairs
            const argPairs = argsString.split(",");
            for (const pair of argPairs) {
              const colonIndex = pair.indexOf(":");
              if (colonIndex > 0) {
                const key = pair
                  .substring(0, colonIndex)
                  .trim()
                  .replace(/"/g, "");
                const value = pair
                  .substring(colonIndex + 1)
                  .trim()
                  .replace(/"/g, "");
                args[key] = value;
              }
            }
          } catch (parseError) {
            logger.warn("Failed to parse tool call arguments", {
              toolName,
              argsString,
              error: parseError,
            });
            args = {};
          }

          extractedCalls.push({
            name: toolName,
            args,
            id: `extracted_${toolName}_${Date.now()}`,
            type: "tool_call",
          });
        }
      }
    }

    return extractedCalls.length > 0 ? extractedCalls : null;
  } catch (error) {
    logger.error("Error extracting tool calls from content", {
      error,
      contentPreview: contentStr.substring(0, 200),
    });
    return null;
  }
}
