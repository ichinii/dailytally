import React, { memo, useMemo, useRef } from 'react';
import { AppBar, Card, Mark, Note, Tabs } from '../kladde/kladde.js';
import { usePref } from '../lib/prefs.js';
import TrendChart from './TrendChart.jsx';
import HourChart from './HourChart.jsx';
import { buildSeries, computeItemStats } from '../lib/stats.js';
import { formatDuration, formatMinutesOfDay, formatNumber } from '../lib/days.js';
import { tintFor } from '../lib/ui.js';
import { T } from '../strings.js';

const goalWord = (g) => `${g.type === 'max' ? T.goalMax : T.goalMin} ${g.value}`;

function Kpi({ item, kpi }) {
  const avgFn = { day: T.avgDay, week: T.avgWeek, month: T.avgMonth }[item.period];
  if (kpi.avg == null) return <p className="dt-kpi kl-muted">{T.kpiNoData}</p>;
  const a = Math.round(kpi.avg * 10) / 10, p = kpi.prev == null ? null : Math.round(kpi.prev * 10) / 10;
  return (
    <div className="dt-kpi" data-testid="kpi">
      <span className="dt-kpi__num">{avgFn(formatNumber(kpi.avg))}</span>
      {p != null && <span className="dt-kpi__dir">{a < p ? T.dirDown(formatNumber(p)) : a > p ? T.dirUp(formatNumber(p)) : T.dirSame(formatNumber(p))}</span>}
      <span className="dt-kpi__hint">{{ day: T.kpiDayHint, week: T.kpiWeekHint, month: T.kpiMonthHint }[item.period]}</span>
    </div>
  );
}

const RES_FOR = { day: ['day', 'week', 'month'], week: ['week', 'month'], month: ['month'] };
const RES_LABEL = { day: T.resDay, week: T.resWeek, month: T.resMonth };

function ResTabs({ value, onChange, period }) {
  const ids = RES_FOR[period];
  if (ids.length < 2) return null; // Monats-Items: nur Monate, keine Auswahl nötig
  return <Tabs label={T.resolution} value={value} onChange={onChange} items={ids.map((id) => ({ id, label: RES_LABEL[id] }))} className="dt-res" />;
}

function OverviewCard({ item, tint, stats, today, fallbackWidth }) {
  const young = today - stats.start < 21;
  const resIds = RES_FOR[item.period];
  const defRes = item.period === 'day' ? (young ? 'day' : 'week') : resIds[0];
  // Gewählte Auflösung je Item und Abschnitt im Browser merken
  const [res, setRes] = usePref(`res:${item.id}:count`, defRes, resIds);
  const [pRes, setPRes] = usePref(`res:${item.id}:pause`, young ? 'day' : 'week', RES_FOR.day);
  const [fRes, setFRes] = usePref(`res:${item.id}:first`, young ? 'day' : 'week', RES_FOR.day);
  const [hourMode, setHourMode] = usePref(`res:${item.id}:hours`, '4w', ['4w', 'all']);

  const unitDays = { day: 1, week: 7, month: 30.4375 }[item.period];
  const series = useMemo(() => buildSeries({
    daily: stats.daily, start: stats.start, today, res,
    mode: 'rate', unitDays, raw: res === item.period && item.period !== 'day',
    goalAt: (d) => { const g = stats.countGoalAt(d); return g ? { value: g.value, text: goalWord(g) } : null; },
  }), [stats, today, res, unitDays, item.period]);

  const pauseSeries = useMemo(() => (stats.pauses ? buildSeries({
    daily: stats.pauses.map((v) => (v == null ? null : v / 60)), start: stats.start, today, res: pRes, mode: 'mean',
    goalAt: (d) => { const m = stats.pauseGoalAt(d); return m != null ? { value: m / 60, text: formatDuration(m) } : null; },
  }) : null), [stats, today, pRes]);

  const firstSeries = useMemo(() => (stats.timeStats && stats.timeStats.first ? buildSeries({
    daily: stats.timeStats.first, start: stats.start, today, res: fRes, mode: 'mean',
  }) : null), [stats, today, fRes]);

  const unit = { day: T.unitDay, week: T.unitWeek, month: T.unitMonth }[item.period];
  const chartProps = { fallbackWidth };
  const pk = stats.pauseKpi;

  return (
    <Card tint={tint} title={item.label} className="dt-ov" as="article"
      action={<Mark tint={tint} className="dt-ov__period">{T.per[item.period]}</Mark>}>
      <Kpi item={item} kpi={stats.kpi} />
      <ResTabs value={res} onChange={setRes} period={item.period} />
      <TrendChart {...chartProps} testId="trend" points={series} unit={unit}
        fmt={(v) => `${formatNumber(v)} ${unit}`} fmtAxis={(v) => formatNumber(v)} />

      {pauseSeries && (
        <section className="dt-ov__sec" data-testid="pauses">
          <h4 className="dt-sub">{T.pauses}</h4>
          <p className="dt-small">
            {T.pauseKpi(pk.reached, pk.total)}
            {pk.unknown > 0 && <span className="kl-muted"> · {T.pauseUnknownDays(pk.unknown)}</span>}
          </p>
          <ResTabs value={pRes} onChange={setPRes} period="day" />
          <TrendChart {...chartProps} points={pauseSeries} unit={T.unitHours}
            fmt={(v) => T.pauseValue(formatDuration(v * 60))} fmtAxis={(v) => `${formatNumber(v)} h`} kind="hours" />
        </section>
      )}

      {stats.timeStats && (
        <section className="dt-ov__sec" data-testid="times">
          <h4 className="dt-sub">{T.times}</h4>
          <div className="dt-ov__row">
            <span className="kl-field__label">{T.hourDist}</span>
            <Tabs label={T.hourDist} value={hourMode} onChange={setHourMode} items={[{ id: '4w', label: T.last4Weeks }, { id: 'all', label: T.allTime }]} />
          </div>
          <HourChart shares={(hourMode === '4w' ? stats.timeStats.hours4w : stats.timeStats.hoursAll).bins} />
          {firstSeries && (
            <>
              <span className="kl-field__label">{T.firstEntry}</span>
              <p className="dt-small">{stats.firstAvg != null ? T.firstAvg(formatMinutesOfDay(stats.firstAvg)) : T.firstNone}</p>
              <ResTabs value={fRes} onChange={setFRes} period="day" />
              <TrendChart {...chartProps} points={firstSeries} unit={T.timeLabel} kind="clock"
                fmt={(v) => formatMinutesOfDay(v)} fmtAxis={(v) => formatMinutesOfDay(v)} />
            </>
          )}
        </section>
      )}
    </Card>
  );
}
const OverviewCardM = memo(OverviewCard);

/** Pro Item eine Karte mit Kennzahl und Trend ab Beginn; Pausen und Uhrzeiten nur, wenn sie zum Item passen. */
export default function OverviewView({ data, index, today, now, contentWidth }) {
  const cache = useRef(new Map());
  const statsList = useMemo(() => {
    const next = new Map();
    const list = data.items.map((item) => {
      const r = index.byItem.get(item.id);
      const sig = `${today}|${r.n}|${r.sig}|${item.period}|${JSON.stringify(item.countGoals)}|${JSON.stringify(item.pauseGoals)}|${item.createdDay}`;
      const old = cache.current.get(item.id);
      const stats = old && old.sig === sig ? old.stats : computeItemStats(item, r, today, now);
      next.set(item.id, { sig, stats });
      return stats;
    });
    cache.current = next;
    return list;
  }, [data, index, today, now]);

  const fallbackWidth = Math.max(200, contentWidth - 32); // Ansicht minus Karten-Innenabstand

  return (
    <>
      <AppBar title={T.overviewTitle} mark markTint="lilac" subtitle={T.overviewSubtitle} />
      <div className="kl-view">
        {data.items.length === 0 ? (
          <div className="kl-empty"><Note title={T.overviewEmptyTitle} center>{T.overviewEmpty}</Note></div>
        ) : (
          <div className="kl-stack">
            {data.items.map((item, i) => (
              <OverviewCardM key={item.id} item={item} tint={tintFor(i)} stats={statsList[i]} today={today}
                fallbackWidth={fallbackWidth} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
