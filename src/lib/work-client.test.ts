import { describe, expect, test } from "bun:test";
import type { Project, Task, WorkState } from "./work-domain";
import {
  WorkConflictError,
  WorkUnavailableError,
  WorkValidationError,
  completeTask,
  createTask,
  loadWorkState,
  moveTask,
  reopenTask,
  reorderTask,
  saveWorkState,
  updateProject,
  updateTask,
} from "./work-client";

const now = "2026-07-29T12:00:00.000Z";
const project: Project = {
  id: "p1",
  name: "Project",
  status: "active",
  deadlineConfidence: "committed",
  owner: "owner",
  createdAt: now,
  updatedAt: now,
};
const task: Task = {
  id: "t1",
  title: "Task",
  projectId: "p1",
  owner: "owner",
  status: "next",
  priority: "medium",
  dependsOn: [],
  source: "manual",
  completionEvidence: [],
  order: 0,
  createdAt: now,
  updatedAt: now,
};
const state: WorkState = {
  schemaVersion: 1,
  revision: 2,
  projects: [project],
  tasks: [],
  updatedAt: now,
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });

describe("work API client", () => {
  test("loads and validates canonical state", async () => {
    expect(await loadWorkState(async () => json(state))).toEqual(state);
  });

  test("distinguishes unavailable and validation failures", async () => {
    await expect(
      loadWorkState(async () => {
        throw new Error("offline");
      }),
    ).rejects.toBeInstanceOf(WorkUnavailableError);
    await expect(
      loadWorkState(async () => json({ error: "validation" }, 422)),
    ).rejects.toBeInstanceOf(WorkValidationError);
    await expect(loadWorkState(async () => json({ nope: true }))).rejects.toBeInstanceOf(
      WorkValidationError,
    );
  });

  test("acquires the per-run token and saves the current revision", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url === "/__token") return json({ token: "secret" });
      return json({ ...state, revision: 3 });
    };
    const saved = await saveWorkState(state, fetcher);
    expect(saved.revision).toBe(3);
    expect(calls[1].init?.headers).toMatchObject({ "x-skynet-mission-control-token": "secret" });
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({ expectedRevision: 2, state });
  });

  test("surfaces revision conflicts distinctly", async () => {
    const fetcher = async (input: RequestInfo | URL) =>
      String(input) === "/__token" ? json({ token: "secret" }) : json({ error: "conflict" }, 409);
    await expect(saveWorkState(state, fetcher)).rejects.toBeInstanceOf(WorkConflictError);
  });
});

describe("pure work mutations", () => {
  test("creates and updates a task", () => {
    const created = createTask(state, task);
    expect(created.tasks).toHaveLength(1);
    expect(updateTask(created, "t1", { title: "Updated" }, now).tasks[0].title).toBe("Updated");
  });

  test("moves and reorders a task", () => {
    const created = createTask(state, task);
    expect(moveTask(created, "t1", "now", now).tasks[0].status).toBe("now");
    expect(reorderTask(created, "t1", 42, now).tasks[0].order).toBe(42);
  });

  test("completes only with evidence and can reopen", () => {
    const created = createTask(state, task);
    expect(() => completeTask(created, "t1", [], now)).toThrow();
    const completed = completeTask(
      created,
      "t1",
      [{ kind: "verification", value: "passed", recordedAt: now }],
      now,
    );
    expect(completed.tasks[0].status).toBe("done");
    expect(completed.tasks[0].completedAt).toBe(now);
    const reopened = reopenTask(completed, "t1", "next", now);
    expect(reopened.tasks[0].status).toBe("next");
    expect(reopened.tasks[0].completedAt).toBeUndefined();
  });

  test("updates project metadata", () => {
    expect(
      updateProject(state, "p1", { targetDate: "2026-08-04" }, now).projects[0].targetDate,
    ).toBe("2026-08-04");
  });
});
