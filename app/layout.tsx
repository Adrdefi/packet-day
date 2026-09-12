import type { Metadata } from "next";
import { Nunito, Fraunces } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Packet Day — Your backup plan for the hard days",
    template: "%s | Packet Day",
  },
  description:
    "Personalized, printable daily learning packets for homeschool families. AI-generated activities tailored to your child's age and interests.",

  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",

  openGraph: {
    siteName: "Packet Day",
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    site: "@packetday",
  },

  verification: {
    other: {
      "p:domain_verify": "c37ba0b996fef58770cd390f05d9f8f0",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-dark">
        {children}
      </body>
    </html>
  );
}
