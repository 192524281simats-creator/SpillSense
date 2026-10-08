import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, CloudRain, Brain, MapPin, Sliders
} from "lucide-react";
import { cn } from "@/lib/utils";

const MOBILE_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { to: "/forecast", icon: CloudRain, label: "Forecast" },
  { to: "/regretguard", icon: Brain, label: "RegretGuard" },
  { to: "/spill-to-store", icon: MapPin, label: "Spill Map" },
  { to: "/what-if", icon: Sliders, label: "What-If" },
];

export function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {MOBILE_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
