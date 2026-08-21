import { useCallback, useEffect, useRef, useState } from "react";
import {
  workStateSchema,
  type CompletionEvidence,
  type Project,
  type Task,
  type TaskStatus,
  type WorkState,
} from "./work-domain";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
let tokenPromise: Promise<string> | null = null;

export class WorkUnavailableError extends Error {
  constructor(message = "Canonical work state is unavailable.", options?: ErrorOptions) {
    super(message, options);
    this.name = "WorkUnavailableError";
  }
}
export class WorkValidationError extends Error {
  constructor(message = "Canonical work state is invalid.", options?: ErrorOptions) {
    super(message, options);
    this.name = "WorkValidationError";
  }
}
export class WorkConflictError extends Error {
  constructor() {
    super(
      "Work changed in another session. The latest state has been reloaded; review and try again.",
    );
    this.name = "WorkConflictError";
  }
}
export const WorkStateConflictError = WorkConflictError;

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string; error?: string };
    return body.message ?? body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

async function tokenFor(fetcher: Fetcher): Promise<string> {
  const acquire = async () => {
    const response = await fetcher("/__token", { cache: "no-store" });
    if (!response.ok) throw new WorkUnavailableError(await readError(response));
    const body = (await response.json()) as { token?: string };
    if (!body.token)
      throw new WorkValidationError("Mission Control did not provide a mutation token.");
    return body.token;
  };
  if (fetcher !== globalThis.fetch) return acquire();
  tokenPromise ??= acquire().catch((error) => {
    tokenPromise = null;
    throw error;
  });
  return tokenPromise;
}

export async function loadWorkState(fetcher: Fetcher = globalThis.fetch): Promise<WorkState> {
  let response: Response;
  try {
    response = await fetcher("/__work_state", { cache: "no-store" });
  } catch (cause) {
    throw new WorkUnavailableError("Canonical work state could not be reached.", { cause });
  }
  if (response.status === 422) throw new WorkValidationError(await readError(response));
  if (!response.ok) throw new WorkUnavailableError(await readError(response));
  try {
    return workStateSchema.parse(await response.json());
  } catch (cause) {
    throw new WorkValidationError("The server returned invalid canonical work state.", { cause });
  }
}

export async function saveWorkState(
  state: WorkState,
  fetcher: Fetcher = globalThis.fetch,
): Promise<WorkState> {
  let response: Response;
  try {
    const token = await tokenFor(fetcher);
    response = await fetcher("/__work_state", {
      method: "POST",
      headers: { "content-type": "application/json", "x-skynet-mission-control-token": token },
      body: JSON.stringify({ expectedRevision: state.revision, state }),
    });
  } catch (cause) {
    if (cause instanceof WorkUnavailableError || cause instanceof WorkValidationError) throw cause;
    throw new WorkUnavailableError("Canonical work state could not be reached.", { cause });
  }
  if (response.status === 409) throw new WorkConflictError();
  if (response.status === 400 || response.status === 422)
    throw new WorkValidationError(await readError(response));
  if (!response.ok) throw new WorkUnavailableError(await readError(response));
  try {
    return workStateSchema.parse(await response.json());
  } catch (cause) {
    throw new WorkValidationError("The server returned invalid saved work state.", { cause });
  }
}
export const persistWorkState = saveWorkState;

function validated(next: WorkState): WorkState {
  return workStateSchema.parse(next);
}
export function createTask(state: WorkState, task: Task): WorkState {
  return validated({ ...state, tasks: [...state.tasks, task] });
}
export function updateTask(
  state: WorkState,
  taskId: string,
  patch: Partial<Task>,
  now = new Date().toISOString(),
): WorkState {
  if (!state.tasks.some((task) => task.id === taskId))
    throw new WorkValidationError(`Task ${taskId} does not exist.`);
  return validated({
    ...state,
    tasks: state.tasks.map((task) =>
      task.id === taskId ? { ...task, ...patch, id: task.id, updatedAt: now } : task,
    ),
  });
}
export function moveTask(
  state: WorkState,
  taskId: string,
  status: TaskStatus,
  now = new Date().toISOString(),
): WorkState {
  return updateTask(
    state,
    taskId,
    { status, completedAt: status === "done" ? now : undefined },
    now,
  );
}
export function reorderTask(
  state: WorkState,
  taskId: string,
  order: number,
  now = new Date().toISOString(),
): WorkState {
  return updateTask(state, taskId, { order }, now);
}
export function completeTask(
  state: WorkState,
  taskId: string,
  evidence: CompletionEvidence[],
  now = new Date().toISOString(),
): WorkState {
  if (evidence.length === 0) throw new WorkValidationError("Completion evidence is required.");
  const existing = state.tasks.find((task) => task.id === taskId);
  if (!existing) throw new WorkValidationError(`Task ${taskId} does not exist.`);
  return updateTask(
    state,
    taskId,
    {
      status: "done",
      completedAt: now,
      completionEvidence: [...existing.completionEvidence, ...evidence],
    },
    now,
  );
}
export function reopenTask(
  state: WorkState,
  taskId: string,
  status: Exclude<TaskStatus, "done"> = "next",
  now = new Date().toISOString(),
): WorkState {
  return updateTask(state, taskId, { status, completedAt: undefined }, now);
}
export function updateProject(
  state: WorkState,
  projectId: string,
  patch: Partial<Project>,
  now = new Date().toISOString(),
): WorkState {
  if (!state.projects.some((project) => project.id === projectId))
    throw new WorkValidationError(`Project ${projectId} does not exist.`);
  return validated({
    ...state,
    projects: state.projects.map((project) =>
      project.id === projectId ? { ...project, ...patch, id: project.id, updatedAt: now } : project,
    ),
  });
}

export function useWorkState() {
  const [state, setState] = useState<WorkState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<WorkState | null>(null);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const replaceState = useCallback((next: WorkState | null) => {
    stateRef.current = next;
    setState(next);
  }, []);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await loadWorkState();
      replaceState(next);
      return next;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Canonical work state could not be loaded.",
      );
      throw cause;
    } finally {
      setLoading(false);
    }
  }, [replaceState]);
  useEffect(() => {
    void reload().catch(() => undefined);
  }, [reload]);
  const update = useCallback(
    (transform: (current: WorkState) => WorkState): Promise<WorkState> => {
      const run = queueRef.current.then(async () => {
        const current = stateRef.current;
        if (!current) throw new WorkUnavailableError("Canonical work state has not loaded yet.");
        const candidate = workStateSchema.parse(transform(current));
        try {
          const saved = await saveWorkState(candidate);
          replaceState(saved);
          setError(null);
          return saved;
        } catch (cause) {
          if (cause instanceof WorkConflictError) await reload().catch(() => undefined);
          setError(
            cause instanceof Error ? cause.message : "Canonical work state could not be saved.",
          );
          throw cause;
        }
      });
      queueRef.current = run.catch(() => undefined);
      return run;
    },
    [reload, replaceState],
  );
  return { state, loading, error, reload, update };
}
