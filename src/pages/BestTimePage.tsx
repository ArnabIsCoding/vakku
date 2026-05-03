import React, { useState, useEffect, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { STATES } from "../constants/india";
import { useFunction } from "../hooks/useFunction";
import "./BestTimePage.css";

interface HourData {
  hour: string; label: string;
  crowdIndex: number; waitMinutes: number; level: "low" | "medium" | "high";
}
interface BestTimeResult {
  state: string; constituency: string;
  recommendedSlot: string; hourlyData: HourData[];
  tip: string; basedOn: string;
}

const LEVEL_COLOR: Record<string, string> = {
  low: "#046A38", medium: "#FF671F", high: "rgba(255,107,53,0.85)",
};

const BestTimePage: React.FC = () => {
  const resultsRef = useRef<HTMLDivElement>(null);

  const [selectedState, setSelectedState] = useState("");
  const [constituency,  setConstituency]  = useState("");
  const [result,        setResult]        = useState<BestTimeResult | null>(null);
  const [visibleRows,   setVisibleRows]   = useState<Set<number>>(new Set());

  const { call, loading, error, clearError } = useFunction<BestTimeResult>("get_best_voting_time");

  useEffect(() => {
    STATES.forEach((_, i) =>
      setTimeout(() => setVisibleRows((p) => new Set([...p, i])), 100 + i * 55),
    );
  }, []);

  const handleFetch = async () => {
    if (!selectedState) return;
    clearError(); setResult(null);
    const data = await call({ state: selectedState, constituency });
    if (data) {
      setResult(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  };

  const recommended = result?.hourlyData.find((h) => h.hour === result.recommendedSlot);
  const AXIS_TICK = { fill: "rgba(245,245,242,0.25)", fontSize: 9, fontFamily: "IBM Plex Mono" };

  return (
    <main className="bt-page">

      <section className="bt-hero-section">
        <div className="bt-hero-section__inner section-container">
          <span className="bt-hero-section__tag">Feature 02 · Queue Intel</span>
          <h1 className="bt-hero-section__headline">
            <span>Beat</span>
            <span className="bt-hero-section__headline--accent">THE</span>
            <span>queue.</span>
          </h1>
          <p className="bt-hero-section__sub">
            Find the quietest hour at your booth — based on historical turnout patterns across India.
          </p>
        </div>
      </section>
      <div className="bt-control-strip">
        <div className="bt-control-strip__inner">
          <div className="bt-constituency-wrap">
            <span className="bt-constituency-label">Constituency</span>
            <input
              className="bt-constituency-input"
              type="text"
              placeholder="Optional — e.g. Chandni Chowk"
              value={constituency}
              onChange={(e) => setConstituency(e.target.value)}
            />
          </div>
        </div>
			</div>

      <section className="bt-states-section">
        <div className="bt-states-section__category"><span>Which state?</span></div>
        <div className="bt-states-list">
          {STATES.map((state, i) => (
            <button key={state}
              className={["bt-state-row",
                selectedState === state ? "bt-state-row--selected" : "",
                visibleRows.has(i)      ? "bt-state-row--visible"  : ""].join(" ")}
              onClick={() => { setSelectedState(state); setResult(null); clearError(); }}>
              <span className="bt-state-row__index">{String(i + 1).padStart(2, "0")}</span>
              <span className="bt-state-row__name">{state.toLowerCase()}</span>
              <span className="bt-state-row__indicator">{selectedState === state ? "selected →" : "—"}</span>
            </button>
          ))}
        </div>
      </section>
      {selectedState && (
        <div className="bt-cta-strip">
          <div className="bt-cta-strip__inner">
            <div className="bt-cta-strip__state">
              <span className="bt-cta-strip__state-label">Target</span>
              <span className="bt-cta-strip__state-name">
                {selectedState.toLowerCase()}
                {constituency && <span className="bt-cta-strip__constituency"> · {constituency}</span>}
              </span>
            </div>
            {error && <div className="error-banner" style={{ margin: 0, flex: 1 }}>{error}</div>}
            <button className="btn-primary" onClick={handleFetch} disabled={loading}>
              {loading ? <><span className="spinner" /> Finding best time…</> : "Find best time →"}
            </button>
          </div>
        </div>
      )}
      {result && (
        <section className="bt-results section-container" ref={resultsRef}>
          <div className="bt-results__label">Best time to vote in — {result.state.toLowerCase()}</div>

          <div className="bt-result-hero">
            <div className="bt-result-hero__left">
              <span className="bt-result-hero__badge">Recommended slot</span>
              <div className="bt-result-hero__time">{result.recommendedSlot}</div>
              {recommended && (
                <div className="bt-result-hero__meta">
                  <span style={{ color: LEVEL_COLOR[recommended.level] }}>{recommended.level} crowd</span>
                  <span className="bt-result-hero__sep">·</span>
                  <span>~{recommended.waitMinutes} min wait</span>
                </div>
              )}
            </div>
            <div className="bt-result-hero__right">
              <span className="bt-result-hero__tip-label">Local tip</span>
              <p className="bt-result-hero__tip-text">{result.tip}</p>
            </div>
          </div>

          <div className="bt-chart-section">
            <div className="bt-chart-section__title">Hourly crowd forecast</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={result.hourlyData} margin={{ top: 8, right: 0, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="crowdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#FF671F" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#FF671F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(245,245,242,0.03)" vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={{ ...AXIS_TICK, fill: "rgba(245,245,242,0.18)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(245,245,242,0.08)",
                    color: "#f5f5f2", fontSize: 11, fontFamily: "IBM Plex Mono", borderRadius: 0 }}
                  formatter={(val: number) => [`${val}`, "Crowd Index"]}
                />
                <Area type="monotone" dataKey="crowdIndex" stroke="#FF671F" strokeWidth={1.5} fill="url(#crowdGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bt-grid">
            {result.hourlyData.map((h) => (
              <div key={h.hour} className={`bt-cell${h.hour === result.recommendedSlot ? " bt-cell--best" : ""}`}>
                <div className="bt-cell__bar-wrap">
                  <div className="bt-cell__bar"
                    style={{ height: `${h.crowdIndex}%`, background: LEVEL_COLOR[h.level],
                      opacity: h.hour === result.recommendedSlot ? 1 : 0.5 }} />
                </div>
                <div className="bt-cell__time">{h.label}</div>
                <div className="bt-cell__wait">{h.waitMinutes}m</div>
              </div>
            ))}
          </div>

          <p className="data-note">✦ {result.basedOn}</p>
        </section>
      )}

      {!result && !loading && (
        <div className="empty-state section-container">
          <span className="empty-state__icon">—</span>
          <p>Select your state to see optimal voting hours.</p>
        </div>
      )}

    </main>
  );
};

export default BestTimePage;
