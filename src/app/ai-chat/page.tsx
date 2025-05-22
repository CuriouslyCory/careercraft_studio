"use client";

import { useState, useCallback } from "react";
import { useTrpcChat, type UISimpleMessage } from "~/lib/hooks/useTrpcChat";
import DocumentUpload from "~/app/_components/document-upload";
import { api } from "~/trpc/react";
import { useSidebar } from "~/components/ui/sidebar";
import { useRouter, useSearchParams } from "next/navigation";

function DocumentsPanel() {
  return <div>Documents CRUD UI goes here</div>;
}

function BioView({ view }: { view: string }) {
  switch (view) {
    case "documents":
      return <DocumentsPanel />;
    case "workHistory":
      return <div>Work History bio (coming soon)</div>;
    case "keyAchievements":
      return <div>Key Achievements bio (coming soon)</div>;
    case "skills":
      return <div>Skills bio (coming soon)</div>;
    case "education":
      return <div>Education bio (coming soon)</div>;
    default:
      return <div>Select a bio section</div>;
  }
}

export default function AIChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useTrpcChat();

  const [showIntro, setShowIntro] = useState(true);
  const [truncateStatus, setTruncateStatus] = useState<
    null | "success" | "error"
  >(null);
  const [truncateLoading, setTruncateLoading] = useState(false);
  const searchParams = useSearchParams();
  const activeView = searchParams.get("bio") ?? "documents";
  const [mobileTab, setMobileTab] = useState<"chat" | "bio">("chat");
  const truncateMutation = api.document.truncateAllUserData.useMutation();

  const handleTruncate = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete all your resume data? This cannot be undone.",
      )
    )
      return;
    setTruncateLoading(true);
    setTruncateStatus(null);
    try {
      await truncateMutation.mutateAsync();
      setTruncateStatus("success");
    } catch (e) {
      setTruncateStatus("error");
    } finally {
      setTruncateLoading(false);
    }
  };

  // Responsive layout: desktop = side-by-side, mobile = tabs
  return (
    <div className="flex h-screen w-full bg-gray-50">
      {/* Bio section (left 50%) */}
      <div className="hidden h-full w-1/2 flex-col border-r bg-white md:flex">
        <div className="flex-1 overflow-y-auto p-4">
          <BioView view={activeView} />
        </div>
      </div>
      {/* Chat Area (right 50%) */}
      <div className="hidden h-full w-1/2 flex-col p-4 md:flex md:p-6">
        <div className="mb-6">
          <DocumentUpload />
        </div>
        <div className="mb-4 flex items-center gap-4">
          <div className="flex-grow border-b border-gray-200 pb-2 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Resume Master AI Assistant
            </h1>
          </div>
          <button
            onClick={handleTruncate}
            className={`ml-4 rounded bg-red-600 px-4 py-2 font-semibold text-white shadow hover:bg-red-700 disabled:opacity-60`}
            disabled={truncateLoading}
          >
            {truncateLoading ? "Truncating..." : "Truncate"}
          </button>
        </div>
        {truncateStatus === "success" && (
          <div className="mb-4 rounded bg-green-100 p-2 text-center text-green-800">
            All resume data deleted.
          </div>
        )}
        {truncateStatus === "error" && (
          <div className="mb-4 rounded bg-red-100 p-2 text-center text-red-800">
            Failed to delete data. Please try again.
          </div>
        )}

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
                <li className="mb-1">
                  Matching your skills to job requirements
                </li>
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
      {/* Mobile: Tabs at bottom, show either chat or bio */}
      <div className="flex h-full w-full flex-col md:hidden">
        <div className="flex-1 overflow-y-auto">
          {mobileTab === "bio" ? (
            <>
              <div className="p-4">
                <BioView view={activeView} />
              </div>
            </>
          ) : (
            <div className="flex flex-col p-4">
              <div className="mb-6">
                <DocumentUpload />
              </div>
              <div className="mb-4 flex items-center gap-4">
                <div className="flex-grow border-b border-gray-200 pb-2 text-center">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Resume Master AI Assistant
                  </h1>
                </div>
                <button
                  onClick={handleTruncate}
                  className={`ml-4 rounded bg-red-600 px-4 py-2 font-semibold text-white shadow hover:bg-red-700 disabled:opacity-60`}
                  disabled={truncateLoading}
                >
                  {truncateLoading ? "Truncating..." : "Truncate"}
                </button>
              </div>
              {truncateStatus === "success" && (
                <div className="mb-4 rounded bg-green-100 p-2 text-center text-green-800">
                  All resume data deleted.
                </div>
              )}
              {truncateStatus === "error" && (
                <div className="mb-4 rounded bg-red-100 p-2 text-center text-red-800">
                  Failed to delete data. Please try again.
                </div>
              )}

              <div className="mb-4 flex-grow overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                {showIntro && messages.length === 0 && !isLoading && (
                  <div className="mb-4 rounded-lg bg-blue-50 p-6 text-center">
                    <h2 className="mb-2 text-lg font-semibold text-blue-700">
                      Welcome to Resume Master!
                    </h2>
                    <p className="mb-3 text-sm text-gray-700">
                      I can help you with:
                    </p>
                    <ul className="mb-4 inline-block list-disc pl-6 text-left text-sm">
                      <li className="mb-1">Analyzing your resume</li>
                      <li className="mb-1">Reviewing job descriptions</li>
                      <li className="mb-1">
                        Matching your skills to job requirements
                      </li>
                      <li className="mb-1">Creating tailored cover letters</li>
                    </ul>
                    <p className="mt-2 text-sm text-gray-700">
                      Try pasting your resume or a job description to get
                      started!
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
          )}
        </div>
        {/* Sticky bottom tabs */}
        <div className="sticky right-0 bottom-0 left-0 z-20 flex h-14 w-full border-t bg-white">
          <button
            className={`flex-1 py-2 text-center ${mobileTab === "bio" ? "border-b-2 border-blue-600 font-bold text-blue-600" : "text-gray-600"}`}
            onClick={() => setMobileTab("bio")}
          >
            Bio
          </button>
          <button
            className={`flex-1 py-2 text-center ${mobileTab === "chat" ? "border-b-2 border-blue-600 font-bold text-blue-600" : "text-gray-600"}`}
            onClick={() => setMobileTab("chat")}
          >
            Chat
          </button>
        </div>
      </div>
    </div>
  );
}
