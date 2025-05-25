"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

import {
  Trash2,
  Edit2,
  Plus,
  MessageSquare,
  Save,
  X,
  Calendar,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";

interface ConversationDetails {
  id: string;
  conversationId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { messages: number };
  messages: Array<{
    content: string;
    createdAt: Date;
    role: string;
  }>;
}

export function ConversationsPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "" });

  // Queries
  const conversationsQuery = api.ai.listConversations.useQuery();

  // Mutations
  const renameConversationMutation = api.ai.renameConversation.useMutation({
    onSuccess: () => {
      void conversationsQuery.refetch();
      setEditingId(null);
      toast.success("Conversation renamed successfully");
    },
    onError: (error) => {
      toast.error(`Failed to rename conversation: ${error.message}`);
    },
  });

  const deleteConversationMutation = api.ai.deleteConversation.useMutation({
    onSuccess: () => {
      void conversationsQuery.refetch();
      toast.success("Conversation deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete conversation: ${error.message}`);
    },
  });

  const createConversationMutation = api.ai.createConversation.useMutation({
    onSuccess: (_data) => {
      void conversationsQuery.refetch();
      // Navigate to chat with new conversation
      const params = new URLSearchParams(searchParams);
      params.delete("bio"); // Remove bio param to show chat interface
      router.push(`/ai-chat?${params.toString()}`);
      toast.success("New conversation created");
    },
    onError: (error) => {
      toast.error(`Failed to create conversation: ${error.message}`);
    },
  });

  const handleEdit = (conversation: ConversationDetails) => {
    setEditingId(conversation.id);
    setEditForm({ name: conversation.name });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;

    const conversation = conversations.find((c) => c.id === editingId);
    if (!conversation) return;

    renameConversationMutation.mutate({
      conversationId: conversation.conversationId,
      name: editForm.name,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "" });
  };

  const handleDelete = (conversation: ConversationDetails) => {
    if (confirm(`Are you sure you want to delete "${conversation.name}"?`)) {
      deleteConversationMutation.mutate({
        conversationId: conversation.conversationId,
      });
    }
  };

  const handleLoadConversation = (conversationId: string) => {
    // Navigate to chat interface with this conversation loaded
    const params = new URLSearchParams(searchParams);
    params.set("conversation", conversationId);
    router.push(`/ai-chat?${params.toString()}`);
  };

  const handleCreateNew = () => {
    createConversationMutation.mutate();
  };

  const getLastMessagePreview = (conversation: ConversationDetails) => {
    if (conversation.messages.length === 0) return "No messages yet";
    const lastMessage = conversation.messages[0];
    if (!lastMessage?.content) return "No content";
    const preview =
      lastMessage.content.substring(0, 100) +
      (lastMessage.content.length > 100 ? "..." : "");
    return `${lastMessage.role === "user" ? "You: " : "AI: "}${preview}`;
  };

  if (conversationsQuery.isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-800" />
      </div>
    );
  }

  const conversations = conversationsQuery.data ?? [];

  return (
    <div className="h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Conversations</h2>
        <Button
          onClick={handleCreateNew}
          size="sm"
          className="flex items-center gap-2"
          disabled={createConversationMutation.isPending}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {conversations.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>No conversations yet</p>
            <p className="text-sm">
              Start a new conversation to begin chatting with the AI
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className="rounded-lg border p-4 transition-colors hover:bg-gray-50"
              >
                {editingId === conversation.id ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`edit-name-${conversation.id}`}>
                        Conversation Name
                      </Label>
                      <Input
                        id={`edit-name-${conversation.id}`}
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        placeholder="Enter conversation name"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={renameConversationMutation.isPending}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() =>
                        handleLoadConversation(conversation.conversationId)
                      }
                    >
                      <div className="mb-2 text-lg font-medium">
                        {conversation.name}
                      </div>
                      <div className="mb-2 text-sm text-gray-600">
                        {getLastMessagePreview(conversation)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {conversation._count.messages} messages
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(
                            new Date(conversation.updatedAt),
                            {
                              addSuffix: true,
                            },
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2 border-t pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(conversation);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(conversation);
                        }}
                        disabled={deleteConversationMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadConversation(conversation.conversationId);
                        }}
                        className="ml-auto"
                      >
                        Open Chat
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
