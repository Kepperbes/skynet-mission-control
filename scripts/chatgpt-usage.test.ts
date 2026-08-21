import { describe, expect, test } from "bun:test";
import {
  normalizeChatgptUsagePayload,
  type ChatgptUsagePayload,
} from "./chatgpt-usage";

describe("ChatGPT usage normalization", () => {
  test("reports a weekly-only live window without inventing a 5h window", () => {
    const payload: ChatgptUsagePayload = {
      plan_type: "plus",
      rate_limit: {
        primary_window: {
          used_percent: 74,
          limit_window_seconds: 604800,
          reset_at: 1787326483,
        },
      },
    };

    expect(normalizeChatgptUsagePayload(payload, 1786896000000)).toEqual({
      planType: "plus",
      windows: [
        {
          label: "Weekly",
          pct: 74,
          resetsAt: 1787326483,
          windowSeconds: 604800,
        },
      ],
      capturedAt: 1786896000000,
      source: "openai-account-api",
    });
  });

  test("labels simultaneous five-hour and weekly windows by duration", () => {
    const payload: ChatgptUsagePayload = {
      plan_type: "plus",
      rate_limit: {
        primary_window: {
          used_percent: 31,
          limit_window_seconds: 18000,
          reset_at: 1786914000,
        },
        secondary_window: {
          used_percent: 74,
          limit_window_seconds: 604800,
          reset_at: 1787326483,
        },
      },
    };

    const result = normalizeChatgptUsagePayload(payload, 1786896000000);
    expect(result.windows.map(({ label, pct }) => ({ label, pct }))).toEqual([
      { label: "5h", pct: 31 },
      { label: "Weekly", pct: 74 },
    ]);
  });

  test("omits missing windows instead of representing them as zero usage", () => {
    const payload: ChatgptUsagePayload = {
      plan_type: "plus",
      rate_limit: {},
    };

    expect(normalizeChatgptUsagePayload(payload, 1786896000000).windows).toEqual([]);
  });
});
