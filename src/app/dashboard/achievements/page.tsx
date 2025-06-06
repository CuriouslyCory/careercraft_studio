import { KeyAchievementsPanel } from "~/app/ai-chat/_components/key-achievements-panel";

export default function AchievementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Key Achievements</h1>
        <p className="mt-2 text-gray-600">
          Highlight your most important professional accomplishments.
        </p>
      </div>

      <KeyAchievementsPanel />
    </div>
  );
}
