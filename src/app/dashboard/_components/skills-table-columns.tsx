"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { type UserSkillData } from "./skill-modal";

/**
 * Get color classes for proficiency level badges
 */
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

/**
 * Get color classes for skill source badges
 */
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

/**
 * Format source text for display
 */
const formatSource = (source: string) => {
  return source.replace(/_/g, " ").toLowerCase();
};

/**
 * Column definitions for the skills data table
 */
export const createSkillsColumns = (
  onEdit: (skill: UserSkillData) => void,
  onDelete: (userSkillId: string) => void,
  isDeleting: boolean,
): ColumnDef<UserSkillData>[] => [
  {
    accessorKey: "skill.name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium hover:bg-transparent"
        >
          Skill Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const skill = row.original;
      return (
        <div className="space-y-1">
          <div className="font-medium text-gray-900">{skill.skill.name}</div>
          {skill.skill.category && (
            <div className="text-xs text-gray-500">{skill.skill.category}</div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "proficiency",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium hover:bg-transparent"
        >
          Proficiency
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const proficiency = row.getValue("proficiency");
      return (
        <span
          className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${getProficiencyColor(proficiency as string)}`}
        >
          {(proficiency as string).toLowerCase()}
        </span>
      );
    },
  },
  {
    accessorKey: "yearsExperience",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium hover:bg-transparent"
        >
          Experience
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const years = row.getValue("yearsExperience");
      return (
        <div className="text-sm">
          {typeof years === "number" ? `${years} years` : "Not specified"}
        </div>
      );
    },
  },
  {
    accessorKey: "source",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium hover:bg-transparent"
        >
          Source
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const source = row.getValue("source");
      return (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getSourceColor(source as string)}`}
        >
          {formatSource(source as string)}
        </span>
      );
    },
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => {
      const notes = row.getValue("notes");
      return (
        <div className="max-w-[200px] truncate text-sm text-gray-600">
          {typeof notes === "string" ? notes : "—"}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const skill = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onEdit(skill)}
              className="cursor-pointer"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit skill
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(skill.id)}
              disabled={isDeleting}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete skill
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
