import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { type createAgent } from "./agent";
import { env } from "~/env";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { END, START, StateGraph } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import {
  createUserProfileTool,
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
} as const;

// TypeScript interfaces for tool arguments
interface RouteToAgentArgs {
  next: string;
}

interface StoreUserPreferenceArgs {
  category: string;
  preference: string;
}

interface StoreWorkHistoryArgs {
  jobTitle: string;
  companyName: string;
  startDate?: string;
  endDate?: string;
  responsibilities?: string[];
  achievements?: string[];
}

interface GetUserProfileArgs {
  dataType:
    | "work_history"
    | "education"
    | "skills"
    | "achievements"
    | "preferences"
    | "all";
}

interface ParseJobPostingArgs {
  content: string;
}

interface StoreJobPostingArgs {
  parsedJobPosting: string;
}

interface FindJobPostingsArgs {
  title?: string;
  company?: string;
  location?: string;
  limit?: number;
}

interface CompareSkillsToJobArgs {
  jobPostingId: string;
}

interface GenerateResumeArgs {
  style?: string;
  targetJobTitle?: string;
  customizations?: Record<string, unknown>;
}

interface GenerateCoverLetterArgs {
  jobPostingId?: string;
  jobDescription?: string;
  companyName?: string;
  customizations?: Record<string, unknown>;
}

// Zod validation schemas
const RouteToAgentSchema = z.object({
  next: z.enum([
    "data_manager",
    "resume_generator",
    "cover_letter_generator",
    "user_profile",
    "job_posting_manager",
    "END",
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

const StoreJobPostingSchema = z.object({
  parsedJobPosting: z.string().min(1),
});

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
      } catch (parseError) {
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
    };

    logger.info(`Initializing ${agentType} LLM model`, {
      model: modelOptions.model,
      temperature: modelOptions.temperature,
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
  // Filter to keep only human and AI messages
  const userMessages = stateMessages.filter(
    (msg) => msg._getType() === "human" || msg._getType() === "ai",
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

  // Handle object content
  if (typeof content === "object") {
    try {
      return JSON.stringify(content);
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

// Utility function to handle agent errors consistently
function handleAgentError(
  error: unknown,
  agentType: string,
): { messages: BaseMessage[]; next: string } {
  logger.error(`Error in ${agentType} agent`, {
    error: error instanceof Error ? error.message : String(error),
    agentType,
    stack: error instanceof Error ? error.stack : undefined,
  });

  const errorMessage =
    error instanceof AgentError ||
    error instanceof ValidationError ||
    error instanceof LLMError
      ? `I encountered an error: ${error.message}`
      : "I encountered an unexpected error while processing your request.";

  return {
    messages: [new AIMessage(`${errorMessage} Please try again.`)],
    next: "supervisor",
  };
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
});

// Define the type for the agent state
export type AgentStateType = {
  messages: BaseMessage[];
  next: string;
  userId?: string;
};

// Define the available agent types
const AGENT_TYPES = [
  "supervisor",
  "data_manager",
  "resume_generator",
  "cover_letter_generator",
  "user_profile",
  "job_posting_manager",
] as const;
type AgentType = (typeof AGENT_TYPES)[number];

const MEMBERS = [
  "data_manager",
  "resume_generator",
  "cover_letter_generator",
  "user_profile",
  "job_posting_manager",
] as const;

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

// Shared wrapper for agent invocations with better error handling
async function safeAgentInvoke(
  agent: ReturnType<typeof createAgent>,
  messages: BaseMessage[],
) {
  try {
    return await agent.invoke({ messages });
  } catch (error) {
    console.error("Agent invocation error:", error);
    // Return a formatted error message that won't break the stream
    return `I encountered an error processing your request: ${error instanceof Error ? error.message : String(error)}`;
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

    const systemMessage = `You are the Supervisor Agent for Resume Master, an AI system that helps users create professional resumes and cover letters.

Your primary job is to analyze messages and route them to the correct specialized agent. Your routing decisions are critical to system functioning.

IMPORTANT ROUTING RULES:
1. For data storage or retrieval requests (work history, education, etc.): Route to 'data_manager'
   Example: "Can you store my work experience?", "Look up my skills", "Save my preferences"

2. For resume creation, editing, or advice: Route to 'resume_generator'
   Example: "Create a resume", "How should I format my resume?", "Help with my resume"

3. For cover letter creation, editing, or advice: Route to 'cover_letter_generator'
   Example: "Write a cover letter", "Tailor a cover letter for this job", "Cover letter tips"

4. For job posting analysis, parsing, storage, OR skill comparison: Route to 'job_posting_manager'
   Example: "Parse this job posting", "Analyze job requirements", "Store this job posting", "What does this job require?", "How do my skills match this job?", "Compare my skills to job requirements"

5. For general user profile questions: Route to 'user_profile'
   Example: "What information do you have about me?", "How is my data used?"

6. For general questions or completed tasks: Call 'route_to_agent' with '${END}'
   Example: "Thank you", "That's all for now"

ALWAYS call the 'route_to_agent' tool with one of these exact destination values: 'data_manager', 'resume_generator', 'cover_letter_generator', 'job_posting_manager', 'user_profile', or '${END}'.

If you're unsure which specialized agent to route to, prefer 'data_manager' as it can help collect needed information.

If you don't call 'route_to_agent', your response will be sent directly to the user, so only do this for simple informational responses.`;

    // Prepare messages using the utility function
    const messages = prepareAgentMessages(state.messages, systemMessage);

    logger.info("Supervisor invoking LLM", {
      messageCount: messages.length,
      userId: state.userId,
    });

    // Invoke the LLM
    const response = await llm.invoke(messages);

    // Process tool calls if present
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
  response: { content?: unknown },
): Promise<{ messages: BaseMessage[]; next: string }> {
  try {
    const processedToolCalls = processToolCalls(toolCalls);

    if (processedToolCalls.length === 0) {
      logger.warn(
        "All supervisor tool calls were filtered out, providing direct response",
      );
      return {
        messages: [
          new AIMessage(
            contentToString(response.content) || "I understand your request.",
          ),
        ],
        next: END,
      };
    }

    // Look for the route_to_agent tool call
    const routingCall = processedToolCalls.find(
      (tc) => tc.name === "route_to_agent",
    );

    if (routingCall) {
      try {
        // Validate the routing arguments
        const validatedArgs = validateToolArgs(
          routingCall.args,
          RouteToAgentSchema,
          "route_to_agent",
        );
        const destination = validatedArgs.next;

        logger.info("Supervisor routing decision", { destination });

        return {
          messages: [
            new AIMessage({
              content: contentToString(response.content),
              tool_calls: processedToolCalls,
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

    // If no routing tool call found, handle directly
    logger.warn("No route_to_agent tool call found, handling directly");
    return {
      messages: [
        new AIMessage({
          content: contentToString(response.content),
          tool_calls: processedToolCalls,
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
  const content = contentToString(response.content);

  if (!content || content.trim() === "") {
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
    messages: [new AIMessage(content)],
    next: END,
  };
}

// Create specialized data manager tool call processor
async function processDataManagerToolCalls(
  toolCalls: ValidatedToolCall[],
  userId: string,
  response: { content?: unknown },
): Promise<string> {
  let toolCallSummary = "I've processed your request:\n\n";

  for (const toolCall of toolCalls) {
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
        const profileTool = createUserProfileTool(userId);
        const result = (await profileTool.invoke(args)) as string;

        let formattedResult: string;
        try {
          const parsedResult = JSON.parse(result) as unknown;
          formattedResult = JSON.stringify(parsedResult, null, 2);
        } catch {
          formattedResult = result;
        }

        toolCallSummary += `• Retrieved ${args.dataType} data:\n\n\`\`\`json\n${formattedResult}\n\`\`\`\n\n`;
      } catch (error) {
        const dataType =
          typeof toolCall.args?.dataType === "string"
            ? toolCall.args.dataType
            : "unknown";
        toolCallSummary += `Error retrieving ${dataType} data: ${error instanceof Error ? error.message : String(error)}\n`;
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
  systemMessage: `You are the Data Manager Agent for Resume Master.
  
Your job is to:
1. Look up information relating to the user, including work history, skills, achievements, and preferences.
2. Identify information in messages that should be stored
3. Store work history, skills, achievements, and user preferences
4. Organize and maintain the user's data

You have access to these tools:
- store_user_preference: For storing user preferences about grammar, phrases, resume style, etc.
- store_work_history: For storing details about previous jobs, responsibilities, achievements
- get_user_profile: For retrieving existing user data

When using these tools, you only need to specify the required parameters - all authentication and user identification happens automatically.`,
  getTools: getDataManagerTools,
  processToolCalls: processDataManagerToolCalls,
});

// Create resume generator node using the factory
const resumeGeneratorNode = createAgentNode({
  agentType: "resume_generator",
  systemMessage: `You are the Resume Generator Agent for Resume Master.
  
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
  systemMessage: `You are the Cover Letter Generator Agent for Resume Master.
  
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
): Promise<string> {
  let toolCallSummary = "Here's the information from your profile:\n\n";

  for (const toolCall of toolCalls) {
    if (toolCall.name === "get_user_profile") {
      try {
        const args = validateToolArgs(
          toolCall.args,
          GetUserProfileSchema,
          "get_user_profile",
        );
        const profileTool = createUserProfileTool(userId);
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
  systemMessage: `You are the User Profile Agent for Resume Master.
  
Your job is to:
1. Retrieve user profile information
2. Help users understand what data is stored in their profile
3. Explain how stored data is used in resume and cover letter generation

You have access to these tools:
- get_user_profile: For retrieving different types of user data (work history, education, skills, etc.)

You can retrieve different types of profile data using the get_user_profile tool. Simply specify which data type you need: work_history, education, skills, achievements, preferences, or all.`,
  getTools: getUserProfileTools,
  processToolCalls: processUserProfileToolCalls,
});

// Create specialized job posting tool call processor
async function processJobPostingToolCalls(
  toolCalls: ValidatedToolCall[],
  userId: string,
  response: { content?: unknown },
): Promise<string> {
  let toolCallSummary = "I've processed your job posting request:\n\n";
  let parsedJobPostingData: string | null = null;

  for (const toolCall of toolCalls) {
    if (toolCall.name === "parse_job_posting") {
      try {
        const args = validateToolArgs(
          toolCall.args,
          ParseJobPostingSchema,
          "parse_job_posting",
        );
        const tools = getJobPostingTools(userId);
        const parseJobPostingTool = tools.find(
          (t) => t.name === "parse_job_posting",
        );

        if (parseJobPostingTool) {
          const result = (await parseJobPostingTool.invoke({
            content: args.content,
          })) as string;
          parsedJobPostingData = result;

          // Parse the result to show summary info
          try {
            const parsed = JSON.parse(result) as {
              jobPosting?: {
                title?: string;
                company?: string;
                location?: string;
                industry?: string;
              };
            };
            if (parsed.jobPosting) {
              toolCallSummary += `• Successfully parsed job posting:\n`;
              toolCallSummary += `  - Title: ${parsed.jobPosting.title ?? "Unknown"}\n`;
              toolCallSummary += `  - Company: ${parsed.jobPosting.company ?? "Unknown"}\n`;
              toolCallSummary += `  - Location: ${parsed.jobPosting.location ?? "Unknown"}\n`;
              toolCallSummary += `  - Industry: ${parsed.jobPosting.industry ?? "Not specified"}\n\n`;
            }
          } catch {
            toolCallSummary += `• Parsed job posting (${args.content.length} characters)\n\n`;
          }
        }
      } catch (error) {
        toolCallSummary += `• Error parsing job posting: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else if (toolCall.name === "store_job_posting") {
      try {
        const args = validateToolArgs(
          toolCall.args,
          StoreJobPostingSchema,
          "store_job_posting",
        );
        const tools = getJobPostingTools(userId);
        const storeJobPostingTool = tools.find(
          (t) => t.name === "store_job_posting",
        );

        if (storeJobPostingTool) {
          const result = (await storeJobPostingTool.invoke({
            parsedJobPosting: args.parsedJobPosting,
          })) as string;
          toolCallSummary += `• ${result}\n`;
        }
      } catch (error) {
        toolCallSummary += `• Error storing job posting: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else {
      toolCallSummary += `• ${toolCall.name}: Processed successfully\n`;
    }
  }

  // If we parsed a job posting but didn't get a store_job_posting call, automatically store it
  if (
    parsedJobPostingData &&
    !toolCalls.some((tc) => tc.name === "store_job_posting")
  ) {
    try {
      const tools = getJobPostingTools(userId);
      const storeJobPostingTool = tools.find(
        (t) => t.name === "store_job_posting",
      );

      if (storeJobPostingTool) {
        const result = (await storeJobPostingTool.invoke({
          parsedJobPosting: parsedJobPostingData,
        })) as string;
        toolCallSummary += `• Auto-stored: ${result}\n`;
      }
    } catch (autoStoreError) {
      toolCallSummary += `• Error auto-storing job posting: ${autoStoreError instanceof Error ? autoStoreError.message : String(autoStoreError)}\n`;
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
1. Parse and analyze job posting content to extract structured information
2. Store job posting data in the database for later reference
3. Help users understand job requirements and qualifications
4. Compare user skills against job posting requirements
5. Find and retrieve previously stored job postings

You have access to these tools:
- parse_job_posting: For parsing job posting text and extracting structured data
- store_job_posting: For storing parsed job posting data in the database  
- find_job_postings: For finding stored job postings by title, company, location, etc.
- compare_skills_to_job: For comparing user skills against job requirements
- get_user_profile: For retrieving user data including skills

IMPORTANT: 
- When a user provides job posting content, first parse it, then store it in the database
- When a user asks about skill comparison, use compare_skills_to_job to analyze their fit
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
      return state.next;
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
        [END]: END, // Handle END special case
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
    response: { content?: unknown },
  ) => Promise<string>;
  requiresUserId?: boolean;
}

// Base agent factory to eliminate code duplication
function createAgentNode(config: AgentConfig) {
  return async (
    state: typeof AgentState.State,
  ): Promise<Partial<typeof AgentState.State>> => {
    try {
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

      // Process tool calls if present and custom processor is provided
      if (
        response?.tool_calls &&
        response.tool_calls.length > 0 &&
        config.processToolCalls
      ) {
        const processedToolCalls = processToolCalls(response.tool_calls);
        if (processedToolCalls.length > 0) {
          const result = await config.processToolCalls(
            processedToolCalls,
            userId,
            response,
          );
          return {
            messages: [new AIMessage(result)],
            next: "supervisor",
          };
        }
      }

      // Handle tool calls with default processing (if no custom processor)
      if (response?.tool_calls && response.tool_calls.length > 0) {
        return handleDefaultToolCalls(
          response.tool_calls,
          response,
          config.agentType,
        );
      }

      // Handle direct response
      return handleDirectAgentResponse(response, config.agentType);
    } catch (error) {
      return handleAgentError(error, config.agentType);
    }
  };
}

// Default tool call handler for agents
function handleDefaultToolCalls(
  toolCalls: Array<{
    name?: string;
    args?: unknown;
    id?: string;
    type?: string;
  }>,
  response: { content?: unknown },
  agentType: string,
): { messages: BaseMessage[]; next: string } {
  const processedToolCalls = processToolCalls(toolCalls);

  if (processedToolCalls.length === 0) {
    logger.warn(`All ${agentType} tool calls were filtered out`, { agentType });
    return {
      messages: [
        new AIMessage(
          contentToString(response.content) || "I processed your request.",
        ),
      ],
      next: "supervisor",
    };
  }

  // Create a summary of tool calls executed
  let toolCallSummary = "I've processed your request:\n\n";

  for (const toolCall of processedToolCalls) {
    toolCallSummary += `• ${toolCall.name}: Executed successfully\n`;
  }

  // Add any content from the response
  const responseContent = contentToString(response.content);
  if (responseContent?.trim()) {
    toolCallSummary += "\n" + responseContent;
  }

  logger.info(`${agentType} tool calls processed`, {
    agentType,
    toolCallCount: processedToolCalls.length,
  });

  return {
    messages: [new AIMessage(toolCallSummary)],
    next: "supervisor",
  };
}

// Handle direct responses from agents using the factory
function handleDirectAgentResponse(
  response: { content?: unknown },
  agentType: string,
): { messages: BaseMessage[]; next: string } {
  const content = contentToString(response.content);

  if (!content || content.trim() === "") {
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
    responseLength: content.length,
  });

  return {
    messages: [new AIMessage(content)],
    next: "supervisor",
  };
}
