import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, ChevronRight } from "lucide-react";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  SCENARIOS, generateInflowForecast, runRegretGuard, computeResilience,
  computeDailyDemand, SAFE_CAPACITY_MCM, MIN_STORAGE_MCM
} from "@/lib/engine";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

const QUICK_CHIPS = [
  "Why is spill risk high?",
  "Why did RegretGuard select this policy?",
  "What happens if I hold water?",
  "What is P10/P50/P90?",
  "Explain this simply",
  "Which capture sites are suitable?",
  "Why was a policy rejected?",
];

function generateResponse(query: string, state: {
  storageMCM: number; scenario: string; dailyDemandMCM: number; lang: string;
}): string {
  const q = query.toLowerCase();
  const { storageMCM, scenario, dailyDemandMCM } = state;
  const sc = SCENARIOS[scenario as keyof typeof SCENARIOS];
  const storagePct = ((storageMCM / SAFE_CAPACITY_MCM) * 100).toFixed(0);

  if (q.includes("spill") && (q.includes("risk") || q.includes("high") || q.includes("why"))) {
    const spillRisk = storagePct > "85" ? "elevated" : "moderate";
    return `Spill risk is ${spillRisk} because:
• Storage is currently at ${storagePct}% of flood-control capacity.
• Under ${sc.label} conditions, rainfall anomaly is ${sc.rainfallAnomaly > 0 ? "+" : ""}${(sc.rainfallAnomaly * 100).toFixed(0)}%.
• P90 inflow (worst-case scenario) could push storage above safe limits within the 7-day horizon.
• Inflow multiplier vs baseline: ${sc.inflowMultiplier.toFixed(2)}×.
• Heavy rain probability: ${(sc.heavyRainProb * 100).toFixed(0)}%.

Recommended action: Consider increasing release rate before high-inflow days.`;
  }

  if (q.includes("regretguard") || q.includes("policy") && q.includes("select")) {
    return `RegretGuard selects the release policy with the lowest worst-case regret.

The process:
1. All 5 policies are simulated against the same probabilistic forecast trajectories.
2. A loss function penalises spill (1.0×), shortage (1.5×), and emergency releases (0.5×).
3. Safety constraints (ecological flow, min storage, max release) are checked first. Violating policies are rejected.
4. Among safe policies, the one with the lowest maximum regret across Dry/Normal/Wet futures is selected.

This means RegretGuard is conservative: it avoids strategies that would be catastrophic in the worst scenario, even if they look better on average.`;
  }

  if (q.includes("hold") || q.includes("hold water")) {
    const holdRisk = storagePct > "80" ? "high spill probability" : "low drought risk";
    return `If you hold water (release only minimum ecological flow):
• Good for: preventing drought if inflow is lower than expected.
• Risk: if high inflows arrive (P90 scenario), storage may exceed flood-control level, causing unavoidable spill.
• Current storage at ${storagePct}% → holding carries ${holdRisk}.
• Ecological minimum flow (≈12 m³/s) must still be released.

This is why RegretGuard often recommends releasing slightly more than demand in high-storage situations.`;
  }

  if (q.includes("p10") || q.includes("p50") || q.includes("p90")) {
    return `P10/P50/P90 are percentile forecasts from the probabilistic inflow model:

📊 P10 (10th percentile): Only 10% of simulated futures have inflow this low or lower. This is the low-flow scenario — useful for planning drought risk.

📊 P50 (50th percentile / Median): Half of futures above, half below. The "central estimate."

📊 P90 (90th percentile): Only 10% of futures have inflow this high or higher. This is the high-flow scenario — useful for planning flood/spill risk.

RegretGuard simulates release decisions across ALL these futures, not just the median, so it prepares for the unexpected.`;
  }

  if (q.includes("simply") || q.includes("explain simply")) {
    return `In simple terms:

💧 Mettur Dam holds water for the Cauvery delta. The dam operator must decide how much water to release each day.

🌧️ Rainfall is uncertain. Too little → drought. Too much and we release too late → water spills away.

🤖 SpillSense shows a range of possible futures (P10/P50/P90), evaluates 5 different release strategies, and recommends the safest one using RegretGuard — a method that minimises "regret" in the worst case.

🗺️ If spill is unavoidable, Spill-to-Store identifies nearby ponds and basins where released water might be captured for later use.

Current situation: Storage at ${storagePct}%, scenario: ${sc.label}.`;
  }

  if (q.includes("capture") || q.includes("site")) {
    return `Spill-to-Store identifies downstream sites with available storage capacity that could potentially capture unavoidable release water.

Suitability score considers:
• Available capacity (35%)
• River travel time (25%)
• Site type (15%)
• Flood exposure safety (15%)
• Data confidence (10%)

Sites scoring ≥70 are "Good" (green markers). 40–69 are "Moderate" (yellow). Below 40 are "Poor."

⚠️ Important: Potential Capture figures are model estimates. Operational verification is required before any real-world release routing. Site capacities are ESTIMATED from available data.`;
  }

  if (q.includes("rejected") || q.includes("why") && q.includes("policy")) {
    return `A policy is rejected if it violates any of these hard safety constraints:

❌ Ecological flow: Release must be ≥12 m³/s (≈1.04 MCM/day) at all times to protect downstream ecosystems.
❌ Minimum storage: Storage must not fall below ~18 TMC (minimum operating level, ~80 ft).
❌ Maximum release: Single-day release must not exceed the configured limit.
❌ Impossible storage: Mass balance must be preserved — no physically impossible values.

Rejected policies are shown with a red "REJECTED" badge and the reason displayed. Safety overrides optimisation.`;
  }

  if (q.includes("drought") || q.includes("shortage")) {
    return `Drought risk is the estimated probability that end-of-period storage drops below the minimum safe operating level (~18 TMC).

Under ${sc.label} conditions (inflow multiplier: ${sc.inflowMultiplier.toFixed(2)}×):
• Dry spell probability: ${(sc.drySpellProb * 100).toFixed(0)}%
• Rainfall anomaly: ${sc.rainfallAnomaly > 0 ? "+" : ""}${(sc.rainfallAnomaly * 100).toFixed(0)}%

If drought risk exceeds ~40%, RegretGuard will penalise policies that release too aggressively.`;
  }

  return `I can help explain SpillSense calculations and results using current simulation state.

Current state:
• Storage: ${storageMCM.toFixed(0)} MCM (${storagePct}% of flood-control capacity)
• Scenario: ${sc.label} (${sc.rainfallAnomaly > 0 ? "+" : ""}${(sc.rainfallAnomaly * 100).toFixed(0)}% rainfall anomaly)
• Daily demand: ${dailyDemandMCM.toFixed(1)} MCM

Try asking:
• "Why is spill risk high?"
• "Why did RegretGuard select this policy?"
• "What is P10/P50/P90?"
• "Which capture sites are suitable?"

⚠️ Note: I only explain results from the current simulation. I cannot access external data or claim real reservoir measurements.`;
}

export function AIAssistant() {
  const { scenario, storageMCM, dailyDemandMCM, language } = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      text: `Hello! I'm the SpillSense AI assistant.\n\nI can explain reservoir calculations, RegretGuard decisions, forecast uncertainty, and Spill-to-Store results using the current simulation state.\n\nWhat would you like to understand?`,
      timestamp: new Date(),
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: `u_${Date.now()}`, role: "user", text, timestamp: new Date() };
    const response = generateResponse(text, { storageMCM, scenario, dailyDemandMCM, lang: language });
    const assistantMsg: Message = { id: `a_${Date.now()}`, role: "assistant", text: response, timestamp: new Date() };
    setMessages(m => [...m, userMsg, assistantMsg]);
    setInput("");
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300",
          "gradient-aqua text-white hover:shadow-aqua hover:scale-105 focus-visible:ring-2 focus-visible:ring-aqua"
        )}
        aria-label="Open SpillSense AI Assistant"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-card border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="gradient-aqua px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">SpillSense AI</div>
              <div className="text-white/70 text-xs">Explains simulation results only</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80 scrollbar-thin">
            {messages.map(m => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "rounded-xl px-3 py-2 text-sm max-w-[85%] whitespace-pre-line leading-relaxed",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick chips */}
          <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
            {QUICK_CHIPS.slice(0, 3).map(chip => (
              <button
                key={chip}
                onClick={() => send(chip)}
                className="flex items-center gap-1 text-xs bg-muted hover:bg-accent hover:text-accent-foreground rounded-full px-2.5 py-1 transition-colors border border-border"
              >
                <ChevronRight className="w-3 h-3" />
                {chip}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send(input)}
              placeholder="Ask about the simulation..."
              className="flex-1 text-sm bg-muted rounded-lg px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Ask SpillSense AI"
            />
            <button
              onClick={() => send(input)}
              className="w-9 h-9 rounded-lg gradient-aqua text-white flex items-center justify-center hover:opacity-90 transition-opacity"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="px-3 pb-2 text-[10px] text-muted-foreground text-center">
            Explains current simulation only. Never claims real data or physical transfers.
          </div>
        </div>
      )}
    </>
  );
}
