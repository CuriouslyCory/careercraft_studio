import { ProfilePanel } from "../_components/profile-panel";

export default function ProfilePage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="mt-2 text-gray-600">
          Manage your professional profile information used for resume
          generation.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <ProfilePanel />
      </div>
    </div>
  );
}
