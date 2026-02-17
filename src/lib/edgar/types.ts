// SEC EDGAR Form D TypeScript interfaces
// This file will contain all type definitions for EDGAR data structures

export interface EdgarFilingHit {
  _source: {
    entity_name: string;
    file_num: string;
    period_of_report: string;
    file_date: string;
    form_type: string;
    file_description: string;
  };
  _id: string;
}

export interface EdgarSearchResponse {
  hits: {
    hits: EdgarFilingHit[];
    total: { value: number };
  };
}

export interface ParsedFormDFiling {
  companyName: string;
  cik: string;
  accessionNumber: string;
  entityType: string | null;
  stateOfInc: string | null;
  sicCode: string | null;
  filingDate: string;
  isAmendment: boolean;
  totalOffering: number | null;
  amountSold: number | null;
  amountRemaining: number | null;
  numInvestors: number | null;
  minInvestment: number | null;
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
}

export interface FilingEnrichment {
  companySummary: string;
  relevanceScore: number;
  relevanceReasoning: string;
  estimatedHeadcount: number;
  growthSignals: string[];
  competitors: string[];
}
