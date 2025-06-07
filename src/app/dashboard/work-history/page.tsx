import { WorkHistoryPanel } from "~/app/dashboard/_components/work-history-panel";

export default function WorkHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Work{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            History
          </span>
        </h1>
        <p className="mt-2 text-gray-600">
          Manage your professional experience and achievements.
        </p>
      </div>

      <WorkHistoryPanel />
    </div>
  );
}
