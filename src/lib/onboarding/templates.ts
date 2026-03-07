export interface IndustryTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  targetMarkets: string[];
  targetIndustries: string[];
  idealCompanyProfile: string;
  scoringCriteria: { high: string; medium: string; low: string };
  emailTone: "professional" | "warm" | "casual";
  autoResearchThreshold: number;
}

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: "cre-broker",
    name: "CRE Broker",
    icon: "Building2",
    description: "Commercial real estate brokers targeting companies needing office space",
    targetMarkets: ["New York", "Manhattan", "NYC Tri-State", "San Francisco", "Los Angeles"],
    targetIndustries: ["Technology", "Fintech", "AI/ML", "SaaS", "E-commerce", "Healthcare Tech"],
    idealCompanyProfile:
      "Growth-stage technology companies with 50+ employees likely to need significant office space in major US metro areas",
    scoringCriteria: {
      high: "Tech/growth company, large funding round ($10M+), in target market, clear indicators of office space needs (hiring, expanding)",
      medium:
        "Potential office needs but less certain - smaller round, non-tech but growing, or outside primary target market",
      low: "Pooled investment fund, real estate holding, very small round (<$1M), shell company, or no clear office space need",
    },
    emailTone: "professional",
    autoResearchThreshold: 60,
  },
  {
    id: "b2b-saas",
    name: "B2B SaaS Sales",
    icon: "Rocket",
    description: "SaaS sales teams targeting funded companies for enterprise software sales",
    targetMarkets: ["United States", "Canada", "United Kingdom", "European Union"],
    targetIndustries: [
      "Technology",
      "Financial Services",
      "Healthcare",
      "Manufacturing",
      "Retail",
      "Professional Services",
    ],
    idealCompanyProfile:
      "Growing companies with 20+ employees and funding, actively hiring, with potential need for B2B software solutions",
    scoringCriteria: {
      high: "Funded company ($5M+), actively hiring, in target industry, technology-forward indicators",
      medium: "Smaller funding or earlier stage, potential fit but less clear buying signals",
      low: "Very early stage, no funding disclosed, or industries unlikely to need enterprise software",
    },
    emailTone: "warm",
    autoResearchThreshold: 55,
  },
  {
    id: "recruiter",
    name: "Recruiter / Staffing",
    icon: "Users",
    description: "Recruiters and staffing agencies seeking companies actively hiring",
    targetMarkets: ["United States"],
    targetIndustries: ["Technology", "Finance", "Healthcare", "Legal", "Professional Services"],
    idealCompanyProfile:
      "Companies actively hiring with recent funding, growth-stage, likely to need external recruiting support",
    scoringCriteria: {
      high: "Recently funded ($3M+), multiple job postings, growth-stage company in professional services sector",
      medium: "Some hiring activity, smaller funding round, or early-stage growth",
      low: "No hiring activity, investment fund, or not in target industries",
    },
    emailTone: "warm",
    autoResearchThreshold: 50,
  },
  {
    id: "vc-investor",
    name: "VC / Investor",
    icon: "TrendingUp",
    description: "Venture capital and investors tracking market activity and deal flow",
    targetMarkets: ["United States", "Global"],
    targetIndustries: ["Technology", "Healthcare", "Fintech", "CleanTech", "Consumer"],
    idealCompanyProfile:
      "Early to growth-stage companies in target sectors with strong founding teams and market opportunity",
    scoringCriteria: {
      high: "Strong founding team indicators, large addressable market, sector fit with investment thesis",
      medium: "Interesting sector but early to assess, or outside primary focus areas",
      low: "Not in target sectors, competitive round, or lacks venture-scale potential",
    },
    emailTone: "professional",
    autoResearchThreshold: 70,
  },
  {
    id: "professional-services",
    name: "Professional Services",
    icon: "Briefcase",
    description: "Law firms, accounting, consulting targeting companies needing services",
    targetMarkets: ["United States"],
    targetIndustries: [
      "Technology",
      "Financial Services",
      "Healthcare",
      "Real Estate",
      "Manufacturing",
    ],
    idealCompanyProfile:
      "Growing companies with funding or revenue, likely to need legal, accounting, or consulting services",
    scoringCriteria: {
      high: "Funded company, active growth, complex business structure or regulatory environment",
      medium: "Smaller company but growing, potential need for services as they scale",
      low: "Very small operation, investment fund, or low-complexity business model",
    },
    emailTone: "professional",
    autoResearchThreshold: 55,
  },
];

export function getTemplateById(id: string): IndustryTemplate | undefined {
  return INDUSTRY_TEMPLATES.find((t) => t.id === id);
}

export function getDefaultTemplate(): IndustryTemplate {
  return INDUSTRY_TEMPLATES[0]!;
}
