import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, CloudRain, Brain, Swords, Sliders, FlaskConical,
  MapPin, Users, Wind, Leaf, Database, Waves, Droplets
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";

const NAV_GROUPS = [
  {
    label: "Core",
    items: [
      { to: "/dashboard",    icon: LayoutDashboard, labelKey: "nav.overview",    label: "Overview" },
      { to: "/forecast",     icon: CloudRain,        labelKey: "nav.forecast",    label: "Forecast" },
    ],
  },
  {
    label: "Decision",
    items: [
      { to: "/regretguard",  icon: Brain,            labelKey: "nav.regretguard", label: "RegretGuard" },
      { to: "/policy-battle",icon: Swords,           labelKey: "nav.policybattle",label: "Policy Battle" },
      { to: "/what-if",      icon: Sliders,          labelKey: "nav.whatif",      label: "What-If" },
      { to: "/backtest",     icon: FlaskConical,     labelKey: "nav.backtest",    label: "Backtest Lab" },
    ],
  },
  {
    label: "Water",
    items: [
      { to: "/spill-to-store", icon: MapPin,         labelKey: "nav.spilltostore",label: "Spill-to-Store" },
      { to: "/allocation",     icon: Droplets,       labelKey: "nav.allocation",  label: "Allocation" },
      { to: "/downstream",     icon: Users,          labelKey: "nav.downstream",  label: "Downstream" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/climate",      icon: Wind,             labelKey: "nav.climate",     label: "Climate" },
      { to: "/ecosystem",    icon: Leaf,             labelKey: "nav.ecosystem",   label: "Ecosystem" },
      { to: "/data-sources", icon: Database,         labelKey: "nav.datasources", label: "Data & Sources" },
    ],
  },
];

export function Sidebar() {
  const { language } = useApp();

  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 overflow-hidden"
           style={{ background: "hsl(var(--sidebar-background))" }}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b"
           style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <div className="w-8 h-8 rounded-xl gradient-aqua flex items-center justify-center shrink-0 shadow-sm">
          <Waves className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="font-bold text-sm leading-tight"
               style={{ color: "hsl(var(--sidebar-foreground))" }}>SpillSense</div>
          <div className="text-[10px] opacity-50 leading-tight mt-0.5"
               style={{ color: "hsl(var(--sidebar-foreground))" }}>Dam Decision AI</div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin space-y-0.5">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="px-3 pb-1">
            <div className="text-[9px] font-bold uppercase tracking-[0.12em] px-2 py-2 opacity-35"
                 style={{ color: "hsl(var(--sidebar-foreground))" }}>
              {group.label}
            </div>
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 mb-0.5",
                  isActive
                    ? "text-white shadow-sm"
                    : "opacity-70 hover:opacity-100"
                )}
                style={({ isActive }) => ({
                  background: isActive ? "hsl(var(--sidebar-primary) / 0.2)" : "transparent",
                  color: isActive ? "hsl(var(--sidebar-primary))" : "hsl(var(--sidebar-foreground))",
                })}
              >
                <item.icon className="w-[15px] h-[15px] shrink-0" />
                <span className="truncate">{t(language, item.labelKey) || item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t text-[10px] opacity-30 leading-relaxed"
           style={{ borderColor: "hsl(var(--sidebar-border))", color: "hsl(var(--sidebar-foreground))" }}>
        Decision support only.<br />Operator makes final decision.
      </div>
    </aside>
  );
}
