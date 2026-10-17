import React, { memo, useEffect, useRef, useState } from 'react';
import { Button, Card, Icon, Mark, Tag } from '../kladde/kladde.js';
import Bar from './Bar.jsx';
import { evaluate } from '../lib/goals.js';
import { formatDuration } from '../lib/days.js';
import { runningPause } from '../lib/stats.js';
import { useNow } from '../lib/ui.js';
import { T } from '../strings.js';

function GoalStatus({ goal, value }) {
  const ev = evaluate(goal, value);
  if (ev.state === 'within') return <Tag tone="success">{T.stWithin}</Tag>;
  if (ev.state === 'over') return <Tag tone="danger">{T.stOver(ev.diff)}</Tag>;
  if (ev.state === 'open') return <Tag tint="butter" icon="clock">{T.stOpen(ev.diff)}</Tag>;
  if (ev.state === 'reached') return <Tag tone="success">{ev.bonus ? T.stBonus(ev.bonus) : T.stReached}</Tag>;
  return null;
}

function PauseRow({ r, today, goalMinutes, label, tint }) {
  const now = useNow(20000); // mindestens jede Minute
  const p = runningPause(r, today, now);
  if (!p.known) {
    return (
      <div className="dt-pause" data-testid="pause">
        <div className="dt-pause__line">
          <span className="dt-pause__text"><Icon name="clock" size={18} /> {T.pauseUnknown}</span>
          <span className="kl-muted dt-small">{T.pauseGoal(formatDuration(goalMinutes))}</span>
        </div>
        <span className="kl-muted dt-small">{p.reason === 'untimed' ? T.pauseUnknownWhy : T.pauseNoEntries}</span>
      </div>
    );
  }
  const reached = p.minutes >= goalMinutes;
  return (
    <div className="dt-pause" data-testid="pause">
      <div className="dt-pause__line">
        <span className="dt-pause__text"><Icon name="clock" size={18} /> {T.pauseSince(formatDuration(p.minutes))}</span>
        {reached ? <Tag tone="success">{T.pauseReached}</Tag> : <span className="kl-muted dt-small">{T.pauseGoal(formatDuration(goalMinutes))}</span>}
      </div>
      <Bar value={p.minutes} max={goalMinutes} label={T.pauseProgressLabel(label)} tint={tint} />
    </div>
  );
}

function ItemCard({ item, tint, refLabel, value, goal, pauseGoal, showPause, r, today, onPlus, onMinus, onOpenEntries, onEdit }) {
  const [bump, setBump] = useState(0);
  const prev = useRef(value);
  useEffect(() => { if (prev.current !== value) { prev.current = value; setBump((b) => b + 1); } }, [value]);

  return (
    <Card tint={tint} className="dt-item" as="article">
      <div className="dt-item__top">
        <div className="dt-item__titles">
          <Mark tint={tint} className="dt-item__ref">{refLabel}</Mark>
          <button type="button" className="dt-item__name" onClick={() => onEdit(item.id)} aria-label={T.editItem(item.label)}>
            <span>{item.label}</span>
            <Icon name="edit" size={16} />
          </button>
        </div>
        <div className="dt-counter">
          <Button icon="minus" label={T.minus} onClick={() => onMinus(item.id)} disabled={value === 0} />
          <button type="button" className="dt-counter__value" onClick={() => onOpenEntries(item.id)} aria-label={T.entriesOpen(value)}>
            <output key={bump} className={'dt-counter__num' + (bump ? ' kl-counter__value--bump' : '')} data-testid="value">{value}</output>
            <span className="dt-counter__lbl">{T.entriesWord(value)}</span>
          </button>
          <Button variant="primary" icon="plus" label={T.plus} onClick={() => onPlus(item.id)} />
        </div>
      </div>
      {goal && (
        <div className="dt-goal">
          <div className="dt-goal__line">
            <span className="dt-small">{T.goalText(goal.type, goal.value, item.period)}</span>
            <GoalStatus goal={goal} value={value} />
          </div>
          <Bar value={value} max={goal.value} label={T.progressLabel(item.label)} tint={tint} />
        </div>
      )}
      {showPause && pauseGoal != null && <PauseRow r={r} today={today} goalMinutes={pauseGoal} label={item.label} tint={tint} />}
    </Card>
  );
}

export default memo(ItemCard);
