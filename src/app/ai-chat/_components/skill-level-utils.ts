export type SkillLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

export interface SkillLevelConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: string;
}

export const skillLevelConfigs: Record<SkillLevel, SkillLevelConfig> = {
  BEGINNER: {
    label: "Beginner",
    color: "#eab308", // yellow-500
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    borderColor: "border-yellow-200",
    icon: "●",
  },
  INTERMEDIATE: {
    label: "Intermediate",
    color: "#22c55e", // green-500
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    borderColor: "border-green-200",
    icon: "●●",
  },
  ADVANCED: {
    label: "Advanced",
    color: "#3b82f6", // blue-500
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
    borderColor: "border-blue-200",
    icon: "●●●",
  },
  EXPERT: {
    label: "Expert",
    color: "#a855f7", // purple-500
    bgColor: "bg-purple-100",
    textColor: "text-purple-800",
    borderColor: "border-purple-200",
    icon: "●●●●",
  },
};

export function getSkillLevelConfig(level: SkillLevel): SkillLevelConfig {
  return skillLevelConfigs[level];
}

export function getSkillLevelIcon(level: SkillLevel): string {
  return skillLevelConfigs[level].icon;
}

export function getSkillLevelColor(level: SkillLevel): string {
  return skillLevelConfigs[level].color;
}

/**
 * Get the full CSS classes for proficiency level badges (matching existing skills table)
 */
export function getProficiencyClasses(proficiency: SkillLevel): string {
  const config = skillLevelConfigs[proficiency];
  return `${config.bgColor} ${config.textColor} ${config.borderColor}`;
}
