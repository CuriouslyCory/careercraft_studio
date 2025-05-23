"use client";

import { useState } from "react";
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
  const [activeWorkHistoryId, setActiveWorkHistoryId] = useState<string | null>(
    null,
  );

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
      void queryClient.document.listWorkHistory.invalidate();
      setNewSkill("");
      toast.success("Skill added");
    },
    onError: (error) => {
      toast.error(`Failed to add skill: ${error.message}`);
    },
  });

  const removeUserSkillMutation =
    api.document.removeUserSkillFromWork.useMutation({
      onSuccess: () => {
        void queryClient.document.listWorkHistory.invalidate();
        toast.success("Skill removed");
      },
      onError: (error) => {
        toast.error(`Failed to remove skill: ${error.message}`);
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
    });
  };

  const handleDeleteSkill = (userSkillId: string) => {
    removeUserSkillMutation.mutate({ userSkillId });
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

  const workHistories = workHistoryQuery.data ?? [];

  // Helper function to format dates for display
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "Present";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Work History</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded bg-blue-500 px-3 py-1 text-sm text-white"
        >
          {showAddForm ? "Cancel" : "Add Work Experience"}
        </button>
      </div>

      {showAddForm && (
        <WorkHistoryForm
          values={newWorkHistory}
          onChange={handleNewWorkHistoryChange}
          onSubmit={validateAndAdd}
          onCancel={() => setShowAddForm(false)}
          isSubmitting={createMutation.isPending}
          submitLabel="Add"
        />
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
                      <button
                        onClick={() => handleEdit(work)}
                        className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(work.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded bg-red-100 px-2 py-1 text-xs text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Display achievements if needed */}
                  {work.achievements && work.achievements.length > 0 && (
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Achievements:</h4>
                      <ul className="ml-4 list-disc text-sm">
                        {work.achievements.map((achievement) => (
                          <li key={achievement.id}>
                            {achievement.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Skills section with modern UserSkill system */}
                  <div className="mt-3">
                    <h4 className="mb-2 text-sm font-medium">Skills:</h4>
                    <div className="flex flex-wrap gap-1">
                      {/* Display modern UserSkills */}
                      <UserSkillsForWork
                        workHistoryId={work.id}
                        onDeleteSkill={handleDeleteSkill}
                      />

                      {/* Input field for adding new skills */}
                      <div className="flex items-center">
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
                        <button
                          onClick={() => handleAddSkill(work.id)}
                          disabled={
                            !newSkill.trim() || addUserSkillMutation.isPending
                          }
                          className="ml-1 rounded bg-blue-500 px-2 py-1 text-xs text-white disabled:bg-blue-300"
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
    </div>
  );
}
