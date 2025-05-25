"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  type SkillLevel,
  skillLevelConfigs,
  getSkillLevelConfig,
} from "./skill-level-utils";

export interface SkillLevelDropdownProps {
  value: SkillLevel;
  onChange: (level: SkillLevel) => void;
  disabled?: boolean;
}

/**
 * Dropdown component for selecting skill proficiency levels
 * Shows colored icons for each level
 */
export function SkillLevelDropdown({
  value,
  onChange,
  disabled = false,
}: SkillLevelDropdownProps) {
  const currentConfig = getSkillLevelConfig(value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
        disabled={disabled}
      >
        <span style={{ color: currentConfig.color }}>{currentConfig.icon}</span>
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-32">
        {Object.entries(skillLevelConfigs).map(([level, config]) => (
          <DropdownMenuItem
            key={level}
            onClick={() => onChange(level as SkillLevel)}
            className="cursor-pointer"
          >
            <span className="mr-2" style={{ color: config.color }}>
              {config.icon}
            </span>
            {config.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
