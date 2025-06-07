import { ProfilePanel } from "~/app/dashboard/_components/profile-panel";

export default function ContactInfoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Contact{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Information
          </span>
        </h2>
        <p className="mt-2 text-gray-600">
          Manage your personal and contact details.
        </p>
      </div>

      <ProfilePanel />
    </div>
  );
}
