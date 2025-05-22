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
  createLLM,
} from "~/server/langchain/agentTeam";
import {
  type BaseMessage,
  SystemMessage,
  HumanMessage,
  AIMessage,
} from "@langchain/core/messages";
import { MessageRole } from "@prisma/client";

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
export type AIChatInput = z.infer<typeof ChatInputSchema>;

// Type for chunks with content
interface ContentChunk {
  content: string;
}

// Type for agent messages
interface AgentMessage {
  content: string;
  name?: string;
  additional_kwargs?: Record<string, unknown>;
  response_metadata?: Record<string, unknown>;
}

// Type for agent output in stream chunks
interface AgentOutput {
  messages?: AgentMessage[];
  next?: string;
}

// Type for stream chunks from LangGraph
interface StreamChunk {
  __end__?: boolean;
  [agentType: string]: AgentOutput | boolean | undefined;
}

// Define the agent state type
interface AgentState {
  messages: BaseMessage[];
  next: string;
}

export const aiRouter = createTRPCRouter({
  chat: protectedProcedure
    .input(ChatInputSchema)
    .subscription(({ input, ctx }) => {
      return observable<string>((emit) => {
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
              await ctx.db.chatMessage.create({
                data: {
                  role: MessageRole.USER,
                  content: lastMessage.content,
                  conversationId: input.conversationId,
                  userId: ctx.session.user.id,
                },
              });
            }

            // Send an initial message to the client
            emit.next("I'm thinking about how to respond to your question...");

            try {
              // Create LLM directly instead of using agent team
              console.log("Creating LLM for streaming response...");
              const llm = createLLM(0.7);

              // Prepare messages with proper formatting
              const messagesToSend: BaseMessage[] = [
                new SystemMessage(
                  "You are Resume Master, an AI assistant that helps with resume writing, cover letters, and job applications. Be helpful, concise, and professional.",
                ),
              ];

              // Add user and assistant messages with proper types
              for (const msg of input.messages) {
                if (msg.role === "user") {
                  messagesToSend.push(new HumanMessage(msg.content));
                } else if (msg.role === "assistant") {
                  messagesToSend.push(new AIMessage(msg.content));
                }
              }

              // Use streaming directly with the LLM
              const stream = await llm.stream(messagesToSend, {
                signal: abortController.signal,
              });

              let finalResponse = "";
              let hasEmittedContent = false;

              // Process the stream chunks
              for await (const chunk of stream) {
                if (chunk && typeof chunk.content === "string") {
                  const content = chunk.content;
                  if (content.trim()) {
                    emit.next(content);
                    finalResponse += content;
                    hasEmittedContent = true;
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
                await ctx.db.chatMessage.create({
                  data: {
                    role: MessageRole.ASSISTANT,
                    content: finalResponse,
                    conversationId: input.conversationId,
                    userId: ctx.session.user.id,
                  },
                });
              }

              console.log("Stream completed successfully.");
              emit.complete();
            } catch (error) {
              // Handle errors from the stream
              console.error("Error from LLM stream:", error);
              const errorMessage =
                "I'm sorry, I encountered an error while processing your request. Could you try again?";
              emit.next(errorMessage);

              // Store the error response
              await ctx.db.chatMessage.create({
                data: {
                  role: MessageRole.ASSISTANT,
                  content: errorMessage,
                  conversationId: input.conversationId,
                  userId: ctx.session.user.id,
                },
              });

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
              await ctx.db.chatMessage.create({
                data: {
                  role: MessageRole.ASSISTANT,
                  content: errorMessage,
                  conversationId: input.conversationId ?? "error-session",
                  userId: ctx.session.user.id,
                },
              });
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

  // Create a new conversation
  createConversation: protectedProcedure.mutation(async ({ ctx }) => {
    const conversationId = crypto.randomUUID();
    await ctx.db.chatMessage.create({
      data: {
        role: MessageRole.SYSTEM,
        content: "Welcome to Resume Master! How can I help you today?",
        conversationId,
        userId: ctx.session.user.id,
      },
    });
    return { conversationId };
  }),

  // Get conversation messages
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

  // Add a regular mutation endpoint for non-streaming chat
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
          await ctx.db.chatMessage.create({
            data: {
              role: MessageRole.USER,
              content: lastMessage.content,
              conversationId: input.conversationId,
              userId: ctx.session.user.id,
            },
          });
        }

        // Create a simple LLM response
        const llm = createLLM(0.7); // Higher temperature for more creative responses

        // Prepare the messages for the LLM with system message first
        const messagesToSend: BaseMessage[] = [
          new SystemMessage(
            "You are Resume Master, an AI assistant that helps with resume writing, cover letters, and job applications. Be helpful, concise, and professional.",
          ),
        ];

        // Add user and assistant messages with proper types
        for (const msg of input.messages) {
          if (msg.role === "user") {
            messagesToSend.push(new HumanMessage(msg.content));
          } else if (msg.role === "assistant") {
            messagesToSend.push(new AIMessage(msg.content));
          }
        }

        // Call the LLM
        const response = await llm.invoke(messagesToSend);

        // Extract the response text
        const responseText =
          typeof response.content === "string"
            ? response.content
            : JSON.stringify(response.content);

        // Store the response in the database
        await ctx.db.chatMessage.create({
          data: {
            role: MessageRole.ASSISTANT,
            content: responseText,
            conversationId: input.conversationId,
            userId: ctx.session.user.id,
          },
        });

        return responseText;
      } catch (error) {
        console.error("Error in manual chat:", error);
        throw new Error(
          `Chat processing failed: ${error instanceof Error ? error.message : String(error)}`,
        );
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
