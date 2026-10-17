import React from 'react';

/** Fortschrittsbalken im Kladde-Stil (kl-progress), ohne sichtbare Beschriftung – der Wert steht daneben als Text. */
export default function Bar({ value, max, label, tint }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="kl-progress">
      <div className="kl-progress__track" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(Math.min(value, max))} aria-label={label}>
        <div className="kl-progress__fill" style={{ width: pct + '%', '--kl-mark-c': tint ? `var(--mark-${tint})` : undefined }} />
      </div>
    </div>
  );
}
