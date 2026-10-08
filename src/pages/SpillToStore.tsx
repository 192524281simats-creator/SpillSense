import { useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import {
  CAPTURE_SITES, computeCapture, generateInflowForecast, runRegretGuard,
  type CaptureSite, DAM_CONFIG
} from "@/lib/engine";
import { SyntheticBadge, DataBadge, DecisionNotice } from "@/components/features/DataBadge";
import { MapPin, Droplets, Clock, AlertTriangle, CheckCircle, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function suitabilityColor(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 40) return "#f59e0b";
  if (score >= 20) return "#f97316";
  return "#ef4444";
}

function suitabilityLabel(score: number): string {
  if (score >= 70) return "Good";
  if (score >= 40) return "Moderate";
  if (score >= 20) return "Poor";
  return "Avoid";
}

const SITE_TYPE_LABELS: Record<CaptureSite["type"], string> = {
  check_dam: "Check Dam",
  recharge_basin: "Recharge Basin",
  community_pond: "Community Pond",
  wetland: "Wetland",
  storage_tank: "Storage Tank",
  agricultural_pond: "Agricultural Pond",
};

export default function SpillToStore() {
  const { storageMCM, scenario, dailyDemandMCM, ecologicalMinMCM } = useApp();
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);

  const forecast = useMemo(() => generateInflowForecast(scenario, storageMCM), [scenario, storageMCM]);
  const rg = useMemo(() => runRegretGuard(storageMCM, forecast, dailyDemandMCM, ecologicalMinMCM, scenario), [storageMCM, forecast, dailyDemandMCM, ecologicalMinMCM, scenario]);

  const availableRelease = Math.max(rg.recommended.totalSpillMCM, 15);
  const capture = useMemo(() => computeCapture(CAPTURE_SITES, availableRelease), [availableRelease]);

  const sorted = [...capture.sites].sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  const selectedSiteData = sorted.find(s => s.id === selectedSite);

  const damPos: [number, number] = [DAM_CONFIG.location.lat, DAM_CONFIG.location.lng];

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Spill-to-Store</h1>
          <p className="text-muted-foreground text-sm">Identify downstream infrastructure with potential capture capacity</p>
        </div>
        <div className="flex items-center gap-2">
          <SyntheticBadge />
          <DataBadge source="ESTIMATED" />
        </div>
      </div>

      {/* Alert banner */}
      {rg.recommended.totalSpillMCM > 5 && (
        <div className="glass-card rounded-xl p-4 border-l-4 border-l-amber-500 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-sm">Release Expected Within 36–48 Hours</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Under {scenario} scenario, potential release: <strong>{rg.recommended.totalSpillMCM.toFixed(1)} MCM</strong> ·
              Potential capture: <strong className="text-emerald-600 dark:text-emerald-400">{capture.totalCaptureMCM.toFixed(1)} MCM</strong> across {capture.suitableSiteCount} suitable sites
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 italic">Operational verification required before any real-world release routing.</p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Potential Release", value: `${availableRelease.toFixed(1)} MCM`, color: "#f97316", source: "MODEL_PREDICTION" as const },
          { label: "Potential Capture", value: `${capture.totalCaptureMCM.toFixed(1)} MCM`, color: "#10b981", source: "CALCULATED" as const },
          { label: "Suitable Sites", value: `${capture.suitableSiteCount}`, color: "#22d3ee", source: "ESTIMATED" as const },
          { label: "Capture Efficiency", value: `${((capture.totalCaptureMCM / availableRelease) * 100).toFixed(0)}%`, color: "#8b5cf6", source: "CALCULATED" as const },
        ].map(item => (
          <div key={item.label} className="glass-card rounded-xl p-4 border-l-4" style={{ borderLeftColor: item.color }}>
            <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
            <div className="text-2xl font-bold font-tabular" style={{ color: item.color }}>{item.value}</div>
            <DataBadge source={item.source} className="mt-1" />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Site list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            Best Areas to Capture Water
          </h2>
          {sorted.map((site, i) => (
            <button
              key={site.id}
              onClick={() => setSelectedSite(site.id === selectedSite ? null : site.id)}
              className={cn(
                "w-full text-left glass-card rounded-xl p-4 transition-all hover:shadow-card-hover border",
                selectedSite === site.id ? "border-primary ring-1 ring-primary" : "border-border"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: suitabilityColor(site.suitabilityScore) }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{site.name}</div>
                  <div className="text-xs text-muted-foreground">{SITE_TYPE_LABELS[site.type]}</div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    <span className="font-semibold" style={{ color: suitabilityColor(site.suitabilityScore) }}>
                      {suitabilityLabel(site.suitabilityScore)} ({site.suitabilityScore})
                    </span>
                    <span className="text-muted-foreground">{site.distanceKm} km</span>
                    <span className="text-muted-foreground">~{site.travelTimeHours}h</span>
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs">
                    <span className="text-muted-foreground">Available: {site.availableCapacityMCM.toFixed(1)} MCM</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Capture: {site.potentialCaptureMCM.toFixed(1)} MCM
                    </span>
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {selectedSite === site.id && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="text-muted-foreground">Total capacity</div>
                    <div className="font-medium">{site.capacityMCM.toFixed(1)} MCM</div>
                    <div className="text-muted-foreground">Flood exposure</div>
                    <div className={cn("font-medium capitalize",
                      site.floodExposureRisk === "high" ? "text-red-500" :
                      site.floodExposureRisk === "moderate" ? "text-amber-500" : "text-emerald-500"
                    )}>{site.floodExposureRisk}</div>
                    <div className="text-muted-foreground">Data confidence</div>
                    <div className="font-medium">{(site.dataConfidence * 100).toFixed(0)}%</div>
                    <div className="text-muted-foreground">Status</div>
                    <div className="font-medium capitalize">{site.status}</div>
                    <div className="text-muted-foreground">Source</div>
                    <div><DataBadge source={site.source as any} /></div>
                  </div>
                  <div className="text-[10px] italic text-muted-foreground mt-2">
                    Suitability = capacity (35%) + travel time (25%) + site type (15%) + flood safety (15%) + data confidence (10%)
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-xl overflow-hidden" style={{ height: "560px" }}>
            {mapError ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 p-6 bg-muted/20">
                <MapPin className="w-10 h-10 text-muted-foreground" />
                <div className="text-center">
                  <div className="font-semibold text-sm mb-1">Map unavailable</div>
                  <div className="text-xs text-muted-foreground">Showing site list above. Map requires network access.</div>
                </div>
                <div className="w-full space-y-2 max-w-sm">
                  {sorted.slice(0, 4).map(site => (
                    <div key={site.id} className="flex justify-between text-xs bg-background rounded-lg p-2.5 border border-border">
                      <span>{site.name}</span>
                      <span className="font-semibold" style={{ color: suitabilityColor(site.suitabilityScore) }}>
                        {site.distanceKm}km · {suitabilityLabel(site.suitabilityScore)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <MapContainer
                center={damPos}
                zoom={9}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  eventHandlers={{ tileerror: () => setMapError(true) }}
                />

                {/* Dam marker */}
                <CircleMarker
                  center={damPos}
                  radius={14}
                  pathOptions={{ fillColor: "#22d3ee", color: "#0891b2", weight: 3, fillOpacity: 0.9 }}
                >
                  <Popup>
                    <strong>Mettur Dam</strong><br />
                    Stanley Reservoir · Cauvery River<br />
                    <small>SYNTHETIC DEMO DATA</small>
                  </Popup>
                </CircleMarker>

                {/* Cauvery flow path (simplified) */}
                <Polyline
                  positions={[
                    damPos,
                    [11.7, 77.88],
                    [11.65, 77.95],
                    [11.58, 78.1],
                    [11.45, 78.3],
                    [11.35, 78.5],
                  ]}
                  pathOptions={{ color: "#3b82f6", weight: 3, opacity: 0.6, dashArray: "8 4" }}
                />

                {/* Capture sites */}
                {capture.sites.map(site => (
                  <CircleMarker
                    key={site.id}
                    center={[site.lat, site.lng]}
                    radius={site.potentialCaptureMCM > 5 ? 12 : 8}
                    pathOptions={{
                      fillColor: suitabilityColor(site.suitabilityScore),
                      color: "#fff",
                      weight: 2,
                      fillOpacity: 0.85,
                    }}
                    eventHandlers={{ click: () => setSelectedSite(site.id) }}
                  >
                    <Popup>
                      <div style={{ minWidth: "200px" }}>
                        <strong>{site.name}</strong><br />
                        <span>{SITE_TYPE_LABELS[site.type]}</span><br />
                        <hr style={{ margin: "4px 0" }} />
                        Suitability: <strong>{suitabilityLabel(site.suitabilityScore)} ({site.suitabilityScore})</strong><br />
                        Available: {site.availableCapacityMCM.toFixed(1)} MCM<br />
                        Potential Capture: <strong>{site.potentialCaptureMCM.toFixed(1)} MCM</strong><br />
                        Distance: {site.distanceKm} km · Travel: ~{site.travelTimeHours}h<br />
                        <small style={{ color: "#888" }}>Source: {site.source} · Confidence: {(site.dataConfidence * 100).toFixed(0)}%</small><br />
                        <small style={{ color: "#c00" }}>Operational verification required.</small>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 flex-wrap text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-cyan-500" />Dam</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" />Good (≥70)</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500" />Moderate (40–69)</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500" />Poor (20–39)</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" />Avoid</div>
            <SyntheticBadge short />
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4 border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
        <p className="text-xs text-amber-700 dark:text-amber-400">
          <strong>Planning simulation only.</strong> Actual capture requires field verification, infrastructure availability and operational approval.
          Site capacities are ESTIMATED from available data. Cauvery inter-state water sharing orders are not modelled.
        </p>
      </div>

      <DecisionNotice />
    </div>
  );
}
