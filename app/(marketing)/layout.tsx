import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
