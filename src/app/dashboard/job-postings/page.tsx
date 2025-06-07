import { JobPostingsPanel } from "~/app/dashboard/_components/job-postings-panel";

export default function JobPostingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Job{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Postings
          </span>
        </h2>
        <p className="mt-2 text-gray-600">
          Manage your job applications and track your progress.
        </p>
      </div>

      <JobPostingsPanel />
    </div>
  );
}
