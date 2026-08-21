import { describe, expect, test } from "bun:test";
import type { Project, Task, WorkState } from "./work-domain";
import { assessMomentum, deriveProjectSummary } from "./work-derivations";

const NOW = new Date("2026-07-29T12:00:00.000Z");
const iso = (days: number) => new Date(NOW.valueOf() + days * 86_400_000).toISOString();
const project = (overrides: Partial<Project> = {}): Project => ({
  id: "p1",
  name: "Project",
  status: "active",
  deadlineConfidence: "committed",
  owner: "owner",
  createdAt: iso(-20),
  updatedAt: iso(0),
  ...overrides,
});
const task = (id: string, overrides: Partial<Task> = {}): Task => ({
  id,
  title: id,
  projectId: "p1",
  owner: "owner",
  status: "next",
  priority: "medium",
  dependsOn: [],
  source: "manual",
  completionEvidence: [],
  order: 0,
  createdAt: iso(-10),
  updatedAt: iso(0),
  ...overrides,
});
const done = (id: string, daysAgo: number): Task =>
  task(id, {
    status: "done",
    completedAt: iso(-daysAgo),
    updatedAt: iso(-daysAgo),
    completionEvidence: [{ kind: "verification", value: "verified", recordedAt: iso(-daysAgo) }],
  });
const state = (tasks: Task[] = [], projects: Project[] = [project()]): WorkState => ({
  schemaVersion: 1,
  revision: 0,
  projects,
  tasks,
  updatedAt: iso(0),
});

describe("project derivations", () => {
  test("derives complete, blocked, attention, and on-track health", () => {
    expect(deriveProjectSummary(project({ status: "completed" }), [], NOW).health).toBe("complete");
    expect(
      deriveProjectSummary(project(), [task("w", { status: "waiting", blocker: "Vendor" })], NOW)
        .health,
    ).toBe("blocked");
    expect(
      deriveProjectSummary(project({ targetDate: "2026-07-28" }), [task("n")], NOW).health,
    ).toBe("attention");
    expect(
      deriveProjectSummary(project({ targetDate: "2026-09-01" }), [task("n")], NOW).health,
    ).toBe("on-track");
  });

  test("next action prefers priority within now before next", () => {
    const summary = deriveProjectSummary(
      project(),
      [
        task("next-critical", { priority: "critical" }),
        task("now-low", { status: "now", priority: "low" }),
        task("now-high", { status: "now", priority: "high" }),
      ],
      NOW,
    );
    expect(summary.nextAction?.id).toBe("now-high");
  });
});

describe("momentum assessment", () => {
  test("falls back to clear and exposes auditable signals plus one action", () => {
    const result = assessMomentum(state(), NOW);
    expect(result.state).toBe("clear");
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.reason).toBeTruthy();
    expect(result.recommendedAction).toBeTruthy();
    expect(Array.isArray(result.recommendedAction)).toBe(false);
  });

  test("focused requires a due commitment and active work", () => {
    expect(assessMomentum(state([task("due", { deadline: iso(1) })]), NOW).state).toBe("clear");
    expect(
      assessMomentum(
        state([task("due", { deadline: iso(1) }), task("active", { status: "now" })]),
        NOW,
      ).state,
    ).toBe("focused");
  });

  test("recovery requires at least two strain signals", () => {
    const overdue = [task("o1", { deadline: iso(-2) }), task("o2", { deadline: iso(-1) })];
    expect(assessMomentum(state(overdue), NOW).state).not.toBe("recovery");
    const strained = [
      ...overdue,
      task("w1", { status: "waiting" }),
      task("w2", { status: "waiting" }),
      task("n"),
    ];
    expect(assessMomentum(state(strained), NOW).state).toBe("recovery");
  });

  test("momentum requires volume, ratio, and low pressure", () => {
    expect(
      assessMomentum(state([done("d1", 1), done("d2", 2), done("d3", 3), task("n")]), NOW).state,
    ).toBe("momentum");
    expect(assessMomentum(state([done("d1", 1), done("d2", 2), task("n")]), NOW).state).not.toBe(
      "momentum",
    );
  });

  test("recovery outranks momentum", () => {
    const tasks = [
      done("d1", 1),
      done("d2", 2),
      done("d3", 3),
      done("d4", 4),
      done("d5", 5),
      done("d6", 6),
      task("o1", { deadline: iso(-2) }),
      task("o2", { deadline: iso(-1) }),
      task("w1", { status: "waiting" }),
    ];
    expect(assessMomentum(state(tasks), NOW).state).toBe("recovery");
  });
});
