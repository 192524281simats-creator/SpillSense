import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  color?: string;
  badge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

export function KpiCard({
  label, value, unit, subtext, trend, trendLabel, color, badge, onClick, className, icon
}: KpiCardProps) {
  const [displayed, setDisplayed] = useState(0);
  const numValue = typeof value === "number" ? value : parseFloat(String(value));
  const isNum = !isNaN(numValue);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (!isNum) return;
    const start = Date.now();
    const duration = 800;
    const startVal = 0;
    const endVal = numValue;

    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(startVal + (endVal - startVal) * eased * 10) / 10);
      if (progress < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [numValue]);

  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const trendColor = trend === "up"
    ? "text-emerald-600 dark:text-emerald-400"
    : trend === "down" ? "text-red-500" : "text-muted-foreground";

  return (
    <div
      className={cn(
        "glass-card rounded-xl p-4 transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5",
        className
      )}
      onClick={onClick}
      style={color ? { borderLeft: `3px solid ${color}` } : undefined}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">{label}</span>
        <div className="flex items-center gap-1">
          {badge}
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="kpi-number font-tabular" style={color ? { color } : undefined}>
          {isNum ? displayed.toLocaleString() : value}
        </span>
        {unit && <span className="text-sm text-muted-foreground font-medium">{unit}</span>}
      </div>
      {(subtext || trendLabel) && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {trend && (
            <span className={cn("text-xs font-medium", trendColor)}>
              {trendIcon} {trendLabel}
            </span>
          )}
          {subtext && !trendLabel && (
            <span className="text-xs text-muted-foreground">{subtext}</span>
          )}
        </div>
      )}
    </div>
  );
}

interface RiskBadgeProps {
  level: "SAFE" | "MODERATE" | "HIGH" | "CRITICAL";
  className?: string;
  size?: "sm" | "md" | "lg";
}

const RISK_CONFIG = {
  SAFE: { label: "SAFE", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500" },
  MODERATE: { label: "MODERATE", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800", dot: "bg-amber-500" },
  HIGH: { label: "HIGH", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800", dot: "bg-orange-500" },
  CRITICAL: { label: "CRITICAL", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800", dot: "bg-red-500" },
};

export function RiskBadge({ level, className, size = "md" }: RiskBadgeProps) {
  const cfg = RISK_CONFIG[level];
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 font-semibold rounded-full border",
      size === "sm" ? "text-xs px-2 py-0.5" : size === "lg" ? "text-base px-4 py-1.5" : "text-sm px-3 py-1",
      cfg.bg, cfg.color, className
    )}>
      <span className={cn("rounded-full flex-shrink-0 animate-pulse", cfg.dot,
        size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2")} />
      {cfg.label}
    </span>
  );
}

interface StorageGaugeProps {
  storageMCM: number;
  capacityMCM: number;
  floodLevelMCM: number;
  minLevelMCM: number;
  className?: string;
}

export function StorageGauge({ storageMCM, capacityMCM, floodLevelMCM, minLevelMCM, className }: StorageGaugeProps) {
  const pct = Math.min(100, (storageMCM / capacityMCM) * 100);
  const floodPct = (floodLevelMCM / capacityMCM) * 100;
  const minPct = (minLevelMCM / capacityMCM) * 100;

  const color = pct >= floodPct
    ? "#ef4444"
    : pct <= minPct * 1.2
      ? "#f97316"
      : pct <= 40 ? "#f59e0b" : "#22d3ee";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0 MCM</span>
        <span className="font-semibold text-foreground">
          {storageMCM.toFixed(0)} / {capacityMCM.toFixed(0)} MCM
        </span>
        <span>Full</span>
      </div>
      <div className="relative h-6 bg-muted rounded-full overflow-hidden border border-border">
        {/* Flood control line */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10" style={{ left: `${floodPct}%` }}>
          <span className="absolute -top-5 left-1 text-[9px] text-red-500 whitespace-nowrap font-medium">Flood</span>
        </div>
        {/* Min operating line */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10" style={{ left: `${minPct}%` }}>
          <span className="absolute -bottom-4 left-1 text-[9px] text-amber-500 whitespace-nowrap font-medium">Min</span>
        </div>
        {/* Fill */}
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Min operating: {minLevelMCM.toFixed(0)} MCM</span>
        <span>Flood control: {floodLevelMCM.toFixed(0)} MCM</span>
      </div>
    </div>
  );
}
