"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { ProficiencyLevel, SkillSource } from "@prisma/client";
import { SkillModal, type UserSkillData } from "./skill-modal";

export function UserSkillsPanel() {
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [editingSkill, setEditingSkill] = useState<UserSkillData | null>(null);
  const [skillSearch, setSkillSearch] = useState("");

  const userSkillsQuery = api.userSkills.list.useQuery();
  const skillSearchQuery = api.userSkills.searchSkills.useQuery(
    { query: skillSearch },
    { enabled: skillSearch.length > 0 },
  );

  const addSkillMutation = api.userSkills.add.useMutation({
    onSuccess: () => {
      void userSkillsQuery.refetch();
      setIsAddingSkill(false);
      setSkillSearch("");
      toast.success("Skill added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add skill: ${error.message}`);
    },
  });

  const removeSkillMutation = api.userSkills.remove.useMutation({
    onSuccess: () => {
      void userSkillsQuery.refetch();
      toast.success("Skill removed successfully");
    },
    onError: (error) => {
      toast.error(`Failed to remove skill: ${error.message}`);
    },
  });

  const handleAddSkill = (skillName: string) => {
    addSkillMutation.mutate({
      skillName,
      proficiency: ProficiencyLevel.INTERMEDIATE,
      source: SkillSource.WORK_EXPERIENCE,
    });
  };

  const handleRemoveSkill = (userSkillId: string) => {
    if (confirm("Are you sure you want to remove this skill?")) {
      removeSkillMutation.mutate({ userSkillId });
    }
  };

  const handleSkillSuccess = () => {
    void userSkillsQuery.refetch();
  };

  const proficiencyColors = {
    BEGINNER: "bg-red-100 text-red-800",
    INTERMEDIATE: "bg-yellow-100 text-yellow-800",
    ADVANCED: "bg-blue-100 text-blue-800",
    EXPERT: "bg-green-100 text-green-800",
  };

  if (userSkillsQuery.isLoading) {
    return <div className="p-4 text-center">Loading your skills...</div>;
  }

  if (userSkillsQuery.error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error loading skills: {userSkillsQuery.error.message}
      </div>
    );
  }

  const userSkills = userSkillsQuery.data ?? [];

  return (
    <div className="h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Skills</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsAddingSkill(!isAddingSkill)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isAddingSkill ? "Cancel" : "Add Skill"}
          </Button>
        </div>
      </div>

      {/* Add Skill Section */}
      {isAddingSkill && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-4 text-lg font-medium">Add New Skill</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Search for a skill
              </label>
              <input
                type="text"
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Type skill name (e.g., React, JavaScript, Python)"
              />
            </div>

            {/* Skill Search Results */}
            {skillSearchQuery.data && skillSearchQuery.data.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Found skills:</label>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {skillSearchQuery.data.map((skill) => (
                    <Button
                      key={skill.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSkill(skill.name)}
                      disabled={addSkillMutation.isPending}
                      className="justify-start text-left"
                    >
                      <div>
                        <div className="font-medium">{skill.name}</div>
                        <div className="text-xs text-gray-500">
                          {skill.category}
                          {skill.aliases.length > 0 &&
                            ` • Also known as: ${skill.aliases.slice(0, 2).join(", ")}`}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Add Custom Skill */}
            {skillSearch &&
              (!skillSearchQuery.data ||
                skillSearchQuery.data.length === 0) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    No existing skills found. Add &quot;{skillSearch}&quot; as a
                    new skill?
                  </label>
                  <Button
                    onClick={() => handleAddSkill(skillSearch)}
                    disabled={addSkillMutation.isPending}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Add &quot;{skillSearch}&quot;
                  </Button>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Skills List */}
      {userSkills.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          <p className="mb-2">No skills added yet.</p>
          <p className="text-sm">
            Add your first skill to get started with compatibility analysis!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {userSkills.map((userSkill) => (
            <div
              key={userSkill.id}
              className="rounded-lg border p-4 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="text-lg font-medium">
                      {userSkill.skill.name}
                    </h3>
                    <span
                      className={cn(
                        "rounded px-2 py-1 text-xs",
                        proficiencyColors[userSkill.proficiency],
                      )}
                    >
                      {userSkill.proficiency}
                    </span>
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
                      {userSkill.skill.category}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    {userSkill.yearsExperience && (
                      <div>Experience: {userSkill.yearsExperience} years</div>
                    )}
                    <div>
                      Source:{" "}
                      {userSkill.source.replace(/_/g, " ").toLowerCase()}
                    </div>
                    {userSkill.workHistory && (
                      <div>
                        From: {userSkill.workHistory.jobTitle} at{" "}
                        {userSkill.workHistory.companyName}
                      </div>
                    )}
                    {userSkill.notes && <div>Notes: {userSkill.notes}</div>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingSkill(userSkill)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveSkill(userSkill.id)}
                    disabled={removeSkillMutation.isPending}
                    className="text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {userSkills.length > 0 && (
        <div className="rounded-lg bg-blue-50 p-4">
          <h3 className="mb-2 font-medium text-blue-900">Skill Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <div className="font-medium text-blue-800">Total Skills</div>
              <div className="text-blue-600">{userSkills.length}</div>
            </div>
            <div>
              <div className="font-medium text-blue-800">Expert Level</div>
              <div className="text-blue-600">
                {userSkills.filter((s) => s.proficiency === "EXPERT").length}
              </div>
            </div>
            <div>
              <div className="font-medium text-blue-800">Advanced Level</div>
              <div className="text-blue-600">
                {userSkills.filter((s) => s.proficiency === "ADVANCED").length}
              </div>
            </div>
            <div>
              <div className="font-medium text-blue-800">Categories</div>
              <div className="text-blue-600">
                {new Set(userSkills.map((s) => s.skill.category)).size}
              </div>
            </div>
          </div>
        </div>
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
