import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
if (!files.length) {
  process.stderr.write("Usage: node scripts/reliability-summary.mjs exported-log.ndjson [more.ndjson]\n");
  process.exitCode = 2;
} else {
  const events = files.flatMap(path => readFileSync(path, "utf8").split(/\r?\n/).flatMap(line => {
    try { const event = JSON.parse(line); return event && typeof event.event === "string" ? [event] : []; }
    catch { return []; }
  }));
  const count = type => events.filter(event => event.event === type).length;
  const percentile = (values, fraction) => {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    return sorted.length ? sorted[Math.ceil(fraction * sorted.length) - 1] : null;
  };
  const requests = events.filter(event => event.event === "request.complete");
  const ai = events.filter(event => event.event === "ai.request");
  const db = events.filter(event => event.event === "db.query" || event.event === "db.transaction");
  const summary = {
    window: "supplied log files",
    requests: requests.length,
    requestErrors: count("request.error"),
    requestP50Ms: percentile(requests.map(event => event.durationMs), .5),
    requestP95Ms: percentile(requests.map(event => event.durationMs), .95),
    aiCalls: ai.length,
    aiHttpFailures: ai.filter(event => event.status >= 400).length,
    aiFallbacks: count("ai.fallback"),
    citationRejections: events.filter(event => event.event === "ai.fallback" && event.reason === "citation_rejected").length,
    aiP95Ms: percentile(ai.map(event => event.durationMs), .95),
    dbP95Ms: percentile(db.map(event => event.durationMs), .95),
    workspaceResets: count("sandbox.reset"),
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}
