"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Building2,
  MapPin,
  DollarSign,
  Users,
  Calendar,
  Tag,
  FileText,
  Loader2,
  AlertCircle,
  Sparkles,
  Target,
  Users2,
  TrendingUp,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Filing {
  id: string;
  cik: string;
  accessionNumber: string;
  companyName: string;
  entityType: string | null;
  stateOfInc: string | null;
  sicCode: string | null;
  filingDate: string;
  isAmendment: boolean | null;
  totalOffering: string | null;
  amountSold: string | null;
  amountRemaining: string | null;
  numInvestors: number | null;
  minInvestment: string | null;
  revenueRange: string | null;
  industryGroup: string | null;
  issuerStreet: string | null;
  issuerCity: string | null;
  issuerState: string | null;
  issuerZip: string | null;
  issuerPhone: string | null;
  filingUrl: string | null;
  xmlUrl: string | null;
  firstSaleDate: string | null;
  yetToOccur: boolean | null;
  moreThanOneYear: boolean | null;
  federalExemptions: string | null;
  createdAt: string;
  updatedAt: string;
  // Enrichment fields
  enrichmentId: string | null;
  companySummary: string | null;
  relevanceScore: number | null;
  relevanceReasoning: string | null;
  estimatedHeadcount: number | null;
  growthSignals: string[] | null;
  competitors: string[] | null;
  enrichedAt: string | null;
  modelUsed: string | null;
}

interface FilingDetailPageProps {
  params: Promise<{ id: string }>;
}

const formatCurrency = (amount: string | number | null | undefined): string => {
  if (!amount) return "N/A";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "N/A";
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
};

const getRelevanceColor = (score: number | null): string => {
  if (score === null) return "text-muted-foreground";
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-gray-500";
};

const getRelevanceBadgeVariant = (
  score: number | null
): "default" | "secondary" | "outline" => {
  if (score === null) return "outline";
  if (score >= 70) return "default";
  if (score >= 40) return "secondary";
  return "outline";
};

export default function FilingDetailPage({ params }: FilingDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [filing, setFiling] = useState<Filing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiling = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/edgar/filings/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Filing not found");
          } else if (response.status === 401) {
            setError("Unauthorized - please log in");
          } else {
            setError("Failed to load filing");
          }
          return;
        }
        const data = await response.json();
        setFiling(data.filing);
      } catch (err) {
        console.error("Error fetching filing:", err);
        setError("Failed to load filing");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiling();
  }, [id]);

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" disabled>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !filing) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/filings">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Filings
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {error || "Filing not found"}
            </h2>
            <p className="text-muted-foreground mb-4">
              The filing you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have access to it.
            </p>
            <Button asChild>
              <Link href="/dashboard/filings">Return to Filings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link
            href="/dashboard/filings"
            onClick={(e) => {
              // If there's history, go back to preserve filter state
              if (window.history.length > 1) {
                e.preventDefault();
                router.back();
              }
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Filings
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8" />
            {filing.companyName}
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            <Calendar className="h-4 w-4" />
            Filed: {filing.filingDate}
            {filing.isAmendment && (
              <Badge variant="secondary" className="ml-2">
                Amendment
              </Badge>
            )}
            {filing.yetToOccur && (
              <Badge variant="outline" className="ml-2">
                First Sale Pending
              </Badge>
            )}
          </p>
        </div>
        <Button variant="outline" asChild>
          <a
            href={filing.filingUrl || `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=D&CIK=${filing.cik}`}
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
            {/* Financial Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Total Offering
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(filing.totalOffering)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Amount Sold
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(filing.amountSold)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Min Investment
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(filing.minInvestment)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Investors
                </p>
                <p className="text-lg font-semibold">
                  {filing.numInvestors?.toLocaleString() ?? "N/A"}
                </p>
              </div>
            </div>

            <Separator />

            {/* Company Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  Industry
                </p>
                <p className="text-lg font-semibold">
                  {filing.industryGroup || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Entity Type
                </p>
                <p className="text-lg font-semibold">
                  {filing.entityType || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  State
                </p>
                <p className="text-lg font-semibold">
                  {filing.issuerState || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  State of Inc
                </p>
                <p className="text-lg font-semibold">
                  {filing.stateOfInc || "N/A"}
                </p>
              </div>
            </div>

            <Separator />

            {/* Location Details */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Address</p>
              <p className="text-sm">
                {[filing.issuerStreet, filing.issuerCity, filing.issuerState, filing.issuerZip]
                  .filter(Boolean)
                  .join(", ") || "N/A"}
              </p>
            </div>

            {/* Phone */}
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Phone
              </p>
              <p className="text-sm font-medium">
                {filing.issuerPhone || "N/A"}
              </p>
            </div>

            {/* Additional Details */}
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <strong>CIK:</strong> {filing.cik}
              </p>
              <p>
                <strong>Accession #:</strong> {filing.accessionNumber}
              </p>
              {filing.revenueRange && (
                <p>
                  <strong>Revenue Range:</strong> {filing.revenueRange}
                </p>
              )}
              {filing.federalExemptions && (
                <p>
                  <strong>Exemptions:</strong> {filing.federalExemptions}
                </p>
              )}
              {filing.firstSaleDate && (
                <p>
                  <strong>First Sale Date:</strong> {filing.firstSaleDate}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Analysis
            </CardTitle>
            <CardDescription>
              Relevance scoring and insights for CRE leads
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filing.enrichmentId ? (
              <div className="space-y-6">
                {/* Relevance Score */}
                <div className="text-center py-4">
                  <div
                    className={`text-5xl font-bold ${getRelevanceColor(filing.relevanceScore)}`}
                  >
                    {filing.relevanceScore ?? "—"}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Relevance Score
                  </p>
                  <Badge
                    variant={getRelevanceBadgeVariant(filing.relevanceScore)}
                    className={getRelevanceColor(filing.relevanceScore)}
                  >
                    {filing.relevanceScore !== null &&
                      filing.relevanceScore >= 70 &&
                      "High Priority"}
                    {filing.relevanceScore !== null &&
                      filing.relevanceScore >= 40 &&
                      filing.relevanceScore < 70 &&
                      "Medium Priority"}
                    {filing.relevanceScore !== null &&
                      filing.relevanceScore < 40 &&
                      "Low Priority"}
                  </Badge>
                </div>

                <Separator />

                {/* Company Summary */}
                {filing.companySummary && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Company Summary
                    </p>
                    <p className="text-sm">{filing.companySummary}</p>
                  </div>
                )}

                {/* Relevance Reasoning */}
                {filing.relevanceReasoning && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Why This Score
                    </p>
                    <p className="text-sm">{filing.relevanceReasoning}</p>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {filing.estimatedHeadcount !== null && (
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Users2 className="h-3 w-3" />
                        Est. Headcount
                      </p>
                      <p className="font-semibold">
                        {filing.estimatedHeadcount.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Growth Signals */}
                {filing.growthSignals && filing.growthSignals.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Growth Signals
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {filing.growthSignals.map((signal, index) => (
                        <Badge key={index} variant="secondary">
                          {signal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Competitors */}
                {filing.competitors && filing.competitors.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      Similar Companies
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {filing.competitors.map((competitor, index) => (
                        <Badge key={index} variant="outline">
                          {competitor}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Enrichment Metadata */}
                <div className="text-xs text-muted-foreground">
                  <p>
                    Enriched:{" "}
                    {filing.enrichedAt
                      ? new Date(filing.enrichedAt).toLocaleString()
                      : "N/A"}
                  </p>
                  {filing.modelUsed && (
                    <p>Model: {filing.modelUsed}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>AI enrichment not yet available.</p>
                <p className="text-sm mt-2">
                  Use the Enrich API to generate insights.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
