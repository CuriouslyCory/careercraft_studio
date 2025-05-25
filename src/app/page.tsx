import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";
import { LandingPageClient } from "~/app/_components/landing-page-client";

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <LandingPageClient session={session} />
    </HydrateClient>
  );
}
