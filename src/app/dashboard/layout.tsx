import Link from "next/link";
import { auth } from "~/server/auth";
import { TopNavigation } from "./_components/top-navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white">
        <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
          <h1 className="text-6xl font-bold tracking-tight text-white sm:text-7xl">
            CareerCraft{" "}
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Studio
            </span>
          </h1>
          <div className="flex flex-col items-center gap-6">
            <p className="text-center text-xl text-blue-100">
              Please sign in to access your professional dashboard
            </p>
            <Link
              href="/api/auth/signin?callbackUrl=/dashboard"
              className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
            >
              Sign in to Continue
            </Link>
            <Link
              href="/"
              className="rounded-full border-2 border-blue-600 px-6 py-3 text-sm font-semibold text-blue-100 transition-all hover:bg-blue-600 hover:text-white"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <main className="pt-16">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
