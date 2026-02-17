"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Calendar, TrendingUp, DollarSign, ExternalLink } from "lucide-react";
import { formatDollarAmount } from "@/lib/format-currency";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface StatsData {
  today: {
    count: number;
    totalAmount: string;
  };
  thisWeek: {
    count: number;
    totalAmount: string;
  };
  thisMonth: {
    count: number;
    totalAmount: string;
  };
  highRelevanceCount: number;
  averageOffering: string;
  topIndustries: Array<{ industry: string | null; count: number }>;
  topStates: Array<{ state: string | null; count: number }>;
  dailyCounts: Array<{ date: string; count: number }>;
}

interface HighRelevanceFiling {
  id: string;
  companyName: string;
  filingDate: string;
  totalOffering: number | null;
  relevanceScore: number | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [highRelevanceFilings, setHighRelevanceFilings] = useState<HighRelevanceFiling[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/edgar/stats");
        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.status}`);
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  useEffect(() => {
    async function fetchHighRelevanceFilings() {
      try {
        // Fetch top 10 filings with relevance score >= 60
        const response = await fetch(
          "/api/edgar/filings?minRelevance=60&sortBy=relevanceScore&sortOrder=desc&limit=10"
        );
        if (response.ok) {
          const data = await response.json();
          setHighRelevanceFilings(data.filings || []);
        }
      } catch (err) {
        console.error("Error fetching high-relevance filings:", err);
      }
    }

    fetchHighRelevanceFilings();
  }, []);

  // Get relevance badge styling
  const getRelevanceBadgeVariant = (
    score: number | null
  ): "default" | "secondary" | "outline" => {
    if (score === null) return "outline";
    if (score >= 70) return "default";
    if (score >= 40) return "secondary";
    return "outline";
  };

  const getRelevanceColor = (score: number | null): string => {
    if (score === null) return "text-muted-foreground";
    if (score >= 70) return "text-green-600 dark:text-green-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-gray-500";
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">SEC Form D Monitor</h1>
          <p className="text-muted-foreground mt-1">
            Monitor private funding filings from SEC EDGAR
          </p>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Today's Filings Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Filings
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : error ? (
              <span className="text-destructive text-sm">Error</span>
            ) : (
              <div className="text-2xl font-bold">
                {stats?.today.count ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        {/* This Week Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : error ? (
              <span className="text-destructive text-sm">Error</span>
            ) : (
              <div className="text-2xl font-bold">
                {stats?.thisWeek.count ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        {/* High Relevance Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              High Relevance
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : error ? (
              <span className="text-destructive text-sm">Error</span>
            ) : (
              <div className="text-2xl font-bold">
                {stats?.highRelevanceCount ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Score 60+
            </p>
          </CardContent>
        </Card>

        {/* Average Round Size Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Round Size
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : error ? (
              <span className="text-destructive text-sm">Error</span>
            ) : (
              <div className="text-2xl font-bold">
                {formatDollarAmount(stats?.averageOffering ?? "0")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Filings Over Time</CardTitle>
            <CardDescription>
              Daily filing counts for the last 14 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats?.dailyCounts ?? []}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => {
                        const d = new Date(value);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      labelFormatter={(label) => {
                        const d = new Date(label);
                        return d.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        });
                      }}
                      formatter={(value) => [value ?? 0, "Filings"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Industries</CardTitle>
            <CardDescription>
              Most active industry groups
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats?.topIndustries ?? []}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      type="category"
                      dataKey="industry"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      width={120}
                      tickFormatter={(value) =>
                        value && value.length > 15 ? `${value.slice(0, 15)}...` : value
                      }
                    />
                    <Tooltip
                      formatter={(value) => [value ?? 0, "Filings"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent High-Relevance Filings Table */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent High-Relevance Filings</CardTitle>
            <CardDescription>
              Top 10 filings with relevance score of 60 or higher
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <Skeleton className="h-[200px] w-full" />
              </div>
            ) : highRelevanceFilings.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No high-relevance filings found. Filings with AI enrichment scores of 60+
                will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Company Name</th>
                      <th className="text-left p-4 font-medium">Filing Date</th>
                      <th className="text-left p-4 font-medium">Offering Amount</th>
                      <th className="text-left p-4 font-medium">Relevance</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {highRelevanceFilings.map((filing) => (
                      <tr
                        key={filing.id}
                        className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() =>
                          router.push(`/dashboard/filings/${filing.id}`)
                        }
                      >
                        <td className="p-4">
                          <span className="font-medium">{filing.companyName}</span>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {filing.filingDate}
                        </td>
                        <td className="p-4">
                          {filing.totalOffering !== null
                            ? formatDollarAmount(filing.totalOffering)
                            : "N/A"}
                        </td>
                        <td className="p-4">
                          {filing.relevanceScore !== null ? (
                            <Badge
                              variant={getRelevanceBadgeVariant(filing.relevanceScore)}
                              className={getRelevanceColor(filing.relevanceScore)}
                            >
                              {filing.relevanceScore}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
