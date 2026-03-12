import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Analytics from "@/components/Analytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CashPulse — Stop Chasing. Start Collecting.",
  description: "AI-powered accounts receivable that predicts late payments and recovers your money automatically. Collect 2x faster.",
  keywords: ["accounts receivable", "collections", "invoice management", "AR automation", "cash flow", "B2B collections", "overdue invoices"],
  openGraph: {
    title: "CashPulse — Stop Chasing. Start Collecting.",
    description: "AI-powered accounts receivable that predicts late payments and recovers your money automatically.",
    type: "website",
    locale: "en_US",
    siteName: "CashPulse",
  },
  twitter: {
    card: "summary_large_image",
    title: "CashPulse — Stop Chasing. Start Collecting.",
    description: "AI-powered AR. Predict late payments. Recover money automatically.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Analytics />
        {children}


      </body>
    </html>
  );
}
