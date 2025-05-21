import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { z } from "zod";
import { env } from "~/env";
import { type StructuredTool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt"; // Corrected import path

// Define the output schema for parsed resume data
export const ResumeDataSchema = z.object({
  summary: z
    .string()
    .optional()
    .describe(
      "A brief professional summary from the resume, if present (2-4 sentences). If no summary is present, generate one based on the resume.",
    ),
  skills: z
    .array(z.string().describe("A key skill, technology, or proficiency."))
    .optional()
    .describe(
      "Flat array of key skills, technologies, and proficiencies extracted from the resume or other document. Be comprehensive.",
    ),
  work_experience: z
    .array(
      z.object({
        jobTitle: z.string().optional().describe("The job title."),
        company: z.string().optional().describe("The company name."),
        location: z.string().optional().describe("The location of the job."),
        startDate: z
          .string()
          .optional()
          .describe(
            "Employment start date (e.g., 'Jan 2020', '2020', '1/2020', etc).",
          ),
        endDate: z
          .string()
          .optional()
          .describe(
            "Employment dates (e.g., 'Present', 'March 2020', '1/2020', etc).",
          ),
        achievements: z
          .array(z.string())
          .optional()
          .describe(
            "Key responsibilities or achievements in this role as bullet points or short descriptions.",
          ),
        skills: z
          .array(z.string())
          .optional()
          .describe(
            "Key skills or technologies used in this role as bullet points or short descriptions.",
          ),
      }),
    )
    .optional()
    .describe(
      "List of professional experiences. Include all distinct roles found.",
    ),
  education: z
    .array(
      z.object({
        institution: z
          .string()
          .optional()
          .describe("Name of the educational institution."),
        degree: z
          .string()
          .optional()
          .describe("Degree or certification obtained."),
        fieldOfStudy: z
          .string()
          .optional()
          .describe("Field of study or major."),
        graduationDate: z
          .string()
          .optional()
          .describe("Graduation date or expected graduation date."),
      }),
    )
    .describe("List of educational qualifications."),
  contactInfo: z
    .object({
      email: z.string().optional().describe("Email address."),
      phone: z.string().optional().describe("Phone number."),
      linkedin: z.string().optional().describe("LinkedIn profile URL."),
      github: z.string().optional().describe("GitHub profile URL."),
      portfolio: z
        .string()
        .optional()
        .describe("Portfolio or personal website URL."),
    })
    .optional()
    .describe("Contact information extracted from the resume."),
  key_achievements: z
    .array(z.string())
    .optional()
    .describe(
      "Key achievements, awards, and accomplishments from the resume as bullet points or short descriptions.",
    ),
  // otherSections: z
  //   .record(z.string(), z.any())
  //   .optional()
  //   .describe(
  //     "Any other relevant sections found in the resume (e.g., Awards, Certifications, Projects) as key-value pairs, where the key is the section title and the value could be a string or array of strings.",
  //   ),
});

export type ParsedResumeData = z.infer<typeof ResumeDataSchema>;

// Define the tools we'll use
const tools: StructuredTool[] = [];

// Create a system message with instructions for the agent
const systemMessage = `You are Resume Master, an AI assistant that helps users create professional resumes and cover letters.

Your capabilities include:
1. Analyzing resumes to extract skills, experience, and qualifications
2. Analyzing job descriptions to identify requirements and preferences
3. Matching resumes to job descriptions to highlight strengths and gaps
4. Generating tailored cover letters

When users paste a resume or job description, offer to analyze it for them.
When both resume and job data are available, offer to perform matching analysis.
Be helpful, professional, and concise in your responses.`;

// Initialize the model
export function createLLM() {
  try {
    // Get the API key from the environment variables
    const { GOOGLE_API_KEY } = env;

    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not defined in environment variables");
    }

    return new ChatGoogleGenerativeAI({
      apiKey: GOOGLE_API_KEY,
      model: "gemini-2.5-flash-preview-05-20",
      temperature: 0.1,
    });
  } catch (error) {
    console.error("Error initializing language model:", error);
    throw new Error(
      "Failed to initialize language model: " +
        (error instanceof Error ? error.message : String(error)),
    );
  }
}

// Create a direct chat agent that doesn't use the React agent framework
export function createDirectChatAgent() {
  const llm = createLLM();

  // Create a simplified agent that just passes messages to the model directly
  return {
    stream: async ({ messages }: { messages: BaseMessage[] }) => {
      // Log action
      console.log("Using direct chat agent instead of React agent");

      // Call the LLM directly with messages
      try {
        const stream = await llm.stream(messages);
        return stream;
      } catch (error) {
        console.error("Error in direct chat agent:", error);
        throw new Error(
          "Failed to generate response: " +
            (error instanceof Error ? error.message : String(error)),
        );
      }
    },

    invoke: async ({ messages }: { messages: BaseMessage[] }) => {
      console.log("Using direct chat agent for invoke");
      try {
        return await llm.invoke(messages);
      } catch (error) {
        console.error("Error in direct chat agent invoke:", error);
        throw new Error(
          "Failed to generate response: " +
            (error instanceof Error ? error.message : String(error)),
        );
      }
    },
  };
}

// Create the agent with the tools
export function createAgent() {
  try {
    // return createDirectChatAgent(); // Commenting this out to try the tool-using agent

    const llm = createLLM();

    if (!tools || tools.length === 0) {
      console.warn("Tools array is empty. Agent will not have any tools.");
    }
    console.log(
      "Creating agent with tools:",
      tools.map((t) => t.name),
    );

    // createReactAgent is a prebuilt graph. It expects an LLM that supports tool calling (like OpenAI functions or Gemini tool calling)
    // and a list of tools.
    const agent = createReactAgent({
      llm,
      tools,
      // System message can be part of the input to the agent when invoking it, or sometimes as a configuration.
      // For createReactAgent, it's typically passed during invocation with the HumanMessage.
    });

    return agent;
  } catch (error) {
    console.error("Error creating agent:", error);
    // Ensure a more specific error is thrown or re-throw with better typing
    if (error instanceof Error) {
      throw new Error(`Failed to initialize AI agent: ${error.message}`);
    }
    throw new Error("Failed to initialize AI agent: An unknown error occurred");
  }
}

// Helper to convert message format between our tRPC API and LangChain
export function convertToLangChainMessages(
  messages: { role: string; content: string }[],
): BaseMessage[] {
  // Process system message first if it exists
  const formattedMessages: BaseMessage[] = [];

  try {
    // Add default system message if none is provided
    let hasSystemMessage = false;
    for (const msg of messages) {
      if (!msg || typeof msg !== "object") {
        console.warn("Skipping invalid message object:", msg);
        continue;
      }

      if (msg.role === "system") {
        formattedMessages.push(new SystemMessage(msg.content || systemMessage));
        hasSystemMessage = true;
      }
    }

    // Add default system message if none was found
    if (!hasSystemMessage) {
      formattedMessages.push(new SystemMessage(systemMessage));
    }

    // Process the rest of the messages
    for (const msg of messages) {
      if (!msg || typeof msg !== "object") {
        continue; // Skip invalid messages
      }

      // Skip system messages as we've already handled them
      if (msg.role === "system") continue;

      if (msg.role === "user") {
        formattedMessages.push(new HumanMessage(msg.content));
      } else if (msg.role === "assistant") {
        formattedMessages.push(new AIMessage(msg.content));
      } else if (msg.role !== "tool") {
        // Skip tool messages
        // Fallback for any other types
        console.warn(
          `Unknown message role: ${msg.role}, treating as user message`,
        );
        formattedMessages.push(new HumanMessage(msg.content));
      }
    }

    return formattedMessages;
  } catch (error) {
    console.error("Error converting messages:", error);
    // Return at least a system message to prevent failures
    return [new SystemMessage(systemMessage)];
  }
}
