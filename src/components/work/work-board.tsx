import { AlertTriangle, CalendarClock, CheckCircle2, CircleDot, Clock3 } from "lucide-react";
import type { Project, Task, TaskStatus } from "@/lib/work-domain";
import { classifyDeadline, groupTasksByStatus } from "@/lib/work-view";
import { cn } from "@/lib/utils";

const COLUMNS: { status: TaskStatus; label: string; icon: typeof CircleDot; tone: string }[] = [
  { status: "now", label: "Now", icon: CircleDot, tone: "text-orange-400" },
  { status: "next", label: "Next", icon: Clock3, tone: "text-blue-400" },
  { status: "waiting", label: "Waiting", icon: AlertTriangle, tone: "text-amber-400" },
  { status: "done", label: "Done", icon: CheckCircle2, tone: "text-emerald-400" },
];

const PRIORITY_STYLE: Record<Task["priority"], string> = {
  critical: "border-red-500/30 bg-red-500/10 text-red-300",
  high: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  medium: "border-blue-500/25 bg-blue-500/10 text-blue-300",
  low: "border-border bg-muted/40 text-muted-foreground",
};

function deadlineLabel(task: Task): { text: string; className: string } | null {
  if (!task.deadline) return null;
  const state = classifyDeadline(task);
  const date = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(task.deadline),
  );
  if (state === "overdue") return { text: `Past due · ${date}`, className: "text-red-300" };
  if (state === "due-soon") return { text: `Due soon · ${date}`, className: "text-amber-300" };
  return { text: `Due ${date}`, className: "text-muted-foreground" };
}

export function WorkBoard({
  tasks,
  projects,
  onEdit,
  onMove,
}: {
  tasks: Task[];
  projects: Project[];
  onEdit: (task: Task) => void;
  onMove: (task: Task, status: TaskStatus) => void;
}) {
  const grouped = groupTasksByStatus(tasks);
  const projectsById = new Map(projects.map((project) => [project.id, project]));

  return (
    <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
      {COLUMNS.map((column) => {
        const Icon = column.icon;
        const items = grouped[column.status];
        return (
          <section
            key={column.status}
            className="min-w-0 rounded-xl border border-border/70 bg-card/40"
          >
            <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4", column.tone)} />
                <h2 className="text-sm font-semibold">{column.label}</h2>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {items.length}
              </span>
            </header>
            <div className="space-y-3 p-3">
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 px-3 py-8 text-center text-xs text-muted-foreground">
                  No {column.label.toLowerCase()} tasks
                </div>
              ) : (
                items.map((task) => {
                  const project = projectsById.get(task.projectId);
                  const due = deadlineLabel(task);
                  return (
                    <article
                      key={task.id}
                      className="rounded-lg border border-border bg-background/70 p-3 shadow-sm transition-colors hover:border-foreground/25"
                    >
                      <button
                        type="button"
                        onClick={() => onEdit(task)}
                        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <h3 className="text-sm font-medium leading-snug">{task.title}</h3>
                          <span
                            className={cn(
                              "shrink-0 rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wide",
                              PRIORITY_STYLE[task.priority],
                            )}
                          >
                            {task.priority}
                          </span>
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {project?.name ?? "Unknown project"}
                        </p>
                        {task.blocker && (
                          <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-200">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            <span className="line-clamp-2">{task.blocker}</span>
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between gap-2 text-[10px]">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1",
                              due?.className ?? "text-muted-foreground",
                            )}
                          >
                            {due && <CalendarClock className="h-3 w-3" />}
                            {due?.text ?? "No deadline"}
                          </span>
                          {task.completionEvidence.length > 0 && (
                            <span className="text-emerald-400">
                              Evidence {task.completionEvidence.length}
                            </span>
                          )}
                        </div>
                      </button>
                      <label className="mt-3 block border-t border-border/60 pt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                        Move
                        <select
                          aria-label={`Move ${task.title}`}
                          value={task.status}
                          onChange={(event) => onMove(task, event.target.value as TaskStatus)}
                          className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs normal-case tracking-normal text-foreground"
                        >
                          {COLUMNS.map((target) => (
                            <option key={target.status} value={target.status}>
                              {target.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
