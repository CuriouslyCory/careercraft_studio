import { ProfilePanel } from "../_components/profile-panel";

export default function ProfilePage() {
  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="mt-2 text-gray-600">
          Manage your professional profile information used for resume
          generation.
        </p>
      </div>
      <ProfilePanel />
    </div>
  );
}
