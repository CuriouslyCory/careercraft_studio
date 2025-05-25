"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { BioView } from "./_components/bio-view";
import { ChatInterface } from "./_components/chat-interface";

export default function AIChatPage() {
  const searchParams = useSearchParams();
  const activeView = searchParams.get("bio") ?? "documents";
  const conversationParam = searchParams.get("conversation");
  const [mobileTab, setMobileTab] = useState<"chat" | "bio">(
    conversationParam ? "chat" : "bio",
  );

  // Switch to chat tab on mobile when a conversation is loaded
  useEffect(() => {
    if (conversationParam) {
      setMobileTab("chat");
    }
  }, [conversationParam]);

  // Responsive layout: desktop = side-by-side, mobile = tabs
  return (
    <div className="flex h-screen w-full">
      {/* Bio section (left 50%) */}
      <div className="hidden h-full w-1/2 flex-col border-r border-blue-200 bg-white shadow-lg md:flex">
        <div className="flex-1 overflow-y-auto p-6">
          <BioView view={activeView} />
        </div>
      </div>
      {/* Chat Area (right 50%) */}
      <div className="hidden h-full w-1/2 flex-col bg-white p-6 shadow-lg md:flex">
        <ChatInterface />
      </div>
      {/* Mobile: Tabs at bottom, show either chat or bio */}
      <div className="flex h-full w-full flex-col md:hidden">
        <div className="flex-1 overflow-y-auto bg-white">
          {mobileTab === "bio" ? (
            <div className="p-4">
              <BioView view={activeView} />
            </div>
          ) : (
            <div className="flex flex-col p-4">
              <ChatInterface />
            </div>
          )}
        </div>
        {/* Sticky bottom tabs */}
        <div className="sticky right-0 bottom-0 left-0 z-20 flex h-16 w-full border-t border-blue-200 bg-white shadow-lg">
          <button
            className={`flex-1 py-3 text-center font-semibold transition-all ${
              mobileTab === "bio"
                ? "border-b-3 border-blue-600 bg-blue-50 text-blue-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
            onClick={() => setMobileTab("bio")}
          >
            Bio
          </button>
          <button
            className={`flex-1 py-3 text-center font-semibold transition-all ${
              mobileTab === "chat"
                ? "border-b-3 border-blue-600 bg-blue-50 text-blue-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
            onClick={() => setMobileTab("chat")}
          >
            Chat
          </button>
        </div>
      </div>
    </div>
  );
}
