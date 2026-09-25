export type IsoDateTime = string;
export type Quarter = string; // YYYY-Q1 through YYYY-Q4

export type IncidentStatus =
  | "open"
  | "analyzed"
  | "proposed"
  | "scheduled"
  | "resolved";

export type WorkOrderStatus =
  | "proposed"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface SiteRef {
  id: string;
  name: string;
  region: string;
  city: string;
}

export interface AssetSummary {
  id: string;
  assetCode: string;
  model: string;
  manufacturer: string;
  status: "operational" | "degraded" | "offline";
  site: SiteRef;
  openIncidentCount: number;
}

export interface IncidentSummary {
  id: string;
  assetCode: string;
  siteName: string;
  region: string;
  summary: string;
  status: IncidentStatus;
  priority: "low" | "medium" | "high" | "critical";
  reportedAt: IsoDateTime;
}

export interface EvidenceRef {
  id: string;
  title: string;
  excerpt: string;
  sourceType: "runbook" | "maintenance_log" | "contract";
  sourceId: string;
}

export interface IncidentFinding {
  overview: string;
  likelyCauses: string[];
  recommendedChecks: string[];
  urgency: "routine" | "priority" | "urgent";
  limitations: string[];
  evidenceIds: string[];
  generatedAt: IsoDateTime;
}

export interface TechnicianRef {
  id: string;
  name: string;
  baseCity: string;
  skills: string[];
}

export interface DispatchProposal {
  id: string;
  technician: TechnicianRef;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  rationale: string;
  workSummary: string;
  forecastCostCents: number;
  status: "pending" | "approved" | "rejected";
  createdAt: IsoDateTime;
}

export interface WorkOrderRef {
  id: string;
  incidentId: string;
  status: WorkOrderStatus;
  technician: TechnicianRef;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  forecastCostCents: number;
  actualCostCents: number | null;
  completedAt: IsoDateTime | null;
}

export interface AgentAction {
  id: string;
  incidentId: string;
  action: string;
  outcome: "success" | "rejected" | "error";
  detail: string;
  actor: string;
  createdAt: IsoDateTime;
}

export interface IncidentDetail extends IncidentSummary {
  description: string;
  asset: AssetSummary;
  contract: {
    id: string;
    name: string;
    serviceLevel: string;
    responseHours: number;
  } | null;
  maintenanceHistory: Array<{
    id: string;
    occurredAt: IsoDateTime;
    summary: string;
    costCents: number;
  }>;
  evidence: EvidenceRef[];
  finding: IncidentFinding | null;
  proposal: DispatchProposal | null;
  workOrder: WorkOrderRef | null;
  actions: AgentAction[];
}

export interface StaffUser {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "dispatcher" | "manager";
}

export interface MetricTotals {
  recognizedRevenueCents: number;
  actualCostCents: number;
  marginCents: number;
  marginPct: number | null;
}

export interface MarginDashboard {
  region: string | null;
  quarter: Quarter;
  periodStart: string;
  periodEnd: string;
  priorPeriodStart: string;
  priorPeriodEnd: string;
  current: MetricTotals;
  prior: MetricTotals;
  marginDeltaCents: number;
  marginDeltaPctPoints: number | null;
  monthlySeries: Array<{
    month: string;
    revenueCents: number;
    costCents: number;
    marginCents: number;
  }>;
  regionBreakdown: Array<{ region: string; current: MetricTotals; prior: MetricTotals }>;
  drivers: Array<{
    category: string;
    kind: "revenue" | "cost";
    currentCents: number;
    priorCents: number;
    deltaCents: number;
    eventIds: string[];
  }>;
  eventCount: number;
}

export interface FinancialEvidence {
  id: string;
  occurredOn: string;
  kind: "recognized_revenue" | "actual_cost" | "forecast_revenue" | "forecast_cost";
  category: string;
  amountCents: number;
  description: string;
  site: SiteRef;
  workOrderId: string | null;
  sourceReference: string;
}

export interface BacklogItem {
  workOrder: WorkOrderRef;
  site: SiteRef;
  assetCode: string;
  forecastRevenueCents: number;
  forecastCostCents: number;
}

export interface BacklogSummary {
  items: BacklogItem[];
  forecastRevenueCents: number;
  forecastCostCents: number;
  openWorkOrderCount: number;
}

export type MarginAnalysisKind =
  | "margin_change"
  | "revenue_drivers"
  | "cost_drivers"
  | "backlog";

export interface MarginAnalysis {
  analysis: MarginAnalysisKind;
  region: string | null;
  quarter: Quarter;
  headline: string;
  explanation: string;
  limitations: string[];
  metrics: MetricTotals;
  priorMetrics: MetricTotals;
  evidence: FinancialEvidence[];
  generatedAt: IsoDateTime;
}
