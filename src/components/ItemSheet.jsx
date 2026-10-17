import React, { useRef, useState } from 'react';
import { Button, Tabs, Tag } from '../kladde/kladde.js';
import DragSheet from './DragSheet.jsx';
import { countGoalAt, pauseGoalAt, periodStart, countGoalChanged, pauseGoalChanged, PERIODS } from '../lib/goals.js';
import { formatDayShort, formatDuration, keyToNum } from '../lib/days.js';
import { T } from '../strings.js';

const parseIntStrict = (s) => (/^\s*\d+\s*$/.test(s) ? parseInt(s, 10) : NaN);

function historyText(item) {
  const c = item.countGoals.map((g) => `${T.historyFrom(formatDayShort(keyToNum(g.from)))}: ${g.value == null ? T.historyNone : `${g.type === 'max' ? T.goalMax : T.goalMin} ${g.value}`}`);
  const p = item.pauseGoals.map((g) => `${T.historyFrom(formatDayShort(keyToNum(g.from)))}: ${g.minutes == null ? T.historyNone : formatDuration(g.minutes)}`);
  return { c: c.join(' · '), p: p.join(' · ') };
}

/** Anlegen und Bearbeiten eines Items im selben Eingabe-Sheet. */
export default function ItemSheet({ item, entryCount, today, onCreate, onUpdate, onDelete, onClosed }) {
  const editing = !!item;
  const curStart = item ? periodStart(item.period, today) : today;
  const initGoal = item ? countGoalAt(item, curStart) : null;
  const initPause = item && item.period === 'day' ? pauseGoalAt(item, today) : null;

  const [name, setName] = useState(item ? item.label : '');
  const [period, setPeriod] = useState(item ? item.period : 'day');
  const [goalType, setGoalType] = useState(initGoal ? initGoal.type : 'none');
  const [goalValue, setGoalValue] = useState(initGoal ? String(initGoal.value) : '');
  const [pauseOn, setPauseOn] = useState(initPause != null);
  const [pauseH, setPauseH] = useState(initPause != null ? String(Math.floor(initPause / 60)) : '12');
  const [pauseM, setPauseM] = useState(initPause != null ? String(initPause % 60) : '0');
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
  const nextGoal = goalType === 'none' ? null : { type: goalType, value: gv };
  const nextPause = period === 'day' && pauseOn ? pauseMinutes : null;

  const save = (close, mode) => {
    if (!trimmed) return;
    setTried(true);
    if (!goalOk || !pauseOk) return;
    if (!editing) {
      onCreate({ label: trimmed.slice(0, 40), period, countGoal: nextGoal, pauseMinutes: nextPause });
      close();
      return;
    }
    const changed = countGoalChanged(item, curStart, nextGoal) || (item.period === 'day' && pauseGoalChanged(item, today, nextPause));
    if (changed && !mode) {
      setAsking(true);
      setTimeout(() => askRef.current && askRef.current.focus(), 0);
      return;
    }
    onUpdate(item.id, { label: trimmed.slice(0, 40), countGoal: nextGoal, pauseMinutes: nextPause, mode: changed ? mode : null });
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
              <Tabs label={T.countGoal} value={goalType} onChange={(v) => { setGoalType(v); if (v !== 'none' && !goalValue) setGoalValue(v === 'max' ? '10' : '3'); }}
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
          </div>

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

          {editing && (hist.c || hist.p) && (
            <div className="dt-history">
              <span className="kl-field__label">{T.history}</span>
              {hist.c && <span className="dt-small">{T.countGoal}: {hist.c}</span>}
              {hist.p && <span className="dt-small">{T.pauseGoalLabel}: {hist.p}</span>}
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
