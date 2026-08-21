import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  PauseCircle,
} from "lucide-react";
import type { Project, Task } from "@/lib/work-domain";
import { deriveProjectSummary } from "@/lib/work-derivations";
import { cn } from "@/lib/utils";

const HEALTH_STYLE = {
  "on-track": {
    label: "On track",
    className: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
  },
  attention: {
    label: "Attention",
    className: "text-amber-300 bg-amber-500/10 border-amber-500/25",
  },
  blocked: { label: "Blocked", className: "text-red-300 bg-red-500/10 border-red-500/25" },
  complete: { label: "Complete", className: "text-blue-300 bg-blue-500/10 border-blue-500/25" },
} as const;

export function WorkProjects({
  projects,
  tasks,
  onEdit,
}: {
  projects: Project[];
  tasks: Task[];
  onEdit: (project: Project) => void;
}) {
  if (projects.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
        Create the first project to anchor canonical tasks and deadlines.
      </div>
    );
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => {
        const projectTasks = tasks.filter((task) => task.projectId === project.id);
        const summary = deriveProjectSummary(project, projectTasks);
        const active = projectTasks.filter((task) => task.status !== "done").length;
        const done = projectTasks.filter((task) => task.status === "done").length;
        const waiting = projectTasks.filter((task) => task.status === "waiting").length;
        const health = HEALTH_STYLE[summary.health];
        return (
          <button
            key={project.id}
            type="button"
            onClick={() => onEdit(project)}
            className="rounded-xl border border-border/70 bg-card/50 p-5 text-left transition-colors hover:border-foreground/25"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  {project.status === "paused" ? (
                    <PauseCircle className="h-4 w-4 text-muted-foreground" />
                  ) : project.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <CircleDashed className="h-4 w-4 text-blue-400" />
                  )}
                  <h2 className="truncate text-base font-semibold">{project.name}</h2>
                </div>
                {project.description && (
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {project.description}
                  </p>
                )}
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-md border px-2 py-1 text-[10px] font-medium",
                  health.className,
                )}
              >
                {health.label}
              </span>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-3 py-2.5">
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {project.targetDate
                  ? new Intl.DateTimeFormat(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(`${project.targetDate}T12:00:00`))
                  : "No target date"}
              </span>
              {project.targetDate && (
                <span
                  className={cn(
                    "text-[9px] uppercase tracking-wide",
                    project.deadlineConfidence === "tentative"
                      ? "text-amber-300"
                      : "text-emerald-300",
                  )}
                >
                  {project.deadlineConfidence}
                </span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-muted/35 px-2 py-2">
                <strong className="block text-sm">{active}</strong>
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                  Active
                </span>
              </div>
              <div className="rounded-md bg-muted/35 px-2 py-2">
                <strong className="block text-sm">{waiting}</strong>
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                  Waiting
                </span>
              </div>
              <div className="rounded-md bg-muted/35 px-2 py-2">
                <strong className="block text-sm">{done}</strong>
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                  Done
                </span>
              </div>
            </div>
            <div className="mt-4 border-t border-border/60 pt-3">
              <p className="mb-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Next action
              </p>
              {summary.nextAction ? (
                <p className="flex items-center gap-2 text-xs">
                  <ArrowRight className="h-3.5 w-3.5 text-blue-400" />
                  <span className="truncate">{summary.nextAction.title}</span>
                </p>
              ) : (
                <p className="flex items-center gap-2 text-xs text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  No Now or Next action identified
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
