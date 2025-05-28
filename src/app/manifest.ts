import { type MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CareerCraft Studio - AI-Powered Resume & Cover Letter Builder",
    short_name: "CareerCraft Studio",
    description:
      "Create tailored resumes and cover letters with AI assistance. Upload your resume, analyze job postings, and generate personalized documents that get you interviews.",
    start_url: "/",
    display: "standalone",
    background_color: "#1e293b",
    theme_color: "#3b82f6",
    orientation: "portrait",
    scope: "/",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["business", "productivity", "utilities"],
    lang: "en-US",
    dir: "ltr",
  };
}
