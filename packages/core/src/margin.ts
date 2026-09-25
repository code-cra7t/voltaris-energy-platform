import { query } from "./db.js";
import { geminiJson } from "./gemini.js";
import type {
  BacklogItem,
  BacklogSummary,
  FinancialEvidence,
  MarginAnalysis,
  MarginAnalysisKind,
  MarginDashboard,
  MetricTotals,
  Quarter,
} from "./types.js";

const FINANCIAL_KINDS = [
  "recognized_revenue",
  "actual_cost",
  "forecast_revenue",
  "forecast_cost",
] as const;

function quarterBounds(quarter?: Quarter) {
  const now = new Date();
  const value = quarter ?? `${now.getUTCFullYear()}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`;
  const match = /^(\d{4})-Q([1-4])$/.exec(value);
  if (!match) throw new Error("quarter must be in YYYY-Q1 through YYYY-Q4 format");
  const year = Number(match[1]);
  const index = Number(match[2]) - 1;
  const date = (y: number, month: number) => new Date(Date.UTC(y, month, 1)).toISOString().slice(0, 10);
  return {
    quarter: value,
    start: date(year, index * 3),
    end: date(year, index * 3 + 3),
    priorStart: date(year, index * 3 - 3),
    priorEnd: date(year, index * 3),
  };
}

function cents(value: string | number | null): number {
  const number = Number(value ?? 0);
  if (!Number.isSafeInteger(number)) throw new Error("Financial amount exceeds safe integer range");
  return number;
}

function totals(revenue = 0, cost = 0): MetricTotals {
  return {
    recognizedRevenueCents: revenue,
    actualCostCents: cost,
    marginCents: revenue - cost,
    marginPct: revenue === 0 ? null : ((revenue - cost) / revenue) * 100,
  };
}

function normalizeRegion(region?: string | null): string | null {
  return region ?? null;
}

interface MetricRow {
  id: string;
  occurred_on: string;
  kind: "recognized_revenue" | "actual_cost";
  category: string;
  amount_cents: string;
  region: string;
}

export async function getMarginDashboard(
  input: { region?: string | null; quarter?: Quarter } = {},
): Promise<MarginDashboard> {
  const region = normalizeRegion(input.region);
  const period = quarterBounds(input.quarter);
  const [events, regions] = await Promise.all([
    query<MetricRow>(
      `SELECT f.id::text, f.occurred_on::text, f.kind, f.category,
              f.amount_cents::text, s.region
       FROM financial_events f
       JOIN sites s ON s.id = f.site_id
       WHERE f.occurred_on >= $1::date AND f.occurred_on < $2::date
         AND f.kind IN ('recognized_revenue', 'actual_cost')
         AND ($3::text IS NULL OR s.region = $3)
       ORDER BY f.occurred_on, f.id`,
      [period.priorStart, period.end, region],
    ),
    query<{ region: string }>(
      `SELECT DISTINCT region FROM sites
       WHERE ($1::text IS NULL OR region = $1)
       ORDER BY region`,
      [region],
    ),
  ]);

  const current = totals();
  const prior = totals();
  const byRegion = new Map<string, { current: MetricTotals; prior: MetricTotals }>();
  for (const item of regions) byRegion.set(item.region, { current: totals(), prior: totals() });
  const monthMap = new Map<string, { month: string; revenueCents: number; costCents: number; marginCents: number }>();
  for (let month = 0; month < 3; month++) {
    const date = new Date(`${period.start}T00:00:00.000Z`);
    date.setUTCMonth(date.getUTCMonth() + month);
    const key = date.toISOString().slice(0, 7);
    monthMap.set(key, { month: key, revenueCents: 0, costCents: 0, marginCents: 0 });
  }
  const drivers = new Map<string, MarginDashboard["drivers"][number]>();
  let eventCount = 0;
  for (const event of events) {
    const amount = cents(event.amount_cents);
    const isCurrent = event.occurred_on >= period.start;
    const target = isCurrent ? current : prior;
    const regionPair = byRegion.get(event.region) ?? { current: totals(), prior: totals() };
    byRegion.set(event.region, regionPair);
    const regionTarget = isCurrent ? regionPair.current : regionPair.prior;
    const field = event.kind === "recognized_revenue" ? "recognizedRevenueCents" : "actualCostCents";
    target[field] += amount;
    regionTarget[field] += amount;
    if (isCurrent) {
      eventCount++;
      const month = monthMap.get(event.occurred_on.slice(0, 7));
      if (month) month[event.kind === "recognized_revenue" ? "revenueCents" : "costCents"] += amount;
    }
    const driverKind = event.kind === "recognized_revenue" ? "revenue" : "cost";
    const key = `${driverKind}\u0000${event.category}`;
    const driver: MarginDashboard["drivers"][number] = drivers.get(key) ?? {
      category: event.category,
      kind: driverKind,
      currentCents: 0,
      priorCents: 0,
      deltaCents: 0,
      eventIds: [],
    };
    driver[isCurrent ? "currentCents" : "priorCents"] += amount;
    driver.eventIds.push(event.id);
    drivers.set(key, driver);
  }
  const finish = (metric: MetricTotals) => {
    metric.marginCents = metric.recognizedRevenueCents - metric.actualCostCents;
    metric.marginPct = metric.recognizedRevenueCents === 0
      ? null
      : (metric.marginCents / metric.recognizedRevenueCents) * 100;
    return metric;
  };
  finish(current);
  finish(prior);
  const regionBreakdown = [...byRegion].sort(([a], [b]) => a.localeCompare(b)).map(([name, pair]) => ({
    region: name,
    current: finish(pair.current),
    prior: finish(pair.prior),
  }));
  const monthlySeries = [...monthMap.values()].map((month) => ({
    ...month,
    marginCents: month.revenueCents - month.costCents,
  }));
  const driverList = [...drivers.values()].map((driver) => ({
    ...driver,
    deltaCents: driver.currentCents - driver.priorCents,
  })).sort((a, b) => Math.abs(b.deltaCents) - Math.abs(a.deltaCents) || a.category.localeCompare(b.category));
  return {
    region,
    quarter: period.quarter,
    periodStart: period.start,
    periodEnd: period.end,
    priorPeriodStart: period.priorStart,
    priorPeriodEnd: period.priorEnd,
    current,
    prior,
    marginDeltaCents: current.marginCents - prior.marginCents,
    marginDeltaPctPoints: current.marginPct === null || prior.marginPct === null
      ? null : current.marginPct - prior.marginPct,
    monthlySeries,
    regionBreakdown,
    drivers: driverList,
    eventCount,
  };
}

interface EvidenceRow {
  id: string;
  occurred_on: string;
  kind: FinancialEvidence["kind"];
  category: string;
  amount_cents: string;
  description: string;
  site_id: string;
  site_name: string;
  region: string;
  city: string;
  work_order_id: string | null;
  source_reference: string;
}

function decodeCursor(cursor?: string): { date: string; id: string } | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
    if (typeof parsed !== "object" || parsed === null) throw new Error();
    const { date, id } = parsed as { date?: unknown; id?: unknown };
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)) throw new Error();
    return { date, id };
  } catch {
    throw new Error("Invalid evidence cursor");
  }
}

export async function getMarginEvidence(
  input: {
    region?: string | null;
    quarter?: Quarter;
    kind?: FinancialEvidence["kind"];
    category?: string;
    limit?: number;
    cursor?: string;
  } = {},
): Promise<{ items: FinancialEvidence[]; nextCursor: string | null }> {
  const period = quarterBounds(input.quarter);
  const region = normalizeRegion(input.region);
  if (input.kind !== undefined && !FINANCIAL_KINDS.includes(input.kind)) throw new Error("Invalid financial evidence kind");
  const limit = input.limit === undefined ? 25 : Math.min(100, Math.max(1, Math.floor(input.limit)));
  if (!Number.isFinite(limit)) throw new Error("Invalid evidence limit");
  const cursor = decodeCursor(input.cursor);
  const rows = await query<EvidenceRow>(
    `SELECT f.id::text, f.occurred_on::text, f.kind, f.category,
            f.amount_cents::text, f.description, s.id::text AS site_id,
            s.name AS site_name, s.region, s.city,
            f.work_order_id::text, f.source_reference
     FROM financial_events f
     JOIN sites s ON s.id = f.site_id
     WHERE f.occurred_on >= $1::date AND f.occurred_on < $2::date
       AND ($3::text IS NULL OR s.region = $3)
       AND (($4::text IS NULL AND f.kind IN ('recognized_revenue', 'actual_cost')) OR f.kind = $4)
       AND ($5::text IS NULL OR f.category = $5)
       AND ($6::date IS NULL OR (f.occurred_on, f.id) < ($6::date, $7::uuid))
     ORDER BY f.occurred_on DESC, f.id DESC
     LIMIT $8`,
    [period.start, period.end, region, input.kind ?? null, input.category ?? null,
      cursor?.date ?? null, cursor?.id ?? null, limit + 1],
  );
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const items = page.map((row) => ({
    id: row.id,
    occurredOn: row.occurred_on,
    kind: row.kind,
    category: row.category,
    amountCents: cents(row.amount_cents),
    description: row.description,
    site: { id: row.site_id, name: row.site_name, region: row.region, city: row.city },
    workOrderId: row.work_order_id,
    sourceReference: row.source_reference,
  }));
  const last = page.at(-1);
  return {
    items,
    nextCursor: hasMore && last
      ? Buffer.from(JSON.stringify({ date: last.occurred_on, id: last.id })).toString("base64url")
      : null,
  };
}

interface BacklogRow {
  id: string;
  incident_id: string;
  status: "scheduled" | "in_progress";
  technician_id: string;
  technician_name: string;
  base_city: string;
  skills: string[] | null;
  starts_at: Date | string;
  ends_at: Date | string;
  forecast_cost_cents: string;
  forecast_event_cost_cents: string | null;
  forecast_revenue_cents: string;
  site_id: string;
  site_name: string;
  region: string;
  city: string;
  asset_code: string;
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export async function getBacklog(
  input: { region?: string | null } = {},
): Promise<BacklogSummary> {
  const rows = await query<BacklogRow>(
    `SELECT w.id::text, w.incident_id::text, w.status,
            t.id::text AS technician_id, t.name AS technician_name, t.base_city,
            skills.skills, slot.starts_at, slot.ends_at,
            w.forecast_cost_cents::text,
            forecast.cost_cents::text AS forecast_event_cost_cents,
            COALESCE(forecast.revenue_cents, 0)::text AS forecast_revenue_cents,
            s.id::text AS site_id, s.name AS site_name, s.region, s.city, a.asset_code
     FROM work_orders w
     JOIN incidents i ON i.id = w.incident_id
     JOIN assets a ON a.id = i.asset_id
     JOIN sites s ON s.id = a.site_id
     JOIN technicians t ON t.id = w.technician_id
     JOIN availability_slots slot ON slot.id = w.slot_id
     LEFT JOIN LATERAL (
       SELECT array_agg(skill ORDER BY skill) AS skills
       FROM technician_skills WHERE technician_id = t.id
     ) skills ON true
     LEFT JOIN LATERAL (
       SELECT SUM(amount_cents) FILTER (WHERE kind = 'forecast_cost') AS cost_cents,
              SUM(amount_cents) FILTER (WHERE kind = 'forecast_revenue') AS revenue_cents
       FROM financial_events WHERE work_order_id = w.id
     ) forecast ON true
     WHERE w.status IN ('scheduled', 'in_progress')
       AND ($1::text IS NULL OR s.region = $1)
     ORDER BY slot.starts_at, w.id`,
    [normalizeRegion(input.region)],
  );
  const items: BacklogItem[] = rows.map((row) => {
    const forecastCostCents = cents(row.forecast_event_cost_cents ?? row.forecast_cost_cents);
    const forecastRevenueCents = cents(row.forecast_revenue_cents);
    return {
      workOrder: {
        id: row.id,
        incidentId: row.incident_id,
        status: row.status,
        technician: { id: row.technician_id, name: row.technician_name,
          baseCity: row.base_city, skills: row.skills ?? [] },
        startsAt: iso(row.starts_at),
        endsAt: iso(row.ends_at),
        forecastCostCents,
        actualCostCents: null,
        completedAt: null,
      },
      site: { id: row.site_id, name: row.site_name, region: row.region, city: row.city },
      assetCode: row.asset_code,
      forecastRevenueCents,
      forecastCostCents,
    };
  });
  return {
    items,
    forecastRevenueCents: items.reduce((sum, item) => sum + item.forecastRevenueCents, 0),
    forecastCostCents: items.reduce((sum, item) => sum + item.forecastCostCents, 0),
    openWorkOrderCount: items.length,
  };
}

export async function getMarginAnalysis(input: {
  region?: string | null;
  quarter?: Quarter;
  analysis: MarginAnalysisKind;
}): Promise<MarginAnalysis> {
  if (!["margin_change", "revenue_drivers", "cost_drivers", "backlog"].includes(input.analysis)) {
    throw new Error("Invalid margin analysis kind");
  }
  const dashboard = await getMarginDashboard(input);
  const kind = input.analysis === "revenue_drivers" ? "recognized_revenue"
    : input.analysis === "cost_drivers" ? "actual_cost" : undefined;
  const [evidencePage, backlog] = await Promise.all([
    input.analysis === "backlog" ? Promise.resolve({ items: [] as FinancialEvidence[] })
      : getMarginEvidence({ region: input.region, quarter: dashboard.quarter, kind, limit: 12 }),
    input.analysis === "backlog" ? getBacklog({ region: input.region }) : Promise.resolve(null),
  ]);
  const headline = input.analysis === "backlog"
    ? `${backlog?.openWorkOrderCount ?? 0} open work orders carry ${((backlog?.forecastCostCents ?? 0) / 100).toFixed(2)} EUR forecast cost.`
    : `Service margin ${dashboard.marginDeltaCents >= 0 ? "increased" : "decreased"} by ${(Math.abs(dashboard.marginDeltaCents) / 100).toFixed(2)} EUR versus the prior quarter.`;
  const computed = {
    quarter: dashboard.quarter,
    region: dashboard.region,
    current: dashboard.current,
    prior: dashboard.prior,
    marginDeltaCents: dashboard.marginDeltaCents,
    drivers: dashboard.drivers.slice(0, 8).map(({ category, kind, currentCents, priorCents, deltaCents, eventIds }) => ({
      category, kind, currentCents, priorCents, deltaCents, eventIds: eventIds.slice(0, 8),
    })),
    evidence: evidencePage.items.map(({ id, category, kind, amountCents, sourceReference }) => ({
      id, category, kind, amountCents, sourceReference,
    })),
    backlog: backlog && {
      openWorkOrderCount: backlog.openWorkOrderCount,
      forecastRevenueCents: backlog.forecastRevenueCents,
      forecastCostCents: backlog.forecastCostCents,
      workOrderIds: backlog.items.slice(0, 12).map((item) => item.workOrder.id),
    },
  };
  let narrative: { explanation?: unknown; limitations?: unknown } | null = null;
  try {
    narrative = await geminiJson<{ explanation?: unknown; limitations?: unknown }>(
      `Explain the requested ${input.analysis} analysis using only the computed JSON below. ` +
      `Do not invent facts, figures, causes, or source references. Do not include numerical values, ` +
      `currency symbols, or percentages in your prose; the application displays verified numbers separately. ` +
      `Clearly describe that backlog values are forecasts rather than actual margin. ` +
      `Return JSON with explanation (one or two concise sentences) and limitations (array of short strings).\n` +
      JSON.stringify(computed),
    );
  } catch (error) {
    console.warn("Margin AI unavailable; returning computed explanation", error);
  }
  const validText = (value: unknown): value is string =>
    typeof value === "string" && value.length > 0 && !/[0-9€$£%]/.test(value);
  const aiExplanation = narrative && validText(narrative.explanation) ? narrative.explanation : null;
  const aiLimitations = narrative && Array.isArray(narrative.limitations) &&
    narrative.limitations.every(validText) ? narrative.limitations as string[] : null;
  const grounded = aiExplanation !== null && aiLimitations !== null;
  const change = dashboard.current.marginCents - dashboard.prior.marginCents;
  const revenueChange = dashboard.current.recognizedRevenueCents - dashboard.prior.recognizedRevenueCents;
  const costChange = dashboard.current.actualCostCents - dashboard.prior.actualCostCents;
  const topCostDriver = dashboard.drivers.find((driver) => driver.kind === "cost" && driver.deltaCents !== 0);
  const computedExplanation = input.analysis === "backlog"
    ? "Approved open work orders contribute forecast cost to the service backlog. They do not change actual service margin until costs are posted."
    : input.analysis === "revenue_drivers"
      ? `Recognized revenue ${revenueChange === 0 ? "was unchanged" : revenueChange > 0 ? "increased" : "decreased"} versus the prior quarter. The figures come from posted revenue events.`
      : input.analysis === "cost_drivers"
        ? `Actual direct cost ${costChange === 0 ? "was unchanged" : costChange > 0 ? "increased" : "decreased"} versus the prior quarter. ${topCostDriver ? `The largest posted cost category movement is ${topCostDriver.category}.` : "No cost category movement was recorded."}`
        : `Service margin ${change === 0 ? "was unchanged" : change > 0 ? "increased" : "decreased"} versus the prior quarter. Recognized revenue ${revenueChange === 0 ? "was unchanged" : revenueChange > 0 ? "rose" : "fell"}, while actual direct cost ${costChange === 0 ? "was unchanged" : costChange > 0 ? "rose" : "fell"}.`;
  return {
    analysis: input.analysis,
    generatedBy: grounded ? "ai_grounded" : "computed",
    region: dashboard.region,
    quarter: dashboard.quarter,
    headline,
    explanation: grounded ? aiExplanation : computedExplanation,
    limitations: [
      ...(grounded ? aiLimitations : ["AI wording was unavailable or failed the evidence check; this explanation was computed from posted records."]),
      "Actual margin includes posted recognized revenue and actual cost events only.",
      "Open work order values are forecasts and may differ from final posted amounts.",
    ],
    metrics: dashboard.current,
    priorMetrics: dashboard.prior,
    evidence: evidencePage.items,
    generatedAt: new Date().toISOString(),
  };
}
