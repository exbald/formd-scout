"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  Search,
  X,
  Save,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  SlidersHorizontal,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  Bookmark,
  Copy,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Industry group options
const INDUSTRY_GROUPS = [
  { value: "Technology", label: "Technology" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Financial Services", label: "Financial Services" },
  { value: "Consumer Products", label: "Consumer Products" },
  { value: "Real Estate", label: "Real Estate" },
  { value: "Energy", label: "Energy" },
  { value: "Industrial", label: "Industrial" },
  { value: "Media & Entertainment", label: "Media & Entertainment" },
  { value: "Education", label: "Education" },
  { value: "Other", label: "Other" },
];

// US State options
const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
];

interface Filing {
  id: string;
  companyName: string;
  filingDate: string;
  totalOffering: number | null;
  industryGroup: string | null;
  issuerState: string | null;
  isAmendment: boolean;
  relevanceScore: number | null;
}

interface FilingsResponse {
  filings: Filing[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface SavedFilter {
  id: string;
  filterName: string;
  minOffering: string | null;
  maxOffering: string | null;
  industryGroups: string[] | null;
  states: string[] | null;
  minRelevance: number | null;
  isDefault: boolean;
  createdAt: string;
}

const formatCurrency = (amount: number | null | undefined): string => {
  if (!amount) return "N/A";
  if (amount >= 1_000_000_000)
    return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount}`;
};

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

// Sortable column type
type SortableColumn = "companyName" | "filingDate" | "totalOffering" | "industryGroup" | "issuerState" | "relevanceScore";

// Sort indicator component
const SortIndicator = ({ column, currentSortBy, currentSortOrder }: { column: SortableColumn; currentSortBy: string; currentSortOrder: string }) => {
  if (currentSortBy !== column) {
    return <ArrowUpDown className="h-4 w-4 ml-1 opacity-40" />;
  }
  return currentSortOrder === "asc" ? (
    <ArrowUp className="h-4 w-4 ml-1 text-primary" />
  ) : (
    <ArrowDown className="h-4 w-4 ml-1 text-primary" />
  );
};

export default function FilingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter state
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [startDate, setStartDate] = useState(
    searchParams.get("startDate") || ""
  );
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
  const [minOffering, setMinOffering] = useState(
    searchParams.get("minOffering") || ""
  );
  const [maxOffering, setMaxOffering] = useState(
    searchParams.get("maxOffering") || ""
  );
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(
    searchParams.get("industryGroup")?.split(",").filter(Boolean) || []
  );
  const [selectedStates, setSelectedStates] = useState<string[]>(
    searchParams.get("state")?.split(",").filter(Boolean) || []
  );
  const [minRelevance, setMinRelevance] = useState(
    searchParams.get("minRelevance") || ""
  );
  const [isAmendment, setIsAmendment] = useState(
    searchParams.get("isAmendment") || ""
  );
  const [yetToOccur, setYetToOccur] = useState(
    searchParams.get("yetToOccur") === "true"
  );

  // Pagination state
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1", 10)
  );
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "filingDate");
  const [sortOrder, setSortOrder] = useState(
    searchParams.get("sortOrder") || "desc"
  );

  // Data state
  const [filings, setFilings] = useState<Filing[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Save filter dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Saved filters state
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [savedFiltersOpen, setSavedFiltersOpen] = useState(false);
  const [deleteFilterId, setDeleteFilterId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch filings
  const fetchFilings = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();

      if (search) params.set("search", search);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (minOffering) params.set("minOffering", minOffering);
      if (maxOffering) params.set("maxOffering", maxOffering);
      if (selectedIndustries.length > 0)
        params.set("industryGroup", selectedIndustries.join(","));
      if (selectedStates.length > 0)
        params.set("state", selectedStates.join(","));
      if (minRelevance) params.set("minRelevance", minRelevance);
      if (isAmendment) params.set("isAmendment", isAmendment);
      if (yetToOccur) params.set("yetToOccur", "true");
      params.set("page", page.toString());
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      const response = await fetch(`/api/edgar/filings?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch filings");

      const data: FilingsResponse = await response.json();
      setFilings(data.filings);
      setPagination(data.pagination);

      // Update URL with current filters
      router.push(`/dashboard/filings?${params.toString()}`, {
        scroll: false,
      });
    } catch (error) {
      console.error("Error fetching filings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    search,
    startDate,
    endDate,
    minOffering,
    maxOffering,
    selectedIndustries,
    selectedStates,
    minRelevance,
    isAmendment,
    yetToOccur,
    page,
    sortBy,
    sortOrder,
    router,
  ]);

  useEffect(() => {
    fetchFilings();
  }, [fetchFilings]);

  // Fetch saved filters on mount
  useEffect(() => {
    const fetchSavedFilters = async () => {
      try {
        const response = await fetch("/api/edgar/filters");
        if (response.ok) {
          const data = await response.json();
          setSavedFilters(data.filters || []);
        }
      } catch (error) {
        console.error("Error fetching saved filters:", error);
      }
    };
    fetchSavedFilters();
  }, []);

  // Close saved filters dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (savedFiltersOpen && !target.closest(".saved-filters-dropdown")) {
        setSavedFiltersOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [savedFiltersOpen]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchFilings();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleClearFilters = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setMinOffering("");
    setMaxOffering("");
    setSelectedIndustries([]);
    setSelectedStates([]);
    setMinRelevance("");
    setIsAmendment("");
    setYetToOccur(false);
    setPage(1);
    setSortBy("filingDate");
    setSortOrder("desc");
    // Clear URL params - push to base route without query string
    router.push("/dashboard/filings", { scroll: false });
  };

  const handleSaveFilter = async () => {
    if (!filterName.trim()) return;

    try {
      const response = await fetch("/api/edgar/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filterName: filterName.trim(),
          minOffering: minOffering || null,
          maxOffering: maxOffering || null,
          industryGroups: selectedIndustries.length > 0 ? selectedIndustries : null,
          states: selectedStates.length > 0 ? selectedStates : null,
          minRelevance: minRelevance ? parseInt(minRelevance, 10) : null,
        }),
      });

      if (!response.ok) throw new Error("Failed to save filter");

      // Refresh saved filters list
      const listResponse = await fetch("/api/edgar/filters");
      if (listResponse.ok) {
        const data = await listResponse.json();
        setSavedFilters(data.filters || []);
      }

      setSaveDialogOpen(false);
      setFilterName("");
      setSaveSuccess(true);
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving filter:", error);
    }
  };

  // Load a saved filter into the filter state
  const handleLoadFilter = (filter: SavedFilter) => {
    setMinOffering(filter.minOffering || "");
    setMaxOffering(filter.maxOffering || "");
    setSelectedIndustries(filter.industryGroups || []);
    setSelectedStates(filter.states || []);
    setMinRelevance(filter.minRelevance ? String(filter.minRelevance) : "");
    setPage(1);
    setSavedFiltersOpen(false);
  };

  // Delete a saved filter
  const handleDeleteFilter = async () => {
    if (!deleteFilterId) return;

    try {
      const response = await fetch(`/api/edgar/filters?id=${deleteFilterId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete filter");

      // Refresh saved filters list
      setSavedFilters(savedFilters.filter((f) => f.id !== deleteFilterId));
      setDeleteDialogOpen(false);
      setDeleteFilterId(null);
    } catch (error) {
      console.error("Error deleting filter:", error);
    }
  };

  const openDeleteDialog = (filterId: string) => {
    setDeleteFilterId(filterId);
    setDeleteDialogOpen(true);
  };

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams();

      // Apply current filters to export
      if (search) params.set("search", search);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (minOffering) params.set("minOffering", minOffering);
      if (maxOffering) params.set("maxOffering", maxOffering);
      if (selectedIndustries.length > 0)
        params.set("industryGroup", selectedIndustries.join(","));
      if (selectedStates.length > 0)
        params.set("state", selectedStates.join(","));
      if (minRelevance) params.set("minRelevance", minRelevance);
      if (isAmendment) params.set("isAmendment", isAmendment);
      if (yetToOccur) params.set("yetToOccur", "true");

      // Trigger download
      const response = await fetch(`/api/edgar/export?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to export CSV");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `form-d-filings-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting CSV:", error);
    }
  };

  // Copy Summary - formats top 10 results as text for clipboard
  const handleCopySummary = async () => {
    try {
      // Fetch top 10 results with current filters
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (minOffering) params.set("minOffering", minOffering);
      if (maxOffering) params.set("maxOffering", maxOffering);
      if (selectedIndustries.length > 0)
        params.set("industryGroup", selectedIndustries.join(","));
      if (selectedStates.length > 0)
        params.set("state", selectedStates.join(","));
      if (minRelevance) params.set("minRelevance", minRelevance);
      if (isAmendment) params.set("isAmendment", isAmendment);
      if (yetToOccur) params.set("yetToOccur", "true");
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("limit", "10");

      const response = await fetch(`/api/edgar/filings?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch filings");

      const data: FilingsResponse = await response.json();
      const topFilings = data.filings.slice(0, 10);

      if (topFilings.length === 0) {
        toast.error("No filings to copy");
        return;
      }

      // Format as readable text
      const lines = [
        `Form D Filings Summary - Top ${topFilings.length} Results`,
        `Generated: ${new Date().toLocaleDateString()}`,
        "=".repeat(50),
        "",
      ];

      topFilings.forEach((filing, index) => {
        lines.push(`${index + 1}. ${filing.companyName}`);
        lines.push(`   Filing Date: ${filing.filingDate}`);
        lines.push(`   Offering: ${formatCurrency(filing.totalOffering)}`);
        lines.push(`   Industry: ${filing.industryGroup || "N/A"}`);
        lines.push(`   State: ${filing.issuerState || "N/A"}`);
        lines.push(`   Relevance: ${filing.relevanceScore !== null ? filing.relevanceScore : "N/A"}`);
        lines.push(`   Status: ${filing.isAmendment ? "Amendment" : "New"}`);
        lines.push("");
      });

      // Add filter summary
      const activeFilters: string[] = [];
      if (search) activeFilters.push(`Search: "${search}"`);
      if (startDate || endDate) {
        activeFilters.push(`Date Range: ${startDate || "any"} to ${endDate || "any"}`);
      }
      if (minOffering || maxOffering) {
        activeFilters.push(`Offering: ${minOffering ? formatCurrency(parseInt(minOffering)) : "any"} - ${maxOffering ? formatCurrency(parseInt(maxOffering)) : "any"}`);
      }
      if (selectedIndustries.length > 0) {
        activeFilters.push(`Industries: ${selectedIndustries.join(", ")}`);
      }
      if (selectedStates.length > 0) {
        activeFilters.push(`States: ${selectedStates.join(", ")}`);
      }
      if (minRelevance) {
        activeFilters.push(`Min Relevance: ${minRelevance}`);
      }

      if (activeFilters.length > 0) {
        lines.push("-".repeat(50));
        lines.push("Active Filters:");
        activeFilters.forEach(f => lines.push(`  • ${f}`));
      }

      const summaryText = lines.join("\n");

      await navigator.clipboard.writeText(summaryText);
      toast.success(`Copied ${topFilings.length} filings to clipboard`);
    } catch (error) {
      console.error("Error copying summary:", error);
      toast.error("Failed to copy summary");
    }
  };

  const hasActiveFilters =
    search ||
    startDate ||
    endDate ||
    minOffering ||
    maxOffering ||
    selectedIndustries.length > 0 ||
    selectedStates.length > 0 ||
    minRelevance ||
    isAmendment ||
    yetToOccur;

  // Handle column header click for sorting
  const handleSort = (column: SortableColumn) => {
    if (sortBy === column) {
      // Toggle sort order if same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new sort column with default descending order
      setSortBy(column);
      setSortOrder("desc");
    }
    // Reset to first page when sorting
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            SEC Form D Filings
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and filter Form D filings from the SEC EDGAR database
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="font-medium">Filters</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                Active
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Company name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Min Offering */}
            <div className="space-y-2">
              <Label htmlFor="minOffering">Min Offering ($)</Label>
              <Input
                id="minOffering"
                type="number"
                placeholder="0"
                value={minOffering}
                onChange={(e) => setMinOffering(e.target.value)}
              />
            </div>

            {/* Max Offering */}
            <div className="space-y-2">
              <Label htmlFor="maxOffering">Max Offering ($)</Label>
              <Input
                id="maxOffering"
                type="number"
                placeholder="No limit"
                value={maxOffering}
                onChange={(e) => setMaxOffering(e.target.value)}
              />
            </div>

            {/* Industry Multi-Select */}
            <div className="space-y-2">
              <Label>Industry</Label>
              <MultiSelect
                options={INDUSTRY_GROUPS}
                selected={selectedIndustries}
                onChange={setSelectedIndustries}
                placeholder="Select industries..."
              />
            </div>

            {/* State Multi-Select */}
            <div className="space-y-2">
              <Label>State</Label>
              <MultiSelect
                options={US_STATES}
                selected={selectedStates}
                onChange={setSelectedStates}
                placeholder="Select states..."
              />
            </div>

            {/* Min Relevance */}
            <div className="space-y-2">
              <Label htmlFor="minRelevance">Min Relevance (1-100)</Label>
              <Input
                id="minRelevance"
                type="number"
                min="1"
                max="100"
                placeholder="1"
                value={minRelevance}
                onChange={(e) => setMinRelevance(e.target.value)}
              />
            </div>

            {/* Amendment Toggle */}
            <div className="space-y-2">
              <Label>Filing Type</Label>
              <Select value={isAmendment} onValueChange={setIsAmendment}>
                <SelectTrigger>
                  <SelectValue placeholder="All filings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Filings</SelectItem>
                  <SelectItem value="false">New Only</SelectItem>
                  <SelectItem value="true">Amendments Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Yet to Occur Toggle */}
            <div className="space-y-2">
              <div className="flex items-center pt-6">
                <Checkbox
                  id="yetToOccur"
                  checked={yetToOccur}
                  onCheckedChange={(checked) => setYetToOccur(checked === true)}
                />
                <Label htmlFor="yetToOccur" className="ml-2 cursor-pointer">
                  First sale yet to occur
                </Label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t flex-wrap">
            {/* Saved Filters Dropdown */}
            {savedFilters.length > 0 && (
              <div className="relative saved-filters-dropdown">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSavedFiltersOpen(!savedFiltersOpen)}
                  className="relative"
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  Saved Filters
                </Button>
                {savedFiltersOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-popover border rounded-md shadow-lg z-50">
                    {savedFilters.map((filter) => (
                      <div
                        key={filter.id}
                        className="flex items-center justify-between p-2 hover:bg-muted/50 border-b last:border-b-0"
                      >
                        <button
                          onClick={() => handleLoadFilter(filter)}
                          className="flex-1 text-left text-sm truncate hover:text-primary"
                        >
                          {filter.filterName}
                        </button>
                        <button
                          onClick={() => openDeleteDialog(filter.id)}
                          className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                          title="Delete filter"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaveDialogOpen(true)}
              disabled={!hasActiveFilters}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Filter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              disabled={isLoading || filings.length === 0}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Summary
            </Button>
            {/* Success feedback */}
            {saveSuccess && (
              <span className="text-sm text-green-600 dark:text-green-400 ml-2 animate-pulse">
                Filter saved!
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Loading..."
            : `${pagination.total.toLocaleString()} filing${pagination.total !== 1 ? "s" : ""} found`}
        </p>
        <div className="flex items-center gap-2">
          <Label htmlFor="sortBy" className="text-sm">
            Sort by:
          </Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="filingDate">Filing Date</SelectItem>
              <SelectItem value="companyName">Company Name</SelectItem>
              <SelectItem value="totalOffering">Offering Amount</SelectItem>
              <SelectItem value="relevanceScore">Relevance</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
          </Button>
        </div>
      </div>

      {/* Filings Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading filings...
            </div>
          ) : filings.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No filings found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th
                      className="text-left p-4 font-medium cursor-pointer hover:bg-muted/50 select-none transition-colors"
                      onClick={() => handleSort("companyName")}
                    >
                      <div className="flex items-center">
                        Company Name
                        <SortIndicator column="companyName" currentSortBy={sortBy} currentSortOrder={sortOrder} />
                      </div>
                    </th>
                    <th
                      className="text-left p-4 font-medium cursor-pointer hover:bg-muted/50 select-none transition-colors"
                      onClick={() => handleSort("filingDate")}
                    >
                      <div className="flex items-center">
                        Filing Date
                        <SortIndicator column="filingDate" currentSortBy={sortBy} currentSortOrder={sortOrder} />
                      </div>
                    </th>
                    <th
                      className="text-left p-4 font-medium cursor-pointer hover:bg-muted/50 select-none transition-colors"
                      onClick={() => handleSort("totalOffering")}
                    >
                      <div className="flex items-center">
                        Offering
                        <SortIndicator column="totalOffering" currentSortBy={sortBy} currentSortOrder={sortOrder} />
                      </div>
                    </th>
                    <th
                      className="text-left p-4 font-medium cursor-pointer hover:bg-muted/50 select-none transition-colors"
                      onClick={() => handleSort("industryGroup")}
                    >
                      <div className="flex items-center">
                        Industry
                        <SortIndicator column="industryGroup" currentSortBy={sortBy} currentSortOrder={sortOrder} />
                      </div>
                    </th>
                    <th
                      className="text-left p-4 font-medium cursor-pointer hover:bg-muted/50 select-none transition-colors"
                      onClick={() => handleSort("issuerState")}
                    >
                      <div className="flex items-center">
                        State
                        <SortIndicator column="issuerState" currentSortBy={sortBy} currentSortOrder={sortOrder} />
                      </div>
                    </th>
                    <th
                      className="text-left p-4 font-medium cursor-pointer hover:bg-muted/50 select-none transition-colors"
                      onClick={() => handleSort("relevanceScore")}
                    >
                      <div className="flex items-center">
                        Relevance
                        <SortIndicator column="relevanceScore" currentSortBy={sortBy} currentSortOrder={sortOrder} />
                      </div>
                    </th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filings.map((filing) => (
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
                        {formatCurrency(filing.totalOffering)}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {filing.industryGroup || "N/A"}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {filing.issuerState || "N/A"}
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
                        {filing.isAmendment ? (
                          <Badge variant="secondary">Amendment</Badge>
                        ) : (
                          <Badge>New</Badge>
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

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={!pagination.hasPrev}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={!pagination.hasNext}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Save Filter Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter</DialogTitle>
            <DialogDescription>
              Save your current filter settings for quick access later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filterName">Filter Name</Label>
              <Input
                id="filterName"
                placeholder="e.g., High-value tech companies"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFilter} disabled={!filterName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Filter Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Filter</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this saved filter? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFilter}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
