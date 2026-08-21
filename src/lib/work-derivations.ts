import type { Project, Task, WorkState } from "./work-domain";

export type ProjectHealth = "on-track" | "attention" | "blocked" | "complete";
export interface ProjectSummary {
  project: Project;
  health: ProjectHealth;
  nextAction?: Task;
  counts: { active: number; completed: number; blocked: number };
}
export interface MomentumSignal {
  key: string;
  label: string;
  value: number | boolean;
}
export interface MomentumAssessment {
  state: "clear" | "focused" | "recovery" | "momentum";
  signals: MomentumSignal[];
  reason: string;
  recommendedAction: string;
}

const priorityRank: Record<Task["priority"], number> = { critical: 0, high: 1, medium: 2, low: 3 };
const DAY = 86_400_000;

export function projectNextAction(tasks: Task[]): Task | undefined {
  return tasks
    .filter((task) => task.status === "now" || task.status === "next")
    .sort((a, b) => {
      const status = (a.status === "now" ? 0 : 1) - (b.status === "now" ? 0 : 1);
      return (
        status ||
        priorityRank[a.priority] - priorityRank[b.priority] ||
        a.order - b.order ||
        a.id.localeCompare(b.id)
      );
    })[0];
}

export function deriveProjectSummary(
  project: Project,
  allTasks: Task[],
  now = new Date(),
): ProjectSummary {
  const tasks = allTasks.filter((task) => task.projectId === project.id);
  const active = tasks.filter((task) => task.status !== "done");
  const completed = tasks.length - active.length;
  const blocked = active.filter(
    (task) => task.status === "waiting" || Boolean(task.blocker),
  ).length;
  const nextAction = projectNextAction(tasks);
  const today = now.toISOString().slice(0, 10);
  const daysToTarget = project.targetDate
    ? (Date.parse(`${project.targetDate}T23:59:59.999Z`) - now.valueOf()) / DAY
    : Number.POSITIVE_INFINITY;
  const overdueTask = active.some(
    (task) => task.deadline && Date.parse(task.deadline) < now.valueOf(),
  );

  let health: ProjectHealth = "on-track";
  if (project.status === "completed") health = "complete";
  else if (blocked > 0) health = "blocked";
  else if (
    overdueTask ||
    (project.targetDate != null && project.targetDate < today) ||
    daysToTarget <= 7 ||
    !nextAction
  )
    health = "attention";

  return { project, health, nextAction, counts: { active: active.length, completed, blocked } };
}

export function assessMomentum(work: WorkState, now = new Date()): MomentumAssessment {
  const nowMs = now.valueOf();
  const weekAgo = nowMs - 7 * DAY;
  const in48Hours = nowMs + 2 * DAY;
  const active = work.tasks.filter((task) => task.status !== "done");
  const completed7 = work.tasks.filter(
    (task) =>
      task.status === "done" && task.completedAt != null && Date.parse(task.completedAt) >= weekAgo,
  );
  const activeTouched7 = active.filter((task) => Date.parse(task.updatedAt) >= weekAgo);
  const ratioDenominator = completed7.length + activeTouched7.length;
  const completionRatio = ratioDenominator === 0 ? 0 : completed7.length / ratioDenominator;
  const overdue = active.filter(
    (task) => task.deadline != null && Date.parse(task.deadline) < nowMs,
  );
  const due48 = active.filter((task) => {
    if (!task.deadline) return false;
    const due = Date.parse(task.deadline);
    return due >= nowMs && due <= in48Hours;
  });
  const blocked = active.filter((task) => task.status === "waiting" || Boolean(task.blocker));
  const blockedRatio = active.length === 0 ? 0 : blocked.length / active.length;
  const nearProjects = work.projects.filter((project) => {
    if (project.status !== "active" || !project.targetDate) return false;
    const target = Date.parse(`${project.targetDate}T23:59:59.999Z`);
    return target >= nowMs && target <= nowMs + 7 * DAY;
  });
  const projectHasAction = (project: Project) =>
    Boolean(projectNextAction(active.filter((task) => task.projectId === project.id)));
  const nearWithoutAction = nearProjects.filter((project) => !projectHasAction(project));
  const projectsWithoutAction = work.projects.filter(
    (project) => project.status === "active" && !projectHasAction(project),
  );

  const signals: MomentumSignal[] = [
    { key: "activeTasks", label: "Active tasks", value: active.length },
    { key: "completed7", label: "Completed in seven days", value: completed7.length },
    { key: "completionRatio7", label: "Seven-day completion ratio", value: completionRatio },
    { key: "overdue", label: "Overdue active tasks", value: overdue.length },
    { key: "due48", label: "Tasks due in 48 hours", value: due48.length },
    { key: "blockedRatio", label: "Blocked or waiting ratio", value: blockedRatio },
    { key: "nearProjects", label: "Projects due in seven days", value: nearProjects.length },
    {
      key: "projectsWithoutAction",
      label: "Projects without a next action",
      value: projectsWithoutAction.length,
    },
  ];

  const strain = [
    overdue.length >= 2,
    blockedRatio >= 0.3,
    completionRatio < 0.5 && active.length >= 4,
    nearWithoutAction.length > 0,
  ];
  const isRecovery = strain.filter(Boolean).length >= 2;
  const isFocused =
    (due48.length > 0 && active.some((task) => task.status === "now")) ||
    nearProjects.some(projectHasAction);
  const isMomentum =
    completed7.length >= 3 && completionRatio >= 0.7 && overdue.length === 0 && blockedRatio < 0.2;

  if (isRecovery) {
    const action = overdue[0]
      ? `Resolve or reschedule “${overdue[0].title}”.`
      : blocked[0]
        ? `Unblock “${blocked[0].title}”.`
        : "Define one next action for the nearest commitment.";
    return {
      state: "recovery",
      signals,
      reason: `${strain.filter(Boolean).length} strain signals need attention.`,
      recommendedAction: action,
    };
  }
  if (isFocused) {
    const focus =
      active
        .filter((task) => task.status === "now")
        .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])[0] ?? due48[0];
    return {
      state: "focused",
      signals,
      reason: "A near-term commitment has active work behind it.",
      recommendedAction: focus
        ? `Continue “${focus.title}”.`
        : "Advance the nearest project action.",
    };
  }
  if (isMomentum) {
    const next = projectNextAction(active);
    return {
      state: "momentum",
      signals,
      reason: "Recent completion is strong without material overdue or blocker pressure.",
      recommendedAction: next
        ? `Keep momentum with “${next.title}”.`
        : "Choose the next meaningful action.",
    };
  }
  const next = projectNextAction(active);
  return {
    state: "clear",
    signals,
    reason: "No focus, recovery, or momentum threshold is currently met.",
    recommendedAction: next ? `Start “${next.title}”.` : "Choose one next action.",
  };
}
