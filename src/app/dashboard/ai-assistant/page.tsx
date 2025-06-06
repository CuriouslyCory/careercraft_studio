"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarInset,
} from "~/components/ui/sidebar";
import { ConversationsPanel } from "~/app/dashboard/_components/conversations-panel";
import { ChatInterfaceWithHeader } from "~/app/dashboard/_components/chat-interface";

export default function AIAssistantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Assistant</h1>
        <p className="mt-2 text-gray-600">
          Chat with your AI career assistant and manage your conversations.
        </p>
      </div>

      <div className="h-[calc(100vh-200px)] rounded-lg border border-gray-200 bg-white shadow-sm">
        <SidebarProvider>
          <div className="flex h-full">
            {/* Conversations Sidebar */}
            <Sidebar className="w-80 border-r border-gray-200">
              <SidebarHeader className="border-b border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Conversations
                </h2>
              </SidebarHeader>
              <SidebarContent className="p-0">
                <ConversationsPanel />
              </SidebarContent>
            </Sidebar>

            {/* Chat Interface */}
            <SidebarInset className="flex-1">
              <div className="h-full">
                <ChatInterfaceWithHeader />
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </div>
    </div>
  );
}
