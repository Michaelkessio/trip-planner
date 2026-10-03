import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "AI Trip Planner",
  description: "Plan your next trip with AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <SessionProviderWrapper>
          <Navbar />
          <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
