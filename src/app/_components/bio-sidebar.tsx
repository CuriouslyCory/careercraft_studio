"use client";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "~/components/ui/sidebar";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const BIO_VIEWS = [
  { key: "documents", label: "Documents" },
  { key: "workHistory", label: "Work History" },
  { key: "keyAchievements", label: "Key Achievements" },
  { key: "skills", label: "Skills" },
  { key: "education", label: "Education" },
  { key: "jobPostings", label: "Job Postings" },
  { key: "links", label: "Links" },
  { key: "conversations", label: "Conversations" },
];

export function BioSidebar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const session = useSession();
  const activeView = searchParams.get("bio") ?? "documents";
  const [truncateStatus, setTruncateStatus] = useState<
    null | "success" | "error"
  >(null);
  const [truncateLoading, setTruncateLoading] = useState(false);
  const truncateMutation = api.document.truncateAllUserData.useMutation();

  const handleTruncate = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete all your resume data? This cannot be undone.",
      )
    )
      return;
    setTruncateLoading(true);
    setTruncateStatus(null);
    try {
      await truncateMutation.mutateAsync();
      setTruncateStatus("success");
    } catch (e) {
      setTruncateStatus("error");
    } finally {
      setTruncateLoading(false);
    }
  };

  function handleChange(key: string) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("bio", key);
    router.push(`?${params.toString()}`);
  }

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <span className="text-lg font-semibold">Resume Master</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {BIO_VIEWS.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    className="cursor-pointer"
                    isActive={activeView === item.key}
                    onClick={() => handleChange(item.key)}
                  >
                    {item.label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-3">
        <Link
          href={session ? "/api/auth/signout" : "/api/auth/signin"}
          className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
        >
          {session ? "Sign out" : "Sign in"}
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
