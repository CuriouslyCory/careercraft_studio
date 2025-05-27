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
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

const BIO_VIEWS = [
  { key: "job-postings", label: "Job Postings", href: "/ai-chat/job-postings" },
  { key: "work-history", label: "Work History", href: "/ai-chat/work-history" },
  { key: "profile", label: "Contact Info", href: "/ai-chat/profile" },
  {
    key: "achievements",
    label: "Key Achievements",
    href: "/ai-chat/achievements",
  },
  { key: "skills", label: "Skills", href: "/ai-chat/skills" },
  { key: "education", label: "Education", href: "/ai-chat/education" },

  { key: "links", label: "Links", href: "/ai-chat/links" },
  { key: "documents", label: "Documents", href: "/ai-chat/documents" },
  {
    key: "conversations",
    label: "Conversations",
    href: "/ai-chat/conversations",
  },
];

export function BioSidebar() {
  const pathname = usePathname();
  const session = useSession();

  // Determine active view based on current pathname
  const getActiveView = () => {
    const currentView = BIO_VIEWS.find((view) => pathname === view.href);
    return currentView?.key ?? "documents";
  };

  const activeView = getActiveView();

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
                    asChild
                  >
                    <Link href={item.href}>{item.label}</Link>
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
