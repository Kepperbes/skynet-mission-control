import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Canonical Skynet-owned application data directory.
 *
 * The pre-rebrand product wrote its state to the legacy state directory. Since the rebrand
 * to Skynet Mission Control, Skynet-owned state (Design config, provider keys,
 * Design systems/projects/ledger, Dream history, temp auth tokens) belongs
 * under ~/.skynet-mission-control. This module is the single resolver so the
 * dashboard, the Design middleware, and the cron scripts never disagree on
 * where state lives.
 *
 * Override with the SKYNET_HOME environment variable (tests, alt layouts).
 */
export const SKYNET_HOME = process.env.SKYNET_HOME || join(homedir(), ".skynet-mission-control");

/**
 * Legacy state directory from the pre-rebrand product. Read only as a
 * one-time migration fallback — new writes always target SKYNET_HOME.
 * External tool directories (~/.claude, ~/.hermes) are unrelated and never
 * touched.
 */
export const LEGACY_STATE_DIR = join(homedir(), ".claude-os");

/** Join path segments under the canonical Skynet state directory. */
export function skynetStatePath(...segments: string[]): string {
  return join(SKYNET_HOME, ...segments);
}
