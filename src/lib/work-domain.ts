import { z } from "zod";

const idSchema = z.string().trim().min(1, "ID must not be empty");
const isoDateTimeSchema = z.string().datetime({ offset: true });
const projectDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, "Invalid calendar date");

export const projectSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1),
  description: z.string().optional(),
  status: z.enum(["active", "paused", "completed"]),
  targetDate: projectDateSchema.optional(),
  deadlineConfidence: z.enum(["committed", "tentative"]),
  owner: z.string().trim().min(1),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  completedAt: isoDateTimeSchema.optional(),
});

export const completionEvidenceSchema = z.object({
  kind: z.enum(["note", "file", "url", "commit", "verification"]),
  value: z.string().trim().min(1),
  recordedAt: isoDateTimeSchema,
});

export const taskSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1),
  description: z.string().optional(),
  projectId: idSchema,
  owner: z.string().trim().min(1),
  status: z.enum(["now", "next", "waiting", "done"]),
  priority: z.enum(["critical", "high", "medium", "low"]),
  deadline: isoDateTimeSchema.optional(),
  blocker: z.string().trim().min(1).optional(),
  dependsOn: z.array(idSchema),
  source: z.enum(["manual", "hermes", "import"]),
  sourceRef: z.string().trim().min(1).optional(),
  completionEvidence: z.array(completionEvidenceSchema),
  order: z.number().finite(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  completedAt: isoDateTimeSchema.optional(),
});

export const workStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
    projects: z.array(projectSchema),
    tasks: z.array(taskSchema),
    updatedAt: isoDateTimeSchema,
  })
  .superRefine((state, ctx) => {
    const projectIds = new Set<string>();
    state.projects.forEach((project, index) => {
      if (projectIds.has(project.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate project ID: ${project.id}`,
          path: ["projects", index, "id"],
        });
      }
      projectIds.add(project.id);
    });

    const taskIds = new Set<string>();
    state.tasks.forEach((task, index) => {
      if (taskIds.has(task.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate task ID: ${task.id}`,
          path: ["tasks", index, "id"],
        });
      }
      taskIds.add(task.id);
    });

    state.tasks.forEach((task, index) => {
      if (!projectIds.has(task.projectId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown project: ${task.projectId}`,
          path: ["tasks", index, "projectId"],
        });
      }
      for (const dependency of task.dependsOn) {
        if (dependency === task.id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A task cannot depend on itself",
            path: ["tasks", index, "dependsOn"],
          });
        } else if (!taskIds.has(dependency)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown dependency: ${dependency}`,
            path: ["tasks", index, "dependsOn"],
          });
        }
      }
      if (task.status === "done") {
        if (!task.completedAt)
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Done tasks require completedAt",
            path: ["tasks", index, "completedAt"],
          });
        if (task.completionEvidence.length === 0)
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Done tasks require completion evidence",
            path: ["tasks", index, "completionEvidence"],
          });
      } else if (task.completedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Active tasks cannot have completedAt",
          path: ["tasks", index, "completedAt"],
        });
      }
    });

    const dependencies = new Map(state.tasks.map((task) => [task.id, task.dependsOn]));
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (id: string): boolean => {
      if (visiting.has(id)) return true;
      if (visited.has(id)) return false;
      visiting.add(id);
      for (const dependency of dependencies.get(id) ?? []) {
        if (dependencies.has(dependency) && visit(dependency)) return true;
      }
      visiting.delete(id);
      visited.add(id);
      return false;
    };
    for (const id of taskIds) {
      if (visit(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Task dependency cycle detected",
          path: ["tasks"],
        });
        break;
      }
    }
  });

export type Project = z.infer<typeof projectSchema>;
export type Task = z.infer<typeof taskSchema>;
export type CompletionEvidence = z.infer<typeof completionEvidenceSchema>;
export type WorkState = z.infer<typeof workStateSchema>;
export type ProjectStatus = Project["status"];
export type DeadlineConfidence = Project["deadlineConfidence"];
export type TaskStatus = Task["status"];
export type TaskPriority = Task["priority"];
export type TaskSource = Task["source"];

export function emptyWorkState(now = new Date()): WorkState {
  return { schemaVersion: 1, revision: 0, projects: [], tasks: [], updatedAt: now.toISOString() };
}
