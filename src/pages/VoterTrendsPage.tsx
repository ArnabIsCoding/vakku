import React, { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { STATES, ElectionType } from "../constants/india";
import { useFunction } from "../hooks/useFunction";
import "./VoterTrendsPage.css";

interface ElectionSnapshot {
  year: number; totalRegistered: number; newVoters: number;
  deletedEntries: number; netChange: number;
  percentageChange: number; turnoutPercent: number;
}
interface VoterTrendsResult {
  state: string; electionType: string;
  snapshots: ElectionSnapshot[];
  latestYear: number; previousYear: number;
  summary: string; source: string;
}

const fmt = (n: number) => {
  if (Math.abs(n) >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`;
  if (Math.abs(n) >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
  return n.toLocaleString("en-IN");
};

const VoterTrendsPage: React.FC = () => {
  const resultsRef = useRef<HTMLDivElement>(null);

  const [selectedState, setSelectedState] = useState("");
  const [electionType,  setElectionType]  = useState<ElectionType>("lok_sabha");
  const [result,        setResult]        = useState<VoterTrendsResult | null>(null);
  const [visibleRows,   setVisibleRows]   = useState<Set<number>>(new Set());

  const { call, loading, error, clearError } = useFunction<VoterTrendsResult>("get_voter_trends");

  useEffect(() => {
    STATES.forEach((_, i) =>
      setTimeout(() => setVisibleRows((p) => new Set([...p, i])), 100 + i * 55),
    );
  }, []);

  const handleFetch = async () => {
    if (!selectedState) return;
    clearError(); setResult(null);
    const data = await call({ state: selectedState, electionType });
    if (data) {
      setResult(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  };

  const latest    = result?.snapshots[result.snapshots.length - 1];
  const previous  = result?.snapshots[result.snapshots.length - 2];
  const netChange = latest && previous ? latest.totalRegistered - previous.totalRegistered : 0;

  const AXIS_TICK = { fill: "rgba(245,245,242,0.25)", fontSize: 9, fontFamily: "IBM Plex Mono" };
  const TT_STYLE  = {
    contentStyle: { background: "#1a1a1a", border: "1px solid rgba(245,245,242,0.07)",
      color: "#f5f5f2", fontSize: 11, fontFamily: "IBM Plex Mono", borderRadius: 0 },
  };

  return (
    <main className="vt-page">

      <section className="vt-hero-section">
        <div className="vt-hero-section__inner section-container">
          <span className="vt-hero-section__tag">Feature 03 · ECI Data</span>
          <h1 className="vt-hero-section__headline">
            <span>Voter</span>
            <span className="vt-hero-section__headline--accent">ROLL</span>
            <span>shift.</span>
          </h1>
          <p className="vt-hero-section__sub">
            Track how the registered voter population has changed election to election — new additions, deletions, net change.
          </p>
        </div>
      </section>

      <div className="vt-control-strip">
        <div className="vt-control-strip__inner">
          <div className="vt-type-toggles">
            {[
              { value: "lok_sabha",    label: "Lok Sabha"    },
              { value: "vidhan_sabha", label: "Vidhan Sabha" },
            ].map((et) => (
              <button key={et.value}
                className={`vt-type-btn${electionType === et.value ? " vt-type-btn--active" : ""}`}
                onClick={() => { setElectionType(et.value as ElectionType); setResult(null); }}>
                {et.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="vt-states-section">
        <div className="vt-states-section__category"><span>Which state?</span></div>
        <div className="vt-states-list">
          {STATES.map((state, i) => (
            <button key={state}
              className={["vt-state-row",
                selectedState === state ? "vt-state-row--selected" : "",
                visibleRows.has(i)      ? "vt-state-row--visible"  : ""].join(" ")}
              onClick={() => { setSelectedState(state); setResult(null); clearError(); }}>
              <span className="vt-state-row__index">{String(i + 1).padStart(2, "0")}</span>
              <span className="vt-state-row__name">{state.toLowerCase()}</span>
              <span className="vt-state-row__indicator">{selectedState === state ? "selected →" : "—"}</span>
            </button>
          ))}
        </div>
      </section>

      {selectedState && (
        <div className="vt-cta-strip">
          <div className="vt-cta-strip__inner">
            <div className="vt-cta-strip__state">
              <span className="vt-cta-strip__state-label">Target</span>
              <span className="vt-cta-strip__state-name">{selectedState.toLowerCase()}</span>
            </div>
            {error && <div className="error-banner" style={{ margin: 0, flex: 1 }}>{error}</div>}
            <button className="btn-primary" onClick={handleFetch} disabled={loading}>
              {loading ? <><span className="spinner" /> Loading trends…</> : "Load trends →"}
            </button>
          </div>
        </div>
      )}

      {result && latest && (
        <section className="vt-results section-container" ref={resultsRef}>
          <div className="vt-results__label">Voter roll for — {result.state.toLowerCase()}</div>

          <div className="vt-stats">
            {[
              { label: "Total registered",                             value: fmt(latest.totalRegistered),        color: "var(--saffron)" },
              { label: `New voters (${result.latestYear})`,            value: `+${fmt(latest.newVoters)}`,         color: "var(--green)"   },
              { label: "Deleted entries",                               value: `-${fmt(latest.deletedEntries)}`,    color: "rgba(255,107,53,0.85)" },
              { label: `Net change vs ${result.previousYear}`,
                value: `${netChange >= 0 ? "+" : ""}${fmt(netChange)}`,
                color: netChange >= 0 ? "var(--green)" : "rgba(255,107,53,0.85)" },
            ].map((s, i) => (
              <div key={i} className="vt-stat">
                <div className="vt-stat__label">{s.label}</div>
                <div className="vt-stat__value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="vt-chart-card">
            <div className="vt-chart-card__title">Registered voters over time</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={result.snapshots} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(245,245,242,0.03)" vertical={false} />
                <XAxis dataKey="year" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmt} tick={{ ...AXIS_TICK, fill: "rgba(245,245,242,0.18)" }}
                  axisLine={false} tickLine={false} width={48} />
                <Tooltip formatter={(v: number) => [fmt(v), "Registered"]} {...TT_STYLE} />
                <Line type="monotone" dataKey="totalRegistered" stroke="#FF671F" strokeWidth={1.5} dot={{ fill: "#FF671F", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="vt-dual">
            <div className="vt-chart-card">
              <div className="vt-chart-card__title">Net change per election</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={result.snapshots} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(245,245,242,0.03)" vertical={false} />
                  <XAxis dataKey="year" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmt} tick={{ ...AXIS_TICK, fill: "rgba(245,245,242,0.18)" }}
                    axisLine={false} tickLine={false} width={44} />
                  <Tooltip formatter={(v: number) => [fmt(v), "Net Change"]} {...TT_STYLE} />
                  <ReferenceLine y={0} stroke="rgba(245,245,242,0.08)" strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="netChange" stroke="#046A38" strokeWidth={1.5} dot={{ fill: "#046A38", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="vt-chart-card">
              <div className="vt-chart-card__title">Voter turnout %</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={result.snapshots} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(245,245,242,0.03)" vertical={false} />
                  <XAxis dataKey="year" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`}
                    tick={{ ...AXIS_TICK, fill: "rgba(245,245,242,0.18)" }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip formatter={(v: number) => [`${v}%`, "Turnout"]} {...TT_STYLE} />
                  <Line type="monotone" dataKey="turnoutPercent" stroke="#FF671F" strokeWidth={1.5} dot={{ fill: "#FF671F", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="vt-summary">
            <div className="vt-summary__label">Analysis</div>
            <p>{result.summary}</p>
          </div>
          <p className="data-note">✦ {result.source}</p>
        </section>
      )}

      {!result && !loading && (
        <div className="empty-state section-container">
          <span className="empty-state__icon">—</span>
          <p>Select a state to see voter population trends.</p>
        </div>
      )}

    </main>
  );
};

export default VoterTrendsPage;
