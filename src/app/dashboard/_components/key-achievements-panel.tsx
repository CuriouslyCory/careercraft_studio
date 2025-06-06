"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { z } from "zod";
import { type DeduplicationResult } from "~/server/api/routers/document/key-achievements";

// Validation schema
const achievementSchema = z.object({
  content: z.string().min(1, "Achievement content is required"),
});

export function KeyAchievementsPanel() {
  const [editId, setEditId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAchievement, setNewAchievement] = useState("");
  const [showDedupePreview, setShowDedupePreview] = useState(false);
  const [dedupePreview, setDedupePreview] =
    useState<DeduplicationResult | null>(null);

  const queryClient = api.useUtils();
  const achievementsQuery = api.document.listKeyAchievements.useQuery();

  // Deduplication mutation
  const deduplicateMutation =
    api.document.deduplicateAndMergeKeyAchievements.useMutation({
      onSuccess: (result) => {
        if (result.success) {
          void achievementsQuery.refetch();
          setShowDedupePreview(false);
          setDedupePreview(null);
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      },
      onError: (error) => {
        toast.error(`Failed to deduplicate achievements: ${error.message}`);
      },
    });

  // Update mutation
  const updateMutation = api.document.updateKeyAchievement.useMutation({
    onSuccess: () => {
      void achievementsQuery.refetch();
      setEditId(null);
      toast.success("Achievement updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update achievement: ${error.message}`);
    },
  });

  // Delete mutation with optimistic updates
  const deleteMutation = api.document.deleteKeyAchievement.useMutation({
    onMutate: async (deleteData) => {
      // Cancel any outgoing refetches
      await queryClient.document.listKeyAchievements.cancel();

      // Save the current state
      const previousAchievements = achievementsQuery.data ?? [];

      // Optimistically update the UI
      queryClient.document.listKeyAchievements.setData(undefined, (old) => {
        return old ? old.filter((ach) => ach.id !== deleteData.id) : [];
      });

      // Return the previous state in case we need to revert
      return { previousAchievements };
    },
    onError: (err, _deleteData, context) => {
      // If the mutation fails, restore the previous data
      if (context?.previousAchievements) {
        queryClient.document.listKeyAchievements.setData(
          undefined,
          context.previousAchievements,
        );
      }
      toast.error(`Failed to delete achievement: ${err.message}`);
    },
    onSettled: (data, error) => {
      // Sync with server
      void queryClient.document.listKeyAchievements.invalidate();

      // Show success toast if no error
      if (!error) {
        toast.success("Achievement deleted successfully");
      }
    },
  });

  // Create mutation with optimistic updates
  const createMutation = api.document.createKeyAchievement.useMutation({
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.document.listKeyAchievements.cancel();

      // Save the current state
      const previousAchievements = achievementsQuery.data ?? [];

      // Create a temporary ID for the optimistic update
      const tempId = `temp-${Date.now()}`;

      // Build the new achievement entry with the temporary ID
      const optimisticEntry = {
        id: tempId,
        content: newData.content,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId:
          previousAchievements.length > 0 && previousAchievements[0]?.userId
            ? previousAchievements[0].userId
            : "temp-user-id",
      };

      // Optimistically update the UI with the new entry
      queryClient.document.listKeyAchievements.setData(undefined, (old) => {
        return old ? [optimisticEntry, ...old] : [optimisticEntry];
      });

      // Hide the form and reset the form data
      setShowAddForm(false);
      setNewAchievement("");

      // Return the previous state in case we need to revert
      return { previousAchievements };
    },
    onError: (err, _newData, context) => {
      // If the mutation fails, restore the previous data
      if (context?.previousAchievements) {
        queryClient.document.listKeyAchievements.setData(
          undefined,
          context.previousAchievements,
        );
      }
      toast.error(`Failed to add achievement: ${err.message}`);
    },
    onSettled: (data, error) => {
      // Sync with server
      void queryClient.document.listKeyAchievements.invalidate();

      // Show success toast if no error
      if (!error) {
        toast.success("Achievement added successfully");
      }
    },
  });

  const handleEdit = (id: string, content: string) => {
    setEditId(id);
    setEditContent(content);
  };

  const handleSave = () => {
    if (!editId) return;

    try {
      // Validate the input
      achievementSchema.parse({ content: editContent });

      updateMutation.mutate({
        id: editId,
        content: editContent,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message ?? "Validation error");
      } else {
        toast.error("Failed to validate input");
      }
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this achievement?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleAddAchievement = () => {
    try {
      // Validate the input
      achievementSchema.parse({ content: newAchievement });

      createMutation.mutate({
        content: newAchievement,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message ?? "Validation error");
      } else {
        toast.error("Failed to validate input");
      }
    }
  };

  const handleDeduplicatePreview = () => {
    deduplicateMutation.mutate(
      { dryRun: true },
      {
        onSuccess: (result) => {
          setDedupePreview(result);
          setShowDedupePreview(true);
        },
      },
    );
  };

  const handleDeduplicateApply = () => {
    deduplicateMutation.mutate(
      { dryRun: false },
      {
        onSuccess: () => {
          setShowDedupePreview(false);
          setDedupePreview(null);
        },
      },
    );
  };

  if (achievementsQuery.isLoading) {
    return <div className="p-4 text-center">Loading your achievements...</div>;
  }

  if (achievementsQuery.error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error loading achievements: {achievementsQuery.error.message}
      </div>
    );
  }

  const achievements = achievementsQuery.data ?? [];

  return (
    <div className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Key Achievements</h2>
        <div className="flex space-x-2">
          {achievements.length > 1 && (
            <button
              onClick={handleDeduplicatePreview}
              disabled={deduplicateMutation.isPending}
              className="rounded bg-orange-500 px-3 py-1 text-sm text-white hover:bg-orange-600 disabled:bg-orange-300"
              title="Remove duplicates and merge similar achievements"
            >
              {deduplicateMutation.isPending ? "Processing..." : "Clean Up"}
            </button>
          )}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
          >
            {showAddForm ? "Cancel" : "Add Achievement"}
          </button>
        </div>
      </div>

      {/* Deduplication Preview Modal */}
      {showDedupePreview && dedupePreview && (
        <div className="mb-4 rounded border border-orange-200 bg-orange-50 p-4">
          <h3 className="mb-3 text-lg font-medium text-orange-800">
            Deduplication Preview
          </h3>
          <div className="mb-3 text-sm text-orange-700">
            <p>
              <strong>Original count:</strong> {dedupePreview.originalCount}
            </p>
            <p>
              <strong>Final count:</strong> {dedupePreview.finalCount}
            </p>
            <p>
              <strong>Exact duplicates removed:</strong>{" "}
              {dedupePreview.exactDuplicatesRemoved}
            </p>
            <p>
              <strong>Similar groups merged:</strong>{" "}
              {dedupePreview.similarGroupsMerged}
            </p>
          </div>

          {dedupePreview.preview && dedupePreview.preview.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 font-medium text-orange-800">
                Preview of cleaned achievements:
              </h4>
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {dedupePreview.preview.map((item, index: number) => (
                  <div
                    key={index}
                    className="rounded border bg-white p-2 text-sm"
                  >
                    <span className="text-gray-600">{index + 1}.</span>{" "}
                    {item.content}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setShowDedupePreview(false);
                setDedupePreview(null);
              }}
              className="rounded bg-gray-300 px-3 py-1 text-sm hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleDeduplicateApply}
              disabled={deduplicateMutation.isPending}
              className="rounded bg-orange-500 px-3 py-1 text-sm text-white hover:bg-orange-600 disabled:bg-orange-300"
            >
              {deduplicateMutation.isPending ? "Applying..." : "Apply Changes"}
            </button>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="mb-4 rounded border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 text-lg font-medium">Add New Achievement</h3>
          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium">
              Achievement
            </label>
            <textarea
              value={newAchievement}
              onChange={(e) => setNewAchievement(e.target.value)}
              className="w-full rounded border p-2"
              rows={3}
              placeholder="Enter your achievement..."
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAddAchievement}
              disabled={createMutation.isPending || !newAchievement.trim()}
              className="rounded bg-blue-500 px-3 py-1 text-sm text-white disabled:bg-blue-300"
            >
              {createMutation.isPending ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      )}

      {achievements.length === 0 && !showAddForm ? (
        <p className="rounded bg-gray-50 p-4 text-center text-gray-500">
          No achievements found. Add your key achievements to get started.
        </p>
      ) : (
        <div className="overflow-y-auto">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className="mb-4 rounded border border-gray-200 p-4"
            >
              {editId === achievement.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="mb-3 w-full rounded border p-2"
                    rows={3}
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setEditId(null)}
                      className="rounded bg-gray-300 px-2 py-1 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      className="rounded bg-green-500 px-2 py-1 text-xs text-white"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="whitespace-pre-wrap">{achievement.content}</p>
                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      onClick={() =>
                        handleEdit(achievement.id, achievement.content)
                      }
                      className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(achievement.id)}
                      disabled={deleteMutation.isPending}
                      className="rounded bg-red-100 px-2 py-1 text-xs text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
