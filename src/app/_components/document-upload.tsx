import React, { useRef, useState } from "react";
import { api } from "~/trpc/react";

const ACCEPTED_TYPES = ["application/pdf", "text/plain"];

export default function DocumentUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = api.document.upload.useMutation({
    onSuccess: (data) => {
      setSuccess(`Uploaded: ${data.title}`);
      setError(null);
      setUploading(false);
    },
    onError: (err) => {
      setError(err.message);
      setSuccess(null);
      setUploading(false);
    },
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setSuccess(null);
    setUploading(true);
    const file = files[0]; // Only handle one file for now
    if (!file) {
      setError("No file selected");
      setUploading(false);
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(`Unsupported file type: ${file.type}`);
      setUploading(false);
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      uploadMutation.mutate({
        fileBase64: base64,
        fileType: file.type as "application/pdf" | "text/plain",
        originalName: file.name,
        // TODO: Optionally prompt for title/type, for now use defaults
        title: file.name,
        type: "resume", // Default type, could be made dynamic
      });
    } catch (e) {
      setError("Failed to read file");
      setUploading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          // Remove the data:...;base64, prefix if present
          const base64 = result.split(",").pop() ?? "";
          resolve(base64);
        } else {
          reject(new Error("Failed to read file as base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    void handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void handleFiles(e.target.files);
  };

  return (
    <div>
      <div
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple={false}
          className="hidden"
          onChange={handleInputChange}
        />
        <div className="mb-2 text-lg font-semibold">Upload Documents</div>
        <div className="mb-2 text-sm text-gray-600">
          Drag and drop PDF or text files here, or click to select files.
        </div>
        <div className="text-xs text-gray-400">Supported formats: PDF, TXT</div>
        {uploading && (
          <div className="mt-2 text-sm text-blue-500">Uploading...</div>
        )}
        {success && (
          <div className="mt-2 text-sm text-green-600">{success}</div>
        )}
        {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
      </div>
    </div>
  );
}
