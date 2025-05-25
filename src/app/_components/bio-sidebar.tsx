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

  function handleChange(key: string) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("bio", key);
    router.push(`?${params.toString()}`);
  }

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r border-blue-200 bg-gradient-to-b from-slate-50 via-blue-50 to-indigo-100"
    >
      <SidebarHeader className="border-b border-blue-200 p-6">
        <span className="text-xl font-bold text-gray-900">
          CareerCraft{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Studio
          </span>
        </span>
      </SidebarHeader>
      <SidebarContent className="p-0">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 p-4">
              {BIO_VIEWS.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    className={`w-full cursor-pointer px-4 py-3 font-medium transition-all ${
                      activeView === item.key
                        ? "-mx-4 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700"
                        : "text-gray-700 hover:bg-blue-100 hover:text-blue-700"
                    }`}
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
      <SidebarFooter className="border-t border-blue-200 p-4">
        <Link
          href={session ? "/api/auth/signout" : "/api/auth/signin"}
          className="border-blue-600 px-6 py-3 text-center font-semibold text-blue-600 transition-all hover:bg-blue-100"
        >
          {session ? "Sign out" : "Sign in"}
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
