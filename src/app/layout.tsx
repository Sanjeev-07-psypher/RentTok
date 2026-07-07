import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { InstallPrompt } from "@/components/install-prompt";
import { Walkthrough } from "@/components/walkthrough";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

// Prefer an explicit site URL; on Vercel fall back to the deploy URL so metadata
// never points at localhost in production.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  title: "RentTok — Find your room in Gangtok",
  description:
    "Search verified rooms, PGs, flats and hostels across Gangtok, Sikkim. Book in minutes and contact owners directly.",
  metadataBase: new URL(siteUrl),
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "RentTok", statusBarStyle: "default" },
  openGraph: {
    title: "RentTok — Find your room in Gangtok",
    description: "Rooms in Gangtok, searched and booked the easy way.",
    type: "website",
  },
};

export const viewport = { themeColor: "#ff385c" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <Providers>
          <Suspense fallback={<div className="h-16 border-b border-[var(--border)]" />}>
            <Navbar />
          </Suspense>
          <main className="flex-1">{children}</main>
          <Footer />
          <InstallPrompt />
          <Walkthrough />
        </Providers>
      </body>
    </html>
  );
}
