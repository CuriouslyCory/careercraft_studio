"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTrpcChat, type UISimpleMessage } from "~/lib/hooks/useTrpcChat";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { markdownComponents } from "./markdown-components";

export function ChatInterface() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    conversationId,
  } = useTrpcChat();
  const [showIntro, setShowIntro] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";
    // Set the height to scrollHeight to expand the textarea
    textarea.style.height = `${Math.min(textarea.scrollHeight, window.innerHeight * 0.3)}px`;
  }, [input]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    void handleSubmit(e);

    // Reset textarea height after sending
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Create a synthetic input event for compatibility with useTrpcChat
    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        type: "text",
        value: e.target.value,
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    handleInputChange(syntheticEvent);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-4">
        <div className="flex-grow border-b border-gray-200 pb-2 text-center">
          {conversationId && (
            <p className="text-xs text-gray-500">
              Conversation ID: {conversationId.slice(0, 8)}...
            </p>
          )}
        </div>
      </div>

      <div className="mb-4 flex-grow overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        {showIntro && messages.length === 0 && !isLoading && (
          <div className="mb-4 rounded-lg bg-blue-50 p-6 text-center">
            <h2 className="mb-2 text-lg font-semibold text-blue-700">
              Welcome to Resume Master!
            </h2>
            <p className="mb-3 text-sm text-gray-700">I can help you with:</p>
            <ul className="mb-4 inline-block list-disc pl-6 text-left text-sm">
              <li className="mb-1">Analyzing your resume</li>
              <li className="mb-1">Reviewing job descriptions</li>
              <li className="mb-1">Matching your skills to job requirements</li>
              <li className="mb-1">Creating tailored cover letters</li>
              <li className="mb-1">
                Storing your work history and preferences
              </li>
            </ul>
            <p className="mt-2 text-sm text-gray-700">
              Try pasting your resume or a job description to get started!
            </p>
            <button
              onClick={() => setShowIntro(false)}
              className="mt-4 text-xs text-blue-600 underline hover:text-blue-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {messages
          .filter((msg) => msg.role !== "system")
          .map((msg: UISimpleMessage) => (
            <div
              key={msg.id}
              className={`mb-3 max-w-[85%] rounded-lg border p-4 ${
                msg.role === "user"
                  ? "ml-auto border-cyan-600/60 bg-blue-500/5"
                  : "mr-auto border-emerald-600/60 bg-emerald-500/5"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="bg-muted flex h-6 w-6 items-center justify-center rounded-full text-xs">
                  {msg.role === "user" ? "U" : "AI"}
                </div>
                <span className="text-xs text-gray-600">
                  {msg.role === "user" ? "You" : "Resume Master AI"}
                </span>
              </div>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown components={markdownComponents}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}

        {isLoading && messages.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            <div className="mr-2 inline-block animate-bounce">🤔</div>
            Thinking...
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-center text-red-500">
            <p className="font-semibold">Error:</p>
            <p className="text-sm">{error.message}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleFormSubmit} className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleTextareaChange}
          placeholder="Ask about resume writing, job matching, or paste your resume or job description..."
          className={cn(
            "border-input bg-background placeholder:text-muted-foreground max-h-[30vh] min-h-[40px] flex-1 resize-none overflow-y-auto rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          )}
          disabled={isLoading}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleFormSubmit(e);
            }
          }}
        />
        <Button
          type="submit"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-100"
          disabled={isLoading || !input.trim()}
        >
          <Send className="h-5 w-5" />
          <span className="sr-only">Send message</span>
        </Button>
      </form>
    </div>
  );
}
