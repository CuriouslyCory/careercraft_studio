"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { SkillModal, type UserSkillData } from "./skill-modal";
import { toast } from "sonner";

export function UserSkillsPanel() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<UserSkillData | null>(null);

  // Queries
  const userSkillsQuery = api.userSkills.list.useQuery();

  // Mutations
  const deleteSkillMutation = api.userSkills.remove.useMutation({
    onSuccess: () => {
      void userSkillsQuery.refetch();
      toast.success("Skill deleted successfully");
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to delete skill: ${error.message}`);
    },
  });

  const handleAddSkill = (skillName: string) => {
    setShowAddModal(true);
  };

  const handleEditSkill = (skill: UserSkillData) => {
    setEditingSkill(skill);
  };

  const handleRemoveSkill = (userSkillId: string) => {
    if (confirm("Are you sure you want to remove this skill?")) {
      deleteSkillMutation.mutate({ userSkillId });
    }
  };

  const handleSkillSuccess = () => {
    void userSkillsQuery.refetch();
  };

  const getProficiencyColor = (proficiency: string) => {
    switch (proficiency) {
      case "EXPERT":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "ADVANCED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "INTERMEDIATE":
        return "bg-green-100 text-green-800 border-green-200";
      case "BEGINNER":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "WORK_EXPERIENCE":
        return "bg-indigo-100 text-indigo-800";
      case "EDUCATION":
        return "bg-emerald-100 text-emerald-800";
      case "CERTIFICATION":
        return "bg-orange-100 text-orange-800";
      case "PERSONAL_PROJECT":
        return "bg-pink-100 text-pink-800";
      case "TRAINING":
        return "bg-cyan-100 text-cyan-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (userSkillsQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading your skills...</p>
        </div>
      </div>
    );
  }

  if (userSkillsQuery.error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-6 text-center text-red-600">
        <p className="font-semibold">Error loading skills</p>
        <p className="text-sm">{userSkillsQuery.error.message}</p>
      </div>
    );
  }

  const userSkills = userSkillsQuery.data ?? [];

  return (
    <div className="h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Your{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Skills
          </span>
        </h2>
        <Button
          onClick={() => handleAddSkill("")}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg hover:from-blue-700 hover:to-indigo-700"
        >
          Add Skill
        </Button>
      </div>

      {/* Skills Grid */}
      {userSkills.length === 0 ? (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <p className="font-medium text-gray-600">No skills added yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Add your skills to help match with job opportunities.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {userSkills.map((userSkill) => (
            <div
              key={userSkill.id}
              className="group rounded-md border border-blue-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-lg"
            >
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {userSkill.skill.name}
                </h3>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => handleEditSkill(userSkill)}
                    className="rounded-lg bg-blue-100 p-1.5 text-blue-600 hover:bg-blue-200"
                    title="Edit skill"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleRemoveSkill(userSkill.id)}
                    disabled={deleteSkillMutation.isPending}
                    className="rounded-lg bg-red-100 p-1.5 text-red-600 hover:bg-red-200 disabled:opacity-50"
                    title="Remove skill"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {/* Proficiency */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Proficiency:</span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${getProficiencyColor(userSkill.proficiency)}`}
                  >
                    {userSkill.proficiency.toLowerCase()}
                  </span>
                </div>

                {/* Years of Experience */}
                {userSkill.yearsExperience && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Experience:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {userSkill.yearsExperience} years
                    </span>
                  </div>
                )}

                {/* Source */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Source:</span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${getSourceColor(userSkill.source)}`}
                  >
                    {userSkill.source.replace(/_/g, " ").toLowerCase()}
                  </span>
                </div>

                {/* Category */}
                {userSkill.skill.category && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Category:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {userSkill.skill.category}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {userSkill.notes && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="text-sm text-gray-600 italic">
                      {userSkill.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Skill Modal */}
      {showAddModal && (
        <SkillModal
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSuccess={handleSkillSuccess}
        />
      )}

      {/* Edit Skill Modal */}
      {editingSkill && (
        <SkillModal
          mode="edit"
          existingSkill={editingSkill}
          onClose={() => setEditingSkill(null)}
          onSuccess={handleSkillSuccess}
        />
      )}
    </div>
  );
}
