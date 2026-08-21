import { copyFileSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import yaml from "js-yaml";

export interface MoaModelRef {
  provider: string;
  model: string;
}

export interface MoaPresetInput {
  reference_models: MoaModelRef[];
  aggregator: MoaModelRef;
  reference_temperature?: number;
  aggregator_temperature?: number;
  max_tokens?: number;
}

interface ResolveHermesConfigOptions {
  homeDir?: string;
  platform?: NodeJS.Platform;
  env?: Record<string, string | undefined>;
  exists?: (path: string) => boolean;
  runHermesConfigPath?: () => string;
}

export interface SavedMoaPreset {
  verified: true;
  configPath: string;
  backupPath: string;
  name: string;
  presets: string[];
}

type HermesConfigDocument = Record<string, unknown> & {
  moa?: {
    default_preset?: string;
    presets?: Record<string, unknown>;
  };
};

function normalizeCliPath(output: string): string {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return (lines.at(-1) ?? "").replace(/^['"]|['"]$/g, "");
}

/** Resolve the same config.yaml used by the active Hermes CLI. */
export function resolveHermesConfigPath(options: ResolveHermesConfigOptions = {}): string {
  const homeDir = options.homeDir ?? homedir();
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const pathExists = options.exists ?? existsSync;
  const runHermesConfigPath =
    options.runHermesConfigPath ??
    (() =>
      execFileSync("hermes", ["config", "path"], {
        encoding: "utf8",
        timeout: 5_000,
        windowsHide: true,
      }));

  const candidates: string[] = [];
  if (env.HERMES_CONFIG_PATH) candidates.push(env.HERMES_CONFIG_PATH);

  try {
    const cliPath = normalizeCliPath(runHermesConfigPath());
    if (cliPath) candidates.push(cliPath);
  } catch {
    // Fall through to platform-specific locations when the CLI is unavailable.
  }

  if (platform === "win32" && env.LOCALAPPDATA) {
    candidates.push(join(env.LOCALAPPDATA, "hermes", "config.yaml"));
  }
  candidates.push(join(homeDir, ".hermes", "config.yaml"));

  for (const candidate of [...new Set(candidates)]) {
    if (candidate && pathExists(candidate)) return candidate;
  }

  throw new Error(`No Hermes config found. Checked: ${[...new Set(candidates)].join(", ")}`);
}

function expectedPreset(input: MoaPresetInput) {
  return {
    reference_models: input.reference_models.map((ref) => ({
      provider: String(ref.provider),
      model: String(ref.model),
    })),
    aggregator: {
      provider: String(input.aggregator.provider),
      model: String(input.aggregator.model),
    },
    reference_temperature:
      typeof input.reference_temperature === "number" ? input.reference_temperature : 0.6,
    aggregator_temperature:
      typeof input.aggregator_temperature === "number" ? input.aggregator_temperature : 0.4,
    max_tokens: typeof input.max_tokens === "number" ? input.max_tokens : 4096,
    enabled: true,
  };
}

/**
 * Save one MoA preset and prove that the exact value can be read back.
 * If the disk verification fails, restore the pre-write backup before throwing.
 */
export function saveMoaPresetVerified(
  configPath: string,
  name: string,
  input: MoaPresetInput,
  now = new Date(),
): SavedMoaPreset {
  const original = readFileSync(configPath, "utf8");
  const loaded = yaml.load(original);
  if (loaded != null && (typeof loaded !== "object" || Array.isArray(loaded))) {
    throw new Error("Hermes config root must be a YAML mapping");
  }

  const cfg = (loaded as HermesConfigDocument | null) ?? {};
  cfg.moa = cfg.moa && typeof cfg.moa === "object" && !Array.isArray(cfg.moa) ? cfg.moa : {};
  cfg.moa.presets =
    cfg.moa.presets && typeof cfg.moa.presets === "object" && !Array.isArray(cfg.moa.presets)
      ? cfg.moa.presets
      : {};

  const expected = expectedPreset(input);
  cfg.moa.presets[name] = expected;
  cfg.moa.default_preset = name;

  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const backupPath = `${configPath}.bak.${stamp}`;
  const originalMode = statSync(configPath).mode & 0o777;
  writeFileSync(backupPath, original, { flag: "wx", mode: originalMode });

  try {
    writeFileSync(configPath, yaml.dump(cfg, { lineWidth: 120, noRefs: true }));
    const verifiedConfig = yaml.load(readFileSync(configPath, "utf8")) as HermesConfigDocument;
    const actual = verifiedConfig?.moa?.presets?.[name];
    if (
      verifiedConfig?.moa?.default_preset !== name ||
      JSON.stringify(actual) !== JSON.stringify(expected)
    ) {
      throw new Error("Ministry preset failed disk read-back verification");
    }
  } catch (error) {
    copyFileSync(backupPath, configPath);
    throw error;
  }

  return {
    verified: true,
    configPath,
    backupPath,
    name,
    presets: Object.keys(cfg.moa.presets),
  };
}
