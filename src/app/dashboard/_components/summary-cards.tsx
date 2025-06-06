"use client";

import Link from "next/link";
import {
  Briefcase,
  GraduationCap,
  Award,
  Wrench,
  Link as LinkIcon,
  User,
  Plus,
  Edit,
} from "lucide-react";
import { Button } from "~/components/ui/button";

interface SummaryCardsProps {
  workHistory: Array<{ id: string; companyName: string; jobTitle: string }>;
  education: Array<{ id: string; institutionName: string; type: string }>;
  achievements: Array<{ id: string; content: string }>;
  skills: Array<{ id: string; skill: { name: string } }>;
  links: Array<{ id: string; title: string; type: string }>;
  profile:
    | {
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
        phone?: string | null;
        location?: string | null;
      }
    | null
    | undefined;
}

export function SummaryCards({
  workHistory,
  education,
  achievements,
  skills,
  links,
  profile,
}: SummaryCardsProps) {
  const cards = [
    {
      title: "Work History",
      icon: Briefcase,
      count: workHistory.length,
      description:
        workHistory.length > 0
          ? `Latest: ${workHistory[0]?.jobTitle} at ${workHistory[0]?.companyName}`
          : "No work history added yet",
      href: "/dashboard/work-history",
      color: "bg-blue-50 text-blue-600 border-blue-200",
      iconColor: "text-blue-600",
    },
    {
      title: "Contact Info",
      icon: User,
      count: profile ? 1 : 0,
      description:
        profile?.firstName && profile?.lastName
          ? `${profile.firstName} ${profile.lastName}`
          : "Contact information not set up",
      href: "/dashboard/contact-info",
      color: "bg-green-50 text-green-600 border-green-200",
      iconColor: "text-green-600",
    },
    {
      title: "Key Achievements",
      icon: Award,
      count: achievements.length,
      description:
        achievements.length > 0
          ? `${achievements.length} achievement${achievements.length !== 1 ? "s" : ""} recorded`
          : "No achievements added yet",
      href: "/dashboard/achievements",
      color: "bg-yellow-50 text-yellow-600 border-yellow-200",
      iconColor: "text-yellow-600",
    },
    {
      title: "Skills",
      icon: Wrench,
      count: skills.length,
      description:
        skills.length > 0
          ? `Latest: ${skills
              .slice(0, 3)
              .map((s) => s.skill.name)
              .join(", ")}${skills.length > 3 ? "..." : ""}`
          : "No skills added yet",
      href: "/dashboard/skills",
      color: "bg-purple-50 text-purple-600 border-purple-200",
      iconColor: "text-purple-600",
    },
    {
      title: "Education",
      icon: GraduationCap,
      count: education.length,
      description:
        education.length > 0
          ? `Latest: ${education[0]?.institutionName}`
          : "No education records added yet",
      href: "/dashboard/education",
      color: "bg-indigo-50 text-indigo-600 border-indigo-200",
      iconColor: "text-indigo-600",
    },
    {
      title: "Links",
      icon: LinkIcon,
      count: links.length,
      description:
        links.length > 0
          ? `${links.length} link${links.length !== 1 ? "s" : ""} added`
          : "No links added yet",
      href: "/dashboard/links",
      color: "bg-pink-50 text-pink-600 border-pink-200",
      iconColor: "text-pink-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const hasData = card.count > 0;

        return (
          <div
            key={card.title}
            className={`rounded-lg border p-6 transition-all hover:shadow-md ${card.color}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`rounded-lg p-2 ${card.iconColor} bg-white`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{card.title}</h3>
                  <p className="text-sm opacity-75">
                    {card.count} item{card.count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="line-clamp-2 text-sm opacity-75">
                {card.description}
              </p>
            </div>

            <div className="mt-4 flex space-x-2">
              <Button asChild size="sm" variant="outline" className="flex-1">
                <Link
                  href={card.href}
                  className="flex items-center justify-center"
                >
                  {hasData ? (
                    <>
                      <Edit className="mr-2 h-4 w-4" />
                      Manage
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </>
                  )}
                </Link>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
