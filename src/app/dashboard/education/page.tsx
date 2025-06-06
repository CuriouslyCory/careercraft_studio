import { EducationPanel } from "~/app/ai-chat/_components/education-panel";

export default function EducationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Education</h1>
        <p className="mt-2 text-gray-600">
          Manage your educational background and certifications.
        </p>
      </div>

      <EducationPanel />
    </div>
  );
}
