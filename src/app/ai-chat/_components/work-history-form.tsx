"use client";

import { type WorkHistoryFormValues } from "./work-history-schema";

interface WorkHistoryFormProps {
  values: WorkHistoryFormValues;
  onChange: (field: string, value: string | boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}

export function WorkHistoryForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
}: WorkHistoryFormProps) {
  return (
    <div className="mb-4 rounded border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Company Name</label>
          <input
            type="text"
            value={values.companyName}
            onChange={(e) => onChange("companyName", e.target.value)}
            className="w-full rounded border p-2"
            placeholder="Enter company name"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Job Title</label>
          <input
            type="text"
            value={values.jobTitle}
            onChange={(e) => onChange("jobTitle", e.target.value)}
            className="w-full rounded border p-2"
            placeholder="Enter job title"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Start Date</label>
          <input
            type="date"
            value={values.startDate}
            onChange={(e) => onChange("startDate", e.target.value)}
            className="w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">End Date</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={values.endDate}
              onChange={(e) => onChange("endDate", e.target.value)}
              className="w-full rounded border p-2"
              disabled={values.isCurrent}
            />
            <div className="flex items-center whitespace-nowrap">
              <input
                type="checkbox"
                id={`current-${submitLabel}`}
                checked={values.isCurrent}
                onChange={(e) => onChange("isCurrent", e.target.checked)}
                className="mr-1"
              />
              <label htmlFor={`current-${submitLabel}`} className="text-sm">
                Current position
              </label>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded bg-gray-200 px-3 py-1 text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="rounded bg-blue-500 px-3 py-1 text-sm text-white disabled:bg-blue-300"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
