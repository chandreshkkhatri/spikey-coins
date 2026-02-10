import DocsHeader from "@/app/components/DocsHeader";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      <DocsHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">{children}</main>
    </div>
  );
}
