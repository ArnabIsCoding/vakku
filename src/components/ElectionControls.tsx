import React from "react";
import { STATES, ELECTION_TYPES, ElectionType } from "../constants/india";
import "./ElectionControls.css";

interface ElectionControlsProps {
  state:       string;
  onState:     (s: string) => void;
  showElectionType?: boolean;
  electionType?:    ElectionType;
  onElectionType?:  (t: ElectionType) => void;
  showConstituency?: boolean;
  constituency?:     string;
  onConstituency?:   (c: string) => void;
  ctaLabel:   string;
  onSubmit:   () => void;
  disabled?:  boolean;
  loading?:   boolean;
  usageCount?: number;
  maxUses?:    number;
}

const ElectionControls: React.FC<ElectionControlsProps> = ({
  state,         onState,
  showElectionType, electionType, onElectionType,
  showConstituency, constituency, onConstituency,
  ctaLabel,      onSubmit,
  disabled,      loading,
  usageCount,    maxUses,
}) => {
  const showPips = maxUses !== undefined && usageCount !== undefined;

  return (
    <div className="ec-wrap">
      <div className="controls-row">
        <div className="control-group">
          <label className="control-label">{("consequences.selectState")}</label>
          <select
            className="control-select"
            value={state}
            onChange={(e) => onState(e.target.value)}
          >
            <option value="">— Choose a state —</option>
            {STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        {showElectionType && onElectionType && electionType !== undefined && (
          <div className="control-group">
            <label className="control-label">{("voterTrends.selectElectionType")}</label>
            <select
              className="control-select"
              value={electionType}
              onChange={(e) => onElectionType(e.target.value as ElectionType)}
            >
              {ELECTION_TYPES.map((et) => (
                <option key={et.value} value={et.value}>{et.label}</option>
              ))}
            </select>
          </div>
        )}
        {showConstituency && onConstituency !== undefined && (
          <div className="control-group">
            <label className="control-label">
              {("bestTime.selectConstituency")} <span className="ec-optional">(optional)</span>
            </label>
            <input
              type="text"
              className="control-input"
              value={constituency ?? ""}
              onChange={(e) => onConstituency(e.target.value)}
              placeholder="e.g. Kolkata North"
            />
          </div>
        )}
        <button
          className="btn-primary controls-row__cta"
          onClick={onSubmit}
          disabled={!state || loading || disabled}
        >
          {loading
            ? <><span className="spinner" /> Loading…</>
            : ctaLabel
          }
        </button>

      </div>
      {showPips && (
        <div className="ec-usage">
          <div className="ec-usage__pips">
            {Array.from({ length: maxUses! }).map((_, i) => (
              <span
                key={i}
                className={`ec-usage__pip${i < usageCount! ? " ec-usage__pip--used" : ""}`}
              />
            ))}
          </div>
          <span className="ec-usage__text">
            {usageCount! >= maxUses!
              ? "Daily limit reached"
              : `${maxUses! - usageCount!} of ${maxUses} remaining today`}
          </span>
        </div>
      )}
    </div>
  );
};

export default ElectionControls;
