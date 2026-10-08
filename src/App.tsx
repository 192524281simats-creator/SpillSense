import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/lib/store";
import { Layout } from "@/components/layout/Layout";

import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Forecast from "./pages/Forecast";
import RegretGuardPage from "./pages/RegretGuard";
import PolicyBattle from "./pages/PolicyBattle";
import WhatIf from "./pages/WhatIf";
import BacktestLab from "./pages/BacktestLab";
import SpillToStore from "./pages/SpillToStore";
import AllocationPage from "./pages/Allocation";
import DownstreamSecurity from "./pages/DownstreamSecurity";
import ClimateIntelligence from "./pages/ClimateIntelligence";
import EcosystemProtection from "./pages/EcosystemProtection";
import DataSources from "./pages/DataSources";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Landing — no layout */}
            <Route path="/" element={<Index />} />

            {/* App — with sidebar layout */}
            <Route element={<Layout />}>
              <Route path="/dashboard"    element={<Dashboard />} />
              <Route path="/forecast"     element={<Forecast />} />
              <Route path="/regretguard"  element={<RegretGuardPage />} />
              <Route path="/policy-battle" element={<PolicyBattle />} />
              <Route path="/what-if"      element={<WhatIf />} />
              <Route path="/backtest"     element={<BacktestLab />} />
              <Route path="/spill-to-store" element={<SpillToStore />} />
              <Route path="/allocation"   element={<AllocationPage />} />
              <Route path="/downstream"   element={<DownstreamSecurity />} />
              <Route path="/climate"      element={<ClimateIntelligence />} />
              <Route path="/ecosystem"    element={<EcosystemProtection />} />
              <Route path="/data-sources" element={<DataSources />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
