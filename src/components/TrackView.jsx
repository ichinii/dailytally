import React from 'react';
import { AppBar, Button, Note, Rule, SaveStatus } from '../kladde/kladde.js';
import WeekStrip from './WeekStrip.jsx';
import ItemCard from './ItemCard.jsx';
import ReorderList from './ReorderList.jsx';
import { mondayOf, monthStartOf, formatDayShort, formatDayWithWeekday, formatMonthYear } from '../lib/days.js';
import { countGoalAt, pauseGoalAt, periodStart } from '../lib/goals.js';
import { periodCount } from '../lib/stats.js';
import { tintFor } from '../lib/ui.js';
import { T } from '../strings.js';

export function refLabelFor(item, selected, today) {
  if (item.period === 'month') {
    const m = monthStartOf(selected);
    return m === monthStartOf(today) ? T.refThisMonth : formatMonthYear(m);
  }
  if (item.period === 'week') {
    const m = mondayOf(selected);
    return m === mondayOf(today) ? T.refThisWeek : T.refWeekOf(formatDayShort(m));
  }
  return selected === today ? T.refToday : formatDayWithWeekday(selected);
}

export function valueFor(item, r, selected) {
  return periodCount(r, item.period, selected);
}

/** Hauptansicht: Wochenstreifen und alle Items mit ihren Werten für den gewählten Tag. */
export default function TrackView({ data, index, today, selected, onSelect, earliestDay, active, alignKey, saveState, actions }) {
  return (
    <>
      <AppBar title={T.appName} mark subtitle={T.appSubtitle} />
      <div className="kl-view">
        <WeekStrip today={today} selected={selected} onSelect={onSelect} earliestDay={earliestDay}
          activeDays={index.activeDays} active={active} alignKey={alignKey} />
        {data.items.length === 0 ? (
          <div className="kl-empty">
            <Note title={T.emptyTitle} center>{T.emptyText}</Note>
            <Button variant="primary" icon="plus" onClick={actions.onAdd}>{T.emptyAction}</Button>
          </div>
        ) : (
          <ReorderList
            className="kl-stack" ids={data.items.map((i) => i.id)} onMove={actions.onMoveItem}
            renderItem={(id) => {
              const i = data.items.findIndex((it) => it.id === id);
              const item = data.items[i];
              const r = index.byItem.get(id);
              return (
                <ItemCard
                  item={item} tint={tintFor(i)} r={r} today={today}
                  refLabel={refLabelFor(item, selected, today)}
                  value={valueFor(item, r, selected)}
                  goal={countGoalAt(item, periodStart(item.period, selected))}
                  pauseGoal={item.period === 'day' ? pauseGoalAt(item, today) : null}
                  showPause={selected === today && item.period === 'day'}
                  onPlus={actions.onPlus} onMinus={actions.onMinus}
                  onOpenEntries={actions.onOpenEntries} onEdit={actions.onEdit}
                />
              );
            }}
          />
        )}
        {data.items.length > 0 && (
          <div className="dt-add">
            <Button block icon="plus" onClick={actions.onAdd} data-testid="add-item">{T.addItem}</Button>
            <span className="kl-muted dt-small">{T.reorderHint}</span>
          </div>
        )}
        <div className="dt-foot">
          <Rule heart />
          <p className="dt-foot__text">{T.footer}</p>
          <SaveStatus state={saveState === 'error' ? 'error' : 'saved'}>{saveState === 'error' ? T.notSaved : T.saved}</SaveStatus>
        </div>
      </div>
    </>
  );
}
