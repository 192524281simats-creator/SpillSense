import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import {
  generateInflowForecast, runRegretGuard, computeDailyDemand,
  computeCommunitySecurityLevel, computeHarvesting, computeTransfer,
  DEFAULT_DEMAND, SAFE_CAPACITY_MCM, type PolicyId, POLICIES
} from "@/lib/engine";
import { SyntheticBadge, DataBadge, DecisionNotice } from "@/components/features/DataBadge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from "recharts";
import { Users, Wheat, Droplets, ArrowRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const SECURITY_COLORS = { Secure: "#10b981", Watch: "#f59e0b", Risk: "#f97316", Critical: "#ef4444" };

export default function DownstreamSecurity() {
  const { storageMCM, scenario, dailyDemandMCM, ecologicalMinMCM } = useApp();
  const [harvestArea, setHarvestArea] = useState(5000);
  const [rainfallMM, setRainfallMM] = useState(45);
  const [transferRequest, setTransferRequest] = useState(20);
  const [transferEfficiency, setTransferEfficiency] = useState(0.75);
  const [transferDistance, setTransferDistance] = useState(80);
  const [transferResult, setTransferResult] = useState<ReturnType<typeof computeTransfer> | null>(null);

  const forecast = useMemo(() => generateInflowForecast(scenario, storageMCM), [scenario, storageMCM]);
  const rg = useMemo(() => runRegretGuard(storageMCM, forecast, dailyDemandMCM, ecologicalMinMCM, scenario), [storageMCM, forecast, dailyDemandMCM, ecologicalMinMCM, scenario]);

  const demand = computeDailyDemand(DEFAULT_DEMAND);
  const projectedSupply7d = rg.recommended.totalReleaseMCM;
  const demand7d = dailyDemandMCM * 7;

  const security = computeCommunitySecurityLevel(projectedSupply7d, demand7d);
  const harvesting = computeHarvesting(harvestArea, rainfallMM, 0.75);

  // Policy impact comparison
  const policyImpact = rg.allPolicies.map(p => {
    const supply = p.totalReleaseMCM;
    const sec = computeCommunitySecurityLevel(supply, demand7d);
    return {
      policy: p.label.replace(" Pre-Release", "").replace("Forecast-", ""),
      supply: Math.round(supply),
      gap: Math.max(0, Math.round(demand7d - supply)),
      security: sec.level,
      score: sec.score,
      color: SECURITY_COLORS[sec.level],
      recommended: p.policyId === rg.recommended.policyId,
    };
  });

  // Agriculture detail
  const agri = {
    areaHa: DEFAULT_DEMAND.agriculturalAreaHa,
    cropDemandMM: DEFAULT_DEMAND.cropDemandFactor,
    irrigationEff: DEFAULT_DEMAND.irrigationEfficiency,
    demandMCM: demand.agriculturalMCM,
    rainfallContrib: DEFAULT_DEMAND.rainfallContributionMM,
  };

  const handleTransfer = () => {
    const result = computeTransfer(storageMCM, transferRequest, transferEfficiency, transferDistance);
    setTransferResult(result);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Downstream Security</h1>
          <p className="text-muted-foreground text-sm">Agricultural demand, community impact, rainwater harvesting & water transfer</p>
        </div>
        <SyntheticBadge />
      </div>

      {/* Community security overview */}
      <div className="glass-card rounded-xl overflow-hidden border-2" style={{ borderColor: SECURITY_COLORS[security.level] + "60" }}>
        <div className="px-5 py-4 flex items-center gap-4" style={{ background: SECURITY_COLORS[security.level] + "15" }}>
          <Users className="w-8 h-8" style={{ color: SECURITY_COLORS[security.level] }} />
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Community Water Security Level</div>
            <div className="font-bold text-2xl" style={{ color: SECURITY_COLORS[security.level] }}>{security.level}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-muted-foreground">Score</div>
            <div className="font-bold text-3xl font-tabular" style={{ color: SECURITY_COLORS[security.level] }}>{security.score}</div>
          </div>
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><div className="text-xs text-muted-foreground">7-Day Supply</div><div className="font-bold">{projectedSupply7d.toFixed(1)} MCM</div></div>
          <div><div className="text-xs text-muted-foreground">7-Day Demand</div><div className="font-bold">{demand7d.toFixed(1)} MCM</div></div>
          <div><div className="text-xs text-muted-foreground">Supply-Demand Gap</div><div className="font-bold text-red-500">{security.gapMCM.toFixed(1)} MCM</div></div>
          <div><div className="text-xs text-muted-foreground">Days of Coverage</div><div className="font-bold">{security.daysCoverage}</div></div>
        </div>
        <div className="px-5 pb-3 text-[10px] text-muted-foreground italic">Demonstration estimate. Not official government supply/demand data.</div>
      </div>

      {/* Policy impact on community */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Droplets className="w-4 h-4 text-primary" />
          Release Policy Impact on Community Water Security
        </h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={policyImpact}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="policy" tick={{ fontSize: 10 }} />
            <YAxis unit=" MCM" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
            <Legend />
            <Bar dataKey="supply" name="7-Day Supply (MCM)" radius={[4, 4, 0, 0]}>
              {policyImpact.map((entry, i) => (
                <rect key={i} fill={entry.recommended ? "#22d3ee" : entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-2 text-muted-foreground">Policy</th>
                <th className="text-right pb-2 text-muted-foreground">Supply MCM</th>
                <th className="text-right pb-2 text-muted-foreground">Gap MCM</th>
                <th className="text-center pb-2 text-muted-foreground">Security</th>
              </tr>
            </thead>
            <tbody>
              {policyImpact.map(p => (
                <tr key={p.policy} className={cn("border-b border-border/40", p.recommended && "bg-primary/5")}>
                  <td className="py-1.5 font-medium">{p.policy}{p.recommended && " ★"}</td>
                  <td className="py-1.5 text-right font-tabular">{p.supply}</td>
                  <td className="py-1.5 text-right font-tabular text-red-500">{p.gap}</td>
                  <td className="py-1.5 text-center"><span className="px-2 py-0.5 rounded-full text-white text-[10px] font-bold" style={{ background: SECURITY_COLORS[p.security as keyof typeof SECURITY_COLORS] }}>{p.security}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agricultural demand */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Wheat className="w-4 h-4 text-amber-500" />
          Agricultural Water Demand
        </h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm mb-4">
          <div className="bg-muted/30 rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">Agricultural Area</div>
            <div className="font-bold text-lg">{agri.areaHa.toLocaleString()} ha</div>
            <DataBadge source="SYNTHETIC" className="mt-1" />
          </div>
          <div className="bg-muted/30 rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">Daily Irrigation Demand</div>
            <div className="font-bold text-lg">{agri.demandMCM.toFixed(2)} MCM/d</div>
            <DataBadge source="CALCULATED" className="mt-1" />
          </div>
          <div className="bg-muted/30 rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">Irrigation Efficiency</div>
            <div className="font-bold text-lg">{(agri.irrigationEff * 100).toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground mt-0.5">Surface irrigation</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-3 border border-border">
          <strong>Reservoir → Agriculture flow:</strong> Irrigation demand = (Crop demand − Rainfall contribution) ÷ Irrigation efficiency × Area.
          Net demand = {(agri.cropDemandMM - agri.rainfallContrib).toFixed(1)} mm/d effective crop need ÷ {(agri.irrigationEff * 100).toFixed(0)}% efficiency = {(agri.demandMCM / agri.areaHa * 1e6 * 1000).toFixed(1)} mm/ha effective field application.
          Agricultural demand feeds RegretGuard's release optimisation.
        </div>
      </div>

      {/* Rainwater harvesting */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4">Local Rainwater Harvesting</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-1">Catchment Area (m²)</label>
              <input type="range" min={100} max={50000} step={100} value={harvestArea}
                onChange={e => setHarvestArea(Number(e.target.value))}
                className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>100 m²</span><span className="font-semibold text-foreground">{harvestArea.toLocaleString()} m²</span><span>50,000 m²</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Rainfall (mm)</label>
              <input type="range" min={5} max={200} step={5} value={rainfallMM}
                onChange={e => setRainfallMM(Number(e.target.value))}
                className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>5 mm</span><span className="font-semibold text-foreground">{rainfallMM} mm</span><span>200 mm</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Potential Harvestable Water</div>
              <div className="text-3xl font-bold font-tabular text-emerald-600 dark:text-emerald-400">
                {harvesting.harvestableLitres.toLocaleString()} L
              </div>
              <div className="text-xs text-muted-foreground mt-1">= {harvesting.harvestableMCM.toFixed(4)} MCM (runoff coefficient: 0.75)</div>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border">
              Harvestable = Area × Rainfall × Runoff coefficient<br />
              = {harvestArea.toLocaleString()} × {rainfallMM / 1000} m × 0.75 × 1000 = {harvesting.harvestableLitres.toLocaleString()} L<br />
              <strong>Note:</strong> Local harvesting reduces future demand pressure but does not directly change reservoir operations unless incorporated into the demand model.
            </div>
          </div>
        </div>
      </div>

      {/* Water transfer scenario */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-1">Water Transfer Scenario</h2>
        <p className="text-xs text-muted-foreground mb-4">Planning simulation only — does not physically transfer water</p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1">Requested Volume (MCM)</label>
              <input type="range" min={5} max={100} step={5} value={transferRequest}
                onChange={e => setTransferRequest(Number(e.target.value))}
                className="w-full accent-primary" />
              <span className="text-xs font-semibold text-primary">{transferRequest} MCM</span>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Transfer Efficiency</label>
              <input type="range" min={0.4} max={0.95} step={0.05} value={transferEfficiency}
                onChange={e => setTransferEfficiency(Number(e.target.value))}
                className="w-full accent-primary" />
              <span className="text-xs font-semibold text-primary">{(transferEfficiency * 100).toFixed(0)}%</span>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Distance (km)</label>
              <input type="range" min={10} max={300} step={10} value={transferDistance}
                onChange={e => setTransferDistance(Number(e.target.value))}
                className="w-full accent-primary" />
              <span className="text-xs font-semibold text-primary">{transferDistance} km</span>
            </div>
            <button onClick={handleTransfer}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg gradient-aqua text-white text-sm font-semibold hover:opacity-90 transition-opacity">
              Calculate Transfer Feasibility
            </button>
          </div>
          {transferResult && (
            <div className="bg-muted/30 rounded-xl p-4 space-y-3 border border-border">
              <div className={cn("text-center py-2 rounded-lg font-bold text-sm",
                transferResult.feasible ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              )}>
                {transferResult.feasible ? "✓ Feasible" : "⚠ Partially Feasible"}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div className="text-muted-foreground">Feasible volume</div>
                <div className="font-bold">{transferResult.feasibleMCM.toFixed(1)} MCM</div>
                <div className="text-muted-foreground">Transfer loss</div>
                <div className="font-bold text-red-500">{transferResult.lostMCM.toFixed(1)} MCM</div>
                <div className="text-muted-foreground">Target increase</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400">{transferResult.targetIncreaseMCM.toFixed(1)} MCM</div>
                <div className="text-muted-foreground">Remaining source</div>
                <div className="font-bold">{transferResult.remainingSourceMCM.toFixed(0)} MCM</div>
                <div className="text-muted-foreground">Travel time</div>
                <div className="font-bold">{transferResult.travelTimeHours}h</div>
              </div>
              <p className="text-[10px] italic text-muted-foreground">Scenario Planning Only — does not physically transfer water. Cauvery inter-state orders not modelled.</p>
            </div>
          )}
        </div>
      </div>

      <DecisionNotice />
    </div>
  );
}
