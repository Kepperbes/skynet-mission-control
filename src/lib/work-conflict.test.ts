import { describe, expect, test } from "bun:test";
import { reconcileProjectEdit, reconcileTaskEdit } from "./work-conflict";
import type { Project, Task } from "./work-domain";

const openedAt = "2026-07-29T12:00:00.000Z";
const savedAt = "2026-07-29T12:05:00.000Z";
const concurrentAt = "2026-07-29T12:03:00.000Z";

const baseTask: Task = {
  id: "task-1",
  title: "Original",
  projectId: "project-1",
  owner: "Owner A",
  status: "next",
  priority: "medium",
  dependsOn: [],
  source: "manual",
  completionEvidence: [],
  order: 0,
  createdAt: openedAt,
  updatedAt: openedAt,
};

const baseProject: Project = {
  id: "project-1",
  name: "Original project",
  status: "active",
  deadlineConfidence: "committed",
  owner: "Owner A",
  createdAt: openedAt,
  updatedAt: openedAt,
};

describe("conflict reconciliation", () => {
  test("preserves concurrent task fields the editor did not change", () => {
    const latest = { ...baseTask, owner: "Owner B", order: 4, updatedAt: concurrentAt };
    const edited = {
      ...baseTask,
      title: "User title",
      dependsOn: ["task-2"],
      updatedAt: savedAt,
    };

    const merged = reconcileTaskEdit(latest, baseTask, edited);

    expect(merged.title).toBe("User title");
    expect(merged.dependsOn).toEqual(["task-2"]);
    expect(merged.owner).toBe("Owner B");
    expect(merged.order).toBe(4);
    expect(merged.updatedAt).toBe(savedAt);
  });

  test("lets explicitly edited task fields win over concurrent changes", () => {
    const latest = { ...baseTask, owner: "Owner B", order: 4, updatedAt: concurrentAt };
    const edited = { ...baseTask, owner: "Owner C", order: 7, updatedAt: savedAt };

    const merged = reconcileTaskEdit(latest, baseTask, edited);
    expect(merged.owner).toBe("Owner C");
    expect(merged.order).toBe(7);
  });

  test("preserves concurrent project fields the editor did not change", () => {
    const latest = { ...baseProject, owner: "Owner B", updatedAt: concurrentAt };
    const edited = { ...baseProject, name: "User project", updatedAt: savedAt };

    const merged = reconcileProjectEdit(latest, baseProject, edited);

    expect(merged.name).toBe("User project");
    expect(merged.owner).toBe("Owner B");
    expect(merged.updatedAt).toBe(savedAt);
  });

  test("applies project completion and reopening timestamps", () => {
    const completed = reconcileProjectEdit(baseProject, baseProject, {
      ...baseProject,
      status: "completed",
      completedAt: savedAt,
      updatedAt: savedAt,
    });
    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBe(savedAt);

    const reopened = reconcileProjectEdit(completed, completed, {
      ...completed,
      status: "active",
      completedAt: undefined,
      updatedAt: "2026-07-29T12:10:00.000Z",
    });
    expect(reopened.status).toBe("active");
    expect(reopened.completedAt).toBeUndefined();
  });
});
