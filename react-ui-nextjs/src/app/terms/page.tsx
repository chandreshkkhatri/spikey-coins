import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Spikey Coins",
  description:
    "Read the terms of service for using Spikey Coins cryptocurrency market data platform and understand your rights and responsibilities.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Terms of Service
        </h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-sm text-gray-500 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            Acceptance of Terms
          </h2>
          <p className="text-gray-700 mb-6">
            By accessing and using Spikey Coins, you accept and agree to be
            bound by the terms and provision of this agreement.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            Use of Service
          </h2>
          <p className="text-gray-700 mb-6">
            Spikey Coins provides cryptocurrency market data for informational
            purposes only. This information should not be considered as
            financial advice.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            Disclaimer
          </h2>
          <p className="text-gray-700 mb-6">
            The information provided on this platform is for general
            informational purposes only and should not be considered as
            investment advice. Cryptocurrency trading involves substantial risk.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            Limitation of Liability
          </h2>
          <p className="text-gray-700 mb-6">
            Spikey Coins shall not be liable for any direct, indirect,
            incidental, special, consequential, or exemplary damages resulting
            from the use of our service.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            Contact Information
          </h2>
          <p className="text-gray-700 mb-6">
            If you have any questions about these Terms of Service, please
            contact us through our website.
          </p>
        </div>
      </div>
    </div>
  );
}
