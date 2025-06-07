"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { SkillModal, type UserSkillData } from "./skill-modal";
import { SkillsDataTable } from "./skills-data-table";
import { createSkillsColumns } from "./skills-table-columns";
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

  const handleAddSkill = () => {
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

  // Create columns with action handlers
  const columns = createSkillsColumns(
    handleEditSkill,
    handleRemoveSkill,
    deleteSkillMutation.isPending,
  );

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
        <Button
          onClick={handleAddSkill}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg hover:from-blue-700 hover:to-indigo-700"
        >
          Add Skill
        </Button>
      </div>

      {/* Skills Data Table */}
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
          <Button
            onClick={handleAddSkill}
            className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            Add Your First Skill
          </Button>
        </div>
      ) : (
        <SkillsDataTable columns={columns} data={userSkills} />
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
