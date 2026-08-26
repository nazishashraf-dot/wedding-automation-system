import NavBar from "@/components/NavBar";
import { AuthProvider } from "@/components/AuthProvider";
import AuthGate from "@/components/AuthGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-ivory">
        <NavBar />
        <main className="px-4 py-10 sm:px-6 lg:px-10 xl:px-14">
          <AuthGate>{children}</AuthGate>
        </main>
      </div>
    </AuthProvider>
  );
}
