import { useState, useCallback } from "react";
import { api, type RouterInputs } from "~/trpc/react";
import { type TRPCClientErrorLike } from "@trpc/client";
import { type AppRouter } from "~/server/api/root";

// Infer types from your tRPC router
type AIChatInput = RouterInputs["ai"]["chat"];

// Simplified message structure for UI state management
export type UISimpleMessage = {
  id: string;
  role: "user" | "assistant" | "system"; // Include system role
  content: string;
};

export function useTrpcChat() {
  const [messages, setMessages] = useState<UISimpleMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<TRPCClientErrorLike<AppRouter> | null>(
    null,
  );
  // State to hold the input for the subscription; defaults to empty messages
  const [subscriptionPayload, setSubscriptionPayload] = useState<AIChatInput>({
    messages: [],
  });
  // State to explicitly enable/disable the subscription
  const [isSubscriptionEnabled, setIsSubscriptionEnabled] = useState(false);

  // Temporary state to hold new user message before subscription kicks in
  const [pendingUserMessage, setPendingUserMessage] =
    useState<UISimpleMessage | null>(null);

  // State for the current assistant message being built
  const [currentAssistantMessage, setCurrentAssistantMessage] =
    useState<UISimpleMessage | null>(null);

  // Add a system message at the beginning for our chat
  const addSystemMessageIfNeeded = useCallback(() => {
    const hasSystemMessage = messages.some((msg) => msg.role === "system");

    if (!hasSystemMessage) {
      setMessages((prev) => [
        {
          id: "system-1",
          role: "system",
          content:
            "I am Resume Master, an AI assistant that helps you create resumes and cover letters tailored to specific job descriptions. I can analyze both your resume and job postings to highlight matches and suggest improvements.",
        },
        ...prev,
      ]);
    }
  }, [messages]);

  api.ai.chat.useSubscription(subscriptionPayload, {
    enabled: isSubscriptionEnabled,
    onStarted: () => {
      setIsLoading(true);
      setError(null);
      console.log("Subscription started with payload:", subscriptionPayload);
      if (pendingUserMessage) {
        setMessages((prev) => [...prev, pendingUserMessage]);
        setPendingUserMessage(null);
      }
      const assistantId = Date.now().toString();
      const newAssistantMessage = {
        id: assistantId,
        role: "assistant" as const,
        content: "▋",
      };
      setCurrentAssistantMessage(newAssistantMessage);
      setMessages((prev) => [...prev, newAssistantMessage]);
    },
    onData: (textChunk: string) => {
      setCurrentAssistantMessage((prevMsg) => {
        if (!prevMsg) return null; // Should not happen
        const updatedContent =
          prevMsg.content === "▋"
            ? textChunk
            : prevMsg.content.slice(0, -1) + textChunk + "▋";

        setMessages((prevMsgs) =>
          prevMsgs.map((m) =>
            m.id === prevMsg.id ? { ...m, content: updatedContent } : m,
          ),
        );
        return { ...prevMsg, content: updatedContent };
      });
    },
    onError: (err: TRPCClientErrorLike<AppRouter>) => {
      console.error("Subscription error:", err);
      setError(err);
      if (currentAssistantMessage) {
        setMessages((prevMsgs) =>
          prevMsgs.map((m) =>
            m.id === currentAssistantMessage.id
              ? { ...m, content: `Error: ${err.message}` }
              : m,
          ),
        );
      }
      setIsLoading(false);
      setIsSubscriptionEnabled(false); // Disable subscription on error
      setCurrentAssistantMessage(null);
    },
    onComplete: () => {
      console.log("Subscription completed");
      if (currentAssistantMessage) {
        const finalContent = currentAssistantMessage.content.endsWith("▋")
          ? currentAssistantMessage.content.slice(0, -1)
          : currentAssistantMessage.content;

        setMessages((prevMsgs) =>
          prevMsgs.map((m) =>
            m.id === currentAssistantMessage.id
              ? { ...m, content: finalContent }
              : m,
          ),
        );
      }
      setIsLoading(false);
      setIsSubscriptionEnabled(false); // Disable subscription on completion
      setCurrentAssistantMessage(null);
    },
  });

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(
    (e?: React.FormEvent<HTMLFormElement>) => {
      if (e) e.preventDefault();
      if (!input.trim()) return;

      // Add system message if this is the first message
      addSystemMessageIfNeeded();

      const newUserMessage: UISimpleMessage = {
        id: Date.now().toString(),
        role: "user",
        content: input,
      };

      setPendingUserMessage(newUserMessage);

      // Include all previous messages including system message
      const messagesForApiInput: AIChatInput["messages"] = [
        ...messages,
        newUserMessage,
      ].map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.id && { id: m.id }),
      }));

      setSubscriptionPayload({ messages: messagesForApiInput });
      setIsSubscriptionEnabled(true); // Enable the subscription
      setInput("");
    },
    [input, messages, addSystemMessageIfNeeded],
  );

  return {
    messages,
    input,
    isLoading,
    error,
    handleInputChange,
    handleSubmit,
    setInput,
    setMessages,
  };
}
