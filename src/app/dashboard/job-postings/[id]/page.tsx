import { JobPostingDetailLayout } from "../../_components/job-posting-detail/job-posting-detail-layout";

interface JobPostingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function JobPostingDetailPage({
  params,
}: JobPostingDetailPageProps) {
  const { id } = await params;
  return <JobPostingDetailLayout jobPostingId={id} />;
}
