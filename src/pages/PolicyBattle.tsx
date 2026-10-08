import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import {
  generateInflowForecast, runRegretGuard, simulatePolicy, POLICIES, type PolicyId
} from "@/lib/engine";
import { SyntheticBadge, DataBadge, DecisionNotice } from "@/components/features/DataBadge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell, Legend
} from "recharts";
import { Trophy, CheckCircle, XCircle, ArrowUpDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const POLICY_IDS: PolicyId[] = ["hold", "conservative", "aggressive", "adaptive", "regretguard"];

type SortKey = "spillRisk" | "droughtRisk" | "endStoragePct" | "worstCaseRegret";

export default function PolicyBattle() {
  const { storageMCM, scenario, dailyDemandMCM, ecologicalMinMCM } = useApp();
  const [sortKey, setSortKey] = useState<SortKey>("worstCaseRegret");
  const [sortAsc, setSortAsc] = useState(true);
  const [filterSafe, setFilterSafe] = useState(false);
  const [simDone, setSimDone] = useState(true);

  const forecast = useMemo(() => generateInflowForecast(scenario, storageMCM), [scenario, storageMCM]);
  const rg = useMemo(() => runRegretGuard(storageMCM, forecast, dailyDemandMCM, ecologicalMinMCM, scenario), [storageMCM, forecast, dailyDemandMCM, ecologicalMinMCM, scenario]);

  const sorted = useMemo(() => {
    let policies = [...rg.allPolicies];
    if (filterSafe) policies = policies.filter(p => !p.safetyViolation);
    return policies.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      return sortAsc ? av - bv : bv - av;
    });
  }, [rg.allPolicies, sortKey, sortAsc, filterSafe]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const radarData = [
    { metric: "Spill Risk", ...Object.fromEntries(POLICY_IDS.map(id => [POLICIES[id].label, (1 - (rg.allPolicies.find(p => p.policyId === id)?.spillRisk ?? 0)) * 100])) },
    { metric: "Drought Safety", ...Object.fromEntries(POLICY_IDS.map(id => [POLICIES[id].label, (1 - (rg.allPolicies.find(p => p.policyId === id)?.droughtRisk ?? 0)) * 100])) },
    { metric: "Storage Retained", ...Object.fromEntries(POLICY_IDS.map(id => [POLICIES[id].label, rg.allPolicies.find(p => p.policyId === id)?.endStoragePct ?? 0])) },
    { metric: "Low Regret", ...Object.fromEntries(POLICY_IDS.map(id => [POLICIES[id].label, Math.max(0, 100 - (rg.allPolicies.find(p => p.policyId === id)?.worstCaseRegret ?? 0))])) },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Policy Battle</h1>
          <p className="text-muted-foreground text-sm">Compare all release strategies head-to-head</p>
        </div>
        <div className="flex items-center gap-2">
          <SyntheticBadge />
          <button
            onClick={() => setFilterSafe(f => !f)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
              filterSafe ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700"
                : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            {filterSafe ? "Safe Only" : "All Policies"}
          </button>
          <button
            onClick={() => setSimDone(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg gradient-aqua text-white text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Simulate All Policies
          </button>
        </div>
      </div>

      {/* Winner banner */}
      <div className="glass-card rounded-xl p-5 border-l-4" style={{ borderLeftColor: POLICIES[rg.recommended.policyId].color }}>
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-amber-500" />
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">RegretGuard Winner</div>
            <div className="font-bold text-xl" style={{ color: POLICIES[rg.recommended.policyId].color }}>{rg.recommended.label}</div>
          </div>
          <div className="ml-auto text-right text-sm">
            <div className="text-muted-foreground text-xs">Worst-case regret: <span className="font-bold text-foreground">{rg.recommended.worstCaseRegret.toFixed(1)}</span></div>
            <div className="text-muted-foreground text-xs">Safe policies: <span className="font-bold text-foreground">{rg.safePolicies.length}/{rg.allPolicies.length}</span></div>
          </div>
        </div>
      </div>

      {/* Policy cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map(policy => (
          <div
            key={policy.policyId}
            className={cn(
              "glass-card rounded-xl overflow-hidden transition-all hover:shadow-card-hover",
              policy.policyId === rg.recommended.policyId && "ring-2 ring-primary",
              policy.safetyViolation && "opacity-75"
            )}
          >
            <div className="h-1.5" style={{ background: policy.color }} />
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: policy.color }} />
                  <span className="font-semibold text-sm">{policy.label}</span>
                </div>
                {policy.policyId === rg.recommended.policyId && (
                  <Trophy className="w-4 h-4 text-amber-500" />
                )}
                {policy.safetyViolation ? (
                  <XCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Spill Risk</span>
                  <span className={cn("font-semibold", policy.spillRisk > 0.5 ? "text-red-500" : policy.spillRisk > 0.25 ? "text-amber-500" : "text-emerald-500")}>
                    {(policy.spillRisk * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Drought Risk</span>
                  <span className={cn("font-semibold", policy.droughtRisk > 0.5 ? "text-red-500" : policy.droughtRisk > 0.25 ? "text-amber-500" : "text-emerald-500")}>
                    {(policy.droughtRisk * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End Storage</span>
                  <span className="font-semibold">{policy.endStorageMCM.toFixed(0)} MCM ({policy.endStoragePct.toFixed(0)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Spill</span>
                  <span className="font-semibold">{policy.totalSpillMCM.toFixed(1)} MCM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Worst Regret</span>
                  <span className={cn("font-semibold", policy.worstCaseRegret === Math.min(...rg.allPolicies.map(p => p.worstCaseRegret)) ? "text-emerald-500" : "")}>
                    {policy.worstCaseRegret.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Safety</span>
                  <span className={cn("font-semibold text-[11px]",
                    policy.safetyViolation ? "text-red-500" : "text-emerald-500"
                  )}>
                    {policy.safetyViolation ? "REJECTED" : "COMPLIANT"}
                  </span>
                </div>
              </div>

              {policy.safetyViolation && (
                <div className="mt-3 bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-[10px] text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                  {policy.rejectedReason}
                </div>
              )}

              {/* Mini bar */}
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Spill</span>
                  <span>Drought</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                  <div className="bg-red-400" style={{ width: `${policy.spillRisk * 50}%` }} />
                  <div className="bg-amber-400" style={{ width: `${policy.droughtRisk * 50}%` }} />
                  <div className="flex-1 bg-emerald-200 dark:bg-emerald-900/30" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">Full Comparison Table</h2>
          <DataBadge source="CALCULATED" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Policy</th>
                {[
                  { key: "spillRisk" as SortKey, label: "Spill Risk" },
                  { key: "droughtRisk" as SortKey, label: "Drought Risk" },
                  { key: "endStoragePct" as SortKey, label: "End Storage" },
                  { key: "worstCaseRegret" as SortKey, label: "Worst Regret" },
                ].map(col => (
                  <th
                    key={col.key}
                    className="text-right px-4 py-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none"
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className="flex items-center justify-end gap-1">
                      {col.label} <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                ))}
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Safety</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => (
                <tr key={p.policyId} className={cn(
                  "border-b border-border/50 hover:bg-muted/20",
                  p.policyId === rg.recommended.policyId && "bg-primary/5"
                )}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                      <span className="font-medium">{p.label}</span>
                      {p.policyId === rg.recommended.policyId && <Trophy className="w-3 h-3 text-amber-500" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-tabular">{(p.spillRisk * 100).toFixed(0)}%</td>
                  <td className="px-4 py-3 text-right font-tabular">{(p.droughtRisk * 100).toFixed(0)}%</td>
                  <td className="px-4 py-3 text-right font-tabular">{p.endStoragePct.toFixed(0)}%</td>
                  <td className="px-4 py-3 text-right font-tabular">{p.worstCaseRegret.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center">
                    {p.safetyViolation
                      ? <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                      : <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DecisionNotice />
    </div>
  );
}
