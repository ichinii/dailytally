import React, { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cssPx } from '../lib/ui.js';
import { T } from '../strings.js';

const PAD_X = 10, PAD_TOP = 10, LABEL_H = 22;

/** Ganzzahliger Schritt 1, 2, 5, 10, 20, 50 … für höchstens etwa 3 Intervalle. */
function niceStep(rough) {
  if (!(rough > 1)) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(rough)));
  for (const m of [1, 2, 5, 10]) if (m * e >= rough - 1e-9) return m * e;
  return 10 * e;
}

function useWidth(ref, fallback) {
  const [w, setW] = useState(0);
  const cur = useRef(0);
  cur.current = w || fallback;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const cw = el.clientWidth;
      if (cw && Math.abs(cw - cur.current) > 0.5) setW(cw);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w || fallback;
}

/**
 * Verlauf: geglättete Linie (gleitender Durchschnitt) über dezenten Einzelpunkten, Ziel als Stufen-Hilfslinie.
 * Keine Balken. Passen die Punkte nicht mit ~8 px Abstand in die Breite, scrollt das Diagramm horizontal
 * (Start am rechten Ende); die Y-Achse bleibt stehen.
 * points: [{ value|null, smooth|null, goal|null, provisional, tick, label }]
 * kind: 'count' | 'hours' | 'clock'
 */
export default function TrendChart({ points, unit, fmt, fmtAxis, fallbackWidth, kind = 'count', testId }) {
  const wrapRef = useRef(null);
  const width = useWidth(wrapRef, fallbackWidth);
  const [sel, setSel] = useState(null);
  const H = cssPx('--chart-h', 150);
  const AXIS_W = cssPx('--chart-axis-w', 40);
  const MIN_STEP = cssPx('--chart-min-step', 8);

  useEffect(() => { setSel(null); }, [points]);

  const g = useMemo(() => {
    const n = points.length;
    const avail = Math.max(60, width - AXIS_W);
    const fit = n > 1 ? (avail - 2 * PAD_X) / (n - 1) : 0;
    const step = n > 1 ? Math.max(MIN_STEP, fit) : 0;
    const plotW = n > 1 ? Math.max(avail, 2 * PAD_X + step * (n - 1)) : avail;
    const scroll = n > 1 && fit < MIN_STEP;
    let lo = 0, hi = 0, minV = Infinity;
    for (const p of points) {
      for (const v of [p.value, p.smooth, p.goal]) if (v != null) { if (v > hi) hi = v; if (v < minV) minV = v; }
    }
    let ticks;
    if (kind === 'clock') {
      // Minuten seit 04:00 – Marken nur zu vollen Stunden (1, 2, 3, 4 oder 6 h Abstand)
      lo = Number.isFinite(minV) ? Math.floor(minV / 60) * 60 : 0;
      const spanH = Math.max(1, Math.ceil(hi / 60) - lo / 60);
      const stepH = [1, 2, 3, 4, 6, 12].find((h) => spanH / h <= 4) || 12;
      hi = lo + Math.ceil(spanH / stepH) * stepH * 60;
      ticks = [];
      for (let v = lo; v <= hi; v += stepH * 60) ticks.push(v);
    } else {
      // keine Kommazahlen: ganzzahlige Schritte, Maximum ein Vielfaches davon
      const step = niceStep(hi / 3);
      hi = Math.max(step, Math.ceil(hi / step - 1e-9) * step);
      ticks = [];
      for (let v = 0; v <= hi + 1e-9; v += step) ticks.push(v);
    }
    const x = (i) => (n > 1 ? PAD_X + i * step : plotW / 2);
    const y = (v) => PAD_TOP + (1 - (v - lo) / (hi - lo || 1)) * H;

    // geglättete Linie: durchgezogen bis zum letzten vollständigen Zeitraum, gestrichelt zum vorläufigen
    let solid = '', dashed = '';
    let prev = null;
    points.forEach((p, i) => {
      if (p.smooth == null) { prev = null; return; }
      const pt = `${x(i).toFixed(1)},${y(p.smooth).toFixed(1)}`;
      if (p.provisional && prev) dashed += `M${prev}L${pt}`;
      else solid += (prev ? 'L' : 'M') + pt;
      prev = pt;
    });
    // Ziel als Stufenlinie, Lücken wo kein Ziel galt
    let goal = '';
    let last = null;
    points.forEach((p, i) => {
      if (p.goal == null) { last = null; return; }
      const half = n > 1 ? step / 2 : plotW / 2;
      const a = Math.max(0, x(i) - half), b = Math.min(plotW, x(i) + half), gy = y(p.goal).toFixed(1);
      goal += last == null ? `M${a.toFixed(1)},${gy}` : `L${a.toFixed(1)},${gy}`;
      goal += `L${b.toFixed(1)},${gy}`;
      last = p.goal;
    });
    const every = Math.max(1, Math.ceil(84 / (step || 84)));
    const labels = [];
    for (let i = n - 1; i >= 0; i -= every) labels.push(i);
    return { n, step, plotW, scroll, x, y, ticks, solid, dashed, goal, hasGoal: goal !== '', labels, r: step < 10 && n > 1 ? 2 : 3 };
  }, [points, width, kind, H, AXIS_W, MIN_STEP]);

  const onTap = (e) => {
    if (!g.n) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPos = e.clientX - rect.left;
    const i = g.n > 1 ? Math.round((xPos - PAD_X) / g.step) : 0;
    const k = Math.max(0, Math.min(g.n - 1, i));
    setSel((s) => (s === k ? null : k));
  };

  const totalH = PAD_TOP + H + LABEL_H;
  const sp = sel != null ? points[sel] : null;

  return (
    <div className="dt-chart" ref={wrapRef} data-testid={testId}>
      <div className="dt-chart__unit">{unit}</div>
      <div className="dt-chart__body">
        <svg className="dt-chart__axis" width={AXIS_W} height={totalH} aria-hidden="true">
          {g.ticks.map((t) => (
            <text key={t} x={AXIS_W - 6} y={g.y(t) + 4} textAnchor="end">{fmtAxis(t)}</text>
          ))}
        </svg>
        {/* direction: rtl → der Scrollbereich beginnt am rechten Ende (heute), auch wenn er unsichtbar erzeugt wurde */}
        <div className={'dt-chart__scroll' + (g.scroll ? ' is-scroll' : '')} data-testid={testId ? testId + '-scroll' : undefined}>
          <svg className="dt-chart__plot" width={g.plotW} height={totalH} onClick={onTap} role="img"
            aria-label={`${unit}: ${points.length} Werte`}>
            {g.ticks.map((t) => <line key={t} className="dt-chart__grid" x1="0" x2={g.plotW} y1={g.y(t)} y2={g.y(t)} />)}
            {g.goal && <path className="dt-chart__goal" d={g.goal} />}
            {points.map((p, i) => (p.value == null ? null : (
              <circle key={i} className={'dt-chart__pt' + (p.provisional ? ' is-prov' : '')} cx={g.x(i)} cy={g.y(p.value)} r={g.r} />
            )))}
            {g.solid && <path className="dt-chart__line" d={g.solid} />}
            {g.dashed && <path className="dt-chart__line is-prov" d={g.dashed} />}
            {sp && (
              <g className="dt-chart__sel">
                <line x1={g.x(sel)} x2={g.x(sel)} y1={PAD_TOP} y2={PAD_TOP + H} />
                {sp.value != null && <circle cx={g.x(sel)} cy={g.y(sp.value)} r="5" />}
              </g>
            )}
            {g.labels.map((i) => (
              <text key={i} className="dt-chart__tick" x={g.x(i)} y={PAD_TOP + H + 16}
                textAnchor={g.x(i) < 20 ? 'start' : g.x(i) > g.plotW - 20 ? 'end' : 'middle'}>{points[i].tick}</text>
            ))}
            <rect x="0" y="0" width={g.plotW} height={totalH} fill="transparent" />
          </svg>
        </div>
      </div>
      <div className="dt-chart__info" aria-live="polite">
        {sp ? (
          <>
            <strong>{sp.label}{sp.provisional ? ` (${T.provisional})` : ''}</strong>
            {': '}{sp.value == null ? T.unknown : fmt(sp.value)}
            {' · '}{sp.goal == null ? T.noGoalAt : T.goalAt(sp.goalLabel)}
          </>
        ) : (
          <span className="dt-chart__legend">
            <span className="dt-lg dt-lg--line" aria-hidden="true" />{T.trend}
            {g.hasGoal && <><span className="dt-lg dt-lg--goal" aria-hidden="true" />{T.goalLegend}</>}
            <span className="dt-lg dt-lg--pt" aria-hidden="true" />{T.tapHint}
          </span>
        )}
      </div>
    </div>
  );
}
