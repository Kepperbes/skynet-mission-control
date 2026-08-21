export interface ClaudeUsageLimit {
  kind?: string;
  group?: string;
  percent?: number;
  resets_at?: string | null;
  scope?: {
    model?: {
      id?: string | null;
      display_name?: string | null;
    } | null;
    surface?: unknown;
  } | null;
  [key: string]: unknown;
}

/**
 * Anthropic's OAuth usage endpoint already reports utilization on a 0-100
 * percentage scale. A value of 1 means 1% used, not a 0-1 ratio.
 */
export function normalizeClaudeUtilization(
  value: number | null | undefined,
): number | undefined {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) {
    return undefined;
  }
  return Math.max(0, Math.min(100, Math.round(Number(value))));
}

export function findClaudeScopedLimit(
  limits: ClaudeUsageLimit[] | null | undefined,
  displayName: string,
): ClaudeUsageLimit | undefined {
  const wanted = displayName.trim().toLowerCase();
  return limits?.find((limit) => {
    const name = limit?.scope?.model?.display_name;
    return typeof name === "string" && name.trim().toLowerCase() === wanted;
  });
}
