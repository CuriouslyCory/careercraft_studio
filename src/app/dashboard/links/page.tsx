import { LinksPanel } from "~/app/dashboard/_components/links-panel";

export default function LinksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Professional{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Links
          </span>
        </h2>
        <p className="mt-2 text-gray-600">
          Manage your professional links and online presence.
        </p>
      </div>

      <LinksPanel />
    </div>
  );
}
