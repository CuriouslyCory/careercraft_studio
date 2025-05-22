"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { BioView } from "./_components/bio-view";
import { ChatInterface } from "./_components/chat-interface";

export default function AIChatPage() {
  const searchParams = useSearchParams();
  const activeView = searchParams.get("bio") ?? "documents";
  const [mobileTab, setMobileTab] = useState<"chat" | "bio">("bio");

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
        <ChatInterface />
      </div>
      {/* Mobile: Tabs at bottom, show either chat or bio */}
      <div className="flex h-full w-full flex-col md:hidden">
        <div className="flex-1 overflow-y-auto">
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
