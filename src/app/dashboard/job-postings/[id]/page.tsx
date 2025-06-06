import { JobPostingDetailLayout } from "../../_components/job-posting-detail/job-posting-detail-layout";

interface JobPostingDetailPageProps {
  params: { id: string };
}

export default function JobPostingDetailPage({
  params,
}: JobPostingDetailPageProps) {
  return <JobPostingDetailLayout jobPostingId={params.id} />;
}
