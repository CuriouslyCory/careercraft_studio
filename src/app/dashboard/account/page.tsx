"use client";

import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Account Management Page
 * Allows users to request data export or account deletion, and view request history.
 *
 * - Shows account info
 * - Buttons for data export and deletion (with confirmation)
 * - Lists previous requests
 * - Uses tRPC endpoints for backend actions
 *
 * @returns React component for /dashboard/account
 */
export default function AccountPage() {
  const { data: session } = useSession();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // tRPC mutations
  const utils = api.useUtils();
  const dataExportMutation = api.account.requestDataExport.useMutation({
    onSuccess: async () => {
      toast.success(
        "Your data export request was submitted. You'll receive your data via email within 48 hours.",
      );
      setShowExportDialog(false);
      await utils.account.listDataRequests.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit data export request.");
    },
  });
  const deleteMutation = api.account.requestAccountDeletion.useMutation({
    onSuccess: async () => {
      toast.success(
        "Your account deletion request was submitted. Your account is now flagged for deletion.",
      );
      setShowDeleteDialog(false);
      await utils.account.listDataRequests.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit account deletion request.");
    },
  });

  // List previous requests
  const { data: requests, isLoading } = api.account.listDataRequests.useQuery();

  const userName = session?.user?.name ?? session?.user?.email ?? "User";
  const userEmail = session?.user?.email ?? "-";

  return (
    <div className="mx-auto max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Account Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="text-lg font-semibold">Account Info</div>
            <div className="text-gray-700">Name: {userName}</div>
            <div className="text-gray-700">Email: {userEmail}</div>
          </div>

          <div className="mb-8 flex flex-col gap-4">
            <Button variant="outline" onClick={() => setShowExportDialog(true)}>
              Request Data Export
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              Request Account Deletion
            </Button>
          </div>

          <div>
            <div className="mb-2 font-semibold">Your Data Requests</div>
            {isLoading ? (
              <div>Loading...</div>
            ) : requests && requests.length > 0 ? (
              <table className="w-full border text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id} className="border-t">
                      <td className="p-2">{req.type}</td>
                      <td className="p-2">{req.status}</td>
                      <td className="p-2">
                        {new Date(req.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-gray-500">No data requests yet.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Data Export</DialogTitle>
            <DialogDescription>
              Are you sure you want to request a copy of all your personal data?
              You&apos;ll receive an email within 48 hours.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => dataExportMutation.mutate()}
              disabled={dataExportMutation.isPending}
            >
              {dataExportMutation.isPending
                ? "Requesting..."
                : "Confirm Request"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Deletion Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Account Deletion</DialogTitle>
            <DialogDescription>
              This will flag your account and all data for deletion. You will be
              logged out and your data will be permanently deleted soon. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Requesting..." : "Confirm Deletion"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TODO: Add logic to log out user after deletion request is submitted */}
      {/* TODO: Add more granular feedback for request errors/status */}
      {/* TODO: Add email feedback and cron processing for actual data export/deletion */}
    </div>
  );
}
