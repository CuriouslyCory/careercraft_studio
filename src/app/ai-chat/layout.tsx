import Link from "next/link";
import { SidebarProvider } from "~/components/ui/sidebar";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { BioSidebar } from "../_components/bio-sidebar";
import { auth } from "~/server/auth";

export default async function AiChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // If user is not authenticated, show login prompt
  if (!session?.user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-[3rem]">
            Resume <span className="text-[hsl(280,100%,70%)]">Master</span>
          </h1>
          <div className="flex flex-col items-center gap-4">
            <p className="text-center text-xl text-white">
              Please sign in to access Resume Master
            </p>
            <Link
              href="/api/auth/signin?callbackUrl=/ai-chat"
              className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
            >
              Sign in
            </Link>
            <Link
              href="/"
              className="rounded-full bg-gray-600/50 px-6 py-2 text-sm font-medium no-underline transition hover:bg-gray-600/70"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If authenticated, show the normal layout
  return (
    <SidebarProvider>
      <BioSidebar />
      <main className="flex h-screen w-full">
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  );
}
