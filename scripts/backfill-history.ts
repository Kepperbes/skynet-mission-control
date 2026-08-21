/**
 * backfill-history.ts — reconstruct past daily snapshots for the Trends chart.
 *
 * WHY: the 08-12 purge wiped ~/.skynet-mission-control (including history.jsonl), so the
 * dashboard shows "TRACKING STARTED TODAY" with one row. The session
 * transcripts under ~/.claude/projects still exist, so we can rebuild the
 * per-day aggregates the history rows would have contained.
 *
 * Rebuilds the last BACKFILL_DAYS (excluding today) from the transcripts:
 * messages, value (cost), skill runs, Claude window percentages, project
 * count, assistant total. Merges into ~/.skynet-mission-control/history.jsonl without
 * overwriting real rows. Run once: `bun run scripts/backfill-history.ts`,
 * then `bun run scripts/aggregate.ts` so live-data.json embeds the history.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { SKYNET_HOME } from "../src/lib/skynet-home";
import { join } from "node:path";

const CLAUDE_DIR = join(homedir(), ".claude");
const PROJECTS_DIR = join(CLAUDE_DIR, "projects");
const HISTORY_PATH = join(SKYNET_HOME, "history.jsonl");
const BACKFILL_DAYS = 7;
const FIVE_H = 5 * 3600 * 1000;
const SEVEN_D = 7 * 24 * 3600 * 1000;
const CAP_5H = 900; // Claude Max 20x 5h cap (matches the aggregator)
const CAP_7D = 5000; // Claude Max 20x weekly cap

const PRICING_PER_MTOK: Record<string, { input: number; output: number; cache_read: number; cache_write: number }> = {
  "claude-opus-4-7": { input: 15, output: 75, cache_read: 1.5, cache_write: 18.75 },
  "claude-opus-4-6": { input: 15, output: 75, cache_read: 1.5, cache_write: 18.75 },
  "claude-sonnet-4-6": { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5, cache_read: 0.1, cache_write: 1.25 },
  "claude-3-5-sonnet-20241022": { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 },
  "claude-3-5-sonnet-20240620": { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 },
  "claude-3-5-haiku-20241022": { input: 1, output: 5, cache_read: 0.1, cache_write: 1.25 },
  "claude-3-opus-20240229": { input: 15, output: 75, cache_read: 1.5, cache_write: 18.75 },
  "claude-3-sonnet-20240229": { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25, cache_read: 0.03, cache_write: 0.3 },
};
const PRICING_BY_FAMILY: Record<string, { input: number; output: number; cache_read: number; cache_write: number }> = {
  opus: { input: 15, output: 75, cache_read: 1.5, cache_write: 18.75 },
  sonnet: { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 },
  haiku: { input: 1, output: 5, cache_read: 0.1, cache_write: 1.25 },
};

function priceForModel(model: string) {
  if (!model) return null;
  const direct = PRICING_PER_MTOK[model];
  if (direct) return direct;
  const lower = model.toLowerCase();
  if (lower.includes("opus")) return PRICING_BY_FAMILY.opus;
  if (lower.includes("sonnet")) return PRICING_BY_FAMILY.sonnet;
  if (lower.includes("haiku")) return PRICING_BY_FAMILY.haiku;
  return null;
}

function computeCost(model: string, u: any): number {
  const p = priceForModel(model);
  if (!p) return 0;
  const M = 1_000_000;
  return (
    ((u.input_tokens || 0) * p.input) / M +
    ((u.output_tokens || 0) * p.output) / M +
    ((u.cache_read_input_tokens || 0) * p.cache_read) / M +
    ((u.cache_creation_input_tokens || 0) * p.cache_write) / M
  );
}

function walkJsonl(dir: string, out: string[] = []): string[] {
  let entries: import("node:fs").Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkJsonl(p, out);
    else if (e.isFile() && e.name.endsWith(".jsonl")) out.push(p);
  }
  return out;
}

const localDate = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

interface DayBucket {
  turns: number;
  cost: number;
  skills: number;
  projects: Set<string>;
  lastTs: number;
}

function main() {
  const files = walkJsonl(PROJECTS_DIR);
  if (!files.length) {
    console.log("no transcripts found — nothing to backfill");
    return;
  }

  const now = Date.now();
  const buckets = new Map<string, DayBucket>();
  const seenConvSkill = new Set<string>();
  const slashRe = /^\/([a-zA-Z][a-zA-Z0-9_-]{1,40})/;

  for (const file of files) {
    const projKey = file.replace(/\\/g, "/").replace(PROJECTS_DIR.replace(/\\/g, "/") + "/", "").split("/")[0];
    const content = readFileSync(file, "utf8");
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      let row: any;
      try {
        row = JSON.parse(line);
      } catch {
        continue;
      }
      const ts = row.timestamp ? new Date(row.timestamp).getTime() : 0;
      if (!ts || now - ts > 14 * 24 * 3600 * 1000) continue; // ignore very old rows
      const day = localDate(new Date(ts));
      if (!buckets.has(day)) buckets.set(day, { turns: 0, cost: 0, skills: 0, projects: new Set(), lastTs: 0 });
      const b = buckets.get(day)!;
      if (ts > b.lastTs) b.lastTs = ts;

      if (row.type === "assistant" && row.message?.usage) {
        const m = row.message.model || "unknown";
        if (m === "<synthetic>") continue;
        b.turns++;
        b.cost += computeCost(m, row.message.usage);
        b.projects.add(projKey);
      } else if (row.type === "user" && row.message?.role === "user") {
        const content = row.message.content;
        const text = Array.isArray(content)
          ? content.filter((c: any) => c?.type === "text" && typeof c.text === "string").map((c: any) => c.text).join(" ")
          : typeof content === "string"
            ? content
            : "";
        const m = text.match(slashRe);
        if (m) b.skills++;
      }
      // Skill reads: /skills/<name>/SKILL.md references (dedup per conv+skill)
      const skillMatches = line.matchAll(/\/skills\/([a-zA-Z][a-zA-Z0-9_-]{1,60})\/SKILL\.md/g);
      for (const sm of skillMatches) {
        const convKey = `${file}:${sm[1]}`;
        if (seenConvSkill.has(convKey)) continue;
        seenConvSkill.add(convKey);
        b.skills++;
      }
    }
  }

  // Build the backfilled rows for the last BACKFILL_DAYS days (excluding today).
  const today = localDate();
  const rows: any[] = [];
  const dayList = [...buckets.keys()].sort();
  const cum: Record<string, { turns: number }> = {};

  for (let i = BACKFILL_DAYS; i >= 1; i--) {
    const d = new Date(now - i * 24 * 3600 * 1000);
    const date = localDate(d);
    if (date === today || !buckets.has(date)) continue;
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 24 * 3600 * 1000 - 1;

    // Rolling aggregates as-of this day's end
    let turns7d = 0, cost7d = 0, skills7d = 0;
    let turns5h = 0, cumTurns = 0;
    const projs = new Set<string>();
    for (const [dd, bb] of buckets) {
      const ddStart = new Date(new Date(dd + "T00:00:00").getTime()).getTime();
      if (ddStart + 24 * 3600 * 1000 - 1 <= dayEnd) {
        cumTurns += bb.turns;
        for (const p of bb.projects) projs.add(p);
      }
      if (bb.lastTs >= dayStart - 6 * 24 * 3600 * 1000 && bb.lastTs <= dayEnd) turns7d += bb.turns;
      if (bb.lastTs >= dayStart - 6 * 24 * 3600 * 1000 && bb.lastTs <= dayEnd) cost7d += bb.cost;
      if (bb.lastTs >= dayStart - 6 * 24 * 3600 * 1000 && bb.lastTs <= dayEnd) skills7d += bb.skills;
      if (bb.lastTs >= dayEnd - FIVE_H && bb.lastTs <= dayEnd) turns5h += bb.turns;
    }

    rows.push({
      date,
      capturedAt: new Date(dayEnd).toISOString(),
      messages7d: turns7d,
      value7d: Math.round(cost7d * 100) / 100,
      projects: projs.size || 6,
      assistantTotal: cumTurns,
      claude5hPct: Math.min(100, Math.round((turns5h / CAP_5H) * 100)),
      claudeWeeklyPct: Math.min(100, Math.round((turns7d / CAP_7D) * 100)),
      skillRuns7d: skills7d,
      dreamPrescriptions: 0,
      backfilled: true,
    });
  }

  if (!rows.length) {
    console.log("no days to backfill (transcripts may not reach back 7 days)");
    return;
  }

  // Merge with existing rows (existing wins — never overwrite real snapshots).
  const byDate = new Map<string, any>();
  if (existsSync(HISTORY_PATH)) {
    for (const l of readFileSync(HISTORY_PATH, "utf8").split("\n")) {
      if (!l.trim()) continue;
      try {
        const r = JSON.parse(l);
        byDate.set(r.date, r);
      } catch {
        /* skip */
      }
    }
  }
  for (const r of rows) if (!byDate.has(r.date)) byDate.set(r.date, r);
  const all = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  writeFileSync(HISTORY_PATH, all.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");

  console.log(`backfilled ${rows.length} day(s): ${rows.map((r) => r.date).join(", ")}`);
  for (const r of rows) {
    console.log(`  ${r.date} msgs=${r.messages7d} value=$${r.value7d} skills=${r.skillRuns7d} weekly=${r.claudeWeeklyPct}%`);
  }
  console.log(`history now has ${all.length} day(s) → ${HISTORY_PATH}`);
  console.log("run `bun run scripts/aggregate.ts` to embed the history into live-data.json");
}

main();
