import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import {
  generateInflowForecast, runRegretGuard, POLICIES, type PolicyId
} from "@/lib/engine";
import { SyntheticBadge, DataBadge, DecisionNotice } from "@/components/features/DataBadge";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell
} from "recharts";
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const POLICY_ORDER: PolicyId[] = ["hold", "conservative", "aggressive", "adaptive", "regretguard"];

export default function RegretGuardPage() {
  const { storageMCM, scenario, dailyDemandMCM, ecologicalMinMCM } = useApp();
  const [simulated, setSimulated] = useState(true);
  const [expandedPolicy, setExpandedPolicy] = useState<PolicyId | null>(null);

  const forecast = useMemo(() => generateInflowForecast(scenario, storageMCM), [scenario, storageMCM]);
  const rg = useMemo(() => runRegretGuard(storageMCM, forecast, dailyDemandMCM, ecologicalMinMCM, scenario), [storageMCM, forecast, dailyDemandMCM, ecologicalMinMCM, scenario]);

  const regretTableData = POLICY_ORDER.map(pid => ({
    policy: POLICIES[pid].label,
    policyId: pid,
    dry: rg.regretTable[pid]?.dry ?? 0,
    normal: rg.regretTable[pid]?.normal ?? 0,
    wet: rg.regretTable[pid]?.wet ?? 0,
    worst: rg.regretTable[pid]?.worst ?? 0,
    isRecommended: pid === rg.recommended.policyId,
  }));

  const heatmapMax = Math.max(...regretTableData.map(r => r.worst), 1);

  function heatColor(val: number) {
    const ratio = val / heatmapMax;
    if (ratio < 0.2) return "#10b981";
    if (ratio < 0.45) return "#f59e0b";
    if (ratio < 0.7) return "#f97316";
    return "#ef4444";
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">RegretGuard Decision Engine</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Least-Regret Release Strategy · Lowest Worst-Case Regret</p>
        </div>
        <div className="flex items-center gap-2">
          <SyntheticBadge />
          <button
            onClick={() => setSimulated(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-aqua text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Simulate All Policies
          </button>
        </div>
      </div>

      {/* Recommended banner */}
      <div className="glass-card rounded-xl overflow-hidden border-2 border-primary/30">
        <div className="gradient-aqua px-5 py-4 flex items-center gap-3">
          <Trophy className="w-6 h-6 text-white" />
          <div>
            <div className="text-white/70 text-xs font-medium uppercase tracking-wide">Recommended Policy</div>
            <div className="text-white font-bold text-2xl">{rg.recommended.label}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-white/70 text-xs">Worst-Case Regret</div>
            <div className="text-white font-bold text-xl font-tabular">{rg.recommended.worstCaseRegret.toFixed(1)}</div>
          </div>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{rg.explanation}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Release</div>
              <div className="font-bold">{rg.releaseRecommendationMCM.toFixed(1)} MCM/d</div>
              <div className="text-xs text-muted-foreground">{rg.releaseRecommendationCusecs.toLocaleString()} cusecs</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Spill Risk</div>
              <div className="font-bold">{(rg.recommended.spillRisk * 100).toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Drought Risk</div>
              <div className="font-bold">{(rg.recommended.droughtRisk * 100).toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Confidence</div>
              <div className="font-bold">{(rg.confidence * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Regret Heatmap */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">Regret Matrix (Dry / Normal / Wet / Worst-Case)</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Low
            <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Medium
            <span className="w-3 h-3 rounded bg-red-500 inline-block" /> High
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Policy</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Dry Regret</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Normal Regret</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Wet Regret</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Worst-Case</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Safety</th>
              </tr>
            </thead>
            <tbody>
              {regretTableData.map((row) => {
                const policy = rg.allPolicies.find(p => p.policyId === row.policyId)!;
                return (
                  <tr
                    key={row.policyId}
                    className={cn(
                      "border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer",
                      row.isRecommended && "bg-primary/5 border-l-2 border-l-primary"
                    )}
                    onClick={() => setExpandedPolicy(expandedPolicy === row.policyId ? null : row.policyId)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: POLICIES[row.policyId].color }} />
                        <span className={cn("font-medium", row.isRecommended && "text-primary font-bold")}>
                          {row.policy}
                          {row.isRecommended && <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">★ Selected</span>}
                        </span>
                      </div>
                    </td>
                    {[row.dry, row.normal, row.wet, row.worst].map((val, i) => (
                      <td key={i} className="px-4 py-3 text-right font-tabular">
                        <span className="inline-block px-2 py-0.5 rounded text-white text-xs font-bold" style={{ background: heatColor(val) }}>
                          {val.toFixed(1)}
                        </span>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      {policy.safetyViolation ? (
                        <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Expanded policy detail */}
        {expandedPolicy && (() => {
          const policy = rg.allPolicies.find(p => p.policyId === expandedPolicy)!;
          return (
            <div className="border-t border-border bg-muted/20 p-5">
              <h3 className="font-semibold text-sm mb-3">{policy.label} — Detail</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div><div className="text-muted-foreground">Total Spill</div><div className="font-bold">{policy.totalSpillMCM.toFixed(1)} MCM</div></div>
                <div><div className="text-muted-foreground">Total Release</div><div className="font-bold">{policy.totalReleaseMCM.toFixed(1)} MCM</div></div>
                <div><div className="text-muted-foreground">End Storage</div><div className="font-bold">{policy.endStorageMCM.toFixed(0)} MCM ({policy.endStoragePct.toFixed(0)}%)</div></div>
                <div><div className="text-muted-foreground">Emergency Days</div><div className="font-bold">{policy.emergencyDays}</div></div>
              </div>
              {policy.rejectedReason && (
                <div className="mt-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs p-3 rounded-lg border border-red-200 dark:border-red-800 font-medium">
                  REJECTED — {policy.rejectedReason}
                </div>
              )}
              <div className="mt-3 text-xs text-muted-foreground">{POLICIES[expandedPolicy].description}</div>
            </div>
          );
        })()}
      </div>

      {/* Bar chart comparison */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4">Worst-Case Regret Comparison</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={regretTableData} margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="policy" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
            />
            <Bar dataKey="worst" name="Worst-Case Regret" radius={[4, 4, 0, 0]}>
              {regretTableData.map((entry) => (
                <Cell
                  key={entry.policyId}
                  fill={entry.isRecommended ? "#22d3ee" : heatColor(entry.worst)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Model Assumptions */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center justify-between cursor-pointer"
          onClick={() => setExpandedPolicy(expandedPolicy === "hold" ? null : "hold")}>
          <h2 className="text-sm font-semibold">Model Assumptions & Loss Function</h2>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="p-5 text-sm text-muted-foreground space-y-2">
          <p><strong className="text-foreground">Loss function:</strong> L = 1.0 × spill_MCM + 1.5 × shortage_MCM + 0.5 × emergency_days</p>
          <p><strong className="text-foreground">Regret:</strong> Loss(policy, future) minus minimum loss across all policies for that future</p>
          <p><strong className="text-foreground">Worst-case regret:</strong> max(regret_dry, regret_normal, regret_wet) — minimax criterion</p>
          <p><strong className="text-foreground">Futures simulated:</strong> Dry (P10 inflow × 0.3 weight), Normal (P50), Wet (P90 × 1.8 weight)</p>
          <p><strong className="text-foreground">Safety gates (override optimisation):</strong> ecological min flow &lt; 12 m³/s → reject; end storage &lt; 85% of min → reject; release &gt; max limit → reject</p>
          <p className="text-xs italic">All weights are demonstration defaults. The system accepts configurable weight inputs. This is not a scientifically validated operational model.</p>
        </div>
      </div>

      <DecisionNotice />
    </div>
  );
}
