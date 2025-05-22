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
    return <div className="p-4 text-center">Loading your documents...</div>;
  }

  if (documentsQuery.error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error loading documents: {documentsQuery.error.message}
      </div>
    );
  }

  const documents = documentsQuery.data ?? [];

  return (
    <div className="h-full">
      <div className="mb-4">
        <DocumentUpload />
      </div>
      <h2 className="mb-4 text-xl font-semibold">Your Documents</h2>

      {documents.length === 0 ? (
        <p className="text-center text-gray-500">
          No documents found. Upload a document to get started.
        </p>
      ) : (
        <div className="overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Title</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">
                    {editId === doc.id ? (
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded border px-2 py-1"
                      />
                    ) : (
                      doc.title
                    )}
                  </td>
                  <td className="p-2">
                    {editId === doc.id ? (
                      <input
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="w-full rounded border px-2 py-1"
                      />
                    ) : (
                      doc.type
                    )}
                  </td>
                  <td className="p-2">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="space-x-2 p-2">
                    {editId === doc.id ? (
                      <>
                        <button
                          onClick={handleSave}
                          disabled={updateMutation.isPending}
                          className="rounded bg-green-500 px-2 py-1 text-xs text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="rounded bg-gray-300 px-2 py-1 text-xs"
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
                          className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleViewContent(doc.id, doc.content)}
                          className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deleteMutation.isPending}
                          className="rounded bg-red-100 px-2 py-1 text-xs text-red-700"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Content View Modal */}
      {viewContent && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="relative max-h-[80vh] w-[80vw] overflow-y-auto rounded-lg bg-white p-6">
            <button
              onClick={handleCloseContent}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
            >
              ✕
            </button>
            <h3 className="mb-4 text-lg font-semibold">
              {documents.find((d) => d.id === viewContent.id)?.title}
            </h3>
            <div className="rounded bg-gray-50 p-4 whitespace-pre-wrap">
              {viewContent.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
