import type { Metadata } from "next";
import { PrismicPreview } from "@prismicio/next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { SiteFooter } from "@/foundation/layout/SiteFooter";
import { SiteHeader } from "@/foundation/layout/SiteHeader";
import { repositoryName } from "@/prismicio";
import "./globals.css";

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://dancercitizen.org"),
  title: {
    default: "The Dancer-Citizen",
    template: "%s | The Dancer-Citizen",
  },
  description: "An online, open-access, peer-reviewed scholarly journal exploring socially engaged dance.",
  openGraph: {
    siteName: "The Dancer-Citizen",
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
      className={`${cormorantGaramond.variable} ${dmSans.variable}`}
    >
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        <PrismicPreview repositoryName={repositoryName} />
      </body>
    </html>
  );
}
