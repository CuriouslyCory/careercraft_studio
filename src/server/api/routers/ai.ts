import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { observable } from "@trpc/server/observable";
import {
  createAgent,
  convertToLangChainMessages,
  type ParsedResumeData,
  ResumeDataSchema,
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
    .input(
      z.object({
        resumeText: z.string().min(1, "Resume text cannot be empty"),
      }),
    )
    .mutation(async ({ input }): Promise<ParsedResumeData> => {
      try {
        console.log("tRPC resumeParsing: Invoking agent to parse resume.");
        const agent = createAgent();

        const agentResponse = await agent.invoke({
          messages: convertToLangChainMessages([
            {
              role: "user",
              content: `Please parse the following resume text and return the structured data. Resume text: """${input.resumeText}"""`,
            },
          ]),
        });

        console.log(
          "tRPC resumeParsing: Agent response received:",
          agentResponse,
        );

        let parsedData: unknown;
        if (typeof agentResponse === "object" && agentResponse !== null) {
          if ("output" in agentResponse) {
            parsedData = agentResponse.output;
          } else {
            parsedData = agentResponse;
          }
        }

        // Validate the extracted data against the schema using the static import
        const validationResult = ResumeDataSchema.safeParse(parsedData);

        if (validationResult.success) {
          console.log(
            "tRPC resumeParsing: Successfully parsed and validated resume data.",
          );
          return validationResult.data;
        } else {
          console.error(
            "tRPC resumeParsing: Failed to validate parsed data:",
            validationResult.error.format(),
          );
          throw new Error(
            "Failed to parse resume into the expected format. Validation errors: " +
              JSON.stringify(validationResult.error.format()),
          );
        }
      } catch (error) {
        console.error(
          "tRPC resumeParsing: Error during resume parsing:",
          error,
        );
        if (error instanceof Error) {
          throw new Error(`Resume parsing failed: ${error.message}`);
        }
        throw new Error("Resume parsing failed due to an unknown error.");
      }
    }),

  jobAnalysis: publicProcedure
    .input(z.object({ jobDescription: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const agent = createAgent();
        const agentResponse = await agent.invoke({
          messages: convertToLangChainMessages([
            {
              role: "user",
              content: `Analyze the following job description: """${input.jobDescription}"""`,
            },
          ]),
        });
        // Placeholder: Actual parsing and validation would be needed here
        // For now, just stringify the response or a part of it.
        let output = "Error or no parsable output from jobAnalysis";
        if (agentResponse && typeof agentResponse === "object") {
          if (
            "output" in agentResponse &&
            typeof agentResponse.output === "string"
          ) {
            output = agentResponse.output;
          } else {
            output = JSON.stringify(agentResponse);
          }
        }
        return { result: output };
      } catch (error) {
        console.error("Job analysis error:", error);
        if (error instanceof Error) {
          throw new Error(`Job analysis failed: ${error.message}`);
        }
        throw new Error("Job analysis failed due to an unknown error.");
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
