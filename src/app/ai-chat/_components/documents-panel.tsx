"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import DocumentUpload from "~/app/_components/document-upload";

export function DocumentsPanel() {
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("");
  const [viewContent, setViewContent] = useState<{
    id: string;
    content: string;
  } | null>(null);

  const queryClient = api.useUtils();
  const documentsQuery = api.document.listDocuments.useQuery();
  const updateMutation = api.document.updateDocument.useMutation({
    onSuccess: () => {
      void documentsQuery.refetch();
      setEditId(null);
    },
  });
  const deleteMutation = api.document.deleteDocument.useMutation({
    onMutate: async (deleteData) => {
      // Cancel any outgoing refetches
      await queryClient.document.listDocuments.cancel();

      // Save the current state
      const previousDocuments = documentsQuery.data ?? [];

      // Optimistically update the UI
      queryClient.document.listDocuments.setData(undefined, (old) => {
        return old ? old.filter((doc) => doc.id !== deleteData.id) : [];
      });

      // Return the previous state in case we need to revert
      return { previousDocuments };
    },
    onError: (err, _deleteData, context) => {
      // If the mutation fails, restore the previous documents
      if (context?.previousDocuments) {
        queryClient.document.listDocuments.setData(
          undefined,
          context.previousDocuments,
        );
      }
      toast.error(`Failed to delete document: ${err.message}`);
    },
    onSettled: (data, error) => {
      // Sync with server
      void queryClient.document.listDocuments.invalidate();

      // Show success toast if no error
      if (!error) {
        toast.success("Document deleted successfully");
      }
    },
  });

  const handleEdit = (id: string, title: string, type: string) => {
    setEditId(id);
    setEditTitle(title);
    setEditType(type);
  };

  const handleSave = () => {
    if (!editId) return;
    updateMutation.mutate({
      id: editId,
      title: editTitle,
      ...(editType && { content: undefined, type: editType }),
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleViewContent = (id: string, content: string) => {
    setViewContent({ id, content });
  };

  const handleCloseContent = () => {
    setViewContent(null);
  };

  if (documentsQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading your documents...</p>
        </div>
      </div>
    );
  }

  if (documentsQuery.error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-6 text-center text-red-600">
        <p className="font-semibold">Error loading documents</p>
        <p className="text-sm">{documentsQuery.error.message}</p>
      </div>
    );
  }

  const documents = documentsQuery.data ?? [];

  return (
    <div className="h-full space-y-6">
      <div className="rounded-md border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
        <DocumentUpload />
      </div>

      <div>
        <h2 className="mb-6 text-2xl font-bold text-gray-900">
          Your{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Documents
          </span>
        </h2>

        {documents.length === 0 ? (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <svg
                className="h-8 w-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="font-medium text-gray-600">No documents found</p>
            <p className="mt-1 text-sm text-gray-500">
              Upload a document to get started with your career optimization.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-blue-200 bg-white shadow-sm">
            <table className="w-full">
              <thead className="border-b border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <tr>
                  <th className="p-4 text-left font-semibold text-gray-900">
                    Title
                  </th>
                  <th className="p-4 text-left font-semibold text-gray-900">
                    Type
                  </th>
                  <th className="p-4 text-left font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="p-4 text-left font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="transition-colors hover:bg-blue-50"
                  >
                    <td className="p-4">
                      {editId === doc.id ? (
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full rounded-lg border border-blue-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                        />
                      ) : (
                        <span className="font-medium text-gray-900">
                          {doc.title}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {editId === doc.id ? (
                        <input
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                          className="w-full rounded-lg border border-blue-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                        />
                      ) : (
                        <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                          {doc.type}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {editId === doc.id ? (
                          <>
                            <button
                              onClick={handleSave}
                              disabled={updateMutation.isPending}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditId(null)}
                              className="rounded-lg bg-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                handleEdit(doc.id, doc.title, doc.type)
                              }
                              className="rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                handleViewContent(doc.id, doc.content)
                              }
                              className="rounded-lg bg-indigo-100 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-200"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id)}
                              disabled={deleteMutation.isPending}
                              className="rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Content View Modal */}
      {viewContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative max-h-[80vh] w-[80vw] overflow-y-auto rounded-md bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
              <h3 className="text-xl font-bold text-gray-900">
                {documents.find((d) => d.id === viewContent.id)?.title}
              </h3>
              <button
                onClick={handleCloseContent}
                className="rounded-lg bg-white p-2 text-gray-600 shadow-sm hover:bg-gray-100 hover:text-gray-800"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="rounded-lg bg-gray-50 p-6 font-mono text-sm whitespace-pre-wrap">
                {viewContent.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
