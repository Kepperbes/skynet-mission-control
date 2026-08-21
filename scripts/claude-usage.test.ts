import { describe, expect, test } from "bun:test";
import {
  findClaudeScopedLimit,
  normalizeClaudeUtilization,
  type ClaudeUsageLimit,
} from "./claude-usage";

describe("Claude authoritative usage normalization", () => {
  test("treats utilization as an already-normalized 0-100 percentage", () => {
    expect(normalizeClaudeUtilization(1)).toBe(1);
    expect(normalizeClaudeUtilization(0)).toBe(0);
    expect(normalizeClaudeUtilization(37.6)).toBe(38);
  });

  test("clamps malformed percentages without multiplying fractional values", () => {
    expect(normalizeClaudeUtilization(0.5)).toBe(1);
    expect(normalizeClaudeUtilization(125)).toBe(100);
    expect(normalizeClaudeUtilization(-4)).toBe(0);
    expect(normalizeClaudeUtilization(undefined)).toBeUndefined();
    expect(normalizeClaudeUtilization(null)).toBeUndefined();
  });

  test("finds the authoritative weekly Fable window by model scope", () => {
    const limits: ClaudeUsageLimit[] = [
      {
        kind: "session",
        group: "session",
        percent: 1,
        resets_at: "2026-08-16T15:59:59.705781+00:00",
        scope: null,
      },
      {
        kind: "weekly_scoped",
        group: "weekly",
        percent: 0,
        resets_at: "2026-08-23T05:59:59.706052+00:00",
        scope: { model: { display_name: "Fable" } },
      },
    ];

    expect(findClaudeScopedLimit(limits, "Fable")).toEqual({
      kind: "weekly_scoped",
      group: "weekly",
      percent: 0,
      resets_at: "2026-08-23T05:59:59.706052+00:00",
      scope: { model: { display_name: "Fable" } },
    });
  });
});
