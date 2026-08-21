import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Dream Hermes invocation", () => {
  test("uses the bundled Dream contract without requiring a globally installed skill", () => {
    const source = readFileSync(join(import.meta.dir, "run-dream.ts"), "utf-8");

    expect(source).toContain("function buildHermesArgs");
    expect(source).not.toContain('"--skills", "dream"');
    expect(source).toContain('skills", "dream", "SKILL.md');
    expect(source).toContain("non-interactive scheduled run");
    expect(source).toContain("timeout: 600_000");
  });
});
