import { DocumentEditorDashboardPanel } from "../_components/document-editor-dashboard-panel";

export default function DashboardDocumentEditorPage() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-6">
      <DocumentEditorDashboardPanel />
    </div>
  );
}
