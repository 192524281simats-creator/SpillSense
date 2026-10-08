import { useMemo, useState, useCallback } from "react";
import { useApp } from "@/lib/store";
import {
  generateInflowForecast, runRegretGuard, simulatePolicy,
  SAFE_CAPACITY_MCM, MIN_STORAGE_MCM, type ScenarioType, SCENARIOS
} from "@/lib/engine";
import { SyntheticBadge, DataBadge, DecisionNotice } from "@/components/features/DataBadge";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, AreaChart, Area, Legend
} from "recharts";
import { RotateCcw, Play, Brain, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

function Slider({ label, min, max, step, value, onChange, unit, description }: {
  label: string; min: number; max: number; step: number;
  value: number; onChange: (v: number) => void; unit: string; description?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-bold font-tabular text-primary">{value.toFixed(step < 1 ? 1 : 0)} {unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-muted"
      />
      {description && <p className="text-[10px] text-muted-foreground">{description}</p>}
    </div>
  );
}

export default function WhatIf() {
  const { storageMCM: globalStorage, scenario: globalScenario, dailyDemandMCM: globalDemand, ecologicalMinMCM } = useApp();

  const [localStorage, setLocalStorage] = useState(globalStorage);
  const [releaseRate, setReleaseRate] = useState(globalDemand * 1.2);
  const [scenario, setScenario] = useState<ScenarioType>(globalScenario);
  const [demandFactor, setDemandFactor] = useState(1.0);
  const [floodLevel, setFloodLevel] = useState(SAFE_CAPACITY_MCM);
  const [minStorage, setMinStorage] = useState(MIN_STORAGE_MCM);
  const [simulated, setSimulated] = useState(false);

  const adjustedDemand = globalDemand * demandFactor;

  const forecast = useMemo(() => generateInflowForecast(scenario, localStorage), [scenario, localStorage]);

  const simulate = useCallback(() => {
    setSimulated(true);
  }, []);

  const reset = () => {
    setLocalStorage(globalStorage);
    setReleaseRate(globalDemand * 1.2);
    setScenario(globalScenario);
    setDemandFactor(1.0);
    setFloodLevel(SAFE_CAPACITY_MCM);
    setMinStorage(MIN_STORAGE_MCM);
    setSimulated(true);
  };

  const useRG = () => {
    const rg = runRegretGuard(localStorage, forecast, adjustedDemand, ecologicalMinMCM, scenario);
    setReleaseRate(rg.releaseRecommendationMCM);
    setSimulated(true);
  };

  // Simulate with current settings
  const results = useMemo(() => {
    if (!simulated) return null;
    const states = [];
    let storage = localStorage;

    for (let i = 0; i < 7; i++) {
      const inflow = forecast[i].p50;
      const release = Math.min(releaseRate, SAFE_CAPACITY_MCM);
      const evap = storage * 0.0008;
      const proj = storage + inflow - release - evap;
      const spill = Math.max(0, proj - floodLevel);
      const actual = Math.max(Math.min(proj - spill, floodLevel), 0);
      states.push({
        day: `D${i + 1}`,
        storage: Math.round(actual),
        inflow: Math.round(inflow * 10) / 10,
        release: Math.round(release * 10) / 10,
        spill: Math.round(spill * 10) / 10,
        floodControl: floodLevel,
        minStorage: minStorage,
      });
      storage = actual;
    }
    const endStorage = states[states.length - 1].storage;
    const totalSpill = states.reduce((s, d) => s + d.spill, 0);
    const spillRisk = totalSpill > 30 ? 0.9 : totalSpill > 10 ? 0.55 : totalSpill > 2 ? 0.2 : 0.05;
    const droughtRisk = endStorage < minStorage * 1.1 ? 0.85 : endStorage < minStorage * 1.4 ? 0.35 : 0.05;
    const safeViolation = endStorage < minStorage * 0.9;

    return { states, endStorage, totalSpill, spillRisk, droughtRisk, safeViolation };
  }, [simulated, localStorage, releaseRate, forecast, floodLevel, minStorage]);

  // Before/after comparison (release 20% more)
  const comparison = useMemo(() => {
    const moreRelease = Math.min(releaseRate * 1.2, SAFE_CAPACITY_MCM);
    let storage = localStorage;
    let spillBefore = 0, spillAfter = 0;
    for (let i = 0; i < 7; i++) {
      const inflow = forecast[i].p50;
      const projBefore = storage + inflow - releaseRate - storage * 0.0008;
      const spillB = Math.max(0, projBefore - floodLevel);
      spillBefore += spillB;

      const projAfter = storage + inflow - moreRelease - storage * 0.0008;
      const spillA = Math.max(0, projAfter - floodLevel);
      spillAfter += spillA;

      storage = Math.max(projBefore - spillB, 0);
    }
    return {
      currentSpill: spillBefore.toFixed(1),
      afterSpill: spillAfter.toFixed(1),
      spillDiff: (spillBefore - spillAfter).toFixed(1),
      moreRelease: moreRelease.toFixed(1),
    };
  }, [localStorage, releaseRate, forecast, floodLevel]);

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">What-If Simulator</h1>
          <p className="text-muted-foreground text-sm">Adjust parameters and simulate outcomes interactively</p>
        </div>
        <SyntheticBadge />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-6">
          <div className="glass-card rounded-xl p-5 space-y-5">
            <h2 className="text-sm font-semibold">Simulation Controls</h2>

            {/* Scenario */}
            <div>
              <div className="text-xs font-medium mb-2">ENSO Scenario</div>
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                {(["elnino", "neutral", "lanina"] as ScenarioType[]).map(s => (
                  <button key={s} onClick={() => { setScenario(s); setSimulated(false); }}
                    className={cn("flex-1 py-1.5 rounded text-xs font-semibold transition-all",
                      scenario === s ? "gradient-aqua text-white" : "text-muted-foreground hover:text-foreground"
                    )}>
                    {SCENARIOS[s].label}
                  </button>
                ))}
              </div>
            </div>

            <Slider label="Starting Storage" min={MIN_STORAGE_MCM * 0.5} max={SAFE_CAPACITY_MCM}
              step={5} value={localStorage} onChange={v => { setLocalStorage(v); setSimulated(false); }}
              unit="MCM" description={`${((localStorage / SAFE_CAPACITY_MCM) * 100).toFixed(0)}% capacity`} />

            <Slider label="Release Rate" min={ecologicalMinMCM} max={80}
              step={0.5} value={releaseRate} onChange={v => { setReleaseRate(v); setSimulated(false); }}
              unit="MCM/d" description={`≈ ${Math.round(releaseRate / 0.0864 / 0.028317)} cusecs`} />

            <Slider label="Demand Factor" min={0.5} max={2.0}
              step={0.1} value={demandFactor} onChange={v => { setDemandFactor(v); setSimulated(false); }}
              unit="×" description={`Daily demand: ${(globalDemand * demandFactor).toFixed(1)} MCM/d`} />

            <Slider label="Flood Control Level" min={SAFE_CAPACITY_MCM * 0.8} max={SAFE_CAPACITY_MCM}
              step={5} value={floodLevel} onChange={v => { setFloodLevel(v); setSimulated(false); }}
              unit="MCM" />

            <Slider label="Minimum Storage" min={50} max={MIN_STORAGE_MCM * 1.5}
              step={5} value={minStorage} onChange={v => { setMinStorage(v); setSimulated(false); }}
              unit="MCM" />

            <div className="flex gap-2">
              <button onClick={simulate}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg gradient-aqua text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                <Play className="w-4 h-4" /> Run
              </button>
              <button onClick={useRG}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-sm font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors">
                <Brain className="w-4 h-4" /> Use RegretGuard
              </button>
              <button onClick={reset}
                className="p-2.5 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Reset">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Before/after comparison */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-3">Release 20% More Today</h3>
            <p className="text-xs text-muted-foreground mb-3">If release increases from {releaseRate.toFixed(1)} to {comparison.moreRelease} MCM/d:</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current spill (7d)</span>
                <span className="font-semibold text-red-500">{comparison.currentSpill} MCM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">After increase</span>
                <span className="font-semibold text-emerald-500">{comparison.afterSpill} MCM</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 mt-1">
                <span className="text-muted-foreground">Spill potentially avoided</span>
                <span className="font-bold text-primary">{comparison.spillDiff} MCM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Risk summary */}
          {results && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Spill", value: `${results.totalSpill.toFixed(1)} MCM`, color: results.totalSpill > 10 ? "#ef4444" : "#10b981" },
                { label: "Spill Risk", value: `${(results.spillRisk * 100).toFixed(0)}%`, color: results.spillRisk > 0.5 ? "#ef4444" : results.spillRisk > 0.25 ? "#f97316" : "#10b981" },
                { label: "Drought Risk", value: `${(results.droughtRisk * 100).toFixed(0)}%`, color: results.droughtRisk > 0.5 ? "#ef4444" : results.droughtRisk > 0.25 ? "#f97316" : "#10b981" },
                { label: "End Storage", value: `${results.endStorage} MCM`, color: results.endStorage > minStorage * 1.5 ? "#10b981" : "#f59e0b" },
              ].map(item => (
                <div key={item.label} className="glass-card rounded-xl p-3 border-l-4" style={{ borderLeftColor: item.color }}>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="font-bold text-lg font-tabular mt-0.5" style={{ color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}

          {results?.safeViolation && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm text-red-600 dark:text-red-400">Safety Constraint Violation</div>
                <div className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                  Projected end storage ({results.endStorage} MCM) falls below minimum safe operating level ({minStorage.toFixed(0)} MCM). RegretGuard would reject this release strategy.
                </div>
              </div>
            </div>
          )}

          {/* Storage chart */}
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4">7-Day Storage Projection</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={results?.states ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis unit=" MCM" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <ReferenceLine y={floodLevel} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "Flood Control", position: "right", fontSize: 9, fill: "#ef4444" }} />
                <ReferenceLine y={minStorage} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "Min", position: "right", fontSize: 9, fill: "#f59e0b" }} />
                <Area type="monotone" dataKey="storage" name="Storage (MCM)" stroke="#22d3ee" fill="#22d3ee20" strokeWidth={2.5} dot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
            <SyntheticBadge className="mt-2" />
          </div>

          {/* Inflow/release/spill */}
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4">Inflow / Release / Spill</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={results?.states ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis unit=" MCM" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend />
                <Line type="monotone" dataKey="inflow" name="Inflow P50" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="release" name="Release" stroke="#22d3ee" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="spill" name="Spill" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <DecisionNotice />
    </div>
  );
}
