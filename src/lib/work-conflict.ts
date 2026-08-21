import type { Project, Task } from "./work-domain";

const TASK_EDITABLE_FIELDS = [
  "title",
  "description",
  "projectId",
  "owner",
  "status",
  "priority",
  "deadline",
  "blocker",
  "dependsOn",
  "source",
  "sourceRef",
  "completionEvidence",
  "completedAt",
  "order",
] as const satisfies readonly (keyof Task)[];

const PROJECT_EDITABLE_FIELDS = [
  "name",
  "description",
  "status",
  "targetDate",
  "deadlineConfidence",
  "owner",
  "completedAt",
] as const satisfies readonly (keyof Project)[];

function equalValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  return JSON.stringify(left) === JSON.stringify(right);
}

export function reconcileTaskEdit(latest: Task, base: Task, edited: Task): Task {
  const merged: Task = { ...latest };
  for (const field of TASK_EDITABLE_FIELDS) {
    if (!equalValue(base[field], edited[field])) {
      Object.assign(merged, { [field]: edited[field] });
    }
  }
  return {
    ...merged,
    id: latest.id,
    createdAt: latest.createdAt,
    updatedAt: edited.updatedAt,
  };
}

export function reconcileProjectEdit(latest: Project, base: Project, edited: Project): Project {
  const merged: Project = { ...latest };
  for (const field of PROJECT_EDITABLE_FIELDS) {
    if (!equalValue(base[field], edited[field])) {
      Object.assign(merged, { [field]: edited[field] });
    }
  }
  return {
    ...merged,
    id: latest.id,
    createdAt: latest.createdAt,
    updatedAt: edited.updatedAt,
  };
}
