import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpDown, CalendarClock, Filter } from "lucide-react";
import type { Project, Task } from "@/lib/work-domain";
import {
  classifyDeadline,
  filterAndSortTasks,
  type DeadlineState,
  type TaskSort,
  type WorkTaskStatus,
  type WorkTaskPriority,
} from "@/lib/work-view";
import { cn } from "@/lib/utils";

const ALL = "all";

export function WorkTaskList({
  tasks,
  projects,
  onEdit,
}: {
  tasks: Task[];
  projects: Project[];
  onEdit: (task: Task) => void;
}) {
  const [projectId, setProjectId] = useState(ALL);
  const [status, setStatus] = useState<typeof ALL | WorkTaskStatus>(ALL);
  const [priority, setPriority] = useState<typeof ALL | WorkTaskPriority>(ALL);
  const [deadlineState, setDeadlineState] = useState<typeof ALL | Exclude<DeadlineState, "done">>(
    ALL,
  );
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [sort, setSort] = useState<TaskSort>("deadline");

  const visible = useMemo(
    () =>
      filterAndSortTasks(tasks, {
        projectId: projectId === ALL ? undefined : projectId,
        status: status === ALL ? undefined : status,
        priority: priority === ALL ? undefined : priority,
        deadlineState: deadlineState === ALL ? undefined : deadlineState,
        blockedOnly,
        sort,
      }),
    [tasks, projectId, status, priority, deadlineState, blockedOnly, sort],
  );
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const controlClass =
    "h-9 rounded-md border border-input bg-background px-2.5 text-xs text-foreground";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/40 p-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          aria-label="Filter by project"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          className={controlClass}
        >
          <option value={ALL}>All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
          className={controlClass}
        >
          <option value={ALL}>All statuses</option>
          <option value="now">Now</option>
          <option value="next">Next</option>
          <option value="waiting">Waiting</option>
          <option value="done">Done</option>
        </select>
        <select
          aria-label="Filter by priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value as typeof priority)}
          className={controlClass}
        >
          <option value={ALL}>All priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          aria-label="Filter by deadline"
          value={deadlineState}
          onChange={(event) => setDeadlineState(event.target.value as typeof deadlineState)}
          className={controlClass}
        >
          <option value={ALL}>Any deadline</option>
          <option value="overdue">Overdue</option>
          <option value="due-soon">Due soon</option>
          <option value="scheduled">Scheduled</option>
          <option value="unscheduled">Unscheduled</option>
        </select>
        <label className="inline-flex h-9 items-center gap-2 rounded-md border border-input px-3 text-xs">
          <input
            type="checkbox"
            checked={blockedOnly}
            onChange={(event) => setBlockedOnly(event.target.checked)}
          />
          Blocked only
        </label>
        <div className="ml-auto flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <select
            aria-label="Sort tasks"
            value={sort}
            onChange={(event) => setSort(event.target.value as TaskSort)}
            className={controlClass}
          >
            <option value="deadline">Deadline</option>
            <option value="priority">Priority</option>
            <option value="updated">Recently updated</option>
            <option value="project">Project</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70">
        <div className="grid grid-cols-[minmax(220px,2fr)_minmax(130px,1fr)_90px_110px_120px] gap-3 border-b border-border bg-muted/30 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground max-lg:hidden">
          <span>Task</span>
          <span>Project</span>
          <span>Status</span>
          <span>Priority</span>
          <span>Deadline</span>
        </div>
        {visible.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            No tasks match these filters.
          </div>
        ) : (
          visible.map((task) => {
            const deadline = classifyDeadline(task);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onEdit(task)}
                className="grid w-full grid-cols-[minmax(220px,2fr)_minmax(130px,1fr)_90px_110px_120px] items-center gap-3 border-b border-border/60 px-4 py-3 text-left text-xs transition-colors last:border-0 hover:bg-accent/40 max-lg:grid-cols-1 max-lg:gap-1.5"
              >
                <span>
                  <span className="block text-sm font-medium">{task.title}</span>
                  <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    {task.blocker && (
                      <>
                        <AlertTriangle className="h-3 w-3 text-amber-400" />
                        <span className="truncate text-amber-300">{task.blocker}</span>
                      </>
                    )}
                    {!task.blocker && <span>{task.owner}</span>}
                  </span>
                </span>
                <span className="truncate text-muted-foreground">
                  {projectsById.get(task.projectId)?.name ?? "Unknown"}
                </span>
                <span className="capitalize">{task.status}</span>
                <span className="capitalize">{task.priority}</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 capitalize",
                    deadline === "overdue" && "text-red-300",
                    deadline === "due-soon" && "text-amber-300",
                    deadline === "unscheduled" && "text-muted-foreground",
                  )}
                >
                  <CalendarClock className="h-3 w-3" />
                  {task.deadline
                    ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
                        new Date(task.deadline),
                      )
                    : "None"}
                </span>
              </button>
            );
          })
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Showing {visible.length} of {tasks.length} tasks.
      </p>
    </div>
  );
}
