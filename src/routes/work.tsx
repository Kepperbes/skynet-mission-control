import { createFileRoute } from "@tanstack/react-router";
import {
  BriefcaseBusiness,
  FolderPlus,
  ListChecks,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  TableProperties,
} from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ProjectEditor } from "@/components/work/project-editor";
import { TaskEditor } from "@/components/work/task-editor";
import { WorkBoard } from "@/components/work/work-board";
import { WorkMomentum } from "@/components/work/work-momentum";
import { WorkProjects } from "@/components/work/work-projects";
import { WorkTaskList } from "@/components/work/work-task-list";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { reconcileProjectEdit, reconcileTaskEdit } from "@/lib/work-conflict";
import { useWorkState } from "@/lib/work-client";
import type { Project, Task, TaskStatus } from "@/lib/work-domain";

const WORK_TABS = ["board", "tasks", "projects", "momentum"] as const;
type WorkTab = (typeof WORK_TABS)[number];

export const Route = createFileRoute("/work")({
  validateSearch: (search: Record<string, unknown>): { tab: WorkTab } => ({
    tab: WORK_TABS.includes(search.tab as WorkTab) ? (search.tab as WorkTab) : "board",
  }),
  head: () => ({ meta: [{ title: "Work — Skynet Mission Control" }] }),
  component: WorkPage,
});

function WorkPage() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { state, loading, error, reload, update } = useWorkState();
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [projectEditorOpen, setProjectEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [requestedStatus, setRequestedStatus] = useState<TaskStatus | undefined>();

  const openNewTask = () => {
    setEditingTask(null);
    setRequestedStatus(undefined);
    setTaskEditorOpen(true);
  };
  const openTask = (task: Task, status?: TaskStatus) => {
    setEditingTask(task);
    setRequestedStatus(status);
    setTaskEditorOpen(true);
  };
  const openNewProject = () => {
    setEditingProject(null);
    setProjectEditorOpen(true);
  };

  async function saveTask(task: Task, baseTask: Task | null = editingTask) {
    await update((current) => {
      const latest = current.tasks.find((item) => item.id === task.id);
      const nextTask = latest
        ? baseTask
          ? reconcileTaskEdit(latest, baseTask, task)
          : task
        : {
            ...task,
            order:
              Math.max(
                -1,
                ...current.tasks
                  .filter((item) => item.status === task.status)
                  .map((item) => item.order),
              ) + 1,
          };
      return {
        ...current,
        tasks: latest
          ? current.tasks.map((item) => (item.id === task.id ? nextTask : item))
          : [...current.tasks, nextTask],
      };
    });
  }

  async function saveProject(project: Project, baseProject: Project | null = editingProject) {
    await update((current) => {
      const latest = current.projects.find((item) => item.id === project.id);
      const nextProject = latest
        ? baseProject
          ? reconcileProjectEdit(latest, baseProject, project)
          : project
        : project;
      return {
        ...current,
        projects: latest
          ? current.projects.map((item) => (item.id === project.id ? nextProject : item))
          : [...current.projects, nextProject],
      };
    });
  }

  function moveTask(task: Task, status: TaskStatus) {
    if (status === task.status) return;
    if (status === "done" && task.completionEvidence.length === 0) {
      openTask(task, status);
      return;
    }
    const now = new Date().toISOString();
    void saveTask(
      {
        ...task,
        status,
        updatedAt: now,
        completedAt: status === "done" ? (task.completedAt ?? now) : undefined,
        order: state
          ? Math.max(
              -1,
              ...state.tasks.filter((item) => item.status === status).map((item) => item.order),
            ) + 1
          : task.order,
      },
      task,
    ).catch(() => undefined);
  }

  const activeTasks = state?.tasks.filter((task) => task.status !== "done").length ?? 0;
  const waitingTasks = state?.tasks.filter((task) => task.status === "waiting").length ?? 0;
  const completedTasks = state?.tasks.filter((task) => task.status === "done").length ?? 0;

  return (
    <main className="mx-auto w-full max-w-[1800px] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Work"
        description="One canonical system for tasks, projects, deadlines, blockers, and verified delivery."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void reload().catch(() => undefined)}
              disabled={loading}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={openNewProject} disabled={!state}>
              <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
              Project
            </Button>
            <Button
              size="sm"
              onClick={openNewTask}
              disabled={!state || state.projects.length === 0}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Task
            </Button>
          </>
        }
      />

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void reload().catch(() => undefined)}>
            Reload
          </Button>
        </div>
      )}

      {loading && !state ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-border/60 bg-card/30">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-3 text-sm text-muted-foreground">Loading canonical work state…</span>
        </div>
      ) : state ? (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              icon={BriefcaseBusiness}
              label="Active projects"
              value={state.projects.filter((project) => project.status === "active").length}
            />
            <Metric icon={ListChecks} label="Active tasks" value={activeTasks} />
            <Metric icon={TableProperties} label="Waiting" value={waitingTasks} />
            <Metric icon={Sparkles} label="Verified done" value={completedTasks} />
          </div>
          <Tabs
            value={tab}
            onValueChange={(value) =>
              void navigate({ search: { tab: value as WorkTab }, replace: true })
            }
          >
            <TabsList className="mb-4 h-auto w-full justify-start overflow-x-auto rounded-xl border border-border/60 bg-card/40 p-1.5 sm:w-auto">
              <TabsTrigger value="board">Board</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="momentum">Momentum</TabsTrigger>
            </TabsList>
            <TabsContent value="board">
              <WorkBoard
                tasks={state.tasks}
                projects={state.projects}
                onEdit={openTask}
                onMove={moveTask}
              />
            </TabsContent>
            <TabsContent value="tasks">
              <WorkTaskList tasks={state.tasks} projects={state.projects} onEdit={openTask} />
            </TabsContent>
            <TabsContent value="projects">
              <WorkProjects
                projects={state.projects}
                tasks={state.tasks}
                onEdit={(project) => {
                  setEditingProject(project);
                  setProjectEditorOpen(true);
                }}
              />
            </TabsContent>
            <TabsContent value="momentum">
              <WorkMomentum state={state} />
            </TabsContent>
          </Tabs>
        </>
      ) : null}

      {state && (
        <TaskEditor
          open={taskEditorOpen}
          task={editingTask}
          tasks={state.tasks}
          projects={state.projects}
          requestedStatus={requestedStatus}
          onOpenChange={setTaskEditorOpen}
          onSave={saveTask}
        />
      )}
      <ProjectEditor
        open={projectEditorOpen}
        project={editingProject}
        onOpenChange={setProjectEditorOpen}
        onSave={saveProject}
      />
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BriefcaseBusiness;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <strong className="mt-2 block text-2xl font-semibold">{value}</strong>
    </div>
  );
}
