/**
 * Global application state using React context + localStorage persistence.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ScenarioType } from "./engine";
import type { Language } from "./i18n";
import { DEFAULT_STATE, DEFAULT_DEMAND, computeDailyDemand } from "./engine";
import type { DemandInputs } from "./engine";

export type UnitSystem = "metric" | "imperial";
export type ViewMode = "simple" | "engineer";

interface AppState {
  scenario: ScenarioType;
  storageMCM: number;
  demand: DemandInputs;
  dailyDemandMCM: number;
  ecologicalMinMCM: number;
  theme: "light" | "dark";
  language: Language;
  unitSystem: UnitSystem;
  viewMode: ViewMode;
  notifications: Notification[];
  unreadCount: number;
}

interface Notification {
  id: string;
  type: "warning" | "info" | "critical" | "success";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface AppActions {
  setScenario: (s: ScenarioType) => void;
  setStorageMCM: (v: number) => void;
  setDemand: (d: DemandInputs) => void;
  setTheme: (t: "light" | "dark") => void;
  setLanguage: (l: Language) => void;
  setUnitSystem: (u: UnitSystem) => void;
  setViewMode: (v: ViewMode) => void;
  markAllRead: () => void;
  addNotification: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
}

const AppContext = createContext<(AppState & AppActions) | null>(null);

const NOTIFICATIONS_DEFAULT: Omit<Notification, "id" | "timestamp" | "read">[] = [
  { type: "warning", title: "Elevated Spill Risk", message: "Under La Niña scenario, P90 inflow exceeds safe capacity within 4 days. Consider pre-release." },
  { type: "info", title: "Synthetic Demo Active", message: "All data is synthetic demonstration data. No live CWC/IMD connections are active." },
  { type: "warning", title: "Ecological Flow Check", message: "Hold policy risks ecological flow violation in 2 of 5 simulated futures." },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [scenario, setScenarioState] = useState<ScenarioType>(() =>
    (localStorage.getItem("ss_scenario") as ScenarioType) ?? "neutral"
  );
  const [storageMCM, setStorageMCMState] = useState(() =>
    Number(localStorage.getItem("ss_storage")) || DEFAULT_STATE.storageMCM
  );
  const [demand, setDemandState] = useState<DemandInputs>(DEFAULT_DEMAND);
  const [theme, setThemeState] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("ss_theme") as "light" | "dark" | null;
    if (stored) return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [language, setLanguageState] = useState<Language>(() =>
    (localStorage.getItem("ss_lang") as Language) ?? "en"
  );
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(() =>
    (localStorage.getItem("ss_units") as UnitSystem) ?? "metric"
  );
  const [viewMode, setViewModeState] = useState<ViewMode>(() =>
    (localStorage.getItem("ss_viewmode") as ViewMode) ?? "simple"
  );
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    NOTIFICATIONS_DEFAULT.map((n, i) => ({
      ...n, id: `init_${i}`,
      timestamp: new Date(Date.now() - i * 600000),
      read: false,
    }))
  );

  const dailyDemandMCM = computeDailyDemand(demand).totalMCM;
  const unreadCount = notifications.filter(n => !n.read).length;

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const setScenario = useCallback((s: ScenarioType) => {
    setScenarioState(s);
    localStorage.setItem("ss_scenario", s);
  }, []);
  const setStorageMCM = useCallback((v: number) => {
    setStorageMCMState(v);
    localStorage.setItem("ss_storage", String(v));
  }, []);
  const setDemand = useCallback((d: DemandInputs) => setDemandState(d), []);
  const setTheme = useCallback((t: "light" | "dark") => {
    setThemeState(t);
    localStorage.setItem("ss_theme", t);
  }, []);
  const setLanguage = useCallback((l: Language) => {
    setLanguageState(l);
    localStorage.setItem("ss_lang", l);
  }, []);
  const setUnitSystem = useCallback((u: UnitSystem) => {
    setUnitSystemState(u);
    localStorage.setItem("ss_units", u);
  }, []);
  const setViewMode = useCallback((v: ViewMode) => {
    setViewModeState(v);
    localStorage.setItem("ss_viewmode", v);
  }, []);
  const markAllRead = useCallback(() =>
    setNotifications(ns => ns.map(n => ({ ...n, read: true }))), []);
  const addNotification = useCallback((n: Omit<Notification, "id" | "timestamp" | "read">) => {
    setNotifications(ns => [...ns, { ...n, id: `n_${Date.now()}`, timestamp: new Date(), read: false }]);
  }, []);

  return React.createElement(AppContext.Provider, {
    value: {
      scenario, storageMCM, demand, dailyDemandMCM, ecologicalMinMCM: DEFAULT_STATE.ecologicalMinMCM,
      theme, language, unitSystem, viewMode, notifications, unreadCount,
      setScenario, setStorageMCM, setDemand, setTheme, setLanguage,
      setUnitSystem, setViewMode, markAllRead, addNotification,
    }
  }, children);
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
