/**
 * Water Allocation Page
 * Tier-based priority allocation of available reservoir water to downstream users.
 * All data is SYNTHETIC DEMO DATA.
 */
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import {
  generateInflowForecast, runRegretGuard, SCENARIOS, SAFE_CAPACITY_MCM,
  computeDailyDemand, DEFAULT_DEMAND, type ScenarioType
} from "@/lib/engine";
import { SyntheticBadge, DataBadge, DecisionNotice } from "@/components/features/DataBadge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend
} from "recharts";
import { Droplets, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Community / User Data ─────────────────────────────────────────────────────

interface Community {
  id: string;
  name: string;
  type: "drinking" | "agriculture" | "industry" | "environment";
  tier: 1 | 2 | 3 | 4 | 5;
  demandMCM: number; // per week
}

const COMMUNITIES: Community[] = [
  { id: "c1", name: "Salem Municipal Water",      type: "drinking",     tier: 1, demandMCM: 8.4 },
  { id: "c2", name: "Mettur Town Scheme",         type: "drinking",     tier: 1, demandMCM: 2.8 },
  { id: "c3", name: "Ecological Reserve Flow",    type: "environment",  tier: 2, demandMCM: 7.3 },
  { id: "c4", name: "Cauvery Delta Irrigation",   type: "agriculture",  tier: 3, demandMCM: 32.5 },
  { id: "c5", name: "Canal Irrigation Blocks",    type: "agriculture",  tier: 3, demandMCM: 18.2 },
  { id: "c6", name: "TANGEDCO Power Plant",       type: "industry",     tier: 4, demandMCM: 6.1 },
  { id: "c7", name: "Bhavani Industries",         type: "industry",     tier: 4, demandMCM: 3.4 },
  { id: "c8", name: "Small Irrigation Tanks",     type: "agriculture",  tier: 5, demandMCM: 4.8 },
];

const TIER_LABELS: Record<number, string> = {
  1: "Tier 1 — Drinking Water",
  2: "Tier 2 — Ecological",
  3: "Tier 3 — Agriculture",
  4: "Tier 4 — Industry",
  5: "Tier 5 — Supplemental",
};

const TIER_COLORS: Record<number, string> = {
  1: "#22d3ee", 2: "#10b981", 3: "#f59e0b", 4: "#8b5cf6", 5: "#64748b",
};

const TYPE_COLORS: Record<Community["type"], string> = {
  drinking:    "#22d3ee",
  environment: "#10b981",
  agriculture: "#f59e0b",
  industry:    "#8b5cf6",
};

// ─── Allocation logic ──────────────────────────────────────────────────────────

interface AllocationResult extends Community {
  suppliedMCM: number;
  shortfallMCM: number;
  pctMet: number;
  status: "full" | "partial" | "shortfall";
}

function allocateWater(availableMCM: number, communities: Community[]): AllocationResult[] {
  let remaining = availableMCM;
  const results: AllocationResult[] = [];
  const sorted = [...communities].sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id));

  // Group by tier, process tier by tier
  const tiers = [1, 2, 3, 4, 5] as const;
  for (const tier of tiers) {
    const tierItems = sorted.filter(c => c.tier === tier);
    const tierDemand = tierItems.reduce((s, c) => s + c.demandMCM, 0);

    if (remaining <= 0) {
      for (const c of tierItems)
        results.push({ ...c, suppliedMCM: 0, shortfallMCM: c.demandMCM, pctMet: 0, status: "shortfall" });
    } else if (remaining >= tierDemand) {
      // Full supply for tier
      for (const c of tierItems) {
        results.push({ ...c, suppliedMCM: c.demandMCM, shortfallMCM: 0, pctMet: 100, status: "full" });
      }
      remaining -= tierDemand;
    } else {
      // Pro-rata within tier
      const ratio = remaining / tierDemand;
      for (const c of tierItems) {
        const supplied = c.demandMCM * ratio;
        const shortfall = c.demandMCM - supplied;
        results.push({
          ...c,
          suppliedMCM: Math.round(supplied * 100) / 100,
          shortfallMCM: Math.round(shortfall * 100) / 100,
          pctMet: Math.round(ratio * 100),
          status: "partial",
        });
      }
      remaining = 0;
    }
  }

  return results;
}

// ─── Sankey component ──────────────────────────────────────────────────────────

interface SankeyProps {
  available: number;
  results: AllocationResult[];
}

function SankeyFlow({ available, results }: SankeyProps) {
  const totalSupplied = results.reduce((s, r) => s + r.suppliedMCM, 0);
  const totalDemand   = results.reduce((s, r) => s + r.demandMCM, 0);
  const height = 340;
  const width = 500;
  const sourceX = 80, targetX = 290, labelX = 310;
  const sourceW = 20, targetW = 14;

  // Source block height
  const sourceH = Math.min(280, (totalSupplied / totalDemand) * 280 + 20);
  const sourceY = (height - sourceH) / 2;

  // Each community row
  const sorted = [...results].sort((a, b) => a.tier - b.tier);
  const spacing = 8;
  const totalBandHeight = height - (sorted.length - 1) * spacing;
  const maxDemand = Math.max(...results.map(r => r.demandMCM));

  let curY = 0;
  const rows = sorted.map(r => {
    const bandH = Math.max(18, (r.demandMCM / totalDemand) * totalBandHeight);
    const y = curY;
    curY += bandH + spacing;
    return { ...r, y, bandH };
  });
  const totalH = curY - spacing;
  const offsetY = (height - totalH) / 2;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[500px] mx-auto" style={{ minHeight: height }}>
        {/* Source block: Mettur Reservoir */}
        <rect x={sourceX} y={sourceY} width={sourceW} height={sourceH}
          rx={6} fill="#22d3ee" opacity={0.9} />
        <text x={sourceX + sourceW / 2} y={sourceY - 8} textAnchor="middle"
          fontSize={10} fontWeight={700} fill="hsl(var(--foreground))" opacity={0.7}>
          Mettur
        </text>
        <text x={sourceX + sourceW / 2} y={sourceY - 18} textAnchor="middle"
          fontSize={9} fill="hsl(var(--muted-foreground))">
          {available.toFixed(1)} MCM
        </text>

        {rows.map((r, i) => {
          const y = r.y + offsetY;
          const bandH = r.bandH;
          const midSource = sourceY + sourceH / 2;
          const midTarget = y + bandH / 2;
          const color = TYPE_COLORS[r.type];
          const supplied = r.suppliedMCM;
          const frac = Math.min(1, supplied / r.demandMCM);
          const supplyH = Math.max(4, bandH * frac);
          const shortH = bandH - supplyH;

          // Bezier path
          const cx1 = (sourceX + sourceW + targetX) / 2;
          const cx2 = cx1;

          const pathFull = `M ${sourceX + sourceW},${midSource} C ${cx1},${midSource} ${cx2},${midTarget} ${targetX},${midTarget}`;

          return (
            <g key={r.id}>
              {/* Flow band */}
              <path d={pathFull} fill="none" stroke={color} strokeWidth={Math.max(2, bandH * 0.6)}
                opacity={0.18} />
              <path d={pathFull} fill="none" stroke={color} strokeWidth={Math.max(2, supplyH * 0.55)}
                opacity={0.7} />

              {/* Demand bar (background) */}
              <rect x={targetX} y={y} width={targetW} height={bandH}
                rx={3} fill={color} opacity={0.15} />
              {/* Supply bar */}
              <rect x={targetX} y={y} width={targetW} height={supplyH}
                rx={3} fill={color} opacity={0.85} />

              {/* Label */}
              <text x={labelX} y={y + bandH / 2 + 1} fontSize={9} fill="hsl(var(--foreground))" opacity={0.75}
                dominantBaseline="middle">
                {r.name.length > 24 ? r.name.slice(0, 23) + "…" : r.name}
              </text>
              <text x={labelX + 154} y={y + bandH / 2 + 1} fontSize={8.5} fontWeight={700}
                fill={r.status === "full" ? "#10b981" : r.status === "partial" ? "#f59e0b" : "#ef4444"}
                textAnchor="end" dominantBaseline="middle">
                {r.pctMet}%
              </text>
            </g>
          );
        })}

        {/* Remaining label */}
        {available - totalSupplied > 0.5 && (
          <>
            <rect x={sourceX} y={sourceY + sourceH} width={sourceW} height={8}
              rx={3} fill="#64748b" opacity={0.4} />
            <text x={sourceX + sourceW / 2} y={sourceY + sourceH + 20} textAnchor="middle"
              fontSize={8} fill="hsl(var(--muted-foreground))">
              Surplus
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AllocationPage() {
  const { storageMCM, scenario, setScenario, dailyDemandMCM, ecologicalMinMCM } = useApp();
  const [activeTab, setActiveTab] = useState<"overview" | "community" | "sankey">("overview");

  const forecast = useMemo(() => generateInflowForecast(scenario, storageMCM), [scenario, storageMCM]);
  const rg = useMemo(() =>
    runRegretGuard(storageMCM, forecast, dailyDemandMCM, ecologicalMinMCM, scenario),
    [storageMCM, forecast, dailyDemandMCM, ecologicalMinMCM, scenario]
  );

  // Weekly available = 7-day projected total release from recommended policy
  const availableWeekMCM = rg.recommended.totalReleaseMCM;
  const results = useMemo(() => allocateWater(availableWeekMCM, COMMUNITIES), [availableWeekMCM]);

  const totalDemand   = results.reduce((s, r) => s + r.demandMCM, 0);
  const totalSupplied = results.reduce((s, r) => s + r.suppliedMCM, 0);
  const totalShortfall = results.reduce((s, r) => s + r.shortfallMCM, 0);
  const remainingMCM  = Math.max(0, availableWeekMCM - totalSupplied);

  const sc = SCENARIOS[scenario];
  const scenarioBtns: ScenarioType[] = ["elnino", "neutral", "lanina"];

  // Bar chart data by tier
  const tierChart = [1, 2, 3, 4, 5].map(tier => {
    const items = results.filter(r => r.tier === tier);
    const demand = items.reduce((s, r) => s + r.demandMCM, 0);
    const supplied = items.reduce((s, r) => s + r.suppliedMCM, 0);
    return { tier: `Tier ${tier}`, demand: Math.round(demand * 10) / 10, supplied: Math.round(supplied * 10) / 10, color: TIER_COLORS[tier] };
  }).filter(d => d.demand > 0);

  return (
    <div className="p-5 lg:p-6 space-y-5 pb-24 lg:pb-6 page-enter">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Water Allocation</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Priority-based distribution of available release water to downstream users
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SyntheticBadge short />
          <DataBadge source="CALCULATED" />
        </div>
      </div>

      {/* ── Disclaimer ─────────────────────────────────────── */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/15
                      border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          <strong>Illustrative data only.</strong> This allocation is a simplified priority model for decision support.
          Actual Cauvery water allocation is governed by inter-state tribunal orders and official release schedules not modelled here.
          Operator-configured priorities only. Not legal water rights.
        </p>
      </div>

      {/* ── Scenario switcher ──────────────────────────────── */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground">Scenario:</span>
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {scenarioBtns.map(s => {
              const scn = SCENARIOS[s];
              return (
                <button key={s} onClick={() => setScenario(s)}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                    scenario === s ? "text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                  style={scenario === s ? { background: scn.color } : {}}>
                  {scn.label}
                </button>
              );
            })}
          </div>
          <div className="text-xs text-muted-foreground ml-auto">
            Scenario effect: inflow ×{sc.inflowMultiplier.toFixed(2)}, rainfall {sc.rainfallAnomaly > 0 ? "+" : ""}{(sc.rainfallAnomaly * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Available Water", value: `${availableWeekMCM.toFixed(1)} MCM`, color: "#22d3ee", note: "7-day release" },
          { label: "Total Demand",    value: `${totalDemand.toFixed(1)} MCM`,    color: "#8b5cf6", note: "all tiers" },
          { label: "Total Supplied",  value: `${totalSupplied.toFixed(1)} MCM`,  color: "#10b981", note: `${Math.round(totalSupplied / totalDemand * 100)}% of demand` },
          { label: "Total Shortfall", value: `${totalShortfall.toFixed(1)} MCM`, color: totalShortfall > 0 ? "#ef4444" : "#10b981", note: totalShortfall > 0 ? "deficit" : "fully met" },
          { label: "Remaining",       value: `${remainingMCM.toFixed(1)} MCM`,   color: "#64748b", note: "after allocation" },
        ].map(item => (
          <div key={item.label} className="glass-card rounded-xl p-4">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{item.label}</div>
            <div className="font-bold text-lg font-tabular mt-1" style={{ color: item.color }}>{item.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{item.note}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit border border-border">
        {(["overview", "sankey", "community"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn("px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
              activeTab === tab
                ? "bg-white dark:bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}>
            {tab === "sankey" ? "Flow Diagram" : tab === "community" ? "Communities" : "Overview"}
          </button>
        ))}
      </div>

      {/* ── Overview ───────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-5 animate-fade-in">

          {/* Tier chart */}
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-primary" />
              Allocation by Priority Tier
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tierChart} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="tier" tick={{ fontSize: 11 }} />
                <YAxis unit=" MCM" tick={{ fontSize: 11 }} width={52} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                />
                <Legend />
                <Bar dataKey="demand" name="Demand" opacity={0.35} radius={[4, 4, 0, 0]}>
                  {tierChart.map(d => <Cell key={d.tier} fill={d.color} />)}
                </Bar>
                <Bar dataKey="supplied" name="Supplied" radius={[4, 4, 0, 0]}>
                  {tierChart.map(d => <Cell key={d.tier} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tier summary rows */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(tier => {
              const items = results.filter(r => r.tier === tier);
              if (!items.length) return null;
              const tierDemand = items.reduce((s, r) => s + r.demandMCM, 0);
              const tierSupply = items.reduce((s, r) => s + r.suppliedMCM, 0);
              const tierPct = Math.round(tierSupply / tierDemand * 100);
              const color = TIER_COLORS[tier];
              return (
                <div key={tier} className="glass-card rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border"
                       style={{ borderLeftWidth: 4, borderLeftColor: color }}>
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                    <span className="font-semibold text-sm flex-1">{TIER_LABELS[tier]}</span>
                    <span className="text-xs text-muted-foreground">{items.length} users</span>
                    <span className="font-bold text-sm font-tabular" style={{ color: tierPct === 100 ? "#10b981" : tierPct > 70 ? "#f59e0b" : "#ef4444" }}>
                      {tierPct}% met
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="px-4 py-2">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                           style={{ width: `${tierPct}%`, background: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sankey ─────────────────────────────────────────── */}
      {activeTab === "sankey" && (
        <div className="glass-card rounded-xl p-5 animate-fade-in">
          <h2 className="text-sm font-semibold mb-1">Water Flow Diagram</h2>
          <p className="text-xs text-muted-foreground mb-5">
            Band width represents MCM supplied. Colour shows supply status — green = full, amber = partial.
          </p>
          <SankeyFlow available={availableWeekMCM} results={results} />
          <div className="mt-4 flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
                <span className="capitalize">{type}</span>
              </div>
            ))}
          </div>
          <SyntheticBadge className="mt-3" />
        </div>
      )}

      {/* ── Community rows ─────────────────────────────────── */}
      {activeTab === "community" && (
        <div className="space-y-2 animate-fade-in">
          {/* Header */}
          <div className="hidden md:grid grid-cols-7 gap-3 px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            <div className="col-span-2">Community</div>
            <div className="text-center">Tier</div>
            <div className="text-right">Demand</div>
            <div className="text-right">Supplied</div>
            <div className="text-right">Shortfall</div>
            <div className="text-center">% Met</div>
          </div>

          {results.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name)).map(r => {
            const statusStyle =
              r.status === "full"     ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
              r.status === "partial"  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
            const color = TIER_COLORS[r.tier];

            return (
              <div key={r.id} className="glass-card rounded-xl px-4 py-3">
                {/* Mobile layout */}
                <div className="md:hidden space-y-2">
                  <div className="flex items-center gap-2 justify-between">
                    <div className="font-semibold text-sm">{r.name}</div>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", statusStyle)}>
                      {r.pctMet}% met
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="px-2 py-0.5 rounded-full border text-[10px] font-bold" style={{ borderColor: color, color }}>
                      Tier {r.tier}
                    </span>
                    <span>Demand: {r.demandMCM.toFixed(1)} MCM</span>
                    <span>Supply: {r.suppliedMCM.toFixed(1)} MCM</span>
                    {r.shortfallMCM > 0 && <span className="text-red-500">Shortfall: {r.shortfallMCM.toFixed(1)} MCM</span>}
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${r.pctMet}%`, background: color }} />
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden md:grid grid-cols-7 gap-3 items-center">
                  <div className="col-span-2">
                    <div className="font-semibold text-sm">{r.name}</div>
                    <div className="text-[10px] text-muted-foreground capitalize mt-0.5">{r.type}</div>
                  </div>
                  <div className="text-center">
                    <span className="px-2 py-0.5 rounded-full border text-[10px] font-bold"
                          style={{ borderColor: color, color }}>
                      T{r.tier}
                    </span>
                  </div>
                  <div className="text-right font-tabular text-sm">{r.demandMCM.toFixed(1)}</div>
                  <div className="text-right font-tabular text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {r.suppliedMCM.toFixed(1)}
                  </div>
                  <div className="text-right font-tabular text-sm text-red-500">
                    {r.shortfallMCM > 0 ? `-${r.shortfallMCM.toFixed(1)}` : "—"}
                  </div>
                  <div className="flex items-center justify-center">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", statusStyle)}>
                      {r.pctMet}%
                    </span>
                  </div>
                </div>

                {/* Progress bar for all */}
                <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                       style={{ width: `${r.pctMet}%`, background: color }} />
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div className="flex items-center gap-4 flex-wrap pt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Fully supplied</div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" />Partially supplied</div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500" />Shortfall</div>
          </div>
        </div>
      )}

      {/* ── Spill-to-Store link ────────────────────────────── */}
      {remainingMCM > 2 && (
        <div className="glass-card rounded-xl p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm">Surplus Water Available</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                After all demand is met, <strong>{remainingMCM.toFixed(1)} MCM</strong> remains.
                This surplus could potentially be routed to downstream capture infrastructure.
              </div>
              <div className="text-[10px] text-muted-foreground mt-1.5 italic">
                See Spill-to-Store page for potential capture sites and capacity estimates.
              </div>
            </div>
          </div>
        </div>
      )}

      <DecisionNotice />
    </div>
  );
}
