import { Activity, CheckCircle2, Crosshair, Gauge, HeartPulse, Lightbulb } from "lucide-react";
import type { WorkState } from "@/lib/work-domain";
import { assessMomentum } from "@/lib/work-derivations";
import { cn } from "@/lib/utils";

const STATE_META = {
  clear: {
    label: "Clear",
    icon: Gauge,
    tone: "text-blue-300",
    panel: "border-blue-500/25 bg-blue-500/8",
    description: "The work system is balanced. Choose deliberately rather than reacting.",
  },
  focused: {
    label: "Focused",
    icon: Crosshair,
    tone: "text-orange-300",
    panel: "border-orange-500/25 bg-orange-500/8",
    description: "A near-term commitment has an active next action. Protect execution time.",
  },
  recovery: {
    label: "Recovery",
    icon: HeartPulse,
    tone: "text-rose-300",
    panel: "border-rose-500/25 bg-rose-500/8",
    description: "Several strain signals are active. Reduce scope and repair one constraint first.",
  },
  momentum: {
    label: "Momentum",
    icon: Activity,
    tone: "text-emerald-300",
    panel: "border-emerald-500/25 bg-emerald-500/8",
    description: "Verified delivery is sustained without material deadline or blocker pressure.",
  },
} as const;

export function WorkMomentum({ state }: { state: WorkState }) {
  const assessment = assessMomentum(state);
  const meta = STATE_META[assessment.state];
  const Icon = meta.icon;
  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <section className={cn("rounded-2xl border p-6", meta.panel)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Adaptive operating state
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Icon className={cn("h-7 w-7", meta.tone)} />
              <h2 className="text-3xl font-semibold tracking-tight">{meta.label}</h2>
            </div>
          </div>
          <span className="rounded-full border border-current/20 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Evidence derived
          </span>
        </div>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {meta.description}
        </p>
        <div className="mt-6 rounded-xl border border-border/70 bg-background/60 p-4">
          <p className="flex items-center gap-2 text-xs font-medium">
            <Lightbulb className="h-4 w-4 text-amber-300" />
            Recommended action
          </p>
          <p className="mt-2 text-sm">{assessment.recommendedAction}</p>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{assessment.reason}</p>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/45 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Signal evidence
            </p>
            <h2 className="mt-1 text-lg font-semibold">Why this state</h2>
          </div>
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="space-y-2">
          {assessment.signals.map((signal) => (
            <div
              key={signal.key}
              className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2.5"
            >
              <span className="text-xs text-muted-foreground">{signal.label}</span>
              <strong className="text-xs">
                {typeof signal.value === "boolean" ? (signal.value ? "Yes" : "No") : signal.value}
              </strong>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          This is not an XP score. It is recalculated from deadlines, blockers, completion evidence,
          and project readiness.
        </p>
      </section>
    </div>
  );
}
