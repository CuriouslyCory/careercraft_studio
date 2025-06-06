import { ProfilePanel } from "~/app/dashboard/_components/profile-panel";

export default function ContactInfoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Contact Information
        </h1>
        <p className="mt-2 text-gray-600">
          Manage your personal and contact details.
        </p>
      </div>

      <ProfilePanel />
    </div>
  );
}
