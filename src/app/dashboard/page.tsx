"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Calendar, TrendingUp, DollarSign, ExternalLink } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDollarAmount } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { getRelevanceBadgeVariant, getRelevanceColor } from "@/lib/relevance-styles";

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

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [highRelevanceFilings, setHighRelevanceFilings] = useState<HighRelevanceFiling[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Single useEffect fetches all dashboard data in parallel for optimal performance
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch stats and high-relevance filings in parallel - only 2 API calls
        const [statsResponse, filingsResponse] = await Promise.all([
          fetch("/api/edgar/stats"),
          fetch("/api/edgar/filings?minRelevance=50&sortBy=relevanceScore&sortOrder=desc&limit=10"),
        ]);

        if (!statsResponse.ok) {
          throw new Error(`Failed to fetch stats: ${statsResponse.status}`);
        }

        const statsData = await statsResponse.json();
        setStats(statsData);

        // Filings endpoint is optional - don't fail if it errors
        if (filingsResponse.ok) {
          const filingsData = await filingsResponse.json();
          setHighRelevanceFilings(filingsData.filings || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <div className="container mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="border-border mb-6 flex flex-col items-start justify-between gap-4 border-b pb-4 sm:mb-8 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SEC Form D Monitor</h1>
          <p className="text-muted-foreground mt-1 text-xs font-semibold tracking-widest uppercase">
            Monitor private funding filings from SEC EDGAR
          </p>
        </div>
      </div>

      {/* Stats Cards Row - responsive: 1 col mobile, 2 cols tablet, 4 cols desktop */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:mb-8 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {/* Today's Filings Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Filings</CardTitle>
            <FileText className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : error ? (
              <span className="text-destructive text-sm">Error</span>
            ) : (
              <div className="text-2xl font-bold">{stats?.today.count ?? 0}</div>
            )}
          </CardContent>
        </Card>

        {/* This Week Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : error ? (
              <span className="text-destructive text-sm">Error</span>
            ) : (
              <div className="text-2xl font-bold">{stats?.thisWeek.count ?? 0}</div>
            )}
          </CardContent>
        </Card>

        {/* High Relevance Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Relevance</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : error ? (
              <span className="text-destructive text-sm">Error</span>
            ) : (
              <div className="text-2xl font-bold">{stats?.highRelevanceCount ?? 0}</div>
            )}
            <p className="text-muted-foreground mt-1 text-xs">Score 60+</p>
          </CardContent>
        </Card>

        {/* Average Round Size Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Round Size</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
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

      {/* Charts Row - stack on mobile, side-by-side on desktop */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Filings Over Time</CardTitle>
            <CardDescription>Daily filing counts for the last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : !stats?.dailyCounts || stats.dailyCounts.length === 0 ? (
              <div className="text-muted-foreground flex h-[250px] items-center justify-center">
                <div className="text-center">
                  <Calendar className="mx-auto mb-2 h-10 w-10 opacity-50" />
                  <p>No filing data available for the last 14 days</p>
                </div>
              </div>
            ) : (
              <div className="h-[250px] w-full overflow-visible">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.dailyCounts}
                    margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
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
                      wrapperStyle={{ zIndex: 1000 }}
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
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Industries</CardTitle>
            <CardDescription>Most active industry groups</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : !stats?.topIndustries || stats.topIndustries.length === 0 ? (
              <div className="text-muted-foreground flex h-[250px] items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="mx-auto mb-2 h-10 w-10 opacity-50" />
                  <p>No industry data available yet</p>
                </div>
              </div>
            ) : (
              <div className="flex h-[250px] w-full items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.topIndustries.map((item) => ({
                        name: item.industry ?? "Unknown",
                        value: item.count,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => {
                        const n = name ?? "Unknown";
                        const p = percent ?? 0;
                        return `${n.slice(0, 10)}${n.length > 10 ? "..." : ""} ${(p * 100).toFixed(0)}%`;
                      }}
                      labelLine={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
                    >
                      {stats.topIndustries.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]!} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [value ?? 0, name]}
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent High-Relevance Filings Table */}
      <div className="mt-6 sm:mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent High-Relevance Filings</CardTitle>
            <CardDescription>Top 10 filings with relevance score of 50 or higher</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <Skeleton className="h-[200px] w-full" />
              </div>
            ) : highRelevanceFilings.length === 0 ? (
              <div className="text-muted-foreground p-6 text-center sm:p-8">
                No high-relevance filings found. Filings with AI enrichment scores of 50+ will
                appear here.
              </div>
            ) : (
              <>
                {/* Desktop Table View - hidden on mobile */}
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="p-4 text-left font-medium">Company Name</th>
                        <th className="p-4 text-left font-medium">Filing Date</th>
                        <th className="p-4 text-left font-medium">Offering Amount</th>
                        <th className="p-4 text-left font-medium">Relevance</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {highRelevanceFilings.map((filing, index) => (
                        <tr
                          key={`${filing.id}-${index}`}
                          className="hover:bg-muted/50 cursor-pointer border-b transition-colors"
                          onClick={() => router.push(`/dashboard/filings/${filing.id}`)}
                        >
                          <td className="p-4">
                            <span className="font-medium">{filing.companyName}</span>
                          </td>
                          <td className="text-muted-foreground p-4">
                            {formatDate(filing.filingDate)}
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
                            <ExternalLink className="text-muted-foreground h-4 w-4" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View - visible only on mobile */}
                <div className="divide-y sm:hidden">
                  {highRelevanceFilings.map((filing, index) => (
                    <div
                      key={`${filing.id}-${index}`}
                      className="hover:bg-muted/50 cursor-pointer p-4 transition-colors"
                      onClick={() => router.push(`/dashboard/filings/${filing.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{filing.companyName}</p>
                          <p className="text-muted-foreground mt-1 text-sm">
                            {formatDate(filing.filingDate)}
                          </p>
                        </div>
                        {filing.relevanceScore !== null && (
                          <Badge
                            variant={getRelevanceBadgeVariant(filing.relevanceScore)}
                            className={getRelevanceColor(filing.relevanceScore)}
                          >
                            {filing.relevanceScore}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {filing.totalOffering !== null
                            ? formatDollarAmount(filing.totalOffering)
                            : "N/A"}
                        </span>
                        <ExternalLink className="text-muted-foreground h-4 w-4" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
