import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
let failures = 0;

function check(label: string, ok: boolean) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures += 1;
}

const pkg = JSON.parse(read("package.json"));
const current = read("CURRENT_VERSION").trim();

// Build donor terms from fragments so this guard does not create its own
// false positives. The replacement repository has no legal-file exception.
const donorName = ["J", "a", "c", "k", " ", "R", "o", "b", "e", "r", "t", "s"].join("");
const donorHandle = ["I", "t", "s", "s", "s", "s", "s", "J", "a", "c", "k"].join("");
const donorPattern = `${donorName}|${donorHandle}|\\b${donorName.slice(0, 4)}\\b`;
function sourceFiles(dir: string, prefix = ""): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist") return [];
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = resolve(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(absolute, relative) : [relative];
  });
}
const filesystemFiles = sourceFiles(root);
const gitFiles = Bun.spawnSync(["git", "ls-files"], {
  cwd: root,
  stdout: "pipe",
  stderr: "ignore",
}).stdout.toString().split("\\n").filter(Boolean);
const trackedFiles = gitFiles.length ? gitFiles : filesystemFiles;
const donorScan = gitFiles.length
  ? Bun.spawnSync(["git", "grep", "-n", "-I", "-i", "-E", donorPattern, "--", "."], {
      cwd: root,
      stdout: "pipe",
      stderr: "ignore",
    }).stdout.toString().split("\\n").filter(Boolean)
  : filesystemFiles.flatMap((file) => {
      try {
        const content = readFileSync(resolve(root, file));
        if (content.includes(0)) return [];
        return new RegExp(donorPattern, "i").test(content.toString("utf8")) ? [file] : [];
      } catch {
        return [];
      }
    });
check(
  "donor identity is absent from every tracked file",
  donorScan.length === 0,
);
const legacyWord = ["c", "l", "a", "u", "d", "e", "-", "o", "s"].join("");
const donorFilenamePattern = new RegExp(
  `(?:${["j", "a", "c", "k"].join("")}|${donorHandle}|upgrade-from-[^/]*${["j", "a", "c", "k"].join("")}|${legacyWord}[-_ ]?os)`,
  "i",
);
check(
  "tracked filenames contain no donor-specific upgrade or product names",
  trackedFiles.every((file) => !donorFilenamePattern.test(file)),
);

const currentDocs = [
  "README.md",
  "INSTALL-VERSION.md",
  "VERSIONING.md",
  "CHANGELOG.md",
  "CLAUDE.md",
  "INTEGRATION.md",
  "GRAPHIFY.md",
  "docs",
];
const legacyProduct = ["c", "l", "a", "u", "d", "e", "-", "o", "s"].join("");
const legacyState = `~?[/\\\\]?\\.${legacyProduct}`;
const legacyScheduledTask = ["C", "l", "a", "u", "d", "e", "O", "S", " ", "D", "r", "e", "a", "m"].join("");
const obsoleteStateDocs = Bun.spawnSync(
  ["git", "grep", "-n", "-I", "-i", "-E", `${legacyState}|bun create ${legacyProduct}|${legacyScheduledTask}|cd ${legacyProduct}`, "--", ...currentDocs],
  { cwd: root, stdout: "pipe", stderr: "ignore" },
).stdout.toString().trim();
check(
  "current documentation uses the canonical Skynet state namespace",
  obsoleteStateDocs.length === 0,
);
const home = read("src/components/home-command.tsx");
const vite = read("vite.config.ts");
const dream = read("scripts/run-dream.ts");
const ignore = read(".gitignore");
const brand = read("src/lib/brand.ts");
const protocol = read("ALFRED-UPSTREAM-FEATURE-PORT-PROTOCOL.md");
const hermesConfig = read("src/lib/hermes-config.ts");
const graphPaths = read("src/lib/graph-paths.ts");
const graphifySetup = read("scripts/setup-graphify-brain.sh");
const graphIndex = read("src/data/graphs/index.json");
const reisiftGraph = read("src/data/graphs/reisift-crm.json");

check("package version matches CURRENT_VERSION", pkg.version === current);
check("personal release is v3.1.0", current === "3.1.0");
check(
  "Skynet Mission Control identity is canonical",
  brand.includes('APP_NAME = "Skynet Mission Control"'),
);
check(
  "runtime attribution is Skynet (no legacy author byline)",
  !brand.includes(donorName) && brand.includes("Balcom Fantroy"),
);
check("package name is the Skynet product (not the legacy upstream name)", pkg.name === "skynet-mission-control");
check(
  "package author is Balcom Fantroy (no legacy author byline)",
  !pkg.author.includes(donorName) && pkg.author.includes("Balcom Fantroy"),
);
check(
  "package repository is Kepperbes/skynet-mission-control",
  pkg.repository?.url?.includes("Kepperbes/skynet-mission-control"),
);
check(
  "package homepage is the Skynet repo (not the legacy upstream URL)",
  !pkg.homepage.includes(donorHandle) && pkg.homepage.includes("Kepperbes/skynet-mission-control"),
);
check(
  "standalone upstream integration protocol is tracked",
  protocol.includes("Skynet Mission Control is the authoritative product"),
);
check(
  "donor-specific upgrade documentation is not tracked",
  !Bun.spawnSync(["git", "ls-files", "docs/"], { cwd: root, stdout: "pipe", stderr: "ignore" })
    .stdout.toString()
    .includes("UPGRADE-FROM-") &&
    !Bun.spawnSync(["git", "ls-files", "docs/"], { cwd: root, stdout: "pipe", stderr: "ignore" })
      .stdout.toString()
      .includes("UPGRADE-v"),
);
check(
  "Ministry resolves the active Hermes config",
  hermesConfig.includes('execFileSync("hermes", ["config", "path"]'),
);
check(
  "Ministry verifies saved config read-back",
  hermesConfig.includes('yaml.load(readFileSync(configPath, "utf8"))'),
);
check(
  "Ministry backup preserves config permissions",
  hermesConfig.includes('{ flag: "wx", mode: originalMode }'),
);
check("Graphify paths accept Windows separators", graphPaths.includes('lastIndexOf("\\\\")'));
check(
  "Graphify bundled registry resolves from repository root",
  graphPaths.includes('return registryPath.replace(suffix, "") || ".";'),
);
check(
  "Graphify setup uses supported Claude platform",
  graphifySetup.includes('CLAUDE_PLATFORM="claude"') &&
    !graphifySetup.includes('CLAUDE_PLATFORM="mac"') &&
    !graphifySetup.includes('CLAUDE_PLATFORM="linux"'),
);
check(
  "Graphify setup supports Windows virtualenv layout",
  graphifySetup.includes("$HOME/.graphify-venv/Scripts/pip.exe") &&
    graphifySetup.includes("$HOME/.graphify-venv/Scripts/graphify.exe"),
);
check(
  "Graphify setup pins reviewed version",
  graphifySetup.includes("graphifyy[pdf,office]==0.9.30"),
);
check("REISift CRM graph is registered", graphIndex.includes('"id": "reisift-crm"'));
check("REISift CRM graph artifact is valid", reisiftGraph.includes('"nodes"'));
check(
  "REISift CRM graph is tracked in Git",
  gitFiles.includes("src/data/graphs/reisift-crm.json") || filesystemFiles.includes("src/data/graphs/reisift-crm.json"),
);

const fallback = home.match(/const CLAUDE_FALLBACK:[\s\S]*?= \[([\s\S]*?)\];/)?.[1] ?? "";
check(
  "Claude fallback defaults to Opus 4.8",
  fallback.indexOf('name: "claude-opus-4-8"') >= 0 &&
    fallback.indexOf('name: "claude-opus-4-8"') < fallback.indexOf('name: "claude-opus-5"'),
);

const catalog = vite.match(/provider: "claude-code",\s*models: \[([\s\S]*?)\],/)?.[1] ?? "";
check(
  "server Claude catalog defaults to Opus 4.8",
  catalog.indexOf('name: "claude-opus-4-8"') >= 0 &&
    catalog.indexOf('name: "claude-opus-4-8"') < catalog.indexOf('name: "claude-opus-5"'),
);

check(
  "automatic failover uses Opus 4.8",
  vite.includes('const FAILOVER_CHAIN = ["claude-opus-4-8", codexLastResort()]'),
);
check(
  "automatic failover never invokes Opus 5",
  !vite.includes('FAILOVER_CHAIN = ["claude-opus-5"'),
);
check(
  "Codex fallback uses the verified Sol OAuth slug",
  vite.includes('return "gpt-5.6-sol";') && !vite.includes('return "gpt-5.6";'),
);

check("Dream uses the bundled contract", dream.includes("function buildHermesArgs"));
check("Dream does not require a globally installed skill", !dream.includes('"--skills", "dream"'));
check("Dream allows the verified 600-second window", dream.includes("timeout: 600_000"));

for (const required of [
  "backups/",
  ".claude/launch.json",
  "src/data/live-data.json",
  "node_modules",
  "dist",
  ".env.*",
]) {
  check(`private/generated ignore retained: ${required}`, ignore.includes(required));
}

// Skynet-owned state must resolve through the canonical SKYNET_HOME resolver
// (src/lib/skynet-home.ts), never a hardcoded ~/.skynet-mission-control path.
// The only two legitimate hardcodings are the resolver's own default and the
// standalone design-capture.mjs hook (which cannot import TS and replicates
// the same SKYNET_HOME env/default contract).
const hardcodedState = new Set<string>();
const stateDirName = ".skynet-mission-control";
for (const pat of [`join(homedir(), "${stateDirName}"`, `join(HOME, "${stateDirName}"`]) {
  const out = Bun.spawnSync(["git", "grep", "-Fl", pat, "--", "scripts", "src"], {
    cwd: root,
    stdout: "pipe",
    stderr: "ignore",
  })
    .stdout.toString()
    .trim();
  if (out) out.split("\n").forEach((f) => hardcodedState.add(f));
}
const statePathAllowed = new Set(["src/lib/skynet-home.ts", "scripts/design-capture.mjs"]);
const statePathViolators = [...hardcodedState].filter((f) => !statePathAllowed.has(f));
check(
  "Skynet-owned state resolves through SKYNET_HOME (no stray hardcoded paths)",
  statePathViolators.length === 0,
);

console.log(
  failures === 0
    ? "\nall personal release guards hold\n"
    : `\n${failures} personal release guard(s) FAILED\n`,
);
process.exit(failures === 0 ? 0 : 1);
