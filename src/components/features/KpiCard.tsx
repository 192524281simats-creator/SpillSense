import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: number | string;
  unit?: string;
  subtext?: string;
  color?: string;
  badge?: ReactNode;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function KpiCard({ label, value, unit, subtext, color = "#22d3ee", badge, icon, className }: KpiCardProps) {
  return (
    <div className={cn("glass-card rounded-xl p-4 flex flex-col gap-1.5", className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide leading-tight">
          {label}
        </span>
        {badge}
      </div>
      <div className="flex items-end gap-1.5 mt-0.5">
        <span className="kpi-number" style={{ color }}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {unit && (
          <span className="text-sm font-semibold text-muted-foreground pb-0.5">{unit}</span>
        )}
      </div>
      {subtext && (
        <div className="text-xs text-muted-foreground leading-tight">{subtext}</div>
      )}
    </div>
  );
}

interface RiskBadgeProps {
  level: "SAFE" | "MODERATE" | "HIGH" | "CRITICAL";
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const styles: Record<RiskBadgeProps["level"], string> = {
    SAFE:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    MODERATE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    HIGH:     "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  };
  const dots: Record<RiskBadgeProps["level"], string> = {
    SAFE: "#10b981", MODERATE: "#f59e0b", HIGH: "#f97316", CRITICAL: "#ef4444",
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border", styles[level], className)}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dots[level] }} />
      {level}
    </span>
  );
}

interface StorageGaugeProps {
  storageMCM: number;
  capacityMCM: number;
  floodLevelMCM: number;
  minLevelMCM: number;
}

export function StorageGauge({ storageMCM, capacityMCM, floodLevelMCM, minLevelMCM }: StorageGaugeProps) {
  const pct = Math.min(100, (storageMCM / capacityMCM) * 100);
  const floodPct = (floodLevelMCM / capacityMCM) * 100;
  const minPct = (minLevelMCM / capacityMCM) * 100;

  const barColor = pct >= floodPct * 0.95 ? "#ef4444"
    : pct >= floodPct * 0.85 ? "#f97316"
    : pct <= minPct * 1.1 ? "#f59e0b"
    : "#22d3ee";

  return (
    <div className="space-y-3">
      {/* Bar */}
      <div className="relative">
        <div className="h-5 bg-muted rounded-full overflow-hidden border border-border">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${barColor}cc, ${barColor})` }}
          />
        </div>
        {/* Flood line marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 rounded-full"
          style={{ left: `${floodPct}%` }}
          title={`Flood control: ${floodLevelMCM.toFixed(0)} MCM`}
        />
        {/* Min line marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-500 rounded-full"
          style={{ left: `${minPct}%` }}
          title={`Minimum: ${minLevelMCM.toFixed(0)} MCM`}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-base font-tabular" style={{ color: barColor }}>
            {pct.toFixed(1)}%
          </span>
          <span className="text-muted-foreground">{storageMCM.toFixed(0)} MCM of {capacityMCM.toFixed(0)} MCM</span>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Flood: {floodLevelMCM.toFixed(0)} MCM</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Min: {minLevelMCM.toFixed(0)} MCM</div>
        </div>
      </div>
    </div>
  );
}
