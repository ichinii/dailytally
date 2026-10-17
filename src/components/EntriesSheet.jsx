import React, { useEffect, useRef, useState } from 'react';
import { Button, Icon } from '../kladde/kladde.js';
import DragSheet from './DragSheet.jsx';
import { clockInputValue, formatClock, formatDayWithWeekday, tsForDayTime } from '../lib/days.js';
import { dayNum } from '../lib/stats.js';
import { finePointer, openPicker } from '../lib/picker.js';
import { T } from '../strings.js';

/**
 * Die Uhrzeit-Anzeige ist selbst der Knopf: darüber liegt ein unsichtbares Uhrzeit-Feld,
 * das die Zeitauswahl des Systems öffnet. Eine gewählte Uhrzeit wird sofort übernommen.
 */
function EntryRow({ entry, autoOpen, onSave, onDelete }) {
  const [err, setErr] = useState('');
  const [shown, setShown] = useState(false); // Rückfall, wenn sich die Auswahl nicht per Code öffnen lässt
  const inputRef = useRef(null);
  const value = entry.ts != null ? clockInputValue(entry.ts) : '';

  useEffect(() => {
    if (!autoOpen) return;
    const el = inputRef.current;
    if (!openPicker(el)) { setShown(true); el.focus(); }
  }, [autoOpen]);

  const commit = (v) => {
    // „Löschen“ im Zeitwähler liefert eine leere Uhrzeit → Eintrag wird „ohne Uhrzeit“
    if (v === '') { setErr(''); if (entry.ts != null) onSave(entry.id, null); return; }
    if (!/^\d{1,2}:\d{2}$/.test(v)) return;
    const ts = tsForDayTime(dayNum(entry.day), v);
    if (ts > Date.now()) { setErr(T.timeFuture); return; }
    setErr('');
    if (ts !== entry.ts) onSave(entry.id, ts);
  };

  const label = (entry.ts != null ? T.editTime : T.setTime) + (entry.ts != null ? `, ${formatClock(entry.ts)}` : '');

  return (
    <li className="dt-entry" data-testid="entry">
      <div className="kl-row dt-entry__row">
        <span className="kl-row__lead" aria-hidden="true"><Icon name="clock" size={20} /></span>
        <span className="kl-row__text">
          <span className={'dt-timebtn' + (shown ? ' is-shown' : '') + (entry.ts == null ? ' is-empty' : '')}>
            <span className="dt-timebtn__text" aria-hidden="true">{entry.ts != null ? formatClock(entry.ts) : T.noTime}</span>
            <Icon name="edit" size={16} />
            <input
              ref={inputRef} type="time" className="dt-timebtn__input" data-testid="time-input"
              id={`dt-time-${entry.id}`} aria-label={label} value={value}
              aria-invalid={err ? 'true' : undefined}
              onClick={(e) => { if (finePointer() && !openPicker(e.currentTarget)) setShown(true); }}
              onChange={(e) => commit(e.target.value)}
              onBlur={() => setShown(false)}
            />
          </span>
        </span>
        <span className="kl-row__trail">
          <Button variant="ghost" size="sm" icon="trash" label={T.deleteEntry} onClick={() => onDelete(entry.id)} />
        </span>
      </div>
      {err && <span className="kl-field__error dt-entry__err" role="alert"><Icon name="alert" size={16} />{err}</span>}
    </li>
  );
}

/** Einträge des Zeitraums (bei Wochen-Items nach Tagen gruppiert): Uhrzeit setzen/ändern, löschen. */
export default function EntriesSheet({ item, subtitle, days, entries, focusEntryId, onDelete, onSetTime, onClosed }) {
  const [openId, setOpenId] = useState(null);
  const groups = days
    .map((d) => ({ d, list: entries.filter((e) => dayNum(e.day) === d).sort((a, b) => (a.ts ?? Infinity) - (b.ts ?? Infinity)) }))
    .filter((g) => g.list.length > 0);
  const grouped = days.length > 1;

  return (
    <DragSheet title={item.label} onClosed={onClosed} className="dt-sheet--entries"
      onEntered={() => { if (focusEntryId) setOpenId(focusEntryId); }}
      headEnd={<span className="kl-muted dt-small dt-sheet__sub">{subtitle}</span>}>
      {() => (
        groups.length === 0
          ? <p className="kl-muted">{T.noEntries}</p>
          : groups.map((g) => (
            <section key={g.d} className="dt-entries">
              {grouped && <h3 className="dt-entries__day">{formatDayWithWeekday(g.d)}</h3>}
              <ul className="kl-list">
                {g.list.map((e) => (
                  <EntryRow key={e.id} entry={e} autoOpen={openId === e.id} onSave={onSetTime} onDelete={onDelete} />
                ))}
              </ul>
            </section>
          ))
      )}
    </DragSheet>
  );
}
