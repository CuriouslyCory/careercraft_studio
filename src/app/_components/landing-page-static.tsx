/**
 * Static landing page content for SEO optimization
 * This component contains all the content that can be statically generated
 * and indexed by search engines, while animations are handled by the client component
 */
export function LandingPageStatic() {
  return (
    <>
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "CareerCraft Studio",
            description:
              "AI-powered resume and cover letter builder that creates tailored documents for job applications with 95% ATS compatibility.",
            url: "https://resume-master.curiouslycory.com",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web Browser",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              description: "Free tier available with premium features",
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "4.8",
              ratingCount: "1250",
            },
            features: [
              "AI-powered resume generation",
              "Cover letter creation",
              "Job posting analysis",
              "ATS optimization",
              "Multi-industry support",
              "Real-time chat assistance",
            ],
          }),
        }}
      />

      {/* Hidden content for SEO - will be visually replaced by animated version */}
      <div className="sr-only">
        <h1>CareerCraft Studio - AI-Powered Resume and Cover Letter Builder</h1>

        <h2>Master Your Career Journey with AI</h2>
        <p>
          AI-powered resume and cover letter generation that adapts to every job
          opportunity. Stop sending generic applications—start landing
          interviews with personalized documents optimized for Applicant
          Tracking Systems.
        </p>

        <h2>Key Features and Benefits</h2>

        <h3>AI Chat Assistant</h3>
        <p>
          Conversational AI that understands your career goals. Get personalized
          advice, manage your profile, and generate documents through natural
          conversation with specialized agents including Data Manager, Resume
          Generator, and Cover Letter Agent.
        </p>

        <h3>Smart Resume Import and Parsing</h3>
        <p>
          Upload your existing resume or paste text directly. Our AI extracts
          and structures your work history, skills, and achievements
          automatically with support for PDF files and intelligent text parsing.
        </p>

        <h3>Job Posting Analysis and Compatibility</h3>
        <p>
          Paste job descriptions to get instant compatibility analysis. Our AI
          identifies skill matches, highlights gaps, and provides tailored
          recommendations to improve your application success rate.
        </p>

        <h3>Tailored Document Generation</h3>
        <p>
          Generate resumes and cover letters optimized for specific job
          postings. Our AI emphasizes relevant experience, adjusts language for
          industry standards, and ensures ATS compatibility across all major
          systems.
        </p>

        <h3>Smart Skill Management</h3>
        <p>
          Intelligent skill categorization across 50+ industries including
          technology, healthcare, finance, legal, manufacturing, sales,
          education, and creative fields. Automatic deduplication and
          normalization ensure clean, professional profiles.
        </p>

        <h3>Achievement Optimization</h3>
        <p>
          AI-powered enhancement of your career achievements. Our system helps
          quantify impact, improve language, and structure accomplishments for
          maximum effectiveness in job applications.
        </p>

        <h2>Performance Statistics</h2>
        <ul>
          <li>10x faster resume creation compared to traditional methods</li>
          <li>95% ATS (Applicant Tracking System) compatibility rate</li>
          <li>Support for 50+ industries and career fields</li>
          <li>24/7 AI assistant availability</li>
        </ul>

        <h2>How CareerCraft Studio Works</h2>

        <h3>Step 1: Import Your Profile</h3>
        <p>
          Upload your existing resume or build from scratch. Our AI parses and
          organizes your information into a structured profile including work
          history, education, skills, and achievements.
        </p>

        <h3>Step 2: Analyze Job Opportunities</h3>
        <p>
          Paste job postings to get instant analysis. See how your skills match
          requirements, identify areas for improvement, and get personalized
          recommendations for strengthening your application.
        </p>

        <h3>Step 3: Generate Tailored Documents</h3>
        <p>
          Create customized resumes and cover letters for each application. Our
          AI optimizes content for specific roles, industries, and company
          cultures while maintaining ATS compatibility.
        </p>

        <h2>Why Choose CareerCraft Studio</h2>

        <h3>AI-Powered Personalization</h3>
        <p>
          Unlike generic resume builders, our AI understands context and creates
          truly personalized documents that highlight your most relevant
          experience for each opportunity.
        </p>

        <h3>ATS Optimization</h3>
        <p>
          Ensure your resume passes through Applicant Tracking Systems with our
          95% compatibility rate. We understand ATS requirements and format
          documents accordingly.
        </p>

        <h3>Multi-Industry Expertise</h3>
        <p>
          Whether you&apos;re in technology, healthcare, finance, legal,
          education, or any other field, our AI understands industry-specific
          requirements and terminology.
        </p>

        <h3>Continuous Learning</h3>
        <p>
          Our AI continuously improves based on successful job placements and
          industry trends, ensuring your documents stay current with hiring
          practices.
        </p>

        <h3>Privacy and Security</h3>
        <p>
          Your personal information and career data are protected with
          enterprise-grade security. We never share your information with third
          parties without explicit consent.
        </p>

        <h2>Get Started Today</h2>
        <p>
          Join thousands of professionals who have improved their job search
          success with CareerCraft Studio. Start with our free tier and upgrade
          as your needs grow. No credit card required to begin.
        </p>

        <h2>Frequently Asked Questions</h2>

        <h3>Is CareerCraft Studio free to use?</h3>
        <p>
          Yes, we offer a free tier with essential features. Premium plans
          provide unlimited document generation, advanced AI features, and
          priority support.
        </p>

        <h3>How does the AI understand my career goals?</h3>
        <p>
          Our conversational AI learns about your experience, goals, and
          preferences through natural dialogue. The more you interact, the
          better it becomes at creating personalized recommendations.
        </p>

        <h3>Can I use this for any industry?</h3>
        <p>
          Absolutely. CareerCraft Studio supports professionals across 50+
          industries with specialized knowledge of industry-specific
          requirements, terminology, and best practices.
        </p>

        <h3>How long does it take to create a resume?</h3>
        <p>
          With our AI assistance, you can create a tailored resume in under 5
          minutes. Initial profile setup may take 10-15 minutes, but subsequent
          documents are generated almost instantly.
        </p>

        <h3>Is my data secure?</h3>
        <p>
          Yes, we use enterprise-grade security measures to protect your
          personal and professional information. Your data is encrypted and
          never shared without your explicit consent.
        </p>
      </div>
    </>
  );
}
