export type WorkTaskStatus = "now" | "next" | "waiting" | "done";
export type WorkTaskPriority = "critical" | "high" | "medium" | "low";
export type DeadlineState = "overdue" | "due-soon" | "scheduled" | "unscheduled" | "done";
export type TaskSort = "deadline" | "priority" | "updated" | "project";

/** Structural browser-facing task shape used by list and board view derivations. */
export interface WorkTaskView {
  id: string;
  title: string;
  projectId: string;
  owner: string;
  status: WorkTaskStatus;
  priority: WorkTaskPriority;
  deadline?: string;
  blocker?: string;
  dependsOn: string[];
  order: number;
  updatedAt: string;
}

export interface WorkTaskFilters {
  projectId?: string;
  owner?: string;
  status?: WorkTaskStatus;
  priority?: WorkTaskPriority;
  deadlineState?: Exclude<DeadlineState, "done">;
  blockedOnly?: boolean;
  sort?: TaskSort;
}

const PRIORITY_RANK: Record<WorkTaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function classifyDeadline(task: WorkTaskView, now = new Date()): DeadlineState {
  if (task.status === "done") return "done";
  if (!task.deadline) return "unscheduled";

  const deadline = Date.parse(task.deadline);
  if (!Number.isFinite(deadline)) return "unscheduled";
  const current = now.getTime();
  if (deadline < current) return "overdue";
  if (deadline <= current + 48 * 60 * 60 * 1000) return "due-soon";
  return "scheduled";
}

export function groupTasksByStatus<T extends WorkTaskView>(
  tasks: readonly T[],
): Record<WorkTaskStatus, T[]> {
  const grouped: Record<WorkTaskStatus, T[]> = { now: [], next: [], waiting: [], done: [] };
  for (const task of tasks) grouped[task.status].push(task);
  for (const column of Object.values(grouped)) {
    column.sort(
      (a, b) => a.order - b.order || a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
    );
  }
  return grouped;
}

function deadlineNumber(task: WorkTaskView): number {
  if (!task.deadline) return Number.POSITIVE_INFINITY;
  const value = Date.parse(task.deadline);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

export function filterAndSortTasks<T extends WorkTaskView>(
  tasks: readonly T[],
  filters: WorkTaskFilters = {},
  now = new Date(),
): T[] {
  const filtered = tasks.filter((task) => {
    if (filters.projectId && task.projectId !== filters.projectId) return false;
    if (filters.owner && task.owner !== filters.owner) return false;
    if (filters.status && task.status !== filters.status) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.deadlineState && classifyDeadline(task, now) !== filters.deadlineState)
      return false;
    if (filters.blockedOnly && !task.blocker?.trim()) return false;
    return true;
  });

  const sort = filters.sort ?? "deadline";
  return filtered.sort((a, b) => {
    let comparison = 0;
    if (sort === "deadline") comparison = deadlineNumber(a) - deadlineNumber(b);
    if (sort === "priority") comparison = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (sort === "updated") comparison = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    if (sort === "project") comparison = a.projectId.localeCompare(b.projectId);
    return comparison || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
}
