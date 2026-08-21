import { describe, expect, test } from "bun:test";
import {
  classifyDeadline,
  filterAndSortTasks,
  groupTasksByStatus,
  type WorkTaskView,
} from "./work-view";

const NOW = new Date("2026-07-29T12:00:00.000Z");

function task(overrides: Partial<WorkTaskView> = {}): WorkTaskView {
  return {
    id: "task-1",
    title: "Default task",
    projectId: "project-1",
    owner: "Operator",
    status: "next",
    priority: "medium",
    dependsOn: [],
    order: 0,
    updatedAt: "2026-07-29T10:00:00.000Z",
    ...overrides,
  };
}

describe("work view derivations", () => {
  test("classifies overdue, due-soon, scheduled, unscheduled, and done deadlines", () => {
    expect(classifyDeadline(task({ deadline: "2026-07-29T11:00:00.000Z" }), NOW)).toBe("overdue");
    expect(classifyDeadline(task({ deadline: "2026-07-31T11:59:59.000Z" }), NOW)).toBe("due-soon");
    expect(classifyDeadline(task({ deadline: "2026-08-03T12:00:00.000Z" }), NOW)).toBe("scheduled");
    expect(classifyDeadline(task(), NOW)).toBe("unscheduled");
    expect(
      classifyDeadline(task({ status: "done", deadline: "2026-07-20T12:00:00.000Z" }), NOW),
    ).toBe("done");
  });

  test("groups each task into exactly one board column and respects order", () => {
    const grouped = groupTasksByStatus([
      task({ id: "n2", status: "now", order: 2 }),
      task({ id: "d1", status: "done", order: 1 }),
      task({ id: "n1", status: "now", order: 1 }),
      task({ id: "w1", status: "waiting", order: 0 }),
    ]);

    expect(grouped.now.map((item) => item.id)).toEqual(["n1", "n2"]);
    expect(grouped.next).toEqual([]);
    expect(grouped.waiting.map((item) => item.id)).toEqual(["w1"]);
    expect(grouped.done.map((item) => item.id)).toEqual(["d1"]);
  });

  test("filters by project, status, priority, deadline state, and blocker", () => {
    const tasks = [
      task({
        id: "match",
        status: "waiting",
        priority: "high",
        deadline: "2026-07-29T10:00:00.000Z",
        blocker: "Awaiting approval",
      }),
      task({
        id: "wrong-project",
        projectId: "project-2",
        status: "waiting",
        priority: "high",
        deadline: "2026-07-29T10:00:00.000Z",
        blocker: "Blocked",
      }),
      task({
        id: "not-blocked",
        status: "waiting",
        priority: "high",
        deadline: "2026-07-29T10:00:00.000Z",
      }),
    ];

    const result = filterAndSortTasks(
      tasks,
      {
        projectId: "project-1",
        status: "waiting",
        priority: "high",
        deadlineState: "overdue",
        blockedOnly: true,
        sort: "deadline",
      },
      NOW,
    );

    expect(result.map((item) => item.id)).toEqual(["match"]);
  });

  test("sorts by deadline with unscheduled tasks last and stable tie-breaking", () => {
    const result = filterAndSortTasks(
      [
        task({ id: "none", title: "No date", deadline: undefined }),
        task({ id: "later", title: "Later", deadline: "2026-08-01T12:00:00.000Z" }),
        task({ id: "alpha", title: "Alpha", deadline: "2026-07-30T12:00:00.000Z" }),
        task({ id: "beta", title: "Beta", deadline: "2026-07-30T12:00:00.000Z" }),
      ],
      { sort: "deadline" },
      NOW,
    );

    expect(result.map((item) => item.id)).toEqual(["alpha", "beta", "later", "none"]);
  });

  test("sorts priority in critical-to-low order", () => {
    const result = filterAndSortTasks(
      [
        task({ id: "low", priority: "low" }),
        task({ id: "critical", priority: "critical" }),
        task({ id: "medium", priority: "medium" }),
        task({ id: "high", priority: "high" }),
      ],
      { sort: "priority" },
      NOW,
    );

    expect(result.map((item) => item.id)).toEqual(["critical", "high", "medium", "low"]);
  });
});
