"use client";

import { useRef, useCallback, useMemo, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { api } from "~/trpc/react";

// Dynamically import the ToastUI Editor to prevent SSR issues
const Editor = dynamic(
  () => import("@toast-ui/react-editor").then((mod) => mod.Editor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-lg border bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-gray-600">Loading editor...</p>
        </div>
      </div>
    ),
  },
);

// Type for the editor instance
type EditorElement = {
  getInstance(): { getMarkdown(): string };
};

interface DocumentEditorProps {
  jobPostingId: string;
  jobTitle: string;
  initialContent: string;
  documentType: "resume" | "coverLetter";
  onSave: () => void;
  onCancel: () => void;
}

// Content validation with comprehensive checks
const validateContent = (
  content: string,
): { isValid: boolean; error?: string } => {
  if (!content.trim()) {
    return { isValid: false, error: "Content cannot be empty" };
  }

  if (content.length > 50000) {
    return {
      isValid: false,
      error: "Content exceeds maximum length (50,000 characters)",
    };
  }

  // Check for potential security issues (basic XSS prevention)
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  ];
  if (dangerousPatterns.some((pattern) => pattern.test(content))) {
    return {
      isValid: false,
      error: "Content contains potentially unsafe elements",
    };
  }

  return { isValid: true };
};

export function DocumentEditor({
  jobPostingId,
  jobTitle,
  initialContent,
  documentType,
  onSave,
  onCancel,
}: DocumentEditorProps) {
  const editorRef = useRef<EditorElement | null>(null);

  // Memoize toolbar configuration for performance
  const toolbarItems = useMemo(
    () => [
      ["heading", "bold", "italic", "strike"],
      ["hr", "quote"],
      ["ul", "ol", "task", "indent", "outdent"],
      ["table", "link"],
      ["scrollSync"],
    ],
    [],
  );

  const updateDocumentMutation = api.document.updateJobPostDocument.useMutation(
    {
      onSuccess: () => {
        toast.success(
          `${documentType === "resume" ? "Resume" : "Cover letter"} saved successfully!`,
        );
        onSave();
      },
      onError: (error) => {
        toast.error(`Failed to save: ${error.message}`);
      },
    },
  );

  const deleteDocumentMutation = api.document.deleteJobPostDocument.useMutation(
    {
      onSuccess: (result) => {
        toast.success(result.message);
        onSave(); // This will refresh the data and close the editor
      },
      onError: (error) => {
        toast.error(`Failed to delete: ${error.message}`);
      },
    },
  );

  const exportToPDFMutation = api.document.exportToPDF.useMutation({
    onSuccess: (result) => {
      // Create a download link for the PDF
      const pdfBlob = new Blob(
        [
          new Uint8Array(
            atob(result.pdfBase64)
              .split("")
              .map((char) => char.charCodeAt(0)),
          ),
        ],
        { type: "application/pdf" },
      );

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("PDF downloaded successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to export PDF: ${error.message}`);
    },
  });

  // Consolidated loading state using mutation states
  const isLoading =
    updateDocumentMutation.isPending ||
    deleteDocumentMutation.isPending ||
    exportToPDFMutation.isPending;

  // Memoized save handler with improved validation and error handling
  const handleSave = useCallback(async () => {
    if (!editorRef.current) {
      toast.error("Editor not properly initialized");
      return;
    }

    try {
      // Type guard to safely access getInstance method
      const editor = editorRef.current;
      if (
        !editor ||
        !("getInstance" in editor) ||
        typeof editor.getInstance !== "function"
      ) {
        toast.error("Editor instance not available");
        return;
      }

      const editorInstance = editor.getInstance() as { getMarkdown(): string };
      if (!editorInstance || typeof editorInstance.getMarkdown !== "function") {
        toast.error("Editor instance not available");
        return;
      }

      const content = editorInstance.getMarkdown();

      const validation = validateContent(content);
      if (!validation.isValid) {
        toast.error(validation.error ?? "Invalid content");
        return;
      }

      await updateDocumentMutation.mutateAsync({
        jobPostingId,
        documentType,
        content,
      });
    } catch (error) {
      console.error("Save error:", error);
      // Error handling is now managed by the mutation's onError callback
    }
  }, [jobPostingId, documentType, updateDocumentMutation]);

  // Memoized cancel handler with improved change detection
  const handleCancel = useCallback(() => {
    if (!editorRef.current) {
      onCancel();
      return;
    }

    try {
      // Type guard to safely access getInstance method
      const editor = editorRef.current;
      if (
        !editor ||
        !("getInstance" in editor) ||
        typeof editor.getInstance !== "function"
      ) {
        onCancel();
        return;
      }

      const editorInstance = editor.getInstance() as { getMarkdown(): string };
      if (!editorInstance || typeof editorInstance.getMarkdown !== "function") {
        onCancel();
        return;
      }

      const currentContent = editorInstance.getMarkdown();
      if (currentContent !== initialContent) {
        if (
          confirm("You have unsaved changes. Are you sure you want to cancel?")
        ) {
          onCancel();
        }
      } else {
        onCancel();
      }
    } catch (error) {
      console.error("Error checking for changes:", error);
      onCancel();
    }
  }, [initialContent, onCancel]);

  // Memoized delete handler
  const handleDelete = useCallback(() => {
    const documentName = documentType === "resume" ? "resume" : "cover letter";
    if (
      confirm(
        `Are you sure you want to delete this ${documentName}? This action cannot be undone.`,
      )
    ) {
      void deleteDocumentMutation.mutate({
        jobPostingId,
        documentType,
      });
    }
  }, [jobPostingId, documentType, deleteDocumentMutation]);

  // Memoized export to PDF handler
  const handleExportToPDF = useCallback(async () => {
    if (!editorRef.current) {
      toast.error("Editor not properly initialized");
      return;
    }

    try {
      // Type guard to safely access getInstance method
      const editor = editorRef.current;
      if (
        !editor ||
        !("getInstance" in editor) ||
        typeof editor.getInstance !== "function"
      ) {
        toast.error("Editor instance not available");
        return;
      }

      const editorInstance = editor.getInstance() as { getMarkdown(): string };
      if (!editorInstance || typeof editorInstance.getMarkdown !== "function") {
        toast.error("Editor instance not available");
        return;
      }

      const content = editorInstance.getMarkdown();

      void exportToPDFMutation.mutate({
        jobPostingId,
        documentType,
        content,
        jobTitle,
      });
    } catch (error) {
      console.error("Export PDF error:", error);
      toast.error("Failed to export PDF");
    }
  }, [jobPostingId, documentType, jobTitle, exportToPDFMutation]);

  // Keyboard shortcuts for improved UX
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        void handleSave();
      }
      if (event.key === "Escape") {
        handleCancel();
      }
    },
    [handleSave, handleCancel],
  );

  // Add keyboard event listeners
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="h-full space-y-4"
      role="main"
      aria-label={`${documentType === "resume" ? "Resume" : "Cover letter"} editor for ${jobTitle}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Edit {documentType === "resume" ? "Resume" : "Cover Letter"} for{" "}
          {jobTitle}
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={() => void handleSave()}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
            aria-label={`Save ${documentType === "resume" ? "resume" : "cover letter"}`}
            title="Save (Ctrl+S)"
          >
            {updateDocumentMutation.isPending ? "Saving..." : "Save"}
          </Button>
          <Button
            onClick={() => void handleExportToPDF()}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
            aria-label={`Export ${documentType === "resume" ? "resume" : "cover letter"} to PDF`}
          >
            {exportToPDFMutation.isPending ? "Exporting..." : "Export PDF"}
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isLoading}
            variant="destructive"
            aria-label={`Delete ${documentType === "resume" ? "resume" : "cover letter"}`}
          >
            {deleteDocumentMutation.isPending
              ? "Deleting..."
              : `Delete ${documentType === "resume" ? "Resume" : "Cover Letter"}`}
          </Button>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            aria-label="Cancel editing"
            title="Cancel (Esc)"
          >
            Cancel
          </Button>
        </div>
      </div>

      <div className="h-fit overflow-hidden rounded-lg border">
        <Editor
          ref={(ref: EditorElement | null) => {
            editorRef.current = ref;
          }}
          initialValue={initialContent}
          previewStyle="vertical"
          height="calc(100vh - 90px)"
          initialEditType="wysiwyg"
          usageStatistics={false}
          placeholder={`Enter your ${documentType === "resume" ? "resume" : "cover letter"} content here...`}
          toolbarItems={toolbarItems}
        />
      </div>
    </div>
  );
}
