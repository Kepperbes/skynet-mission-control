import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { emptyWorkState, type WorkState } from "./work-domain";
import { CorruptWorkStateError, RevisionConflictError, WorkStore } from "./work-store.server";

const roots: string[] = [];
const makePath = () => {
  const root = mkdtempSync(join(tmpdir(), "skynet-mission-control-work-store-"));
  roots.push(root);
  return join(root, "nested", "state.json");
};
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
const at = (value: string) => () => new Date(value);

describe("WorkStore", () => {
  test("a missing file returns a valid empty state without creating it", async () => {
    const path = makePath();
    const store = new WorkStore({ statePath: path, now: at("2026-07-29T12:00:00.000Z") });
    expect(await store.read()).toEqual(emptyWorkState(new Date("2026-07-29T12:00:00.000Z")));
    expect(existsSync(path)).toBe(false);
  });

  test("save creates private parents and an atomic private file", async () => {
    const path = makePath();
    const store = new WorkStore({ statePath: path, now: at("2026-07-29T13:00:00.000Z") });
    const saved = await store.save(emptyWorkState(new Date("2026-07-29T12:00:00.000Z")), 0);
    expect(saved.revision).toBe(1);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual(saved);
    expect(readdirSync(dirname(path))).toEqual(["state.json"]);
    if (process.platform !== "win32") expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  test("validation failure never changes the disk", async () => {
    const path = makePath();
    const store = new WorkStore({ statePath: path });
    const valid = await store.save(emptyWorkState(), 0);
    const original = readFileSync(path, "utf8");
    const invalid = { ...valid, revision: -1 } as WorkState;
    await expect(store.save(invalid, valid.revision)).rejects.toThrow();
    expect(readFileSync(path, "utf8")).toBe(original);
  });

  test("a stale revision conflicts without overwriting", async () => {
    const path = makePath();
    const store = new WorkStore({ statePath: path });
    const first = await store.save(emptyWorkState(), 0);
    await expect(store.save(first, 0)).rejects.toBeInstanceOf(RevisionConflictError);
    expect((await store.read()).revision).toBe(1);
  });

  test("serializes simultaneous saves so exactly one matching revision wins", async () => {
    const path = makePath();
    const store = new WorkStore({ statePath: path });
    const candidate = emptyWorkState();
    const results = await Promise.allSettled([store.save(candidate, 0), store.save(candidate, 0)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find(
      (result) => result.status === "rejected",
    ) as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(RevisionConflictError);
    expect((await store.read()).revision).toBe(1);
  });

  test("serializes saves across store instances so stale writes cannot win", async () => {
    const path = makePath();
    const firstStore = new WorkStore({ statePath: path });
    const secondStore = new WorkStore({ statePath: path });
    const candidate = emptyWorkState();
    const results = await Promise.allSettled([
      firstStore.save(candidate, 0),
      secondStore.save(candidate, 0),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find(
      (result) => result.status === "rejected",
    ) as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(RevisionConflictError);
    expect((await firstStore.read()).revision).toBe(1);
  });

  test("never evicts an old lock based on age alone", async () => {
    const path = makePath();
    const lockPath = `${path}.lock`;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(lockPath, "suspended-writer\n", { mode: 0o600 });
    const old = new Date(Date.now() - 60_000);
    utimesSync(lockPath, old, old);
    const store = new WorkStore({ statePath: path, lockTimeoutMs: 25 });

    await expect(store.save(emptyWorkState(), 0)).rejects.toThrow(
      "Confirm no writer is active before removing an abandoned lock",
    );
    expect(readFileSync(lockPath, "utf8")).toBe("suspended-writer\n");
    expect(existsSync(path)).toBe(false);
  });

  test("each successful save increments exactly once and preserves existing permissions", async () => {
    const path = makePath();
    const store = new WorkStore({ statePath: path });
    const first = await store.save(emptyWorkState(), 0);
    if (process.platform !== "win32") Bun.spawnSync(["chmod", "640", path]);
    const second = await store.save(first, first.revision);
    expect(second.revision).toBe(2);
    if (process.platform !== "win32") expect(statSync(path).mode & 0o777).toBe(0o640);
  });

  test("corrupt JSON is recoverable and is never silently replaced", async () => {
    const path = makePath();
    const parent = dirname(path);
    const store = new WorkStore({ statePath: path });
    Bun.spawnSync(["mkdir", "-p", parent]);
    writeFileSync(path, "{broken", { mode: 0o600 });
    await expect(store.read()).rejects.toBeInstanceOf(CorruptWorkStateError);
    await expect(store.save(emptyWorkState(), 0)).rejects.toBeInstanceOf(CorruptWorkStateError);
    expect(readFileSync(path, "utf8")).toBe("{broken");
  });
});
