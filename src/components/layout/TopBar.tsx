import { Sun, Moon, Globe, Bell, BellDot, Settings2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { ScenarioChip } from "@/components/features/ScenarioChip";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { t } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ta", label: "தமிழ்" },
  { code: "hi", label: "हिंदी" },
];

export function TopBar() {
  const { theme, setTheme, language, setLanguage, viewMode, setViewMode,
    unitSystem, setUnitSystem, notifications, unreadCount, markAllRead } = useApp();
  const [showNotif, setShowNotif] = useState(false);
  const [showLang, setShowLang] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
      {/* Main bar */}
      <div className="flex items-center gap-3 px-5 h-13" style={{ height: 52 }}>

        {/* Scenario chip */}
        <ScenarioChip />

        <div className="flex-1" />

        {/* View toggle */}
        <div className="hidden md:flex items-center bg-muted rounded-lg p-0.5 border border-border">
          {(["simple", "engineer"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-all duration-150",
                viewMode === mode
                  ? "bg-white dark:bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === "simple" ? "Simple" : "Engineer"}
            </button>
          ))}
        </div>

        {/* Unit toggle */}
        <button
          onClick={() => setUnitSystem(unitSystem === "metric" ? "imperial" : "metric")}
          className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground
                     px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
          title="Toggle units"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span className="font-medium">{unitSystem === "metric" ? "MCM" : "TMC"}</span>
        </button>

        {/* Language */}
        <div className="relative">
          <button
            onClick={() => { setShowLang(s => !s); setShowNotif(false); }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground
                       px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="font-medium">{LANGUAGES.find(l => l.code === language)?.label}</span>
          </button>
          {showLang && (
            <div className="absolute right-0 top-full mt-1.5 bg-popover border border-border rounded-xl shadow-xl z-50 py-1.5 min-w-[110px] animate-scale-in">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => { setLanguage(l.code); setShowLang(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors rounded-lg mx-1",
                    language === l.code && "text-primary font-semibold"
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors
                     text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotif(s => !s); setShowLang(false); if (!showNotif) markAllRead(); }}
            className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors
                       text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
            aria-label={`Notifications (${unreadCount} unread)`}
          >
            {unreadCount > 0
              ? <BellDot className="w-4 h-4 text-primary" />
              : <Bell className="w-4 h-4" />}
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount}
              </span>
            )}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-full mt-1.5 bg-popover border border-border rounded-xl shadow-xl z-50 w-80 py-2 animate-scale-in">
              <div className="px-4 pb-2 border-b border-border flex justify-between items-center">
                <span className="text-sm font-semibold">Notifications</span>
                <span className="text-xs text-muted-foreground">All marked read</span>
              </div>
              <div className="max-h-72 overflow-y-auto scrollbar-thin">
                {notifications.map(n => (
                  <div key={n.id} className="px-4 py-3 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <div className={cn("w-1.5 h-1.5 rounded-full mt-[5px] shrink-0",
                        n.type === "critical" ? "bg-red-500" :
                        n.type === "warning"  ? "bg-amber-500" :
                        n.type === "success"  ? "bg-emerald-500" : "bg-blue-500"
                      )} />
                      <div>
                        <div className="text-xs font-semibold text-foreground">{n.title}</div>
                        <div className="text-xs text-muted-foreground leading-relaxed mt-0.5">{n.message}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decision notice ribbon */}
      <div className="px-5 py-1 bg-amber-50 dark:bg-amber-900/15 border-t border-amber-200/60 dark:border-amber-800/40
                      text-[10px] text-amber-700 dark:text-amber-400 text-center font-medium">
        Decision support only — not automatic dam control. The operator makes the final decision.
      </div>
    </header>
  );
}
