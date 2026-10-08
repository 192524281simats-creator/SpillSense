import { Sun, Moon, Globe, Bell, BellDot, Eye, Settings } from "lucide-react";
import { useApp } from "@/lib/store";
import { ScenarioChip } from "@/components/features/ScenarioChip";
import { SyntheticBadge } from "@/components/features/DataBadge";
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
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-3 px-4 h-14">
        {/* Scenario */}
        <ScenarioChip />

        {/* Synthetic badge */}
        <SyntheticBadge short className="hidden sm:inline-flex" />

        <div className="flex-1" />

        {/* View mode */}
        <div className="hidden md:flex items-center bg-muted rounded-lg p-1 border border-border">
          {(["simple", "engineer"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-all",
                viewMode === mode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === "simple" ? "Simple" : "Engineer"}
            </button>
          ))}
        </div>

        {/* Units */}
        <button
          onClick={() => setUnitSystem(unitSystem === "metric" ? "imperial" : "metric")}
          className="hidden md:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
          title="Toggle units"
        >
          <Settings className="w-3.5 h-3.5" />
          {unitSystem === "metric" ? "MCM/m" : "TMC/ft"}
        </button>

        {/* Language */}
        <div className="relative">
          <button
            onClick={() => setShowLang(s => !s)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
          >
            <Globe className="w-3.5 h-3.5" />
            {LANGUAGES.find(l => l.code === language)?.label}
          </button>
          {showLang && (
            <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 min-w-[100px]">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => { setLanguage(l.code); setShowLang(false); }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                    language === l.code && "text-primary font-medium"
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
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotif(s => !s); if (!showNotif) markAllRead(); }}
            className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label={`Notifications (${unreadCount} unread)`}
          >
            {unreadCount > 0 ? <BellDot className="w-4 h-4 text-primary" /> : <Bell className="w-4 h-4" />}
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-xl z-50 w-80 py-2">
              <div className="px-3 pb-2 border-b border-border flex justify-between items-center">
                <span className="text-sm font-semibold">Notifications</span>
                <span className="text-xs text-muted-foreground">All read</span>
              </div>
              <div className="max-h-64 overflow-y-auto scrollbar-thin">
                {notifications.map(n => (
                  <div key={n.id} className="px-3 py-2.5 hover:bg-accent transition-colors">
                    <div className="flex items-start gap-2">
                      <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                        n.type === "critical" ? "bg-red-500" :
                        n.type === "warning" ? "bg-amber-500" :
                        n.type === "success" ? "bg-emerald-500" : "bg-blue-500"
                      )} />
                      <div>
                        <div className="text-xs font-semibold">{n.title}</div>
                        <div className="text-xs text-muted-foreground leading-relaxed">{n.message}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decision notice */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-1 text-[10px] text-amber-700 dark:text-amber-400 text-center">
        Decision support only, not automatic dam control. The operator makes the final decision.
      </div>
    </header>
  );
}
