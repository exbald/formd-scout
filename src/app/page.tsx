"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Clock, FileSearch, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";

export default function Home() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!isPending && session) {
      router.replace("/dashboard");
    }
  }, [session, isPending, router]);

  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10">
              <FileSearch className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
              FormD Scout
            </span>
          </h1>
          <p className="text-xl md:text-2xl font-medium text-muted-foreground">
            Detect funding rounds before the press release
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Monitor SEC EDGAR Form D filings to identify companies that have recently raised
            private funding. Form D filings appear 2-3 weeks before press releases, giving
            you an early signal to act on new opportunities.
          </p>
          <div className="pt-4">
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <div className="p-6 border rounded-lg space-y-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Early Detection</h3>
            <p className="text-sm text-muted-foreground">
              Spot funding rounds 2-3 weeks before press releases hit the wire, giving you a head start.
            </p>
          </div>
          <div className="p-6 border rounded-lg space-y-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <FileSearch className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">SEC EDGAR Data</h3>
            <p className="text-sm text-muted-foreground">
              Ingests Form D filings daily from the free SEC EDGAR API with full filing details.
            </p>
          </div>
          <div className="p-6 border rounded-lg space-y-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">AI Relevance Scoring</h3>
            <p className="text-sm text-muted-foreground">
              Each filing is enriched with AI-generated relevance scores and company analysis.
            </p>
          </div>
          <div className="p-6 border rounded-lg space-y-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">CRE Intelligence</h3>
            <p className="text-sm text-muted-foreground">
              Identify companies likely to need office space based on funding signals and growth patterns.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-16 border-t">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-3xl font-bold">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary/60">1</div>
              <h3 className="font-semibold">Ingest Filings</h3>
              <p className="text-sm text-muted-foreground">
                Form D filings are automatically ingested from SEC EDGAR and stored in the database.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary/60">2</div>
              <h3 className="font-semibold">AI Enrichment</h3>
              <p className="text-sm text-muted-foreground">
                Each filing is analyzed by AI to score relevance and extract key business signals.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary/60">3</div>
              <h3 className="font-semibold">Filter &amp; Act</h3>
              <p className="text-sm text-muted-foreground">
                Browse, filter, and export filings to find the best opportunities for your business.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
