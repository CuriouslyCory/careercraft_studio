"use client";

import { useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { WorkHistoryForm } from "./work-history-form";
import {
  workHistorySchema,
  workHistoryFormSchema,
  type WorkHistoryFormValues,
} from "./work-history-schema";
import { z } from "zod";
import { UserSkillsForWork } from "./user-skills-for-work";
import { type WorkAchievementDeduplicationResult } from "~/server/api/routers/document/work-history";
import { WorkHistoryDropdown } from "./work-history-dropdown";
import { MergeUtilityModal } from "./merge-utility-modal";
import { SkillLevelDropdown } from "./skill-level-dropdown";
import { type SkillLevel } from "./skill-level-utils";

export function WorkHistoryPanel() {
  const [editId, setEditId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<WorkHistoryFormValues>({
    companyName: "",
    jobTitle: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWorkHistory, setNewWorkHistory] = useState<WorkHistoryFormValues>({
    companyName: "",
    jobTitle: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
  });
  const [newSkill, setNewSkill] = useState("");
  const [newSkillLevel, setNewSkillLevel] =
    useState<SkillLevel>("INTERMEDIATE");
  const [activeWorkHistoryId, setActiveWorkHistoryId] = useState<string | null>(
    null,
  );
  const [showDedupePreview, setShowDedupePreview] = useState<string | null>(
    null,
  ); // workHistoryId for which preview is shown
  const [dedupePreview, setDedupePreview] =
    useState<WorkAchievementDeduplicationResult | null>(null);

  // Merge modal state
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeInitialRecordId, setMergeInitialRecordId] = useState<
    string | null
  >(null);

  const queryClient = api.useUtils();
  const workHistoryQuery = api.document.listWorkHistory.useQuery();

  const updateMutation = api.document.updateWorkHistory.useMutation({
    onSuccess: () => {
      void workHistoryQuery.refetch();
      setEditId(null);
      toast.success("Work history updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update work history: ${error.message}`);
    },
  });

  const deleteMutation = api.document.deleteWorkHistory.useMutation({
    onMutate: async (deleteData) => {
      // Cancel any outgoing refetches
      await queryClient.document.listWorkHistory.cancel();

      // Save the current state
      const previousWorkHistory = workHistoryQuery.data ?? [];

      // Optimistically update the UI
      queryClient.document.listWorkHistory.setData(undefined, (old) => {
        return old ? old.filter((item) => item.id !== deleteData.id) : [];
      });

      // Return the previous state in case we need to revert
      return { previousWorkHistory };
    },
    onError: (error, _deleteData, context) => {
      // If the mutation fails, restore the previous data
      if (context?.previousWorkHistory) {
        queryClient.document.listWorkHistory.setData(
          undefined,
          context.previousWorkHistory,
        );
      }
      toast.error(`Failed to delete work history: ${error.message}`);
    },
    onSettled: (data, error) => {
      // Sync with server
      void queryClient.document.listWorkHistory.invalidate();

      // Show success toast if no error
      if (!error) {
        toast.success("Work history entry deleted");
      }
    },
  });

  const createMutation = api.document.createWorkHistory.useMutation({
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.document.listWorkHistory.cancel();

      // Save the current state
      const previousWorkHistory = workHistoryQuery.data ?? [];

      // Create a temporary ID for the optimistic update
      const tempId = `temp-${Date.now()}`;

      // Get userId from an existing record if available, or use a placeholder
      const userId =
        previousWorkHistory.length > 0 && previousWorkHistory[0]?.userId
          ? previousWorkHistory[0].userId
          : "temp-user-id";

      // Build the new work history entry with the temporary ID
      const optimisticEntry = {
        id: tempId,
        userId,
        companyName: newData.companyName,
        jobTitle: newData.jobTitle,
        startDate: new Date(newData.startDate),
        endDate: newData.endDate ? new Date(newData.endDate) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
        achievements: [],
        userSkills: [],
      };

      // Optimistically update the UI with the new entry
      queryClient.document.listWorkHistory.setData(undefined, (old) => {
        return old ? [...old, optimisticEntry] : [optimisticEntry];
      });

      // Hide the form and reset the form data
      setShowAddForm(false);
      setNewWorkHistory({
        companyName: "",
        jobTitle: "",
        startDate: "",
        endDate: "",
        isCurrent: false,
      });

      // Return the previous state in case we need to revert
      return { previousWorkHistory };
    },
    onError: (error, _newData, context) => {
      // If the mutation fails, restore the previous state
      if (context?.previousWorkHistory) {
        queryClient.document.listWorkHistory.setData(
          undefined,
          context.previousWorkHistory,
        );
      }

      // Show the form again so the user can retry
      setShowAddForm(true);
      toast.error(`Failed to add work history: ${error.message}`);
    },
    onSettled: (data, error) => {
      // Sync with server
      void queryClient.document.listWorkHistory.invalidate();

      // Show success toast if no error
      if (!error) {
        toast.success("Work history added successfully");
      }
    },
  });

  // Modern UserSkill mutations
  const addUserSkillMutation = api.document.addUserSkillToWork.useMutation({
    onSuccess: () => {
      //void queryClient.document.listWorkHistory.invalidate();
      void queryClient.document.listUserSkillsForWork.invalidate();
      setNewSkill("");
      // Don't reset skill level - keep user's selection
      toast.success("Skill added");
    },
    onError: (error) => {
      toast.error(`Failed to add skill: ${error.message}`);
    },
  });

  const removeUserSkillMutation =
    api.document.removeUserSkillFromWork.useMutation({
      onSuccess: (result) => {
        void queryClient.document.listWorkHistory.invalidate();
        void queryClient.document.listUserSkillsForWork.invalidate();

        if (result?.skillName) {
          toast.success(
            `Removed "${result.skillName}" from this work experience`,
          );
        } else {
          toast.success("Skill removed");
        }
      },
      onError: (error) => {
        toast.error(`Failed to remove skill: ${error.message}`);
      },
    });

  // Work achievements deduplication mutation
  const deduplicateWorkAchievementsMutation =
    api.document.deduplicateAndMergeWorkAchievements.useMutation({
      onSuccess: (result) => {
        if (result.success) {
          void workHistoryQuery.refetch();
          setShowDedupePreview(null);
          setDedupePreview(null);
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      },
      onError: (error) => {
        toast.error(
          `Failed to deduplicate work achievements: ${error.message}`,
        );
      },
    });

  // Apply approved achievements mutation
  const applyApprovedAchievementsMutation =
    api.document.applyApprovedWorkAchievements.useMutation({
      onSuccess: (result) => {
        if (result.success) {
          void workHistoryQuery.refetch();
          setShowDedupePreview(null);
          setDedupePreview(null);
          toast.success(result.message);
        } else {
          toast.error("Failed to apply approved achievements");
        }
      },
      onError: (error) => {
        toast.error(`Failed to apply approved achievements: ${error.message}`);
      },
    });

  const handleEdit = (workHistory: {
    id: string;
    companyName: string;
    jobTitle: string;
    startDate: Date;
    endDate: Date | null;
  }) => {
    setEditId(workHistory.id);

    try {
      // Format dates for input fields
      const startDateStr =
        workHistory.startDate instanceof Date
          ? workHistory.startDate.toISOString().split("T")[0]
          : new Date(workHistory.startDate).toISOString().split("T")[0];

      // Check if this is a current position (no end date)
      const isCurrent = !workHistory.endDate;

      // Format end date or empty string for current positions
      const endDateStr = isCurrent
        ? ""
        : workHistory.endDate instanceof Date
          ? workHistory.endDate.toISOString().split("T")[0]
          : new Date(workHistory.endDate!).toISOString().split("T")[0];

      // Create and validate the form values using the schema
      const formData = {
        companyName: workHistory.companyName,
        jobTitle: workHistory.jobTitle,
        startDate: startDateStr,
        endDate: endDateStr,
        isCurrent,
      };

      // Parse and validate with the schema
      const validatedData = workHistoryFormSchema.parse(formData);

      // Set the validated data to state
      setEditValues(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(`Validation error: ${err.message}`);
        });
      } else {
        toast.error("Error preparing form data");
        console.error(error);
      }
    }
  };

  const validateAndSave = () => {
    if (!editId) return;

    try {
      const validatedData = workHistorySchema.parse(editValues);

      // Create mutation input object according to the API's expected types
      const mutationInput: {
        id: string;
        companyName?: string;
        jobTitle?: string;
        startDate?: string;
        endDate?: string | undefined;
      } = {
        id: editId,
        companyName: validatedData.companyName,
        jobTitle: validatedData.jobTitle,
        startDate: validatedData.startDate,
      };

      // Only add endDate if not current position
      if (!validatedData.isCurrent && validatedData.endDate) {
        mutationInput.endDate = validatedData.endDate;
      }

      updateMutation.mutate(mutationInput);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(`Validation error: ${err.message}`);
        });
      } else {
        toast.error("An unexpected error occurred");
        console.error(error);
      }
    }
  };

  const validateAndAdd = () => {
    try {
      const validatedData = workHistorySchema.parse(newWorkHistory);

      // Create mutation input object according to the API's expected types
      const mutationInput: {
        companyName: string;
        jobTitle: string;
        startDate: string;
        endDate?: string;
      } = {
        companyName: validatedData.companyName,
        jobTitle: validatedData.jobTitle,
        startDate: validatedData.startDate,
      };

      // Only add endDate if not current position
      if (!validatedData.isCurrent && validatedData.endDate) {
        mutationInput.endDate = validatedData.endDate;
      }

      createMutation.mutate(mutationInput);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(`Validation error: ${err.message}`);
        });
      } else {
        toast.error("An unexpected error occurred");
        console.error(error);
      }
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this work history entry?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleEditChange = (field: string, value: string | boolean) => {
    setEditValues({
      ...editValues,
      [field]: value,
    });
  };

  const handleNewWorkHistoryChange = (
    field: string,
    value: string | boolean,
  ) => {
    setNewWorkHistory({
      ...newWorkHistory,
      [field]: value,
    });
  };

  const handleAddSkill = (workHistoryId: string) => {
    if (!newSkill.trim()) return;

    addUserSkillMutation.mutate({
      workHistoryId,
      skillName: newSkill.trim(),
      proficiency: newSkillLevel,
    });
  };

  const handleDeleteSkill = (userSkillId: string, workHistoryId: string) => {
    removeUserSkillMutation.mutate({ userSkillId, workHistoryId });
  };

  const handleSkillInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    workHistoryId: string,
  ) => {
    // Submit on comma, tab, or enter
    if (e.key === "," || e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      handleAddSkill(workHistoryId);
    }
  };

  const handleDeduplicatePreview = (workHistoryId: string) => {
    deduplicateWorkAchievementsMutation.mutate(
      { workHistoryId, dryRun: true },
      {
        onSuccess: (result) => {
          setDedupePreview(result);
          setShowDedupePreview(workHistoryId);
        },
      },
    );
  };

  const handleDeduplicateApply = (workHistoryId: string) => {
    // Use the approved achievements from the preview instead of re-running AI
    if (!dedupePreview?.preview) {
      toast.error("No preview data available. Please try again.");
      return;
    }

    const approvedAchievements = dedupePreview.preview.map(
      (item) => item.description,
    );

    applyApprovedAchievementsMutation.mutate({
      workHistoryId,
      approvedAchievements,
    });
  };

  const handleMerge = (workHistoryId: string) => {
    setMergeInitialRecordId(workHistoryId);
    setShowMergeModal(true);
  };

  const handleMergeComplete = () => {
    void workHistoryQuery.refetch();
  };

  const workHistories = useMemo(() => {
    return workHistoryQuery.data ?? [];
  }, [workHistoryQuery.data]);

  if (workHistoryQuery.isLoading) {
    return <div className="p-4 text-center">Loading your work history...</div>;
  }

  if (workHistoryQuery.error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error loading work history: {workHistoryQuery.error.message}
      </div>
    );
  }

  // Helper function to format dates for display
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "Present";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="h-full">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Work{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            History
          </span>
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
        >
          {showAddForm ? "Cancel" : "Add Work Experience"}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 rounded-md border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
          <h3 className="mb-6 text-xl font-bold text-gray-900">
            Add New Work Experience
          </h3>
          <WorkHistoryForm
            values={newWorkHistory}
            onChange={handleNewWorkHistoryChange}
            onSubmit={validateAndAdd}
            onCancel={() => setShowAddForm(false)}
            isSubmitting={createMutation.isPending}
            submitLabel="Add"
          />
        </div>
      )}

      {workHistories.length === 0 && !showAddForm ? (
        <p className="rounded bg-gray-50 p-4 text-center text-gray-500">
          No work history found. Add your work experience to get started.
        </p>
      ) : (
        <div className="overflow-y-auto">
          {workHistories.map((work) => (
            <div
              key={work.id}
              className="mb-4 rounded border border-gray-200 p-4"
            >
              {editId === work.id ? (
                <WorkHistoryForm
                  values={editValues}
                  onChange={handleEditChange}
                  onSubmit={validateAndSave}
                  onCancel={() => setEditId(null)}
                  isSubmitting={updateMutation.isPending}
                  submitLabel="Save"
                />
              ) : (
                <div>
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-medium">{work.jobTitle}</h3>
                      <p className="text-gray-600">{work.companyName}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(work.startDate)} -{" "}
                        {formatDate(work.endDate)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <WorkHistoryDropdown
                        onEdit={() => handleEdit(work)}
                        onDelete={() => handleDelete(work.id)}
                        onCleanUp={
                          work.achievements.length > 1
                            ? () => handleDeduplicatePreview(work.id)
                            : undefined
                        }
                        onMerge={() => handleMerge(work.id)}
                        isDeleting={deleteMutation.isPending}
                        isCleaningUp={
                          deduplicateWorkAchievementsMutation.isPending
                        }
                        hasAchievements={work.achievements.length > 1}
                      />
                    </div>
                  </div>

                  {/* Display achievements if needed */}
                  {work.achievements && work.achievements.length > 0 && (
                    <div className="mt-2">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-sm font-medium">Achievements:</h4>
                      </div>
                      {/* Work Achievements Deduplication Preview Modal for this specific work history */}
                      {showDedupePreview === work.id && dedupePreview && (
                        <div className="mt-3 rounded border border-orange-200 bg-orange-50 p-3">
                          <h4 className="mb-2 text-sm font-medium text-orange-800">
                            Achievements Deduplication Preview
                          </h4>
                          <div className="mb-3 text-xs text-orange-700">
                            <p>
                              <strong>Original:</strong>{" "}
                              {dedupePreview.originalCount} •
                              <strong> Final:</strong>{" "}
                              {dedupePreview.finalCount} •
                              <strong> Duplicates removed:</strong>{" "}
                              {dedupePreview.exactDuplicatesRemoved} •
                              <strong> Groups merged:</strong>{" "}
                              {dedupePreview.similarGroupsMerged}
                            </p>
                          </div>

                          {dedupePreview.preview &&
                            dedupePreview.preview.length > 0 && (
                              <div className="mb-3">
                                <h5 className="mb-2 text-xs font-medium text-orange-800">
                                  Preview of cleaned achievements:
                                </h5>
                                <div className="max-h-40 space-y-1 overflow-y-auto">
                                  {dedupePreview.preview.map(
                                    (item, index: number) => (
                                      <div
                                        key={index}
                                        className="rounded border bg-white p-2 text-xs"
                                      >
                                        <span className="text-gray-600">
                                          {index + 1}.
                                        </span>{" "}
                                        {item.description}
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => {
                                setShowDedupePreview(null);
                                setDedupePreview(null);
                              }}
                              className="rounded bg-gray-300 px-2 py-1 text-xs hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDeduplicateApply(work.id)}
                              disabled={
                                applyApprovedAchievementsMutation.isPending
                              }
                              className="rounded bg-orange-500 px-2 py-1 text-xs text-white hover:bg-orange-600 disabled:bg-orange-300"
                            >
                              {applyApprovedAchievementsMutation.isPending
                                ? "Applying..."
                                : "Apply Changes"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <ul className="ml-4 list-disc text-sm">
                    {work.achievements.map((achievement) => (
                      <li key={achievement.id}>{achievement.description}</li>
                    ))}
                  </ul>

                  {/* Skills section with modern UserSkill system */}
                  <div className="mt-3">
                    <h4 className="mb-2 text-sm font-medium">Skills:</h4>
                    <div className="flex flex-wrap gap-1">
                      {/* Display modern UserSkills */}
                      <UserSkillsForWork
                        workHistoryId={work.id}
                        onDeleteSkill={(userSkillId) =>
                          handleDeleteSkill(userSkillId, work.id)
                        }
                      />

                      {/* Input field for adding new skills */}
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={
                            activeWorkHistoryId === work.id ? newSkill : ""
                          }
                          onChange={(e) => {
                            setNewSkill(e.target.value);
                            setActiveWorkHistoryId(work.id);
                          }}
                          onFocus={() => setActiveWorkHistoryId(work.id)}
                          onKeyDown={(e) => handleSkillInputKeyDown(e, work.id)}
                          placeholder="Add skill..."
                          className="w-32 rounded border border-gray-200 px-2 py-1 text-xs"
                        />
                        <SkillLevelDropdown
                          value={
                            activeWorkHistoryId === work.id
                              ? newSkillLevel
                              : "INTERMEDIATE"
                          }
                          onChange={(level) => {
                            setNewSkillLevel(level);
                            setActiveWorkHistoryId(work.id);
                          }}
                          disabled={addUserSkillMutation.isPending}
                        />
                        <button
                          onClick={() => handleAddSkill(work.id)}
                          disabled={
                            !newSkill.trim() || addUserSkillMutation.isPending
                          }
                          className="rounded bg-blue-500 px-2 py-1 text-xs text-white disabled:bg-blue-300"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Merge Utility Modal */}
      {showMergeModal && mergeInitialRecordId && (
        <MergeUtilityModal
          isOpen={showMergeModal}
          onClose={() => setShowMergeModal(false)}
          initialRecordId={mergeInitialRecordId}
          workHistories={workHistories}
          onMergeComplete={handleMergeComplete}
        />
      )}
    </div>
  );
}
