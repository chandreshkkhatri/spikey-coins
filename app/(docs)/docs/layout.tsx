import DocsHeader from "@/app/components/DocsHeader";
import DocsSidebar from "@/app/components/DocsSidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      <DocsHeader />
      <div className="flex">
        <DocsSidebar />
        <main className="min-w-0 flex-1 px-8 py-12 lg:px-16">
          <div className="mx-auto max-w-3xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
