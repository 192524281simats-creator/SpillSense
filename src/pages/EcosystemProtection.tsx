import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import {
  generateInflowForecast, runRegretGuard, computeResilience,
  computeCapture, CAPTURE_SITES, SAFE_CAPACITY_MCM, MIN_STORAGE_MCM, SCENARIOS
} from "@/lib/engine";
import { SyntheticBadge, DataBadge, DecisionNotice } from "@/components/features/DataBadge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { Leaf, AlertTriangle, CheckCircle, XCircle, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const ECO_MIN_FLOW_CUMECS = 12;
const ECO_MIN_FLOW_MCM_DAY = 12 * 0.0864;

export default function EcosystemProtection() {
  const { storageMCM, scenario, dailyDemandMCM, ecologicalMinMCM } = useApp();

  const forecast = useMemo(() => generateInflowForecast(scenario, storageMCM), [scenario, storageMCM]);
  const rg = useMemo(() => runRegretGuard(storageMCM, forecast, dailyDemandMCM, ecologicalMinMCM, scenario), [storageMCM, forecast, dailyDemandMCM, ecologicalMinMCM, scenario]);
  const { totalCaptureMCM } = useMemo(() => computeCapture(CAPTURE_SITES, 20), []);
  const resilience = useMemo(() => computeResilience(storageMCM, scenario, dailyDemandMCM, totalCaptureMCM), [storageMCM, scenario, dailyDemandMCM, totalCaptureMCM]);

  const recommendedRelease = rg.releaseRecommendationMCM;
  const ecoCompliant = recommendedRelease >= ECO_MIN_FLOW_MCM_DAY;
  const ecoMargin = recommendedRelease - ECO_MIN_FLOW_MCM_DAY;
  const sc = SCENARIOS[scenario];

  // Policy eco compliance
  const ecoComplianceData = rg.allPolicies.map(p => {
    const compliant = !p.ecologicalViolation;
    return {
      policy: p.label.replace(" Pre-Release", ""),
      release: Math.round(p.dailyReleases[0] ?? 0 * 10) / 10,
      minFlow: ECO_MIN_FLOW_MCM_DAY,
      compliant,
      color: compliant ? "#10b981" : "#ef4444",
    };
  });

  const ecosystems = [
    { name: "Cauvery River Main Channel", type: "River", risk: ecoCompliant ? "Low" : "High", status: ecoCompliant ? "Protected" : "At Risk", icon: "🌊" },
    { name: "Mettur Wetland Zone", type: "Wetland", risk: storageMCM > MIN_STORAGE_MCM * 1.3 ? "Low" : "Moderate", status: storageMCM > MIN_STORAGE_MCM * 1.3 ? "Stable" : "Watch", icon: "🌿" },
    { name: "Delta Agricultural Ecosystem", type: "Agricultural", risk: "Low", status: "Normal", icon: "🌾" },
    { name: "Riverine Biodiversity Zone", type: "Biodiversity", risk: ecoMargin > 2 ? "Low" : "Moderate", status: ecoMargin > 2 ? "Protected" : "Watch", icon: "🦋" },
  ];

  const riskColor = (r: string) => r === "Low" ? "#10b981" : r === "Moderate" ? "#f59e0b" : "#ef4444";
  const statusBg = (s: string) => s === "Protected" || s === "Stable" || s === "Normal"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
    : s === "Watch" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Leaf className="w-6 h-6 text-emerald-500" />
            Ecosystem Protection
          </h1>
          <p className="text-muted-foreground text-sm">Ecological flow is a hard constraint — policies violating it are rejected</p>
        </div>
        <SyntheticBadge />
      </div>

      {/* Eco flow status */}
      <div className={cn(
        "glass-card rounded-xl overflow-hidden border-2",
        ecoCompliant ? "border-emerald-300 dark:border-emerald-800" : "border-red-300 dark:border-red-800"
      )}>
        <div className={cn("px-5 py-4 flex items-center gap-4",
          ecoCompliant ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20"
        )}>
          {ecoCompliant ? (
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          ) : (
            <XCircle className="w-8 h-8 text-red-500" />
          )}
          <div>
            <div className={cn("font-bold text-xl", ecoCompliant ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
              {ecoCompliant ? "ECOLOGICAL FLOW PROTECTED" : "ECOLOGICAL FLOW AT RISK"}
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">
              Required minimum: {ECO_MIN_FLOW_CUMECS} m³/s ({ECO_MIN_FLOW_MCM_DAY.toFixed(2)} MCM/day) ·
              Recommended release: <strong>{recommendedRelease.toFixed(2)} MCM/day</strong> ·
              Margin: <strong className={ecoCompliant ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}>{ecoMargin.toFixed(2)} MCM/day</strong>
            </div>
          </div>
        </div>
        <div className="p-5 text-sm text-muted-foreground">
          The ecological/environmental minimum flow of {ECO_MIN_FLOW_CUMECS} m³/s is a hard constraint in RegretGuard.
          Any release policy that drops below this threshold is automatically rejected, regardless of its economic or storage performance.
        </div>
      </div>

      {/* Ecosystem status */}
      <div className="grid md:grid-cols-2 gap-4">
        {ecosystems.map(eco => (
          <div key={eco.name} className="glass-card rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{eco.icon}</span>
              <div className="flex-1">
                <div className="font-semibold text-sm">{eco.name}</div>
                <div className="text-xs text-muted-foreground">{eco.type}</div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: riskColor(eco.risk) }} />
                  <span className="text-xs font-medium" style={{ color: riskColor(eco.risk) }}>Risk: {eco.risk}</span>
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", statusBg(eco.status))}>
                    {eco.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Policy eco compliance */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4">Release Policy — Ecological Flow Compliance</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={ecoComplianceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="policy" tick={{ fontSize: 10 }} />
            <YAxis unit=" MCM" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
            <Bar dataKey="release" name="Daily Release (MCM)" radius={[4, 4, 0, 0]}>
              {ecoComplianceData.map((entry) => <Cell key={entry.policy} fill={entry.color} />)}
            </Bar>
            <Bar dataKey="minFlow" name={`Min Flow (${ECO_MIN_FLOW_MCM_DAY.toFixed(2)} MCM)`} fill="#64748b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-2 mt-3">
          {ecoComplianceData.map(d => (
            <div key={d.policy} className={cn("flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border",
              d.compliant ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
            )}>
              {d.compliant ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {d.policy}
            </div>
          ))}
        </div>
      </div>

      {/* Resilience score */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          SpillSense Demonstration Resilience Score
        </h2>
        <div className="flex items-center gap-6 mb-4">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
              <circle cx="50" cy="50" r="40" fill="none" stroke={resilience.color} strokeWidth="10"
                strokeDasharray={`${resilience.score * 2.51} 251`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-black text-2xl font-tabular" style={{ color: resilience.color }}>{resilience.score}</div>
              <div className="text-[9px] font-semibold" style={{ color: resilience.color }}>{resilience.band}</div>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {Object.entries(resilience.components).map(([k, v]) => {
              const labels: Record<string, { label: string; weight: string }> = {
                storageReliability: { label: "Storage Reliability", weight: "25%" },
                inflowOutlook: { label: "Inflow Outlook", weight: "15%" },
                floodBuffer: { label: "Flood Buffer", weight: "15%" },
                droughtExposure: { label: "Drought Exposure", weight: "15%" },
                demandPressure: { label: "Demand Pressure", weight: "10%" },
                captureCapacity: { label: "Capture Capacity", weight: "10%" },
                ecologicalReserve: { label: "Ecological Reserve", weight: "10%" },
              };
              const info = labels[k] ?? { label: k, weight: "" };
              return (
                <div key={k} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-32 shrink-0">{info.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${v}%`, background: resilience.color }} />
                  </div>
                  <span className="text-xs font-semibold w-8 text-right font-tabular">{v.toFixed(0)}</span>
                  <span className="text-[10px] text-muted-foreground w-8">{info.weight}</span>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-muted-foreground italic">
          "SpillSense Demonstration Resilience Score" — not a validated scientific index. All component weights are adjustable demonstration defaults.
        </p>
      </div>

      <DecisionNotice />
    </div>
  );
}
