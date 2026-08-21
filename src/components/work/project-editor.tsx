import { useEffect, useState } from "react";
import type { DeadlineConfidence, Project, ProjectStatus } from "@/lib/work-domain";
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

interface ProjectDraft {
  name: string;
  description: string;
  owner: string;
  status: ProjectStatus;
  targetDate: string;
  deadlineConfidence: DeadlineConfidence;
}

function initialDraft(project: Project | null): ProjectDraft {
  return {
    name: project?.name ?? "",
    description: project?.description ?? "",
    owner: project?.owner ?? "Operator",
    status: project?.status ?? "active",
    targetDate: project?.targetDate ?? "",
    deadlineConfidence: project?.deadlineConfidence ?? "committed",
  };
}

export function ProjectEditor({
  open,
  project,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  project: Project | null;
  onOpenChange: (open: boolean) => void;
  onSave: (project: Project, baseProject: Project | null) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState(() => initialDraft(project));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setDraft(initialDraft(project));
      setError("");
    }
  }, [open, project]);
  const set = <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) return setError("A project name is required.");
    if (!draft.owner.trim()) return setError("An owner is required.");
    const now = new Date().toISOString();
    const next: Project = {
      id: project?.id ?? crypto.randomUUID(),
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      owner: draft.owner.trim(),
      status: draft.status,
      targetDate: draft.targetDate || undefined,
      deadlineConfidence: draft.deadlineConfidence,
      createdAt: project?.createdAt ?? now,
      updatedAt: now,
      completedAt: draft.status === "completed" ? (project?.completedAt ?? now) : undefined,
    };
    try {
      setSaving(true);
      setError("");
      await onSave(next, project);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Project could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{project ? "Edit project" : "Create project"}</SheetTitle>
          <SheetDescription>
            Deadlines and rollups derive from the same canonical work state.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="mt-6 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="work-project-name">Name</Label>
            <Input
              id="work-project-name"
              autoFocus
              value={draft.name}
              onChange={(event) => set("name", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="work-project-description">Description</Label>
            <Textarea
              id="work-project-description"
              value={draft.description}
              onChange={(event) => set("description", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="work-project-owner">Owner</Label>
            <Input
              id="work-project-owner"
              value={draft.owner}
              onChange={(event) => set("owner", event.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="work-project-status">Status</Label>
              <select
                id="work-project-status"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={draft.status}
                onChange={(event) => set("status", event.target.value as ProjectStatus)}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="work-project-confidence">Deadline confidence</Label>
              <select
                id="work-project-confidence"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={draft.deadlineConfidence}
                onChange={(event) =>
                  set("deadlineConfidence", event.target.value as DeadlineConfidence)
                }
              >
                <option value="committed">Committed</option>
                <option value="tentative">Tentative</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="work-project-target">Target date</Label>
            <Input
              id="work-project-target"
              type="date"
              value={draft.targetDate}
              onChange={(event) => set("targetDate", event.target.value)}
            />
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
              {saving ? "Saving…" : "Save project"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
