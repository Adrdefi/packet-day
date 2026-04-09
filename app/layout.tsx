import type { Metadata } from "next";
import { Nunito, Fraunces } from "next/font/google";
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
  title: "Packet Day — Your backup plan for the hard days",
  description:
    "Personalized, printable daily learning packets for homeschool families. AI-generated activities tailored to your child's age and interests.",
  metadataBase: new URL("https://packetday.com"),
  openGraph: {
    title: "Packet Day — Your backup plan for the hard days",
    description:
      "Personalized, printable daily learning packets for homeschool families.",
    url: "https://packetday.com",
    siteName: "Packet Day",
    locale: "en_US",
    type: "website",
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
