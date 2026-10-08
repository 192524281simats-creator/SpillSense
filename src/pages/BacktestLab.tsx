import { useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import { runBacktest, SAFE_CAPACITY_MCM, MIN_STORAGE_MCM } from "@/lib/engine";
import { SyntheticBadge, DataBadge, DecisionNotice } from "@/components/features/DataBadge";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, BarChart, Bar, Cell
} from "recharts";
import { Play, TrendingDown, CloudRain, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

type Season = "wet" | "deficit";

export default function BacktestLab() {
  const [season, setSeason] = useState<Season>("wet");
  const [seed, setSeed] = useState(42);
  const [ran, setRan] = useState(true);

  const result = useMemo(() => ran ? runBacktest(season, seed) : null, [ran, season, seed]);

  const runIt = () => setRan(true);

  const spillAvoided = result ? result.spillAvoidedMCM : 0;
  const emergAvoided = result ? result.emergencyDaysRuleCurve - result.emergencyDaysRegretGuard : 0;
  const endDiff = result ? result.endStorageDifference_MCM : 0;

  const headlines = [
    {
      label: "Spill Potentially Avoided",
      value: result ? `${Math.abs(spillAvoided).toFixed(1)} MCM` : "—",
      sub: result ? `${Math.abs(result.spillAvoidedTMC).toFixed(3)} TMC` : "",
      color: spillAvoided >= 0 ? "#10b981" : "#f97316",
      icon: TrendingDown,
      note: spillAvoided >= 0 ? "RegretGuard reduced spill" : "Rule curve had less spill",
    },
    {
      label: "Emergency Days Avoided",
      value: result ? `${Math.abs(emergAvoided)}` : "—",
      sub: "days",
      color: emergAvoided >= 0 ? "#10b981" : "#f97316",
      icon: Calendar,
      note: emergAvoided >= 0 ? "Fewer high-release days" : "More emergency days",
    },
    {
      label: "End-Storage Difference",
      value: result ? `${Math.abs(endDiff).toFixed(1)} MCM` : "—",
      sub: endDiff >= 0 ? "RegretGuard retained more" : "Rule curve retained more",
      color: endDiff >= 0 ? "#22d3ee" : "#f59e0b",
      icon: CloudRain,
      note: endDiff >= 0 ? "RegretGuard ended with more storage" : "Rule curve ended with more storage",
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Backtest Lab</h1>
          <p className="text-muted-foreground text-sm">Rule Curve vs SpillSense RegretGuard — simulated historical season</p>
        </div>
        <SyntheticBadge />
      </div>

      {/* Controls */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Season</label>
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {(["wet", "deficit"] as Season[]).map(s => (
                <button key={s} onClick={() => { setSeason(s); setRan(false); }}
                  className={cn("px-4 py-1.5 rounded text-xs font-semibold transition-all capitalize",
                    season === s ? "gradient-aqua text-white" : "text-muted-foreground hover:text-foreground"
                  )}>
                  {s === "wet" ? "La Niña Wet" : "El Niño Deficit"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Seed (reproducibility)</label>
            <input
              type="number" value={seed} onChange={e => { setSeed(Number(e.target.value)); setRan(false); }}
              className="w-24 text-sm px-3 py-1.5 rounded-lg border border-border bg-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button onClick={runIt}
            className="flex items-center gap-2 px-5 py-2 rounded-lg gradient-aqua text-white text-sm font-semibold hover:opacity-90 transition-opacity">
            <Play className="w-4 h-4" /> Run Backtest
          </button>
          <div>
            {result && <DataBadge source="SYNTHETIC" />}
            {result && <span className="text-xs text-muted-foreground ml-2">{result.forecastMethod}</span>}
          </div>
        </div>
      </div>

      {result && (
        <>
          {/* Headlines */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {headlines.map(h => (
              <div key={h.label} className="glass-card rounded-xl p-5 border-l-4" style={{ borderLeftColor: h.color }}>
                <div className="flex items-center gap-2 mb-2">
                  <h.icon className="w-4 h-4" style={{ color: h.color }} />
                  <span className="text-xs text-muted-foreground font-medium">{h.label}</span>
                </div>
                <div className="kpi-number font-tabular" style={{ color: h.color }}>{h.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{h.sub}</div>
                <div className="text-[10px] italic text-muted-foreground mt-1">{h.note}</div>
              </div>
            ))}
          </div>

          {/* Summary table */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold">Season Summary</h2>
              <DataBadge source="SYNTHETIC" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Metric</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Rule Curve</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-cyan-500">RegretGuard</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Total Spill (MCM)", result.totalSpillRuleCurve_MCM.toFixed(1), result.totalSpillRegretGuard_MCM.toFixed(1), result.spillAvoidedMCM.toFixed(1)],
                    ["Total Spill (TMC)", (result.totalSpillRuleCurve_MCM * 0.0353).toFixed(3), (result.totalSpillRegretGuard_MCM * 0.0353).toFixed(3), result.spillAvoidedTMC.toFixed(3)],
                    ["Emergency Days", String(result.emergencyDaysRuleCurve), String(result.emergencyDaysRegretGuard), String(result.emergencyDaysRuleCurve - result.emergencyDaysRegretGuard)],
                    ["End Storage (MCM)", result.endStorageRuleCurve_MCM.toFixed(0), result.endStorageRegretGuard_MCM.toFixed(0), result.endStorageDifference_MCM.toFixed(0)],
                    ["Min Storage (MCM)", result.minStorageRuleCurve.toFixed(0), result.minStorageRegretGuard.toFixed(0), (result.minStorageRegretGuard - result.minStorageRuleCurve).toFixed(0)],
                    ["Eco Violations", String(result.ecologicalViolationsRuleCurve), String(result.ecologicalViolationsRegretGuard), String(result.ecologicalViolationsRuleCurve - result.ecologicalViolationsRegretGuard)],
                  ].map(([label, rc, rg, diff]) => (
                    <tr key={label} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-5 py-3 font-medium text-sm">{label}</td>
                      <td className="px-4 py-3 text-right font-tabular">{rc}</td>
                      <td className="px-4 py-3 text-right font-tabular text-cyan-500 font-semibold">{rg}</td>
                      <td className={cn("px-4 py-3 text-right font-tabular font-semibold",
                        Number(diff) > 0 ? "text-emerald-500" : Number(diff) < 0 ? "text-red-500" : "text-muted-foreground"
                      )}>
                        {Number(diff) > 0 ? "+" : ""}{diff}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Storage comparison chart */}
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4">Storage Trajectory — {season === "wet" ? "La Niña Wet Season" : "El Niño Deficit Season"}</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={result.days.filter((_, i) => i % 2 === 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis unit=" MCM" tick={{ fontSize: 11 }} domain={["auto", SAFE_CAPACITY_MCM * 1.05]} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend />
                <ReferenceLine y={SAFE_CAPACITY_MCM} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "Flood Control", position: "right", fontSize: 9, fill: "#ef4444" }} />
                <ReferenceLine y={MIN_STORAGE_MCM} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "Min Op.", position: "right", fontSize: 9, fill: "#f59e0b" }} />
                <Line type="monotone" dataKey="storageRuleCurve" name="Rule Curve" stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="6 2" />
                <Line type="monotone" dataKey="storageRegretGuard" name="RegretGuard" stroke="#22d3ee" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Spill comparison */}
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4">Daily Spill Comparison</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={result.days.filter((_, i) => i % 3 === 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis unit=" MCM" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend />
                <Bar dataKey="spillRuleCurve" name="Spill (Rule Curve)" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                <Bar dataKey="spillRegretGuard" name="Spill (RegretGuard)" fill="#22d3ee" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Auto conclusion */}
          <div className="glass-card rounded-xl p-5 border-l-4 border-l-primary">
            <h2 className="text-sm font-semibold mb-2">Backtest Conclusion (Auto-Generated)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.conclusion}</p>
            <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
              <div>Data label: <span className="italic">{result.dataLabel}</span></div>
              <div>Method: <span className="italic">{result.forecastMethod}</span></div>
            </div>
          </div>
        </>
      )}

      <DecisionNotice />
    </div>
  );
}
