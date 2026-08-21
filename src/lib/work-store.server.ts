import { constants } from "node:fs";
import { chmod, mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import { SKYNET_HOME } from "./skynet-home";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { emptyWorkState, workStateSchema, type WorkState } from "./work-domain";

export const defaultWorkStatePath = join(SKYNET_HOME, "work", "state.json");

export class RevisionConflictError extends Error {
  readonly code = "revision_conflict";
  constructor(
    readonly expectedRevision: number,
    readonly actualRevision: number,
  ) {
    super(`Expected revision ${expectedRevision}, found ${actualRevision}`);
    this.name = "RevisionConflictError";
  }
}

export class CorruptWorkStateError extends Error {
  readonly code = "corrupt_state";
  constructor(
    readonly statePath: string,
    options?: ErrorOptions,
  ) {
    super(`Work state at ${statePath} is corrupt or invalid`, options);
    this.name = "CorruptWorkStateError";
  }
}

export interface WorkStoreOptions {
  statePath?: string;
  now?: () => Date;
  lockTimeoutMs?: number;
}

function hasErrorCode(error: unknown): error is Error & { code: string } {
  return error instanceof Error && "code" in error && typeof error.code === "string";
}

export class WorkStore {
  readonly statePath: string;
  private readonly now: () => Date;
  private readonly lockTimeoutMs: number;
  private saveQueue: Promise<void> = Promise.resolve();

  constructor(options: WorkStoreOptions = {}) {
    this.statePath = options.statePath ?? defaultWorkStatePath;
    this.now = options.now ?? (() => new Date());
    this.lockTimeoutMs = options.lockTimeoutMs ?? 10_000;
  }

  async read(): Promise<WorkState> {
    let handle;
    try {
      handle = await open(this.statePath, constants.O_RDONLY);
    } catch (error: unknown) {
      if (hasErrorCode(error) && error.code === "ENOENT") return emptyWorkState(this.now());
      throw error;
    }
    try {
      const raw = await handle.readFile("utf8");
      try {
        return workStateSchema.parse(JSON.parse(raw));
      } catch (error) {
        throw new CorruptWorkStateError(this.statePath, { cause: error });
      }
    } finally {
      await handle.close();
    }
  }

  save(candidate: WorkState, expectedRevision: number): Promise<WorkState> {
    const run = this.saveQueue.then(() => this.saveUnlocked(candidate, expectedRevision));
    this.saveQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async acquireLock(): Promise<() => Promise<void>> {
    const lockPath = `${this.statePath}.lock`;
    const deadline = Date.now() + this.lockTimeoutMs;
    const owner = `${process.pid}:${crypto.randomUUID()}\n`;
    while (true) {
      try {
        const handle = await open(
          lockPath,
          constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
          0o600,
        );
        try {
          await handle.writeFile(owner, "utf8");
          await handle.sync();
        } catch (error) {
          await handle.close().catch(() => undefined);
          await unlink(lockPath).catch(() => undefined);
          throw error;
        }
        await handle.close();
        let released = false;
        return async () => {
          if (released) return;
          released = true;
          let currentOwner: string;
          try {
            currentOwner = await readFile(lockPath, "utf8");
          } catch (error: unknown) {
            if (hasErrorCode(error) && error.code === "ENOENT") return;
            throw error;
          }
          if (currentOwner !== owner) {
            throw new Error(
              `Refusing to release work-state lock owned by another writer: ${lockPath}`,
            );
          }
          await unlink(lockPath);
        };
      } catch (error: unknown) {
        if (!hasErrorCode(error) || error.code !== "EEXIST") throw error;
        if (Date.now() >= deadline) {
          throw new Error(
            `Timed out waiting for work-state lock at ${lockPath}. Confirm no writer is active before removing an abandoned lock.`,
          );
        }
        await delay(10);
      }
    }
  }

  private async saveUnlocked(candidate: WorkState, expectedRevision: number): Promise<WorkState> {
    const validated = workStateSchema.parse(candidate);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
      throw new TypeError("expectedRevision must be a non-negative integer");
    }

    const parent = dirname(this.statePath);
    await mkdir(parent, { recursive: true, mode: 0o700 });
    const releaseLock = await this.acquireLock();
    try {
      const current = await this.read();
      if (current.revision !== expectedRevision) {
        throw new RevisionConflictError(expectedRevision, current.revision);
      }

      const saved = workStateSchema.parse({
        ...validated,
        revision: current.revision + 1,
        updatedAt: this.now().toISOString(),
      });

      let mode = 0o600;
      try {
        mode = (await stat(this.statePath)).mode & 0o777;
      } catch (error: unknown) {
        if (!hasErrorCode(error) || error.code !== "ENOENT") throw error;
      }

      const tempPath = join(
        parent,
        `.${this.statePath.split(/[\\/]/).at(-1)}.${process.pid}.${crypto.randomUUID()}.tmp`,
      );
      let tempCreated = false;
      try {
        const temp = await open(
          tempPath,
          constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
          mode,
        );
        tempCreated = true;
        try {
          await temp.writeFile(`${JSON.stringify(saved, null, 2)}\n`, "utf8");
          await temp.sync();
          await temp.chmod(mode);
        } finally {
          await temp.close();
        }
        await rename(tempPath, this.statePath);
        tempCreated = false;
        await chmod(this.statePath, mode);
        try {
          const directory = await open(parent, constants.O_RDONLY);
          try {
            await directory.sync();
          } finally {
            await directory.close();
          }
        } catch {
          // Directory fsync is unavailable on some platforms/filesystems.
        }
      } finally {
        if (tempCreated) await unlink(tempPath).catch(() => undefined);
      }
      return this.read();
    } finally {
      await releaseLock();
    }
  }
}
