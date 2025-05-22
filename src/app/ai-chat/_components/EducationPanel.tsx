"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { z } from "zod";

// Import the EducationType enum from Prisma
import { EducationType } from "@prisma/client";

// Validation schema
const educationSchema = z.object({
  type: z.nativeEnum(EducationType),
  institutionName: z.string().min(1, "Institution name is required"),
  degreeOrCertName: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  dateCompleted: z.string().optional(),
});

type EducationFormValues = z.infer<typeof educationSchema>;

export function EducationPanel() {
  const [editId, setEditId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const emptyEducation: EducationFormValues = {
    type: EducationType.OTHER,
    institutionName: "",
    degreeOrCertName: "",
    description: "",
    dateCompleted: "",
  };

  const [editValues, setEditValues] =
    useState<EducationFormValues>(emptyEducation);
  const [newEducation, setNewEducation] =
    useState<EducationFormValues>(emptyEducation);

  const queryClient = api.useUtils();
  const educationQuery = api.document.listEducation.useQuery();

  // Update mutation
  const updateMutation = api.document.updateEducation.useMutation({
    onSuccess: () => {
      void educationQuery.refetch();
      setEditId(null);
      toast.success("Education updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update education: ${error.message}`);
    },
  });

  // Delete mutation with optimistic updates
  const deleteMutation = api.document.deleteEducation.useMutation({
    onMutate: async (deleteData) => {
      // Cancel any outgoing refetches
      await queryClient.document.listEducation.cancel();

      // Save the current state
      const previousEducation = educationQuery.data ?? [];

      // Optimistically update the UI
      queryClient.document.listEducation.setData(undefined, (old) => {
        return old ? old.filter((edu) => edu.id !== deleteData.id) : [];
      });

      // Return the previous state in case we need to revert
      return { previousEducation };
    },
    onError: (err, _deleteData, context) => {
      // If the mutation fails, restore the previous data
      if (context?.previousEducation) {
        queryClient.document.listEducation.setData(
          undefined,
          context.previousEducation,
        );
      }
      toast.error(`Failed to delete education: ${err.message}`);
    },
    onSettled: (data, error) => {
      // Sync with server
      void queryClient.document.listEducation.invalidate();

      // Show success toast if no error
      if (!error) {
        toast.success("Education deleted successfully");
      }
    },
  });

  // Create mutation with optimistic updates
  const createMutation = api.document.createEducation.useMutation({
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.document.listEducation.cancel();

      // Save the current state
      const previousEducation = educationQuery.data ?? [];

      // Create a temporary ID for the optimistic update
      const tempId = `temp-${Date.now()}`;

      // Get userId from an existing record if available, or use a placeholder
      const userId =
        previousEducation.length > 0 && previousEducation[0]?.userId
          ? previousEducation[0].userId
          : "temp-user-id";

      // Build the new education entry with the temporary ID
      const optimisticEntry = {
        id: tempId,
        userId,
        type: newData.type,
        institutionName: newData.institutionName,
        degreeOrCertName: newData.degreeOrCertName ?? null,
        description: newData.description,
        dateCompleted: newData.dateCompleted
          ? new Date(newData.dateCompleted)
          : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Optimistically update the UI with the new entry
      queryClient.document.listEducation.setData(undefined, (old) => {
        return old ? [optimisticEntry, ...old] : [optimisticEntry];
      });

      // Hide the form and reset the form data
      setShowAddForm(false);
      setNewEducation(emptyEducation);

      // Return the previous state in case we need to revert
      return { previousEducation };
    },
    onError: (err, _newData, context) => {
      // If the mutation fails, restore the previous data
      if (context?.previousEducation) {
        queryClient.document.listEducation.setData(
          undefined,
          context.previousEducation,
        );
      }
      toast.error(`Failed to add education: ${err.message}`);
    },
    onSettled: (data, error) => {
      // Sync with server
      void queryClient.document.listEducation.invalidate();

      // Show success toast if no error
      if (!error) {
        toast.success("Education added successfully");
      }
    },
  });

  const handleEdit = (education: {
    id: string;
    type: EducationType;
    institutionName: string;
    degreeOrCertName: string | null;
    description: string;
    dateCompleted: Date | null;
  }) => {
    setEditId(education.id);
    setEditValues({
      type: education.type,
      institutionName: education.institutionName,
      degreeOrCertName: education.degreeOrCertName ?? "",
      description: education.description,
      dateCompleted: education.dateCompleted
        ? education.dateCompleted.toISOString().split("T")[0]
        : "",
    });
  };

  const handleEditChange = (
    field: keyof EducationFormValues,
    value: string,
  ) => {
    setEditValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNewEducationChange = (
    field: keyof EducationFormValues,
    value: string,
  ) => {
    setNewEducation((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateAndSave = () => {
    if (!editId) return;

    try {
      // Validate the input
      educationSchema.parse(editValues);

      updateMutation.mutate({
        id: editId,
        ...editValues,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(`${String(err.path)}: ${err.message}`);
        });
      } else {
        toast.error("Failed to validate input");
      }
    }
  };

  const validateAndAdd = () => {
    try {
      // Validate the input
      educationSchema.parse(newEducation);

      createMutation.mutate(newEducation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(`${String(err.path)}: ${err.message}`);
        });
      } else {
        toast.error("Failed to validate input");
      }
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this education entry?")) {
      deleteMutation.mutate({ id });
    }
  };

  // Format education type for display
  const formatEducationType = (type: EducationType): string => {
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (educationQuery.isLoading) {
    return <div className="p-4 text-center">Loading your education...</div>;
  }

  if (educationQuery.error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error loading education: {educationQuery.error.message}
      </div>
    );
  }

  const education = educationQuery.data ?? [];

  return (
    <div className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Education</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded bg-blue-500 px-3 py-1 text-sm text-white"
        >
          {showAddForm ? "Cancel" : "Add Education"}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 rounded border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 text-lg font-medium">Add New Education</h3>

          <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <select
                value={newEducation.type}
                onChange={(e) => {
                  // Properly cast string to EducationType
                  const selectedType = e.target
                    .value as keyof typeof EducationType;
                  handleNewEducationChange("type", EducationType[selectedType]);
                }}
                className="w-full rounded border p-2"
              >
                {Object.values(EducationType).map((type) => (
                  <option key={type} value={type}>
                    {formatEducationType(type)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Institution Name
              </label>
              <input
                type="text"
                value={newEducation.institutionName}
                onChange={(e) =>
                  handleNewEducationChange("institutionName", e.target.value)
                }
                className="w-full rounded border p-2"
                placeholder="Enter institution name"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Degree/Certification Name
              </label>
              <input
                type="text"
                value={newEducation.degreeOrCertName}
                onChange={(e) =>
                  handleNewEducationChange("degreeOrCertName", e.target.value)
                }
                className="w-full rounded border p-2"
                placeholder="Enter degree or certification name (optional)"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Date Completed
              </label>
              <input
                type="date"
                value={newEducation.dateCompleted}
                onChange={(e) =>
                  handleNewEducationChange("dateCompleted", e.target.value)
                }
                className="w-full rounded border p-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">
                Description
              </label>
              <textarea
                value={newEducation.description}
                onChange={(e) =>
                  handleNewEducationChange("description", e.target.value)
                }
                className="w-full rounded border p-2"
                rows={3}
                placeholder="Enter description or field of study"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={validateAndAdd}
              disabled={createMutation.isPending}
              className="rounded bg-blue-500 px-3 py-1 text-sm text-white disabled:bg-blue-300"
            >
              {createMutation.isPending ? "Adding..." : "Add Education"}
            </button>
          </div>
        </div>
      )}

      {education.length === 0 && !showAddForm ? (
        <p className="rounded bg-gray-50 p-4 text-center text-gray-500">
          No education entries found. Add your education to get started.
        </p>
      ) : (
        <div className="overflow-y-auto">
          {education.map((edu) => (
            <div
              key={edu.id}
              className="mb-4 rounded border border-gray-200 p-4"
            >
              {editId === edu.id ? (
                <div>
                  <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Type
                      </label>
                      <select
                        value={editValues.type}
                        onChange={(e) => {
                          // Properly cast string to EducationType
                          const selectedType = e.target
                            .value as keyof typeof EducationType;
                          handleEditChange("type", EducationType[selectedType]);
                        }}
                        className="w-full rounded border p-2"
                      >
                        {Object.values(EducationType).map((type) => (
                          <option key={type} value={type}>
                            {formatEducationType(type)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Institution Name
                      </label>
                      <input
                        type="text"
                        value={editValues.institutionName}
                        onChange={(e) =>
                          handleEditChange("institutionName", e.target.value)
                        }
                        className="w-full rounded border p-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Degree/Certification Name
                      </label>
                      <input
                        type="text"
                        value={editValues.degreeOrCertName}
                        onChange={(e) =>
                          handleEditChange("degreeOrCertName", e.target.value)
                        }
                        className="w-full rounded border p-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Date Completed
                      </label>
                      <input
                        type="date"
                        value={editValues.dateCompleted}
                        onChange={(e) =>
                          handleEditChange("dateCompleted", e.target.value)
                        }
                        className="w-full rounded border p-2"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium">
                        Description
                      </label>
                      <textarea
                        value={editValues.description}
                        onChange={(e) =>
                          handleEditChange("description", e.target.value)
                        }
                        className="w-full rounded border p-2"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setEditId(null)}
                      className="rounded bg-gray-300 px-2 py-1 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={validateAndSave}
                      disabled={updateMutation.isPending}
                      className="rounded bg-green-500 px-2 py-1 text-xs text-white"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-medium">
                        {edu.institutionName}
                      </h3>
                      {edu.degreeOrCertName && (
                        <p className="text-gray-600">{edu.degreeOrCertName}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        {formatEducationType(edu.type)}
                        {edu.dateCompleted &&
                          ` • Completed: ${new Date(edu.dateCompleted).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(edu)}
                        className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(edu.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded bg-red-100 px-2 py-1 text-xs text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-sm whitespace-pre-wrap">
                    {edu.description}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
