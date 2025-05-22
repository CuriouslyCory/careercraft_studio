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
} from "~/components/ui/sidebar";
import { useSearchParams, useRouter } from "next/navigation";

const BIO_VIEWS = [
  { key: "documents", label: "Documents" },
  { key: "workHistory", label: "Work History" },
  { key: "keyAchievements", label: "Key Achievements" },
  { key: "skills", label: "Skills" },
  { key: "education", label: "Education" },
];

export function BioSidebar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeView = searchParams.get("bio") ?? "documents";

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
    </Sidebar>
  );
}
