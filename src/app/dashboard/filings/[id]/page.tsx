"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
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
  RefreshCw,
  Search,
  Globe,
  Briefcase,
  Newspaper,
  Code2,
  Mail,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDollarAmount } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { getRelevanceColor, getRelevanceBadgeClass } from "@/lib/relevance-styles";

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

interface CompanyResearchData {
  id: string;
  filingId: string;
  websiteUrl: string | null;
  websiteSummary: string | null;
  jobPostings: Array<{ title: string; location: string; url: string; datePosted: string }> | null;
  jobPostingsCount: number | null;
  leadershipTeam: Array<{
    name: string;
    title: string;
    email: string | null;
    linkedinUrl: string | null;
  }> | null;
  officeLocations: Array<{ city: string; state: string; country: string; type: string }> | null;
  techStack: string[] | null;
  recentNews: Array<{ headline: string; date: string; url: string; summary: string }> | null;
  employeeEstimate: number | null;
  fundingHistory: Array<{
    round: string;
    amount: string | null;
    date: string | null;
    investors: string[];
  }> | null;
  growthSignals: string[] | null;
  companySize: string | null;
  socialProfiles: {
    linkedin: string | null;
    twitter: string | null;
    crunchbase: string | null;
  } | null;
  creditsUsed: number | null;
  researchPrompt: string | null;
  researchedAt: string;
  source: string | null;
}

interface FilingDetailPageProps {
  params: Promise<{ id: string }>;
}

const formatCurrency = (amount: string | number | null | undefined): string => {
  if (amount === null || amount === undefined) return "N/A";
  return formatDollarAmount(amount);
};

export default function FilingDetailPage({ params }: FilingDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [filing, setFiling] = useState<Filing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [research, setResearch] = useState<CompanyResearchData | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const researchPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState<{
    subject: string;
    body: string;
  } | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);
  const isEnrichingRef = useRef(false);
  const isResearchingRef = useRef(false);

  const fetchFiling = useCallback(async () => {
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
  }, [id]);

  const stopResearchPolling = useCallback(() => {
    if (researchPollRef.current) {
      clearInterval(researchPollRef.current);
      researchPollRef.current = null;
    }
  }, []);

  const fetchResearch = useCallback(async () => {
    try {
      const response = await fetch(`/api/edgar/filings/${id}/research`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === "researching") {
          // Job is pending — start polling if not already
          setIsResearching(true);
          if (!researchPollRef.current) {
            researchPollRef.current = setInterval(async () => {
              try {
                const pollRes = await fetch(`/api/edgar/filings/${id}/research`);
                if (pollRes.ok) {
                  const pollData = await pollRes.json();
                  if (pollData.research) {
                    setResearch(pollData.research);
                    setIsResearching(false);
                    stopResearchPolling();
                  } else if (pollData.status !== "researching") {
                    setIsResearching(false);
                    stopResearchPolling();
                  }
                } else {
                  const pollData = await pollRes.json().catch(() => null);
                  if (pollData?.error) {
                    setResearchError(pollData.error);
                    setIsResearching(false);
                    stopResearchPolling();
                  }
                }
              } catch {
                // Continue polling on network errors
              }
            }, 5000);
          }
        } else if (data.research) {
          setResearch(data.research);
          setIsResearching(false);
          stopResearchPolling();
        }
      }
    } catch (err) {
      console.error("Error fetching research:", err);
    }
  }, [id, stopResearchPolling]);

  useEffect(() => {
    fetchFiling();
    fetchResearch();
    return () => stopResearchPolling();
  }, [fetchFiling, fetchResearch, stopResearchPolling]);

  const handleEnrich = async () => {
    if (!filing || isEnrichingRef.current) return;
    isEnrichingRef.current = true;
    setIsEnriching(true);
    setEnrichError(null);

    try {
      const response = await fetch(`/api/edgar/filings/${id}/enrich`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.error || "Failed to enrich filing";
        setEnrichError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      await fetchFiling();
      toast.success("AI enrichment completed successfully");
    } catch (err) {
      console.error("Error enriching filing:", err);
      const errorMessage = "Failed to enrich filing. Please try again.";
      setEnrichError(errorMessage);
      toast.error(errorMessage);
    } finally {
      isEnrichingRef.current = false;
      setIsEnriching(false);
    }
  };

  const handleResearch = async () => {
    if (!filing || isResearchingRef.current) return;
    isResearchingRef.current = true;
    setIsResearching(true);
    setResearchError(null);
    setResearch(null);

    try {
      const response = await fetch(`/api/edgar/filings/${id}/research`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.error || "Failed to start research";
        setResearchError(errorMessage);
        toast.error(errorMessage);
        setIsResearching(false);
        isResearchingRef.current = false;
        return;
      }

      toast.success("Research started — polling for results...");
      // Start polling via fetchResearch which handles the "researching" status
      fetchResearch();
    } catch (err) {
      console.error("Error starting research:", err);
      const errorMessage = "Failed to start research. Please try again.";
      setResearchError(errorMessage);
      toast.error(errorMessage);
      setIsResearching(false);
    } finally {
      isResearchingRef.current = false;
    }
  };

  const handleGenerateEmail = async () => {
    if (!filing) return;
    setIsGeneratingEmail(true);
    setEmailDraft(null);

    try {
      const response = await fetch("/api/edgar/email/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filingId: filing.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to generate email");
        return;
      }

      const data = await response.json();
      setEmailDraft({
        subject: data.draft.subject,
        body: data.draft.body,
      });
      toast.success("Email draft generated");
    } catch (err) {
      console.error("Error generating email:", err);
      toast.error("Failed to generate email draft");
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleCopyEmail = async () => {
    if (!emailDraft) return;
    const fullEmail = `Subject: ${emailDraft.subject}\n\n${emailDraft.body}`;
    await navigator.clipboard.writeText(fullEmail);
    setEmailCopied(true);
    toast.success("Email copied to clipboard");
    setTimeout(() => setEmailCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <Button variant="ghost" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </Button>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !filing) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/filings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Filings
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="text-destructive mb-4 h-12 w-12" />
            <h2 className="mb-2 text-xl font-semibold">{error || "Filing not found"}</h2>
            <p className="text-muted-foreground mb-4">
              The filing you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to
              it.
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
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="mb-4 sm:mb-6">
        <Button variant="ghost" asChild>
          <Link
            href="/dashboard/filings"
            onClick={(e) => {
              if (window.history.length > 1) {
                e.preventDefault();
                router.back();
              }
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Filings
          </Link>
        </Button>
      </div>

      <div className="border-border mb-6 flex flex-col items-start justify-between gap-4 border-b pb-4 sm:mb-8 sm:flex-row">
        <div className="min-w-0 flex-1">
          <h1 className="flex items-start gap-2 text-2xl font-semibold tracking-tight sm:items-center">
            <Building2 className="text-primary mt-0.5 h-5 w-5 shrink-0 sm:mt-0" />
            <span className="break-words">{filing.companyName}</span>
          </h1>
          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold tracking-widest uppercase">
            <Calendar className="h-4 w-4" />
            Filed: {formatDate(filing.filingDate)}
            {filing.isAmendment && (
              <Badge variant="secondary" className="ml-1">
                Amendment
              </Badge>
            )}
            {filing.yetToOccur && (
              <Badge variant="outline" className="ml-1">
                First Sale Pending
              </Badge>
            )}
          </div>
        </div>
        <Button variant="outline" asChild className="shrink-0">
          <a
            href={
              filing.filingUrl ||
              `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=D&CIK=${filing.cik}`
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View on SEC EDGAR
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Filing Details
            </CardTitle>
            <CardDescription>Information from SEC Form D filing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground flex items-center gap-1 text-sm">
                  <DollarSign className="h-3 w-3" />
                  Total Offering
                </p>
                <p className="text-lg font-semibold">{formatCurrency(filing.totalOffering)}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1 text-sm">
                  <DollarSign className="h-3 w-3" />
                  Amount Sold
                </p>
                <p className="text-lg font-semibold">{formatCurrency(filing.amountSold)}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1 text-sm">
                  <DollarSign className="h-3 w-3" />
                  Min Investment
                </p>
                <p className="text-lg font-semibold">{formatCurrency(filing.minInvestment)}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1 text-sm">
                  <Users className="h-3 w-3" />
                  Investors
                </p>
                <p className="text-lg font-semibold">
                  {filing.numInvestors?.toLocaleString() ?? "N/A"}
                </p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground flex items-center gap-1 text-sm">
                  <Tag className="h-3 w-3" />
                  Industry
                </p>
                <p className="text-lg font-semibold">{filing.industryGroup || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1 text-sm">
                  <Building2 className="h-3 w-3" />
                  Entity Type
                </p>
                <p className="text-lg font-semibold">{filing.entityType || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1 text-sm">
                  <MapPin className="h-3 w-3" />
                  State
                </p>
                <p className="text-lg font-semibold">{filing.issuerState || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1 text-sm">
                  <Building className="h-3 w-3" />
                  State of Inc
                </p>
                <p className="text-lg font-semibold">{filing.stateOfInc || "N/A"}</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-muted-foreground mb-1 text-sm">Address</p>
              <p className="text-sm">
                {[filing.issuerStreet, filing.issuerCity, filing.issuerState, filing.issuerZip]
                  .filter(Boolean)
                  .join(", ") || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1 text-sm">
                <Building2 className="h-3 w-3" />
                Phone
              </p>
              <p className="text-sm font-medium">{filing.issuerPhone || "N/A"}</p>
            </div>
            <div className="text-muted-foreground space-y-1 text-sm">
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
                  <strong>First Sale Date:</strong> {formatDate(filing.firstSaleDate)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Analysis
            </CardTitle>
            <CardDescription>Relevance scoring and insights for CRE leads</CardDescription>
          </CardHeader>
          <CardContent>
            {isEnriching ? (
              <div className="py-12 text-center">
                <Loader2 className="text-primary mx-auto mb-4 h-12 w-12 animate-spin" />
                <p className="font-medium">Analyzing filing...</p>
                <p className="text-muted-foreground mt-1 text-sm">This may take a few seconds</p>
              </div>
            ) : filing.enrichmentId ? (
              <div className="space-y-6">
                <div className="py-4 text-center">
                  <div className={`text-5xl font-bold ${getRelevanceColor(filing.relevanceScore)}`}>
                    {filing.relevanceScore ?? "—"}
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">Relevance Score</p>
                  <Badge
                    variant="outline"
                    className={getRelevanceBadgeClass(filing.relevanceScore)}
                  >
                    {filing.relevanceScore !== null &&
                      filing.relevanceScore >= 70 &&
                      "High Priority"}
                    {filing.relevanceScore !== null &&
                      filing.relevanceScore >= 40 &&
                      filing.relevanceScore < 70 &&
                      "Medium Priority"}
                    {filing.relevanceScore !== null && filing.relevanceScore < 40 && "Low Priority"}
                  </Badge>
                </div>
                <Separator />
                {filing.companySummary && (
                  <div>
                    <p className="text-muted-foreground mb-2 text-sm">Company Summary</p>
                    <p className="text-sm">{filing.companySummary}</p>
                  </div>
                )}
                {filing.relevanceReasoning && (
                  <div>
                    <p className="text-muted-foreground mb-2 flex items-center gap-1 text-sm">
                      <Target className="h-3 w-3" />
                      Why This Score
                    </p>
                    <p className="text-sm">{filing.relevanceReasoning}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {filing.estimatedHeadcount !== null && (
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1 text-sm">
                        <Users2 className="h-3 w-3" />
                        Est. Headcount
                      </p>
                      <p className="font-semibold">{filing.estimatedHeadcount.toLocaleString()}</p>
                    </div>
                  )}
                </div>
                {filing.growthSignals && filing.growthSignals.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-2 flex items-center gap-1 text-sm">
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
                {filing.competitors && filing.competitors.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-2 flex items-center gap-1 text-sm">
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
                <div className="text-muted-foreground text-xs">
                  <p>
                    Enriched:{" "}
                    {filing.enrichedAt ? new Date(filing.enrichedAt).toLocaleString() : "N/A"}
                  </p>
                  {filing.modelUsed && <p>Model: {filing.modelUsed}</p>}
                </div>
                <Button
                  variant="outline"
                  onClick={handleEnrich}
                  disabled={isEnriching}
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-analyze
                </Button>
              </div>
            ) : (
              <div className="py-8 text-center">
                <Sparkles className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className="text-muted-foreground mb-4">AI enrichment not yet available.</p>
                {enrichError && (
                  <div className="bg-destructive/10 text-destructive mb-4 rounded-[0.15rem] p-3 text-sm">
                    {enrichError}
                  </div>
                )}
                <Button onClick={handleEnrich} disabled={isEnriching}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Company Intel Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Company Intel
          </CardTitle>
          <CardDescription>Deep research from company website and public sources</CardDescription>
        </CardHeader>
        <CardContent>
          {isResearching ? (
            <div className="py-12 text-center">
              <Loader2 className="text-primary mx-auto mb-4 h-12 w-12 animate-spin" />
              <p className="font-medium">Researching company...</p>
              <p className="text-muted-foreground mt-1 text-sm">This may take 1-2 minutes</p>
            </div>
          ) : research ? (
            <div className="space-y-6">
              {research.websiteUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="text-muted-foreground h-4 w-4" />
                  <a
                    href={research.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {research.websiteUrl}
                  </a>
                </div>
              )}

              {research.websiteSummary && (
                <div>
                  <p className="text-muted-foreground mb-2 text-sm">Website Summary</p>
                  <p className="text-sm">{research.websiteSummary}</p>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {research.employeeEstimate && (
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1 text-sm">
                      <Users2 className="h-3 w-3" />
                      Est. Employees
                    </p>
                    <p className="font-semibold">{research.employeeEstimate.toLocaleString()}</p>
                  </div>
                )}
                {research.jobPostingsCount !== null && (
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1 text-sm">
                      <Briefcase className="h-3 w-3" />
                      Open Positions
                    </p>
                    <p className="font-semibold">{research.jobPostingsCount}</p>
                  </div>
                )}
                {research.companySize && (
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1 text-sm">
                      <Building2 className="h-3 w-3" />
                      Company Size
                    </p>
                    <p className="font-semibold capitalize">{research.companySize}</p>
                  </div>
                )}
              </div>

              {research.jobPostings && research.jobPostings.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2 flex items-center gap-1 text-sm">
                    <Briefcase className="h-3 w-3" />
                    Job Postings ({research.jobPostings.length} shown)
                  </p>
                  <div className="space-y-2">
                    {research.jobPostings.slice(0, 5).map((job, index) => (
                      <div key={index} className="bg-muted/50 rounded p-2 text-sm">
                        <p className="font-medium">{job.title}</p>
                        <p className="text-muted-foreground">{job.location}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {research.leadershipTeam && research.leadershipTeam.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2 flex items-center gap-1 text-sm">
                    <Users className="h-3 w-3" />
                    Leadership Team
                  </p>
                  <div className="space-y-2">
                    {research.leadershipTeam.map((leader, index) => (
                      <div key={index} className="bg-muted/50 rounded p-2 text-sm">
                        <p className="font-medium">{leader.name}</p>
                        <p className="text-muted-foreground text-xs">{leader.title}</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {leader.email && (
                            <a
                              href={`mailto:${leader.email}`}
                              className="text-primary flex items-center gap-1 text-xs hover:underline"
                            >
                              <Mail className="h-3 w-3" />
                              {leader.email}
                            </a>
                          )}
                          {leader.linkedinUrl && (
                            <a
                              href={leader.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary flex items-center gap-1 text-xs hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              LinkedIn
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {research.officeLocations && research.officeLocations.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2 flex items-center gap-1 text-sm">
                    <MapPin className="h-3 w-3" />
                    Office Locations
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {research.officeLocations.map((loc, index) => (
                      <Badge key={index} variant="outline">
                        {[loc.city, loc.state, loc.country].filter(Boolean).join(", ")}
                        {loc.type && loc.type !== "office" && ` (${loc.type})`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {research.fundingHistory && research.fundingHistory.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2 flex items-center gap-1 text-sm">
                    <DollarSign className="h-3 w-3" />
                    Funding History
                  </p>
                  <div className="space-y-2">
                    {research.fundingHistory.map((round, index) => (
                      <div key={index} className="bg-muted/50 rounded p-2 text-sm">
                        <p className="font-medium">
                          {round.round}
                          {round.amount && ` — ${round.amount}`}
                        </p>
                        <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                          {round.date && <span>{round.date}</span>}
                          {round.investors.length > 0 && (
                            <span>Led by {round.investors.join(", ")}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {research.techStack && research.techStack.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2 flex items-center gap-1 text-sm">
                    <Code2 className="h-3 w-3" />
                    Tech Stack
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {research.techStack.map((tech, index) => (
                      <Badge key={index} variant="secondary">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {research.growthSignals && research.growthSignals.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2 flex items-center gap-1 text-sm">
                    <TrendingUp className="h-3 w-3" />
                    Growth Signals
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {research.growthSignals.map((signal, index) => (
                      <Badge key={index} variant="default">
                        {signal}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {research.socialProfiles &&
                (research.socialProfiles.linkedin ||
                  research.socialProfiles.twitter ||
                  research.socialProfiles.crunchbase) && (
                  <div>
                    <p className="text-muted-foreground mb-2 flex items-center gap-1 text-sm">
                      <Globe className="h-3 w-3" />
                      Social Profiles
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {research.socialProfiles.linkedin && (
                        <a
                          href={research.socialProfiles.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary flex items-center gap-1 text-sm hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          LinkedIn
                        </a>
                      )}
                      {research.socialProfiles.twitter && (
                        <a
                          href={research.socialProfiles.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary flex items-center gap-1 text-sm hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Twitter/X
                        </a>
                      )}
                      {research.socialProfiles.crunchbase && (
                        <a
                          href={research.socialProfiles.crunchbase}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary flex items-center gap-1 text-sm hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Crunchbase
                        </a>
                      )}
                    </div>
                  </div>
                )}

              {research.recentNews && research.recentNews.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2 flex items-center gap-1 text-sm">
                    <Newspaper className="h-3 w-3" />
                    Recent News
                  </p>
                  <div className="space-y-2">
                    {research.recentNews.slice(0, 3).map((news, index) => (
                      <div key={index} className="bg-muted/50 rounded p-2 text-sm">
                        <p className="font-medium">{news.headline}</p>
                        <p className="text-muted-foreground text-xs">{news.date}</p>
                        {news.summary && <p className="mt-1">{news.summary}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-muted-foreground text-xs">
                <p>Researched: {new Date(research.researchedAt).toLocaleString()}</p>
                {research.source && <p>Source: {research.source}</p>}
                {research.creditsUsed && <p>Credits used: {research.creditsUsed}</p>}
              </div>

              <Button
                variant="outline"
                onClick={handleResearch}
                disabled={isResearching}
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-research Company
              </Button>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Search className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="text-muted-foreground mb-4">Company research not yet available.</p>
              {researchError && (
                <div className="bg-destructive/10 text-destructive mb-4 rounded-[0.15rem] p-3 text-sm">
                  {researchError}
                </div>
              )}
              <Button onClick={handleResearch} disabled={isResearching}>
                <Search className="mr-2 h-4 w-4" />
                Research Company
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Draft Outreach Email
          </CardTitle>
          <CardDescription>AI-generated personalized email for this lead</CardDescription>
        </CardHeader>
        <CardContent>
          {isGeneratingEmail ? (
            <div className="py-12 text-center">
              <Loader2 className="text-primary mx-auto mb-4 h-12 w-12 animate-spin" />
              <p className="font-medium">Generating email draft...</p>
              <p className="text-muted-foreground mt-1 text-sm">This may take a few seconds</p>
            </div>
          ) : emailDraft ? (
            <div className="space-y-4">
              <div>
                <p className="text-muted-foreground mb-1 text-sm font-medium">Subject</p>
                <p className="text-sm">{emailDraft.subject}</p>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground mb-1 text-sm font-medium">Body</p>
                <div className="bg-muted/50 rounded p-3 text-sm whitespace-pre-wrap">
                  {emailDraft.body}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleCopyEmail} variant="default">
                  {emailCopied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEmailDraft(null);
                    handleGenerateEmail();
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Mail className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="text-muted-foreground mb-4">
                Generate a personalized outreach email for this company.
              </p>
              <Button onClick={handleGenerateEmail} disabled={isGeneratingEmail}>
                <Mail className="mr-2 h-4 w-4" />
                Draft Email
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
