import { KeyAchievementsPanel } from "~/app/dashboard/_components/key-achievements-panel";

export default function AchievementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Key{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Achievements
          </span>
        </h2>
        <p className="mt-2 text-gray-600">
          Highlight your most important professional accomplishments.
        </p>
      </div>

      <KeyAchievementsPanel />
    </div>
  );
}
