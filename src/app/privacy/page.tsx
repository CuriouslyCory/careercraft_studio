import { type Metadata } from "next";
import Link from "next/link";
import { Shield, Lock, Eye, Users, Database, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy - CareerCraft Studio",
  description:
    "Learn how CareerCraft Studio protects your privacy and handles your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-4 text-xl text-blue-100">
              Your privacy is our priority. Learn how we protect and handle your
              information.
            </p>
            <p className="mt-2 text-sm text-blue-200">
              Last updated:{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-8 shadow-lg lg:p-12">
          {/* Introduction */}
          <section className="mb-12">
            <h2 className="mb-6 text-3xl font-bold text-gray-900">
              Introduction
            </h2>
            <p className="mb-4 text-lg text-gray-600">
              CareerCraft Studio (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or
              &ldquo;us&rdquo;) is committed to protecting your privacy. This
              Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our AI-powered career
              development platform.
            </p>
            <p className="text-lg text-gray-600">
              By using CareerCraft Studio, you agree to the collection and use
              of information in accordance with this policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-12">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                Information We Collect
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900">
                  Personal Information
                </h3>
                <p className="mb-3 text-gray-600">
                  We collect information you provide directly to us, including:
                </p>
                <ul className="ml-6 space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                    <span>
                      Account information (name, email address, profile details)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                    <span>
                      Professional information (work history, education, skills,
                      achievements)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                    <span>Resume and cover letter content</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                    <span>Job posting information you import or analyze</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                    <span>Communications with our AI chat system</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900">
                  Automatically Collected Information
                </h3>
                <p className="mb-3 text-gray-600">
                  We automatically collect certain information when you use our
                  service:
                </p>
                <ul className="ml-6 space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                    <span>Usage data and analytics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                    <span>Device information and browser type</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                    <span>IP address and location data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                    <span>Cookies and similar tracking technologies</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-12">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <Eye className="h-5 w-5 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                How We Use Your Information
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">
                We use the information we collect to:
              </p>
              <ul className="ml-6 space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-600"></span>
                  <span>
                    Provide, maintain, and improve our AI-powered career
                    services
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-600"></span>
                  <span>Generate personalized resumes and cover letters</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-600"></span>
                  <span>
                    Analyze job compatibility and provide career recommendations
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-600"></span>
                  <span>Process your requests through our AI chat system</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-600"></span>
                  <span>Send you service-related communications</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-600"></span>
                  <span>Ensure security and prevent fraud</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-600"></span>
                  <span>Comply with legal obligations</span>
                </li>
              </ul>
            </div>
          </section>

          {/* AI Processing and Third-Party Services */}
          <section className="mb-12">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <Globe className="h-5 w-5 text-purple-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                AI Processing and Third-Party Services
              </h2>
            </div>

            <div className="mb-6 rounded-lg bg-purple-50 p-6">
              <h3 className="mb-3 text-xl font-semibold text-purple-900">
                Google Gemini AI Processing
              </h3>
              <p className="text-purple-800">
                <strong>Important:</strong> To provide our AI-powered features,
                we send your professional details (including resume content,
                work history, skills, and job posting information) to
                Google&rsquo;s Gemini AI service for processing. This enables us
                to generate personalized resumes, cover letters, and career
                recommendations.
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">
                We work with the following third-party services:
              </p>
              <ul className="ml-6 space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-purple-600"></span>
                  <span>
                    <strong>Google Gemini:</strong> AI language model for
                    content generation and analysis
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-purple-600"></span>
                  <span>
                    <strong>Authentication Providers:</strong> For secure
                    account creation and login
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-purple-600"></span>
                  <span>
                    <strong>Cloud Infrastructure:</strong> For hosting and data
                    storage
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-purple-600"></span>
                  <span>
                    <strong>Analytics Services:</strong> For usage analytics and
                    service improvement
                  </span>
                </li>
              </ul>
              <p className="mt-4 text-gray-600">
                These services are bound by their own privacy policies and our
                data processing agreements.
              </p>
            </div>
          </section>

          {/* Information Sharing */}
          <section className="mb-12">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <Users className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                Information Sharing and Disclosure
              </h2>
            </div>

            <div className="mb-6 rounded-lg bg-green-50 p-6">
              <h3 className="mb-3 text-xl font-semibold text-green-900">
                What We Don&rsquo;t Do
              </h3>
              <p className="text-green-800">
                <strong>
                  We do not sell, rent, or share your personal information with
                  advertisers or marketing companies.
                </strong>{" "}
                Your career data is never used for advertising purposes or
                shared with third parties for their marketing activities.
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">
                We may share your information only in the following limited
                circumstances:
              </p>
              <ul className="ml-6 space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-600"></span>
                  <span>
                    <strong>Service Providers:</strong> With trusted third-party
                    services that help us operate our platform (like Google
                    Gemini for AI processing)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-600"></span>
                  <span>
                    <strong>Legal Requirements:</strong> When required by law,
                    court order, or government request
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-600"></span>
                  <span>
                    <strong>Safety and Security:</strong> To protect our users,
                    prevent fraud, or address security issues
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-600"></span>
                  <span>
                    <strong>Business Transfers:</strong> In connection with a
                    merger, acquisition, or sale of assets (with user
                    notification)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-600"></span>
                  <span>
                    <strong>With Your Consent:</strong> When you explicitly
                    authorize us to share specific information
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* Data Security */}
          <section className="mb-12">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                <Lock className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                Data Security
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">
                We implement appropriate technical and organizational security
                measures to protect your personal information, including:
              </p>
              <ul className="ml-6 space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                  <span>Encryption of data in transit and at rest</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                  <span>Secure authentication and access controls</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                  <span>Regular security assessments and updates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                  <span>
                    Limited access to personal data on a need-to-know basis
                  </span>
                </li>
              </ul>
              <p className="mt-4 text-gray-600">
                However, no method of transmission over the internet or
                electronic storage is 100% secure. While we strive to protect
                your information, we cannot guarantee absolute security.
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section className="mb-12">
            <h2 className="mb-6 text-3xl font-bold text-gray-900">
              Your Rights and Choices
            </h2>

            <div className="space-y-4">
              <p className="text-gray-600">
                You have the following rights regarding your personal
                information:
              </p>
              <ul className="ml-6 space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                  <span>
                    <strong>Access:</strong> Request access to your personal
                    information
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                  <span>
                    <strong>Correction:</strong> Request correction of
                    inaccurate information
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                  <span>
                    <strong>Deletion:</strong> Request deletion of your personal
                    information
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                  <span>
                    <strong>Portability:</strong> Request a copy of your data in
                    a portable format
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                  <span>
                    <strong>Opt-out:</strong> Unsubscribe from marketing
                    communications
                  </span>
                </li>
              </ul>
              <p className="mt-4 text-gray-600">
                To exercise these rights, please use the Account page in your
                dashboard. You can request a copy of your data or request
                account deletion at any time. Data requests and deletion
                requests are processed within 48 hours. When you request
                deletion, your account is immediately flagged for deletion (soft
                delete) and will be permanently deleted soon after. You will
                receive confirmation via email when your request is processed.
              </p>
            </div>
          </section>

          {/* Data Retention */}
          <section className="mb-12">
            <h2 className="mb-6 text-3xl font-bold text-gray-900">
              Data Retention
            </h2>
            <p className="mb-4 text-gray-600">
              We retain your personal information for as long as necessary to
              provide our services and fulfill the purposes outlined in this
              Privacy Policy. We will delete or anonymize your information when:
            </p>
            <ul className="ml-6 space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-600"></span>
                <span>You request deletion of your account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-600"></span>
                <span>
                  Your account has been inactive for an extended period
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-600"></span>
                <span>
                  We are no longer required to retain it for legal or business
                  purposes
                </span>
              </li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section className="mb-12">
            <h2 className="mb-6 text-3xl font-bold text-gray-900">
              Children&rsquo;s Privacy
            </h2>
            <p className="text-gray-600">
              CareerCraft Studio is not intended for use by children under the
              age of 13. We do not knowingly collect personal information from
              children under 13. If we become aware that we have collected
              personal information from a child under 13, we will take steps to
              delete such information promptly.
            </p>
          </section>

          {/* International Users */}
          <section className="mb-12">
            <h2 className="mb-6 text-3xl font-bold text-gray-900">
              International Users
            </h2>
            <p className="text-gray-600">
              If you are accessing CareerCraft Studio from outside the United
              States, please be aware that your information may be transferred
              to, stored, and processed in the United States where our servers
              are located. By using our service, you consent to the transfer of
              your information to the United States.
            </p>
          </section>

          {/* Changes to Privacy Policy */}
          <section className="mb-12">
            <h2 className="mb-6 text-3xl font-bold text-gray-900">
              Changes to This Privacy Policy
            </h2>
            <p className="mb-4 text-gray-600">
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by:
            </p>
            <ul className="ml-6 space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-600"></span>
                <span>Posting the new Privacy Policy on this page</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-600"></span>
                <span>
                  Updating the &ldquo;Last updated&rdquo; date at the top of
                  this policy
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-600"></span>
                <span>
                  Sending you an email notification for significant changes
                </span>
              </li>
            </ul>
            <p className="mt-4 text-gray-600">
              Your continued use of CareerCraft Studio after any changes
              indicates your acceptance of the updated Privacy Policy.
            </p>
          </section>

          {/* Contact Information */}
          <section className="mb-8">
            <h2 className="mb-6 text-3xl font-bold text-gray-900">
              Contact Us
            </h2>
            <p className="mb-4 text-gray-600">
              If you have any questions about this Privacy Policy or our privacy
              practices, please contact us at:
            </p>
            <div className="rounded-lg bg-blue-50 p-6">
              <p className="text-blue-900">
                <strong>Email:</strong> cory@curiouslycory.com
              </p>
              <p className="mt-2 text-blue-900">
                <strong>Subject Line:</strong> Privacy Policy Inquiry
              </p>
            </div>
          </section>

          {/* Back to Home */}
          <div className="border-t border-gray-200 pt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white transition-all hover:from-blue-700 hover:to-indigo-700"
            >
              Back to CareerCraft Studio
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
