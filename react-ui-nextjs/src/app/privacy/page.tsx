import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Spikey Coins",
  description:
    "Read Spikey Coins privacy policy to understand how we collect, use, and protect your data while using our cryptocurrency market data platform.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Privacy Policy
        </h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-sm text-gray-500 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            Information We Collect
          </h2>
          <p className="text-gray-700 mb-6">
            Spikey Coins is committed to protecting your privacy. We collect
            minimal information necessary to provide our cryptocurrency market
            data services.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            How We Use Information
          </h2>
          <p className="text-gray-700 mb-6">
            Any information we collect is used solely to improve our service and
            provide you with accurate, real-time cryptocurrency market data.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            Data Security
          </h2>
          <p className="text-gray-700 mb-6">
            We implement appropriate security measures to protect your
            information against unauthorized access, alteration, disclosure, or
            destruction.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            Contact Us
          </h2>
          <p className="text-gray-700 mb-6">
            If you have any questions about this Privacy Policy, please contact
            us through our website.
          </p>
        </div>
      </div>
    </div>
  );
}
