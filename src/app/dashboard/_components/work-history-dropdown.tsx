"use client";

import {
  ChevronDown,
  Edit,
  Merge,
  Trash2,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export interface WorkHistoryDropdownProps {
  onEdit: () => void;
  onDelete: () => void;
  onCleanUp?: () => void;
  onMerge: () => void;
  isDeleting?: boolean;
  isCleaningUp?: boolean;
  hasAchievements?: boolean;
}

/**
 * Dropdown menu component for work history record actions
 * Replaces individual action buttons with a consolidated menu using shadcn/ui
 */
export function WorkHistoryDropdown({
  onEdit,
  onDelete,
  onCleanUp,
  onMerge,
  isDeleting = false,
  isCleaningUp = false,
  hasAchievements = false,
}: WorkHistoryDropdownProps) {
  const isProcessing = isDeleting || isCleaningUp;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        disabled={isProcessing}
      >
        {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
        Actions
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem
          onClick={onEdit}
          className="cursor-pointer"
          disabled={isProcessing}
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={onMerge}
          className="cursor-pointer"
          disabled={isProcessing}
        >
          <Merge className="mr-2 h-4 w-4" />
          Merge
        </DropdownMenuItem>

        {hasAchievements && onCleanUp && (
          <DropdownMenuItem
            onClick={onCleanUp}
            className="cursor-pointer"
            disabled={isProcessing}
          >
            {isCleaningUp ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {isCleaningUp ? "Processing..." : "Clean Up"}
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={onDelete}
          disabled={isProcessing}
          variant="destructive"
          className="cursor-pointer"
        >
          {isDeleting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          {isDeleting ? "Deleting..." : "Delete"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
