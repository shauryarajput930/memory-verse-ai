import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://memory-verse-ai.netlify.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MemoryVerse AI — Spatial Knowledge Archive",
    template: "%s | MemoryVerse AI",
  },
  description:
    "AI-powered Digital Identity System that transforms fragmented academic and professional data into a structured, searchable spatial knowledge repository.",
  keywords: [
    "MemoryVerse AI",
    "Spatial Knowledge Archive",
    "Digital Identity",
    "AI Portfolio",
    "Document Management",
    "pgvector",
    "Groq AI",
  ],
  authors: [{ name: "Shaurya Rajput" }],
  creator: "Shaurya Rajput",
  publisher: "MemoryVerse AI",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "MemoryVerse AI — Spatial Knowledge Archive",
    description:
      "AI-powered Digital Identity System that transforms fragmented academic and professional data into a structured, searchable spatial knowledge repository.",
    siteName: "MemoryVerse AI",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "MemoryVerse AI Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MemoryVerse AI — Spatial Knowledge Archive",
    description:
      "AI-powered Digital Identity System that transforms fragmented data into a structured spatial knowledge repository.",
    images: ["/icon.png"],
    creator: "@shauryarajput",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="min-h-full flex flex-col font-sans bg-[#0A0A0F] text-slate-100">
        {children}
      </body>
    </html>
  );
}

