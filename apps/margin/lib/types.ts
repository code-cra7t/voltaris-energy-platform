export type Metric = {
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number | null;
};

export type Period = { key: string; label: string; start: string; end: string };

export type Dashboard = {
  current: Period & Metric;
  prior: Period & Metric;
  regions: string[];
  selectedRegion: string;
  availableQuarters: Period[];
  monthly: Array<{ label: string; revenue: number; cost: number; margin: number }>;
  drivers: Array<{ label: string; category: "revenue" | "cost"; current: number; prior: number; delta: number }>;
  regionRows: Array<{ region: string; revenue: number; cost: number; margin: number; marginPct: number | null; delta: number }>;
  eventCount: number;
  updatedAt: string;
  synthetic: boolean;
};

export type Evidence = {
  id: string;
  occurredAt: string;
  kind: "recognized_revenue" | "actual_cost";
  amount: number;
  category: string;
  description: string;
  region: string;
  siteName: string;
  siteId: string | null;
  workOrderId: string | null;
  sourceReference: string;
};

export type EvidenceResult = { records: Evidence[]; nextCursor: string | null };

export type BacklogItem = {
  id: string;
  status: string;
  title: string;
  siteName: string;
  region: string;
  scheduledFor: string | null;
  forecastRevenue: number;
  forecastCost: number;
  source: "approved_work_order";
};

export type Backlog = { items: BacklogItem[]; forecastRevenue: number; forecastCost: number; openCount: number; updatedAt: string };

export type AnalysisKey = "margin_change" | "revenue_drivers" | "cost_drivers" | "backlog";

export type Analysis = {
  question: string;
  analysis: AnalysisKey;
  answer: string;
  evidence: Array<{ label: string; value: string; detail?: string }>;
  caveat?: string;
  sourceEventIds: string[];
  generatedBy: "computed" | "ai_grounded";
};

export type ApiError = { error: string };
