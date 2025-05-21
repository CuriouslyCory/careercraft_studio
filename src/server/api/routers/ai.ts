import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { observable } from "@trpc/server/observable";
import {
  createAgent,
  convertToLangChainMessages,
} from "~/server/langchain/agent";
import { AIMessage } from "@langchain/core/messages";

// Schema for messages
const MessageSchema = z
  .object({
    role: z.enum(["user", "assistant", "system", "tool"]),
    content: z.string(),
  })
  .passthrough(); // Allow other fields like 'id' from useChat messages

const ChatInputSchema = z.object({
  messages: z.array(MessageSchema),
});
export type AIChatInput = z.infer<typeof ChatInputSchema>;

// Type for chunks with content
interface ContentChunk {
  content: string;
}

export const aiRouter = createTRPCRouter({
  chat: publicProcedure.input(ChatInputSchema).subscription(({ input }) => {
    return observable<string>((emit) => {
      const processStream = async () => {
        try {
          console.log("Received chat input:", input);

          // Input validation
          if (
            !input.messages ||
            !Array.isArray(input.messages) ||
            input.messages.length === 0
          ) {
            throw new Error(
              "Invalid messages array. Messages must be a non-empty array.",
            );
          }

          // Create the agent
          const agent = createAgent();
          if (!agent) {
            throw new Error("Failed to create AI agent");
          }

          // Convert messages to LangChain format
          const messages = convertToLangChainMessages(input.messages);
          if (!messages || messages.length === 0) {
            throw new Error("Failed to convert messages to LangChain format");
          }

          console.log(
            "Starting agent stream with messages:",
            messages.map(
              (m) =>
                `${m._getType()}: ${typeof m.content === "string" ? m.content.substring(0, 50) + "..." : "[complex content]"}`,
            ),
          );

          // Invoke the agent with streaming
          const result = await agent.stream({
            messages,
          });

          if (!result) {
            throw new Error("Agent returned empty result stream");
          }

          // Process the stream
          for await (const chunk of result) {
            if (chunk && typeof chunk === "object") {
              // Handle AIMessage instances
              if (
                chunk instanceof AIMessage &&
                typeof chunk.content === "string"
              ) {
                console.log("AIMessage chunk:", chunk.content);
                emit.next(chunk.content);
              }
              // Handle objects with content property using type guard
              else if (isContentChunk(chunk)) {
                console.log("Content chunk:", chunk.content);
                emit.next(chunk.content);
              }
              // Handle unexpected chunk formats
              else {
                console.log("Unknown chunk format:", chunk);
                // Try to extract usable content
                const content = extractContentFromUnknownChunk(chunk);
                if (content) {
                  emit.next(content);
                }
              }
            } else if (chunk && typeof chunk === "string") {
              // Handle string chunks directly
              console.log("String chunk:", chunk);
              emit.next(chunk);
            }
          }

          console.log("Stream completed.");
          emit.complete();
        } catch (error) {
          console.error("Error processing stream:", error);
          const e = error instanceof Error ? error : new Error(String(error));
          emit.error(e);
        }
      };

      processStream().catch((error) => {
        console.error("processStream catch:", error);
        const e = error instanceof Error ? error : new Error(String(error));
        emit.error(e);
      });

      // No cleanup needed but return an empty function to satisfy the observable API
      return () => {
        /* empty cleanup function */
      };
    });
  }),

  resumeParsing: publicProcedure
    .input(z.object({ resumeText: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // Create the agent
        const agent = createAgent();

        // Invoke the agent with a structured prompt
        const result = await agent.invoke({
          messages: convertToLangChainMessages([
            {
              role: "user",
              content: `Parse the following resume and extract key information such as name, contact details, skills, experience, and education. Format the output as JSON: ${input.resumeText}`,
            },
          ]),
        });

        // Safely extract content
        let content = "No result";
        if (result && isContentChunk(result)) {
          content = result.content;
        } else if (result && typeof result === "object") {
          content = JSON.stringify(result);
        }

        // Return the result
        return { result: content };
      } catch (error) {
        console.error("Resume parsing error:", error);
        throw error;
      }
    }),

  jobAnalysis: publicProcedure
    .input(z.object({ jobDescription: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // Create the agent
        const agent = createAgent();

        // Invoke the agent with a structured prompt
        const result = await agent.invoke({
          messages: convertToLangChainMessages([
            {
              role: "user",
              content: `Analyze the following job description and extract key requirements, responsibilities, and desired skills. Format the output as JSON: ${input.jobDescription}`,
            },
          ]),
        });

        // Safely extract content
        let content = "No result";
        if (result && isContentChunk(result)) {
          content = result.content;
        } else if (result && typeof result === "object") {
          content = JSON.stringify(result);
        }

        // Return the result
        return { result: content };
      } catch (error) {
        console.error("Job analysis error:", error);
        throw error;
      }
    }),
});

// Type guard to check if an object has a content property of type string
function isContentChunk(obj: unknown): obj is ContentChunk {
  return Boolean(
    obj &&
      typeof obj === "object" &&
      "content" in obj &&
      typeof (obj as ContentChunk).content === "string",
  );
}

// Helper function to extract content from unknown chunk formats
function extractContentFromUnknownChunk(chunk: unknown): string | null {
  try {
    if (!chunk) return null;

    // If it's a string, return it directly
    if (typeof chunk === "string") return chunk;

    // If it has a content property that's a string, use our type guard
    if (isContentChunk(chunk)) {
      return chunk.content;
    }

    // If it's an object, try to check for a text property
    if (typeof chunk === "object" && chunk !== null) {
      const objWithText = chunk as { text?: string };
      if (objWithText.text && typeof objWithText.text === "string") {
        return objWithText.text;
      }

      // Try to convert entire object to string
      return JSON.stringify(chunk);
    }

    return null;
  } catch (error) {
    console.error("Error extracting content from chunk:", error);
    return null;
  }
}

export type AIRouter = typeof aiRouter;
