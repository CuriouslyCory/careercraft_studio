"use client";

import { api } from "~/trpc/react";
import { getProficiencyClasses, type SkillLevel } from "./skill-level-utils";

interface UserSkillsForWorkProps {
  workHistoryId: string;
  onDeleteSkill: (userSkillId: string, workHistoryId: string) => void;
}

export function UserSkillsForWork({
  workHistoryId,
  onDeleteSkill,
}: UserSkillsForWorkProps) {
  const userSkillsQuery = api.document.listUserSkillsForWork.useQuery({
    workHistoryId,
  });

  if (userSkillsQuery.isLoading) {
    return <span className="text-xs text-gray-400">Loading skills...</span>;
  }

  if (userSkillsQuery.error) {
    return <span className="text-xs text-red-400">Error loading skills</span>;
  }

  const userSkills = userSkillsQuery.data ?? [];

  if (userSkills.length === 0) {
    return null;
  }

  return (
    <>
      {userSkills.map((userSkill) => {
        const proficiencyClasses = getProficiencyClasses(
          userSkill.proficiency as SkillLevel,
        );

        return (
          <div
            key={userSkill.id}
            className={`group relative inline-flex rounded-full border px-2 py-1 text-xs font-medium ${proficiencyClasses}`}
          >
            {userSkill.skill.name}
            {userSkill.proficiency && (
              <span className="ml-1 text-xs">
                ({userSkill.proficiency.toLowerCase()})
              </span>
            )}
            <button
              onClick={() => onDeleteSkill(userSkill.id, workHistoryId)}
              className="absolute -top-1 -right-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white group-hover:flex"
              aria-label="Remove skill"
            >
              ×
            </button>
          </div>
        );
      })}
    </>
  );
}
