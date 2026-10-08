import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import {
  generateInflowForecast, runRegretGuard, computeResilience, computeDailyDemand,
  computeCapture, CAPTURE_SITES, SCENARIOS, SAFE_CAPACITY_MCM, MIN_STORAGE_MCM,
  FULL_CAPACITY_MCM, storageToLevel, UNIT_CONVERSION
} from "@/lib/engine";
import { KpiCard, RiskBadge, StorageGauge } from "@/components/features/KpiCard";
import { SyntheticBadge, DataBadge, DecisionNotice } from "@/components/features/DataBadge";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, ReferenceLine
} from "recharts";
import { AlertTriangle, ChevronDown, ChevronUp, Droplets, Info, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { storageMCM, scenario, dailyDemandMCM, ecologicalMinMCM, unitSystem } = useApp();
  const [showWhyExpanded, setShowWhyExpanded] = useState(false);

  const forecast = useMemo(() => generateInflowForecast(scenario, storageMCM), [scenario, storageMCM]);
  const rg = useMemo(() => runRegretGuard(storageMCM, forecast, dailyDemandMCM, ecologicalMinMCM, scenario), [storageMCM, forecast, dailyDemandMCM, ecologicalMinMCM, scenario]);
  const resilience = useMemo(() => {
    const { totalCaptureMCM } = computeCapture(CAPTURE_SITES, rg.recommended.totalSpillMCM || 20);
    return computeResilience(storageMCM, scenario, dailyDemandMCM, totalCaptureMCM);
  }, [storageMCM, scenario, dailyDemandMCM, rg.recommended.totalSpillMCM]);

  const sc = SCENARIOS[scenario];
  const storagePct = (storageMCM / SAFE_CAPACITY_MCM * 100).toFixed(1);
  const levelFt = storageToLevel(storageMCM).toFixed(1);
  const spillRiskPct = (rg.recommended.spillRisk * 100).toFixed(0);
  const droughtRiskPct = (rg.recommended.droughtRisk * 100).toFixed(0);

  const totalInflow7d = forecast.reduce((s, d) => s + d.p50, 0).toFixed(0);
  const overallRisk = rg.recommended.spillRisk > 0.6 ? "HIGH"
    : rg.recommended.spillRisk > 0.35 ? "MODERATE"
    : rg.recommended.droughtRisk > 0.5 ? "HIGH"
    : rg.recommended.droughtRisk > 0.3 ? "MODERATE" : "SAFE";

  const chartData = rg.recommended.dailyStates.map((s, i) => ({
    day: `Day ${i + 1}`,
    storage: s.storageMCM.toFixed(0),
    inflow: forecast[i]?.p50.toFixed(1),
    p10: forecast[i]?.p10.toFixed(1),
    p90: forecast[i]?.p90.toFixed(1),
    spill: s.spill.toFixed(1),
    release: rg.recommended.dailyReleases[i]?.toFixed(1),
  }));

  const fanData = forecast.map(d => ({
    day: `D${d.day}`,
    p50: d.p50,
    p10: d.p10,
    p90: d.p90,
    band: [d.p10, d.p90] as [number, number],
  }));

  const capture = useMemo(() => computeCapture(CAPTURE_SITES, Math.max(rg.recommended.totalSpillMCM, 15)), [rg.recommended.totalSpillMCM]);

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Water Security Command Center</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Mettur Dam (Stanley Reservoir) · Cauvery River · Salem, TN</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SyntheticBadge />
          <RiskBadge level={overallRisk as any} />
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Current Storage"
          value={Math.round(storageMCM)}
          unit="MCM"
          subtext={`${storagePct}% capacity · ${levelFt} ft`}
          color="#22d3ee"
          badge={<DataBadge source="SYNTHETIC" />}
        />
        <KpiCard
          label="7-Day Inflow (P50)"
          value={Number(totalInflow7d)}
          unit="MCM"
          subtext={`${sc.label} scenario`}
          color="#8b5cf6"
          badge={<DataBadge source="MODEL_PREDICTION" />}
        />
        <KpiCard
          label="Spill Risk"
          value={Number(spillRiskPct)}
          unit="%"
          color={Number(spillRiskPct) > 50 ? "#ef4444" : Number(spillRiskPct) > 25 ? "#f97316" : "#10b981"}
          badge={<DataBadge source="CALCULATED" />}
        />
        <KpiCard
          label="Drought Risk"
          value={Number(droughtRiskPct)}
          unit="%"
          color={Number(droughtRiskPct) > 50 ? "#ef4444" : Number(droughtRiskPct) > 25 ? "#f59e0b" : "#10b981"}
          badge={<DataBadge source="CALCULATED" />}
        />
        <KpiCard
          label="Resilience Score"
          value={resilience.score}
          unit="/100"
          subtext={resilience.band}
          color={resilience.color}
          badge={<DataBadge source="CALCULATED" />}
        />
        <KpiCard
          label="Recommended Release"
          value={Math.round(rg.releaseRecommendationMCM)}
          unit="MCM/d"
          subtext={`≈ ${rg.releaseRecommendationCusecs.toLocaleString()} cusecs`}
          color="#10b981"
          badge={<DataBadge source="MODEL_PREDICTION" />}
        />
      </div>

      {/* Storage gauge */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Droplets className="w-4 h-4 text-primary" />
          Reservoir Storage Status
        </h2>
        <StorageGauge
          storageMCM={storageMCM}
          capacityMCM={SAFE_CAPACITY_MCM}
          floodLevelMCM={SAFE_CAPACITY_MCM}
          minLevelMCM={MIN_STORAGE_MCM}
        />
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* RegretGuard card */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="gradient-aqua px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white/70 text-xs font-medium uppercase tracking-wide">RegretGuard Recommendation</div>
                  <div className="text-white font-bold text-xl">{rg.recommended.label}</div>
                </div>
                <div className="text-right">
                  <div className="text-white/70 text-xs">Confidence</div>
                  <div className="text-white font-bold">{(rg.confidence * 100).toFixed(0)}%</div>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Release rate</span>
                <span className="font-bold font-tabular">{rg.releaseRecommendationMCM.toFixed(1)} MCM/d</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">In cusecs</span>
                <span className="font-semibold font-tabular">{rg.releaseRecommendationCusecs.toLocaleString()} cusecs</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Worst-case regret</span>
                <span className="font-semibold font-tabular text-amber-600 dark:text-amber-400">{rg.recommended.worstCaseRegret.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Safety status</span>
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
                  rg.recommended.safetyViolation ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                )}>
                  {rg.recommended.safetyViolation ? "⚠ Constraint Warning" : "✓ All Constraints Met"}
                </span>
              </div>

              {rg.rejectedPolicies.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-2.5 border border-red-200 dark:border-red-800">
                  <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Rejected Policies</div>
                  {rg.rejectedPolicies.map(p => (
                    <div key={p.policyId} className="text-xs text-red-500 dark:text-red-400">{p.label}: {p.rejectedReason}</div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowWhyExpanded(e => !e)}
                className="w-full flex items-center justify-between text-xs font-medium text-primary hover:text-primary/80 transition-colors pt-1 border-t border-border"
              >
                Why this policy?
                {showWhyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showWhyExpanded && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 leading-relaxed border border-border">
                  {rg.explanation}
                </div>
              )}
            </div>
          </div>

          {/* Spill-to-Store alert */}
          {rg.recommended.totalSpillMCM > 5 && (
            <div className="glass-card rounded-xl p-4 mt-4 border-l-4 border-l-emerald-500">
              <div className="flex items-start gap-2 mb-2">
                <Zap className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Spill-to-Store Alert</div>
                  <div className="text-xs text-muted-foreground">Potential release predicted within 36–48 hours</div>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Potential release</span>
                  <span className="font-semibold">{rg.recommended.totalSpillMCM.toFixed(1)} MCM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Potential capture</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{capture.totalCaptureMCM.toFixed(1)} MCM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Suitable sites</span>
                  <span className="font-semibold">{capture.suitableSiteCount}</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 italic">Operational verification required before any real-world release routing.</p>
            </div>
          )}
        </div>

        {/* Forecast fan chart */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">7-Day Probabilistic Inflow Forecast</h2>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-blue-400 rounded" />P10</div>
                <div className="flex items-center gap-1"><div className="w-3 h-1 bg-cyan-500 rounded" />P50</div>
                <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-purple-400 rounded" />P90</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={fanData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis unit=" MCM" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  formatter={(v: number, name: string) => [`${v.toFixed(1)} MCM`, name]}
                />
                <Area type="monotone" dataKey="p90" stroke="#8b5cf6" strokeWidth={1.5} fill="#8b5cf620" strokeDasharray="4 2" dot={false} />
                <Area type="monotone" dataKey="p50" stroke="#22d3ee" strokeWidth={2} fill="#22d3ee15" dot={false} />
                <Area type="monotone" dataKey="p10" stroke="#3b82f6" strokeWidth={1.5} fill="transparent" strokeDasharray="4 2" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <SyntheticBadge className="mt-2" />
          </div>

          {/* Storage projection */}
          <div className="glass-card rounded-xl p-5 mt-4">
            <h2 className="text-sm font-semibold mb-4">Reservoir Storage Projection (RegretGuard Policy)</h2>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis unit=" MCM" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  formatter={(v: number) => [`${Number(v).toFixed(0)} MCM`]}
                />
                <ReferenceLine y={SAFE_CAPACITY_MCM} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "Flood Control", position: "right", fontSize: 10, fill: "#ef4444" }} />
                <ReferenceLine y={MIN_STORAGE_MCM} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "Min", position: "right", fontSize: 10, fill: "#f59e0b" }} />
                <Line type="monotone" dataKey="storage" stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 4, fill: "#22d3ee" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <DecisionNotice />
    </div>
  );
}
