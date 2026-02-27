import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ClerkProvider } from "@clerk/nextjs";
import { PWAProvider } from "@/components/PWA";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Optimism Engine - Transform Negative Thoughts",
  description: "An AI-powered web app that helps you hack negative thoughts and cultivate relentless optimism through CBT reframing and root cause analysis.",
  keywords: ["optimism", "CBT", "cognitive behavioral therapy", "mental health", "positive thinking", "reframing", "mindfulness", "AI therapy", "wellness"],
  authors: [{ name: "Optimism Engine Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logo.png", sizes: "192x192", type: "image/png" },
      { url: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/logo.png", sizes: "192x192", type: "image/png" },
      { url: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
  },
  openGraph: {
    title: "The Optimism Engine",
    description: "Transform negative thoughts into relentless optimism with AI-powered reframing",
    type: "website",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Optimism Engine",
    description: "Transform negative thoughts into relentless optimism",
    images: ["/logo.png"],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0ea5e9" },
    { media: "(prefers-color-scheme: dark)", color: "#0891b2" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Optimism Engine",
    startupImage: ["/logo.png"],
  },
  formatDetection: {
    telephone: false,
  },
  applicationName: "Optimism Engine",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="apple-touch-icon" sizes="180x180" href="/logo.png" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="mobile-web-app-capable" content="yes" />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        >
          <PWAProvider>
            {children}
            <Toaster />
          </PWAProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
