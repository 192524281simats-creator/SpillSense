import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import {
  generateInflowForecast, runRegretGuard, computeResilience, computeCapture,
  CAPTURE_SITES, SCENARIOS, SAFE_CAPACITY_MCM, MIN_STORAGE_MCM,
  storageToLevel, UNIT_CONVERSION
} from "@/lib/engine";
import { KpiCard, RiskBadge, StorageGauge } from "@/components/features/KpiCard";
import { SyntheticBadge, DataBadge, DecisionNotice } from "@/components/features/DataBadge";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, BarChart, Bar, Legend, Cell
} from "recharts";
import {
  ChevronDown, ChevronUp, Droplets, Zap, ArrowRight,
  TrendingDown, TrendingUp, AlertTriangle, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { storageMCM, scenario, dailyDemandMCM, ecologicalMinMCM } = useApp();
  const [showWhy, setShowWhy] = useState(false);

  const forecast = useMemo(() => generateInflowForecast(scenario, storageMCM), [scenario, storageMCM]);
  const rg = useMemo(() =>
    runRegretGuard(storageMCM, forecast, dailyDemandMCM, ecologicalMinMCM, scenario),
    [storageMCM, forecast, dailyDemandMCM, ecologicalMinMCM, scenario]
  );
  const resilience = useMemo(() => {
    const { totalCaptureMCM } = computeCapture(CAPTURE_SITES, Math.max(rg.recommended.totalSpillMCM, 20));
    return computeResilience(storageMCM, scenario, dailyDemandMCM, totalCaptureMCM);
  }, [storageMCM, scenario, dailyDemandMCM, rg.recommended.totalSpillMCM]);
  const capture = useMemo(() =>
    computeCapture(CAPTURE_SITES, Math.max(rg.recommended.totalSpillMCM, 15)),
    [rg.recommended.totalSpillMCM]
  );

  const sc = SCENARIOS[scenario];
  const storagePct = (storageMCM / SAFE_CAPACITY_MCM * 100).toFixed(1);
  const levelFt = storageToLevel(storageMCM).toFixed(1);
  const spillPct = Math.round(rg.recommended.spillRisk * 100);
  const droughtPct = Math.round(rg.recommended.droughtRisk * 100);
  const inflow7d = Math.round(forecast.reduce((s, d) => s + d.p50, 0));

  const overallRisk: "SAFE" | "MODERATE" | "HIGH" | "CRITICAL" =
    rg.recommended.spillRisk > 0.65 || rg.recommended.droughtRisk > 0.65 ? "HIGH" :
    rg.recommended.spillRisk > 0.35 || rg.recommended.droughtRisk > 0.35 ? "MODERATE" : "SAFE";

  const fanData = forecast.map(d => ({
    day: `D${d.day}`, p50: d.p50, p10: d.p10, p90: d.p90,
  }));

  const storageData = rg.recommended.dailyStates.map((s, i) => ({
    day: `D${i + 1}`,
    storage: Number(s.storageMCM.toFixed(0)),
    release: Number(rg.recommended.dailyReleases[i]?.toFixed(1)),
    spill: Number(s.spill.toFixed(1)),
  }));

  // Scenario comparison bar data
  const scenarioCompare = (["elnino", "neutral", "lanina"] as const).map(s => {
    const sc = SCENARIOS[s];
    return {
      name: sc.label,
      inflow: Math.round(35 * sc.inflowMultiplier * 7),
      color: sc.color,
    };
  });

  return (
    <div className="p-5 lg:p-6 space-y-5 pb-24 lg:pb-6 page-enter gradient-mesh min-h-full">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Water Security Command Center</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Mettur Dam (Stanley Reservoir) · Cauvery River · Salem, TN
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SyntheticBadge short />
          <RiskBadge level={overallRisk} />
        </div>
      </div>

      {/* ── KPI Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Current Storage"
          value={Math.round(storageMCM)}
          unit="MCM"
          subtext={`${storagePct}% · ${levelFt} ft`}
          color="#22d3ee"
          badge={<DataBadge source="SYNTHETIC" />}
        />
        <KpiCard
          label="7-Day Inflow (P50)"
          value={inflow7d}
          unit="MCM"
          subtext={sc.label}
          color="#8b5cf6"
          badge={<DataBadge source="MODEL_PREDICTION" />}
        />
        <KpiCard
          label="Spill Risk"
          value={spillPct}
          unit="%"
          color={spillPct > 50 ? "#ef4444" : spillPct > 25 ? "#f97316" : "#10b981"}
          badge={<DataBadge source="CALCULATED" />}
        />
        <KpiCard
          label="Drought Risk"
          value={droughtPct}
          unit="%"
          color={droughtPct > 50 ? "#ef4444" : droughtPct > 25 ? "#f59e0b" : "#10b981"}
          badge={<DataBadge source="CALCULATED" />}
        />
        <KpiCard
          label="Resilience Score"
          value={resilience.score}
          unit="/ 100"
          subtext={resilience.band}
          color={resilience.color}
          badge={<DataBadge source="CALCULATED" />}
        />
        <KpiCard
          label="Rec. Release"
          value={rg.releaseRecommendationMCM.toFixed(1)}
          unit="MCM/d"
          subtext={`${rg.releaseRecommendationCusecs.toLocaleString()} cusecs`}
          color="#10b981"
          badge={<DataBadge source="MODEL_PREDICTION" />}
        />
      </div>

      {/* ── Storage gauge ──────────────────────────────────── */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Droplets className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Reservoir Storage Status</h2>
        </div>
        <StorageGauge
          storageMCM={storageMCM}
          capacityMCM={SAFE_CAPACITY_MCM}
          floodLevelMCM={SAFE_CAPACITY_MCM}
          minLevelMCM={MIN_STORAGE_MCM}
        />
      </div>

      {/* ── Main grid ──────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* LEFT: RegretGuard card */}
        <div className="space-y-4">
          <div className="glass-card rounded-xl overflow-hidden">
            {/* Header strip */}
            <div className="gradient-aqua px-5 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-white/70 text-[10px] font-semibold uppercase tracking-widest mb-1">
                    RegretGuard Recommendation
                  </div>
                  <div className="text-white font-bold text-xl leading-tight">
                    {rg.recommended.label}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-white/60 text-[10px]">Confidence</div>
                  <div className="text-white font-bold text-lg font-tabular">
                    {(rg.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Release Rate", value: `${rg.releaseRecommendationMCM.toFixed(1)} MCM/d`, highlight: true },
                  { label: "In Cusecs", value: `${rg.releaseRecommendationCusecs.toLocaleString()}`, highlight: false },
                  { label: "Worst Regret", value: rg.recommended.worstCaseRegret.toFixed(1), highlight: false },
                  { label: "End Storage", value: `${rg.recommended.endStoragePct.toFixed(0)}%`, highlight: false },
                ].map(item => (
                  <div key={item.label} className="bg-muted/40 rounded-lg p-2.5">
                    <div className="text-[10px] text-muted-foreground font-medium">{item.label}</div>
                    <div className={cn("font-bold text-sm font-tabular mt-0.5", item.highlight && "text-primary")}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Safety status */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border",
                rg.recommended.safetyViolation
                  ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
              )}>
                {rg.recommended.safetyViolation
                  ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  : <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                {rg.recommended.safetyViolation ? "Constraint Warning" : "All Safety Constraints Met"}
              </div>

              {/* Rejected policies */}
              {rg.rejectedPolicies.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-3 border border-red-200 dark:border-red-800 space-y-1">
                  <div className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">
                    Rejected Policies
                  </div>
                  {rg.rejectedPolicies.map(p => (
                    <div key={p.policyId} className="text-xs text-red-500">{p.label}: {p.rejectedReason}</div>
                  ))}
                </div>
              )}

              {/* Why toggle */}
              <button
                onClick={() => setShowWhy(e => !e)}
                className="w-full flex items-center justify-between text-xs font-semibold text-primary
                           hover:text-primary/80 transition-colors pt-2 border-t border-border"
              >
                Why this policy?
                {showWhy ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showWhy && (
                <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 leading-relaxed border border-border animate-fade-in">
                  {rg.explanation}
                </div>
              )}

              <Link to="/regretguard"
                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-primary/30
                           text-primary text-xs font-semibold hover:bg-primary/5 transition-colors">
                View Full Analysis <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Spill-to-Store alert */}
          {rg.recommended.totalSpillMCM > 5 && (
            <div className="glass-card rounded-xl p-4 border-l-4 border-l-emerald-500 animate-fade-in">
              <div className="flex items-start gap-2.5 mb-3">
                <Zap className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Spill-to-Store Alert</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Potential release within 36–48 hours
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                {[
                  { label: "Release", value: `${rg.recommended.totalSpillMCM.toFixed(1)} MCM`, color: "#f97316" },
                  { label: "Capture", value: `${capture.totalCaptureMCM.toFixed(1)} MCM`, color: "#10b981" },
                  { label: "Sites", value: String(capture.suitableSiteCount), color: "#22d3ee" },
                ].map(item => (
                  <div key={item.label} className="bg-muted/40 rounded-lg p-2">
                    <div className="text-[10px] text-muted-foreground">{item.label}</div>
                    <div className="font-bold text-xs mt-0.5" style={{ color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <Link to="/spill-to-store"
                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg
                           bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400
                           text-xs font-semibold hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors">
                View Capture Map <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <p className="text-[10px] text-muted-foreground mt-2 italic text-center">
                Operational verification required before real-world routing.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT: Charts */}
        <div className="lg:col-span-2 space-y-4">

          {/* Fan chart */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">7-Day Probabilistic Inflow Forecast</h2>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-5 h-0.5 bg-blue-400 rounded inline-block" />P10</span>
                <span className="flex items-center gap-1"><span className="w-5 h-1 bg-cyan-500 rounded inline-block" />P50</span>
                <span className="flex items-center gap-1"><span className="w-5 h-0.5 bg-purple-400 rounded inline-block" />P90</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={fanData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis unit=" MCM" tick={{ fontSize: 11 }} width={52} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                  formatter={(v: number, name: string) => [`${Number(v).toFixed(1)} MCM`, name]}
                />
                <Area type="monotone" dataKey="p90" stroke="#8b5cf6" strokeWidth={1.5} fill="#8b5cf618" strokeDasharray="4 2" dot={false} name="P90" />
                <Area type="monotone" dataKey="p50" stroke="#22d3ee" strokeWidth={2.5} fill="#22d3ee18" dot={false} name="P50" />
                <Area type="monotone" dataKey="p10" stroke="#3b82f6" strokeWidth={1.5} fill="transparent" strokeDasharray="4 2" dot={false} name="P10" />
              </AreaChart>
            </ResponsiveContainer>
            <SyntheticBadge short className="mt-2" />
          </div>

          {/* Storage projection */}
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4">Storage Projection — RegretGuard Policy</h2>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={storageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis unit=" MCM" tick={{ fontSize: 11 }} width={52} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                  formatter={(v: number) => [`${Number(v).toFixed(0)} MCM`]}
                />
                <ReferenceLine y={SAFE_CAPACITY_MCM} stroke="#ef4444" strokeDasharray="4 2"
                  label={{ value: "Flood ctrl", position: "insideTopRight", fontSize: 9, fill: "#ef4444" }} />
                <ReferenceLine y={MIN_STORAGE_MCM} stroke="#f59e0b" strokeDasharray="4 2"
                  label={{ value: "Min", position: "insideBottomRight", fontSize: 9, fill: "#f59e0b" }} />
                <Line type="monotone" dataKey="storage" name="Storage" stroke="#22d3ee" strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "#22d3ee", strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Scenario comparison */}
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-1">Scenario Comparison — 7-Day P50 Inflow</h2>
            <p className="text-[10px] text-muted-foreground mb-4">
              Climate information modifies scenario probabilities; it does not determine a single future.
            </p>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={scenarioCompare} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" unit=" MCM" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={60} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                  formatter={(v: number) => [`${v} MCM`, "7-Day Inflow (P50)"]}
                />
                <Bar dataKey="inflow" name="7-Day Inflow" radius={[0, 4, 4, 0]}>
                  {scenarioCompare.map(entry => (
                    <Cell key={entry.name} fill={entry.color} opacity={entry.name === sc.label ? 1 : 0.4} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <DecisionNotice />
    </div>
  );
}
