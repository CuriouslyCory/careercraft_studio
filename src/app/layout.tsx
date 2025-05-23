import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { auth } from "~/server/auth";

import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "~/components/ui/sonner";
import { SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";
import { BioSidebar } from "./_components/bio-sidebar";

export const metadata: Metadata = {
  title: "Resume Master",
  description:
    "Resume Master is a tool that helps you create resumes and cover letters tailored to your job applications.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider session={session}>
          {children}
          <Toaster />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
