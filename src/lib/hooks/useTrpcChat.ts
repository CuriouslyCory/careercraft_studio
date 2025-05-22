import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import { api } from "~/trpc/react";
import { type ChatMessage } from "@prisma/client";

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
  const pendingMessageRef = useRef<string | null>(null);
  const assistantMessageIdRef = useRef<string | null>(null);

  // Create a new conversation if needed
  const createConversationMutation = api.ai.createConversation.useMutation();

  // Fetch existing conversation messages
  const getConversation = api.ai.getConversation.useQuery(
    { conversationId: conversationId ?? "" },
    {
      enabled: !!conversationId && !!session?.user,
    },
  );

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

  // Manually execute the mutation
  const manualSubmit = api.ai.manualChat.useMutation({
    onSuccess: (data) => {
      // When we get a successful response, update the assistant message
      if (assistantMessageIdRef.current) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageIdRef.current
              ? { ...msg, content: data }
              : msg,
          ),
        );
      }
      setIsLoading(false);
    },
    onError: (error) => {
      console.error("Chat error:", error);
      // Update the assistant message with the error
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
      setError(new Error(error.message));
      setIsLoading(false);
    },
  });

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

      // Add user message to UI
      const userMessageId = uuidv4();
      const userMessage: UISimpleMessage = {
        id: userMessageId,
        role: "user",
        content: input,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      // Store the current message to process
      pendingMessageRef.current = input;

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

        // Call the manual mutation instead of using subscription
        manualSubmit.mutate({
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
    [input, isLoading, messages, conversationId, session, manualSubmit],
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
