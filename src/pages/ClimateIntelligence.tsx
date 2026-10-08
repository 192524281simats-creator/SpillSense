import { useApp } from "@/lib/store";
import { SCENARIOS, generateInflowForecast, type ScenarioType } from "@/lib/engine";
import { SyntheticBadge, DataBadge, DecisionNotice } from "@/components/features/DataBadge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell, Legend
} from "recharts";
import { Wind, Thermometer, CloudRain, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const ENSO_STATES: ScenarioType[] = ["elnino", "neutral", "lanina"];

const ONI_VALUES: Record<ScenarioType, number> = {
  elnino: 0.8,
  neutral: 0.1,
  lanina: -0.7,
};

export default function ClimateIntelligence() {
  const { scenario, setScenario, storageMCM } = useApp();
  const sc = SCENARIOS[scenario];

  const forecast = generateInflowForecast(scenario, storageMCM);
  const avgP50 = forecast.reduce((s, d) => s + d.p50, 0) / forecast.length;

  const comparisonData = ENSO_STATES.map(s => {
    const scn = SCENARIOS[s];
    return {
      scenario: scn.label,
      rainfallAnomaly: Math.round(scn.rainfallAnomaly * 100),
      inflowMultiplier: Math.round(scn.inflowMultiplier * 100),
      uncertainty: Math.round(scn.uncertainty * 100),
      drySpellProb: Math.round(scn.drySpellProb * 100),
      heavyRainProb: Math.round(scn.heavyRainProb * 100),
      color: scn.color,
    };
  });

  const radarData = [
    { metric: "Rainfall", value: Math.max(0, (1 + sc.rainfallAnomaly) * 70) },
    { metric: "Inflow", value: sc.inflowMultiplier * 70 },
    { metric: "Certainty", value: (1 - sc.uncertainty) * 100 },
    { metric: "Drought Safety", value: (1 - sc.drySpellProb) * 100 },
    { metric: "Flood Control", value: (1 - sc.heavyRainProb) * 100 },
  ];

  const oni = ONI_VALUES[scenario];

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Climate Intelligence</h1>
          <p className="text-muted-foreground text-sm">ENSO conditions, rainfall anomaly, forecast uncertainty</p>
        </div>
        <SyntheticBadge />
      </div>

      {/* ENSO selector */}
      <div className="grid grid-cols-3 gap-4">
        {ENSO_STATES.map(s => {
          const scn = SCENARIOS[s];
          const active = scenario === s;
          return (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={cn(
                "glass-card rounded-xl p-5 text-left transition-all border-2",
                active ? "border-transparent ring-2 shadow-card-hover" : "border-border hover:shadow-card-hover"
              )}
              style={active ? { boxShadow: `0 0 0 2px ${scn.color}`, borderColor: "transparent" } : {}}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ background: scn.color }} />
                <span className="font-bold text-sm">{scn.label}</span>
                {active && <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-semibold ml-auto" style={{ background: scn.color }}>Active</span>}
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ONI</span>
                  <span className="font-semibold">{ONI_VALUES[s] > 0 ? "+" : ""}{ONI_VALUES[s].toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rainfall</span>
                  <span className={cn("font-semibold", scn.rainfallAnomaly > 0 ? "text-blue-500" : "text-amber-500")}>
                    {scn.rainfallAnomaly > 0 ? "+" : ""}{(scn.rainfallAnomaly * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inflow ×</span>
                  <span className="font-semibold">{scn.inflowMultiplier.toFixed(2)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active scenario detail */}
      <div className="glass-card rounded-xl overflow-hidden border-l-4" style={{ borderLeftColor: sc.color }}>
        <div className="px-5 py-4 border-b border-border" style={{ background: sc.color + "10" }}>
          <div className="flex items-center gap-3">
            <Wind className="w-5 h-5" style={{ color: sc.color }} />
            <h2 className="font-bold">Active Scenario: {sc.label}</h2>
            <DataBadge source="MODELLED" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{sc.description}</p>
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          {[
            { label: "ONI Value", value: `${oni > 0 ? "+" : ""}${oni.toFixed(1)}`, note: oni >= 0.5 ? "El Niño" : oni <= -0.5 ? "La Niña" : "Neutral" },
            { label: "Rainfall Anomaly", value: `${sc.rainfallAnomaly > 0 ? "+" : ""}${(sc.rainfallAnomaly * 100).toFixed(0)}%`, note: "vs baseline" },
            { label: "Inflow Multiplier", value: `${sc.inflowMultiplier.toFixed(2)}×`, note: "of baseline" },
            { label: "Dry-Spell Probability", value: `${(sc.drySpellProb * 100).toFixed(0)}%`, note: "next 30 days" },
            { label: "Heavy-Rain Probability", value: `${(sc.heavyRainProb * 100).toFixed(0)}%`, note: "next 30 days" },
          ].map(item => (
            <div key={item.label}>
              <div className="text-xs text-muted-foreground mb-0.5">{item.label}</div>
              <div className="font-bold text-lg" style={{ color: sc.color }}>{item.value}</div>
              <div className="text-xs text-muted-foreground">{item.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Recommendation */}
      <div className="glass-card rounded-xl p-5 border border-border">
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          Why does this matter?
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {scenario === "elnino" && "El Niño typically brings drier, hotter conditions to South India. Reduced inflows increase drought risk, especially if current storage is low. RegretGuard will be more conservative about releasing water, prioritising storage maintenance over spill avoidance."}
          {scenario === "neutral" && "Neutral ENSO conditions bring near-average rainfall. Forecast uncertainty is moderate. RegretGuard balances spill and drought risk, typically recommending releases close to demand-plus-safety-buffer."}
          {scenario === "lanina" && "La Niña typically brings wetter conditions to South India. Elevated inflows increase spill risk if storage is high. RegretGuard will recommend pre-emptive releases to create flood buffer, while still protecting the minimum ecological reserve."}
        </p>
        <div className="mt-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-400">
          Climate information modifies scenario probabilities; it does not determine a single future. All ENSO-inflow relationships are demonstration assumptions and not calibrated against real Mettur Dam data.
        </div>
      </div>

      {/* Comparison chart */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4">ENSO Scenario Comparison</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="scenario" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
            <Legend />
            <Bar dataKey="rainfallAnomaly" name="Rainfall Anomaly (%)" radius={[4, 4, 0, 0]}>
              {comparisonData.map((entry) => <Cell key={entry.scenario} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Radar */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Current Scenario Risk Profile</h2>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} />
              <Radar name="Score" dataKey="value" stroke={sc.color} fill={sc.color} fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Probability bars */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Forecast Probability Indicators</h2>
          <div className="space-y-4">
            {[
              { label: "Dry-Spell Probability", value: sc.drySpellProb, color: "#f59e0b" },
              { label: "Heavy-Rain Probability", value: sc.heavyRainProb, color: "#3b82f6" },
              { label: "Forecast Uncertainty", value: sc.uncertainty, color: "#8b5cf6" },
              { label: "Inflow Deficit Risk", value: Math.max(0, 1 - sc.inflowMultiplier * 0.7), color: "#ef4444" },
              { label: "Spill/Flood Risk", value: Math.min(1, sc.inflowMultiplier * sc.heavyRainProb), color: "#f97316" },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold">{(item.value * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.value * 100}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-muted-foreground italic">Source: MODELLED — demonstration ENSO-inflow relationships. Not calibrated against real data.</div>
        </div>
      </div>

      <DecisionNotice />
    </div>
  );
}
