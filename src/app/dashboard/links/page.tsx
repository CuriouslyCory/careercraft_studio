import { LinksPanel } from "~/app/dashboard/_components/links-panel";

export default function LinksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Professional Links</h1>
        <p className="mt-2 text-gray-600">
          Manage your professional links and online presence.
        </p>
      </div>

      <LinksPanel />
    </div>
  );
}
