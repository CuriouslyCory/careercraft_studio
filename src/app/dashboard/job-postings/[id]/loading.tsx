export default function JobPostingDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200"></div>
        <div className="h-5 w-96 animate-pulse rounded bg-gray-200"></div>
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Job posting details skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-gray-200"></div>
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-gray-200"></div>
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
            <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200"></div>
          </div>
        </div>

        {/* Compatibility report skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-gray-200"></div>
          <div className="h-32 w-full animate-pulse rounded bg-gray-200"></div>
        </div>

        {/* Resume section skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-gray-200"></div>
          <div className="h-24 w-full animate-pulse rounded bg-gray-200"></div>
        </div>

        {/* Cover letter section skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-gray-200"></div>
          <div className="h-24 w-full animate-pulse rounded bg-gray-200"></div>
        </div>
      </div>
    </div>
  );
}
