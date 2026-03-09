"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Rocket,
  Users,
  TrendingUp,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { INDUSTRY_TEMPLATES, type IndustryTemplate } from "@/lib/onboarding/templates";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  Rocket,
  Users,
  TrendingUp,
  Briefcase,
};

interface KeyClient {
  name: string;
  industry: string;
  relationship: string;
  notableDeals: string;
}

interface FormData {
  template: string;
  targetMarkets: string[];
  targetIndustries: string[];
  idealCompanyProfile: string;
  scoringHigh: string;
  scoringMedium: string;
  scoringLow: string;
  emailTone: string;
  teamName: string;
  companyName: string;
  keyClients: KeyClient[];
  autoResearchThreshold: number;
}

const INITIAL_FORM: FormData = {
  template: "",
  targetMarkets: [],
  targetIndustries: [],
  idealCompanyProfile: "",
  scoringHigh: "",
  scoringMedium: "",
  scoringLow: "",
  emailTone: "professional",
  teamName: "",
  companyName: "",
  keyClients: [],
  autoResearchThreshold: 60,
};

const COMMON_MARKETS = [
  "New York",
  "Manhattan",
  "NYC Tri-State",
  "San Francisco",
  "Los Angeles",
  "Chicago",
  "Boston",
  "Austin",
  "Seattle",
  "Miami",
  "Denver",
  "Washington DC",
];

const COMMON_INDUSTRIES = [
  "Technology",
  "Fintech",
  "AI/ML",
  "SaaS",
  "E-commerce",
  "Healthcare Tech",
  "Biotech",
  "CleanTech",
  "EdTech",
  "PropTech",
  "Cybersecurity",
  "DevOps/Infrastructure",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);

  const applyTemplate = (template: IndustryTemplate) => {
    setFormData((prev) => ({
      ...prev,
      template: template.id,
      targetMarkets: template.targetMarkets,
      targetIndustries: template.targetIndustries,
      idealCompanyProfile: template.idealCompanyProfile,
      scoringHigh: template.scoringCriteria.high,
      scoringMedium: template.scoringCriteria.medium,
      scoringLow: template.scoringCriteria.low,
      emailTone: template.emailTone,
      autoResearchThreshold: template.autoResearchThreshold,
    }));
  };

  const toggleArrayItem = (field: "targetMarkets" | "targetIndustries", item: string) => {
    setFormData((prev) => {
      const arr = prev[field];
      return {
        ...prev,
        [field]: arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item],
      };
    });
  };

  const addKeyClient = () => {
    setFormData((prev) => ({
      ...prev,
      keyClients: [
        ...prev.keyClients,
        { name: "", industry: "", relationship: "", notableDeals: "" },
      ],
    }));
  };

  const updateKeyClient = (index: number, field: keyof KeyClient, value: string) => {
    setFormData((prev) => {
      const clients = [...prev.keyClients];
      clients[index] = { ...clients[index]!, [field]: value };
      return { ...prev, keyClients: clients };
    });
  };

  const removeKeyClient = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      keyClients: prev.keyClients.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const profileRes = await fetch("/api/edgar/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          teamName: formData.teamName || null,
          companyName: formData.companyName || null,
          keyClients: formData.keyClients.length > 0 ? formData.keyClients : null,
          targetMarkets: formData.targetMarkets,
          targetIndustries: formData.targetIndustries,
          idealCompanyProfile: formData.idealCompanyProfile || null,
          scoringCriteria: {
            high: formData.scoringHigh,
            medium: formData.scoringMedium,
            low: formData.scoringLow,
          },
          emailTone: formData.emailTone,
        }),
      });

      if (!profileRes.ok) throw new Error("Failed to create profile");

      const settingsRes = await fetch("/api/edgar/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          autoResearchThreshold: formData.autoResearchThreshold,
          autoResearchEnabled: true,
          maxDailyResearch: 15,
        }),
      });

      if (!settingsRes.ok) throw new Error("Failed to save settings");

      router.push("/dashboard");
    } catch (error) {
      console.error("Onboarding error:", error);
      alert("Failed to complete setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      const defaultTemplate = INDUSTRY_TEMPLATES[0]!;
      await fetch("/api/edgar/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          teamName: null,
          companyName: null,
          targetMarkets: defaultTemplate.targetMarkets,
          targetIndustries: defaultTemplate.targetIndustries,
          idealCompanyProfile: defaultTemplate.idealCompanyProfile,
          scoringCriteria: defaultTemplate.scoringCriteria,
          emailTone: defaultTemplate.emailTone,
        }),
      });
      await fetch("/api/edgar/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          autoResearchThreshold: 60,
          autoResearchEnabled: true,
          maxDailyResearch: 15,
        }),
      });
      router.push("/dashboard");
    } catch (error) {
      console.error("Skip onboarding error:", error);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.template !== "";
      case 2:
        return formData.targetMarkets.length > 0;
      case 3:
        return (
          formData.scoringHigh.length > 0 &&
          formData.scoringMedium.length > 0 &&
          formData.scoringLow.length > 0
        );
      default:
        return true;
    }
  };

  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold">Welcome to FormD Scout</h1>
          <p className="text-muted-foreground mt-2">
            Let&apos;s set up your profile in just a few steps
          </p>
        </div>

        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-2 w-8 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        <Card className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium">What best describes you?</h2>
                <p className="text-muted-foreground text-sm">
                  We&apos;ll customize your experience based on your role
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {INDUSTRY_TEMPLATES.map((template) => {
                  const Icon = ICONS[template.icon];
                  return (
                    <button
                      key={template.id}
                      onClick={() => applyTemplate(template)}
                      className={`relative rounded-lg border p-4 text-left transition-all ${
                        formData.template === template.id
                          ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/30 shadow-sm"
                          : "border-border bg-muted/50 hover:border-primary/50"
                      }`}
                    >
                      {formData.template === template.id && (
                        <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        {Icon && (
                          <Icon
                            className={`h-5 w-5 ${
                              formData.template === template.id
                                ? "text-primary-foreground"
                                : "text-muted-foreground"
                            }`}
                          />
                        )}
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className={`text-sm ${
                            formData.template === template.id
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}>
                            {template.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium">Target Markets & Industries</h2>
                <p className="text-muted-foreground text-sm">
                  Select the markets and industries you want to target
                </p>
              </div>
              <div>
                <Label className="mb-2 block">Target Markets</Label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_MARKETS.map((market) => (
                    <button
                      key={market}
                      onClick={() => toggleArrayItem("targetMarkets", market)}
                      className={`rounded-full border px-3 py-1 text-sm transition-all ${
                        formData.targetMarkets.includes(market)
                          ? "border-primary bg-primary text-primary-foreground ring-1 ring-primary/50 shadow-sm font-medium"
                          : "border-border bg-muted text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {market}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Target Industries</Label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_INDUSTRIES.map((industry) => (
                    <button
                      key={industry}
                      onClick={() => toggleArrayItem("targetIndustries", industry)}
                      className={`rounded-full border px-3 py-1 text-sm transition-all ${
                        formData.targetIndustries.includes(industry)
                          ? "border-primary bg-primary text-primary-foreground ring-1 ring-primary/50 shadow-sm font-medium"
                          : "border-border bg-muted text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {industry}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium">Scoring Criteria</h2>
                <p className="text-muted-foreground text-sm">
                  How should we score companies for relevance?
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>High Relevance (Score 70-100)</Label>
                  <Textarea
                    value={formData.scoringHigh}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        scoringHigh: e.target.value,
                      }))
                    }
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Medium Relevance (Score 40-69)</Label>
                  <Textarea
                    value={formData.scoringMedium}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        scoringMedium: e.target.value,
                      }))
                    }
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Low Relevance (Score 1-39)</Label>
                  <Textarea
                    value={formData.scoringLow}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        scoringLow: e.target.value,
                      }))
                    }
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium">Team Info & Key Clients</h2>
                <p className="text-muted-foreground text-sm">
                  Add your team details and key clients for personalized outreach
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Team Name</Label>
                  <Input
                    value={formData.teamName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        teamName: e.target.value,
                      }))
                    }
                    placeholder="e.g., CBRE Tech Team"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Company Name</Label>
                  <Input
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        companyName: e.target.value,
                      }))
                    }
                    placeholder="e.g., CBRE"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Key Clients (Optional)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addKeyClient}>
                    Add Client
                  </Button>
                </div>
                <div className="space-y-3">
                  {formData.keyClients.map((client, index) => (
                    <div key={index} className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <Input
                          placeholder="Client name"
                          value={client.name}
                          onChange={(e) => updateKeyClient(index, "name", e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeKeyClient(index)}
                        >
                          ×
                        </Button>
                      </div>
                      <Input
                        placeholder="Industry"
                        value={client.industry}
                        onChange={(e) => updateKeyClient(index, "industry", e.target.value)}
                      />
                      <Input
                        placeholder="Relationship / deal size"
                        value={client.relationship}
                        onChange={(e) => updateKeyClient(index, "relationship", e.target.value)}
                      />
                      <Input
                        placeholder="Notable deals"
                        value={client.notableDeals}
                        onChange={(e) => updateKeyClient(index, "notableDeals", e.target.value)}
                      />
                    </div>
                  ))}
                  {formData.keyClients.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                      No clients added. You can add these later in Settings.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium">Research Automation</h2>
                <p className="text-muted-foreground text-sm">
                  Set your auto-research threshold for company deep research
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <Label>Auto-Research Threshold</Label>
                    <span className="text-primary text-2xl font-semibold">
                      {formData.autoResearchThreshold}
                    </span>
                  </div>
                  <Slider
                    value={[formData.autoResearchThreshold]}
                    onValueChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        autoResearchThreshold: val[0] ?? prev.autoResearchThreshold,
                      }))
                    }
                    min={1}
                    max={100}
                    step={1}
                  />
                  <p className="text-muted-foreground mt-2 text-sm">
                    Filings scoring above {formData.autoResearchThreshold} will be automatically
                    researched for deeper company intelligence
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t pt-6">
            <div>
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              ) : (
                <Button variant="ghost" onClick={handleSkip} disabled={loading}>
                  Skip for now
                </Button>
              )}
            </div>
            <div>
              {step < 5 ? (
                <Button onClick={() => setStep(step + 1)} disabled={!canProceed() || loading}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? "Setting up..." : "Complete Setup"}
                  <Check className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
