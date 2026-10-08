import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, CloudRain, Brain, MapPin, Sliders, Droplets
} from "lucide-react";
import { cn } from "@/lib/utils";

const MOBILE_ITEMS = [
  { to: "/dashboard",      icon: LayoutDashboard, label: "Overview" },
  { to: "/forecast",       icon: CloudRain,        label: "Forecast" },
  { to: "/regretguard",    icon: Brain,            label: "RegretGuard" },
  { to: "/allocation",     icon: Droplets,         label: "Allocation" },
  { to: "/spill-to-store", icon: MapPin,           label: "Spill Map" },
];

export function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border safe-area-inset-bottom"
         style={{ background: "hsl(var(--background) / 0.95)", backdropFilter: "blur(12px)" }}>
      <div className="flex items-center justify-around h-16 px-1">
        {MOBILE_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl transition-all min-w-[48px]",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                <span className={cn("text-[10px] font-semibold", isActive && "text-primary")}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
