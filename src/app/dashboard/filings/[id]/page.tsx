"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Building2, MapPin, DollarSign, Users, Calendar, Tag, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface FilingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function FilingDetailPage({ params }: FilingDetailPageProps) {
  const { id } = use(params);

  // Placeholder filing data - in production this would be fetched from the API
  const filing = {
    id,
    companyName: "Sample Company",
    filingDate: "2024-01-15",
    totalOffering: 5000000,
    industryGroup: "Technology",
    issuerState: "NY",
    isAmendment: false,
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (!amount) return "N/A";
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
    return `$${amount}`;
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/filings">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Filings
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8" />
            {filing.companyName}
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Filed: {filing.filingDate}
            {filing.isAmendment && (
              <Badge variant="secondary" className="ml-2">Amendment</Badge>
            )}
          </p>
        </div>
        <Button variant="outline" asChild>
          <a
            href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=D`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View on SEC EDGAR
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Filing Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Filing Details
            </CardTitle>
            <CardDescription>
              Information from SEC Form D filing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Total Offering
                </p>
                <p className="text-lg font-semibold">{formatCurrency(filing.totalOffering)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  Industry
                </p>
                <p className="text-lg font-semibold">{filing.industryGroup || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  State
                </p>
                <p className="text-lg font-semibold">{filing.issuerState || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Investors
                </p>
                <p className="text-lg font-semibold">N/A</p>
              </div>
            </div>

            <Separator />

            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Filing ID:</strong> {id}
              </p>
              <p className="mt-1">
                Full filing details will be loaded from the database when the filings feature is complete.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
            <CardDescription>
              Relevance scoring and insights for CRE leads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>AI enrichment not yet available.</p>
              <p className="text-sm mt-2">Click "Analyze Now" to generate insights once enrichment is configured.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
