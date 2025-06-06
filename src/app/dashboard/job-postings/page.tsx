import { JobPostingsPanel } from "~/app/dashboard/_components/job-postings-panel";

export default function JobPostingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Job Postings</h1>
        <p className="mt-2 text-gray-600">
          Manage your job applications and track your progress.
        </p>
      </div>

      <JobPostingsPanel />
    </div>
  );
}
