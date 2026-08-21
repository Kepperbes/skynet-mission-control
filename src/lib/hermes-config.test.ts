import { afterEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import yaml from "js-yaml";
import {
  resolveHermesConfigPath,
  saveMoaPresetVerified,
  type MoaPresetInput,
} from "./hermes-config";

const tempRoots: string[] = [];
afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), "skynet-hermes-config-"));
  tempRoots.push(root);
  return root;
}

const preset: MoaPresetInput = {
  reference_models: [{ provider: "openrouter", model: "anthropic/claude-fable-5" }],
  aggregator: { provider: "openai-codex", model: "gpt-5.6-sol" },
  reference_temperature: 0.6,
  aggregator_temperature: 0.4,
  max_tokens: 8192,
};

describe("Hermes config path resolution", () => {
  test("prefers the path reported by `hermes config path`", () => {
    const root = makeRoot();
    const canonical = join(root, "AppData", "Local", "hermes", "config.yaml");
    mkdirSync(join(root, "AppData", "Local", "hermes"), { recursive: true });
    writeFileSync(canonical, "moa: {}", { flag: "w" });

    expect(
      resolveHermesConfigPath({
        homeDir: root,
        platform: "win32",
        env: { LOCALAPPDATA: join(root, "wrong") },
        exists: existsSync,
        runHermesConfigPath: () => `${canonical}\r\n`,
      }),
    ).toBe(canonical);
  });

  test("uses LOCALAPPDATA on Windows before the legacy home path", () => {
    const root = makeRoot();
    const localAppData = join(root, "AppData", "Local");
    const canonical = join(localAppData, "hermes", "config.yaml");
    const legacy = join(root, ".hermes", "config.yaml");
    mkdirSync(join(localAppData, "hermes"), { recursive: true });
    mkdirSync(join(root, ".hermes"), { recursive: true });
    writeFileSync(canonical, "moa: {}", { flag: "w" });
    writeFileSync(legacy, "moa: {}", { flag: "w" });

    expect(
      resolveHermesConfigPath({
        homeDir: root,
        platform: "win32",
        env: { LOCALAPPDATA: localAppData },
        exists: existsSync,
        runHermesConfigPath: () => {
          throw new Error("CLI unavailable");
        },
      }),
    ).toBe(canonical);
  });
});

describe("verified Ministry preset save", () => {
  test("preserves unrelated settings, creates a backup, and verifies disk read-back", () => {
    const root = makeRoot();
    const configPath = join(root, "config.yaml");
    const original = "theme: dark\nmoa:\n  presets:\n    existing:\n      enabled: true\n";
    writeFileSync(configPath, original);
    chmodSync(configPath, 0o600);
    const originalMode = statSync(configPath).mode & 0o777;

    const result = saveMoaPresetVerified(
      configPath,
      "ministry",
      preset,
      new Date("2026-07-29T12:00:00.000Z"),
    );
    const parsed = yaml.load(readFileSync(configPath, "utf8")) as {
      theme: string;
      moa: {
        default_preset: string;
        presets: Record<string, Record<string, unknown>>;
      };
    };

    expect(result.verified).toBe(true);
    expect(result.configPath).toBe(configPath);
    expect(readFileSync(result.backupPath, "utf8")).toBe(original);
    expect(statSync(result.backupPath).mode & 0o777).toBe(originalMode);
    expect(parsed.theme).toBe("dark");
    expect(parsed.moa.presets.existing.enabled).toBe(true);
    expect(parsed.moa.default_preset).toBe("ministry");
    expect(parsed.moa.presets.ministry.aggregator).toEqual(preset.aggregator);
    expect(parsed.moa.presets.ministry.enabled).toBe(true);
  });

  test("refuses malformed YAML without overwriting it", () => {
    const root = makeRoot();
    const configPath = join(root, "config.yaml");
    const original = "moa:\n  presets: [\n";
    writeFileSync(configPath, original);

    expect(() => saveMoaPresetVerified(configPath, "ministry", preset)).toThrow();
    expect(readFileSync(configPath, "utf8")).toBe(original);
  });
});
