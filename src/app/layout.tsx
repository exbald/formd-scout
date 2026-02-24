import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
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
        className={`${inter.variable} ${robotoMono.variable} font-sans antialiased text-sm`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
