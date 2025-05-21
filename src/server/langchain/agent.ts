import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { env } from "~/env";
import { type StructuredTool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt"; // Corrected import path

// Define the output schema for parsed resume data
export const ResumeDataSchema = z.object({
  summary: z
    .string()
    .optional()
    .describe(
      "A brief professional summary from the resume, if present (2-4 sentences).",
    ),
  skills: z
    .array(z.string())
    .describe(
      "List of key skills, technologies, and proficiencies extracted from the resume. Be comprehensive.",
    ),
  experience: z
    .array(
      z.object({
        jobTitle: z.string().optional().describe("The job title."),
        company: z.string().optional().describe("The company name."),
        location: z.string().optional().describe("The location of the job."),
        dates: z
          .string()
          .optional()
          .describe(
            "Employment dates (e.g., 'Jan 2020 - Present' or '2018-2020').",
          ),
        responsibilities: z
          .array(z.string())
          .optional()
          .describe(
            "Key responsibilities or achievements in this role as bullet points or short descriptions.",
          ),
      }),
    )
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
  otherSections: z
    .record(z.string(), z.any())
    .optional()
    .describe(
      "Any other relevant sections found in the resume (e.g., Awards, Certifications, Projects) as key-value pairs, where the key is the section title and the value could be a string or array of strings.",
    ),
});

export type ParsedResumeData = z.infer<typeof ResumeDataSchema>;

// Define tools for the agent
const parseResumeTool = tool(
  async ({ resumeText }: { resumeText: string }) => {
    try {
      console.log("Parsing resume text with LLM, length:", resumeText.length);
      const llm = createLLM(); // Get an instance of the LLM
      const llmWithParsing = llm.withStructuredOutput(ResumeDataSchema, {
        name: "parseResume", // Optional: Helps in debugging and can be used by the LLM
      });

      const prompt = `Please parse the following resume text and extract the information according to the provided schema.
Focus on accurately identifying and categorizing skills, work experience (including job titles, companies, dates, and responsibilities), and education (including institution, degree, field of study, and graduation dates).
Also extract contact information if available (email, phone, LinkedIn, GitHub, portfolio).
Capture any other distinct sections like 'Projects', 'Awards', or 'Certifications' under 'otherSections'.
If a section is not present or information is missing, omit it or use an empty array/object as appropriate for the schema.

Resume Text:
---
${resumeText}
---`;

      const result = await llmWithParsing.invoke(prompt);
      console.log("Resume parsing successful:", result);
      return result;
    } catch (error) {
      console.error("Error parsing resume with LLM:", error);
      // Return a more specific error or the schema's default/empty state
      return {
        summary: "Error parsing resume.",
        skills: [],
        experience: [],
        education: [],
        // contactInfo: {}, // Optional, so can be omitted
        // otherSections: {}, // Optional
      };
    }
  },
  {
    name: "parseResume",
    description: "Parse resume text into structured information",
    schema: z.object({
      resumeText: z.string().describe("The full text of the resume to parse"),
    }),
  },
);

const analyzeJobTool = tool(
  async ({ jobDescription }: { jobDescription: string }) => {
    // In a real implementation, you might use more sophisticated analysis
    try {
      console.log("Analyzing job description, length:", jobDescription.length);
      return `Analyzed job requirements: Required skills, qualifications, responsibilities and preferred experiences extracted from the provided job description.`;
    } catch (error) {
      console.error("Error analyzing job:", error);
      return "Error analyzing job description. Please try again with a valid job description.";
    }
  },
  {
    name: "analyzeJob",
    description: "Analyze a job description for requirements and skills",
    schema: z.object({
      jobDescription: z
        .string()
        .describe("The full text of the job description to analyze"),
    }),
  },
);

const matchResumeToJobTool = tool(
  async ({ resumeData, jobData }: { resumeData: string; jobData: string }) => {
    // In a real implementation, you would compare resume against job requirements
    try {
      console.log("Matching resume to job");
      return `Matched resume against job requirements. Identified matching skills and qualifications, and highlighted missing requirements that could be addressed in a cover letter.`;
    } catch (error) {
      console.error("Error matching resume to job:", error);
      return "Error matching resume to job. Please ensure both resume and job data are provided.";
    }
  },
  {
    name: "matchResumeToJob",
    description: "Match resume data against job description data",
    schema: z.object({
      resumeData: z.string().describe("Structured resume data"),
      jobData: z.string().describe("Structured job description data"),
    }),
  },
);

const generateCoverLetterTool = tool(
  async ({
    resumeData,
    jobData,
    userPreferences,
  }: {
    resumeData: string;
    jobData: string;
    userPreferences: string;
  }) => {
    try {
      console.log("Generating cover letter");
      return `Generated a personalized cover letter that highlights relevant skills and experience from the resume that match the job requirements, while incorporating the user's preferences for tone and focus.`;
    } catch (error) {
      console.error("Error generating cover letter:", error);
      return "Error generating cover letter. Please ensure all required data is provided.";
    }
  },
  {
    name: "generateCoverLetter",
    description:
      "Generate a cover letter based on resume, job data, and user preferences",
    schema: z.object({
      resumeData: z.string().describe("Structured resume data"),
      jobData: z.string().describe("Structured job description data"),
      userPreferences: z
        .string()
        .describe("User preferences for the cover letter"),
    }),
  },
);

// Define the tools we'll use
const tools: StructuredTool[] = [
  parseResumeTool,
  analyzeJobTool,
  matchResumeToJobTool,
  generateCoverLetterTool,
];

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
      model: "gemini-1.5-flash", // Use a more stable model
      maxOutputTokens: 2048,
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
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
