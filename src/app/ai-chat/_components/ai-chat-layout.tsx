"use client";

import { useState, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { ChatInterface } from "./chat-interface";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface AiChatLayoutProps {
  children: React.ReactNode;
}

export function AiChatLayout({ children }: AiChatLayoutProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const conversationParam = searchParams.get("conversation");
  const [mobileTab, setMobileTab] = useState<"chat" | "bio">(
    conversationParam ? "chat" : "bio",
  );

  // New state for desktop chat collapse
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  // Switch to chat tab on mobile when a conversation is loaded
  useEffect(() => {
    if (conversationParam) {
      setMobileTab("chat");
    }
  }, [conversationParam]);

  const toggleChatCollapse = () => {
    setIsChatCollapsed(!isChatCollapsed);
  };

  // Responsive layout: desktop = side-by-side, mobile = tabs
  return (
    <div className="flex h-screen w-full">
      {/* Bio section (left side - dynamic width) */}
      <div
        className={cn(
          "hidden h-full flex-col border-r border-blue-200 bg-white shadow-lg transition-all duration-300 ease-in-out md:flex",
          isChatCollapsed ? "w-full" : "w-1/2",
        )}
      >
        {children}
      </div>

      {/* Chat Area (right side - collapsible) */}
      <div
        className={cn(
          "relative hidden h-full flex-col bg-white shadow-lg transition-all duration-300 ease-in-out md:flex",
          isChatCollapsed ? "w-0 overflow-hidden" : "w-1/2",
        )}
      >
        {/* Chat header */}
        <div className="flex items-center border-b border-blue-200 p-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">AI Assistant</h3>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 p-6">
          <ChatInterface />
        </div>

        {/* Collapse button on left boundary */}
        <Button
          onClick={toggleChatCollapse}
          className="absolute top-1/2 left-0 z-10 h-8 w-6 -translate-x-1/2 -translate-y-1/2 rounded-r-md bg-gradient-to-r from-blue-600 to-indigo-600 p-0 text-white shadow-lg transition-all hover:w-8 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
          title="Collapse chat"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Collapsed chat expand button */}
      {isChatCollapsed && (
        <Button
          onClick={toggleChatCollapse}
          className="fixed top-1/2 right-4 z-10 hidden h-8 w-6 -translate-y-1/2 items-center justify-center rounded-l-md bg-gradient-to-r from-blue-600 to-indigo-600 p-0 text-white shadow-lg transition-all hover:w-8 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl md:flex"
          title="Expand chat"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Mobile: Tabs at bottom, show either chat or bio */}
      <div className="flex h-full w-full flex-col md:hidden">
        <div className="flex-1 overflow-y-auto bg-white">
          {mobileTab === "bio" ? (
            children
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
