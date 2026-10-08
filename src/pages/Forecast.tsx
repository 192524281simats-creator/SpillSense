import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { generateInflowForecast, SCENARIOS } from "@/lib/engine";
import { SyntheticBadge, DataBadge, DecisionNotice } from "@/components/features/DataBadge";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from "recharts";
import { Info, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

function ExplainPanel({ forecast, scenario }: { forecast: ReturnType<typeof generateInflowForecast>; scenario: string }) {
  const sc = SCENARIOS[scenario as keyof typeof SCENARIOS];
  const last = forecast[forecast.length - 1];
  const first = forecast[0];

  return (
    <div className="bg-muted/50 rounded-xl p-5 border border-border">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Info className="w-4 h-4 text-primary" />
        Forecast Explanation
      </h3>
      <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
        <p>
          <strong className="text-foreground">P10 ({first.p10.toFixed(1)}–{last.p10.toFixed(1)} MCM/day):</strong> Only 10% of simulated inflow futures are this low or lower. Represents the dry scenario — use for drought risk planning.
        </p>
        <p>
          <strong className="text-foreground">P50 ({first.p50.toFixed(1)}–{last.p50.toFixed(1)} MCM/day):</strong> The median estimate. Half of simulated futures fall above and half below. The central forecast.
        </p>
        <p>
          <strong className="text-foreground">P90 ({first.p90.toFixed(1)}–{last.p90.toFixed(1)} MCM/day):</strong> Only 10% of futures are this high or higher. Represents the wet scenario — use for spill/flood risk planning.
        </p>
        <p>
          <strong className="text-foreground">ENSO Scenario ({sc.label}):</strong> Rainfall anomaly {sc.rainfallAnomaly > 0 ? "+" : ""}{(sc.rainfallAnomaly * 100).toFixed(0)}%. Inflow multiplier vs. baseline: {sc.inflowMultiplier.toFixed(2)}×. Forecast uncertainty: {(sc.uncertainty * 100).toFixed(0)}%.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          RegretGuard evaluates release strategies against ALL percentile futures, not just the P50. This is why it sometimes recommends releasing more water than the median forecast alone would suggest.
        </p>
      </div>
    </div>
  );
}

export default function Forecast() {
  const { storageMCM, scenario } = useApp();
  const [showExplain, setShowExplain] = useState(false);

  const forecast = useMemo(() => generateInflowForecast(scenario, storageMCM), [scenario, storageMCM]);
  const sc = SCENARIOS[scenario as keyof typeof SCENARIOS];

  const chartData = forecast.map(d => ({
    day: d.date,
    p50: d.p50,
    p10: d.p10,
    p90: d.p90,
    uncertainty: [d.p10, d.p90] as [number, number],
  }));

  const barData = forecast.map(d => ({
    day: `D${d.day}`,
    P10: Number(d.p10.toFixed(1)),
    P50: Number(d.p50.toFixed(1)),
    P90: Number(d.p90.toFixed(1)),
  }));

  const totalP50 = forecast.reduce((s, d) => s + d.p50, 0);
  const totalP10 = forecast.reduce((s, d) => s + d.p10, 0);
  const totalP90 = forecast.reduce((s, d) => s + d.p90, 0);

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">7-Day Probabilistic Forecast</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Inflow distribution under {sc.label} conditions</p>
        </div>
        <div className="flex items-center gap-2">
          <SyntheticBadge />
          <button
            onClick={() => setShowExplain(e => !e)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            <Info className="w-4 h-4" />
            Explain Forecast
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "7-Day P10 Total", value: totalP10.toFixed(0), unit: "MCM", desc: "Low-flow scenario", icon: TrendingDown, color: "#3b82f6" },
          { label: "7-Day P50 Total", value: totalP50.toFixed(0), unit: "MCM", desc: "Median scenario", icon: Minus, color: "#22d3ee" },
          { label: "7-Day P90 Total", value: totalP90.toFixed(0), unit: "MCM", desc: "High-flow scenario", icon: TrendingUp, color: "#8b5cf6" },
        ].map(item => (
          <div key={item.label} className="glass-card rounded-xl p-4 border-l-4" style={{ borderLeftColor: item.color }}>
            <div className="flex items-center gap-2 mb-1">
              <item.icon className="w-4 h-4" style={{ color: item.color }} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <div className="kpi-number font-tabular" style={{ color: item.color }}>{item.value}</div>
            <div className="text-sm text-muted-foreground">{item.unit} · {item.desc}</div>
          </div>
        ))}
      </div>

      {showExplain && <ExplainPanel forecast={forecast} scenario={scenario} />}

      {/* ENSO context */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4">ENSO Scenario Context</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Scenario</div>
            <div className="font-semibold" style={{ color: sc.color }}>{sc.label}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Rainfall Anomaly</div>
            <div className="font-semibold">{sc.rainfallAnomaly > 0 ? "+" : ""}{(sc.rainfallAnomaly * 100).toFixed(0)}%</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Inflow Multiplier</div>
            <div className="font-semibold">{sc.inflowMultiplier.toFixed(2)}×</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Dry-Spell Prob.</div>
            <div className="font-semibold">{(sc.drySpellProb * 100).toFixed(0)}%</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Heavy-Rain Prob.</div>
            <div className="font-semibold">{(sc.heavyRainProb * 100).toFixed(0)}%</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 italic">
          Scenario assumption — demonstration model. Climate information modifies scenario probabilities; it does not determine a single future.
        </p>
      </div>

      {/* Fan chart */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center justify-between">
          Probabilistic Inflow Fan Chart (P10 / P50 / P90)
          <DataBadge source="MODEL_PREDICTION" />
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis unit=" MCM" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
              formatter={(v: number, name: string) => [`${v.toFixed(1)} MCM/day`, name]}
            />
            <Legend />
            <Area type="monotone" dataKey="p90" name="P90 (High)" stroke="#8b5cf6" strokeWidth={1.5} fill="#8b5cf615" strokeDasharray="5 2" dot={false} />
            <Area type="monotone" dataKey="p50" name="P50 (Median)" stroke="#22d3ee" strokeWidth={2.5} fill="#22d3ee20" dot={{ r: 4, fill: "#22d3ee" }} />
            <Area type="monotone" dataKey="p10" name="P10 (Low)" stroke="#3b82f6" strokeWidth={1.5} fill="transparent" strokeDasharray="5 2" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Day-by-day table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">Daily Forecast Table</h2>
          <DataBadge source="SYNTHETIC" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Day</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-blue-500">P10 MCM/d</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-cyan-500">P50 MCM/d</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-purple-500">P90 MCM/d</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Spread</th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((d, i) => (
                <tr key={d.day} className={cn("border-b border-border/50 hover:bg-muted/30 transition-colors", i % 2 === 0 ? "" : "bg-muted/10")}>
                  <td className="px-5 py-3 font-medium">Day {d.day}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.date}</td>
                  <td className="px-4 py-3 text-right font-tabular text-blue-500">{d.p10.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-tabular text-cyan-500 font-semibold">{d.p50.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-tabular text-purple-500">{d.p90.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-tabular text-muted-foreground">{(d.p90 - d.p10).toFixed(1)}</td>
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
