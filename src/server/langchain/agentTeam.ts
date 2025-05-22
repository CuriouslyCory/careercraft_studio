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

// Initialize the model
export function createLLM(temperature = 0.2) {
  try {
    const { GOOGLE_API_KEY } = env;

    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not defined in environment variables");
    }

    // Validate Google API key format (simple check for expected pattern)
    if (!GOOGLE_API_KEY.startsWith("AI") || GOOGLE_API_KEY.length < 20) {
      throw new Error(
        "GOOGLE_API_KEY appears to be invalid. Google API keys typically start with 'AI' and are longer than 20 characters",
      );
    }

    // Use the most stable production model by default
    const modelOptions = {
      apiKey: GOOGLE_API_KEY,
      model: "gemini-2.0-flash", // Most stable production model
      temperature,
    };

    console.log("Initializing Google AI model with options:", {
      ...modelOptions,
      apiKey: "[REDACTED]", // Don't log the actual API key
    });

    // Create the model with the provided options
    const model = new ChatGoogleGenerativeAI(modelOptions);

    return model;
  } catch (error) {
    console.error("Error initializing language model:", error);
    throw new Error(
      "Failed to initialize language model: " +
        (error instanceof Error ? error.message : String(error)),
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
  // Create the LLM with tools in a try/catch block
  let llm;
  try {
    // Create LLM with a lower temperature for more predictable, deterministic responses
    // We're using a specialized function for the supervisor to use the most stable model
    console.log("Creating specialized supervisor LLM model...");

    const { GOOGLE_API_KEY } = env;
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not defined in environment variables");
    }

    // Use the most stable model version for the critical routing task
    const supervisorModelOptions = {
      apiKey: GOOGLE_API_KEY,
      model: "gemini-2.0-flash", // Use stable model for routing decisions
      temperature: 0.0, // Zero temperature for maximum determinism
    };

    console.log("Initializing supervisor model with options:", {
      ...supervisorModelOptions,
      apiKey: "[REDACTED]",
    });

    const model = new ChatGoogleGenerativeAI(supervisorModelOptions);
    console.log("Created specialized LLM model for supervisor node");

    // Bind the routing tool
    llm = model.bindTools(getSupervisorTools());
    console.log("Successfully bound tools to LLM");
  } catch (initError) {
    console.error("Failed to initialize LLM with tools:", initError);
    return {
      messages: [
        new AIMessage(
          "I'm having trouble initializing my AI capabilities. Please try again later.",
        ),
      ],
      next: END,
    };
  }

  const systemMessage = `You are the Supervisor Agent for Resume Master, an AI system that helps users create professional resumes and cover letters.

Your primary job is to analyze messages and route them to the correct specialized agent. Your routing decisions are critical to system functioning.

IMPORTANT ROUTING RULES:
1. For data storage or retrieval requests (work history, education, etc.): Route to 'data_manager'
   Example: "Can you store my work experience?", "Look up my skills", "Save my preferences"

2. For resume creation, editing, or advice: Route to 'resume_generator'
   Example: "Create a resume", "How should I format my resume?", "Help with my resume"

3. For cover letter creation, editing, or advice: Route to 'cover_letter_generator'
   Example: "Write a cover letter", "Tailor a cover letter for this job", "Cover letter tips"

4. For job posting analysis, parsing, or storage: Route to 'job_posting_manager'
   Example: "Parse this job posting", "Analyze job requirements", "Store this job posting", "What does this job require?"

5. For general user profile questions: Route to 'user_profile'
   Example: "What information do you have about me?", "How is my data used?"

6. For general questions or completed tasks: Call 'route_to_agent' with '${END}'
   Example: "Thank you", "That's all for now"

ALWAYS call the 'route_to_agent' tool with one of these exact destination values: 'data_manager', 'resume_generator', 'cover_letter_generator', 'job_posting_manager', 'user_profile', or '${END}'.

If you're unsure which specialized agent to route to, prefer 'data_manager' as it can help collect needed information.

If you don't call 'route_to_agent', your response will be sent directly to the user, so only do this for simple informational responses.`;

  // Only keep the human and AI messages
  const userMessages = state.messages.filter(
    (msg) => msg._getType() === "human" || msg._getType() === "ai",
  );

  // Create new messages array with system message first, then user messages
  const messages: BaseMessage[] = [
    new SystemMessage(systemMessage),
    ...userMessages,
  ];

  try {
    console.log(
      "Supervisor invoking LLM with messages:",
      messages.map(
        (m) =>
          `${m._getType()}: ${typeof m.content === "string" ? m.content.substring(0, 100) + "..." : "[complex content]"}`,
      ),
    );

    // Wrap the invoke call with additional try-catch for better error details
    let response;
    try {
      response = await llm.invoke(messages);

      // Defensive checks on response structure
      if (!response) {
        throw new Error("Received null or undefined response from LLM");
      }

      // Debug log the full response structure to see what's available
      console.log(
        "Raw LLM response structure:",
        JSON.stringify(
          response,
          (key: string, value: unknown): unknown => {
            if (key === "apiKey") return "[REDACTED]";
            return value;
          },
          2,
        ),
      );

      // Handle missing text or content - this is where the error might be happening
      if (response.text === undefined && response.content === undefined) {
        console.warn("Response is missing both text and content properties");
        // Create a synthetic response with empty content to avoid errors
        response.content = "I'm not sure how to respond to that.";
      }

      // Ensure content exists (might be null/undefined)
      response.content ??= response.text ?? ""; // Try to use text if content is missing
    } catch (invokeError) {
      console.error("Error during LLM invoke:", invokeError);
      throw new Error(
        `LLM invoke failed: ${invokeError instanceof Error ? invokeError.message : String(invokeError)}`,
      );
    }

    console.log(
      "Supervisor LLM response:",
      response.content,
      response.tool_calls,
    );

    // If the supervisor decided to call a tool (i.e., route_to_agent)
    if (response.tool_calls && response.tool_calls.length > 0) {
      // response.tool_calls is an array of InvalidToolCall from AIMessage
      // InvalidToolCall: { name?: string; args?: string; id?: string; type: "tool_call"; ... }
      // We need to transform these to a stricter format if subsequent operations expect it.
      // The target ToolCall type appears to require: { name: string; args: string; id: string; type: "tool_call" }
      const processedToolCalls = response.tool_calls
        .map((tc_raw) => {
          // Skip processing if tc_raw is undefined or null
          if (!tc_raw) {
            console.warn(
              "Supervisor: Encountered null/undefined tool call object",
            );
            return null;
          }

          const name = tc_raw.name;
          const id = tc_raw.id;
          // Ensure args is a string, defaulting to empty JSON object string if undefined/null
          const args_string =
            typeof tc_raw.args === "string"
              ? tc_raw.args
              : JSON.stringify(tc_raw.args ?? {});
          let args_obj: Record<string, unknown>;
          try {
            args_obj = JSON.parse(args_string) as Record<string, unknown>;
          } catch (e) {
            console.warn(
              "Supervisor: Failed to parse tool call args, defaulting to empty object:",
              args_string,
              e,
            );
            args_obj = {};
          }

          // Filter out tool calls that don't have a valid name or id
          if (
            name &&
            name.length > 0 &&
            id &&
            id.length > 0 &&
            tc_raw.type === "tool_call"
          ) {
            return {
              name,
              args: args_obj, // Use the parsed object here
              id,
              type: "tool_call" as const,
            };
          }
          // Log problematic tool calls for debugging
          console.warn(
            "Supervisor: Filtering out tool call with missing/empty name or id, or incorrect type:",
            tc_raw,
          );
          return null;
        })
        .filter(
          (
            tc,
          ): tc is {
            name: string;
            args: Record<string, unknown>; // Updated type for args
            id: string;
            type: "tool_call";
          } => tc !== null,
        );

      console.log("Supervisor processed tool calls:", processedToolCalls);

      if (processedToolCalls.length === 0) {
        console.warn(
          "Supervisor: All tool_calls were filtered out (e.g., missing name or id). Responding directly.",
        );
        // Fallback to a direct response if no valid tool calls remain
        return {
          messages: [new AIMessage({ content: response.content ?? "" })],
          next: END, // Explicitly set next to END if no valid tool calls
        };
      }

      // Look for the route_to_agent tool call to set the next state
      const routingCall = processedToolCalls.find(
        (tc) => tc.name === "route_to_agent",
      );

      if (
        routingCall?.args &&
        typeof routingCall.args === "object" &&
        "next" in routingCall.args
      ) {
        // Extract the destination from the tool call
        const destination = routingCall.args.next as string;
        console.log(`Supervisor routing to: ${destination}`);

        // Return messages with the processed tool calls and set the next state
        return {
          messages: [
            new AIMessage({
              content: response.content ?? "", // Ensure content is a string
              tool_calls: processedToolCalls,
            }),
          ],
          next: destination, // Explicitly set the next state from the tool call
        };
      }

      // If we got tool calls but no routing tool call, default to supervisor handling
      console.warn(
        "Supervisor: Found tool calls but no route_to_agent. Handling directly.",
      );
      return {
        messages: [
          new AIMessage({
            content: response.content ?? "", // Ensure content is a string
            tool_calls: processedToolCalls,
          }),
        ],
        next: END, // Default to END if no routing destination specified
      };
    }

    // If no tool calls, it's a direct response from the supervisor
    const directResponseContent =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    // Provide a meaningful response for empty content
    if (
      (!directResponseContent || directResponseContent.trim() === "") &&
      !(response.tool_calls && response.tool_calls.length > 0)
    ) {
      console.warn(
        "Supervisor LLM response had no direct content and no tool calls. Providing default response.",
      );
      return {
        messages: [
          new AIMessage(
            "I apologize, but I don't have enough information to help with that specific request. Could you provide more details about what you're looking for?",
          ),
        ],
        next: END,
      };
    }

    console.log(
      "Supervisor decision: Handling directly. Response:",
      directResponseContent,
    );

    // Use default message if content is empty or only whitespace
    const finalContent =
      !directResponseContent || directResponseContent.trim() === ""
        ? "I understand your request. Let me help you with that."
        : directResponseContent;

    return {
      messages: [new AIMessage(finalContent)],
      next: END, // After direct handling, the supervisor's turn is over.
    };
  } catch (error) {
    console.error("Error in supervisor agent:", error);
    // Log more detailed diagnostics
    if (error instanceof Error && error.stack) {
      console.error("Error stack trace:", error.stack);
    }

    // If we have a more specific error, provide better feedback
    const errorMessage =
      error instanceof Error
        ? `Error: ${error.message}`
        : "I encountered an error while trying to supervise the task.";

    console.log("Returning error message to user:", errorMessage);

    return {
      messages: [
        new AIMessage(
          "I encountered an error while trying to supervise the task. Please try again.",
        ),
      ],
      next: END,
    };
  }
}

async function dataManagerNode(
  state: typeof AgentState.State,
): Promise<Partial<typeof AgentState.State>> {
  const systemMessage = `You are the Data Manager Agent for Resume Master.
  
Your job is to:
1. Look up information relating to the user, including work history, skills, achievements, and preferences.
2. Identify information in messages that should be stored
3. Store work history, skills, achievements, and user preferences
4. Organize and maintain the user's data

You have access to these tools:
- store_user_preference: For storing user preferences about grammar, phrases, resume style, etc.
- store_work_history: For storing details about previous jobs, responsibilities, achievements
- get_user_profile: For retrieving existing user data

When using these tools, you only need to specify the required parameters - all authentication and user identification happens automatically.`;

  // Create LLM with appropriate tools
  try {
    console.log("Creating specialized LLM for data manager with tools...");

    // Get userId directly from the agent state
    const userId = state.userId || "";
    if (!userId) {
      console.warn("No user ID found in agent state for data manager");
      return {
        messages: [
          new AIMessage(
            "I'm unable to access your profile information. Please make sure you're logged in and try again.",
          ),
        ],
        next: "supervisor",
      };
    }

    console.log(`Using user ID from agent state: ${userId}`);

    // Use the same stable model as the supervisor
    const { GOOGLE_API_KEY } = env;
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not defined in environment variables");
    }

    // Use the stable model for tool-using agents
    const dataManagerModelOptions = {
      apiKey: GOOGLE_API_KEY,
      model: "gemini-2.0-flash", // Use the same stable model as the supervisor
      temperature: 0.2, // Slightly higher temperature for creativity in responses
    };

    console.log("Initializing data manager model with options:", {
      ...dataManagerModelOptions,
      apiKey: "[REDACTED]",
    });

    // Create a specialized model
    const model = new ChatGoogleGenerativeAI(dataManagerModelOptions);

    // Bind the data management tools
    const llm = model.bindTools(getDataManagerTools(userId));
    console.log("Successfully bound data management tools to LLM");

    // Only keep human and AI messages, filtering out any system messages
    const userMessages = state.messages.filter(
      (msg) => msg._getType() === "human" || msg._getType() === "ai",
    );

    // Create new messages array with system message first, then user messages
    const messages = [new SystemMessage(systemMessage), ...userMessages];

    console.log(
      "Data Manager message types:",
      messages.map((m) => m._getType()),
    );

    console.log("Data Manager invoking LLM with tools...");

    try {
      const response = await llm.invoke(messages);
      console.log(
        "Data Manager received raw response:",
        JSON.stringify(
          response,
          (key: string, value: unknown): unknown => {
            if (key === "apiKey") return "[REDACTED]";
            return value;
          },
          2,
        ).substring(0, 500) + "...",
      );

      // Handle tool calls if present
      if (response?.tool_calls && response.tool_calls.length > 0) {
        console.log("Data Manager processing tool calls:", response.tool_calls);

        // Create a combined response that includes tool call results
        let toolCallSummary = "I've processed your request:\n\n";

        for (const tool_call of response.tool_calls) {
          if (tool_call.name) {
            // Summarize the tool call
            toolCallSummary += `• ${tool_call.name}: `;

            if (tool_call.name === "store_user_preference" && tool_call.args) {
              const args: Record<string, unknown> =
                typeof tool_call.args === "string"
                  ? (JSON.parse(tool_call.args) as Record<string, unknown>)
                  : (tool_call.args as Record<string, unknown>);

              const category =
                typeof args.category === "string" ? args.category : "general";
              const preference =
                typeof args.preference === "string"
                  ? args.preference
                  : "unspecified";

              toolCallSummary += `Stored preference for ${category}: ${preference}\n`;
            } else if (
              tool_call.name === "store_work_history" &&
              tool_call.args
            ) {
              const args: Record<string, unknown> =
                typeof tool_call.args === "string"
                  ? (JSON.parse(tool_call.args) as Record<string, unknown>)
                  : (tool_call.args as Record<string, unknown>);

              const jobTitle =
                typeof args.jobTitle === "string" ? args.jobTitle : "position";
              const companyName =
                typeof args.companyName === "string"
                  ? args.companyName
                  : "company";

              toolCallSummary += `Stored work history: ${jobTitle} at ${companyName}\n`;
            } else if (
              tool_call.name === "get_user_profile" &&
              tool_call.args
            ) {
              const args: Record<string, unknown> =
                typeof tool_call.args === "string"
                  ? (JSON.parse(tool_call.args) as Record<string, unknown>)
                  : (tool_call.args as Record<string, unknown>);

              const dataType =
                typeof args.dataType === "string" ? args.dataType : "all";

              // Execute the tool directly to get the result
              const profileTool = createUserProfileTool(userId);
              try {
                const typedArgs = {
                  dataType: dataType as
                    | "work_history"
                    | "education"
                    | "skills"
                    | "achievements"
                    | "preferences"
                    | "all",
                };

                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const result: string = await profileTool.invoke(typedArgs);

                // Format the result nicely
                let formattedResult: string = result;
                try {
                  // Attempt to parse the JSON result for better display
                  const parsedResult: unknown = JSON.parse(result);
                  formattedResult = JSON.stringify(parsedResult, null, 2);
                } catch (e) {
                  // If it's not valid JSON, use the original result
                  console.log("Result is not valid JSON, using as-is");
                }

                toolCallSummary += `Retrieved ${dataType} data:\n\n\`\`\`json\n${formattedResult}\n\`\`\`\n\n`;
              } catch (toolError) {
                toolCallSummary += `Attempted to retrieve ${dataType} data, but encountered an error: ${
                  toolError instanceof Error
                    ? toolError.message
                    : String(toolError)
                }\n`;
              }
            } else {
              toolCallSummary += `Processed successfully\n`;
            }
          }
        }

        // Add any content from the response
        if (
          response.content &&
          typeof response.content === "string" &&
          response.content.trim()
        ) {
          toolCallSummary += "\n" + response.content;
        }

        console.log("Data Manager tool call summary:", toolCallSummary);

        return {
          messages: [new AIMessage(toolCallSummary)],
          next: "supervisor",
        };
      }

      // Check if the response has content
      if (response?.content) {
        const content =
          typeof response.content === "string"
            ? response.content
            : JSON.stringify(response.content);

        console.log(
          "Data Manager generated response:",
          content.substring(0, 150) + "...",
        );

        return {
          messages: [new AIMessage(content)],
          next: "supervisor",
        };
      } else {
        console.warn("Data Manager received empty response");
        return {
          messages: [
            new AIMessage(
              "I processed your request but couldn't generate a proper response. Let me hand this back to the supervisor.",
            ),
          ],
          next: "supervisor",
        };
      }
    } catch (invokeError) {
      console.error("Error during Data Manager LLM invoke:", invokeError);

      // Create a more detailed error message
      const errorDetails =
        invokeError instanceof Error
          ? invokeError.message
          : String(invokeError);

      return {
        messages: [
          new AIMessage(
            `I encountered an error while trying to process your data: ${errorDetails}. Please try again with more specific information.`,
          ),
        ],
        next: "supervisor",
      };
    }
  } catch (error) {
    console.error("Error in data manager agent:", error);
    return {
      messages: [
        new AIMessage(
          "I encountered an error while trying to process your data. Please try again later.",
        ),
      ],
      next: END,
    };
  }
}

async function resumeGeneratorNode(
  state: typeof AgentState.State,
): Promise<Partial<typeof AgentState.State>> {
  const systemMessage = `You are the Resume Generator Agent for Resume Master.
  
Your job is to:
1. Create professional resumes based on user data
2. Format resumes according to industry standards and user preferences
3. Provide resume writing advice
4. Edit existing resumes

You have access to these tools:
- generate_resume: For creating formatted resumes in different styles
- get_user_profile: For retrieving user data needed for resume generation

When using these tools, you only need to specify the required parameters - all authentication and user identification happens automatically.`;

  // Create LLM with appropriate tools
  try {
    console.log("Creating specialized LLM for resume generator with tools...");

    // Get userId directly from the agent state
    const userId = state.userId || "";
    if (!userId) {
      console.warn("No user ID found in agent state for resume generator");
      return {
        messages: [
          new AIMessage(
            "I'm unable to access your profile information. Please make sure you're logged in and try again.",
          ),
        ],
        next: "supervisor",
      };
    }

    console.log(`Using user ID from agent state: ${userId}`);

    // Use the same stable model as the supervisor
    const { GOOGLE_API_KEY } = env;
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not defined in environment variables");
    }

    // Use the stable model for tool-using agents
    const resumeGeneratorModelOptions = {
      apiKey: GOOGLE_API_KEY,
      model: "gemini-2.0-flash", // Use the same stable model as the supervisor
      temperature: 0.2, // Slightly higher temperature for creativity in responses
    };

    console.log("Initializing resume generator model with options:", {
      ...resumeGeneratorModelOptions,
      apiKey: "[REDACTED]",
    });

    // Create a specialized model
    const model = new ChatGoogleGenerativeAI(resumeGeneratorModelOptions);

    // Bind the resume generation tools
    const llm = model.bindTools(getResumeGeneratorTools(userId));
    console.log("Successfully bound resume generation tools to LLM");

    // Only keep human and AI messages, filtering out any system messages
    const userMessages = state.messages.filter(
      (msg) => msg._getType() === "human" || msg._getType() === "ai",
    );

    // Create new messages array with system message first, then user messages
    const messages = [new SystemMessage(systemMessage), ...userMessages];

    console.log(
      "Resume Generator message types:",
      messages.map((m) => m._getType()),
    );

    console.log("Resume Generator invoking LLM with tools...");
    const response = await llm.invoke(messages);

    // Check if the response has content
    if (response?.content) {
      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      console.log(
        "Resume Generator generated response:",
        content.substring(0, 150) + "...",
      );

      return {
        messages: [new AIMessage(content)],
        next: "supervisor",
      };
    } else {
      console.warn("Resume Generator received empty response");
      return {
        messages: [
          new AIMessage(
            "I processed your request but couldn't generate a proper response. Let me hand this back to the supervisor.",
          ),
        ],
        next: "supervisor",
      };
    }
  } catch (error) {
    console.error("Error in resume generator agent:", error);
    return {
      messages: [
        new AIMessage(
          "I encountered an error while trying to generate your resume. Please try again later.",
        ),
      ],
      next: END,
    };
  }
}

async function coverLetterGeneratorNode(
  state: typeof AgentState.State,
): Promise<Partial<typeof AgentState.State>> {
  const systemMessage = `You are the Cover Letter Generator Agent for Resume Master.
  
Your job is to:
1. Create tailored cover letters based on job descriptions and user data
2. Edit existing cover letters
3. Format cover letters according to user preferences
4. Provide cover letter writing advice

You have access to these tools:
- generate_cover_letter: For creating tailored cover letters for specific jobs
- get_user_profile: For retrieving user data needed for cover letter generation

When using these tools, you only need to specify the required parameters - all authentication and user identification happens automatically.`;

  // Create LLM with appropriate tools
  try {
    console.log(
      "Creating specialized LLM for cover letter generator with tools...",
    );

    // Get userId directly from the agent state
    const userId = state.userId || "";
    if (!userId) {
      console.warn(
        "No user ID found in agent state for cover letter generator",
      );
      return {
        messages: [
          new AIMessage(
            "I'm unable to access your profile information. Please make sure you're logged in and try again.",
          ),
        ],
        next: "supervisor",
      };
    }

    console.log(`Using user ID from agent state: ${userId}`);

    // Use the same stable model as the supervisor
    const { GOOGLE_API_KEY } = env;
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not defined in environment variables");
    }

    // Use the stable model for tool-using agents
    const coverLetterModelOptions = {
      apiKey: GOOGLE_API_KEY,
      model: "gemini-2.0-flash", // Use the same stable model as the supervisor
      temperature: 0.2, // Slightly higher temperature for creativity in responses
    };

    console.log("Initializing cover letter generator model with options:", {
      ...coverLetterModelOptions,
      apiKey: "[REDACTED]",
    });

    // Create a specialized model
    const model = new ChatGoogleGenerativeAI(coverLetterModelOptions);

    // Bind the cover letter generation tools
    const llm = model.bindTools(getCoverLetterGeneratorTools(userId));
    console.log("Successfully bound cover letter generation tools to LLM");

    // Only keep human and AI messages, filtering out any system messages
    const userMessages = state.messages.filter(
      (msg) => msg._getType() === "human" || msg._getType() === "ai",
    );

    // Create new messages array with system message first, then user messages
    const messages = [new SystemMessage(systemMessage), ...userMessages];

    console.log(
      "Cover Letter Generator message types:",
      messages.map((m) => m._getType()),
    );

    console.log("Cover Letter Generator invoking LLM with tools...");
    const response = await llm.invoke(messages);

    // Check if the response has content
    if (response?.content) {
      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      console.log(
        "Cover Letter Generator generated response:",
        content.substring(0, 150) + "...",
      );

      return {
        messages: [new AIMessage(content)],
        next: "supervisor",
      };
    } else {
      console.warn("Cover Letter Generator received empty response");
      return {
        messages: [
          new AIMessage(
            "I processed your request but couldn't generate a proper response. Let me hand this back to the supervisor.",
          ),
        ],
        next: "supervisor",
      };
    }
  } catch (error) {
    console.error("Error in cover letter generator agent:", error);
    return {
      messages: [
        new AIMessage(
          "I encountered an error while trying to generate your cover letter. Please try again later.",
        ),
      ],
      next: END,
    };
  }
}

async function userProfileNode(
  state: typeof AgentState.State,
): Promise<Partial<typeof AgentState.State>> {
  const systemMessage = `You are the User Profile Agent for Resume Master.
  
Your job is to:
1. Retrieve user profile information
2. Help users understand what data is stored in their profile
3. Explain how stored data is used in resume and cover letter generation

You have access to these tools:
- get_user_profile: For retrieving different types of user data (work history, education, skills, etc.)

You can retrieve different types of profile data using the get_user_profile tool. Simply specify which data type you need: work_history, education, skills, achievements, preferences, or all.`;

  // Create LLM with appropriate tools
  try {
    console.log("Creating specialized LLM for user profile with tools...");

    // Get userId directly from the agent state
    const userId = state.userId || "";
    if (!userId) {
      console.warn("No user ID found in agent state");
      return {
        messages: [
          new AIMessage(
            "I'm unable to access your profile information. Please make sure you're logged in and try again.",
          ),
        ],
        next: "supervisor",
      };
    }

    console.log(`Using user ID from agent state: ${userId}`);

    // Use the same stable model as the supervisor
    const { GOOGLE_API_KEY } = env;
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not defined in environment variables");
    }

    // Use the stable model for tool-using agents
    const profileModelOptions = {
      apiKey: GOOGLE_API_KEY,
      model: "gemini-2.0-flash", // Use the same stable model as the supervisor
      temperature: 0.2, // Slightly higher temperature for creativity in responses
    };

    console.log("Initializing user profile model with options:", {
      ...profileModelOptions,
      apiKey: "[REDACTED]",
    });

    // Create a specialized model
    const model = new ChatGoogleGenerativeAI(profileModelOptions);

    // Bind the profile retrieval tools with pre-filled userId
    const llm = model.bindTools(getUserProfileTools(userId));
    console.log("Successfully bound profile retrieval tools to LLM");

    // Only keep human and AI messages, filtering out any system messages
    const userMessages = state.messages.filter(
      (msg) => msg._getType() === "human" || msg._getType() === "ai",
    );

    // Create new messages array with system messages first, then user messages
    const messages = [new SystemMessage(systemMessage), ...userMessages];

    console.log(
      "User Profile Agent message types:",
      messages.map((m) => m._getType()),
    );

    console.log("User Profile Agent invoking LLM with tools...");
    const response = await llm.invoke(messages);

    // Handle tool calls if present
    if (response?.tool_calls && response.tool_calls.length > 0) {
      console.log(
        "User Profile Agent processing tool calls:",
        response.tool_calls,
      );

      // Create a combined response that includes tool call results
      let toolCallSummary = "Here's the information from your profile:\n\n";

      for (const tool_call of response.tool_calls) {
        if (tool_call.name === "get_user_profile" && tool_call.args) {
          const args: Record<string, unknown> =
            typeof tool_call.args === "string"
              ? (JSON.parse(tool_call.args) as Record<string, unknown>)
              : (tool_call.args as Record<string, unknown>);

          const dataType =
            typeof args.dataType === "string" ? args.dataType : "all";

          // Execute the tool directly to get the result
          const profileTool = createUserProfileTool(userId);
          try {
            const typedArgs = {
              dataType: dataType as
                | "work_history"
                | "education"
                | "skills"
                | "achievements"
                | "preferences"
                | "all",
            };

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const result: string = await profileTool.invoke(typedArgs);

            // Format the result nicely
            let formattedResult: string = result;
            try {
              // Attempt to parse the JSON result for better display
              const parsedResult: unknown = JSON.parse(result);
              formattedResult = JSON.stringify(parsedResult, null, 2);
            } catch (e) {
              // If it's not valid JSON, use the original result
              console.log("Result is not valid JSON, using as-is");
            }

            toolCallSummary += `## ${dataType.replace("_", " ").toUpperCase()} ##\n\n\`\`\`json\n${formattedResult}\n\`\`\`\n\n`;
          } catch (toolError) {
            toolCallSummary += `Attempted to retrieve ${dataType} data, but encountered an error: ${
              toolError instanceof Error ? toolError.message : String(toolError)
            }\n`;
          }
        }
      }

      // Add any content from the response
      if (
        response.content &&
        typeof response.content === "string" &&
        response.content.trim()
      ) {
        toolCallSummary += "\n" + response.content;
      }

      console.log(
        "User Profile Agent tool call summary:",
        toolCallSummary.substring(0, 150) + "...",
      );

      return {
        messages: [new AIMessage(toolCallSummary)],
        next: "supervisor",
      };
    }

    // Check if the response has content
    if (response?.content) {
      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      console.log(
        "User Profile Agent generated response:",
        content.substring(0, 150) + "...",
      );

      return {
        messages: [new AIMessage(content)],
        next: "supervisor",
      };
    } else {
      console.warn("User Profile Agent received empty response");
      return {
        messages: [
          new AIMessage(
            "I processed your request but couldn't generate a proper response. Let me hand this back to the supervisor.",
          ),
        ],
        next: "supervisor",
      };
    }
  } catch (error) {
    console.error("Error in user profile agent:", error);
    return {
      messages: [
        new AIMessage(
          "I encountered an error while trying to retrieve your profile information. Please try again later.",
        ),
      ],
      next: END,
    };
  }
}

async function jobPostingManagerNode(
  state: typeof AgentState.State,
): Promise<Partial<typeof AgentState.State>> {
  const systemMessage = `You are the Job Posting Manager Agent for Resume Master.
  
Your job is to:
1. Parse and analyze job posting content to extract structured information
2. Store job posting data in the database for later reference
3. Help users understand job requirements and qualifications
4. Provide insights about job postings

You have access to these tools:
- parse_job_posting: For parsing job posting text and extracting structured data
- store_job_posting: For storing parsed job posting data in the database

IMPORTANT: When a user provides job posting content, you should:
1. First call parse_job_posting with the content to extract structured data
2. Then call store_job_posting with the parsed data to save it to the database

When using these tools, you only need to specify the required parameters - all authentication and user identification happens automatically.`;

  // Create LLM with appropriate tools
  try {
    console.log(
      "Creating specialized LLM for job posting manager with tools...",
    );

    // Get userId directly from the agent state
    const userId = state.userId || "";
    if (!userId) {
      console.warn("No user ID found in agent state for job posting manager");
      return {
        messages: [
          new AIMessage(
            "I'm unable to access your profile information. Please make sure you're logged in and try again.",
          ),
        ],
        next: "supervisor",
      };
    }

    console.log(`Using user ID from agent state: ${userId}`);

    // Use the same stable model as the supervisor
    const { GOOGLE_API_KEY } = env;
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not defined in environment variables");
    }

    // Use the stable model for tool-using agents
    const jobPostingModelOptions = {
      apiKey: GOOGLE_API_KEY,
      model: "gemini-2.0-flash", // Use the same stable model as the supervisor
      temperature: 0.2, // Slightly higher temperature for creativity in responses
    };

    console.log("Initializing job posting manager model with options:", {
      ...jobPostingModelOptions,
      apiKey: "[REDACTED]",
    });

    // Create a specialized model
    const model = new ChatGoogleGenerativeAI(jobPostingModelOptions);

    // Bind the job posting tools
    const llm = model.bindTools(getJobPostingTools(userId));
    console.log("Successfully bound job posting tools to LLM");

    // Only keep human and AI messages, filtering out any system messages
    const userMessages = state.messages.filter(
      (msg) => msg._getType() === "human" || msg._getType() === "ai",
    );

    // Create new messages array with system message first, then user messages
    const messages = [new SystemMessage(systemMessage), ...userMessages];

    console.log(
      "Job Posting Manager message types:",
      messages.map((m) => m._getType()),
    );

    console.log("Job Posting Manager invoking LLM with tools...");
    const response = await llm.invoke(messages);

    // Handle tool calls if present
    if (response?.tool_calls && response.tool_calls.length > 0) {
      console.log(
        "Job Posting Manager processing tool calls:",
        response.tool_calls,
      );

      // Create a combined response that includes tool call results
      let toolCallSummary = "I've processed your job posting request:\n\n";
      let parsedJobPostingData: string | null = null;

      for (const tool_call of response.tool_calls) {
        if (tool_call.name === "parse_job_posting" && tool_call.args) {
          const args: Record<string, unknown> =
            typeof tool_call.args === "string"
              ? (JSON.parse(tool_call.args) as Record<string, unknown>)
              : (tool_call.args as Record<string, unknown>);

          const content = typeof args.content === "string" ? args.content : "";

          // Execute the parse_job_posting tool directly
          try {
            // Get the actual tools
            const tools = getJobPostingTools(userId);
            const parseJobPostingTool = tools.find(
              (t) => t.name === "parse_job_posting",
            );

            if (parseJobPostingTool) {
              const result: string = (await parseJobPostingTool.invoke({
                content,
              })) as string;
              parsedJobPostingData = result;

              // Parse the result to show summary info
              try {
                const parsed: unknown = JSON.parse(result);
                if (
                  parsed &&
                  typeof parsed === "object" &&
                  "jobPosting" in parsed &&
                  parsed.jobPosting &&
                  typeof parsed.jobPosting === "object"
                ) {
                  const jobPosting = parsed.jobPosting as {
                    title?: string;
                    company?: string;
                    location?: string;
                    industry?: string;
                    details?: {
                      responsibilities?: string[];
                      qualifications?: string[];
                      bonusQualifications?: string[];
                    };
                  };

                  toolCallSummary += `• Successfully parsed job posting:\n`;
                  toolCallSummary += `  - Title: ${jobPosting.title ?? "Unknown"}\n`;
                  toolCallSummary += `  - Company: ${jobPosting.company ?? "Unknown"}\n`;
                  toolCallSummary += `  - Location: ${jobPosting.location ?? "Unknown"}\n`;
                  toolCallSummary += `  - Industry: ${jobPosting.industry ?? "Not specified"}\n`;
                  toolCallSummary += `  - Responsibilities: ${jobPosting.details?.responsibilities?.length ?? 0} items\n`;
                  toolCallSummary += `  - Required qualifications: ${jobPosting.details?.qualifications?.length ?? 0} items\n`;
                  toolCallSummary += `  - Bonus qualifications: ${jobPosting.details?.bonusQualifications?.length ?? 0} items\n\n`;
                } else {
                  toolCallSummary += `• Parsed job posting (${content.length} characters)\n\n`;
                }
              } catch (parseError) {
                toolCallSummary += `• Parsed job posting (${content.length} characters)\n\n`;
              }
            } else {
              toolCallSummary += `• Error: Could not find parse_job_posting tool\n`;
            }
          } catch (toolError) {
            toolCallSummary += `• Error parsing job posting: ${
              toolError instanceof Error ? toolError.message : String(toolError)
            }\n`;
          }
        } else if (tool_call.name === "store_job_posting" && tool_call.args) {
          const args: Record<string, unknown> =
            typeof tool_call.args === "string"
              ? (JSON.parse(tool_call.args) as Record<string, unknown>)
              : (tool_call.args as Record<string, unknown>);

          const parsedJobPosting =
            typeof args.parsedJobPosting === "string"
              ? args.parsedJobPosting
              : "";

          // Execute the store_job_posting tool directly
          try {
            const tools = getJobPostingTools(userId);
            const storeJobPostingTool = tools.find(
              (t) => t.name === "store_job_posting",
            );

            if (storeJobPostingTool) {
              const result: string = (await storeJobPostingTool.invoke({
                parsedJobPosting,
              })) as string;
              toolCallSummary += `• ${result}\n`;
            } else {
              toolCallSummary += `• Error: Could not find store_job_posting tool\n`;
            }
          } catch (toolError) {
            toolCallSummary += `• Error storing job posting: ${
              toolError instanceof Error ? toolError.message : String(toolError)
            }\n`;
          }
        } else {
          toolCallSummary += `• ${tool_call.name}: Processed successfully\n`;
        }
      }

      // If we parsed a job posting but didn't get a store_job_posting call, automatically store it
      if (
        parsedJobPostingData &&
        !response.tool_calls.some((tc) => tc.name === "store_job_posting")
      ) {
        try {
          const tools = getJobPostingTools(userId);
          const storeJobPostingTool = tools.find(
            (t) => t.name === "store_job_posting",
          );

          if (storeJobPostingTool) {
            const result: string = (await storeJobPostingTool.invoke({
              parsedJobPosting: parsedJobPostingData,
            })) as string;
            toolCallSummary += `• Auto-stored: ${result}\n`;
          }
        } catch (autoStoreError) {
          toolCallSummary += `• Error auto-storing job posting: ${
            autoStoreError instanceof Error
              ? autoStoreError.message
              : String(autoStoreError)
          }\n`;
        }
      }

      // Add any content from the response
      if (
        response.content &&
        typeof response.content === "string" &&
        response.content.trim()
      ) {
        toolCallSummary += "\n" + response.content;
      }

      console.log("Job Posting Manager tool call summary:", toolCallSummary);

      return {
        messages: [new AIMessage(toolCallSummary)],
        next: "supervisor",
      };
    }

    // Check if the response has content
    if (response?.content) {
      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      console.log(
        "Job Posting Manager generated response:",
        content.substring(0, 150) + "...",
      );

      return {
        messages: [new AIMessage(content)],
        next: "supervisor",
      };
    } else {
      console.warn("Job Posting Manager received empty response");
      return {
        messages: [
          new AIMessage(
            "I processed your request but couldn't generate a proper response. Let me hand this back to the supervisor.",
          ),
        ],
        next: "supervisor",
      };
    }
  } catch (error) {
    console.error("Error in job posting manager agent:", error);
    return {
      messages: [
        new AIMessage(
          "I encountered an error while trying to process the job posting. Please try again later.",
        ),
      ],
      next: END,
    };
  }
}

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
