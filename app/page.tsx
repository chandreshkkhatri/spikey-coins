import Navbar from "@/app/components/Navbar";
import Hero from "@/app/components/Hero";
import Features from "@/app/components/Features";
import HowItWorks from "@/app/components/HowItWorks";
import MarketPreview from "@/app/components/MarketPreview";
import CallToAction from "@/app/components/CallToAction";
import Footer from "@/app/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <MarketPreview />
      <CallToAction />
      <Footer />
    </div>
  );
}
