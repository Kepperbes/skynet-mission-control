import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const script = readFileSync(join(import.meta.dir, "setup-graphify-brain.sh"), "utf8");

describe("Graphify shared-brain setup portability", () => {
  test("uses Graphify's supported Claude Code platform on macOS and Linux", () => {
    expect(script).toContain('Darwin*) CLAUDE_PLATFORM="claude"');
    expect(script).toContain('*) CLAUDE_PLATFORM="claude"');
    expect(script).not.toContain('CLAUDE_PLATFORM="mac"');
    expect(script).not.toContain('CLAUDE_PLATFORM="linux"');
  });

  test("supports the Windows virtualenv Scripts layout", () => {
    expect(script).toContain('$HOME/.graphify-venv/Scripts/pip.exe');
    expect(script).toContain('$HOME/.graphify-venv/Scripts/graphify.exe');
  });

  test("pins the reviewed Graphify release", () => {
    expect(script).toContain("graphifyy[pdf,office]==0.9.30");
  });
});