import type { Metadata } from "next";
import type { Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { CustomerMobileNav } from "@/components/layout/customer-mobile-nav";
import { AppProviders } from "@/components/providers/app-providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dineflow.local"),
  title: {
    default: "DineFlow | AI Smart Restaurant Ordering",
    template: "%s | DineFlow",
  },
  description:
    "AI-powered smart restaurant ordering and management system with QR menus, personalized recommendations, real-time order tracking, and analytics.",
  applicationName: "DineFlow",
  keywords: [
    "restaurant ordering",
    "QR menu",
    "AI recommendations",
    "kitchen dashboard",
    "restaurant analytics",
  ],
  authors: [{ name: "DineFlow" }],
  creator: "DineFlow",
  publisher: "DineFlow",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "DineFlow | AI Smart Restaurant Ordering",
    description:
      "A premium digital dining platform for customers, kitchens, and restaurant owners.",
    siteName: "DineFlow",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "DineFlow | AI Smart Restaurant Ordering",
    description:
      "QR menus, AI recommendations, real-time order tracking, and restaurant analytics.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${inter.className} min-h-screen overflow-x-hidden bg-zinc-950 pb-20 text-white antialiased md:pb-0`}
      >
        <Script src="https://www.payhere.lk/lib/payhere.js" strategy="afterInteractive" />
        <AppProviders>
          <div className="min-h-screen overflow-x-hidden">{children}</div>
          <CustomerMobileNav />
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast:
                  "border-white/10 bg-zinc-950 text-white shadow-2xl shadow-black/30",
              },
            }}
          />
        </AppProviders>
      </body>
    </html>
  );
}
