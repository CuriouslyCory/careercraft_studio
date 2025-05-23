"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { type ProficiencyLevel, type SkillSource } from "@prisma/client";

interface AddSkillModalProps {
  onClose: () => void;
  onSkillAdded: () => void;
  missingSkillName?: string;
}

export function AddSkillModal({
  onClose,
  onSkillAdded,
  missingSkillName = "",
}: AddSkillModalProps) {
  const [skillName, setSkillName] = useState(missingSkillName);
  const [proficiency, setProficiency] =
    useState<ProficiencyLevel>("INTERMEDIATE");
  const [yearsExperience, setYearsExperience] = useState<string>("");
  const [selectedWorkHistories, setSelectedWorkHistories] = useState<string[]>(
    [],
  );
  const [source, setSource] = useState<SkillSource>("WORK_EXPERIENCE");
  const [notes, setNotes] = useState("");

  // Fetch user's work history for the multiselect
  const workHistoryQuery = api.document.listWorkHistory.useQuery();

  // Add skill mutation
  const addSkillMutation = api.userSkills.add.useMutation({
    onSuccess: () => {
      onSkillAdded();
      onClose();
    },
    onError: (error) => {
      console.error("Error adding skill:", error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!skillName.trim()) {
      return;
    }

    // If work histories are selected and source is WORK_EXPERIENCE,
    // we'll just use the first one for simplicity (could be enhanced later)
    const workHistoryId =
      selectedWorkHistories.length > 0 && source === "WORK_EXPERIENCE"
        ? selectedWorkHistories[0]
        : undefined;

    addSkillMutation.mutate({
      skillName: skillName.trim(),
      proficiency,
      yearsExperience: yearsExperience
        ? parseFloat(yearsExperience)
        : undefined,
      source,
      notes: notes.trim() || undefined,
      workHistoryId,
    });
  };

  const handleWorkHistoryToggle = (workHistoryId: string) => {
    setSelectedWorkHistories((prev) =>
      prev.includes(workHistoryId)
        ? prev.filter((id) => id !== workHistoryId)
        : [...prev, workHistoryId],
    );
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add Skill</h3>
          <Button variant="outline" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Skill Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Skill Name *
            </label>
            <input
              type="text"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="e.g., React, Python, Project Management"
              required
            />
          </div>

          {/* Proficiency Level */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Proficiency Level *
            </label>
            <select
              value={proficiency}
              onChange={(e) =>
                setProficiency(e.target.value as ProficiencyLevel)
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              {proficiencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Years of Experience */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Years of Experience
            </label>
            <input
              type="number"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="e.g., 2.5"
              min="0"
              max="50"
              step="0.5"
            />
          </div>

          {/* Source */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              How did you learn this skill? *
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as SkillSource)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Work History Selection (only show if source is WORK_EXPERIENCE) */}
          {source === "WORK_EXPERIENCE" &&
            workHistoryQuery.data &&
            workHistoryQuery.data.length > 0 && (
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
                        checked={selectedWorkHistories.includes(job.id)}
                        onChange={() => handleWorkHistoryToggle(job.id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">
                        {job.jobTitle} at {job.companyName}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Additional context about this skill..."
              rows={2}
            />
          </div>

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
            <Button
              type="submit"
              className="flex-1"
              disabled={addSkillMutation.isPending || !skillName.trim()}
            >
              {addSkillMutation.isPending ? "Adding..." : "Add Skill"}
            </Button>
          </div>
        </form>

        {/* Error Display */}
        {addSkillMutation.error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {addSkillMutation.error.message}
          </div>
        )}
      </div>
    </div>
  );
}
