import { UserSkillsPanel } from "~/app/ai-chat/_components/user-skills-panel";

export default function SkillsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Skills</h1>
        <p className="mt-2 text-gray-600">
          Manage your professional skills and expertise levels.
        </p>
      </div>

      <UserSkillsPanel />
    </div>
  );
}
