// install-design-capture.ts — arm the Design ledger's capture layer.
//
//   npx tsx scripts/install-design-capture.ts
//
// Three idempotent steps:
//   1. Copy the PostToolUse hook to ~/.skynet-mission-control/design/capture.mjs.
//   2. Register it in ~/.claude/settings.json (matcher Write|Bash) with an
//      ABSOLUTE node path — hooks run under /bin/sh, which doesn't load the
//      user's shell profile, so a bare `node` frequently isn't on PATH.
//   3. If Hermes is installed, drop the design-ledger skill into
//      ~/.hermes/skills/creative/ so Hermes reports its own output too.
//
// Re-running never duplicates the hook. Cross-platform: paths come from
// node:path, and the node binary is whatever is running this script.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SKYNET_HOME } from "../src/lib/skynet-home";

const here = dirname(fileURLToPath(import.meta.url));
const home = homedir();

// ── 1. the hook script ─────────────────────────────────────────────────────
const designDir = join(SKYNET_HOME, "design");
mkdirSync(designDir, { recursive: true });
const hookDest = join(designDir, "capture.mjs");
copyFileSync(join(here, "design-capture.mjs"), hookDest);
console.log(`✓ hook script → ${hookDest}`);

// ── 2. register in ~/.claude/settings.json ─────────────────────────────────
const settingsPath = join(home, ".claude", "settings.json");
let settings: Record<string, any> = {};
if (existsSync(settingsPath)) {
  try {
    settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch (e) {
    console.error(`✗ ${settingsPath} is not valid JSON — fix it and re-run. Nothing was changed.`);
    process.exit(1);
  }
}

// process.execPath is the node running this installer — guaranteed real.
// Quoted because "C:\Program Files\nodejs\node.exe" has a space in it.
const command = `"${process.execPath}" "${hookDest}"`;

// A Design capture hook is any PostToolUse entry whose command runs capture.mjs.
// It is "canonical" only when it already points at SKYNET_HOME/design/capture.mjs;
// anything else (the legacy ~/.claude-os/design/capture.mjs path) is replaced.
const runsCaptureMjs = (entry: any): boolean =>
  (entry?.hooks ?? []).some((h: any) => typeof h?.command === "string" && h.command.includes("capture.mjs"));
const isCanonical = (entry: any): boolean =>
  (entry?.hooks ?? []).some((h: any) => typeof h?.command === "string" && h.command.includes(hookDest));

settings.hooks ??= {};
settings.hooks.PostToolUse ??= [];
const postToolUse = settings.hooks.PostToolUse;
const captureEntries = postToolUse.filter(runsCaptureMjs);
const canonicalEntry = { matcher: "Write|Bash", hooks: [{ type: "command", command, timeout: 10 }] };

if (captureEntries.length === 0) {
  postToolUse.push(canonicalEntry);
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  console.log(`✓ PostToolUse hook registered in ${settingsPath}`);
  console.log("  (takes effect in NEW Claude Code sessions)");
} else if (captureEntries.length === 1 && captureEntries.some(isCanonical)) {
  console.log("✓ hook already registered at the canonical Skynet path — left as-is");
} else {
  // Legacy ~/.claude-os hook (or duplicates): collapse to exactly one canonical entry.
  settings.hooks.PostToolUse = [...postToolUse.filter((e) => !runsCaptureMjs(e)), canonicalEntry];
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  console.log("✓ migrated legacy Design capture hook to the canonical Skynet path");
  console.log("  (old .claude-os hook removed; exactly one Design capture hook remains)");
}

// ── 3. Hermes skill ────────────────────────────────────────────────────────
const hermesSkills = join(home, ".hermes", "skills");
if (existsSync(hermesSkills)) {
  const dest = join(hermesSkills, "creative", "design-ledger");
  mkdirSync(dest, { recursive: true });
  copyFileSync(join(here, "hermes-design-ledger.SKILL.md"), join(dest, "SKILL.md"));
  console.log(`✓ Hermes skill → ${join(dest, "SKILL.md")}`);
} else {
  console.log("· Hermes not found (~/.hermes/skills missing) — skipped its skill");
}

console.log("\nDone. Everything Claude Code writes from the next session on —");
console.log("and everything Hermes reports — lands in Design → Creations.");
