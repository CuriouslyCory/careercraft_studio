"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Save, Edit2, X, User } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function ProfilePanel() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
  });

  // Queries
  const userProfileQuery = api.document.getUserProfile.useQuery();

  // Mutations
  const upsertUserProfileMutation = api.document.upsertUserProfile.useMutation({
    onSuccess: () => {
      void userProfileQuery.refetch();
      setIsEditing(false);
      toast.success("Profile updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  // Initialize form data when profile data loads
  useEffect(() => {
    if (userProfileQuery.data) {
      const profile = userProfileQuery.data;
      setFormData({
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
        location: profile.location ?? "",
      });
    }
  }, [userProfileQuery.data]);

  const handleSave = () => {
    upsertUserProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    // Reset form data to current profile data
    if (userProfileQuery.data) {
      const profile = userProfileQuery.data;
      setFormData({
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
        location: profile.location ?? "",
      });
    }
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (userProfileQuery.isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-800" />
      </div>
    );
  }

  const profile = userProfileQuery.data;
  const hasProfile = !!profile;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              {hasProfile ? "Edit" : "Add"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Professional Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    handleInputChange("location", e.target.value)
                  }
                  placeholder="City, State or City, Country"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={upsertUserProfileMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {upsertUserProfileMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {hasProfile ? (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        First Name
                      </Label>
                      <p className="mt-1 text-sm text-gray-900">
                        {profile.firstName ?? "Not provided"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        Last Name
                      </Label>
                      <p className="mt-1 text-sm text-gray-900">
                        {profile.lastName ?? "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Professional Email
                    </Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {profile.email ?? "Not provided"}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Phone Number
                    </Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {profile.phone ?? "Not provided"}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Location
                    </Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {profile.location ?? "Not provided"}
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <User className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>No profile information added yet</p>
                  <p className="text-sm">
                    Add your professional information to improve resume
                    generation
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
