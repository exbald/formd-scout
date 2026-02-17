"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Calendar, TrendingUp, DollarSign } from "lucide-react";
import { formatDollarAmount } from "@/lib/format-currency";

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

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
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

      {/* Placeholder for future sections */}
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
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="text-muted-foreground text-center py-8">
                Chart placeholder - {stats?.dailyCounts?.length ?? 0} days of data available
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
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="text-muted-foreground text-center py-8">
                Chart placeholder - {stats?.topIndustries?.length ?? 0} industries
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
