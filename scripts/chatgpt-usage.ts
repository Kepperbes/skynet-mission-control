import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { localAppData } from "./platform";

const USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";

export interface ChatgptUsageWindowPayload {
  used_percent?: number;
  limit_window_seconds?: number;
  reset_at?: number;
}

export interface ChatgptUsagePayload {
  plan_type?: string;
  rate_limit?: {
    primary_window?: ChatgptUsageWindowPayload;
    secondary_window?: ChatgptUsageWindowPayload;
  };
}

export interface ChatgptUsageWindow {
  label: string;
  pct: number;
  resetsAt: number;
  windowSeconds: number;
}

export interface LiveChatgptUsage {
  planType?: string;
  windows: ChatgptUsageWindow[];
  capturedAt: number;
  source: "openai-account-api" | "codex-session-log";
}

interface ChatgptCredential {
  accessToken: string;
  accountId?: string;
}

interface FetchResponseLike {
  ok: boolean;
  json(): Promise<unknown>;
}

type FetchLike = (
  input: string,
  init: { headers: Record<string, string>; signal?: AbortSignal },
) => Promise<FetchResponseLike>;

export function labelChatgptWindow(seconds: number): string {
  if (seconds === 18_000) return "5h";
  if (seconds === 604_800) return "Weekly";
  if (seconds > 0 && seconds % 86_400 === 0) return `${seconds / 86_400}d`;
  if (seconds > 0 && seconds % 3_600 === 0) return `${seconds / 3_600}h`;
  return "Usage";
}

export function normalizeChatgptUsagePayload(
  payload: ChatgptUsagePayload,
  capturedAt = Date.now(),
): LiveChatgptUsage {
  const rateLimit = payload?.rate_limit ?? {};
  const windows = [rateLimit.primary_window, rateLimit.secondary_window]
    .filter((window): window is ChatgptUsageWindowPayload => Boolean(window))
    .flatMap((window) => {
      const pct = Number(window.used_percent);
      const windowSeconds = Number(window.limit_window_seconds);
      const resetsAt = Number(window.reset_at);
      if (![pct, windowSeconds, resetsAt].every(Number.isFinite)) return [];
      return [
        {
          label: labelChatgptWindow(windowSeconds),
          pct: Math.max(0, Math.min(100, pct)),
          resetsAt,
          windowSeconds,
        },
      ];
    });

  return {
    planType: payload.plan_type,
    windows,
    capturedAt,
    source: "openai-account-api",
  };
}

function readJson(path: string): any | null {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function accountIdFromToken(token: string): string | undefined {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return undefined;
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    const auth = claims?.["https://api.openai.com/auth"];
    return auth?.chatgpt_account_id ?? auth?.account_id ?? claims?.account_id;
  } catch {
    return undefined;
  }
}

function credentialPaths(home: string): string[] {
  const paths = [
    ...(process.env.HERMES_HOME ? [join(process.env.HERMES_HOME, "auth.json")] : []),
    join(localAppData(), "hermes", "auth.json"),
    join(home, ".hermes", "auth.json"),
    join(home, ".codex", "auth.json"),
  ];
  return [...new Set(paths)];
}

export function readChatgptCredentials(home = homedir()): ChatgptCredential[] {
  const credentials: ChatgptCredential[] = [];
  const seen = new Set<string>();

  for (const path of credentialPaths(home)) {
    if (!existsSync(path)) continue;
    const data = readJson(path);
    if (!data) continue;

    const hermesCredentials = data?.credential_pool?.["openai-codex"];
    if (Array.isArray(hermesCredentials)) {
      const ordered = [...hermesCredentials].sort(
        (a, b) => Number(a?.priority ?? 100) - Number(b?.priority ?? 100),
      );
      for (const item of ordered) {
        const accessToken = item?.access_token;
        if (typeof accessToken !== "string" || !accessToken || seen.has(accessToken)) continue;
        seen.add(accessToken);
        credentials.push({
          accessToken,
          accountId: item?.account_id ?? accountIdFromToken(accessToken),
        });
      }
    }

    const codexToken = data?.tokens?.access_token;
    if (typeof codexToken === "string" && codexToken && !seen.has(codexToken)) {
      seen.add(codexToken);
      credentials.push({
        accessToken: codexToken,
        accountId: data?.tokens?.account_id ?? accountIdFromToken(codexToken),
      });
    }
  }

  return credentials;
}

export async function fetchLiveChatgptUsage(options?: {
  credentials?: ChatgptCredential[];
  fetchImpl?: FetchLike;
  capturedAt?: number;
}): Promise<LiveChatgptUsage | null> {
  const credentials = options?.credentials ?? readChatgptCredentials();
  const fetchImpl = options?.fetchImpl ?? (fetch as unknown as FetchLike);

  for (const credential of credentials) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${credential.accessToken}`,
      Accept: "application/json",
      "OpenAI-Beta": "codex-1",
      originator: "Codex Desktop",
      "OAI-Product-Sku": "CODEX",
    };
    if (credential.accountId) headers["ChatGPT-Account-Id"] = credential.accountId;

    try {
      const response = await fetchImpl(USAGE_URL, {
        headers,
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) continue;
      const usage = normalizeChatgptUsagePayload(
        (await response.json()) as ChatgptUsagePayload,
        options?.capturedAt ?? Date.now(),
      );
      if (usage.windows.length > 0) return usage;
    } catch {
      // Try the next authenticated credential, then let the caller use its
      // local-session fallback. Tokens and response bodies are never logged.
    }
  }

  return null;
}
