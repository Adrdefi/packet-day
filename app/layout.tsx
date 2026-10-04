import type { Metadata } from "next";
import localFont from "next/font/local";
import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/site";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import "./globals.css";

// Self-hosted (app/fonts/, SIL Open Font License 1.1, license files alongside)
// so builds never download from Google. These are the same latin files
// next/font/google served, and each is variable, so one file covers every
// weight. The weight/style entries repeat the old Google setup one for one
// (Nunito 400 to 800, Fraunces 400/600/700/900 upright and italic), so the
// browser picks exactly the same faces as before.
// Written out in full: next/font needs literal options, not computed ones.
const nunito = localFont({
  variable: "--font-nunito",
  display: "swap",
  src: [
    { path: "./fonts/nunito-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/nunito-latin.woff2", weight: "500", style: "normal" },
    { path: "./fonts/nunito-latin.woff2", weight: "600", style: "normal" },
    { path: "./fonts/nunito-latin.woff2", weight: "700", style: "normal" },
    { path: "./fonts/nunito-latin.woff2", weight: "800", style: "normal" },
  ],
  adjustFontFallback: "Arial",
});

const fraunces = localFont({
  variable: "--font-fraunces",
  display: "swap",
  src: [
    { path: "./fonts/fraunces-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/fraunces-latin.woff2", weight: "600", style: "normal" },
    { path: "./fonts/fraunces-latin.woff2", weight: "700", style: "normal" },
    { path: "./fonts/fraunces-latin.woff2", weight: "900", style: "normal" },
    { path: "./fonts/fraunces-italic-latin.woff2", weight: "400", style: "italic" },
    { path: "./fonts/fraunces-italic-latin.woff2", weight: "600", style: "italic" },
    { path: "./fonts/fraunces-italic-latin.woff2", weight: "700", style: "italic" },
    { path: "./fonts/fraunces-italic-latin.woff2", weight: "900", style: "italic" },
  ],
  adjustFontFallback: "Times New Roman",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Packet Day | Your backup plan for the hard days",
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
    images: [DEFAULT_OG_IMAGE],
  },

  twitter: {
    card: "summary_large_image",
    site: "@packetday",
    images: [DEFAULT_OG_IMAGE.url],
  },

  verification: {
    other: {
      "p:domain_verify": "c37ba0b996fef58770cd390f05d9f8f0",
    },
  },
};

// Runs before first paint: marks <html> as signed in when a Supabase auth
// cookie exists (sb-<ref>-auth-token, sometimes split into .0/.1 chunks), so
// PublicHeader's static HTML shows "My dashboard" with no "Try it free" flash.
// It only checks that the cookie exists; PublicHeader confirms the session
// after hydration. See .signed-in in globals.css.
const SIGNED_IN_HINT = `try{if(/(?:^|; )sb-[a-z0-9]+-auth-token(?:\\.\\d+)?=/.test(document.cookie))document.documentElement.classList.add("signed-in")}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SIGNED_IN_HINT }} />
      </head>
      <body className="min-h-full flex flex-col bg-cream text-dark">
        {children}
        <AnalyticsProvider />
      </body>
    </html>
  );
}
