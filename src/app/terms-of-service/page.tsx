import { type Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  AlertTriangle,
  Shield,
  Users,
  Gavel,
  CreditCard,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service - CareerCraft Studio",
  description:
    "Terms and conditions for using CareerCraft Studio's AI-powered career development platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Terms of Service
            </h1>
            <p className="mt-4 text-xl text-blue-100">
              Please read these terms carefully before using CareerCraft Studio.
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
              Agreement to Terms
            </h2>
            <p className="mb-4 text-lg text-gray-600">
              These Terms of Service (&ldquo;Terms&rdquo;) govern your use of
              CareerCraft Studio (&ldquo;Service&rdquo;) operated by CareerCraft
              Studio (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;).
            </p>
            <p className="mb-4 text-lg text-gray-600">
              By accessing or using our Service at{" "}
              <strong>https://careercraft.studio</strong>, you agree to be bound
              by these Terms. If you disagree with any part of these terms, then
              you may not access the Service.
            </p>
            <div className="rounded-lg bg-yellow-50 p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 h-6 w-6 text-yellow-600" />
                <div>
                  <h3 className="mb-2 font-semibold text-yellow-900">
                    Important Notice
                  </h3>
                  <p className="text-yellow-800">
                    These terms include important provisions regarding liability
                    limitations, dispute resolution, and your rights. Please
                    read them carefully.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Service Description */}
          <section className="mb-12">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                Description of Service
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">
                CareerCraft Studio is an AI-powered career development platform
                that provides:
              </p>
              <ul className="ml-6 space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                  <span>
                    Resume and cover letter generation and optimization
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                  <span>Job posting analysis and compatibility assessment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                  <span>AI-powered career guidance and recommendations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                  <span>
                    Professional profile management and skill tracking
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                  <span>Document storage and organization tools</span>
                </li>
              </ul>
            </div>
          </section>

          {/* User Accounts */}
          <section className="mb-12">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                User Accounts and Registration
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">
                To access certain features of the Service, you must create an
                account. You agree to:
              </p>
              <ul className="ml-6 space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-600"></span>
                  <span>
                    Provide accurate, current, and complete information during
                    registration
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-600"></span>
                  <span>
                    Maintain and update your account information to keep it
                    accurate and current
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-600"></span>
                  <span>Maintain the security of your account credentials</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-600"></span>
                  <span>
                    Accept responsibility for all activities that occur under
                    your account
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-600"></span>
                  <span>
                    Notify us immediately of any unauthorized use of your
                    account
                  </span>
                </li>
              </ul>
              <p className="mt-4 text-gray-600">
                You must be at least 13 years old to create an account. If you
                are under 18, you represent that you have your parent or
                guardian&rsquo;s permission to use the Service.
              </p>
            </div>
          </section>

          {/* Acceptable Use */}
          <section className="mb-12">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <Gavel className="h-5 w-5 text-purple-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                Acceptable Use Policy
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900">
                  Permitted Uses
                </h3>
                <p className="mb-3 text-gray-600">
                  You may use the Service for lawful purposes only, including:
                </p>
                <ul className="ml-6 space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-purple-600"></span>
                    <span>
                      Creating and managing your professional career documents
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-purple-600"></span>
                    <span>
                      Analyzing job opportunities and career compatibility
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-purple-600"></span>
                    <span>
                      Seeking career guidance and professional development
                    </span>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg bg-red-50 p-6">
                <h3 className="mb-3 text-xl font-semibold text-red-900">
                  Prohibited Activities
                </h3>
                <p className="mb-3 text-red-800">
                  You agree NOT to use the Service to:
                </p>
                <ul className="ml-6 space-y-2 text-red-800">
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-600"></span>
                    <span>
                      Violate any applicable laws, regulations, or third-party
                      rights
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-600"></span>
                    <span>
                      Upload false, misleading, or fraudulent information
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-600"></span>
                    <span>
                      Attempt to gain unauthorized access to our systems or
                      other users&rsquo; accounts
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-600"></span>
                    <span>
                      Use automated tools to scrape, harvest, or collect data
                      from the Service
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-600"></span>
                    <span>
                      Interfere with or disrupt the Service or servers
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-600"></span>
                    <span>
                      Transmit viruses, malware, or other harmful code
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-600"></span>
                    <span>
                      Use the Service for any commercial purpose without our
                      written consent
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-600"></span>
                    <span>
                      Reverse engineer, decompile, or attempt to extract source
                      code
                    </span>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg bg-orange-50 p-6">
                <h3 className="mb-3 text-xl font-semibold text-orange-900">
                  Enforcement and Consequences
                </h3>
                <p className="text-orange-800">
                  <strong>Violation of these terms may result in:</strong>{" "}
                  immediate account suspension, cancellation of your
                  subscription without refund, permanent account termination,
                  and/or legal action. We reserve the right to investigate
                  suspected violations and cooperate with law enforcement
                  authorities.
                </p>
              </div>
            </div>
          </section>

          {/* Subscription and Payment */}
          <section className="mb-12">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                <CreditCard className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                Subscription and Payment Terms
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900">
                  Service Plans
                </h3>
                <p className="mb-3 text-gray-600">
                  We offer both free and paid subscription plans. Paid plans
                  provide additional features and usage limits.
                </p>
              </div>

              <div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900">
                  Payment and Billing
                </h3>
                <ul className="ml-6 space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                    <span>
                      Subscription fees are billed in advance on a recurring
                      basis
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                    <span>
                      All fees are non-refundable except as required by law
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                    <span>
                      You authorize us to charge your payment method for all
                      fees
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                    <span>
                      We may change subscription prices with 30 days&rsquo;
                      notice
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900">
                  Cancellation and Termination
                </h3>
                <ul className="ml-6 space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                    <span>
                      You may cancel your subscription at any time through your
                      account settings
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                    <span>
                      Cancellation takes effect at the end of your current
                      billing period
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                    <span>
                      We may terminate accounts for violations of these Terms
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                    <span>
                      Upon termination, your access to paid features will cease
                      immediately
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Intellectual Property */}
          <section className="mb-12">
            <h2 className="mb-6 text-3xl font-bold text-gray-900">
              Intellectual Property Rights
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900">
                  Our Rights
                </h3>
                <p className="text-gray-600">
                  The Service and its original content, features, and
                  functionality are owned by CareerCraft Studio and are
                  protected by international copyright, trademark, patent, trade
                  secret, and other intellectual property laws.
                </p>
              </div>

              <div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900">
                  Your Content
                </h3>
                <p className="mb-3 text-gray-600">
                  You retain ownership of content you submit to the Service.
                  However, you grant us a limited license to:
                </p>
                <ul className="ml-6 space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-600"></span>
                    <span>Process your content to provide the Service</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-600"></span>
                    <span>
                      Use AI services to analyze and generate career-related
                      content
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-600"></span>
                    <span>
                      Store and backup your content for service delivery
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Privacy and Data */}
          <section className="mb-12">
            <h2 className="mb-6 text-3xl font-bold text-gray-900">
              Privacy and Data Protection
            </h2>
            <p className="mb-4 text-gray-600">
              Your privacy is important to us. Our collection and use of
              personal information is governed by our Privacy Policy, which is
              incorporated into these Terms by reference.
            </p>
            <div className="rounded-lg bg-blue-50 p-6">
              <p className="text-blue-900">
                <strong>Important:</strong> By using our Service, you
                acknowledge that we process your professional information using
                AI services (including Google Gemini) to provide career-related
                features. Please review our{" "}
                <Link href="/privacy" className="underline hover:text-blue-700">
                  Privacy Policy
                </Link>{" "}
                for detailed information about data handling.
              </p>
            </div>
          </section>

          {/* Disclaimers */}
          <section className="mb-12">
            <h2 className="mb-6 text-3xl font-bold text-gray-900">
              Disclaimers and Limitations
            </h2>

            <div className="space-y-6">
              <div className="rounded-lg bg-yellow-50 p-6">
                <h3 className="mb-3 text-xl font-semibold text-yellow-900">
                  Service Availability
                </h3>
                <p className="text-yellow-800">
                  The Service is provided &ldquo;as is&rdquo; and &ldquo;as
                  available.&rdquo; We do not guarantee uninterrupted access or
                  error-free operation. We may modify, suspend, or discontinue
                  the Service at any time.
                </p>
              </div>

              <div className="rounded-lg bg-orange-50 p-6">
                <h3 className="mb-3 text-xl font-semibold text-orange-900">
                  Career Advice Disclaimer
                </h3>
                <p className="text-orange-800">
                  Our AI-generated career advice and recommendations are for
                  informational purposes only. We do not guarantee job
                  placement, interview success, or career advancement.
                  Professional career decisions should consider multiple factors
                  beyond our recommendations.
                </p>
              </div>

              <div className="rounded-lg bg-red-50 p-6">
                <h3 className="mb-3 text-xl font-semibold text-red-900">
                  Limitation of Liability
                </h3>
                <p className="text-red-800">
                  To the maximum extent permitted by law, CareerCraft Studio
                  shall not be liable for any indirect, incidental, special,
                  consequential, or punitive damages, including lost profits,
                  data, or business opportunities, arising from your use of the
                  Service.
                </p>
              </div>
            </div>
          </section>

          {/* Dispute Resolution */}
          <section className="mb-12">
            <h2 className="mb-6 text-3xl font-bold text-gray-900">
              Dispute Resolution
            </h2>
            <div className="space-y-4">
              <p className="text-gray-600">
                If you have a dispute with us, please contact us first to
                attempt informal resolution. If we cannot resolve the dispute
                informally, any legal action must be brought in the courts of
                the jurisdiction where CareerCraft Studio is located.
              </p>
              <p className="text-gray-600">
                These Terms are governed by and construed in accordance with
                applicable laws, without regard to conflict of law principles.
              </p>
            </div>
          </section>

          {/* Changes to Terms */}
          <section className="mb-12">
            <h2 className="mb-6 text-3xl font-bold text-gray-900">
              Changes to These Terms
            </h2>
            <p className="mb-4 text-gray-600">
              We reserve the right to modify these Terms at any time. We will
              notify users of material changes by:
            </p>
            <ul className="ml-6 space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-600"></span>
                <span>Posting updated Terms on this page</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-600"></span>
                <span>Updating the &ldquo;Last updated&rdquo; date</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-600"></span>
                <span>Sending email notifications for significant changes</span>
              </li>
            </ul>
            <p className="mt-4 text-gray-600">
              Your continued use of the Service after changes become effective
              constitutes acceptance of the new Terms.
            </p>
          </section>

          {/* Contact Information */}
          <section className="mb-8">
            <h2 className="mb-6 text-3xl font-bold text-gray-900">
              Contact Information
            </h2>
            <p className="mb-4 text-gray-600">
              If you have questions about these Terms of Service, please contact
              us:
            </p>
            <div className="rounded-lg bg-blue-50 p-6">
              <p className="text-blue-900">
                <strong>Email:</strong> cory@curiouslycory.com
              </p>
              <p className="mt-2 text-blue-900">
                <strong>Website:</strong> https://careercraft.studio
              </p>
              <p className="mt-2 text-blue-900">
                <strong>Subject Line:</strong> Terms of Service Inquiry
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
