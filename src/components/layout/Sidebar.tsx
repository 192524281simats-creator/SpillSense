import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, CloudRain, Brain, Swords, Sliders, FlaskConical,
  MapPin, Users, Wind, Leaf, Database, ChevronLeft, ChevronRight, Waves
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";
import { useState } from "react";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, labelKey: "nav.overview" },
  { to: "/forecast", icon: CloudRain, labelKey: "nav.forecast" },
  { to: "/regretguard", icon: Brain, labelKey: "nav.regretguard" },
  { to: "/policy-battle", icon: Swords, labelKey: "nav.policybattle" },
  { to: "/what-if", icon: Sliders, labelKey: "nav.whatif" },
  { to: "/backtest", icon: FlaskConical, labelKey: "nav.backtest" },
  { to: "/spill-to-store", icon: MapPin, labelKey: "nav.spilltostore" },
  { to: "/downstream", icon: Users, labelKey: "nav.downstream" },
  { to: "/climate", icon: Wind, labelKey: "nav.climate" },
  { to: "/ecosystem", icon: Leaf, labelKey: "nav.ecosystem" },
  { to: "/data-sources", icon: Database, labelKey: "nav.datasources" },
];

export function Sidebar() {
  const { language } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0",
      collapsed ? "w-16" : "w-56"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg gradient-aqua flex items-center justify-center shrink-0">
          <Waves className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="font-bold text-sm text-sidebar-foreground">SpillSense</div>
            <div className="text-[10px] text-muted-foreground">Dam Decision AI</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-150",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg mx-2",
              isActive
                ? "bg-sidebar-accent text-sidebar-primary border-l-2 border-sidebar-primary rounded-l-none"
                : "text-sidebar-foreground"
            )}
            title={collapsed ? t(language, item.labelKey) : undefined}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">{t(language, item.labelKey)}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-center m-3 p-2 rounded-lg bg-sidebar-accent hover:bg-border text-muted-foreground hover:text-foreground transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
