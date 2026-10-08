import { SyntheticBadge, DataBadge, DecisionNotice } from "@/components/features/DataBadge";
import { Database, CheckCircle, XCircle, AlertCircle, ExternalLink, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const DATA_SOURCES = [
  {
    name: "Open-Meteo Forecast API",
    url: "https://api.open-meteo.com/v1/forecast",
    type: "Weather Forecast",
    variables: "precipitation_sum, temperature, 7-day",
    status: "not_connected",
    fallback: "Synthetic Demo Data",
    description: "7-day weather forecast — free, no API key required.",
    label: "SYNTHETIC" as const,
  },
  {
    name: "Open-Meteo ERA5 Archive",
    url: "https://archive-api.open-meteo.com/v1/archive",
    type: "Historical Climate",
    variables: "ERA5 reanalysis precipitation, temperature",
    status: "not_connected",
    fallback: "Synthetic historical season",
    description: "Historical weather reanalysis from ECMWF ERA5.",
    label: "SYNTHETIC" as const,
  },
  {
    name: "Open-Meteo Ensemble API",
    url: "https://ensemble-api.open-meteo.com/v1/ensemble",
    type: "Probabilistic Forecast",
    variables: "GFS seamless ensemble members",
    status: "not_connected",
    fallback: "Seeded stochastic ensemble",
    description: "Ensemble forecast for P10/P50/P90 generation.",
    label: "SYNTHETIC" as const,
  },
  {
    name: "Open-Meteo Flood API",
    url: "https://flood-api.open-meteo.com/v1/flood",
    type: "River Discharge",
    variables: "river_discharge (GloFAS modelled)",
    status: "not_connected",
    fallback: "Inflow model from rainfall",
    description: "GloFAS modelled river discharge estimate, not a gauge reading.",
    label: "SYNTHETIC" as const,
  },
  {
    name: "NOAA CPC ONI Index",
    url: "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt",
    type: "ENSO Index",
    variables: "Oceanic Niño Index",
    status: "not_connected",
    fallback: "Scenario selector (demo values)",
    description: "Official ONI values for El Niño/Neutral/La Niña classification.",
    label: "SYNTHETIC" as const,
  },
  {
    name: "NASA POWER API",
    url: "https://power.larc.nasa.gov/api/temporal/daily/point",
    type: "Solar/Climate",
    variables: "PRECTOTCORR, T2M, ALLSKY_SFC_SW_DWN",
    status: "not_connected",
    fallback: "Scenario-adjusted synthetic values",
    description: "NASA POWER daily climate data for catchment.",
    label: "SYNTHETIC" as const,
  },
  {
    name: "India-WRIS / CWC",
    url: "https://indiawris.gov.in",
    type: "Official Reservoir Data",
    variables: "Daily storage, level, inflow, outflow",
    status: "future",
    fallback: "Synthetic demo data",
    description: "Official Central Water Commission / WRIS live reservoir data.",
    label: "SYNTHETIC" as const,
  },
  {
    name: "IMD / CHIRPS / GPM IMERG",
    url: "",
    type: "Satellite Rainfall",
    variables: "Daily gridded precipitation",
    status: "future",
    fallback: "Open-Meteo ERA5 / synthetic",
    description: "IMD observed and satellite rainfall products.",
    label: "SYNTHETIC" as const,
  },
  {
    name: "Overpass API (OpenStreetMap)",
    url: "https://overpass-api.de/api/interpreter",
    type: "Geospatial",
    variables: "Water bodies, tanks, infrastructure",
    status: "not_connected",
    fallback: "Hardcoded demo capture sites",
    description: "OSM downstream tank/pond candidates for Spill-to-Store.",
    label: "ESTIMATED" as const,
  },
];

const MODEL_SOURCES = [
  { name: "Reservoir Water Balance", type: "CALCULATED", desc: "Storage(t+1) = Storage(t) + Inflow − Release − Spill − Evaporation. Hand-checked mass conservation." },
  { name: "Probabilistic Inflow", type: "MODEL_PREDICTION", desc: "Seeded stochastic log-normal distribution adjusted by ENSO scenario multipliers. Deterministic with seed." },
  { name: "RegretGuard", type: "CALCULATED", desc: "Minimax regret over Dry/Normal/Wet futures. Loss = 1.0×spill + 1.5×shortage + 0.5×emergency_days." },
  { name: "Backtest", type: "SYNTHETIC", desc: "60-day seeded historical simulation under ENSO scenario. No data leakage — each day computed from prior state." },
  { name: "Spill-to-Store Suitability", type: "ESTIMATED", desc: "Scoring: capacity (35%) + travel time (25%) + site type (15%) + flood safety (15%) + data confidence (10%)." },
  { name: "Resilience Score", type: "CALCULATED", desc: "SpillSense Demonstration Resilience Score — weighted sum of 7 components. Not a validated external index." },
];

const statusIcon = (status: string) => {
  if (status === "connected") return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (status === "future") return <AlertCircle className="w-4 h-4 text-blue-400" />;
  return <XCircle className="w-4 h-4 text-muted-foreground" />;
};

const statusLabel = (status: string) => {
  if (status === "connected") return "Connected";
  if (status === "future") return "Not connected (future)";
  return "Not connected (demo fallback active)";
};

function downloadCSV() {
  const rows = [
    ["Source", "Type", "Status", "Fallback", "Data Label"],
    ...DATA_SOURCES.map(s => [s.name, s.type, s.status, s.fallback, s.label]),
  ];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "spillsense_data_sources.csv"; a.click();
  URL.revokeObjectURL(url);
}

export default function DataSources() {
  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            Data & Sources
          </h1>
          <p className="text-muted-foreground text-sm">Transparent data provenance — every source, label, and fallback</p>
        </div>
        <div className="flex items-center gap-2">
          <SyntheticBadge />
          <button onClick={downloadCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
            <Download className="w-3.5 h-3.5" /> Download CSV
          </button>
        </div>
      </div>

      {/* Active fallback notice */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
          <div>
            <div className="font-semibold text-sm text-purple-700 dark:text-purple-300">SYNTHETIC DEMO DATA — Active</div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              All data in this demonstration is synthetically generated from deterministic seeded models. No live API connections are active.
              The pipeline architecture accepts real datasets — IMD, CHIRPS, India-WRIS, CWC — and can substitute them when available.
              Never present synthetic data as real measurements.
            </p>
          </div>
        </div>
      </div>

      {/* Data label legend */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-3">Data Source Label Legend</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["REAL", "OFFICIAL", "HISTORICAL", "MODELLED", "ESTIMATED", "CALCULATED", "MODEL_PREDICTION", "SYNTHETIC"] as const).map(label => (
            <div key={label} className="flex items-center gap-2">
              <DataBadge source={label} />
              <span className="text-xs text-muted-foreground capitalize">{label.toLowerCase().replace("_", " ")}</span>
            </div>
          ))}
        </div>
      </div>

      {/* External data sources */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">External Data Sources</h2>
          <span className="text-xs text-muted-foreground">{DATA_SOURCES.filter(s => s.status === "connected").length}/{DATA_SOURCES.length} connected</span>
        </div>
        <div className="divide-y divide-border">
          {DATA_SOURCES.map(src => (
            <div key={src.name} className="px-5 py-4">
              <div className="flex items-start gap-3">
                {statusIcon(src.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{src.name}</span>
                    <DataBadge source={src.label} />
                    {src.url && (
                      <a href={src.url} target="_blank" rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 transition-colors">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{src.type} · {src.variables}</div>
                  <div className="text-xs text-muted-foreground mt-1">{src.description}</div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] text-muted-foreground">{statusLabel(src.status)}</span>
                    {src.status !== "connected" && (
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">→ Fallback: {src.fallback}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Internal models */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Internal Models & Calculations</h2>
        </div>
        <div className="divide-y divide-border">
          {MODEL_SOURCES.map(m => (
            <div key={m.name} className="px-5 py-4 flex items-start gap-3">
              <DataBadge source={m.type as any} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-medium text-sm">{m.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Future targets */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4">Future Integration Targets (Not Connected)</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            "CWC India-WRIS real-time reservoir telemetry",
            "IMD gridded rainfall (1°×1° daily)",
            "CHIRPS satellite rainfall (0.05° resolution)",
            "GPM IMERG near-real-time precipitation",
            "IRI ENSO forecasts (seasonal outlook)",
            "Calibrated hydrological model (HEC-HMS/SWAT)",
            "Real downstream infrastructure database",
            "Official delta irrigation demand (Tamil Nadu PWD)",
          ].map(item => (
            <div key={item} className="flex items-center gap-2 text-xs">
              <AlertCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Limitations */}
      <div className="glass-card rounded-xl p-5 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
        <h2 className="text-sm font-semibold mb-3 text-amber-700 dark:text-amber-400">Known Limitations</h2>
        <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1.5">
          {[
            "Simplified hydrological model — no gate operations, routing detail, or tributary contributions",
            "Site capacities are ESTIMATED from area/type; not surveyed field measurements",
            "Upstream Karnataka operations (KRS, Kabini, Biligundlu) treated as scenario assumptions",
            "GloFAS flood discharge is a modelled estimate — not a real gauge reading",
            "Tamil/Hindi translations need native speaker review",
            "Minimax regret can be conservative in high-storage, high-inflow futures",
            "Inter-state Cauvery water-sharing tribunal orders are NOT modelled",
            "RegretGuard loss function weights are demonstration defaults; not operationally calibrated",
          ].map(l => (
            <li key={l} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0">•</span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
      </div>

      <DecisionNotice />
    </div>
  );
}
