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
      <div className="mb-6 flex items-center gap-4">
        <div className="flex-grow border-b border-blue-200 pb-3 text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            CareerCraft{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Studio
            </span>{" "}
            AI
          </h2>
          {conversationId && (
            <p className="mt-1 text-xs text-gray-500">
              Conversation ID: {conversationId.slice(0, 8)}...
            </p>
          )}
        </div>
      </div>

      <div className="mb-6 flex-grow overflow-y-auto rounded-md border border-blue-200 bg-gradient-to-br from-white to-blue-50 p-6 shadow-lg">
        {showIntro && messages.length === 0 && !isLoading && (
          <div className="mb-6 rounded-md border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-8 text-center">
            <h2 className="mb-3 text-2xl font-bold text-blue-700">
              Welcome to CareerCraft Studio!
            </h2>
            <p className="mb-4 text-gray-700">
              Your AI-powered career assistant can help you with:
            </p>
            <ul className="mb-6 inline-block list-disc space-y-2 pl-6 text-left text-sm">
              <li className="text-gray-700">
                Analyzing and optimizing your resume
              </li>
              <li className="text-gray-700">
                Reviewing and matching job descriptions
              </li>
              <li className="text-gray-700">
                Identifying skill gaps and opportunities
              </li>
              <li className="text-gray-700">Creating tailored cover letters</li>
              <li className="text-gray-700">
                Managing your work history and achievements
              </li>
            </ul>
            <p className="mt-4 text-sm text-gray-600">
              Try pasting your resume or a job description to get started!
            </p>
            <button
              onClick={() => setShowIntro(false)}
              className="mt-4 text-sm font-medium text-blue-600 underline hover:text-blue-800"
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
              className={`mb-4 max-w-[85%] rounded-md border p-6 shadow-sm ${
                msg.role === "user"
                  ? "ml-auto border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100"
                  : "mr-auto border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50"
              }`}
            >
              <div className="mb-3 flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                  }`}
                >
                  {msg.role === "user" ? "U" : "AI"}
                </div>
                <span className="font-medium text-gray-700">
                  {msg.role === "user" ? "You" : "CareerCraft Studio AI"}
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
          <div className="p-6 text-center text-gray-600">
            <div className="mr-2 inline-block animate-bounce text-2xl">🤔</div>
            <p className="font-medium">Thinking...</p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-6 text-center text-red-600">
            <p className="font-semibold">Error:</p>
            <p className="text-sm">{error.message}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleFormSubmit} className="flex items-end gap-3">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleTextareaChange}
          placeholder="Ask about resume writing, job matching, or paste your resume or job description..."
          className={cn(
            "max-h-[30vh] min-h-[48px] flex-1 resize-none overflow-y-auto rounded-md border-2 border-blue-200 bg-white px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
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
          className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading || !input.trim()}
        >
          <Send className="h-5 w-5" />
          <span className="sr-only">Send message</span>
        </Button>
      </form>
    </div>
  );
}
