import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Sanjeevani — AI Healthcare Intelligence Platform",
  description: "Unified clinical intelligence ecosystem for patients, physicians, reception, pharmacy, and laboratory.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-[#F8F7F4] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F9FAFB] min-h-screen flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <Navbar />
          <main className="flex-1 w-full">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}