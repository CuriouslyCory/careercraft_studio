import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent } from "./agent";
import { env } from "~/env";
import { DynamicStructuredTool } from "@langchain/core/tools";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { StateGraph, END } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";

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
});

// Define the type for the agent state
type AgentStateType = {
  messages: BaseMessage[];
  next: string;
};

// Define the available agent types
const AGENT_TYPES = [
  "supervisor",
  "data_manager",
  "resume_generator",
  "cover_letter_generator",
  "user_profile",
] as const;
type AgentType = (typeof AGENT_TYPES)[number];

// Tool to store user preferences
const storeUserPreferenceTool = new DynamicStructuredTool({
  name: "store_user_preference",
  description:
    "Stores a user preference such as grammar style, phrases, or resume style choices",
  schema: z.object({
    category: z.enum(["grammar", "phrases", "resume_style", "other"]),
    preference: z.string().describe("The preference to store"),
    details: z
      .string()
      .optional()
      .describe("Additional details about the preference"),
  }),
  func: async ({ category, preference, details }) => {
    console.log(`Storing user preference: ${category} - ${preference}`);
    // TODO: Store in database (stub for now)
    return `Successfully stored user preference for ${category}: ${preference}`;
  },
});

// Tool to store work history
const storeWorkHistoryTool = new DynamicStructuredTool({
  name: "store_work_history",
  description: "Stores information about a user's work history",
  schema: z.object({
    companyName: z.string(),
    jobTitle: z.string(),
    startDate: z.string().describe("Start date in YYYY-MM-DD format"),
    endDate: z
      .string()
      .optional()
      .describe(
        "End date in YYYY-MM-DD format, or 'present' for current positions",
      ),
    achievements: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
  }),
  func: async ({
    companyName,
    jobTitle,
    startDate,
    endDate,
    achievements,
    skills,
  }) => {
    console.log(`Storing work history: ${jobTitle} at ${companyName}`);
    // TODO: Store in database (stub for now)
    return `Successfully stored work history: ${jobTitle} at ${companyName}`;
  },
});

// Tool to generate a resume
const generateResumeTool = new DynamicStructuredTool({
  name: "generate_resume",
  description: "Generate a formatted resume based on the user's information",
  schema: z.object({
    format: z.enum(["PDF", "Word", "Text"]),
    style: z.enum(["Modern", "Traditional", "Creative", "Minimal"]),
    sections: z.array(z.string()).describe("Sections to include in the resume"),
  }),
  func: async ({ format, style, sections }) => {
    console.log(`Generating resume in ${format} format with ${style} style`);
    // TODO: Implement resume generation (stub for now)
    return `Resume generation initiated in ${format} format with ${style} style. Sections: ${sections.join(", ")}`;
  },
});

// Tool to generate a cover letter
const generateCoverLetterTool = new DynamicStructuredTool({
  name: "generate_cover_letter",
  description:
    "Generate a cover letter based on user information and job description",
  schema: z.object({
    jobTitle: z.string(),
    company: z.string(),
    style: z.enum(["Formal", "Conversational", "Enthusiastic", "Professional"]),
    keyPoints: z.array(z.string()).optional(),
  }),
  func: async ({ jobTitle, company, style, keyPoints }) => {
    console.log(
      `Generating ${style} cover letter for ${jobTitle} at ${company}`,
    );
    // TODO: Implement cover letter generation (stub for now)
    return `Cover letter generation initiated for ${jobTitle} at ${company} in ${style} style`;
  },
});

// Tool to retrieve user profile data
const getUserProfileTool = new DynamicStructuredTool({
  name: "get_user_profile",
  description: "Retrieve details from the user's stored profile",
  schema: z.object({
    dataType: z.enum([
      "work_history",
      "education",
      "skills",
      "achievements",
      "preferences",
      "all",
    ]),
  }),
  func: async ({ dataType }) => {
    console.log(`Retrieving user profile data: ${dataType}`);
    // TODO: Implement retrieval from database (stub for now)
    return `Retrieved user profile data for ${dataType}`;
  },
});

// Initialize the model
export function createLLM(temperature = 0.2) {
  try {
    const { GOOGLE_API_KEY } = env;

    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not defined in environment variables");
    }

    const model = new ChatGoogleGenerativeAI({
      apiKey: GOOGLE_API_KEY,
      model: "gemini-2.5-flash-preview-05-20",
      temperature,
    });

    // Test the model to make sure it's working
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

// Create specialized agents
function createSupervisorAgent() {
  const llm = createLLM(0.1);

  const systemMessage = `You are the Supervisor Agent for Resume Master, an AI system that helps users create professional resumes and cover letters.

Your job is to analyze incoming messages and direct them to the appropriate specialized agent:

1. data_manager: For storing any user data (work history, achievements, skills, etc.)
2. resume_generator: For creating or editing resumes
3. cover_letter_generator: For creating cover letters
4. user_profile: For retrieving user profile information

If a request doesn't clearly belong to a specific agent, process it yourself. 
If a task is complete, respond with END.

Respond ONLY with the name of the next agent to act or "END".`;

  // Create a simple wrapper that returns the next agent based on message content
  return async (state: AgentStateType) => {
    const messages = [new SystemMessage(systemMessage), ...state.messages];

    try {
      const response = await llm.invoke(messages);
      const content =
        typeof response.content === "string"
          ? response.content.trim().toLowerCase()
          : JSON.stringify(response.content).trim().toLowerCase();

      // Parse the response to determine the next agent
      let nextAgent: string;

      if (content.includes("data_manager")) {
        nextAgent = "data_manager";
      } else if (content.includes("resume_generator")) {
        nextAgent = "resume_generator";
      } else if (content.includes("cover_letter_generator")) {
        nextAgent = "cover_letter_generator";
      } else if (content.includes("user_profile")) {
        nextAgent = "user_profile";
      } else if (content.includes("end")) {
        nextAgent = END;
      } else {
        // Default to END if the response doesn't match any agent
        nextAgent = END;
      }

      return { next: nextAgent };
    } catch (error) {
      console.error("Error in supervisor agent:", error);
      return { next: END };
    }
  };
}

function createDataManagerAgent() {
  const llm = createLLM(0.2);

  const systemMessage = `You are the Data Manager Agent for Resume Master.
  
Your job is to:
1. Identify information in messages that should be stored
2. Store work history, skills, achievements, and user preferences
3. Organize and maintain the user's data

Use the appropriate tools to store different types of information.
Always confirm what data you've stored with the user.`;

  // Create the agent using our existing createAgent function with tools
  const agent = createAgent();

  return async (state: AgentStateType) => {
    const messages = [new SystemMessage(systemMessage), ...state.messages];

    try {
      const response = await safeAgentInvoke(agent, messages);
      const responseText =
        typeof response === "string" ? response : JSON.stringify(response);

      return {
        messages: [new AIMessage(responseText)],
        next: "supervisor",
      };
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
  };
}

function createResumeGeneratorAgent() {
  const llm = createLLM(0.2);

  const systemMessage = `You are the Resume Generator Agent for Resume Master.
  
Your job is to:
1. Create new resumes based on user data
2. Edit existing resumes
3. Format resumes according to user preferences
4. Provide resume writing advice`;

  // Create the agent with resume generation tools
  const agent = createAgent();

  return async (state: AgentStateType) => {
    const messages = [new SystemMessage(systemMessage), ...state.messages];

    try {
      const response = await safeAgentInvoke(agent, messages);
      const responseText =
        typeof response === "string" ? response : JSON.stringify(response);

      return {
        messages: [new AIMessage(responseText)],
        next: "supervisor",
      };
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
  };
}

function createCoverLetterGeneratorAgent() {
  const llm = createLLM(0.2);

  const systemMessage = `You are the Cover Letter Generator Agent for Resume Master.
  
Your job is to:
1. Create tailored cover letters based on job descriptions and user data
2. Edit existing cover letters
3. Format cover letters according to user preferences
4. Provide cover letter writing advice`;

  // Create the agent with cover letter generation tools
  const agent = createAgent();

  return async (state: AgentStateType) => {
    const messages = [new SystemMessage(systemMessage), ...state.messages];

    try {
      const response = await safeAgentInvoke(agent, messages);
      const responseText =
        typeof response === "string" ? response : JSON.stringify(response);

      return {
        messages: [new AIMessage(responseText)],
        next: "supervisor",
      };
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
  };
}

function createUserProfileAgent() {
  const llm = createLLM(0.2);

  const systemMessage = `You are the User Profile Agent for Resume Master.
  
Your job is to:
1. Retrieve user profile information
2. Help users understand what data is stored in their profile
3. Explain how stored data is used in resume and cover letter generation`;

  // Create the agent with profile retrieval tools
  const agent = createAgent();

  return async (state: AgentStateType) => {
    const messages = [new SystemMessage(systemMessage), ...state.messages];

    try {
      const response = await safeAgentInvoke(agent, messages);
      const responseText =
        typeof response === "string" ? response : JSON.stringify(response);

      return {
        messages: [new AIMessage(responseText)],
        next: "supervisor",
      };
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
  };
}

// Create the agent team
export function createAgentTeam() {
  // Initialize the graph
  const workflow = new StateGraph({}, AgentState)
    .addNode("supervisor", createSupervisorAgent())
    .addNode("data_manager", createDataManagerAgent())
    .addNode("resume_generator", createResumeGeneratorAgent())
    .addNode("cover_letter_generator", createCoverLetterGeneratorAgent())
    .addNode("user_profile", createUserProfileAgent());

  // Add edges - define how control flows between agents
  workflow.addEdge("supervisor", "data_manager");
  workflow.addEdge("supervisor", "resume_generator");
  workflow.addEdge("supervisor", "cover_letter_generator");
  workflow.addEdge("supervisor", "user_profile");

  // Allow agents to return control to the supervisor
  workflow.addEdge("data_manager", "supervisor");
  workflow.addEdge("resume_generator", "supervisor");
  workflow.addEdge("cover_letter_generator", "supervisor");
  workflow.addEdge("user_profile", "supervisor");

  // Add conditional edges based on the agent's next field
  workflow.addConditionalEdges(
    "supervisor",
    (state) => {
      // Safe access to state.next with type assertion
      const stateObj = state as { next?: string };
      return stateObj.next ?? END;
    },
    {
      data_manager: "data_manager",
      resume_generator: "resume_generator",
      cover_letter_generator: "cover_letter_generator",
      user_profile: "user_profile",
      [END]: END,
    },
  );

  // Compile the graph
  const agentTeam = workflow.compile();

  return agentTeam;
}

// Helper to convert message format between our tRPC API and LangChain
export function convertToAgentStateInput(
  messages: { role: string; content: string }[],
): AgentStateType {
  const formattedMessages: BaseMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      formattedMessages.push(new HumanMessage(msg.content));
    } else if (msg.role === "assistant") {
      formattedMessages.push(new AIMessage(msg.content));
    } else if (msg.role === "system") {
      formattedMessages.push(new SystemMessage(msg.content));
    }
  }

  return {
    messages: formattedMessages,
    next: "supervisor", // Always start with the supervisor
  };
}
