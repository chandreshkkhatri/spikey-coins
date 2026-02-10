import Hero from "@/app/components/Hero";
import Features from "@/app/components/Features";
import HowItWorks from "@/app/components/HowItWorks";
import MarketPreview from "@/app/components/MarketPreview";
import CallToAction from "@/app/components/CallToAction";

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <MarketPreview />
      <CallToAction />
    </>
  );
}
