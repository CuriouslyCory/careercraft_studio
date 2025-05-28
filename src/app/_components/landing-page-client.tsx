"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { animate, stagger } from "motion";
import {
  Brain,
  FileText,
  Target,
  Zap,
  CheckCircle,
  Users,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Upload,
  MessageSquare,
  BarChart3,
  Shield,
  Clock,
} from "lucide-react";

interface LandingPageClientProps {
  session: { user?: { name?: string | null } } | null;
}

/**
 * Client-side landing page component focused on animations and interactivity
 * Static content is handled by LandingPageStatic for SEO optimization
 */
export function LandingPageClient({ session }: LandingPageClientProps) {
  useEffect(() => {
    // Animate hero elements on load
    animate(
      ".hero-title",
      { opacity: [0, 1], y: [50, 0] },
      { duration: 0.8, delay: 0.2 },
    );

    animate(
      ".hero-subtitle",
      { opacity: [0, 1], y: [30, 0] },
      { duration: 0.8, delay: 0.4 },
    );

    animate(
      ".hero-cta",
      { opacity: [0, 1], y: [20, 0] },
      { duration: 0.8, delay: 0.6 },
    );

    // Stagger feature cards
    animate(
      ".feature-card",
      { opacity: [0, 1], y: [30, 0] },
      { delay: stagger(0.1), duration: 0.6 },
    );

    // Animate stats
    animate(
      ".stat-item",
      { opacity: [0, 1], scale: [0.8, 1] },
      { delay: stagger(0.1), duration: 0.5 },
    );

    // Animate how it works steps
    animate(
      ".step-item",
      { opacity: [0, 1], y: [30, 0] },
      { delay: stagger(0.2), duration: 0.6 },
    );

    // Animate benefits
    animate(
      ".benefit-item",
      { opacity: [0, 1], x: [-20, 0] },
      { delay: stagger(0.1), duration: 0.5 },
    );

    // Animate screenshot sections
    animate(
      ".screenshot-section",
      { opacity: [0, 1], y: [40, 0] },
      { delay: stagger(0.3), duration: 0.8 },
    );
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="h-full w-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:60px_60px]"></div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="text-center">
            <h1 className="hero-title text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Master Your{" "}
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Career Journey
              </span>
            </h1>

            <p className="hero-subtitle mx-auto mt-6 max-w-3xl text-xl text-blue-100 sm:text-2xl">
              AI-powered resume and cover letter generation that adapts to every
              job opportunity. Stop sending generic applications—start landing
              interviews.
            </p>

            <div className="hero-cta mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              {session?.user ? (
                <Link
                  href="/ai-chat"
                  className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
                >
                  Launch CareerCraft Studio
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              ) : (
                <Link
                  href="/api/auth/signin"
                  className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
                >
                  Get Started Free
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              )}

              <div className="flex items-center gap-2 text-blue-200">
                <Shield className="h-5 w-5" />
                <span>No credit card required</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="stat-item text-center">
              <div className="text-3xl font-bold text-indigo-600">10x</div>
              <div className="text-sm text-gray-600">
                Faster Resume Creation
              </div>
            </div>
            <div className="stat-item text-center">
              <div className="text-3xl font-bold text-indigo-600">95%</div>
              <div className="text-sm text-gray-600">ATS Compatibility</div>
            </div>
            <div className="stat-item text-center">
              <div className="text-3xl font-bold text-indigo-600">50+</div>
              <div className="text-sm text-gray-600">Industries Supported</div>
            </div>
            <div className="stat-item text-center">
              <div className="text-3xl font-bold text-indigo-600">24/7</div>
              <div className="text-sm text-gray-600">AI Assistant</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything you need to land your dream job
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Powered by advanced AI agents that understand your career goals
            </p>
          </div>

          <div className="mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* AI Chat Feature */}
            <div className="feature-card group rounded-2xl bg-white p-8 shadow-lg transition-all hover:shadow-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 group-hover:bg-blue-200">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                AI Chat Assistant
              </h3>
              <p className="mt-2 text-gray-600">
                Conversational AI that understands your career goals. Get
                personalized advice, manage your profile, and generate documents
                through natural conversation.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                  Data Manager
                </span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                  Resume Generator
                </span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                  Cover Letter Agent
                </span>
              </div>
            </div>

            {/* Resume Import */}
            <div className="feature-card group rounded-2xl bg-white p-8 shadow-lg transition-all hover:shadow-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 group-hover:bg-green-200">
                <Upload className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                Smart Resume Import
              </h3>
              <p className="mt-2 text-gray-600">
                Upload your existing resume or paste text directly. Our AI
                extracts and structures your work history, skills, and
                achievements automatically.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">
                  PDF Support
                </span>
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">
                  Text Parsing
                </span>
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">
                  Auto-Structure
                </span>
              </div>
            </div>

            {/* Job Analysis */}
            <div className="feature-card group rounded-2xl bg-white p-8 shadow-lg transition-all hover:shadow-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 group-hover:bg-purple-200">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                Job Posting Analysis
              </h3>
              <p className="mt-2 text-gray-600">
                Paste any job posting and get instant analysis. Compare
                requirements against your skills and identify gaps to address in
                your application.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs text-purple-700">
                  Skill Matching
                </span>
                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs text-purple-700">
                  Gap Analysis
                </span>
                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs text-purple-700">
                  ATS Keywords
                </span>
              </div>
            </div>

            {/* Tailored Generation */}
            <div className="feature-card group rounded-2xl bg-white p-8 shadow-lg transition-all hover:shadow-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 group-hover:bg-orange-200">
                <Target className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                Tailored Documents
              </h3>
              <p className="mt-2 text-gray-600">
                Generate resumes and cover letters specifically tailored to each
                job application. Highlight relevant experience and optimize for
                ATS systems.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs text-orange-700">
                  Custom Resumes
                </span>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs text-orange-700">
                  Cover Letters
                </span>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs text-orange-700">
                  ATS Optimized
                </span>
              </div>
            </div>

            {/* Skill Management */}
            <div className="feature-card group rounded-2xl bg-white p-8 shadow-lg transition-all hover:shadow-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-100 group-hover:bg-teal-200">
                <Brain className="h-6 w-6 text-teal-600" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                Smart Skill Management
              </h3>
              <p className="mt-2 text-gray-600">
                Intelligent categorization and deduplication of skills across
                multiple industries. Maintain clean profiles while preserving
                detailed variants for ATS matching.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-700">
                  Auto-Categorize
                </span>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-700">
                  Deduplication
                </span>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-700">
                  Multi-Industry
                </span>
              </div>
            </div>

            {/* Achievement Optimization */}
            <div className="feature-card group rounded-2xl bg-white p-8 shadow-lg transition-all hover:shadow-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-100 group-hover:bg-rose-200">
                <Sparkles className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                Achievement Optimization
              </h3>
              <p className="mt-2 text-gray-600">
                AI-powered enhancement of your career achievements. Quantify
                impact, improve language, and structure accomplishments for
                maximum effectiveness.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs text-rose-700">
                  Impact Metrics
                </span>
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs text-rose-700">
                  Language Polish
                </span>
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs text-rose-700">
                  AI Enhancement
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Get started in less than 5 minutes
            </p>
          </div>

          <div className="mt-20 grid gap-12 lg:grid-cols-3">
            <div className="step-item text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                1. Import Your Profile
              </h3>
              <p className="mt-4 text-gray-600">
                Upload your existing resume or build from scratch. Our AI parses
                and organizes your information into a structured profile.
              </p>
            </div>

            <div className="step-item text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                2. Analyze Job Opportunities
              </h3>
              <p className="mt-4 text-gray-600">
                Paste job postings to get instant analysis. See how your skills
                match requirements and get personalized recommendations.
              </p>
            </div>

            <div className="step-item text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <FileText className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                3. Generate Tailored Documents
              </h3>
              <p className="mt-4 text-gray-600">
                Create customized resumes and cover letters for each
                application. Our AI optimizes content for specific roles and
                companies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* See It In Action Section */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              See It In Action
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Get a preview of CareerCraft Studio&apos;s powerful features
            </p>
          </div>

          <div className="mt-20 space-y-24">
            {/* AI Chat Example */}
            <div className="screenshot-section grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="order-2 lg:order-1">
                <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-2 shadow-2xl">
                  <Image
                    src="/images/chat-example.png"
                    alt="AI Chat Assistant Interface showing conversational resume building with natural language processing"
                    className="w-full rounded-xl shadow-lg"
                    width={500}
                    height={300}
                    priority
                  />
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    AI Chat Assistant
                  </h3>
                </div>
                <p className="mb-6 text-lg text-gray-600">
                  Have natural conversations with our AI to manage your profile,
                  analyze job postings, and generate tailored documents. The AI
                  understands context and provides personalized career guidance.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                    Natural Language Processing
                  </span>
                  <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                    Context Awareness
                  </span>
                  <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                    Multi-Agent System
                  </span>
                </div>
              </div>
            </div>

            {/* Skills Management Example */}
            <div className="screenshot-section grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
                    <Brain className="h-5 w-5 text-teal-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Smart Skills Management
                  </h3>
                </div>
                <p className="mb-6 text-lg text-gray-600">
                  Organize and categorize your skills across 50+ industries. Our
                  AI automatically deduplicates similar skills and maintains
                  ATS-friendly variations for maximum compatibility.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700">
                    Auto-Categorization
                  </span>
                  <span className="rounded-full bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700">
                    Skill Normalization
                  </span>
                  <span className="rounded-full bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700">
                    Industry-Specific
                  </span>
                </div>
              </div>
              <div>
                <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 p-2 shadow-2xl">
                  <Image
                    src="/images/your-skills-example.png"
                    alt="Skills Management Interface showing intelligent categorization and deduplication across multiple industries"
                    className="w-full rounded-xl shadow-lg"
                    width={500}
                    height={300}
                  />
                </div>
              </div>
            </div>

            {/* Work History Example */}
            <div className="screenshot-section grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="order-2 lg:order-1">
                <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 p-2 shadow-2xl">
                  <Image
                    src="/images/work-history-example.png"
                    alt="Work History Management Interface showing achievement optimization and AI-powered merging"
                    className="w-full rounded-xl shadow-lg"
                    width={500}
                    height={300}
                  />
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100">
                    <Sparkles className="h-5 w-5 text-rose-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Achievement Optimization
                  </h3>
                </div>
                <p className="mb-6 text-lg text-gray-600">
                  Transform your work history into compelling achievements. Our
                  AI intelligently merges similar accomplishments and optimizes
                  them for maximum impact in your applications.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">
                    Achievement Merging
                  </span>
                  <span className="rounded-full bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">
                    Impact Optimization
                  </span>
                  <span className="rounded-full bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">
                    Deduplication
                  </span>
                </div>
              </div>
            </div>

            {/* Job Postings Analysis Example */}
            <div className="screenshot-section grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Job Posting Analysis
                  </h3>
                </div>
                <p className="mb-6 text-lg text-gray-600">
                  Paste any job posting to get instant compatibility analysis.
                  See which of your skills match the requirements and identify
                  gaps to address in your tailored applications.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700">
                    Skill Matching
                  </span>
                  <span className="rounded-full bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700">
                    Gap Analysis
                  </span>
                  <span className="rounded-full bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700">
                    ATS Keywords
                  </span>
                </div>
              </div>
              <div>
                <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 p-2 shadow-2xl">
                  <Image
                    src="/images/job-postings-example.png"
                    alt="Job Posting Analysis Interface showing skill matching, gap analysis, and ATS keyword optimization"
                    className="w-full rounded-xl shadow-lg"
                    width={500}
                    height={300}
                  />
                </div>
              </div>
            </div>

            {/* Compatibility Analysis Example */}
            <div className="screenshot-section grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="order-2 lg:order-1">
                <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 p-2 shadow-2xl">
                  <Image
                    src="/images/compatibility-analysis-example.png"
                    alt="Compatibility Analysis Interface showing detailed scoring, skill breakdown, and actionable insights"
                    className="w-full rounded-xl shadow-lg"
                    width={500}
                    height={300}
                  />
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                    <Target className="h-5 w-5 text-orange-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Detailed Compatibility Analysis
                  </h3>
                </div>
                <p className="mb-6 text-lg text-gray-600">
                  Get comprehensive compatibility scores with detailed
                  breakdowns. See exactly which skills match, what&apos;s
                  missing, and receive actionable recommendations to improve
                  your application success rate.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700">
                    Percentage Scoring
                  </span>
                  <span className="rounded-full bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700">
                    Skill Breakdown
                  </span>
                  <span className="rounded-full bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700">
                    Actionable Insights
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-16 text-center">
            <p className="mb-8 text-lg text-gray-600">
              Ready to experience these powerful features yourself?
            </p>
            {session?.user ? (
              <Link
                href="/ai-chat"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
              >
                Try It Now
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            ) : (
              <Link
                href="/api/auth/signin"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Why choose CareerCraft Studio?
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Join thousands of professionals who have transformed their job
                search with AI-powered career tools.
              </p>

              <div className="mt-12 space-y-6">
                <div className="benefit-item flex items-start gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      AI-Powered Personalization
                    </h3>
                    <p className="text-gray-600">
                      Unlike generic resume builders, our AI understands context
                      and creates truly personalized documents.
                    </p>
                  </div>
                </div>

                <div className="benefit-item flex items-start gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      95% ATS Compatibility
                    </h3>
                    <p className="text-gray-600">
                      Ensure your resume passes through Applicant Tracking
                      Systems with our industry-leading compatibility rate.
                    </p>
                  </div>
                </div>

                <div className="benefit-item flex items-start gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Multi-Industry Expertise
                    </h3>
                    <p className="text-gray-600">
                      Support for 50+ industries with specialized knowledge of
                      requirements and terminology.
                    </p>
                  </div>
                </div>

                <div className="benefit-item flex items-start gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                    <CheckCircle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Continuous Learning
                    </h3>
                    <p className="text-gray-600">
                      Our AI improves based on successful placements and
                      industry trends, keeping your documents current.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
                <div className="flex h-full flex-col justify-center space-y-6">
                  <div className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      <div className="text-sm font-medium">
                        Resume Generated
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      Tailored for Software Engineer at Tech Corp
                    </div>
                  </div>

                  <div className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                      <div className="text-sm font-medium">Skills Matched</div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      React, TypeScript, Node.js +12 more
                    </div>
                  </div>

                  <div className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-purple-500"></div>
                      <div className="text-sm font-medium">ATS Score</div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      98% compatibility rating
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 py-24 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Ready to transform your job search?
            </h2>
            <p className="mt-4 text-xl text-blue-100">
              Join thousands of professionals who have improved their career
              prospects with CareerCraft Studio.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              {session?.user ? (
                <Link
                  href="/ai-chat"
                  className="group flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-indigo-900 shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl"
                >
                  Continue to Dashboard
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              ) : (
                <Link
                  href="/api/auth/signin"
                  className="group flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-indigo-900 shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl"
                >
                  Get Started Free
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              )}

              <div className="flex items-center gap-2 text-blue-200">
                <Clock className="h-5 w-5" />
                <span>Setup takes less than 5 minutes</span>
              </div>
            </div>

            {session?.user && (
              <p className="mt-6 text-blue-200">
                Welcome back, {session.user.name}! Ready to continue your career
                journey?
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
