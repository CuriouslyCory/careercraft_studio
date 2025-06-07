import { UserSkillsPanel } from "~/app/dashboard/_components/user-skills-panel";

export default function SkillsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Your{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Skills
          </span>
        </h2>
        <p className="mt-2 text-gray-600">
          Manage your professional skills and expertise levels.
        </p>
      </div>

      <UserSkillsPanel />
    </div>
  );
}
