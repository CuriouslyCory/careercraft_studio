import Link from "next/link";
import { Button } from "~/components/ui/button";
import { FileX, ArrowLeft } from "lucide-react";

export default function JobPostingNotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6 text-center">
      <div className="rounded-full bg-red-50 p-6">
        <FileX className="h-12 w-12 text-red-500" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">
          Job Posting Not Found
        </h1>
        <p className="max-w-md text-gray-600">
          The job posting you&apos;re looking for doesn&apos;t exist or you
          don&apos;t have access to it.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/dashboard/job-postings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Job Postings
          </Link>
        </Button>

        <Button variant="outline" asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
