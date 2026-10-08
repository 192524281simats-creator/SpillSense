/**
 * SpillSense Core Calculation Engine
 * All reservoir simulation, RegretGuard optimization, and hydrological calculations.
 * Uses deterministic seeded synthetic data — clearly labelled as SYNTHETIC DEMO DATA.
 */

// ─── Constants & Config ───────────────────────────────────────────────────────

export const DAM_CONFIG = {
  name: "Mettur Dam (Stanley Reservoir)",
  river: "Cauvery",
  location: { lat: 11.8, lng: 77.8 },
  fullLevel_ft: 120,
  capacityTMC: 93.5,
  capacityMCM: 93.5 * 28.317,
  floodControlLevel_ft: 115,
  minOperatingLevel_ft: 80,
  ecologicalReserveMCM: 200,
  minEcologicalFlow_cumecs: 12,
  maxDailyRelease_MCM: 80,
  catchmentArea_km2: 17000,
  source: "TO VERIFY — defaults from public domain estimates",
};

export const UNIT_CONVERSION = {
  TMC_to_MCM: 28.317,
  MCM_to_TMC: 1 / 28.317,
  cusec_to_m3s: 0.028317,
  m3s_to_cusec: 1 / 0.028317,
  ft_to_m: 0.3048,
  m_to_ft: 1 / 0.3048,
  m3s_per_day_to_MCM: 0.0864,
};

// ─── Seeded RNG ───────────────────────────────────────────────────────────────

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── ENSO Scenario Definitions ───────────────────────────────────────────────

export type ScenarioType = "elnino" | "neutral" | "lanina";

export const SCENARIOS: Record<ScenarioType, {
  label: string;
  rainfallAnomaly: number;
  inflowMultiplier: number;
  drySpellProb: number;
  heavyRainProb: number;
  uncertainty: number;
  color: string;
  description: string;
}> = {
  elnino: {
    label: "El Niño",
    rainfallAnomaly: -0.22,
    inflowMultiplier: 0.72,
    drySpellProb: 0.58,
    heavyRainProb: 0.12,
    uncertainty: 0.38,
    color: "#f97316",
    description: "Drier than normal conditions, reduced inflows, higher drought risk",
  },
  neutral: {
    label: "Neutral",
    rainfallAnomaly: 0.0,
    inflowMultiplier: 1.0,
    drySpellProb: 0.28,
    heavyRainProb: 0.25,
    uncertainty: 0.22,
    color: "#22d3ee",
    description: "Near-average conditions, moderate inflow uncertainty",
  },
  lanina: {
    label: "La Niña",
    rainfallAnomaly: 0.18,
    inflowMultiplier: 1.38,
    drySpellProb: 0.12,
    heavyRainProb: 0.55,
    uncertainty: 0.32,
    color: "#3b82f6",
    description: "Wetter than normal, elevated inflows, higher spill risk",
  },
};

// ─── Inflow Generation (Probabilistic) ───────────────────────────────────────

export interface InflowForecast {
  day: number;
  date: string;
  p10: number;
  p50: number;
  p90: number;
  observed?: number;
}

export function generateInflowForecast(
  scenario: ScenarioType,
  baseStorageMCM: number,
  seed = 42
): InflowForecast[] {
  const sc = SCENARIOS[scenario];
  const rng = seededRng(seed);
  const baseInflow = 35; // MCM/day base for Mettur

  const days: InflowForecast[] = [];
  const now = new Date();

  for (let d = 0; d < 7; d++) {
    const date = new Date(now);
    date.setDate(now.getDate() + d);

    const trend = 1 + Math.sin((d / 7) * Math.PI) * 0.15;
    const median = baseInflow * sc.inflowMultiplier * trend;
    const spread = median * sc.uncertainty;

    // P10 = median - 1.28σ, P90 = median + 1.28σ (log-normal approx)
    const sigma = spread / median;
    const p10 = median * Math.exp(-1.28 * sigma + (rng() - 0.5) * 0.05);
    const p90 = median * Math.exp(1.28 * sigma + (rng() - 0.5) * 0.05);
    const observed = d === 0 ? median * (0.9 + rng() * 0.2) : undefined;

    days.push({
      day: d + 1,
      date: date.toISOString().slice(0, 10),
      p10: Math.round(p10 * 100) / 100,
      p50: Math.round(median * 100) / 100,
      p90: Math.round(p90 * 100) / 100,
      observed: observed !== undefined ? Math.round(observed * 100) / 100 : undefined,
    });
  }

  return days;
}

// ─── Reservoir Balance ────────────────────────────────────────────────────────

export interface ReservoirState {
  storageMCM: number;
  levelFt: number;
  inflow: number;
  release: number;
  spill: number;
  spillTMC: number;
  evaporation: number;
  deficitFromDemand: number;
}

const LEVEL_STORAGE_TABLE: Array<[number, number]> = [
  [60, 0], [70, 6], [80, 18], [85, 30], [90, 48],
  [95, 62], [100, 74], [105, 82], [110, 88], [115, 91], [120, 93.5],
];

export function storageToCurveMCM(storageTMC: number): number {
  return storageTMC * UNIT_CONVERSION.TMC_to_MCM;
}

export function storageToLevel(storageMCM: number): number {
  const storageTMC = storageMCM * UNIT_CONVERSION.MCM_to_TMC;
  const table = LEVEL_STORAGE_TABLE;
  if (storageTMC <= 0) return table[0][0];
  if (storageTMC >= table[table.length - 1][1]) return table[table.length - 1][0];

  for (let i = 0; i < table.length - 1; i++) {
    const [l0, s0] = table[i];
    const [l1, s1] = table[i + 1];
    if (storageTMC >= s0 && storageTMC <= s1) {
      const t = (storageTMC - s0) / (s1 - s0);
      return l0 + t * (l1 - l0);
    }
  }
  return 120;
}

export const SAFE_CAPACITY_MCM = storageToCurveMCM(DAM_CONFIG.floodControlLevel_ft === 115
  ? 91 : 91); // ~91 TMC at 115ft
export const MIN_STORAGE_MCM = storageToCurveMCM(18); // ~18 TMC at 80ft
export const FULL_CAPACITY_MCM = DAM_CONFIG.capacityMCM;

export function reservoirStep(
  storageMCM: number,
  inflowMCM: number,
  releaseMCM: number,
  demandMCM: number
): ReservoirState {
  const evaporation = storageMCM * 0.0008; // ~0.08%/day
  const projectedStorage = storageMCM + inflowMCM - releaseMCM - evaporation;
  const spill = Math.max(0, projectedStorage - SAFE_CAPACITY_MCM);
  const actualStorage = Math.min(projectedStorage - spill, SAFE_CAPACITY_MCM);
  const finalStorage = Math.max(actualStorage, 0);
  const deficit = Math.max(0, demandMCM - releaseMCM);

  return {
    storageMCM: Math.round(finalStorage * 100) / 100,
    levelFt: Math.round(storageToLevel(finalStorage) * 10) / 10,
    inflow: inflowMCM,
    release: releaseMCM,
    spill: Math.round(spill * 100) / 100,
    spillTMC: Math.round(spill * UNIT_CONVERSION.MCM_to_TMC * 1000) / 1000,
    evaporation: Math.round(evaporation * 100) / 100,
    deficitFromDemand: Math.round(deficit * 100) / 100,
  };
}

// ─── Policy Definitions ───────────────────────────────────────────────────────

export type PolicyId = "hold" | "conservative" | "aggressive" | "adaptive" | "regretguard";

export const POLICIES: Record<PolicyId, { label: string; description: string; color: string }> = {
  hold: { label: "Hold", description: "Release only minimum ecological flow", color: "#64748b" },
  conservative: { label: "Conservative Pre-Release", description: "Release 20% above demand", color: "#3b82f6" },
  aggressive: { label: "Aggressive Pre-Release", description: "Release 60% above demand to prevent spill", color: "#f97316" },
  adaptive: { label: "Forecast-Adaptive", description: "Scale release with P90 inflow uncertainty", color: "#8b5cf6" },
  regretguard: { label: "RegretGuard", description: "Minimax-regret optimal safe policy", color: "#22d3ee" },
};

export interface PolicyResult {
  policyId: PolicyId;
  label: string;
  color: string;
  totalSpillMCM: number;
  totalSpillTMC: number;
  totalReleaseMCM: number;
  endStorageMCM: number;
  endStoragePct: number;
  endLevelFt: number;
  droughtRisk: number;
  spillRisk: number;
  emergencyDays: number;
  ecologicalViolation: boolean;
  safetyViolation: boolean;
  rejectedReason: string | null;
  worstCaseRegret: number;
  regretDry: number;
  regretNormal: number;
  regretWet: number;
  dailyStates: ReservoirState[];
  dailyReleases: number[];
}

function computePolicyRelease(
  policyId: PolicyId,
  storageMCM: number,
  inflowP50: number,
  inflowP90: number,
  demandMCM: number,
  ecologicalMin: number
): number {
  const minEco = ecologicalMin;
  const safeCapMCM = SAFE_CAPACITY_MCM;
  const floodBuffer = safeCapMCM - storageMCM;

  switch (policyId) {
    case "hold":
      return Math.max(minEco, demandMCM * 0.5);
    case "conservative":
      return Math.max(minEco, demandMCM * 1.2);
    case "aggressive":
      return Math.max(minEco, Math.min(demandMCM * 1.6 + inflowP50 * 0.3, DAM_CONFIG.maxDailyRelease_MCM));
    case "adaptive": {
      const uncertaintyFactor = inflowP90 / (inflowP50 + 1);
      const base = demandMCM * (1 + (uncertaintyFactor - 1) * 0.4);
      return Math.max(minEco, Math.min(base, DAM_CONFIG.maxDailyRelease_MCM));
    }
    case "regretguard": {
      // Balance: if storage is high and P90 inflow is large, release more
      const storageRatio = storageMCM / safeCapMCM;
      const urgency = Math.max(0, storageRatio - 0.75) * 4;
      const inflowUncertainty = (inflowP90 - inflowP50) / (inflowP50 + 1);
      const base = demandMCM * (1 + urgency * 0.5 + inflowUncertainty * 0.3);
      return Math.max(minEco, Math.min(base, DAM_CONFIG.maxDailyRelease_MCM));
    }
    default:
      return demandMCM;
  }
}

export function simulatePolicy(
  policyId: PolicyId,
  initialStorageMCM: number,
  forecast: InflowForecast[],
  dailyDemandMCM: number,
  ecologicalMinMCM: number,
  scenario: ScenarioType
): PolicyResult {
  const sc = SCENARIOS[scenario];
  let storage = initialStorageMCM;
  const dailyStates: ReservoirState[] = [];
  const dailyReleases: number[] = [];
  let emergencyDays = 0;
  let ecologicalViolation = false;

  for (const day of forecast) {
    const release = computePolicyRelease(
      policyId, storage, day.p50, day.p90, dailyDemandMCM, ecologicalMinMCM
    );

    if (release < ecologicalMinMCM * 0.9) ecologicalViolation = true;
    if (release > DAM_CONFIG.maxDailyRelease_MCM * 0.95) emergencyDays++;

    const state = reservoirStep(storage, day.p50, release, dailyDemandMCM);
    dailyStates.push(state);
    dailyReleases.push(release);
    storage = state.storageMCM;
  }

  const totalSpill = dailyStates.reduce((s, d) => s + d.spill, 0);
  const totalRelease = dailyReleases.reduce((s, r) => s + r, 0);
  const endStorage = storage;
  const droughtRisk = endStorage < MIN_STORAGE_MCM * 1.2
    ? 0.85 : endStorage < MIN_STORAGE_MCM * 1.5 ? 0.45 : 0.1;
  const spillRisk = totalSpill > 50 ? 0.85 : totalSpill > 20 ? 0.55 : totalSpill > 5 ? 0.25 : 0.05;

  // Safety checks
  let safetyViolation = false;
  let rejectedReason: string | null = null;
  if (ecologicalViolation) {
    safetyViolation = true;
    rejectedReason = "ECOLOGICAL CONSTRAINT: minimum flow violated";
  } else if (endStorage < MIN_STORAGE_MCM * 0.85) {
    safetyViolation = true;
    rejectedReason = "SAFETY: end storage below minimum operating level";
  }

  // Regret computation (weighted loss function)
  const spillW = 1.0, shortageW = 1.5, emergW = 0.5;
  const totalDeficit = dailyStates.reduce((s, d) => s + d.deficitFromDemand, 0);

  // Across three scenario futures (dry/normal/wet)
  const lossDry = spillW * totalSpill * 0.3 + shortageW * totalDeficit * 1.5 + emergW * emergencyDays;
  const lossNormal = spillW * totalSpill + shortageW * totalDeficit + emergW * emergencyDays;
  const lossWet = spillW * totalSpill * 1.8 + shortageW * totalDeficit * 0.5 + emergW * emergencyDays;

  return {
    policyId,
    label: POLICIES[policyId].label,
    color: POLICIES[policyId].color,
    totalSpillMCM: Math.round(totalSpill * 100) / 100,
    totalSpillTMC: Math.round(totalSpill * UNIT_CONVERSION.MCM_to_TMC * 1000) / 1000,
    totalReleaseMCM: Math.round(totalRelease * 100) / 100,
    endStorageMCM: Math.round(endStorage * 100) / 100,
    endStoragePct: Math.round((endStorage / SAFE_CAPACITY_MCM) * 1000) / 10,
    endLevelFt: Math.round(storageToLevel(endStorage) * 10) / 10,
    droughtRisk: Math.round(droughtRisk * 100) / 100,
    spillRisk: Math.round(spillRisk * 100) / 100,
    emergencyDays,
    ecologicalViolation,
    safetyViolation,
    rejectedReason,
    worstCaseRegret: Math.round(Math.max(lossDry, lossNormal, lossWet) * 100) / 100,
    regretDry: Math.round(lossDry * 100) / 100,
    regretNormal: Math.round(lossNormal * 100) / 100,
    regretWet: Math.round(lossWet * 100) / 100,
    dailyStates,
    dailyReleases,
  };
}

export interface RegretGuardResult {
  recommended: PolicyResult;
  allPolicies: PolicyResult[];
  rejectedPolicies: PolicyResult[];
  safePolicies: PolicyResult[];
  regretTable: Record<PolicyId, { dry: number; normal: number; wet: number; worst: number }>;
  explanation: string;
  confidence: number;
  releaseRecommendationMCM: number;
  releaseRecommendationCusecs: number;
}

export function runRegretGuard(
  initialStorageMCM: number,
  forecast: InflowForecast[],
  dailyDemandMCM: number,
  ecologicalMinMCM: number,
  scenario: ScenarioType
): RegretGuardResult {
  const allPolicyIds: PolicyId[] = ["hold", "conservative", "aggressive", "adaptive", "regretguard"];
  const allPolicies = allPolicyIds.map(id =>
    simulatePolicy(id, initialStorageMCM, forecast, dailyDemandMCM, ecologicalMinMCM, scenario)
  );

  const safePolicies = allPolicies.filter(p => !p.safetyViolation);
  const rejectedPolicies = allPolicies.filter(p => p.safetyViolation);

  let recommended: PolicyResult;
  if (safePolicies.length === 0) {
    // No safe policy — return the least unsafe
    recommended = [...allPolicies].sort((a, b) => a.worstCaseRegret - b.worstCaseRegret)[0];
    recommended = { ...recommended, rejectedReason: "WARNING: no fully safe policy found; returning least-unsafe" };
  } else {
    recommended = safePolicies.reduce((best, cur) =>
      cur.worstCaseRegret < best.worstCaseRegret ? cur : best
    );
  }

  const regretTable = {} as Record<PolicyId, { dry: number; normal: number; wet: number; worst: number }>;
  const minDry = Math.min(...allPolicies.map(p => p.regretDry));
  const minNormal = Math.min(...allPolicies.map(p => p.regretNormal));
  const minWet = Math.min(...allPolicies.map(p => p.regretWet));

  for (const p of allPolicies) {
    regretTable[p.policyId] = {
      dry: Math.round((p.regretDry - minDry) * 100) / 100,
      normal: Math.round((p.regretNormal - minNormal) * 100) / 100,
      wet: Math.round((p.regretWet - minWet) * 100) / 100,
      worst: Math.round(Math.max(p.regretDry - minDry, p.regretNormal - minNormal, p.regretWet - minWet) * 100) / 100,
    };
  }

  const recRelease = recommended.dailyReleases[0] ?? dailyDemandMCM;
  const confidence = safePolicies.length >= 3
    ? 0.82 : safePolicies.length >= 2 ? 0.68 : 0.45;

  const sc = SCENARIOS[scenario];
  const storageRatio = (initialStorageMCM / SAFE_CAPACITY_MCM * 100).toFixed(0);
  const explanation = buildExplanation(recommended, sc, storageRatio, safePolicies, rejectedPolicies);

  return {
    recommended,
    allPolicies,
    rejectedPolicies,
    safePolicies,
    regretTable,
    explanation,
    confidence,
    releaseRecommendationMCM: Math.round(recRelease * 100) / 100,
    releaseRecommendationCusecs: Math.round(recRelease / UNIT_CONVERSION.m3s_per_day_to_MCM / UNIT_CONVERSION.cusec_to_m3s),
  };
}

function buildExplanation(
  rec: PolicyResult,
  sc: typeof SCENARIOS.neutral,
  storageRatio: string,
  safe: PolicyResult[],
  rejected: PolicyResult[]
): string {
  const parts: string[] = [];
  parts.push(`RegretGuard selected "${rec.label}" as the recommended release strategy.`);
  parts.push(`Current reservoir storage is at ${storageRatio}% of flood-control capacity under a ${sc.label} scenario (rainfall anomaly: ${sc.rainfallAnomaly > 0 ? "+" : ""}${(sc.rainfallAnomaly * 100).toFixed(0)}%).`);

  if (rejected.length > 0) {
    parts.push(`${rejected.length} policy/policies were rejected for safety constraint violations: ${rejected.map(r => `"${r.label}" (${r.rejectedReason})`).join("; ")}.`);
  }

  parts.push(`Among ${safe.length} safe policy/policies, "${rec.label}" has the lowest worst-case regret (${rec.worstCaseRegret.toFixed(1)} units), meaning it performs best even in the most unfavorable future.`);

  if (rec.spillRisk > 0.5) {
    parts.push(`Spill risk is elevated (${(rec.spillRisk * 100).toFixed(0)}%). Consider increasing release if inflow exceeds P50.`);
  }
  if (rec.droughtRisk > 0.4) {
    parts.push(`Drought risk remains moderate (${(rec.droughtRisk * 100).toFixed(0)}%). Monitor storage closely over the next 7 days.`);
  }

  return parts.join(" ");
}

// ─── Backtest ─────────────────────────────────────────────────────────────────

export interface BacktestResult {
  season: "wet" | "deficit";
  totalSpillRuleCurve_MCM: number;
  totalSpillRegretGuard_MCM: number;
  spillAvoidedMCM: number;
  spillAvoidedTMC: number;
  emergencyDaysRuleCurve: number;
  emergencyDaysRegretGuard: number;
  endStorageRuleCurve_MCM: number;
  endStorageRegretGuard_MCM: number;
  endStorageDifference_MCM: number;
  minStorageRuleCurve: number;
  minStorageRegretGuard: number;
  ecologicalViolationsRuleCurve: number;
  ecologicalViolationsRegretGuard: number;
  days: Array<{
    day: number;
    inflow: number;
    storageRuleCurve: number;
    storageRegretGuard: number;
    spillRuleCurve: number;
    spillRegretGuard: number;
    releaseRuleCurve: number;
    releaseRegretGuard: number;
  }>;
  conclusion: string;
  dataLabel: string;
  forecastMethod: string;
}

export function runBacktest(season: "wet" | "deficit", seed = 42): BacktestResult {
  const rng = seededRng(seed);
  const scenarioForSeason: ScenarioType = season === "wet" ? "lanina" : "elnino";
  const sc = SCENARIOS[scenarioForSeason];
  const days = 60;
  const baseInflow = season === "wet" ? 55 : 22;
  const demandMCM = 8;
  const ecoMin = 1.04; // 12 m³/s × 0.0864
  let storageRC = storageToCurveMCM(70); // rule-curve starts at 70 TMC
  let storageRG = storageToCurveMCM(70);
  let totalSpillRC = 0, totalSpillRG = 0;
  let emergRC = 0, emergRG = 0;
  let ecoViolRC = 0, ecoViolRG = 0;
  const dayData = [];

  for (let d = 0; d < days; d++) {
    const trend = 1 + Math.sin((d / days) * Math.PI) * 0.5;
    const noise = 0.85 + rng() * 0.3;
    const inflow = baseInflow * sc.inflowMultiplier * trend * noise;

    // Rule curve: fixed release based on current level
    const levelRC = storageToLevel(storageRC);
    const releaseRC = levelRC > 110
      ? Math.min(demandMCM * 2.5, DAM_CONFIG.maxDailyRelease_MCM)
      : levelRC > 100 ? demandMCM * 1.5 : Math.max(ecoMin, demandMCM);

    // RegretGuard: adaptive
    const storageRatio = storageRG / SAFE_CAPACITY_MCM;
    const urgency = Math.max(0, storageRatio - 0.75) * 4;
    const releaseRG = Math.max(ecoMin, Math.min(
      demandMCM * (1 + urgency * 0.5 + sc.uncertainty * 0.3),
      DAM_CONFIG.maxDailyRelease_MCM
    ));

    const stateRC = reservoirStep(storageRC, inflow, releaseRC, demandMCM);
    const stateRG = reservoirStep(storageRG, inflow, releaseRG, demandMCM);

    totalSpillRC += stateRC.spill;
    totalSpillRG += stateRG.spill;
    if (releaseRC > DAM_CONFIG.maxDailyRelease_MCM * 0.9) emergRC++;
    if (releaseRG > DAM_CONFIG.maxDailyRelease_MCM * 0.9) emergRG++;
    if (releaseRC < ecoMin * 0.9) ecoViolRC++;
    if (releaseRG < ecoMin * 0.9) ecoViolRG++;

    storageRC = stateRC.storageMCM;
    storageRG = stateRG.storageMCM;

    dayData.push({
      day: d + 1,
      inflow: Math.round(inflow * 10) / 10,
      storageRuleCurve: Math.round(storageRC * 10) / 10,
      storageRegretGuard: Math.round(storageRG * 10) / 10,
      spillRuleCurve: Math.round(stateRC.spill * 10) / 10,
      spillRegretGuard: Math.round(stateRG.spill * 10) / 10,
      releaseRuleCurve: Math.round(releaseRC * 10) / 10,
      releaseRegretGuard: Math.round(releaseRG * 10) / 10,
    });
  }

  const spillAvoided = totalSpillRC - totalSpillRG;
  const endDiff = storageRG - storageRC;

  let conclusion = `Under the ${season === "wet" ? "La Niña wet" : "El Niño deficit"} scenario (SYNTHETIC DEMO), `;
  if (spillAvoided > 10) {
    conclusion += `RegretGuard avoided an estimated ${spillAvoided.toFixed(1)} MCM (${(spillAvoided * UNIT_CONVERSION.MCM_to_TMC).toFixed(2)} TMC) of spill compared to the rule curve. `;
  } else if (spillAvoided < -5) {
    conclusion += `RegretGuard resulted in ${Math.abs(spillAvoided).toFixed(1)} MCM MORE spill than the rule curve, demonstrating its conservative approach to drought risk. `;
  } else {
    conclusion += `Both strategies produced similar spill volumes. `;
  }

  if (endDiff > 5) {
    conclusion += `RegretGuard retained ${endDiff.toFixed(1)} MCM more storage at season end.`;
  } else if (endDiff < -5) {
    conclusion += `Rule curve retained ${Math.abs(endDiff).toFixed(1)} MCM more storage — RegretGuard prioritized spill avoidance over storage.`;
  }

  return {
    season,
    totalSpillRuleCurve_MCM: Math.round(totalSpillRC * 100) / 100,
    totalSpillRegretGuard_MCM: Math.round(totalSpillRG * 100) / 100,
    spillAvoidedMCM: Math.round(spillAvoided * 100) / 100,
    spillAvoidedTMC: Math.round(spillAvoided * UNIT_CONVERSION.MCM_to_TMC * 1000) / 1000,
    emergencyDaysRuleCurve: emergRC,
    emergencyDaysRegretGuard: emergRG,
    endStorageRuleCurve_MCM: Math.round(storageRC * 100) / 100,
    endStorageRegretGuard_MCM: Math.round(storageRG * 100) / 100,
    endStorageDifference_MCM: Math.round(endDiff * 100) / 100,
    minStorageRuleCurve: Math.round(Math.min(...dayData.map(d => d.storageRuleCurve)) * 100) / 100,
    minStorageRegretGuard: Math.round(Math.min(...dayData.map(d => d.storageRegretGuard)) * 100) / 100,
    ecologicalViolationsRuleCurve: ecoViolRC,
    ecologicalViolationsRegretGuard: ecoViolRG,
    days: dayData,
    conclusion,
    dataLabel: "SYNTHETIC DEMO — Simulated historical-like season. Not real CWC/IMD data.",
    forecastMethod: "Seeded stochastic inflow with ENSO-adjusted distribution",
  };
}

// ─── Spill-to-Store ───────────────────────────────────────────────────────────

export interface CaptureSite {
  id: string;
  name: string;
  type: "check_dam" | "recharge_basin" | "community_pond" | "wetland" | "storage_tank" | "agricultural_pond";
  lat: number;
  lng: number;
  capacityMCM: number;
  availableCapacityMCM: number;
  distanceKm: number;
  travelTimeHours: number;
  suitabilityScore: number;
  floodExposureRisk: "low" | "moderate" | "high";
  dataConfidence: number;
  source: string;
  status: "operational" | "partial" | "maintenance";
  potentialCaptureMCM: number;
}

export const CAPTURE_SITES: CaptureSite[] = [
  {
    id: "s1", name: "Cauvery Recharge Basin Alpha", type: "recharge_basin",
    lat: 11.72, lng: 77.85, capacityMCM: 18.5, availableCapacityMCM: 12.4,
    distanceKm: 18, travelTimeHours: 6, suitabilityScore: 84,
    floodExposureRisk: "low", dataConfidence: 0.72, source: "ESTIMATED",
    status: "operational", potentialCaptureMCM: 0,
  },
  {
    id: "s2", name: "Bhavani Check Dam Complex", type: "check_dam",
    lat: 11.45, lng: 77.68, capacityMCM: 8.2, availableCapacityMCM: 6.1,
    distanceKm: 42, travelTimeHours: 14, suitabilityScore: 71,
    floodExposureRisk: "moderate", dataConfidence: 0.65, source: "ESTIMATED",
    status: "operational", potentialCaptureMCM: 0,
  },
  {
    id: "s3", name: "Salem Community Pond Network", type: "community_pond",
    lat: 11.65, lng: 78.1, capacityMCM: 4.8, availableCapacityMCM: 3.9,
    distanceKm: 28, travelTimeHours: 9, suitabilityScore: 65,
    floodExposureRisk: "low", dataConfidence: 0.6, source: "ESTIMATED",
    status: "operational", potentialCaptureMCM: 0,
  },
  {
    id: "s4", name: "Kollidam Wetland Reserve", type: "wetland",
    lat: 11.35, lng: 78.3, capacityMCM: 22, availableCapacityMCM: 15.6,
    distanceKm: 65, travelTimeHours: 22, suitabilityScore: 55,
    floodExposureRisk: "moderate", dataConfidence: 0.55, source: "ESTIMATED",
    status: "operational", potentialCaptureMCM: 0,
  },
  {
    id: "s5", name: "Attur Agricultural Storage", type: "agricultural_pond",
    lat: 11.58, lng: 78.6, capacityMCM: 6.5, availableCapacityMCM: 5.1,
    distanceKm: 72, travelTimeHours: 24, suitabilityScore: 58,
    floodExposureRisk: "low", dataConfidence: 0.5, source: "ESTIMATED",
    status: "partial", potentialCaptureMCM: 0,
  },
  {
    id: "s6", name: "Mettur Storage Tank Cluster", type: "storage_tank",
    lat: 11.78, lng: 77.9, capacityMCM: 3.2, availableCapacityMCM: 2.8,
    distanceKm: 8, travelTimeHours: 3, suitabilityScore: 78,
    floodExposureRisk: "low", dataConfidence: 0.8, source: "ESTIMATED",
    status: "operational", potentialCaptureMCM: 0,
  },
  {
    id: "s7", name: "Downstream Flood Plain Basin", type: "recharge_basin",
    lat: 11.6, lng: 77.95, capacityMCM: 35, availableCapacityMCM: 8.2,
    distanceKm: 32, travelTimeHours: 11, suitabilityScore: 44,
    floodExposureRisk: "high", dataConfidence: 0.4, source: "ESTIMATED",
    status: "operational", potentialCaptureMCM: 0,
  },
];

export function computeCapture(
  sites: CaptureSite[],
  availableReleaseMCM: number,
  weights = { capacity: 0.35, travelTime: 0.25, siteType: 0.15, floodSafety: 0.15, confidence: 0.10 }
): { sites: CaptureSite[]; totalCaptureMCM: number; suitableSiteCount: number } {
  let remaining = availableReleaseMCM;
  const sorted = [...sites].sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  const result: CaptureSite[] = [];

  for (const site of sorted) {
    if (remaining <= 0) {
      result.push({ ...site, potentialCaptureMCM: 0 });
      continue;
    }
    if (site.floodExposureRisk === "high") {
      result.push({ ...site, potentialCaptureMCM: 0 });
      continue;
    }
    const capture = Math.min(site.availableCapacityMCM, remaining * (site.suitabilityScore / 100));
    remaining -= capture;
    result.push({ ...site, potentialCaptureMCM: Math.round(capture * 100) / 100 });
  }

  const totalCaptureMCM = result.reduce((s, r) => s + r.potentialCaptureMCM, 0);
  const suitableSiteCount = result.filter(r => r.suitabilityScore >= 60 && r.potentialCaptureMCM > 0).length;

  return {
    sites: result,
    totalCaptureMCM: Math.round(totalCaptureMCM * 100) / 100,
    suitableSiteCount,
  };
}

// ─── Demand Calculations ──────────────────────────────────────────────────────

export interface DemandInputs {
  agriculturalAreaHa: number;
  cropDemandFactor: number; // mm/day
  irrigationEfficiency: number; // 0-1
  rainfallContributionMM: number;
  populationThousands: number;
  perCapitaLpd: number;
  industrialMCMday: number;
}

export const DEFAULT_DEMAND: DemandInputs = {
  agriculturalAreaHa: 85000,
  cropDemandFactor: 5.2,
  irrigationEfficiency: 0.62,
  rainfallContributionMM: 2.1,
  populationThousands: 4200,
  perCapitaLpd: 140,
  industrialMCMday: 2.8,
};

export function computeDailyDemand(inputs: DemandInputs): {
  agriculturalMCM: number;
  drinkingMCM: number;
  industrialMCM: number;
  totalMCM: number;
  totalCusecs: number;
} {
  const netCropDemand = Math.max(0, inputs.cropDemandFactor - inputs.rainfallContributionMM) / 1000; // m/day
  const agriculturalMCM = (inputs.agriculturalAreaHa * 10000 * netCropDemand / 1e6) / inputs.irrigationEfficiency;
  const drinkingMCM = (inputs.populationThousands * 1000 * inputs.perCapitaLpd) / 1e9;
  const total = agriculturalMCM + drinkingMCM + inputs.industrialMCMday;

  return {
    agriculturalMCM: Math.round(agriculturalMCM * 1000) / 1000,
    drinkingMCM: Math.round(drinkingMCM * 1000) / 1000,
    industrialMCM: Math.round(inputs.industrialMCMday * 1000) / 1000,
    totalMCM: Math.round(total * 1000) / 1000,
    totalCusecs: Math.round(total / UNIT_CONVERSION.m3s_per_day_to_MCM / UNIT_CONVERSION.cusec_to_m3s),
  };
}

// ─── Rainwater Harvesting ─────────────────────────────────────────────────────

export function computeHarvesting(
  areaM2: number,
  rainfallMM: number,
  runoffCoefficient: number
): { harvestableLitres: number; harvestableMCM: number } {
  const litres = areaM2 * (rainfallMM / 1000) * runoffCoefficient * 1000;
  return {
    harvestableLitres: Math.round(litres),
    harvestableMCM: Math.round(litres / 1e9 * 1000) / 1000,
  };
}

// ─── Resilience Score ─────────────────────────────────────────────────────────

export interface ResilienceComponents {
  storageReliability: number;
  inflowOutlook: number;
  floodBuffer: number;
  droughtExposure: number;
  demandPressure: number;
  captureCapacity: number;
  ecologicalReserve: number;
}

export function computeResilience(
  storageMCM: number,
  scenario: ScenarioType,
  dailyDemandMCM: number,
  totalCaptureMCM: number
): { score: number; components: ResilienceComponents; band: string; color: string } {
  const sc = SCENARIOS[scenario];
  const storageRatio = storageMCM / SAFE_CAPACITY_MCM;
  const daysOfStorage = storageMCM / Math.max(dailyDemandMCM, 1);

  const comps: ResilienceComponents = {
    storageReliability: Math.min(100, storageRatio * 100),
    inflowOutlook: Math.min(100, (1 + sc.inflowMultiplier - 1) * 50 + 50),
    floodBuffer: Math.min(100, Math.max(0, (1 - storageRatio) * 200)),
    droughtExposure: Math.min(100, daysOfStorage / 2),
    demandPressure: Math.min(100, Math.max(0, 100 - (dailyDemandMCM / storageMCM * 3000))),
    captureCapacity: Math.min(100, (totalCaptureMCM / 50) * 100),
    ecologicalReserve: storageMCM > DAM_CONFIG.ecologicalReserveMCM ? 100 : (storageMCM / DAM_CONFIG.ecologicalReserveMCM) * 100,
  };

  const weights = {
    storageReliability: 0.25, inflowOutlook: 0.15, floodBuffer: 0.15,
    droughtExposure: 0.15, demandPressure: 0.10, captureCapacity: 0.10, ecologicalReserve: 0.10,
  };

  const score = Math.round(Object.entries(comps).reduce((s, [k, v]) =>
    s + v * weights[k as keyof ResilienceComponents], 0));

  const band = score >= 75 ? "Secure" : score >= 55 ? "Moderate" : score >= 35 ? "Warning" : "Critical";
  const color = score >= 75 ? "#10b981" : score >= 55 ? "#f59e0b" : score >= 35 ? "#f97316" : "#ef4444";

  return { score, components: comps, band, color };
}

// ─── Water Transfer ───────────────────────────────────────────────────────────

export function computeTransfer(
  sourceStorageMCM: number,
  requestedMCM: number,
  transferEfficiency: number,
  distanceKm: number
): {
  feasible: boolean;
  feasibleMCM: number;
  lostMCM: number;
  remainingSourceMCM: number;
  targetIncreaseMCM: number;
  travelTimeHours: number;
} {
  const maxTransfer = Math.max(0, sourceStorageMCM - MIN_STORAGE_MCM * 1.1);
  const feasibleMCM = Math.min(requestedMCM, maxTransfer);
  const lostMCM = feasibleMCM * (1 - transferEfficiency);
  const targetIncrease = feasibleMCM * transferEfficiency;

  return {
    feasible: feasibleMCM >= requestedMCM * 0.7,
    feasibleMCM: Math.round(feasibleMCM * 100) / 100,
    lostMCM: Math.round(lostMCM * 100) / 100,
    remainingSourceMCM: Math.round((sourceStorageMCM - feasibleMCM) * 100) / 100,
    targetIncreaseMCM: Math.round(targetIncrease * 100) / 100,
    travelTimeHours: Math.round(distanceKm / 4.5),
  };
}

// ─── Community Security ───────────────────────────────────────────────────────

export function computeCommunitySecurityLevel(
  supplyMCM: number,
  demandMCM: number
): { level: "Secure" | "Watch" | "Risk" | "Critical"; score: number; gapMCM: number; daysCoverage: number; color: string } {
  const ratio = supplyMCM / Math.max(demandMCM, 0.001);
  const score = Math.round(Math.min(100, ratio * 70));
  const gapMCM = Math.max(0, demandMCM - supplyMCM);
  const daysCoverage = Math.round(supplyMCM / Math.max(demandMCM, 0.001));

  const level = ratio >= 1.5 ? "Secure" : ratio >= 1.0 ? "Watch" : ratio >= 0.7 ? "Risk" : "Critical";
  const color = ratio >= 1.5 ? "#10b981" : ratio >= 1.0 ? "#f59e0b" : ratio >= 0.7 ? "#f97316" : "#ef4444";

  return { level, score, gapMCM: Math.round(gapMCM * 100) / 100, daysCoverage, color };
}

// ─── Default Simulation State ─────────────────────────────────────────────────

export const DEFAULT_STATE = {
  storageMCM: storageToCurveMCM(71),
  scenario: "neutral" as ScenarioType,
  demand: DEFAULT_DEMAND,
  ecologicalMinMCM: 1.04,
  SAFE_CAPACITY_MCM,
  MIN_STORAGE_MCM,
  FULL_CAPACITY_MCM,
};
