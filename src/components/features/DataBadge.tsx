import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type DataSource =
  | "REAL" | "OFFICIAL" | "HISTORICAL" | "MODELLED" | "RECONSTRUCTED"
  | "ESTIMATED" | "CALCULATED" | "MODEL_PREDICTION" | "SYNTHETIC";

interface DataBadgeProps {
  source: DataSource;
  className?: string;
}

const SOURCE_STYLES: Record<DataSource, string> = {
  REAL:             "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  OFFICIAL:         "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  HISTORICAL:       "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
  MODELLED:         "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800",
  RECONSTRUCTED:    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800",
  ESTIMATED:        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  CALCULATED:       "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
  MODEL_PREDICTION: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800",
  SYNTHETIC:        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
};

export function DataBadge({ source, className }: DataBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded border",
      SOURCE_STYLES[source],
      className
    )}>
      {source.replace("_", " ")}
    </span>
  );
}

interface SyntheticBadgeProps {
  short?: boolean;
  className?: string;
}

export function SyntheticBadge({ short = false, className }: SyntheticBadgeProps) {
  return (
    <span
      className={cn("synthetic-badge", className)}
      title="Simulated data is used where validated data is unavailable. The pipeline accepts real datasets."
    >
      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
      {short ? "SYNTHETIC" : "SYNTHETIC DEMO DATA"}
    </span>
  );
}

export function DecisionNotice() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/15
                    border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400">
      <Info className="w-4 h-4 shrink-0" />
      <p className="text-xs leading-relaxed">
        <strong>Decision support only.</strong> SpillSense does not automatically control dam gates. The operator makes all release decisions.
        All data is SYNTHETIC DEMO DATA. Cauvery inter-state water-sharing orders are NOT modelled.
      </p>
    </div>
  );
}
