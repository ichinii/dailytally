import React, { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BottomNav, Icon, Toast } from './kladde/kladde.js';
import TrackView from './components/TrackView.jsx';
import OverviewView from './components/OverviewView.jsx';
import MenuView from './components/MenuView.jsx';
import ItemSheet from './components/ItemSheet.jsx';
import EntriesSheet from './components/EntriesSheet.jsx';
import { refLabelFor } from './components/TrackView.jsx';
import { loadData, saveData, emptyData, newId, requestPersistentStorage } from './lib/storage.js';
import { buildIndex, dayNum, runningPause } from './lib/stats.js';
import { dayOfTs, numToKey, mondayOf, formatClock, formatDuration, keyToNum } from './lib/days.js';
import { periodStart, periodEnd, pauseGoalAt, applyCountGoal, applyPauseGoal, countGoalAt } from './lib/goals.js';
import { cssMs } from './lib/ui.js';
import { T } from './strings.js';

const NAV = [
  { id: 'track', label: T.nav.track, icon: 'list' },
  { id: 'overview', label: T.nav.overview, icon: 'chart' },
  { id: 'menu', label: T.nav.menu, icon: 'menu' },
];

const initial = loadData();
const MemoOverview = React.memo(OverviewView);

export default function App() {
  const [data, setData] = useState(initial.data);
  const [storageOk, setStorageOk] = useState(initial.available);
  const [saveFailed, setSaveFailed] = useState(false);
  const [today, setToday] = useState(() => dayOfTs(Date.now()));
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState('track');
  const [alignKey, setAlignKey] = useState(0);
  const [overviewReady, setOverviewReady] = useState(false);
  const [itemSheet, setItemSheet] = useState(null); // { id|null }
  const [entriesSheet, setEntriesSheet] = useState(null); // { itemId, sel, focusEntryId }
  const [toast, setToast] = useState(null);
  const [contentWidth, setContentWidth] = useState(() => Math.min(560, window.innerWidth || 390) - 32);
  const toastTimer = useRef(0);
  const frameRef = useRef(null);
  const firstSave = useRef(true);

  const index = useMemo(() => buildIndex(data), [data]);

  // ---- Speichern bei jeder Änderung ----
  useEffect(() => {
    if (firstSave.current) { firstSave.current = false; return; }
    if (!storageOk) return;
    const ok = saveData(data);
    setSaveFailed(!ok);
  }, [data, storageOk]);

  useEffect(() => { requestPersistentStorage(); }, []);

  // ---- Tageswechsel um 04:00 (alle 30 s und beim Zurückkehren prüfen) ----
  const todayRef = useRef(today);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const checkDay = useCallback(() => {
    const t = dayOfTs(Date.now());
    if (t === todayRef.current) return t;
    const wasToday = selectedRef.current === todayRef.current;
    todayRef.current = t;
    setToday(t);
    if (wasToday) { setSelected(t); setAlignKey((k) => k + 1); }
    return t;
  }, []);
  useEffect(() => {
    const id = setInterval(checkDay, 30000);
    const onVis = () => { if (!document.hidden) checkDay(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [checkDay]);

  // ---- Übersicht nach dem Start im Hintergrund vorbereiten: einmal unsichtbar auslegen,
  //      danach nur parken (content-visibility: hidden behält das Layout) statt neu aufzubauen ----
  const [overviewParked, setOverviewParked] = useState(false);
  useEffect(() => {
    const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 400));
    const id = ric(() => setOverviewReady(true));
    return () => { (window.cancelIdleCallback || clearTimeout)(id); };
  }, []);
  useEffect(() => {
    if (!overviewReady || overviewParked) return;
    let raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => setOverviewParked(true)); });
    return () => cancelAnimationFrame(raf);
  }, [overviewReady, overviewParked]);

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setContentWidth(el.clientWidth - 32));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- Toast (immer nur einer) ----
  const showToast = useCallback((text, action, icon = 'check') => {
    clearTimeout(toastTimer.current);
    setToast({ text, action, icon, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), cssMs('--dur-toast', 5000));
  }, []);
  const hideToast = useCallback(() => { clearTimeout(toastTimer.current); setToast(null); }, []);

  // ---- Aktionen ----
  const dataRef = useRef(data);
  dataRef.current = data;
  const indexRef = useRef(index);
  indexRef.current = index;

  const onPlus = useCallback((itemId) => {
    const now = Date.now();
    let sel = selectedRef.current;
    const prevToday = todayRef.current;
    const realToday = checkDay();
    if (sel === prevToday && realToday !== prevToday) sel = realToday;
    const isToday = sel === realToday;
    const item = dataRef.current.items.find((i) => i.id === itemId);
    if (!item) return;
    const entry = { id: newId('e'), itemId, day: numToKey(sel), ts: isToday ? now : null };
    let pauseText = null;
    if (isToday && item.period === 'day' && pauseGoalAt(item, sel) != null) {
      const p = runningPause(indexRef.current.byItem.get(itemId), sel, now);
      if (p.known) pauseText = T.pauseEnded(formatDuration(p.minutes));
    }
    setData((d) => ({ ...d, entries: [...d.entries, entry] }));
    if (isToday) {
      const text = [T.captured(formatClock(now)), pauseText].filter(Boolean).join(' · ');
      showToast(text, { label: T.changeTime, icon: 'clock', onClick: () => { hideToast(); setEntriesSheet({ itemId, sel, focusEntryId: entry.id }); } }, 'check');
    }
  }, [checkDay, showToast, hideToast]);

  const onMinus = useCallback((itemId) => {
    const sel = selectedRef.current;
    setData((d) => {
      const item = d.items.find((i) => i.id === itemId);
      if (!item) return d;
      const key = numToKey(sel);
      let idx = -1;
      for (let i = d.entries.length - 1; i >= 0; i--) {
        const e = d.entries[i];
        if (e.itemId === itemId && e.day === key) { idx = i; break; }
      }
      if (idx < 0 && item.period !== 'day') {
        // Wochen-/Monats-Item ohne Eintrag am gewählten Tag: zuletzt angelegter Eintrag des Zeitraums
        const a = periodStart(item.period, sel), b = periodEnd(item.period, sel);
        for (let i = d.entries.length - 1; i >= 0; i--) {
          const e = d.entries[i];
          if (e.itemId !== itemId) continue;
          const n = dayNum(e.day);
          if (n >= a && n < b) { idx = i; break; }
        }
      }
      if (idx < 0) return d;
      const entries = d.entries.slice();
      entries.splice(idx, 1);
      return { ...d, entries };
    });
  }, []);

  const onDeleteEntry = useCallback((entryId) => {
    const d = dataRef.current;
    const idx = d.entries.findIndex((e) => e.id === entryId);
    if (idx < 0) return;
    const entry = d.entries[idx];
    setData((dd) => ({ ...dd, entries: dd.entries.filter((e) => e.id !== entryId) }));
    showToast(T.entryDeleted, {
      label: T.undo, icon: 'undo',
      onClick: () => {
        hideToast();
        setData((dd) => {
          if (!dd.items.some((i) => i.id === entry.itemId) || dd.entries.some((e) => e.id === entry.id)) return dd;
          const entries = dd.entries.slice();
          entries.splice(Math.min(idx, entries.length), 0, entry);
          return { ...dd, entries };
        });
      },
    }, 'trash');
  }, [showToast, hideToast]);

  const onSetTime = useCallback((entryId, ts) => {
    setData((d) => ({ ...d, entries: d.entries.map((e) => (e.id === entryId ? { ...e, ts } : e)) }));
  }, []);

  const onCreate = useCallback(({ label, period, countGoal, pauseMinutes }) => {
    const t = checkDay();
    const from = numToKey(periodStart(period, t));
    const item = {
      id: newId('i'), label, period, createdDay: numToKey(t),
      countGoals: countGoal ? [{ from, type: countGoal.type, value: countGoal.value }] : [],
      pauseGoals: period === 'day' && pauseMinutes != null ? [{ from, minutes: pauseMinutes }] : [],
    };
    setData((d) => ({ ...d, items: [...d.items, item] }));
  }, [checkDay]);

  const onUpdate = useCallback((id, { label, countGoal, pauseMinutes, mode }) => {
    const t = checkDay();
    setData((d) => ({
      ...d,
      items: d.items.map((it) => {
        if (it.id !== id) return it;
        const next = { ...it, label };
        if (mode) {
          const cur = periodStart(it.period, t);
          const r = indexRef.current.byItem.get(id);
          const first = Math.min(keyToNum(it.createdDay), r ? r.first : Infinity);
          const createdStart = periodStart(it.period, first);
          const cg = countGoalAt(it, cur);
          const sameCount = (cg == null && countGoal == null) || (cg && countGoal && cg.type === countGoal.type && cg.value === countGoal.value);
          if (!sameCount) next.countGoals = applyCountGoal(it.countGoals, mode, cur, createdStart, countGoal);
          if (it.period === 'day' && (pauseGoalAt(it, t) ?? null) !== (pauseMinutes ?? null)) {
            next.pauseGoals = applyPauseGoal(it.pauseGoals, mode, t, createdStart, pauseMinutes);
          }
        }
        return next;
      }),
    }));
  }, [checkDay]);

  const onDeleteItem = useCallback((id) => {
    const item = dataRef.current.items.find((i) => i.id === id);
    setData((d) => ({ ...d, items: d.items.filter((i) => i.id !== id), entries: d.entries.filter((e) => e.itemId !== id) }));
    if (item) showToast(T.itemDeleted(item.label), null, 'trash');
  }, [showToast]);

  const onReplaceAll = useCallback((next) => {
    setData(next);
    const t = checkDay();
    setSelected(t);
    setAlignKey((k) => k + 1);
    showToast(T.imported);
  }, [checkDay, showToast]);

  const onDeleteAll = useCallback(() => {
    setData(emptyData());
    showToast(T.allDeleted, null, 'trash');
  }, [showToast]);

  const onSelect = useCallback((d) => { if (d <= todayRef.current) setSelected(d); }, []);

  const onMoveItem = useCallback((id, toIndex) => {
    setData((d) => {
      const from = d.items.findIndex((i) => i.id === id);
      if (from < 0 || from === toIndex) return d;
      const items = d.items.slice();
      const [it] = items.splice(from, 1);
      items.splice(toIndex, 0, it);
      return { ...d, items };
    });
  }, []);

  const actions = useMemo(() => ({
    onPlus, onMinus, onMoveItem,
    onOpenEntries: (itemId) => setEntriesSheet({ itemId, sel: selectedRef.current, focusEntryId: null }),
    onEdit: (itemId) => setItemSheet({ id: itemId }),
    onAdd: () => setItemSheet({ id: null }),
  }), [onPlus, onMinus, onMoveItem]);

  const earliestDay = useMemo(() => {
    let e = today;
    for (const it of data.items) { const c = keyToNum(it.createdDay); if (c < e) e = c; }
    for (const r of index.byItem.values()) if (r.first < e) e = r.first;
    return e;
  }, [data.items, index, today]);

  const changeView = (v) => {
    if (v === 'overview') setOverviewReady(true);
    setView(v);
    window.scrollTo(0, 0);
  };

  // Übersicht mit verzögerten Daten: Tippen in der Track-Ansicht bleibt flüssig.
  const deferredData = useDeferredValue(data);
  const deferredIndex = useMemo(() => (deferredData === data ? index : buildIndex(deferredData)), [deferredData, data, index]);

  // ---- Eintragsliste ----
  let entriesProps = null;
  if (entriesSheet) {
    const item = data.items.find((i) => i.id === entriesSheet.itemId);
    if (item) {
      const sel = entriesSheet.sel;
      const days = [];
      for (let d = periodStart(item.period, sel), e = Math.min(periodEnd(item.period, sel), today + 1); d < e; d++) days.push(d);
      const keys = new Set(days.map(numToKey));
      entriesProps = {
        item, days, subtitle: refLabelFor(item, sel, today),
        entries: data.entries.filter((e) => e.itemId === item.id && keys.has(e.day)),
      };
    }
  }
  const lastEdit = useRef(null);
  const foundEdit = itemSheet && itemSheet.id ? data.items.find((i) => i.id === itemSheet.id) : null;
  if (foundEdit) lastEdit.current = foundEdit;
  const editItem = itemSheet && itemSheet.id ? foundEdit || (lastEdit.current && lastEdit.current.id === itemSheet.id ? lastEdit.current : null) : null;
  const overviewNow = useMemo(() => Date.now(), [deferredData, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const saveState = !storageOk || saveFailed ? 'error' : 'saved';

  return (
    <div className="kl-app" ref={frameRef}>
      {saveState === 'error' && (
        <div className="dt-banner dt-banner--top" role="alert" data-testid="storage-banner">
          <Icon name="alert" size={20} />
          <span><strong>{T.storageTitle}.</strong> {storageOk ? T.storageFull : T.storageText}</span>
        </div>
      )}
      <main>
        <section hidden={view !== 'track'} data-view="track">
          <TrackView data={data} index={index} today={today} selected={selected} onSelect={onSelect}
            earliestDay={earliestDay} active={view === 'track'} alignKey={alignKey} saveState={saveState} actions={actions} />
        </section>
        <section data-view="overview" aria-hidden={view !== 'overview' ? 'true' : undefined}
          className={view === 'overview' ? 'dt-pane' : overviewParked ? 'dt-pane dt-pane--parked' : 'dt-pane dt-pane--prep'}>
          {overviewReady && (
            <MemoOverview data={deferredData} index={deferredIndex} today={today} now={overviewNow} contentWidth={contentWidth} />
          )}
        </section>
        <section hidden={view !== 'menu'} data-view="menu">
          <MenuView data={data} today={today} saveState={saveState} onReplaceAll={onReplaceAll} onDeleteAll={onDeleteAll} onToast={(t) => showToast(t)} />
        </section>
      </main>

      <BottomNav fixed items={NAV} value={view} onChange={changeView} label={T.nav.label} />

      {toast && (
        <Toast key={toast.key} fixed icon={toast.icon} action={toast.action} onClose={hideToast}>{toast.text}</Toast>
      )}

      {itemSheet && (itemSheet.id == null || editItem) && (
        <ItemSheet
          key={itemSheet.id || 'new'} item={editItem} today={today}
          entryCount={editItem ? (index.byItem.get(editItem.id) || { n: 0 }).n : 0}
          onCreate={onCreate} onUpdate={onUpdate} onDelete={onDeleteItem}
          onClosed={() => setItemSheet(null)}
        />
      )}
      {entriesProps && (
        <EntriesSheet
          key={entriesSheet.itemId} {...entriesProps} focusEntryId={entriesSheet.focusEntryId}
          onDelete={onDeleteEntry} onSetTime={onSetTime} onClosed={() => setEntriesSheet(null)}
        />
      )}
    </div>
  );
}
