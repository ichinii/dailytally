import React, { useState } from 'react';
import { T } from '../strings.js';

const W = 300, H = 90, TOP = 8, LABEL_H = 18;

/** Anteil der Einträge je Stunde über den Tag (04:00 bis 03:59). Index 0 = 4 Uhr. */
export default function HourChart({ shares }) {
  const [sel, setSel] = useState(null);
  const max = Math.max(0.0001, ...shares);
  const bw = W / 24;
  const hourOf = (i) => (i + 4) % 24;
  return (
    <div className="dt-chart dt-hours">
      <svg viewBox={`0 0 ${W} ${TOP + H + LABEL_H}`} className="dt-hours__svg" role="img" aria-label={T.hourDist}>
        <line className="dt-chart__grid" x1="0" x2={W} y1={TOP + H} y2={TOP + H} />
        {shares.map((s, i) => {
          const h = (s / max) * H;
          return (
            <g key={i} onClick={() => setSel(sel === i ? null : i)} className={'dt-hours__col' + (sel === i ? ' is-sel' : '')}>
              <rect x={i * bw} y={TOP} width={bw} height={H} fill="transparent" />
              <rect className="dt-hours__bar" x={i * bw + 1.5} y={TOP + H - h} width={bw - 3} height={h} rx="2" />
            </g>
          );
        })}
        {[0, 4, 8, 12, 16, 20].map((i) => (
          <text key={i} className="dt-chart__tick" x={i * bw + bw / 2} y={TOP + H + 14} textAnchor="middle">{hourOf(i)}</text>
        ))}
      </svg>
      <div className="dt-chart__info" aria-live="polite">
        {sel != null ? T.hourShare(hourOf(sel), Math.round(shares[sel] * 100)) : T.tapHint}
      </div>
    </div>
  );
}
