import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import { api } from "~/trpc/react";
import { type ChatMessage } from "@prisma/client";
import { useSearchParams } from "next/navigation";

// Type for processing metadata
type ProcessingMetadata = {
  jobPostingsCreated: number;
  resumesProcessed: number;
  documentsProcessed: string[];
};

// Simplified message structure for UI state management
export type UISimpleMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
};

export function useTrpcChat() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<UISimpleMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { data: session, status } = useSession();
  const initializationRef = useRef(false);
  const sessionLoadedRef = useRef(false);
  const assistantMessageIdRef = useRef<string | null>(null);
  const isStartingNewChatRef = useRef(false);

  // Get query utils for invalidating queries
  const queryUtils = api.useUtils();

  // Subscription state
  const [subscriptionInput, setSubscriptionInput] = useState<{
    messages: UISimpleMessage[];
    conversationId?: string;
  } | null>(null);

  // Create a new conversation if needed
  const createConversationMutation = api.ai.createConversation.useMutation();

  // Fetch existing conversation messages
  const getConversation = api.ai.getConversation.useQuery(
    { conversationId: conversationId ?? "" },
    {
      enabled: !!conversationId && !!session?.user,
    },
  );

  // Debug logging for conversation query state
  useEffect(() => {
    console.log("🔍 DEBUG: Conversation query state changed");
    console.log("🔍 Conversation ID:", conversationId);
    console.log("🔍 Session user:", !!session?.user);
    console.log("🔍 Query enabled:", !!conversationId && !!session?.user);
    console.log("🔍 Query status:", getConversation.status);
    console.log("🔍 Query data length:", getConversation.data?.length ?? 0);
    console.log("🔍 Query error:", getConversation.error?.message ?? "none");
    console.log("🔍 Query isLoading:", getConversation.isLoading);
    console.log("🔍 Query isFetching:", getConversation.isFetching);
  }, [
    conversationId,
    session?.user,
    getConversation.status,
    getConversation.data,
    getConversation.error,
    getConversation.isLoading,
    getConversation.isFetching,
  ]);

  // Function to load a specific conversation
  const loadConversation = useCallback((targetConversationId: string) => {
    setConversationId(targetConversationId);
    setMessages([]); // Clear current messages
    initializationRef.current = true; // Mark as initialized to prevent auto-creation
  }, []);

  // Function to start a new chat
  const startNewChat = useCallback(() => {
    // Set flag to prevent conversation loading during new chat creation
    isStartingNewChatRef.current = true;

    // Reset all state immediately without URL manipulation
    setMessages([]);
    setInput("");
    setConversationId(null);
    setError(null);
    setIsLoading(false);
    setSubscriptionInput(null);
    assistantMessageIdRef.current = null;

    // Reset initialization flags to allow new conversation creation
    initializationRef.current = false;

    // Create a new conversation
    if (session?.user && sessionLoadedRef.current) {
      createConversationMutation.mutate(undefined, {
        onSuccess: (data: { conversationId: string }) => {
          console.log("New conversation created:", data.conversationId);
          setConversationId(data.conversationId);
          initializationRef.current = true;
          // Clear the flag after successful creation
          isStartingNewChatRef.current = false;

          // Update URL without causing a page reload
          const params = new URLSearchParams(searchParams);
          params.delete("conversation");
          const newUrl = `/ai-chat?${params.toString()}`;
          window.history.replaceState({}, "", newUrl);
        },
        onError: (err: { message: string }) => {
          console.error("Failed to create new conversation:", err.message);
          setError(
            new Error(`Failed to create new conversation: ${err.message}`),
          );
          // Clear the flag on error too
          isStartingNewChatRef.current = false;
        },
      });
    }
  }, [session, createConversationMutation, searchParams]);

  // Check for conversation parameter in URL
  useEffect(() => {
    const conversationParam = searchParams.get("conversation");
    if (
      conversationParam &&
      conversationParam !== conversationId &&
      !isStartingNewChatRef.current
    ) {
      loadConversation(conversationParam);
    }
  }, [searchParams, conversationId, loadConversation]);

  // Set up the subscription
  api.ai.chat.useSubscription(subscriptionInput ?? { messages: [] }, {
    enabled: !!subscriptionInput,
    onData: (
      chunk:
        | string
        | { type: "metadata"; data: ProcessingMetadata }
        | { type: "conversationId"; data: string },
    ) => {
      console.log(
        "🔍 DEBUG: Received subscription data:",
        typeof chunk === "string" ? `"${chunk.substring(0, 100)}..."` : chunk,
      );

      if (typeof chunk === "string") {
        // Handle text content
        console.log(
          "🔍 DEBUG: Processing text chunk for assistant message:",
          assistantMessageIdRef.current,
        );
        if (assistantMessageIdRef.current) {
          setMessages((prev) => {
            console.log(
              "🔍 DEBUG: Updating messages, current count:",
              prev.length,
            );
            return prev.map((msg) => {
              if (msg.id === assistantMessageIdRef.current) {
                // If the current content is empty or just "Thinking...", replace it entirely
                // Otherwise, append to existing content
                const currentContent = msg.content;
                if (currentContent === "" || currentContent === "Thinking...") {
                  console.log(
                    "🔍 DEBUG: Replacing placeholder content with:",
                    chunk.substring(0, 50),
                  );
                  return { ...msg, content: chunk };
                } else {
                  // Only append if the chunk contains meaningful new content
                  // and isn't a duplicate of what we already have
                  if (chunk.trim() && !currentContent.includes(chunk.trim())) {
                    console.log("🔍 DEBUG: Appending to existing content");
                    return { ...msg, content: currentContent + chunk };
                  }
                  console.log("🔍 DEBUG: Skipping duplicate or empty chunk");
                  return msg;
                }
              }
              return msg;
            });
          });
        } else {
          console.log(
            "🔍 DEBUG: No assistant message ID ref, cannot update message",
          );
        }
      } else if (chunk.type === "conversationId") {
        // Handle conversation ID from server
        console.log(
          "🔍 DEBUG: Received conversation ID from server:",
          chunk.data,
        );
        setConversationId(chunk.data);
        // Only trigger a refetch if we're not currently streaming (to avoid interfering with the current response)
        if (!isLoading) {
          console.log("🔍 DEBUG: Triggering conversation refetch");
          void getConversation.refetch();
        } else {
          console.log("🔍 DEBUG: Skipping refetch during streaming");
        }
      } else if (chunk.type === "metadata") {
        // Handle metadata
        const metadata: ProcessingMetadata = chunk.data;
        console.log("Received processing metadata:", metadata);

        // Invalidate queries based on what was processed
        if (metadata.jobPostingsCreated > 0) {
          void queryUtils.document.listJobPostings.invalidate();
        }
        if (metadata.resumesProcessed > 0) {
          void queryUtils.document.listDocuments.invalidate();
        }
      }
    },
    onError: (err) => {
      console.error("Chat subscription error:", err);
      if (assistantMessageIdRef.current) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageIdRef.current
              ? {
                  ...msg,
                  content:
                    "I'm sorry, I encountered an error while processing your request. Please try again.",
                }
              : msg,
          ),
        );
      }
      setError(new Error(err.message));
      setIsLoading(false);
      setSubscriptionInput(null);
    },
    onComplete: () => {
      setIsLoading(false);
      setSubscriptionInput(null);
    },
  });

  // Process conversation data when it's loaded
  useEffect(() => {
    if (getConversation.data && getConversation.data.length > 0) {
      const typedData = getConversation.data as unknown as ChatMessage[];
      const loadedMessages = typedData.map((msg) => ({
        id: msg.id,
        role: msg.role.toLowerCase() as
          | "user"
          | "assistant"
          | "system"
          | "tool",
        content: msg.content,
      }));

      console.log("🔍 DEBUG: Loading conversation messages from database");
      console.log("🔍 Loaded messages count:", loadedMessages.length);
      console.log(
        "🔍 Loaded messages:",
        loadedMessages.map(
          (m, i) => `[${i}] ${m.role}: ${m.content.substring(0, 50)}...`,
        ),
      );

      // Check if we have a streaming assistant message in progress
      const currentMessages = messages;
      const hasStreamingAssistant = currentMessages.some(
        (msg) =>
          msg.role === "assistant" &&
          (msg.content === "Thinking..." ||
            assistantMessageIdRef.current === msg.id),
      );

      if (hasStreamingAssistant) {
        console.log("🔍 DEBUG: Preserving streaming assistant message");
        // Keep the streaming message and only update the base conversation
        setMessages((prev) => {
          const streamingMessage = prev.find(
            (msg) => msg.id === assistantMessageIdRef.current,
          );
          if (streamingMessage) {
            return [...loadedMessages, streamingMessage];
          }
          return loadedMessages;
        });
      } else {
        console.log(
          "🔍 DEBUG: No streaming message, loading all from database",
        );
        setMessages(loadedMessages);
      }
    } else if (getConversation.data && getConversation.data.length === 0) {
      console.log("🔍 DEBUG: Conversation exists but has no messages");
      setMessages([]);
    }
  }, [getConversation.data]);

  // Wait for session to be fully loaded before initialization
  useEffect(() => {
    if (status === "authenticated" && !sessionLoadedRef.current) {
      sessionLoadedRef.current = true;
    }
  }, [status]);

  // Debug logging for conversation ID changes
  useEffect(() => {
    console.log("🔍 DEBUG: Conversation ID changed to:", conversationId);
  }, [conversationId]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInput(e.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading || !session?.user) return;

      setIsLoading(true);
      setError(null);

      // Stop any existing subscription
      setSubscriptionInput(null);

      // Add user message to UI
      const userMessageId = uuidv4();
      const userMessage: UISimpleMessage = {
        id: userMessageId,
        role: "user",
        content: input,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      try {
        // Prepare messages for API call
        const apiMessages = messages.concat(userMessage);

        // Add placeholder for assistant response
        const assistantMessageId = uuidv4();
        assistantMessageIdRef.current = assistantMessageId;

        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: "assistant",
            content: "Thinking...",
          },
        ]);

        // Start the subscription
        setSubscriptionInput({
          messages: apiMessages,
          conversationId: conversationId ?? undefined,
        });
      } catch (err) {
        console.error("Failed to send message:", err);
        // Update the assistant message with the error
        if (assistantMessageIdRef.current) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageIdRef.current
                ? {
                    ...msg,
                    content: "Chat failed. Please try again later.",
                  }
                : msg,
            ),
          );
        }

        setError(
          err instanceof Error ? err : new Error("Failed to send message"),
        );
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, conversationId, session],
  );

  /**
   * Send a message programmatically (triggered by interactive elements)
   * @param messageContent - The message content to send
   */
  const sendProgrammaticMessage = useCallback(
    async (messageContent: string) => {
      if (!messageContent.trim() || isLoading || !session?.user) return;

      console.log("🔍 DEBUG: Starting sendProgrammaticMessage");
      console.log("🔍 Message content:", messageContent);
      console.log("🔍 Current conversation ID:", conversationId);
      console.log("🔍 Current messages count:", messages.length);

      setIsLoading(true);
      setError(null);

      // Stop any existing subscription
      setSubscriptionInput(null);

      // Add user message to UI
      const userMessageId = uuidv4();
      const userMessage: UISimpleMessage = {
        id: userMessageId,
        role: "user",
        content: messageContent,
      };

      setMessages((prev) => [...prev, userMessage]);

      try {
        // Prepare messages for API call
        const apiMessages = messages.concat(userMessage);

        // Debug logging to see what messages are being sent
        console.log("🔍 DEBUG: Sending programmatic message");
        console.log("🔍 Current messages state:", messages);
        console.log("🔍 New user message:", userMessage);
        console.log("🔍 Final API messages:", apiMessages);
        console.log("🔍 Conversation ID:", conversationId);

        // Add placeholder for assistant response
        const assistantMessageId = uuidv4();
        assistantMessageIdRef.current = assistantMessageId;

        console.log(
          "🔍 DEBUG: Created assistant message placeholder:",
          assistantMessageId,
        );

        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: "assistant",
            content: "Thinking...",
          },
        ]);

        // Start the subscription
        console.log("🔍 DEBUG: Starting subscription with input:", {
          messages: apiMessages,
          conversationId: conversationId ?? undefined,
        });

        setSubscriptionInput({
          messages: apiMessages,
          conversationId: conversationId ?? undefined,
        });
      } catch (err) {
        console.error("Failed to send programmatic message:", err);
        // Update the assistant message with the error
        if (assistantMessageIdRef.current) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageIdRef.current
                ? {
                    ...msg,
                    content: "Chat failed. Please try again later.",
                  }
                : msg,
            ),
          );
        }

        setError(
          err instanceof Error ? err : new Error("Failed to send message"),
        );
        setIsLoading(false);
      }
    },
    [messages, conversationId, session, isLoading],
  );

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    conversationId,
    loadConversation,
    startNewChat,
    sendProgrammaticMessage,
  };
}
