import { type Metadata } from "next";
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";
import { LandingPageClient } from "~/app/_components/landing-page-client";
import { LandingPageStatic } from "./_components/landing-page-static";

export const metadata: Metadata = {
  title: "CareerCraft Studio - AI-Powered Resume & Cover Letter Builder",
  description:
    "Create tailored resumes and cover letters with AI assistance. Upload your resume, analyze job postings, and generate personalized documents that get you interviews. 95% ATS compatibility across 50+ industries.",
  keywords: [
    "AI resume builder",
    "cover letter generator",
    "job application tools",
    "ATS optimization",
    "career development",
    "resume parser",
    "job posting analysis",
    "interview preparation",
    "professional documents",
    "career assistant",
  ],
  authors: [{ name: "CareerCraft Studio" }],
  creator: "CareerCraft Studio",
  publisher: "CareerCraft Studio",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://careercraft.studio"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "CareerCraft Studio - AI-Powered Resume & Cover Letter Builder",
    description:
      "Create tailored resumes and cover letters with AI assistance. Upload your resume, analyze job postings, and generate personalized documents that get you interviews.",
    url: "https://careercraft.studio",
    siteName: "CareerCraft Studio",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CareerCraft Studio - AI-Powered Career Tools",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CareerCraft Studio - AI-Powered Resume & Cover Letter Builder",
    description:
      "Create tailored resumes and cover letters with AI assistance. Get interviews with personalized documents optimized for ATS systems.",
    images: ["/og-image.png"],
    creator: "@careercraft",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
  },
  category: "technology",
};

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <LandingPageStatic />
      <LandingPageClient session={session} />
    </HydrateClient>
  );
}
