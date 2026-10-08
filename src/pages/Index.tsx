import { Link } from "react-router-dom";
import { ArrowRight, Waves, Brain, MapPin, TrendingDown, ChevronDown } from "lucide-react";

const FLOW_STEPS = [
  "CLIMATE", "UNCERTAINTY", "P10 / P50 / P90",
  "MULTIPLE FUTURES", "REGRETGUARD", "SAFE RELEASE", "SPILL-TO-STORE", "WATER SECURITY"
];

const INNOVATIONS = [
  {
    num: "01",
    title: "Probabilistic Hydrology",
    description: "Don't trust a single forecast. Simulate a range of possible inflows: P10 (low), P50 (median), and P90 (high). RegretGuard prepares for all of them.",
    icon: TrendingDown,
    color: "#22d3ee",
  },
  {
    num: "02",
    title: "RegretGuard",
    description: "Choose the safe policy with the lowest worst-case regret. Not the average outcome — the minimax optimal strategy across uncertain futures.",
    icon: Brain,
    color: "#8b5cf6",
  },
  {
    num: "03",
    title: "Spill-to-Store",
    description: "When some release is unavoidable, identify downstream infrastructure with potential capture capacity — check dams, ponds, recharge basins, wetlands.",
    icon: MapPin,
    color: "#10b981",
  },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative min-h-screen flex flex-col overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/hero-reservoir.jpg')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-navy/60 to-navy/90" />
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-aqua flex items-center justify-center">
              <Waves className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white">SpillSense</span>
          </div>
          <Link
            to="/dashboard"
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg gradient-aqua text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Launch App <ArrowRight className="w-4 h-4" />
          </Link>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-aqua-light animate-pulse" />
            <span className="text-white/80 text-sm font-medium">Reservoir Decision Support · Mettur Dam, Cauvery</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 leading-none tracking-tight">
            Spill
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #22d3ee, #10b981)" }}>Sense</span>
          </h1>

          <p className="text-xl md:text-2xl text-white/80 font-medium mb-3 max-w-2xl">
            Predict Less. Decide Better. Lose Less Water.
          </p>

          <p className="text-white/60 text-sm md:text-base mb-10 max-w-2xl leading-relaxed">
            A forecast-informed reservoir decision-support system that simulates uncertain futures, compares release strategies with RegretGuard optimization, and identifies safer ways to retain and recover water.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl gradient-aqua text-white font-bold text-base hover:opacity-90 hover:scale-105 transition-all shadow-aqua"
            >
              Launch SpillSense <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/regretguard"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white font-semibold text-base hover:bg-white/20 transition-all backdrop-blur"
            >
              Explore RegretGuard
            </Link>
          </div>

          <a href="#flow" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 hover:text-white/80 transition-colors animate-bounce">
            <ChevronDown className="w-6 h-6" />
          </a>
        </div>
      </section>

      {/* Flow Diagram */}
      <section id="flow" className="bg-navy py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-white/50 text-sm font-medium uppercase tracking-widest mb-3">Intelligence Cycle</p>
          <h2 className="text-3xl font-bold text-white mb-12">From Uncertainty to Decision</h2>

          <div className="flex flex-wrap justify-center items-center gap-3">
            {FLOW_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-xl border font-semibold text-sm ${
                  i === 4 ? "gradient-aqua text-white border-transparent" :
                  "bg-white/5 border-white/10 text-white/80"
                }`}>
                  {step}
                </div>
                {i < FLOW_STEPS.length - 1 && <span className="text-white/30 font-light">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why SpillSense */}
      <section className="bg-background py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest mb-3">Why SpillSense?</p>
            <h2 className="text-4xl font-bold mb-6">A Different Kind of Water Decision</h2>
          </div>

          {/* Traditional vs SpillSense */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="glass-card rounded-2xl p-8 border-l-4 border-l-muted-foreground/30">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Traditional Approach</h3>
              <div className="flex items-center gap-3 flex-wrap">
                {["MONITOR", "REPORT", "REACT"].map((s, i, arr) => (
                  <div key={s} className="flex items-center gap-3">
                    <span className="bg-muted text-muted-foreground text-sm font-semibold px-3 py-1.5 rounded-lg">{s}</span>
                    {i < arr.length - 1 && <span className="text-muted-foreground">→</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card rounded-2xl p-8 border-l-4 border-l-primary">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">SpillSense</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {["SENSE", "PREDICT", "SIMULATE", "COMPARE", "OPTIMIZE", "ACT", "MEASURE"].map((s, i, arr) => (
                  <div key={s} className="flex items-center gap-2">
                    <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg ${
                      s === "OPTIMIZE" ? "gradient-aqua text-white" : "bg-primary/10 text-primary"
                    }`}>{s}</span>
                    {i < arr.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 text-center text-muted-foreground italic max-w-3xl mx-auto">
            "SpillSense does not simply tell operators what is happening. It tests decisions before the future happens — across a range of possible futures, not just the most likely one."
          </div>
        </div>
      </section>

      {/* Three Innovations */}
      <section className="bg-muted/30 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest mb-3">Core Innovations</p>
            <h2 className="text-4xl font-bold">Three Ideas That Matter</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {INNOVATIONS.map(inv => (
              <div key={inv.num} className="glass-card rounded-2xl p-8 hover:shadow-card-hover transition-all">
                <div className="flex items-start gap-4 mb-4">
                  <span className="text-4xl font-black" style={{ color: inv.color }}>{inv.num}</span>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${inv.color}20` }}>
                    <inv.icon className="w-5 h-5" style={{ color: inv.color }} />
                  </div>
                </div>
                <h3 className="font-bold text-xl mb-3">{inv.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{inv.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="gradient-navy py-24 px-6 text-center">
        <h2 className="text-4xl font-bold text-white mb-4">Ready to decide better?</h2>
        <p className="text-white/60 mb-8 max-w-xl mx-auto">
          Explore the full decision pipeline: probabilistic forecast, RegretGuard optimization, policy battle, backtest, and Spill-to-Store mapping.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl gradient-aqua text-white font-bold text-lg hover:opacity-90 hover:scale-105 transition-all shadow-aqua"
        >
          Open Decision Dashboard <ArrowRight className="w-5 h-5" />
        </Link>

        <p className="mt-8 text-white/30 text-xs max-w-2xl mx-auto">
          All data is Synthetic Demo Data. No live CWC, IMD or WRIS connections are active in this demonstration. Inter-state Cauvery water-sharing orders are not modelled.
        </p>
      </section>
    </div>
  );
}
