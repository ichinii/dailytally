import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button, Icon } from '../kladde/kladde.js';
import { mondayOf, numToYMD, numToKey, keyToNum, isValidKey, weekRangeLabel, formatDayWithWeekday } from '../lib/days.js';
import { cssMs, prefersReducedMotion } from '../lib/ui.js';
import { finePointer, openPicker } from '../lib/picker.js';
import { T, WEEKDAYS_SHORT } from '../strings.js';

const RENDER_RADIUS = 2; // nur Wochen nahe der sichtbaren rendern

/**
 * Wischbarer Wochenstreifen (Mo–So). CSS Scroll-Snap pro Woche mit scroll-snap-stop: always,
 * damit auch ein kräftiger Wisch genau eine Woche weiterrastet.
 * Tipp auf den Monat öffnet den Kalender des Systems; „Heute“ animiert immer genau eine Woche.
 */
export default function WeekStrip({ today, selected, onSelect, earliestDay, activeDays, active, alignKey }) {
  const firstMon = mondayOf(Math.min(today - 364, earliestDay));
  const lastMon = mondayOf(today);
  const count = (lastMon - firstMon) / 7 + 1;
  const idxOf = useCallback((n) => Math.max(0, Math.min(count - 1, (mondayOf(n) - firstMon) / 7)), [count, firstMon]);

  const scRef = useRef(null);
  const dateRef = useRef(null);
  const [vis, setVis] = useState(() => idxOf(selected));
  const [jump, setJump] = useState(null); // { from: Montag, key } – Überblend-Animation zum Heute-Knopf
  const [pickerShown, setPickerShown] = useState(false);
  const visRef = useRef(vis);
  const raf = useRef(0);
  const selRef = useRef(selected);
  selRef.current = selected;

  const setVisible = (i) => { if (visRef.current !== i) { visRef.current = i; setVis(i); } };
  // Springen ohne Animation. Chrome merkt sich nach einem Wisch die eingerastete Woche und zieht später
  // dorthin zurück, wenn man nur scrollLeft setzt. Daher bekommt der Streifen bei einem Sprung ein frisches
  // Scroll-Element (neuer key) und wird vor dem Zeichnen auf die Zielwoche gesetzt.
  const [scrollerKey, setScrollerKey] = useState(0);
  const pendingIdx = useRef(null);
  const jumpTo = (i) => {
    pendingIdx.current = i;
    setVisible(i);
    setScrollerKey((k) => k + 1);
  };
  useLayoutEffect(() => {
    const el = scRef.current;
    if (!el || pendingIdx.current == null) return;
    el.scrollLeft = pendingIdx.current * el.clientWidth;
    pendingIdx.current = null;
  }, [scrollerKey]);

  // Auf die Woche des gewählten Tages ausrichten: beim Sichtbarwerden, bei neuen Wochen, auf Anforderung.
  useLayoutEffect(() => {
    if (!active) return;
    jumpTo(idxOf(selRef.current));
  }, [active, count, firstMon, alignKey, idxOf]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bei Größenänderung (Drehen) an der Woche ausgerichtet bleiben.
  useEffect(() => {
    const el = scRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let lastW = el.clientWidth;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w && w !== lastW) { lastW = w; el.scrollLeft = visRef.current * w; }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollerKey]);

  // Sicherheitsnetz, falls animationend ausbleibt
  useEffect(() => {
    if (!jump) return;
    const t = setTimeout(() => setJump(null), cssMs('--dur-week', 340) + 150);
    return () => clearTimeout(t);
  }, [jump]);

  const onScroll = () => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const el = scRef.current;
      if (!el || !el.clientWidth) return;
      setVisible(Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / el.clientWidth))));
    });
  };

  const goTo = (i) => {
    const el = scRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  const atToday = selected === today && vis === count - 1;
  const onToday = () => {
    onSelect(today);
    const from = visRef.current;
    if (from === count - 1) return;
    // Egal wie weit zurück: für die Animation ist die aktuelle Woche die nächste Woche – immer genau ein Wochenschritt.
    if (!prefersReducedMotion()) setJump({ from: firstMon + from * 7, key: Date.now() });
    jumpTo(count - 1);
  };

  const pickDay = (key) => {
    if (!isValidKey(key)) return;
    const d = Math.max(firstMon, Math.min(today, keyToNum(key)));
    onSelect(d);
    jumpTo(idxOf(d));
    setPickerShown(false);
  };

  const onDateClick = (e) => {
    if (!finePointer()) return; // Touch: das Antippen öffnet den Kalender selbst
    if (!openPicker(e.currentTarget)) setPickerShown(true);
  };

  const renderDays = (mon, interactive) => [0, 1, 2, 3, 4, 5, 6].map((k) => {
    const d = mon + k;
    const isToday = d === today, isSel = d === selected, future = d > today, has = activeDays.has(d);
    const label = formatDayWithWeekday(d) + (isToday ? `, ${T.todayMark}` : '') + (has ? `, ${T.hasEntries}` : '');
    return (
      <button
        key={d} type="button" disabled={future} tabIndex={interactive ? 0 : -1}
        className={'dt-day' + (isSel ? ' is-selected' : '') + (isToday ? ' is-today' : '')}
        aria-pressed={isSel} aria-label={label}
        onClick={interactive ? () => onSelect(d) : undefined}
      >
        <span className="dt-day__wd" aria-hidden="true">{WEEKDAYS_SHORT[k]}</span>
        <span className="dt-day__num" aria-hidden="true">{numToYMD(d).d}</span>
        {has && <span className="dt-day__dot" aria-hidden="true" />}
      </button>
    );
  });

  const weeks = [];
  for (let i = 0; i < count; i++) {
    const mon = firstMon + i * 7;
    const near = Math.abs(i - vis) <= RENDER_RADIUS;
    weeks.push(
      <div className="dt-week" key={mon} role="group" aria-label={weekRangeLabel(mon)} aria-hidden={i !== vis ? 'true' : undefined}>
        {near && renderDays(mon, i === vis)}
      </div>,
    );
  }

  return (
    <section className="dt-strip" aria-label="Tag wählen">
      <div className="dt-strip__head">
        <div className={'dt-strip__monthwrap' + (pickerShown ? ' is-picking' : '')}>
          <h2 className="dt-strip__month" aria-live="polite">
            {weekRangeLabel(firstMon + vis * 7)}
            <Icon name="calendar" size={18} />
          </h2>
          <input
            ref={dateRef} type="date" className="dt-strip__date" data-testid="date-picker"
            aria-label={T.pickDate} value={numToKey(selected)} min={numToKey(firstMon)} max={numToKey(today)}
            onClick={onDateClick} onChange={(e) => pickDay(e.target.value)}
            onBlur={() => setPickerShown(false)}
          />
        </div>
        <div className="dt-strip__arrows">
          <Button variant="ghost" size="sm" icon="chevron-left" label={T.prevWeek} disabled={vis === 0} onClick={() => goTo(vis - 1)} />
          <Button variant="ghost" size="sm" icon="chevron-right" label={T.nextWeek} disabled={vis === count - 1} onClick={() => goTo(vis + 1)} />
        </div>
        <Button size="sm" onClick={onToday} disabled={atToday} className="dt-strip__today">{T.today}</Button>
      </div>
      <div className={'dt-strip__viewport' + (jump ? ' is-jumping' : '')}>
        <div key={scrollerKey} className="dt-strip__scroller" ref={scRef} onScroll={onScroll} data-testid="week-scroller">
          {weeks}
        </div>
        {jump && (
          <div className="dt-strip__jump" aria-hidden="true" data-testid="week-jump">
            <div key={jump.key} className="dt-strip__jumptrack" onAnimationEnd={() => setJump(null)}>
              <div className="dt-week">{renderDays(jump.from, false)}</div>
              <div className="dt-week">{renderDays(lastMon, false)}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
