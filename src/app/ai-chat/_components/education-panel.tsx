"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";

// Import the EducationType enum from Prisma
import { EducationType } from "@prisma/client";

// Validation schema with conditional validation
const educationSchema = z
  .object({
    type: z.nativeEnum(EducationType),
    institutionName: z.string(),
    degreeOrCertName: z.string().optional(),
    description: z.string().optional(),
    dateCompleted: z.string().optional(),
  })
  .refine(
    (data) => {
      // Institution name is required unless it's CPD or OTHER
      if (
        data.type !== "CONTINUOUS_PROFESSIONAL_DEVELOPMENT" &&
        data.type !== "OTHER" &&
        !data.institutionName.trim()
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Institution name is required",
      path: ["institutionName"],
    },
  );

type EducationFormValues = z.infer<typeof educationSchema>;

// Field info component for displaying validation errors
function FieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {field.state.meta.isTouched && !field.state.meta.isValid ? (
        <div className="mt-1 text-sm text-red-600">
          {field.state.meta.errors.join(", ")}
        </div>
      ) : null}
      {field.state.meta.isValidating ? (
        <div className="mt-1 text-sm text-blue-600">Validating...</div>
      ) : null}
    </>
  );
}

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
        description: newData.description ?? null,
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
      addForm.reset();

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

  // TanStack Form for adding new education
  const addForm = useForm({
    defaultValues: emptyEducation,
    onSubmit: async ({ value }) => {
      // Validate with Zod
      try {
        educationSchema.parse(value);
        createMutation.mutate(value);
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach((err) => {
            toast.error(`${String(err.path)}: ${err.message}`);
          });
        } else {
          toast.error("Failed to validate input");
        }
      }
    },
  });

  // TanStack Form for editing education
  const editForm = useForm({
    defaultValues: emptyEducation,
    onSubmit: async ({ value }) => {
      if (!editId) return;

      // Validate with Zod
      try {
        educationSchema.parse(value);
        updateMutation.mutate({
          id: editId,
          ...value,
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
    },
  });

  const handleEdit = (education: {
    id: string;
    type: EducationType;
    institutionName: string;
    degreeOrCertName: string | null;
    description: string | null;
    dateCompleted: Date | null;
  }) => {
    setEditId(education.id);
    // Reset and populate the edit form with the education data
    editForm.reset();
    editForm.setFieldValue("type", education.type);
    editForm.setFieldValue("institutionName", education.institutionName);
    editForm.setFieldValue(
      "degreeOrCertName",
      education.degreeOrCertName ?? "",
    );
    editForm.setFieldValue("description", education.description ?? "");
    editForm.setFieldValue(
      "dateCompleted",
      education.dateCompleted
        ? education.dateCompleted.toISOString().split("T")[0]
        : "",
    );
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

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void addForm.handleSubmit();
            }}
          >
            <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <addForm.Field
                name="type"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Education type is required" : undefined,
                }}
              >
                {(field) => (
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Type
                    </label>
                    <select
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value as EducationType);
                      }}
                      onBlur={field.handleBlur}
                      className="w-full rounded border p-2"
                    >
                      {Object.values(EducationType).map((type) => (
                        <option key={type} value={type}>
                          {formatEducationType(type)}
                        </option>
                      ))}
                    </select>
                    <FieldInfo field={field} />
                  </div>
                )}
              </addForm.Field>

              <addForm.Subscribe selector={(state) => state.values.type}>
                {(selectedType) => (
                  <addForm.Field
                    name="institutionName"
                    validators={{
                      onChange: ({ value }) =>
                        selectedType !==
                          "CONTINUOUS_PROFESSIONAL_DEVELOPMENT" &&
                        selectedType !== "OTHER" &&
                        !value.trim()
                          ? "Institution name is required"
                          : undefined,
                    }}
                  >
                    {(field) => (
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Institution Name{" "}
                          {selectedType !==
                            "CONTINUOUS_PROFESSIONAL_DEVELOPMENT" &&
                          selectedType !== "OTHER"
                            ? "*"
                            : "(Optional)"}
                        </label>
                        <input
                          type="text"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="w-full rounded border p-2"
                          placeholder={
                            selectedType ===
                              "CONTINUOUS_PROFESSIONAL_DEVELOPMENT" ||
                            selectedType === "OTHER"
                              ? "Enter institution name (optional)"
                              : "Enter institution name"
                          }
                        />
                        <FieldInfo field={field} />
                      </div>
                    )}
                  </addForm.Field>
                )}
              </addForm.Subscribe>

              <addForm.Subscribe selector={(state) => state.values.type}>
                {(selectedType) => (
                  <addForm.Field name="degreeOrCertName">
                    {(field) => (
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Degree/Certification Name{" "}
                          {selectedType ===
                            "CONTINUOUS_PROFESSIONAL_DEVELOPMENT" ||
                          selectedType === "OTHER"
                            ? "(Optional)"
                            : ""}
                        </label>
                        <input
                          type="text"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="w-full rounded border p-2"
                          placeholder={
                            selectedType ===
                              "CONTINUOUS_PROFESSIONAL_DEVELOPMENT" ||
                            selectedType === "OTHER"
                              ? "Enter degree or certification name (optional)"
                              : "Enter degree or certification name (optional)"
                          }
                        />
                        <FieldInfo field={field} />
                      </div>
                    )}
                  </addForm.Field>
                )}
              </addForm.Subscribe>

              {/* Date Completed - only show if type is not CPD or OTHER */}
              <addForm.Subscribe selector={(state) => state.values.type}>
                {(type) =>
                  type !== "CONTINUOUS_PROFESSIONAL_DEVELOPMENT" &&
                  type !== "OTHER" ? (
                    <addForm.Field name="dateCompleted">
                      {(field) => (
                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            Date Completed
                          </label>
                          <input
                            type="date"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            className="w-full rounded border p-2"
                          />
                          <FieldInfo field={field} />
                        </div>
                      )}
                    </addForm.Field>
                  ) : null
                }
              </addForm.Subscribe>

              <addForm.Field name="description">
                {(field) => (
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium">
                      Description
                    </label>
                    <textarea
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="w-full rounded border p-2"
                      rows={3}
                      placeholder="Enter description or field of study"
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              </addForm.Field>
            </div>

            <div className="flex justify-end">
              <addForm.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <button
                    type="submit"
                    disabled={!canSubmit || createMutation.isPending}
                    className="rounded bg-blue-500 px-3 py-1 text-sm text-white disabled:bg-blue-300"
                  >
                    {createMutation.isPending || isSubmitting
                      ? "Adding..."
                      : "Add Education"}
                  </button>
                )}
              </addForm.Subscribe>
            </div>
          </form>
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
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void editForm.handleSubmit();
                  }}
                >
                  <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <editForm.Field
                      name="type"
                      validators={{
                        onChange: ({ value }) =>
                          !value ? "Education type is required" : undefined,
                      }}
                    >
                      {(field) => (
                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            Type
                          </label>
                          <select
                            value={field.state.value}
                            onChange={(e) => {
                              field.handleChange(
                                e.target.value as EducationType,
                              );
                            }}
                            onBlur={field.handleBlur}
                            className="w-full rounded border p-2"
                          >
                            {Object.values(EducationType).map((type) => (
                              <option key={type} value={type}>
                                {formatEducationType(type)}
                              </option>
                            ))}
                          </select>
                          <FieldInfo field={field} />
                        </div>
                      )}
                    </editForm.Field>

                    <editForm.Subscribe selector={(state) => state.values.type}>
                      {(selectedType) => (
                        <editForm.Field
                          name="institutionName"
                          validators={{
                            onChange: ({ value }) =>
                              selectedType !==
                                "CONTINUOUS_PROFESSIONAL_DEVELOPMENT" &&
                              selectedType !== "OTHER" &&
                              !value.trim()
                                ? "Institution name is required"
                                : undefined,
                          }}
                        >
                          {(field) => (
                            <div>
                              <label className="mb-1 block text-sm font-medium">
                                Institution Name{" "}
                                {selectedType !==
                                  "CONTINUOUS_PROFESSIONAL_DEVELOPMENT" &&
                                selectedType !== "OTHER"
                                  ? "*"
                                  : "(Optional)"}
                              </label>
                              <input
                                type="text"
                                value={field.state.value}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                onBlur={field.handleBlur}
                                className="w-full rounded border p-2"
                                placeholder={
                                  selectedType ===
                                    "CONTINUOUS_PROFESSIONAL_DEVELOPMENT" ||
                                  selectedType === "OTHER"
                                    ? "Enter institution name (optional)"
                                    : "Enter institution name"
                                }
                              />
                              <FieldInfo field={field} />
                            </div>
                          )}
                        </editForm.Field>
                      )}
                    </editForm.Subscribe>

                    <editForm.Subscribe selector={(state) => state.values.type}>
                      {(selectedType) => (
                        <editForm.Field name="degreeOrCertName">
                          {(field) => (
                            <div>
                              <label className="mb-1 block text-sm font-medium">
                                Degree/Certification Name{" "}
                                {selectedType ===
                                  "CONTINUOUS_PROFESSIONAL_DEVELOPMENT" ||
                                selectedType === "OTHER"
                                  ? "(Optional)"
                                  : ""}
                              </label>
                              <input
                                type="text"
                                value={field.state.value}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                onBlur={field.handleBlur}
                                className="w-full rounded border p-2"
                                placeholder={
                                  selectedType ===
                                    "CONTINUOUS_PROFESSIONAL_DEVELOPMENT" ||
                                  selectedType === "OTHER"
                                    ? "Enter degree or certification name (optional)"
                                    : "Enter degree or certification name (optional)"
                                }
                              />
                              <FieldInfo field={field} />
                            </div>
                          )}
                        </editForm.Field>
                      )}
                    </editForm.Subscribe>

                    {/* Date Completed - only show if type is not CPD or OTHER */}
                    <editForm.Subscribe selector={(state) => state.values.type}>
                      {(type) =>
                        type !== "CONTINUOUS_PROFESSIONAL_DEVELOPMENT" &&
                        type !== "OTHER" ? (
                          <editForm.Field name="dateCompleted">
                            {(field) => (
                              <div>
                                <label className="mb-1 block text-sm font-medium">
                                  Date Completed
                                </label>
                                <input
                                  type="date"
                                  value={field.state.value}
                                  onChange={(e) =>
                                    field.handleChange(e.target.value)
                                  }
                                  onBlur={field.handleBlur}
                                  className="w-full rounded border p-2"
                                />
                                <FieldInfo field={field} />
                              </div>
                            )}
                          </editForm.Field>
                        ) : null
                      }
                    </editForm.Subscribe>

                    <editForm.Field name="description">
                      {(field) => (
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-sm font-medium">
                            Description
                          </label>
                          <textarea
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            className="w-full rounded border p-2"
                            rows={3}
                          />
                          <FieldInfo field={field} />
                        </div>
                      )}
                    </editForm.Field>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditId(null)}
                      className="rounded bg-gray-300 px-2 py-1 text-xs"
                    >
                      Cancel
                    </button>
                    <editForm.Subscribe
                      selector={(state) => [
                        state.canSubmit,
                        state.isSubmitting,
                      ]}
                    >
                      {([canSubmit, isSubmitting]) => (
                        <button
                          type="submit"
                          disabled={!canSubmit || updateMutation.isPending}
                          className="rounded bg-green-500 px-2 py-1 text-xs text-white"
                        >
                          {updateMutation.isPending || isSubmitting
                            ? "Saving..."
                            : "Save"}
                        </button>
                      )}
                    </editForm.Subscribe>
                  </div>
                </form>
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
