import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FormD Scout",
    template: "%s | FormD Scout",
  },
  description:
    "Detect funding rounds before the press release. Monitor SEC EDGAR Form D filings to identify companies that have recently raised private funding.",
  keywords: [
    "SEC EDGAR",
    "Form D",
    "Funding Rounds",
    "Private Placements",
    "Commercial Real Estate",
    "CRE Intelligence",
    "SEC Filings",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "FormD Scout",
    title: "FormD Scout",
    description:
      "Detect funding rounds before the press release. Monitor SEC EDGAR Form D filings to identify companies raising private funding.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FormD Scout",
    description:
      "Detect funding rounds before the press release. Monitor SEC EDGAR Form D filings.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// JSON-LD structured data for SEO
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "FormD Scout",
  description:
    "Detect funding rounds before the press release. Monitor SEC EDGAR Form D filings to identify companies raising private funding.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SiteHeader />
          <main id="main-content">{children}</main>
          <SiteFooter />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
