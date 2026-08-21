import { describe, expect, test } from "bun:test";
import { workStateSchema, type Project, type Task, type WorkState } from "./work-domain";

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
function task(overrides: Partial<Task> = {}): Task {
  return {
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
    ...overrides,
  };
}
function state(tasks: Task[], projects: Project[] = [project]): WorkState {
  return { schemaVersion: 1, revision: 0, projects, tasks, updatedAt: now };
}

describe("workStateSchema", () => {
  test("parses a valid empty canonical state", () => {
    const value = {
      schemaVersion: 1 as const,
      revision: 0,
      projects: [],
      tasks: [],
      updatedAt: now,
    };
    expect(workStateSchema.parse(value)).toEqual(value);
  });

  test("rejects duplicate IDs and orphan project references", () => {
    expect(workStateSchema.safeParse(state([task()], [])).success).toBe(false);
    expect(workStateSchema.safeParse(state([], [project, { ...project }])).success).toBe(false);
    expect(workStateSchema.safeParse(state([task(), { ...task() }])).success).toBe(false);
  });

  test("rejects self, missing, and cyclic dependencies", () => {
    expect(workStateSchema.safeParse(state([task({ dependsOn: ["t1"] })])).success).toBe(false);
    expect(workStateSchema.safeParse(state([task({ dependsOn: ["missing"] })])).success).toBe(
      false,
    );
    const cycle = [task({ id: "a", dependsOn: ["b"] }), task({ id: "b", dependsOn: ["a"] })];
    expect(workStateSchema.safeParse(state(cycle)).success).toBe(false);
  });

  test("enforces done completion evidence and completion timestamps", () => {
    expect(workStateSchema.safeParse(state([task({ status: "done" })])).success).toBe(false);
    expect(
      workStateSchema.safeParse(state([task({ status: "done", completedAt: now })])).success,
    ).toBe(false);
    expect(workStateSchema.safeParse(state([task({ completedAt: now })])).success).toBe(false);
    expect(
      workStateSchema.safeParse(
        state([
          task({
            status: "done",
            completedAt: now,
            completionEvidence: [{ kind: "verification", value: "Tests pass", recordedAt: now }],
          }),
        ]),
      ).success,
    ).toBe(true);
  });

  test("rejects invalid project calendar dates", () => {
    expect(
      workStateSchema.safeParse(state([], [{ ...project, targetDate: "2026-02-30" }])).success,
    ).toBe(false);
  });
});
