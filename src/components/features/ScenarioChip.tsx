import { useApp } from "@/lib/store";
import { SCENARIOS } from "@/lib/engine";
import { cn } from "@/lib/utils";

const SCENARIO_STYLES = {
  elnino: {
    active: "bg-orange-500 text-white border-orange-400 shadow-sm",
    idle: "text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border-transparent",
  },
  neutral: {
    active: "bg-cyan-500 text-white border-cyan-400 shadow-sm",
    idle: "text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border-transparent",
  },
  lanina: {
    active: "bg-blue-500 text-white border-blue-400 shadow-sm",
    idle: "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-transparent",
  },
};

export function ScenarioChip({ className }: { className?: string }) {
  const { scenario, setScenario } = useApp();
  const scenarios = ["elnino", "neutral", "lanina"] as const;

  return (
    <div className={cn("flex items-center gap-0.5 p-0.5 bg-muted rounded-lg border border-border", className)}>
      {scenarios.map(s => (
        <button
          key={s}
          onClick={() => setScenario(s)}
          className={cn(
            "px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 border",
            scenario === s
              ? SCENARIO_STYLES[s].active
              : SCENARIO_STYLES[s].idle
          )}
          title={SCENARIOS[s].description}
        >
          {SCENARIOS[s].label}
        </button>
      ))}
    </div>
  );
}
