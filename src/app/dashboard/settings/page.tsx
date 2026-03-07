"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Bell,
  Shield,
  Palette,
  RefreshCw,
  Loader2,
  Briefcase,
  Target,
  Mail,
  Plus,
  X,
  Trash2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth-client";

interface KeyClient {
  name: string;
  industry: string;
  relationship: string;
  notableDeals: string;
}

interface TeamProfile {
  id?: string;
  userId?: string;
  teamName: string | null;
  companyName: string | null;
  keyClients: KeyClient[] | null;
  teamBio: string | null;
  expertise: string[] | null;
  targetMarkets: string[] | null;
  targetIndustries: string[] | null;
  idealCompanyProfile: string | null;
  scoringCriteria: {
    high: string;
    medium: string;
    low: string;
  } | null;
  emailSignature: string | null;
  emailTone: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const marketOptions = [
  { value: "New York", label: "New York" },
  { value: "Manhattan", label: "Manhattan" },
  { value: "NYC Tri-State", label: "NYC Tri-State" },
  { value: "San Francisco", label: "San Francisco" },
  { value: "Bay Area", label: "Bay Area" },
  { value: "Los Angeles", label: "Los Angeles" },
  { value: "Silicon Valley", label: "Silicon Valley" },
  { value: "Chicago", label: "Chicago" },
  { value: "Boston", label: "Boston" },
  { value: "Austin", label: "Austin" },
  { value: "Seattle", label: "Seattle" },
  { value: "Denver", label: "Denver" },
  { value: "Miami", label: "Miami" },
  { value: "Washington DC", label: "Washington DC" },
  { value: "Atlanta", label: "Atlanta" },
  { value: "Dallas", label: "Dallas" },
  { value: "Phoenix", label: "Phoenix" },
  { value: "Houston", label: "Houston" },
];

const industryOptions = [
  { value: "Technology", label: "Technology" },
  { value: "Fintech", label: "Fintech" },
  { value: "AI/ML", label: "AI/ML" },
  { value: "SaaS", label: "SaaS" },
  { value: "E-commerce", label: "E-commerce" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Biotech", label: "Biotech" },
  { value: "Real Estate", label: "Real Estate" },
  { value: "Financial Services", label: "Financial Services" },
  { value: "Insurance", label: "Insurance" },
  { value: "Legal", label: "Legal" },
  { value: "Consulting", label: "Consulting" },
  { value: "Manufacturing", label: "Manufacturing" },
  { value: "Logistics", label: "Logistics" },
  { value: "Retail", label: "Retail" },
  { value: "Education", label: "Education" },
  { value: "Media", label: "Media" },
  { value: "Entertainment", label: "Entertainment" },
];

interface AppSettingsData {
  autoResearchThreshold: number;
  autoResearchEnabled: boolean;
  maxDailyResearch: number;
  maxAgentCredits: number;
}

interface AlertConfig {
  id: string;
  name: string;
  minRelevanceScore: number | null;
  states: string[] | null;
  industries: string[] | null;
  minOffering: string | null;
  emailEnabled: boolean;
  emailAddress: string | null;
  webhookUrl: string | null;
  isActive: boolean;
}

const stateOptions = [
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

const defaultProfile: TeamProfile = {
  teamName: null,
  companyName: null,
  keyClients: null,
  teamBio: null,
  expertise: null,
  targetMarkets: null,
  targetIndustries: null,
  idealCompanyProfile: null,
  scoringCriteria: null,
  emailSignature: null,
  emailTone: null,
};

export default function SettingsPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const [rescoring, setRescoring] = useState(false);
  const [rescoreResult, setRescoreResult] = useState<{ enriched: number; errors: number } | null>(
    null
  );
  const [profile, setProfile] = useState<TeamProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newClient, setNewClient] = useState<KeyClient>({
    name: "",
    industry: "",
    relationship: "",
    notableDeals: "",
  });
  const [newExpertise, setNewExpertise] = useState("");
  const [emailTone, setEmailTone] = useState<string>("professional");

  // Research automation state
  const [appSettingsData, setAppSettingsData] = useState<AppSettingsData>({
    autoResearchThreshold: 60,
    autoResearchEnabled: true,
    maxDailyResearch: 15,
    maxAgentCredits: 500,
  });
  const [, setSettingsLoading] = useState(false);

  // Alert configuration state
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [newAlert, setNewAlert] = useState({
    name: "",
    minRelevanceScore: 60,
    states: [] as string[],
    industries: [] as string[],
    minOffering: "",
    emailEnabled: false,
    emailAddress: "",
  });

  useEffect(() => {
    fetchProfile();
    fetchAppSettings();
    fetchAlerts();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/edgar/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
          setEmailTone(data.profile.emailTone || "professional");
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAppSettings = async () => {
    try {
      const res = await fetch("/api/edgar/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setAppSettingsData({
            autoResearchThreshold: data.settings.autoResearchThreshold ?? 60,
            autoResearchEnabled: data.settings.autoResearchEnabled ?? true,
            maxDailyResearch: data.settings.maxDailyResearch ?? 15,
            maxAgentCredits: data.settings.maxAgentCredits ?? 500,
          });
        }
      }
    } catch (err) {
      console.error("Error fetching app settings:", err);
    }
  };

  const handleSaveAppSettings = async (updates: Partial<AppSettingsData>) => {
    setSettingsLoading(true);
    try {
      const newSettings = { ...appSettingsData, ...updates };
      const res = await fetch("/api/edgar/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        const data = await res.json();
        setAppSettingsData({
          autoResearchThreshold: data.settings.autoResearchThreshold ?? 60,
          autoResearchEnabled: data.settings.autoResearchEnabled ?? true,
          maxDailyResearch: data.settings.maxDailyResearch ?? 15,
          maxAgentCredits: data.settings.maxAgentCredits ?? 500,
        });
        toast.success("Research settings saved");
      }
    } catch (err) {
      console.error("Error saving app settings:", err);
      toast.error("Failed to save research settings");
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/edgar/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error("Error fetching alerts:", err);
    }
  };

  const handleCreateAlert = async () => {
    if (!newAlert.name.trim()) return;
    setAlertsLoading(true);
    try {
      const res = await fetch("/api/edgar/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAlert.name,
          minRelevanceScore: newAlert.minRelevanceScore,
          states: newAlert.states.length > 0 ? newAlert.states : null,
          industries: newAlert.industries.length > 0 ? newAlert.industries : null,
          minOffering: newAlert.minOffering || null,
          emailEnabled: newAlert.emailEnabled,
          emailAddress: newAlert.emailAddress || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts((prev) => [...prev, data.alert]);
        setNewAlert({
          name: "",
          minRelevanceScore: 60,
          states: [],
          industries: [],
          minOffering: "",
          emailEnabled: false,
          emailAddress: "",
        });
        toast.success("Alert created");
      }
    } catch (err) {
      console.error("Error creating alert:", err);
      toast.error("Failed to create alert");
    } finally {
      setAlertsLoading(false);
    }
  };

  const handleToggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const res = await fetch("/api/edgar/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alertId, isActive }),
      });
      if (res.ok) {
        setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, isActive } : a)));
      }
    } catch (err) {
      console.error("Error toggling alert:", err);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/edgar/alerts?id=${alertId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        toast.success("Alert deleted");
      }
    } catch (err) {
      console.error("Error deleting alert:", err);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/edgar/profile", {
        method: profile.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: profile.teamName,
          companyName: profile.companyName,
          targetMarkets: profile.targetMarkets,
          targetIndustries: profile.targetIndustries,
          idealCompanyProfile: profile.idealCompanyProfile,
          scoringCriteria: profile.scoringCriteria,
          keyClients: profile.keyClients,
          teamBio: profile.teamBio,
          expertise: profile.expertise,
          emailSignature: profile.emailSignature,
          emailTone: profile.emailTone,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
      }
      const data = await res.json();
      setProfile(data.profile);
      toast.success("Profile saved successfully");
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(err instanceof Error ? err.message : "Failed to save profile");
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExpertise = () => {
    if (newExpertise.trim()) {
      setProfile((prev) => ({
        ...prev,
        expertise: [...(prev.expertise || []), newExpertise.trim()],
      }));
      setNewExpertise("");
    }
  };

  const handleRemoveExpertise = (index: number) => {
    const currentExpertise = profile.expertise || [];
    const updatedExpertise = currentExpertise.filter((_, i) => i !== index);
    setProfile((prev) => ({ ...prev, expertise: updatedExpertise }));
  };

  const handleAddClient = () => {
    if (!newClient.name.trim()) return;
    const currentClients = profile.keyClients || [];
    setProfile((prev) => ({
      ...prev,
      keyClients: [...currentClients, { ...newClient }],
    }));
    setNewClient({ name: "", industry: "", relationship: "", notableDeals: "" });
  };

  const handleRemoveClient = (index: number) => {
    const currentClients = profile.keyClients || [];
    const updatedClients = currentClients.filter((_, i) => i !== index);
    setProfile((prev) => ({ ...prev, keyClients: updatedClients }));
  };

  const handleRescoreAll = async () => {
    setRescoring(true);
    setRescoreResult(null);
    try {
      const res = await fetch("/api/edgar/enrich-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rescoreAll: true }),
      });
      const data = await res.json();
      setRescoreResult({ enriched: data.enriched, errors: data.errors });
    } catch {
      setRescoreResult({ enriched: 0, errors: 1 });
    } finally {
      setRescoring(false);
    }
  };

  if (!sessionPending && !session) {
    return (
      <div className="mx-auto mt-16 max-w-lg space-y-6 px-4 text-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Sign in to access Settings</h2>
          <p className="text-muted-foreground">
            Account settings are only available to signed-in users.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/login">
            <Button size="lg" className="w-full sm:w-auto">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Create account
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const userInitial = (session?.user?.name?.[0] || session?.user?.email?.[0] || "U").toUpperCase();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings and preferences</p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive mb-4 rounded-md p-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSaveProfile} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Changes
        </Button>
      </div>

      <CollapsibleCard
        title="Profile"
        description="Your account information"
        icon={<User className="h-5 w-5" />}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage
                src={session?.user?.image || ""}
                alt={session?.user?.name || "User"}
                referrerPolicy="no-referrer"
              />
              <AvatarFallback className="text-xl">{userInitial}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{session?.user?.name}</p>
              <p className="text-muted-foreground text-sm">{session?.user?.email}</p>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" defaultValue={session?.user?.name || ""} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={session?.user?.email || ""} disabled />
            </div>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Team Info"
        description="Configure your team name and company"
        icon={<Briefcase className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                placeholder="e.g., NYC Office Team"
                value={profile.teamName || ""}
                onChange={(e) => setProfile({ ...profile, teamName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="e.g., CBRE"
                value={profile.companyName || ""}
                onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
              />
            </div>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Scoring Profile"
        description="Define your target markets, industries, and ideal profile for AI scoring"
        icon={<Target className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Target Markets</Label>
              <MultiSelect
                options={marketOptions}
                selected={profile.targetMarkets || []}
                onChange={(value) => setProfile({ ...profile, targetMarkets: value })}
                placeholder="Select target markets..."
                ariaLabel="Select target markets"
              />
            </div>
            <div className="grid gap-2">
              <Label>Target Industries</Label>
              <MultiSelect
                options={industryOptions}
                selected={profile.targetIndustries || []}
                onChange={(value) => setProfile({ ...profile, targetIndustries: value })}
                placeholder="Select target industries"
                ariaLabel="Select target industries"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="idealCompanyProfile">Ideal Company Profile</Label>
            <Textarea
              id="idealCompanyProfile"
              placeholder="Describe your ideal company..."
              value={profile.idealCompanyProfile || ""}
              onChange={(e) => setProfile({ ...profile, idealCompanyProfile: e.target.value })}
              className="min-h-[80px] resize-none"
            />
          </div>
          <Separator />
          <div className="space-y-4">
            <p className="text-sm font-medium">Scoring Criteria</p>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="highCriteria">High Relevance (70+ score)</Label>
                <Textarea
                  id="highCriteria"
                  placeholder="Criteria for high relevance leads..."
                  value={profile.scoringCriteria?.high || ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      scoringCriteria: {
                        high: e.target.value,
                        medium: profile.scoringCriteria?.medium || "",
                        low: profile.scoringCriteria?.low || "",
                      },
                    })
                  }
                  className="min-h-[60px] resize-none"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mediumCriteria">Medium Relevance (40-69 score)</Label>
                <Textarea
                  id="mediumCriteria"
                  placeholder="Criteria for medium relevance leads..."
                  value={profile.scoringCriteria?.medium || ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      scoringCriteria: {
                        high: profile.scoringCriteria?.high || "",
                        medium: e.target.value,
                        low: profile.scoringCriteria?.low || "",
                      },
                    })
                  }
                  className="min-h-[60px] resize-none"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lowCriteria">Low Relevance (&lt;40 score)</Label>
                <Textarea
                  id="lowCriteria"
                  placeholder="Criteria for low relevance leads..."
                  value={profile.scoringCriteria?.low || ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      scoringCriteria: {
                        high: profile.scoringCriteria?.high || "",
                        medium: profile.scoringCriteria?.medium || "",
                        low: e.target.value,
                      },
                    })
                  }
                  className="min-h-[60px] resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Key Clients"
        description="Add and manage clients to reference in outreach emails"
        icon={<Briefcase className="h-5 w-5" />}
      >
        <div className="space-y-4">
          {profile.keyClients && profile.keyClients.length > 0 ? (
            <div className="space-y-2">
              {profile.keyClients.map((client, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {client.industry}
                      {client.relationship && ` • ${client.relationship}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveClient(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No key clients added yet</p>
          )}
          <Separator />
          <div className="space-y-3">
            <p className="text-sm font-medium">Add New Client</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  placeholder="e.g., Acme Corp"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="clientIndustry">Industry</Label>
                <Input
                  id="clientIndustry"
                  placeholder="e.g., Technology"
                  value={newClient.industry}
                  onChange={(e) => setNewClient({ ...newClient, industry: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="clientRelationship">Relationship</Label>
                <Input
                  id="clientRelationship"
                  placeholder="e.g., Exclusive tenant rep"
                  value={newClient.relationship}
                  onChange={(e) => setNewClient({ ...newClient, relationship: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="clientNotableDeals">Notable Deals</Label>
                <Input
                  id="clientNotableDeals"
                  placeholder="e.g., 50,000 sq ft lease"
                  value={newClient.notableDeals}
                  onChange={(e) => setNewClient({ ...newClient, notableDeals: e.target.value })}
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddClient}
              disabled={!newClient.name.trim()}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Outreach Settings"
        description="Configure your team bio, expertise, and email preferences"
        icon={<Mail className="h-5 w-5" />}
      >
        <div className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="teamBio">Team Bio</Label>
            <Textarea
              id="teamBio"
              placeholder="Brief description of your team and expertise..."
              value={profile.teamBio || ""}
              onChange={(e) => setProfile({ ...profile, teamBio: e.target.value })}
              className="min-h-[80px]"
            />
          </div>
          <div className="grid gap-2">
            <Label>Areas of Expertise</Label>
            <div className="flex flex-wrap gap-2">
              {(profile.expertise || []).map((exp, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {exp}
                  <button
                    className="hover:text-destructive ml-1"
                    onClick={() => handleRemoveExpertise(index)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add expertise (e.g., Office Leasing)"
                value={newExpertise}
                onChange={(e) => setNewExpertise(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newExpertise.trim()) {
                    handleAddExpertise();
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddExpertise}
                disabled={!newExpertise.trim()}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label htmlFor="emailSignature">Email Signature</Label>
            <Textarea
              id="emailSignature"
              placeholder="Your email signature..."
              value={profile.emailSignature || ""}
              onChange={(e) => setProfile({ ...profile, emailSignature: e.target.value })}
              className="min-h-[100px]"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="emailTone">Email Tone</Label>
            <Select
              value={emailTone}
              onValueChange={(value) => {
                setEmailTone(value);
                setProfile((prev) => ({ ...prev, emailTone: value }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select tone..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="AI Scoring"
        description="Re-analyze all filings with your current scoring profile"
        icon={<RefreshCw className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            If you&apos;ve updated your team profile or scoring criteria, use this to re-score all
            filings with the new settings. This will delete existing enrichment data and generate
            fresh AI analysis.
          </p>
          <div className="flex items-center gap-4">
            <Button onClick={handleRescoreAll} disabled={rescoring}>
              {rescoring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Re-scoring...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-score All Filings
                </>
              )}
            </Button>
            {rescoreResult && (
              <p className="text-muted-foreground text-sm">
                Completed: {rescoreResult.enriched} enriched, {rescoreResult.errors} errors
              </p>
            )}
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Research Automation"
        description="Configure automatic company research for high-relevance filings"
        icon={<Search className="h-5 w-5" />}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Auto-Research</Label>
              <p className="text-muted-foreground text-sm">
                Automatically research companies that score above the threshold
              </p>
            </div>
            <Switch
              checked={appSettingsData.autoResearchEnabled}
              onCheckedChange={(checked) => {
                setAppSettingsData((prev) => ({ ...prev, autoResearchEnabled: checked }));
                handleSaveAppSettings({ autoResearchEnabled: checked });
              }}
            />
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Relevance Threshold</Label>
              <span className="text-sm font-medium">{appSettingsData.autoResearchThreshold}</span>
            </div>
            <Slider
              value={[appSettingsData.autoResearchThreshold]}
              onValueChange={(value) =>
                setAppSettingsData((prev) => ({
                  ...prev,
                  autoResearchThreshold: value[0] ?? 60,
                }))
              }
              onValueCommit={(value) =>
                handleSaveAppSettings({ autoResearchThreshold: value[0] ?? 60 })
              }
              min={1}
              max={100}
              step={5}
            />
            <p className="text-muted-foreground text-xs">
              Filings scoring above this threshold will be automatically researched. Lower = more
              research, higher cost. Higher = fewer, more targeted.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="maxDailyResearch">Max Daily Research</Label>
            <Input
              id="maxDailyResearch"
              type="number"
              min={1}
              max={100}
              value={appSettingsData.maxDailyResearch}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 15;
                setAppSettingsData((prev) => ({ ...prev, maxDailyResearch: val }));
              }}
              onBlur={() =>
                handleSaveAppSettings({ maxDailyResearch: appSettingsData.maxDailyResearch })
              }
              className="w-32"
            />
            <p className="text-muted-foreground text-xs">
              Maximum number of companies to research per day via automation
            </p>
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxAgentCredits">Max Firecrawl Credits per Research</Label>
              <span className="text-muted-foreground text-sm">
                {appSettingsData.maxAgentCredits}
              </span>
            </div>
            <Slider
              id="maxAgentCredits"
              min={100}
              max={2500}
              step={100}
              value={[appSettingsData.maxAgentCredits]}
              onValueChange={([v]) =>
                setAppSettingsData((prev) => ({
                  ...prev,
                  maxAgentCredits: v ?? 500,
                }))
              }
              onValueCommit={([v]) => handleSaveAppSettings({ maxAgentCredits: v ?? 500 })}
            />
            <p className="text-muted-foreground text-xs">
              Controls how deeply the agent researches each company. Higher = more thorough but
              costs more credits.
            </p>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Alert Configuration"
        description="Set up alerts to be notified when filings match your criteria"
        icon={<Bell className="h-5 w-5" />}
      >
        <div className="space-y-6">
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{alert.name}</p>
                      {alert.emailEnabled && (
                        <Badge variant="secondary" className="text-xs">
                          <Mail className="mr-1 h-3 w-3" />
                          Email
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Min score: {alert.minRelevanceScore ?? "Any"}
                      {alert.states &&
                        (alert.states as string[]).length > 0 &&
                        ` · States: ${(alert.states as string[]).join(", ")}`}
                      {alert.industries &&
                        (alert.industries as string[]).length > 0 &&
                        ` · Industries: ${(alert.industries as string[]).join(", ")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={alert.isActive}
                      onCheckedChange={(checked) => handleToggleAlert(alert.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {alerts.length === 0 && (
            <p className="text-muted-foreground text-sm">No alerts configured yet</p>
          )}

          <Separator />

          <div className="space-y-4">
            <p className="text-sm font-medium">Create New Alert</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="alertName">Alert Name</Label>
                <Input
                  id="alertName"
                  placeholder="e.g., High-Value NYC Tech"
                  value={newAlert.name}
                  onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="alertMinScore">Min Relevance Score</Label>
                <Input
                  id="alertMinScore"
                  type="number"
                  min={0}
                  max={100}
                  value={newAlert.minRelevanceScore}
                  onChange={(e) =>
                    setNewAlert({
                      ...newAlert,
                      minRelevanceScore: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>States</Label>
                <MultiSelect
                  options={stateOptions}
                  selected={newAlert.states}
                  onChange={(value) => setNewAlert({ ...newAlert, states: value })}
                  placeholder="Any state"
                  ariaLabel="Select states for alert"
                />
              </div>
              <div className="grid gap-2">
                <Label>Industries</Label>
                <MultiSelect
                  options={industryOptions}
                  selected={newAlert.industries}
                  onChange={(value) => setNewAlert({ ...newAlert, industries: value })}
                  placeholder="Any industry"
                  ariaLabel="Select industries for alert"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="alertMinOffering">Min Offering Amount ($)</Label>
                <Input
                  id="alertMinOffering"
                  type="number"
                  placeholder="e.g., 1000000"
                  value={newAlert.minOffering}
                  onChange={(e) => setNewAlert({ ...newAlert, minOffering: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="alertEmail">Alert Email</Label>
                <Input
                  id="alertEmail"
                  type="email"
                  placeholder="alerts@company.com"
                  value={newAlert.emailAddress}
                  onChange={(e) => setNewAlert({ ...newAlert, emailAddress: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newAlert.emailEnabled}
                onCheckedChange={(checked) => setNewAlert({ ...newAlert, emailEnabled: checked })}
              />
              <Label>Enable email notifications</Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateAlert}
              disabled={!newAlert.name.trim() || alertsLoading}
            >
              {alertsLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Alert
            </Button>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Appearance"
        description="Customize the look of the app"
        icon={<Palette className="h-5 w-5" />}
      >
        <p className="text-muted-foreground text-sm">
          Use the theme toggle in the header to switch between light and dark mode.
        </p>
      </CollapsibleCard>

      <CollapsibleCard
        title="Security"
        description="Manage your security settings"
        icon={<Shield className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            You signed in with Google OAuth. Your account security is managed through your Google
            account.
          </p>
        </div>
      </CollapsibleCard>
    </div>
  );
}
