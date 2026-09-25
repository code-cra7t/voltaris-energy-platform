export type Asset = {
  id: string;
  code: string;
  name: string;
  siteName: string;
  region: string;
  status?: string;
};

export type IncidentStatus = "reported" | "analyzing" | "analyzed" | "proposed" | "approved" | "rejected" | "completed" | string;

export type IncidentSummary = {
  id: string;
  reference: string;
  title: string;
  description: string;
  status: IncidentStatus;
  createdAt: string;
  asset: Asset;
  severity?: string;
};

export type Citation = {
  id: string;
  label: string;
  excerpt: string;
  sourceType: "runbook" | "maintenance" | "contract" | string;
  date?: string;
};

export type Finding = {
  title: string;
  explanation: string;
  citationIds: string[];
  confidence?: string;
};

export type Analysis = {
  summary: string;
  findings: Finding[];
  safetyNote: string;
  generatedAt: string;
  model?: string;
};

export type DispatchProposal = {
  id: string;
  status: "pending" | "approved" | "rejected" | string;
  technician: { id: string; name: string; skills: string[] };
  slot: { id: string; start: string; end: string };
  rationale: string;
  estimatedCost: number | null;
  currency: string;
  slaDueAt?: string;
  createdAt: string;
};

export type WorkOrder = {
  id: string;
  reference: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  technicianName: string;
  estimatedCost: number | null;
  currency: string;
};

export type Activity = {
  id: string;
  kind: "incident" | "agent" | "approval" | "work_order" | string;
  title: string;
  detail: string;
  actor: string;
  createdAt: string;
};

export type IncidentDetail = IncidentSummary & {
  site: { name: string; address?: string; region: string };
  contract?: { name: string; responseHours?: number; slaDueAt?: string };
  citations: Citation[];
  analysis?: Analysis | null;
  proposal?: DispatchProposal | null;
  workOrder?: WorkOrder | null;
  activity: Activity[];
};

export type ApiError = { error: string };
