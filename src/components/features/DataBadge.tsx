import { cn } from "@/lib/utils";

interface SyntheticBadgeProps {
  tooltip?: string;
  className?: string;
  short?: boolean;
}

export function SyntheticBadge({ tooltip, className, short }: SyntheticBadgeProps) {
  const label = short ? "SYNTHETIC" : "SYNTHETIC DEMO DATA";
  const tip = tooltip ?? "Simulated data is used where validated data is unavailable. The pipeline accepts real datasets.";

  return (
    <span
      className={cn("synthetic-badge cursor-help", className)}
      title={tip}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 flex-shrink-0" />
      {label}
    </span>
  );
}

interface DataBadgeProps {
  source: "REAL" | "OFFICIAL" | "HISTORICAL" | "MODELLED" | "RECONSTRUCTED" | "ESTIMATED" | "CALCULATED" | "MODEL_PREDICTION" | "SYNTHETIC";
  className?: string;
}

const SOURCE_COLORS: Record<DataBadgeProps["source"], string> = {
  REAL: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
  OFFICIAL: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
  HISTORICAL: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700",
  MODELLED: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700",
  RECONSTRUCTED: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
  ESTIMATED: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
  CALCULATED: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700",
  MODEL_PREDICTION: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700",
  SYNTHETIC: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
};

export function DataBadge({ source, className }: DataBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wide",
      SOURCE_COLORS[source], className
    )}>
      {source}
    </span>
  );
}

export function DecisionNotice({ className }: { className?: string }) {
  return (
    <div className={cn(
      "flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-3 py-2",
      className
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
      Decision support only, not automatic dam control. The operator makes the final decision.
    </div>
  );
}
