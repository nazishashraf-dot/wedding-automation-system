import NavBar from "@/components/NavBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ivory">
      <NavBar />
      <main className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 lg:px-10 xl:px-14">{children}</main>
    </div>
  );
}
