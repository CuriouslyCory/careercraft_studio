import { WorkHistoryPanel } from "~/app/dashboard/_components/work-history-panel";

export default function WorkHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Work History</h1>
        <p className="mt-2 text-gray-600">
          Manage your professional experience and achievements.
        </p>
      </div>

      <WorkHistoryPanel />
    </div>
  );
}
