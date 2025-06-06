"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { X, Check, Calendar, Building, User } from "lucide-react";

export interface WorkHistoryRecord {
  id: string;
  companyName: string;
  jobTitle: string;
  startDate: Date;
  endDate: Date | null;
  achievements: Array<{ id: string; description: string }>;
  userSkills: Array<{ id: string; skillId: string; skill: { name: string } }>;
}

export interface MergeUtilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRecordId: string;
  workHistories: WorkHistoryRecord[];
  onMergeComplete: () => void;
}

interface MergedDetails {
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
}

/**
 * Two-step modal for merging work history records
 * Step 1: Select records to merge
 * Step 2: Configure merged record details
 */
export function MergeUtilityModal({
  isOpen,
  onClose,
  initialRecordId,
  workHistories,
  onMergeComplete,
}: MergeUtilityModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([
    initialRecordId,
  ]);
  const [mergedDetails, setMergedDetails] = useState<MergedDetails>({
    companyName: "",
    jobTitle: "",
    startDate: "",
    endDate: "",
  });

  const mergeMutation = api.document.mergeWorkHistory.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        onMergeComplete();
        onClose();
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      toast.error(`Failed to merge work history: ${error.message}`);
    },
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedRecordIds([initialRecordId]);

      // Initialize merged details with the initial record's data
      const initialRecord = workHistories.find(
        (wh) => wh.id === initialRecordId,
      );
      if (initialRecord) {
        setMergedDetails({
          companyName: initialRecord.companyName,
          jobTitle: initialRecord.jobTitle,
          startDate: initialRecord.startDate.toISOString().split("T")[0] ?? "",
          endDate: initialRecord.endDate?.toISOString().split("T")[0] ?? "",
        });
      }
    }
  }, [isOpen, initialRecordId, workHistories]);

  // Update merged details when selected records change
  useEffect(() => {
    if (selectedRecordIds.length > 0) {
      const selectedRecords = workHistories.filter((wh) =>
        selectedRecordIds.includes(wh.id),
      );
      const primaryRecord =
        selectedRecords.find((wh) => wh.id === initialRecordId) ??
        selectedRecords[0];

      if (primaryRecord) {
        // Calculate date range from all selected records
        const allDates = selectedRecords.flatMap((record) => [
          record.startDate,
          ...(record.endDate ? [record.endDate] : []),
        ]);

        const earliestDate = new Date(
          Math.min(...allDates.map((d) => d.getTime())),
        );
        const latestDate =
          allDates.length > 1
            ? new Date(Math.max(...allDates.map((d) => d.getTime())))
            : primaryRecord.endDate;

        setMergedDetails({
          companyName: primaryRecord.companyName,
          jobTitle: primaryRecord.jobTitle,
          startDate: earliestDate.toISOString().split("T")[0] ?? "",
          endDate: latestDate?.toISOString().split("T")[0] ?? "",
        });
      }
    }
  }, [selectedRecordIds, workHistories, initialRecordId]);

  const formatDate = (date: Date | null) => {
    if (!date) return "Present";
    return date.toLocaleDateString();
  };

  const handleRecordToggle = (recordId: string) => {
    if (recordId === initialRecordId) return; // Can't deselect initial record

    setSelectedRecordIds((prev) =>
      prev.includes(recordId)
        ? prev.filter((id) => id !== recordId)
        : [...prev, recordId],
    );
  };

  const handleFieldUpdate = (field: keyof MergedDetails, value: string) => {
    setMergedDetails((prev) => ({ ...prev, [field]: value }));
  };

  const getAlternativeValues = (field: keyof MergedDetails) => {
    const selectedRecords = workHistories.filter((wh) =>
      selectedRecordIds.includes(wh.id),
    );
    const currentValue = mergedDetails[field];

    const alternatives = selectedRecords
      .map((record) => {
        switch (field) {
          case "companyName":
            return record.companyName;
          case "jobTitle":
            return record.jobTitle;
          case "startDate":
            return record.startDate.toISOString().split("T")[0] ?? "";
          case "endDate":
            return record.endDate?.toISOString().split("T")[0] ?? "";
          default:
            return "";
        }
      })
      .filter(
        (value, index, arr) =>
          value !== currentValue && arr.indexOf(value) === index,
      );

    return alternatives;
  };

  const handleMerge = () => {
    const secondaryRecordIds = selectedRecordIds.filter(
      (id) => id !== initialRecordId,
    );

    mergeMutation.mutate({
      primaryRecordId: initialRecordId,
      secondaryRecordIds,
      mergedDetails,
    });
  };

  const selectedRecords = workHistories.filter((wh) =>
    selectedRecordIds.includes(wh.id),
  );
  const totalAchievements = selectedRecords.reduce(
    (sum, record) => sum + record.achievements.length,
    0,
  );
  const totalSkills = new Set(
    selectedRecords.flatMap((record) =>
      record.userSkills.map((us) => us.skillId),
    ),
  ).size;

  if (!isOpen) return null;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Merge Work History Records
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="mb-6 flex items-center">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              step >= 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            {step > 1 ? <Check className="h-4 w-4" /> : "1"}
          </div>
          <div
            className={`mx-4 h-1 flex-1 ${step >= 2 ? "bg-blue-600" : "bg-gray-200"}`}
          />
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              step >= 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            2
          </div>
        </div>

        {step === 1 && (
          <div>
            <h3 className="mb-4 text-lg font-semibold">
              Select Records to Merge
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Choose which work history records you want to merge together. The
              first record will be the primary record.
            </p>

            <div className="space-y-3">
              {workHistories.map((record) => (
                <div
                  key={record.id}
                  className={`rounded border p-4 ${
                    selectedRecordIds.includes(record.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedRecordIds.includes(record.id)}
                        onChange={() => handleRecordToggle(record.id)}
                        disabled={record.id === initialRecordId}
                        className="mt-1"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <h4 className="font-medium">{record.jobTitle}</h4>
                          {record.id === initialRecordId && (
                            <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                          <Building className="h-4 w-4" />
                          {record.companyName}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          {formatDate(record.startDate)} -{" "}
                          {formatDate(record.endDate)}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {record.achievements.length} achievements •{" "}
                          {record.userSkills.length} skills
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={selectedRecordIds.length < 2}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-blue-300"
              >
                Next: Configure Details
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="mb-4 text-lg font-semibold">
              Configure Merged Record
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Customize the details for your merged work history record. Click
              on alternative values to use them.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Job Title
                </label>
                <input
                  type="text"
                  value={mergedDetails.jobTitle}
                  onChange={(e) =>
                    handleFieldUpdate("jobTitle", e.target.value)
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
                {getAlternativeValues("jobTitle").length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Alternatives:</p>
                    <div className="flex flex-wrap gap-1">
                      {getAlternativeValues("jobTitle").map((alt, index) => (
                        <button
                          key={index}
                          onClick={() => handleFieldUpdate("jobTitle", alt)}
                          className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                        >
                          {alt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <input
                  type="text"
                  value={mergedDetails.companyName}
                  onChange={(e) =>
                    handleFieldUpdate("companyName", e.target.value)
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
                {getAlternativeValues("companyName").length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Alternatives:</p>
                    <div className="flex flex-wrap gap-1">
                      {getAlternativeValues("companyName").map((alt, index) => (
                        <button
                          key={index}
                          onClick={() => handleFieldUpdate("companyName", alt)}
                          className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                        >
                          {alt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <input
                  type="date"
                  value={mergedDetails.startDate}
                  onChange={(e) =>
                    handleFieldUpdate("startDate", e.target.value)
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
                {getAlternativeValues("startDate").length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Alternatives:</p>
                    <div className="flex flex-wrap gap-1">
                      {getAlternativeValues("startDate").map((alt, index) => (
                        <button
                          key={index}
                          onClick={() => handleFieldUpdate("startDate", alt)}
                          className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                        >
                          {new Date(alt).toLocaleDateString()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  End Date
                </label>
                <input
                  type="date"
                  value={mergedDetails.endDate}
                  onChange={(e) => handleFieldUpdate("endDate", e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
                {getAlternativeValues("endDate").length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Alternatives:</p>
                    <div className="flex flex-wrap gap-1">
                      {getAlternativeValues("endDate").map((alt, index) => (
                        <button
                          key={index}
                          onClick={() => handleFieldUpdate("endDate", alt)}
                          className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                        >
                          {alt ? new Date(alt).toLocaleDateString() : "Present"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Merge preview */}
            <div className="mt-6 rounded border border-gray-200 bg-gray-50 p-4">
              <h4 className="mb-2 font-medium">Merge Preview</h4>
              <div className="text-sm text-gray-600">
                <p>• Merging {selectedRecordIds.length} work history records</p>
                <p>• Total achievements: {totalAchievements}</p>
                <p>• Total unique skills: {totalSkills}</p>
                <p>• Duplicates will be automatically removed</p>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleMerge}
                disabled={mergeMutation.isPending}
                className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-green-300"
              >
                {mergeMutation.isPending ? "Merging..." : "Merge Records"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
