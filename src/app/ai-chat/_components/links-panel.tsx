"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Trash2, Edit2, Plus, ExternalLink, Save, X } from "lucide-react";
import { toast } from "sonner";

interface UserLink {
  id: string;
  title: string;
  url: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

export function LinksPanel() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    url: "",
    type: "OTHER",
  });
  const [addForm, setAddForm] = useState({ title: "", url: "", type: "OTHER" });

  // Queries
  const userLinksQuery = api.document.listUserLinks.useQuery();

  // Mutations
  const createUserLinkMutation = api.document.createUserLink.useMutation({
    onSuccess: () => {
      void userLinksQuery.refetch();
      setShowAddForm(false);
      setAddForm({ title: "", url: "", type: "OTHER" });
      toast.success("Link added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add link: ${error.message}`);
    },
  });

  const updateUserLinkMutation = api.document.updateUserLink.useMutation({
    onSuccess: () => {
      void userLinksQuery.refetch();
      setEditingId(null);
      toast.success("Link updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update link: ${error.message}`);
    },
  });

  const deleteUserLinkMutation = api.document.deleteUserLink.useMutation({
    onSuccess: () => {
      void userLinksQuery.refetch();
      toast.success("Link deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete link: ${error.message}`);
    },
  });

  const handleEdit = (link: UserLink) => {
    setEditingId(link.id);
    setEditForm({ title: link.title, url: link.url, type: link.type });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;

    updateUserLinkMutation.mutate({
      id: editingId,
      ...editForm,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: "", url: "", type: "OTHER" });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this link?")) {
      deleteUserLinkMutation.mutate({ id });
    }
  };

  const handleAdd = () => {
    if (!addForm.title.trim() || !addForm.url.trim()) {
      toast.error("Please fill in both title and URL");
      return;
    }

    createUserLinkMutation.mutate(addForm);
  };

  const getLinkTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      LINKEDIN: "LinkedIn",
      GITHUB: "GitHub",
      PORTFOLIO: "Portfolio",
      PERSONAL_WEBSITE: "Personal Website",
      OTHER: "Other",
    };
    return typeMap[type] ?? type;
  };

  const getLinkTypeIcon = (type: string) => {
    // You could add specific icons for different link types here
    return <ExternalLink className="h-4 w-4" />;
  };

  if (userLinksQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              <p>Loading links...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const userLinks = userLinksQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Links</CardTitle>
          <Button
            onClick={() => setShowAddForm(true)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Link
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Form */}
        {showAddForm && (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="add-title">Title</Label>
                  <Input
                    id="add-title"
                    value={addForm.title}
                    onChange={(e) =>
                      setAddForm({ ...addForm, title: e.target.value })
                    }
                    placeholder="e.g., LinkedIn Profile"
                  />
                </div>
                <div>
                  <Label htmlFor="add-url">URL</Label>
                  <Input
                    id="add-url"
                    value={addForm.url}
                    onChange={(e) =>
                      setAddForm({ ...addForm, url: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="add-type">Type</Label>
                  <Select
                    value={addForm.type}
                    onValueChange={(value: string) =>
                      setAddForm({ ...addForm, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                      <SelectItem value="GITHUB">GitHub</SelectItem>
                      <SelectItem value="PORTFOLIO">Portfolio</SelectItem>
                      <SelectItem value="PERSONAL_WEBSITE">
                        Personal Website
                      </SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAdd}
                    disabled={createUserLinkMutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Links List */}
        {userLinks.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <ExternalLink className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>No links added yet</p>
            <p className="text-sm">
              Add links to your social profiles, portfolio, or personal website
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {userLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                {editingId === link.id ? (
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label htmlFor={`edit-title-${link.id}`}>Title</Label>
                      <Input
                        id={`edit-title-${link.id}`}
                        value={editForm.title}
                        onChange={(e) =>
                          setEditForm({ ...editForm, title: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`edit-url-${link.id}`}>URL</Label>
                      <Input
                        id={`edit-url-${link.id}`}
                        value={editForm.url}
                        onChange={(e) =>
                          setEditForm({ ...editForm, url: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`edit-type-${link.id}`}>Type</Label>
                      <Select
                        value={editForm.type}
                        onValueChange={(value: string) =>
                          setEditForm({ ...editForm, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                          <SelectItem value="GITHUB">GitHub</SelectItem>
                          <SelectItem value="PORTFOLIO">Portfolio</SelectItem>
                          <SelectItem value="PERSONAL_WEBSITE">
                            Personal Website
                          </SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={updateUserLinkMutation.isPending}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-1 items-center gap-3">
                      {getLinkTypeIcon(link.type)}
                      <div>
                        <div className="font-medium">{link.title}</div>
                        <div className="text-sm text-gray-500">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 hover:underline"
                          >
                            {link.url}
                          </a>
                        </div>
                        <div className="text-xs text-gray-400">
                          {getLinkTypeDisplay(link.type)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(link)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(link.id)}
                        disabled={deleteUserLinkMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
