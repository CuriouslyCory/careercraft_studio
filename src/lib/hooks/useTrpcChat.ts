import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import { api } from "~/trpc/react";
import { type ChatMessage } from "@prisma/client";

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
  const [messages, setMessages] = useState<UISimpleMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { data: session, status } = useSession();
  const initializationRef = useRef(false);
  const sessionLoadedRef = useRef(false);
  const assistantMessageIdRef = useRef<string | null>(null);

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

  // Set up the subscription
  api.ai.chat.useSubscription(subscriptionInput ?? { messages: [] }, {
    enabled: !!subscriptionInput,
    onData: (
      chunk: string | { type: "metadata"; data: ProcessingMetadata },
    ) => {
      if (typeof chunk === "string") {
        // Handle text content
        if (assistantMessageIdRef.current) {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === assistantMessageIdRef.current) {
                // If the current content is empty or just "Thinking...", replace it entirely
                // Otherwise, append to existing content
                const currentContent = msg.content;
                if (currentContent === "" || currentContent === "Thinking...") {
                  return { ...msg, content: chunk };
                } else {
                  // Only append if the chunk contains meaningful new content
                  // and isn't a duplicate of what we already have
                  if (chunk.trim() && !currentContent.includes(chunk.trim())) {
                    return { ...msg, content: currentContent + chunk };
                  }
                  return msg;
                }
              }
              return msg;
            }),
          );
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
      setMessages(
        typedData.map((msg) => ({
          id: msg.id,
          role: msg.role.toLowerCase() as
            | "user"
            | "assistant"
            | "system"
            | "tool",
          content: msg.content,
        })),
      );
    }
  }, [getConversation.data]);

  // Wait for session to be fully loaded before initialization
  useEffect(() => {
    if (status === "authenticated" && !sessionLoadedRef.current) {
      sessionLoadedRef.current = true;
    }
  }, [status]);

  // Initialize conversation
  useEffect(() => {
    // Only run this effect when:
    // 1. Session is authenticated
    // 2. sessionLoadedRef is true (prevents premature initialization)
    // 3. We don't have a conversation ID yet
    // 4. We haven't started initialization
    if (
      session?.user &&
      sessionLoadedRef.current &&
      !conversationId &&
      !initializationRef.current
    ) {
      console.log("Starting conversation initialization");
      initializationRef.current = true;

      createConversationMutation.mutate(undefined, {
        onSuccess: (data: { conversationId: string }) => {
          console.log("Conversation created:", data.conversationId);
          setConversationId(data.conversationId);
        },
        onError: (err: { message: string }) => {
          console.error("Failed to create conversation:", err.message);
          setError(new Error(`Failed to create conversation: ${err.message}`));
          // Only reset the initialization ref on error so we can retry
          initializationRef.current = false;
        },
      });
    }
  }, [
    session,
    sessionLoadedRef.current,
    conversationId,
    createConversationMutation,
  ]);

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

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    conversationId,
  };
}
