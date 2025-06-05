"use client";

import React from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { type ProficiencyLevel, type SkillSource } from "@prisma/client";
import { toast } from "sonner";
import type { RouterOutputs } from "~/trpc/react";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";

// Export the type so it can be reused in other components
export type UserSkillData = RouterOutputs["userSkills"]["list"][number];

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

interface SkillModalProps {
  mode: "add" | "edit";
  onClose: () => void;
  onSuccess: () => void;
  missingSkillName?: string;
  existingSkill?: UserSkillData;
}

// Type for form values
type SkillFormValues = {
  skillName: string;
  proficiency: ProficiencyLevel;
  yearsExperience: string;
  workHistoryIds: string[];
  source: SkillSource;
  notes: string;
};

/**
 * Centralized skill modal for adding and editing user skills
 * Supports comprehensive skill management with work history association
 */
export function SkillModal({
  mode,
  onClose,
  onSuccess,
  missingSkillName = "",
  existingSkill,
}: SkillModalProps) {
  // Initialize default values based on mode
  const getDefaultValues = (): SkillFormValues => {
    return {
      skillName:
        mode === "edit" ? (existingSkill?.skill.name ?? "") : missingSkillName,
      proficiency:
        mode === "edit"
          ? (existingSkill?.proficiency ?? "INTERMEDIATE")
          : "INTERMEDIATE",
      yearsExperience:
        mode === "edit"
          ? (existingSkill?.yearsExperience?.toString() ?? "")
          : "",
      workHistoryIds:
        mode === "edit" && existingSkill?.workHistoryId
          ? [existingSkill.workHistoryId]
          : [],
      source:
        mode === "edit"
          ? (existingSkill?.source ?? "WORK_EXPERIENCE")
          : "WORK_EXPERIENCE",
      notes: mode === "edit" ? (existingSkill?.notes ?? "") : "",
    };
  };

  // Fetch user's work history for the multiselect
  const workHistoryQuery = api.document.listWorkHistory.useQuery();

  // Add skill mutation
  const addSkillMutation = api.userSkills.add.useMutation({
    onSuccess: () => {
      toast.success("Skill added successfully");
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to add skill: ${error.message}`);
    },
  });

  // Update skill mutation
  const updateSkillMutation = api.userSkills.update.useMutation({
    onSuccess: () => {
      toast.success("Skill updated successfully");
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to update skill: ${error.message}`);
    },
  });

  // TanStack Form
  const form = useForm({
    defaultValues: getDefaultValues(),
    onSubmit: async ({ value }) => {
      // If work histories are selected and source is WORK_EXPERIENCE,
      // we'll just use the first one for simplicity (could be enhanced later)
      const workHistoryId =
        value.workHistoryIds.length > 0 && value.source === "WORK_EXPERIENCE"
          ? value.workHistoryIds[0]
          : undefined;

      if (mode === "add") {
        addSkillMutation.mutate({
          skillName: value.skillName.trim(),
          proficiency: value.proficiency,
          yearsExperience: value.yearsExperience
            ? parseFloat(value.yearsExperience)
            : undefined,
          source: value.source,
          notes: value.notes.trim() || undefined,
          workHistoryId,
        });
      } else if (mode === "edit" && existingSkill) {
        updateSkillMutation.mutate({
          userSkillId: existingSkill.id,
          proficiency: value.proficiency,
          yearsExperience: value.yearsExperience
            ? parseFloat(value.yearsExperience)
            : undefined,
          source: value.source,
          notes: value.notes.trim() || undefined,
          workHistoryId,
        });
      }
    },
  });

  const handleWorkHistoryToggle = (
    workHistoryId: string,
    currentIds: string[],
  ) => {
    return currentIds.includes(workHistoryId)
      ? currentIds.filter((id) => id !== workHistoryId)
      : [...currentIds, workHistoryId];
  };

  const proficiencyOptions: { value: ProficiencyLevel; label: string }[] = [
    { value: "BEGINNER", label: "Beginner" },
    { value: "INTERMEDIATE", label: "Intermediate" },
    { value: "ADVANCED", label: "Advanced" },
    { value: "EXPERT", label: "Expert" },
  ];

  const sourceOptions: { value: SkillSource; label: string }[] = [
    { value: "WORK_EXPERIENCE", label: "Work Experience" },
    { value: "EDUCATION", label: "Education" },
    { value: "CERTIFICATION", label: "Certification" },
    { value: "PERSONAL_PROJECT", label: "Personal Project" },
    { value: "TRAINING", label: "Training" },
    { value: "OTHER", label: "Other" },
  ];

  const isLoading = addSkillMutation.isPending || updateSkillMutation.isPending;
  const error = addSkillMutation.error ?? updateSkillMutation.error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {mode === "add" ? "Add Skill" : "Edit Skill"}
          </h3>
          <Button variant="outline" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          {/* Skill Name - only editable in add mode */}
          <form.Field
            name="skillName"
            validators={{
              onChange: ({ value }: { value: string }) =>
                mode === "add" && !value.trim()
                  ? "Skill name is required"
                  : undefined,
            }}
          >
            {(field) => (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Skill Name *
                </label>
                {mode === "add" ? (
                  <input
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., React, Python, Project Management"
                  />
                ) : (
                  <div className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
                    {field.state.value}
                  </div>
                )}
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>

          {/* Proficiency Level */}
          <form.Field name="proficiency">
            {(field) => (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Proficiency Level *
                </label>
                <select
                  value={field.state.value}
                  onChange={(e) =>
                    field.handleChange(e.target.value as ProficiencyLevel)
                  }
                  onBlur={field.handleBlur}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                >
                  {proficiencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>

          {/* Years of Experience */}
          <form.Field name="yearsExperience">
            {(field) => (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Years of Experience
                </label>
                <input
                  type="number"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., 2.5"
                  min="0"
                  max="50"
                  step="0.5"
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>

          {/* Source */}
          <form.Field name="source">
            {(field) => (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  How did you learn this skill? *
                </label>
                <select
                  value={field.state.value}
                  onChange={(e) =>
                    field.handleChange(e.target.value as SkillSource)
                  }
                  onBlur={field.handleBlur}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                >
                  {sourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>

          {/* Work History Selection (only show if source is WORK_EXPERIENCE) */}
          <form.Subscribe selector={(state) => state.values.source}>
            {(source) =>
              source === "WORK_EXPERIENCE" &&
              workHistoryQuery.data &&
              workHistoryQuery.data.length > 0 ? (
                <form.Field name="workHistoryIds">
                  {(field) => (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Select Jobs Where You Used This Skill
                      </label>
                      <div className="max-h-32 overflow-y-auto rounded-md border border-gray-300 p-2">
                        {workHistoryQuery.data.map((job) => (
                          <label
                            key={job.id}
                            className="flex items-center space-x-2 p-1"
                          >
                            <input
                              type="checkbox"
                              checked={field.state.value.includes(job.id)}
                              onChange={() =>
                                field.handleChange(
                                  handleWorkHistoryToggle(
                                    job.id,
                                    field.state.value,
                                  ),
                                )
                              }
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">
                              {job.jobTitle} at {job.companyName}
                            </span>
                          </label>
                        ))}
                      </div>
                      <FieldInfo field={field} />
                    </div>
                  )}
                </form.Field>
              ) : null
            }
          </form.Subscribe>

          {/* Notes */}
          <form.Field name="notes">
            {(field) => (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notes (Optional)
                </label>
                <textarea
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Additional context about this skill..."
                  rows={2}
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>

          {/* Submit Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!canSubmit || isLoading}
                >
                  {isLoading || isSubmitting
                    ? mode === "add"
                      ? "Adding..."
                      : "Updating..."
                    : mode === "add"
                      ? "Add Skill"
                      : "Update Skill"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error.message}
          </div>
        )}
      </div>
    </div>
  );
}
