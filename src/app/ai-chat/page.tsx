import { redirect } from "next/navigation";

export default function AIChatPage() {
  // Redirect to the default documents route
  redirect("/ai-chat/documents");
}
