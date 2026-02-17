"use client";

import Link from "next/link";
import { FileText, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Sample filing for navigation testing - will be replaced with real data
const sampleFiling = {
  id: "sample-123",
  companyName: "Sample Technology Corp",
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

export default function FilingsPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8" />
          SEC Form D Filings
        </h1>
        <p className="text-muted-foreground mt-1">
          Browse and filter Form D filings from the SEC EDGAR database
        </p>
      </div>

      {/* Sample filing card for navigation testing */}
      <Card className="hover:border-primary/50 transition-colors">
        <Link href={`/dashboard/filings/${sampleFiling.id}`}>
          <CardContent className="p-6 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg">{sampleFiling.companyName}</h3>
                  {sampleFiling.isAmendment ? (
                    <Badge variant="secondary">Amendment</Badge>
                  ) : (
                    <Badge variant="default">New</Badge>
                  )}
                </div>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span>{sampleFiling.filingDate}</span>
                  <span>{formatCurrency(sampleFiling.totalOffering)}</span>
                  <span>{sampleFiling.industryGroup}</span>
                  <span>{sampleFiling.issuerState}</span>
                </div>
              </div>
              <ExternalLink className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Link>
      </Card>

      <div className="border rounded-lg p-8 text-center text-muted-foreground mt-6">
        <p>Full filings table with filtering will be implemented in an upcoming feature.</p>
        <p className="text-sm mt-2">Click the sample filing above to test navigation to the detail page.</p>
      </div>
    </div>
  );
}
