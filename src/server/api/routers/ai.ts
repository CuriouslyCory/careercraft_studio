import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { observable } from "@trpc/server/observable";
import {
  createAgent,
  convertToLangChainMessages,
  type ParsedResumeData,
  ResumeDataSchema,
} from "~/server/langchain/agent";
import {
  createAgentTeam,
  convertToAgentStateInput,
} from "~/server/langchain/agentTeam";
import { type BaseMessage } from "@langchain/core/messages";
import { MessageRole } from "@prisma/client";
import { type PrismaClient } from "@prisma/client";

// Schema for messages
const MessageSchema = z
  .object({
    role: z.enum(["user", "assistant", "system", "tool"]),
    content: z.string(),
  })
  .passthrough(); // Allow other fields like 'id' from useChat messages

const ChatInputSchema = z.object({
  messages: z.array(MessageSchema),
  conversationId: z.string().optional(),
});

// Add metadata schema for tracking processed documents
const ProcessingMetadataSchema = z.object({
  jobPostingsCreated: z.number().default(0),
  resumesProcessed: z.number().default(0),
  documentsProcessed: z.array(z.string()).default([]),
});

export type AIChatInput = z.infer<typeof ChatInputSchema>;
export type ProcessingMetadata = z.infer<typeof ProcessingMetadataSchema>;

// Type for chunks with content
type ContentChunk = {
  content: string;
};

// Type for agent messages
type AgentMessage = {
  content: string;
  name?: string;
  additional_kwargs?: Record<string, unknown>;
  response_metadata?: Record<string, unknown>;
};

// Type for agent output in stream chunks
type AgentOutput = {
  messages?: AgentMessage[];
  next?: string;
};

// Type for stream chunks from LangGraph
type StreamChunk = {
  __end__?: boolean;
  [agentType: string]: AgentOutput | boolean | undefined;
};

// Define the agent state type
type AgentState = {
  messages: BaseMessage[];
  next: string;
};

// Helper function to save a chat message to the database
async function saveChatMessage(
  db: PrismaClient,
  role: MessageRole,
  content: string,
  conversationId: string | undefined,
  userId: string,
) {
  try {
    await db.chatMessage.create({
      data: {
        role,
        content,
        conversationId,
        userId,
      },
    });
  } catch (error) {
    console.error("Failed to save chat message to database:", error);
  }
}

/**
 * TRPC router for AI-related procedures.
 */
export const aiRouter = createTRPCRouter({
  /**
   * Streams AI chat responses.
   * Stores user and assistant messages in the database.
   */
  chat: protectedProcedure
    .input(ChatInputSchema)
    .subscription(({ input, ctx }) => {
      return observable<
        string | { type: "metadata"; data: ProcessingMetadata }
      >((emit) => {
        const abortController = new AbortController();
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

            // Store the user message in the database
            const lastMessage = input.messages[input.messages.length - 1];
            if (lastMessage?.role === "user") {
              await saveChatMessage(
                ctx.db,
                MessageRole.USER,
                lastMessage.content,
                input.conversationId,
                ctx.session.user.id,
              );
            }

            // Send an initial message to the client
            emit.next("Thinking...");

            try {
              // Create the agent team
              console.log("Creating agent team for streaming...");
              const agentTeam = createAgentTeam();
              if (!agentTeam) {
                throw new Error("Failed to create AI agent team");
              }

              // Convert messages to LangChain format for the agent team
              const agentState = convertToAgentStateInput(
                input.messages,
                ctx.session.user.id,
              );

              console.log(
                "Starting agent team stream with messages:",
                agentState.messages.map(
                  (m: BaseMessage) =>
                    `${m._getType()}: ${typeof m.content === "string" ? m.content.substring(0, 50) + "..." : "[complex content]"}`,
                ),
              );

              // Use streaming with the agent team
              const stream = agentTeam.stream(agentState, {
                signal: abortController.signal,
              });

              let finalResponse = "";
              let hasEmittedContent = false;
              const processingMetadata: ProcessingMetadata = {
                jobPostingsCreated: 0,
                resumesProcessed: 0,
                documentsProcessed: [],
              };

              // Get initial counts to track what was created during processing
              const initialJobPostingCount = await ctx.db.jobPosting.count({
                where: { userId: ctx.session.user.id },
              });
              const initialDocumentCount = await ctx.db.document.count({
                where: { userId: ctx.session.user.id },
              });

              // Process the stream chunks
              for await (const chunk of await stream) {
                // Skip end state
                if ((chunk as StreamChunk)?.__end__) continue;

                // Process each agent's output
                for (const agentType of Object.keys(
                  (chunk as StreamChunk) ?? {},
                )) {
                  const agentOutput = (chunk as StreamChunk)[
                    agentType
                  ] as AgentOutput;
                  if (
                    agentOutput?.messages &&
                    agentOutput.messages.length > 0
                  ) {
                    const agentMessage = agentOutput.messages[0];

                    if (
                      agentMessage &&
                      typeof agentMessage.content === "string"
                    ) {
                      const content = agentMessage.content;
                      console.log(`${agentType} output:`, content);
                      emit.next(content);
                      finalResponse = content; // Keep track of final response
                      hasEmittedContent = true;
                    }
                  }
                }
              }

              // If no content was emitted, send a fallback response
              if (!hasEmittedContent) {
                const fallbackResponse =
                  "I'm sorry, I wasn't able to generate a good response. Could you try rephrasing your question?";
                emit.next(fallbackResponse);
                finalResponse = fallbackResponse;
              }

              // Store the final assistant response in the database
              if (finalResponse) {
                await saveChatMessage(
                  ctx.db,
                  MessageRole.ASSISTANT,
                  finalResponse,
                  input.conversationId,
                  ctx.session.user.id,
                );
              }

              // Calculate what was actually processed by comparing counts
              const finalJobPostingCount = await ctx.db.jobPosting.count({
                where: { userId: ctx.session.user.id },
              });
              const finalDocumentCount = await ctx.db.document.count({
                where: { userId: ctx.session.user.id },
              });

              // Update metadata with actual processing results
              processingMetadata.jobPostingsCreated =
                finalJobPostingCount - initialJobPostingCount;
              processingMetadata.resumesProcessed =
                finalDocumentCount - initialDocumentCount;

              // Get list of documents created during this session for more detailed tracking
              if (processingMetadata.resumesProcessed > 0) {
                const recentDocuments = await ctx.db.document.findMany({
                  where: {
                    userId: ctx.session.user.id,
                    createdAt: {
                      gte: new Date(Date.now() - 60000), // Created in last minute
                    },
                  },
                  select: { id: true, type: true },
                  orderBy: { createdAt: "desc" },
                  take: processingMetadata.resumesProcessed,
                });
                processingMetadata.documentsProcessed = recentDocuments.map(
                  (doc) => `${doc.type}:${doc.id}`,
                );
              }

              // Emit metadata about what was processed
              emit.next({ type: "metadata", data: processingMetadata });

              console.log("Stream completed successfully.");
              emit.complete();
            } catch (error) {
              // Handle errors from the stream
              console.error("Error from LLM stream:", error);
              const errorMessage =
                "I'm sorry, I encountered an error while processing your request. Could you try again?";
              emit.next(errorMessage);

              // Store the error response
              await saveChatMessage(
                ctx.db,
                MessageRole.ASSISTANT,
                errorMessage,
                input.conversationId,
                ctx.session.user.id,
              );

              // Complete the stream instead of throwing an error
              emit.complete();
            }
          } catch (error) {
            console.error("Error in processStream:", error);
            const errorMessage =
              "I'm sorry, I encountered an error while processing your request. Could you try again?";
            emit.next(errorMessage);

            try {
              // Try to store the error response
              await saveChatMessage(
                ctx.db,
                MessageRole.ASSISTANT,
                errorMessage,
                input.conversationId ?? "error-session",
                ctx.session.user.id,
              );
            } catch (dbError) {
              console.error("Failed to store error message:", dbError);
            }

            emit.complete();
          }
        };

        processStream().catch((error) => {
          console.error("Unhandled error in processStream:", error);
          const errorMessage =
            "I'm sorry, something went wrong. Please try again later.";
          emit.next(errorMessage);
          emit.complete();
        });

        // Return cleanup function to abort any pending request when client disconnects
        return () => {
          console.log("Client disconnected, aborting stream");
          abortController.abort();
        };
      });
    }),

  /**
   * Create a new conversation.
   * @returns The ID of the newly created conversation.
   */
  createConversation: protectedProcedure.mutation(async ({ ctx }) => {
    const conversationId = crypto.randomUUID();
    await saveChatMessage(
      ctx.db,
      MessageRole.ASSISTANT,
      "Welcome to Resume Master! How can I help you today?",
      conversationId,
      ctx.session.user.id,
    );
    return { conversationId };
  }),

  /**
   * Get conversation messages.
   * @param input - Object containing the conversationId.
   * @returns An array of chat messages for the conversation.
   */
  getConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.chatMessage.findMany({
        where: {
          conversationId: input.conversationId,
          userId: ctx.session.user.id,
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  /**
   * Parses resume text using an AI agent.
   * @param input - Object containing the resumeText.
   * @returns Structured data parsed from the resume.
   * @throws If parsing or validation fails.
   */
  resumeParsing: protectedProcedure
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

  /**
   * Analyzes a job description using an AI agent.
   * @param input - Object containing the jobDescription.
   * @returns An object with the analysis result string.
   * @throws If the analysis fails.
   */
  jobAnalysis: protectedProcedure
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

  /**
   * Handles non-streaming chat interactions.
   * Stores user and assistant messages in the database.
   * @param input - Object containing messages and optional conversationId.
   * @returns The final assistant response string.
   * @throws If chat processing fails.
   */
  manualChat: protectedProcedure
    .input(ChatInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        console.log("Received manual chat input:", input);

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

        // Store the user message in the database
        const lastMessage = input.messages[input.messages.length - 1];
        if (lastMessage?.role === "user") {
          await saveChatMessage(
            ctx.db,
            MessageRole.USER,
            lastMessage.content,
            input.conversationId,
            ctx.session.user.id,
          );
        }

        // Create the agent team
        console.log("Creating agent team for manual chat...");
        const agentTeam = createAgentTeam();
        if (!agentTeam) {
          throw new Error("Failed to create AI agent team");
        }

        // Convert messages to LangChain format for the agent team
        const agentState = convertToAgentStateInput(
          input.messages,
          ctx.session.user.id,
        );

        console.log(
          "Starting agent team with messages:",
          agentState.messages.map(
            (m: BaseMessage) =>
              `${m._getType()}: ${typeof m.content === "string" ? m.content.substring(0, 50) + "..." : "[complex content]"}`,
          ),
        );

        // Use the agent team to generate a response
        const result = await agentTeam.invoke(agentState);

        // Process the result to extract the final response
        let finalResponse = "I'm sorry, I wasn't able to generate a response.";

        // Look for assistant messages in the result
        if (
          result.messages &&
          Array.isArray(result.messages) &&
          result.messages.length > 0
        ) {
          // Find the last AIMessage in the result
          for (let i = result.messages.length - 1; i >= 0; i--) {
            const message = result.messages[i];
            if (
              message &&
              typeof message._getType === "function" &&
              message._getType() === "ai"
            ) {
              finalResponse =
                typeof message.content === "string"
                  ? message.content
                  : JSON.stringify(message.content);
              break;
            }
          }
        }

        // Store the final assistant response in the database
        await saveChatMessage(
          ctx.db,
          MessageRole.ASSISTANT,
          finalResponse,
          input.conversationId,
          ctx.session.user.id,
        );

        return finalResponse;
      } catch (error) {
        console.error("Error in manual chat:", error);

        // Create a fallback error response
        const errorMessage =
          "I'm sorry, I encountered an error while processing your request. Please try again.";

        // Try to store the error response
        try {
          await saveChatMessage(
            ctx.db,
            MessageRole.ASSISTANT,
            errorMessage,
            input.conversationId ?? "error-session",
            ctx.session.user.id,
          );
        } catch (dbError) {
          console.error("Failed to store error message:", dbError);
        }

        throw new Error(
          `Chat processing failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }),
});

export type AIRouter = typeof aiRouter;
