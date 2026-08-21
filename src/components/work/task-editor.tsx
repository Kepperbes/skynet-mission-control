import { useEffect, useState } from "react";
import type { Project, Task, TaskPriority, TaskSource, TaskStatus } from "@/lib/work-domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface TaskDraft {
  title: string;
  description: string;
  projectId: string;
  owner: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string;
  blocker: string;
  dependsOn: string[];
  source: TaskSource;
  sourceRef: string;
  evidence: string;
}

function localDateTime(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function initialDraft(
  task: Task | null,
  defaultProjectId: string,
  defaultOwner: string,
): TaskDraft {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    projectId: task?.projectId ?? defaultProjectId,
    owner: task?.owner ?? defaultOwner,
    status: task?.status ?? "next",
    priority: task?.priority ?? "medium",
    deadline: localDateTime(task?.deadline),
    blocker: task?.blocker ?? "",
    dependsOn: task?.dependsOn ?? [],
    source: task?.source ?? "manual",
    sourceRef: task?.sourceRef ?? "",
    evidence: "",
  };
}

export function TaskEditor({
  open,
  task,
  tasks,
  projects,
  requestedStatus,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  task: Task | null;
  tasks: Task[];
  projects: Project[];
  requestedStatus?: TaskStatus;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Task, baseTask: Task | null) => Promise<void> | void;
}) {
  const defaultProject = projects.find((project) => project.status === "active") ?? projects[0];
  const defaultProjectId = defaultProject?.id ?? "";
  const defaultOwner = defaultProject?.owner ?? "Operator";
  const [draft, setDraft] = useState<TaskDraft>(() =>
    initialDraft(task, defaultProjectId, defaultOwner),
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next = initialDraft(task, defaultProjectId, defaultOwner);
    if (requestedStatus) next.status = requestedStatus;
    setDraft(next);
    setError("");
  }, [open, task, defaultProjectId, defaultOwner, requestedStatus]);

  const set = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) return setError("A task title is required.");
    if (!draft.projectId) return setError("Choose a project first.");
    if (!draft.owner.trim()) return setError("An owner is required.");
    const existingEvidence = task?.completionEvidence ?? [];
    const evidence = draft.evidence.trim()
      ? [
          ...existingEvidence,
          {
            kind: "note" as const,
            value: draft.evidence.trim(),
            recordedAt: new Date().toISOString(),
          },
        ]
      : existingEvidence;
    if (draft.status === "done" && evidence.length === 0) {
      return setError("Add completion evidence before marking this task done.");
    }

    const now = new Date().toISOString();
    const nextTask: Task = {
      id: task?.id ?? crypto.randomUUID(),
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      projectId: draft.projectId,
      owner: draft.owner.trim(),
      status: draft.status,
      priority: draft.priority,
      deadline: draft.deadline ? new Date(draft.deadline).toISOString() : undefined,
      blocker: draft.blocker.trim() || undefined,
      dependsOn: draft.dependsOn,
      source: draft.source,
      sourceRef: draft.sourceRef.trim() || undefined,
      completionEvidence: evidence,
      order: task?.order ?? 0,
      createdAt: task?.createdAt ?? now,
      updatedAt: now,
      completedAt: draft.status === "done" ? (task?.completedAt ?? now) : undefined,
    };

    try {
      setSaving(true);
      setError("");
      await onSave(nextTask, task);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Task could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const availableDependencies = tasks.filter((candidate) => candidate.id !== task?.id);
  const unfinishedDependencies = availableDependencies.filter(
    (candidate) => draft.dependsOn.includes(candidate.id) && candidate.status !== "done",
  );
  const toggleDependency = (dependencyId: string, checked: boolean) =>
    set(
      "dependsOn",
      checked
        ? [...draft.dependsOn, dependencyId]
        : draft.dependsOn.filter((id) => id !== dependencyId),
    );
  const fieldClass = "space-y-1.5";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{task ? "Edit task" : "Create task"}</SheetTitle>
          <SheetDescription>Every view writes to the same canonical work record.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="mt-6 space-y-5">
          <div className={fieldClass}>
            <Label htmlFor="work-task-title">Title</Label>
            <Input
              id="work-task-title"
              autoFocus
              value={draft.title}
              onChange={(event) => set("title", event.target.value)}
              placeholder="Define the next concrete outcome"
            />
          </div>
          <div className={fieldClass}>
            <Label htmlFor="work-task-description">Description</Label>
            <Textarea
              id="work-task-description"
              value={draft.description}
              onChange={(event) => set("description", event.target.value)}
              placeholder="Context, acceptance criteria, or handoff notes"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={fieldClass}>
              <Label htmlFor="work-task-project">Project</Label>
              <select
                id="work-task-project"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={draft.projectId}
                onChange={(event) => set("projectId", event.target.value)}
              >
                <option value="">Choose project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={fieldClass}>
              <Label htmlFor="work-task-owner">Owner</Label>
              <Input
                id="work-task-owner"
                value={draft.owner}
                onChange={(event) => set("owner", event.target.value)}
              />
            </div>
            <div className={fieldClass}>
              <Label htmlFor="work-task-status">Status</Label>
              <select
                id="work-task-status"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={draft.status}
                onChange={(event) => set("status", event.target.value as TaskStatus)}
              >
                <option value="now">Now</option>
                <option value="next">Next</option>
                <option value="waiting">Waiting</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className={fieldClass}>
              <Label htmlFor="work-task-priority">Priority</Label>
              <select
                id="work-task-priority"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={draft.priority}
                onChange={(event) => set("priority", event.target.value as TaskPriority)}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className={fieldClass}>
            <Label htmlFor="work-task-deadline">Deadline</Label>
            <Input
              id="work-task-deadline"
              type="datetime-local"
              value={draft.deadline}
              onChange={(event) => set("deadline", event.target.value)}
            />
          </div>
          <div className={fieldClass}>
            <Label htmlFor="work-task-blocker">Blocker</Label>
            <Input
              id="work-task-blocker"
              value={draft.blocker}
              onChange={(event) => set("blocker", event.target.value)}
              placeholder="What must change before this can move?"
            />
          </div>
          <div className={fieldClass}>
            <Label>Dependencies</Label>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-input bg-background/40 p-3">
              {availableDependencies.length === 0 ? (
                <p className="text-xs text-muted-foreground">No other tasks are available yet.</p>
              ) : (
                availableDependencies.map((dependency) => (
                  <label key={dependency.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={draft.dependsOn.includes(dependency.id)}
                      onChange={(event) => toggleDependency(dependency.id, event.target.checked)}
                    />
                    <span>
                      {dependency.title}
                      <span className="ml-2 text-xs uppercase text-muted-foreground">
                        {dependency.status}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
            {unfinishedDependencies.length > 0 && (
              <p className="text-xs text-amber-400" role="status">
                Warning: {unfinishedDependencies.length} selected dependency
                {unfinishedDependencies.length === 1 ? " is" : " are"} not done.
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={fieldClass}>
              <Label htmlFor="work-task-source">Source</Label>
              <select
                id="work-task-source"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={draft.source}
                onChange={(event) => set("source", event.target.value as TaskSource)}
              >
                <option value="manual">Manual</option>
                <option value="hermes">Hermes</option>
                <option value="import">Import</option>
              </select>
            </div>
            <div className={fieldClass}>
              <Label htmlFor="work-task-source-ref">Source reference</Label>
              <Input
                id="work-task-source-ref"
                value={draft.sourceRef}
                onChange={(event) => set("sourceRef", event.target.value)}
                placeholder="Session, file, or external ID"
              />
            </div>
          </div>
          <div className={fieldClass}>
            <Label htmlFor="work-task-evidence">Completion evidence</Label>
            <Textarea
              id="work-task-evidence"
              value={draft.evidence}
              onChange={(event) => set("evidence", event.target.value)}
              placeholder="Verification result, file, URL, commit, or concise proof"
            />
            {task && task.completionEvidence.length > 0 && (
              <p className="text-xs text-emerald-400">
                {task.completionEvidence.length} evidence item(s) already recorded.
              </p>
            )}
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
            >
              {error}
            </p>
          )}
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save task"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
