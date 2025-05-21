"use client";

import { useState } from "react";
import { useTrpcChat, type UISimpleMessage } from "~/lib/hooks/useTrpcChat";

export default function AIChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useTrpcChat();

  const [showIntro, setShowIntro] = useState(true);

  return (
    <div className="flex h-screen flex-col bg-gray-50 p-4 md:p-6">
      <div className="mb-4 border-b border-gray-200 pb-2 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Resume Master AI Assistant
        </h1>
        <p className="text-sm text-gray-600">
          Powered by LangChain + LangGraph
        </p>
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
              className={`mb-3 max-w-[85%] rounded-lg p-3 ${
                msg.role === "user"
                  ? "ml-auto bg-blue-100"
                  : "mr-auto bg-gray-100"
              }`}
            >
              <div className="mb-1 text-xs text-gray-500">
                {msg.role === "user" ? "You" : "Resume Master AI"}
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
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
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about resume writing, job matching, or paste your resume or job description..."
          className="flex-grow rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          disabled={isLoading}
        />
        <button
          type="submit"
          className={`rounded-lg px-4 py-2 font-medium text-white ${
            isLoading
              ? "cursor-not-allowed bg-gray-400"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          disabled={isLoading}
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
