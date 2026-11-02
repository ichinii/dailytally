import React, { useRef, useState } from 'react';
import { Button, Icon, Tabs, Tag } from '../kladde/kladde.js';
import DragSheet from './DragSheet.jsx';
import { countGoalAt, gapGoalAt, pauseGoalAt, periodStart, countGoalChanged, gapGoalChanged, pauseGoalChanged, PERIODS } from '../lib/goals.js';
import { formatDayShort, formatDuration, keyToNum, numToKey } from '../lib/days.js';
import { isPausedDay, openPause } from '../lib/pauses.js';
import { T } from '../strings.js';

const parseIntStrict = (s) => (/^\s*\d+\s*$/.test(s) ? parseInt(s, 10) : NaN);

/** Kurzfassung des Aussetz-Zustands für die Kopfzeile des Abschnitts. */
function offState(item, today) {
  const open = openPause(item);
  if (open) return T.offSince(formatDayShort(keyToNum(open.from)));
  const cur = (item.pauses || []).find((p) => p.to !== null && keyToNum(p.from) <= today && today <= keyToNum(p.to));
  if (cur) return T.offUntil(formatDayShort(keyToNum(cur.to)));
  return T.offSectionOff;
}

function historyText(item) {
  const c = item.countGoals.map((g) => `${T.historyFrom(formatDayShort(keyToNum(g.from)))}: ${g.value == null ? T.historyNone : `${g.type === 'max' ? T.goalMax : T.goalMin} ${g.value}`}`);
  const mins = (list) => list.map((g) => `${T.historyFrom(formatDayShort(keyToNum(g.from)))}: ${g.minutes == null ? T.historyNone : formatDuration(g.minutes)}`).join(' · ');
  return { c: c.join(' · '), p: mins(item.pauseGoals), g: mins(item.gapGoals) };
}

/** Anlegen und Bearbeiten eines Items im selben Eingabe-Sheet. */
export default function ItemSheet({ item, entryCount, today, onCreate, onUpdate, onDelete, onPause, onResume, onClosed }) {
  const editing = !!item;
  const curStart = item ? periodStart(item.period, today) : today;
  const initGoal = item ? countGoalAt(item, curStart) : null;
  const initPause = item && item.period === 'day' ? pauseGoalAt(item, today) : null;
  const initGap = item ? gapGoalAt(item, curStart) : null;

  const [name, setName] = useState(item ? item.label : '');
  const [period, setPeriod] = useState(item ? item.period : 'day');
  const [goalType, setGoalType] = useState(initGoal ? initGoal.type : 'none');
  // Richtung folgt dem Zieltyp; ohne Ziel wird sie gewählt.
  const [direction, setDirection] = useState(item ? item.direction : 'up');
  const [goalValue, setGoalValue] = useState(initGoal ? String(initGoal.value) : '');
  const [pauseOn, setPauseOn] = useState(initPause != null);
  const [pauseH, setPauseH] = useState(initPause != null ? String(Math.floor(initPause / 60)) : '12');
  const [pauseM, setPauseM] = useState(initPause != null ? String(initPause % 60) : '0');
  const [gapOn, setGapOn] = useState(initGap != null);
  const [gapH, setGapH] = useState(initGap != null ? String(Math.floor(initGap / 60)) : '1');
  const [gapM, setGapM] = useState(initGap != null ? String(initGap % 60) : '0');
  // Zugeklappt, solange nichts gesetzt ist: so bleiben die Tippfelder oben über der Tastatur.
  const [foldOpen, setFoldOpen] = useState(initPause != null || initGap != null);
  const pausedNow = !!item && isPausedDay(item, today);
  const [offOpen, setOffOpen] = useState(pausedNow);
  const [until, setUntil] = useState('');
  const [tried, setTried] = useState(false);
  const [asking, setAsking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nameRef = useRef(null);
  const askRef = useRef(null);

  const trimmed = name.trim();
  const gv = parseIntStrict(goalValue);
  const goalOk = goalType === 'none' || (Number.isInteger(gv) && gv >= 1);
  const ph = parseIntStrict(pauseH || '0'), pm = parseIntStrict(pauseM || '0');
  const pauseMinutes = Number.isInteger(ph) && Number.isInteger(pm) && pm <= 59 ? ph * 60 + pm : NaN;
  const pauseOk = !pauseOn || period !== 'day' || pauseMinutes > 0;
  const gh = parseIntStrict(gapH || '0'), gm = parseIntStrict(gapM || '0');
  const gapRaw = Number.isInteger(gh) && Number.isInteger(gm) && gm <= 59 ? gh * 60 + gm : NaN;
  const gapOk = !gapOn || gapRaw > 0;
  const nextGap = gapOn ? gapRaw : null;
  const nextGoal = goalType === 'none' ? null : { type: goalType, value: gv };
  const nextPause = period === 'day' && pauseOn ? pauseMinutes : null;

  const save = (close, mode) => {
    if (!trimmed) return;
    setTried(true);
    if (!goalOk || !pauseOk || !gapOk) return;
    if ((pauseOn || gapOn) && !foldOpen) setFoldOpen(true);
    if (!editing) {
      onCreate({ label: trimmed.slice(0, 40), period, direction, countGoal: nextGoal, pauseMinutes: nextPause, gapMinutes: nextGap });
      close();
      return;
    }
    const changed = countGoalChanged(item, curStart, nextGoal)
      || (item.period === 'day' && pauseGoalChanged(item, today, nextPause))
      || gapGoalChanged(item, curStart, nextGap);
    if (changed && !mode) {
      setAsking(true);
      setTimeout(() => askRef.current && askRef.current.focus(), 0);
      return;
    }
    onUpdate(item.id, { label: trimmed.slice(0, 40), direction, countGoal: nextGoal, pauseMinutes: nextPause, gapMinutes: nextGap, mode: changed ? mode : null });
    close();
  };

  const onEnter = (close) => (e) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); save(close, asking ? 'now' : undefined); }
  };

  const hist = editing ? historyText(item) : null;

  return (
    <DragSheet
      tall
      title={editing ? T.editTitle : T.newItem}
      onClosed={onClosed}
      onEntered={() => { if (!editing && nameRef.current) nameRef.current.focus({ preventScroll: true }); }}
    >
      {(close) => (
        <>
          <div className="dt-sheet__actions">
            <Button onClick={close}>{T.cancel}</Button>
            <Button variant="primary" disabled={!trimmed || asking} onClick={() => save(close)} data-testid="save">{T.save}</Button>
          </div>

          {asking && (
            <div className="dt-ask" role="group" aria-label={T.goalChangedTitle}>
              <strong className="dt-ask__title">{T.goalChangedTitle}</strong>
              <span className="kl-muted dt-small">{T.goalChangedText}</span>
              <div className="dt-ask__buttons">
                <button ref={askRef} type="button" className="kl-btn kl-btn--primary" onClick={() => save(close, 'now')}>{T.fromNow}</button>
                <Button onClick={() => save(close, 'fix')}>{T.fixAll}</Button>
              </div>
            </div>
          )}

          <div className="kl-field">
            <label className="kl-field__label" htmlFor="dt-name">{T.name}</label>
            <input
              id="dt-name" ref={nameRef} className="kl-input" value={name} maxLength={40} autoComplete="off"
              placeholder={T.namePlaceholder} enterKeyHint="done" aria-describedby={name.length >= 30 ? 'dt-name-hint' : undefined}
              onChange={(e) => setName(e.target.value)} onKeyDown={onEnter(close)}
            />
            {name.length >= 30 && <span className="kl-field__hint" id="dt-name-hint">{T.nameHint(name.length)}</span>}
          </div>

          <div className="dt-row-field">
            <span className="kl-field__label" id="dt-period-label">{T.period}</span>
            {editing
              ? <Tag tint="sky" icon="calendar">{T.periodTab[item.period]}</Tag>
              : <Tabs label={T.period} value={period} onChange={setPeriod} items={PERIODS.map((id) => ({ id, label: T.periodTab[id] }))} />}
          </div>
          {editing && <span className="kl-field__hint dt-tight">{T.periodFixed}</span>}

          <div className="kl-field">
            <span className="kl-field__label" id="dt-goal-label">{T.countGoal}</span>
            <div className="dt-goal-row">
              <Tabs label={T.countGoal} value={goalType}
                onChange={(v) => {
                  setGoalType(v);
                  if (v !== 'none' && !goalValue) setGoalValue(v === 'max' ? '10' : '3');
                  // Ein Höchstwert heißt „weniger ist besser“, ein Mindestwert das Gegenteil.
                  if (v === 'max') setDirection('down');
                  if (v === 'min') setDirection('up');
                }}
                items={[{ id: 'none', label: T.goalNone }, { id: 'max', label: T.goalMax }, { id: 'min', label: T.goalMin }]} />
              {goalType !== 'none' && (
                <input
                  id="dt-goal-value" className="kl-input dt-num" inputMode="numeric" value={goalValue} aria-label={T.goalValueLabel}
                  aria-invalid={tried && !goalOk ? 'true' : undefined} enterKeyHint="done"
                  onChange={(e) => setGoalValue(e.target.value.replace(/[^\d]/g, '').slice(0, 5))} onKeyDown={onEnter(close)}
                />
              )}
            </div>
            {tried && !goalOk && <span className="kl-field__error">{T.goalError}</span>}
            {goalType !== 'none' && <span className="kl-field__hint dt-tight">{T.dirFromGoal(goalType === 'max' ? T.dirLess : T.dirMore)}</span>}
          </div>


          <div className="dt-fold">
            <button
              type="button" className="dt-fold__head" aria-expanded={foldOpen}
              onClick={() => setFoldOpen((o) => !o)}
            >
              <span className="kl-field__label">{T.pauseSection}</span>
              <span className="kl-muted dt-small">
                {pauseOn || gapOn
                  ? T.pauseSectionOn([
                    ...(pauseOn && period === 'day' ? [`${T.pauseGoalShort} ${formatDuration(pauseMinutes || 0)}`] : []),
                    ...(gapOn ? [`${T.gapGoalShort} ${formatDuration(gapRaw || 0)}`] : []),
                  ])
                  : T.pauseSectionOff}
              </span>
              <Icon name="chevron-down" size={18} />
            </button>

            {foldOpen && (
              <>
                {period === 'day' && (
                  <div className="kl-field">
                    <div className="dt-pause-row">
                      <span className="kl-field__label dt-pause-label">{T.pauseGoalLabel}</span>
                      <label className="kl-toggle dt-toggle-only">
                        <span className="dt-sr">{T.pauseToggle}</span>
                        <input type="checkbox" role="switch" checked={pauseOn} onChange={(e) => setPauseOn(e.target.checked)} id="dt-pause-on" />
                        <span className="kl-toggle__track" aria-hidden="true" />
                      </label>
                      {pauseOn && (
                        <>
                          <input id="dt-pause-h" className="kl-input dt-num" inputMode="numeric" value={pauseH} aria-label={T.hoursLabel}
                            aria-invalid={tried && !pauseOk ? 'true' : undefined} enterKeyHint="done"
                            onChange={(e) => setPauseH(e.target.value.replace(/[^\d]/g, '').slice(0, 3))} onKeyDown={onEnter(close)} />
                          <span>{T.hours}</span>
                          <input id="dt-pause-m" className="kl-input dt-num" inputMode="numeric" value={pauseM} aria-label={T.minutesLabel}
                            aria-invalid={tried && !pauseOk ? 'true' : undefined} enterKeyHint="done"
                            onChange={(e) => setPauseM(e.target.value.replace(/[^\d]/g, '').slice(0, 2))} onKeyDown={onEnter(close)} />
                          <span>{T.minutes}</span>
                        </>
                      )}
                      {!pauseOn && <span className="kl-muted dt-small dt-pause-hint">{T.pauseHint}</span>}
                    </div>
                    {tried && !pauseOk && <span className="kl-field__error">{T.pauseError}</span>}
                  </div>
                )}

                <div className="kl-field">
                  <div className="dt-pause-row">
                    <span className="kl-field__label dt-pause-label">{T.gapGoalLabel}</span>
                    <label className="kl-toggle dt-toggle-only">
                      <span className="dt-sr">{T.gapToggle}</span>
                      <input type="checkbox" role="switch" checked={gapOn} onChange={(e) => setGapOn(e.target.checked)} id="dt-gap-on" />
                      <span className="kl-toggle__track" aria-hidden="true" />
                    </label>
                    {gapOn && (
                      <>
                        <input id="dt-gap-h" className="kl-input dt-num" inputMode="numeric" value={gapH} aria-label={T.hoursLabel}
                          aria-invalid={tried && !gapOk ? 'true' : undefined} enterKeyHint="done"
                          onChange={(e) => setGapH(e.target.value.replace(/[^\d]/g, '').slice(0, 3))} onKeyDown={onEnter(close)} />
                        <span>{T.hours}</span>
                        <input id="dt-gap-m" className="kl-input dt-num" inputMode="numeric" value={gapM} aria-label={T.minutesLabel}
                          aria-invalid={tried && !gapOk ? 'true' : undefined} enterKeyHint="done"
                          onChange={(e) => setGapM(e.target.value.replace(/[^\d]/g, '').slice(0, 2))} onKeyDown={onEnter(close)} />
                        <span>{T.minutes}</span>
                      </>
                    )}
                    {!gapOn && <span className="kl-muted dt-small dt-pause-hint">{T.gapHint}</span>}
                  </div>
                  {tried && !gapOk && <span className="kl-field__error">{T.gapError}</span>}
                </div>
              </>
            )}
          </div>

          {/* Ohne Ziel ist die Richtung nicht ableitbar – dann wird sie gefragt. */}
          {goalType === 'none' && (
            <div className="dt-row-field">
              <span className="kl-field__label" id="dt-dir-label">{T.direction}</span>
              <Tabs label={T.direction} value={direction} onChange={setDirection}
                items={[{ id: 'up', label: T.dirMore }, { id: 'down', label: T.dirLess }]} />
            </div>
          )}
          {goalType === 'none' && <span className="kl-field__hint dt-tight">{T.dirHint}</span>}

          {editing && (
            <div className="dt-fold">
              <button type="button" className="dt-fold__head" aria-expanded={offOpen} onClick={() => setOffOpen((o) => !o)}>
                <span className="kl-field__label">{T.offSection}</span>
                <span className="kl-muted dt-small">{offState(item, today)}</span>
                <Icon name="chevron-down" size={18} />
              </button>
              {offOpen && (
                <div className="dt-off-actions">
                  <span className="kl-field__hint dt-tight">{T.offHint}</span>
                  {pausedNow
                    ? <Button icon="undo" onClick={() => { onResume(item.id); close(); }} data-testid="off-resume">{T.offResume}</Button>
                    : (
                      <>
                        <Button icon="moon" onClick={() => { onPause(item.id, { kind: 'day' }); close(); }} data-testid="off-today">{T.offToday}</Button>
                        <Button icon="moon" onClick={() => { onPause(item.id, { kind: 'open' }); close(); }} data-testid="off-open">{T.offOpen}</Button>
                        <div className="dt-row-field">
                          <label className="kl-field__label" htmlFor="dt-off-until">{T.offUntilLabel}</label>
                          <input
                            id="dt-off-until" className="kl-input dt-date" type="date" value={until}
                            min={numToKey(today)} onChange={(e) => setUntil(e.target.value)}
                          />
                          <Button
                            icon="moon" disabled={!until}
                            onClick={() => { onPause(item.id, { kind: 'until', until }); close(); }} data-testid="off-until"
                          >{T.offUntilAction}</Button>
                        </div>
                      </>
                    )}
                  {item.pauses.length > 0 && (
                    <span className="dt-small kl-muted">
                      {T.offHistory}: {item.pauses.map((p) => (p.to === null
                        ? T.offRangeOpen(formatDayShort(keyToNum(p.from)))
                        : T.offRange(formatDayShort(keyToNum(p.from)), formatDayShort(keyToNum(p.to))))).join(' · ')}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {editing && (hist.c || hist.p || hist.g) && (
            <div className="dt-history">
              <span className="kl-field__label">{T.history}</span>
              {hist.c && <span className="dt-small">{T.countGoal}: {hist.c}</span>}
              {hist.p && <span className="dt-small">{T.pauseGoalLabel}: {hist.p}</span>}
              {hist.g && <span className="dt-small">{T.gapGoalLabel}: {hist.g}</span>}
            </div>
          )}

          {editing && (
            <div className="dt-danger-zone">
              {!confirmDelete
                ? <Button variant="danger" icon="trash" onClick={() => setConfirmDelete(true)}>{T.deleteItem}</Button>
                : (
                  <div className="dt-confirm" role="alert">
                    <span>{T.deleteConfirmText(item.label, entryCount)}</span>
                    <div className="dt-ask__buttons">
                      <Button onClick={() => setConfirmDelete(false)}>{T.keep}</Button>
                      <Button variant="danger" icon="trash" onClick={() => { onDelete(item.id); close(); }}>{T.deleteConfirm}</Button>
                    </div>
                  </div>
                )}
            </div>
          )}
        </>
      )}
    </DragSheet>
  );
}
