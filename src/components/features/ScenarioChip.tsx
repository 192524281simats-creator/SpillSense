import { useApp } from "@/lib/store";
import { SCENARIOS } from "@/lib/engine";
import { cn } from "@/lib/utils";

const SCENARIO_STYLES = {
  elnino: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
  neutral: "bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700",
  lanina: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
};

export function ScenarioChip({ className }: { className?: string }) {
  const { scenario, setScenario } = useApp();
  const scenarios = ["elnino", "neutral", "lanina"] as const;

  return (
    <div className={cn("flex items-center gap-1 p-1 bg-muted rounded-lg border border-border", className)}>
      {scenarios.map(s => (
        <button
          key={s}
          onClick={() => setScenario(s)}
          className={cn(
            "px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200",
            scenario === s
              ? SCENARIO_STYLES[s]
              : "text-muted-foreground hover:text-foreground hover:bg-background"
          )}
        >
          {SCENARIOS[s].label}
        </button>
      ))}
    </div>
  );
}
