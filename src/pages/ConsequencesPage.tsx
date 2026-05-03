import React, { useState, useEffect, useRef } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { STATES, ElectionType } from "../constants/india";
import { useFunction, MAX_USES_AUTH } from "../hooks/useFunction";
import "./ConsequencesPage.css";

type Scenario = "ruling" | "opposition" | "abstain";

interface ConsequenceData {
  scenario: Scenario;
  gdpGrowthDelta: number; infraScore: number; socialIndex: number; employmentDelta: number;
  summary: string; historicExamples: string[]; confidence: number;
}
interface AnalysisResult {
  state: string; electionType: string;
  ruling: ConsequenceData; opposition: ConsequenceData; abstain: ConsequenceData;
  dataNote: string;
}

const SCENARIO_META: Record<Scenario, { label: string; color: string; tagline: string }> = {
  ruling:     { label: "Ruling party stays",  color: "var(--saffron)",              tagline: "Continuity" },
  opposition: { label: "Power changes hands", color: "var(--green)",                tagline: "Party flip" },
  abstain:    { label: "You don't vote",       color: "rgba(245,245,242,0.3)",      tagline: "Abstain"    },
};

const MONO_TICK = { fill: "rgba(245,245,242,0.25)", fontSize: 9, fontFamily: "IBM Plex Mono" };
const TT_STYLE  = {
  contentStyle: { background: "#1a1a1a", border: "1px solid rgba(245,245,242,0.07)",
    color: "#f5f5f2", fontSize: 11, fontFamily: "IBM Plex Mono", borderRadius: 0 },
};

const ConsequencesPage: React.FC = () => {
  const resultsRef = useRef<HTMLDivElement>(null);

  const [selectedState,  setSelectedState]  = useState("");
  const [electionType,   setElectionType]   = useState<ElectionType>("lok_sabha");
  const [result,         setResult]         = useState<AnalysisResult | null>(null);
  const [activeScenario, setActiveScenario] = useState<Scenario>("ruling");
  const [visibleRows,    setVisibleRows]    = useState<Set<number>>(new Set());

  const { call, loading, error, clearError, usageCount, maxUses, limitReached } =
    useFunction<AnalysisResult>("analyse_party_consequences");

  useEffect(() => {
    STATES.forEach((_, i) =>
      setTimeout(() => setVisibleRows((p) => new Set([...p, i])), 100 + i * 55),
    );
  }, []);

  const handleAnalyse = async () => {
    if (!selectedState || limitReached) return;
    clearError(); setResult(null);
    const data = await call({ state: selectedState, electionType });
    if (data) {
      setResult(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  };

  const active = result ? result[activeScenario] : null;

  const radarData = result ? [
    { metric: "GDP",    ruling: result.ruling.gdpGrowthDelta + 5,  opposition: result.opposition.gdpGrowthDelta + 5,  abstain: result.abstain.gdpGrowthDelta + 5  },
    { metric: "Infra",  ruling: result.ruling.infraScore,           opposition: result.opposition.infraScore,           abstain: result.abstain.infraScore           },
    { metric: "Social", ruling: result.ruling.socialIndex,          opposition: result.opposition.socialIndex,          abstain: result.abstain.socialIndex          },
    { metric: "Jobs",   ruling: result.ruling.employmentDelta + 5,  opposition: result.opposition.employmentDelta + 5,  abstain: result.abstain.employmentDelta + 5  },
  ] : [];

  const barData = result ? [
    { name: "GDP Δ",  ruling: result.ruling.gdpGrowthDelta,  opposition: result.opposition.gdpGrowthDelta,  abstain: result.abstain.gdpGrowthDelta  },
    { name: "Infra",  ruling: result.ruling.infraScore,       opposition: result.opposition.infraScore,       abstain: result.abstain.infraScore       },
    { name: "Social", ruling: result.ruling.socialIndex,      opposition: result.opposition.socialIndex,      abstain: result.abstain.socialIndex      },
    { name: "Jobs Δ", ruling: result.ruling.employmentDelta,  opposition: result.opposition.employmentDelta,  abstain: result.abstain.employmentDelta  },
  ] : [];

  return (
    <main className="cons-page">
      <section className="cons-hero">
        <div className="cons-hero__inner section-container">
          <span className="cons-hero__tag">Feature 01 · AI Analysis</span>
          <h1 className="cons-hero__headline">
            <span>Does your</span>
            <span className="cons-hero__headline--accent">STATE</span>
            <span>even matter?</span>
          </h1>
          <p className="cons-hero__sub">
            Select a state. See what history says when the ruling party stays, power shifts, or you don't show up.
          </p>
        </div>
      </section>

      <div className="cons-control-strip">
        <div className="cons-control-strip__inner">
          <div className="cons-type-toggles">
            {[{ value: "lok_sabha", label: "Lok Sabha" }, { value: "vidhan_sabha", label: "Vidhan Sabha" }].map((et) => (
              <button key={et.value}
                className={`cons-type-btn${electionType === et.value ? " cons-type-btn--active" : ""}`}
                onClick={() => { setElectionType(et.value as ElectionType); setResult(null); }}>
                {et.label}
              </button>
            ))}
          </div>
          <div className="cons-usage">
            <div className="cons-usage__pips">
              {Array.from({ length: maxUses }).map((_, i) => (
                <span key={i} className={`cons-usage__pip${i < usageCount ? " cons-usage__pip--used" : ""}`} />
              ))}
            </div>
            <span className="cons-usage__text">
              {limitReached ? "Daily limit reached" : `${maxUses - usageCount} of ${maxUses} remaining`}
            </span>
          </div>
        </div>
      </div>

      <section className="cons-states-section">
        <div className="cons-states-section__category"><span>Which state?</span></div>
        <div className="cons-states-list">
          {STATES.map((state, i) => (
            <button key={state}
              className={["cons-state-row",
                selectedState === state ? "cons-state-row--selected" : "",
                visibleRows.has(i)      ? "cons-state-row--visible"  : ""].join(" ")}
              onClick={() => { setSelectedState(state); setResult(null); clearError(); }}>
              <span className="cons-state-row__index">{String(i + 1).padStart(2, "0")}</span>
              <span className="cons-state-row__name">{state.toLowerCase()}</span>
              <span className="cons-state-row__indicator">{selectedState === state ? "selected →" : "—"}</span>
            </button>
          ))}
        </div>
      </section>

      {selectedState && (
        <div className="cons-cta-strip">
          <div className="cons-cta-strip__inner">
            <div className="cons-cta-strip__state">
              <span className="cons-cta-strip__state-label">Target</span>
              <span className="cons-cta-strip__state-name">{selectedState.toLowerCase()}</span>
            </div>
            {error && <div className="error-banner" style={{ margin: 0, flex: 1 }}>{error}</div>}
            <button className="btn-primary" onClick={handleAnalyse} disabled={loading || limitReached}>
              {loading ? <><span className="spinner" /> Analysing…</> : limitReached ? "Limit reached" : "Analyse →"}
            </button>
          </div>
        </div>
      )}

      {result && (
        <section className="cons-results section-container" ref={resultsRef}>
          <div className="cons-results__label">What history says about — {result.state.toLowerCase()}</div>
          <div className="cons-tabs">
            {(["ruling", "opposition", "abstain"] as Scenario[]).map((s) => (
              <button key={s}
                className={`cons-tab${activeScenario === s ? " cons-tab--active" : ""}`}
                style={{ "--tab-color": SCENARIO_META[s].color } as React.CSSProperties}
                onClick={() => setActiveScenario(s)}>
                <span className="cons-tab__tagline">{SCENARIO_META[s].tagline}</span>
                <span className="cons-tab__gdp">{result[s].gdpGrowthDelta > 0 ? "+" : ""}{result[s].gdpGrowthDelta}%</span>
                <span className="cons-tab__label">{SCENARIO_META[s].label}</span>
              </button>
            ))}
          </div>

          {active && (
            <div className="cons-detail">
              <div className="cons-detail__left">
                <h2 className="cons-detail__heading" style={{ color: SCENARIO_META[activeScenario].color }}>
                  {SCENARIO_META[activeScenario].label}
                </h2>
                <p className="cons-detail__text">{active.summary}</p>
                {active.historicExamples.length > 0 && (
                  <div className="cons-examples">
                    <div className="cons-examples__label">Historic record</div>
                    {active.historicExamples.map((ex, i) => (
                      <div key={i} className="cons-examples__item">
                        <span className="cons-examples__dash">—</span><span>{ex}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="cons-confidence">
                  <span className="cons-confidence__label">Confidence</span>
                  <div className="cons-confidence__bar">
                    <div className="cons-confidence__fill"
                      style={{ width: `${active.confidence}%`, background: SCENARIO_META[activeScenario].color }} />
                  </div>
                  <span className="cons-confidence__val">{active.confidence}%</span>
                </div>
              </div>

              <div className="cons-detail__right">
                <div className="cons-chart-card">
                  <div className="cons-chart-card__title">Radar — all scenarios</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(245,245,242,0.04)" />
                      <PolarAngleAxis dataKey="metric" tick={MONO_TICK} />
                      <PolarRadiusAxis tick={false} axisLine={false} />
                      <Radar name="Ruling"     dataKey="ruling"     stroke="#FF671F" fill="#FF671F" fillOpacity={0.07} strokeWidth={1.5} />
                      <Radar name="Opposition" dataKey="opposition" stroke="#046A38" fill="#046A38" fillOpacity={0.07} strokeWidth={1.5} />
                      <Radar name="Abstain"    dataKey="abstain"    stroke="rgba(245,245,242,0.2)" fill="transparent" strokeWidth={1} />
                      <Tooltip {...TT_STYLE} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="cons-chart-card">
                  <div className="cons-chart-card__title">Index comparison</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barData} barCategoryGap="32%">
                      <CartesianGrid stroke="rgba(245,245,242,0.03)" vertical={false} />
                      <XAxis dataKey="name" tick={MONO_TICK} axisLine={false} tickLine={false} />
                      <YAxis tick={{ ...MONO_TICK, fill: "rgba(245,245,242,0.18)" }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip {...TT_STYLE} />
                      <Legend wrapperStyle={{ color: "rgba(245,245,242,0.3)", fontSize: 9, fontFamily: "IBM Plex Mono" }} />
                      <Bar dataKey="ruling"     name="Ruling"     fill="#FF671F"               radius={[1,1,0,0]} />
                      <Bar dataKey="opposition" name="Opposition" fill="#046A38"               radius={[1,1,0,0]} />
                      <Bar dataKey="abstain"    name="Abstain"    fill="rgba(245,245,242,0.1)" radius={[1,1,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
          <p className="data-note">✦ {result.dataNote}</p>
        </section>
      )}

      {limitReached && !result && (
        <div className="cons-limit-wall section-container">
          <p className="cons-limit-wall__headline">You've used your analyses for today.</p>
          <p className="cons-limit-wall__sub">Sign in to unlock {MAX_USES_AUTH} analyses per day — free.</p>
          <a href="/signin" className="btn-primary">Sign in →</a>
        </div>
      )}
    </main>
  );
};

export default ConsequencesPage;
