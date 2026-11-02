import React, { memo, useEffect, useRef, useState } from 'react';
import { Button, Card, Icon, Mark, Tag } from '../kladde/kladde.js';
import Bar from './Bar.jsx';
import { evaluate } from '../lib/goals.js';
import { formatDuration } from '../lib/days.js';
import { gapBreaks, runningPause } from '../lib/stats.js';
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

/** Große Zahl bei „weniger ist besser“ ohne Limit: Zeit seit dem letzten Eintrag. */
function SinceHero({ r, today, value }) {
  const now = useNow(20000);
  const p = runningPause(r, today, now);
  if (!p.known) return <CountHero value={value} tagged={false} />;
  const dur = formatDuration(p.minutes);
  return (
    <>
      <output className="dt-counter__num dt-counter__num--time" data-testid="hero">{dur}</output>
      <span className="dt-counter__lbl">{T.sinceLast}</span>
    </>
  );
}

/** `tagged`: nur eine Stelle je Karte trägt data-testid="value" – der echte Zähler. */
function CountHero({ value, bump, tagged = true }) {
  return (
    <>
      <output key={bump} className={'dt-counter__num' + (bump ? ' kl-counter__value--bump' : '')} data-testid={tagged ? 'value' : 'hero'}>{value}</output>
      <span className="dt-counter__lbl">{T.entriesWord(value)}</span>
    </>
  );
}

/** Beschriftung des Zähl-Knopfs, damit Vorlesen die gezeigte Zahl erklärt. */
function heroLabel(item, value, goal, r, today) {
  if (item.direction !== 'down') return T.entriesOpen(value);
  if (goal) return value <= goal.value ? T.restOpen(goal.value - value, goal.value) : T.overOpen(value - goal.value);
  const p = runningPause(r, today, Date.now());
  return p.known ? T.sinceOpen(formatDuration(p.minutes)) : T.entriesOpen(value);
}

/** Mindestabstand: wie lange noch zu warten ist, und wie oft er heute zu kurz war. */
function GapRow({ r, today, goalMinutes, label, tint }) {
  const now = useNow(20000);
  const p = runningPause(r, today, now);
  const breaks = gapBreaks(r, goalMinutes, today, today)[0];
  const rest = p.known ? Math.ceil(goalMinutes - p.minutes) : null;
  return (
    <div className="dt-pause" data-testid="gap">
      <div className="dt-pause__line">
        <span className="dt-pause__text">
          <Icon name="clock" size={18} />{' '}
          {!p.known ? T.gapUnknown : rest > 0 ? T.gapNext(formatDuration(rest)) : T.gapFree}
        </span>
        {p.known && rest <= 0
          ? <Tag tone="success">{T.gapFree}</Tag>
          : <span className="kl-muted dt-small">{T.gapGoalText(formatDuration(goalMinutes))}</span>}
      </div>
      {p.known && rest > 0 && <Bar value={p.minutes} max={goalMinutes} label={T.gapProgressLabel(label)} tint={tint} />}
      {!p.known && <span className="kl-muted dt-small">{p.reason === 'untimed' ? T.pauseUnknownWhy : T.pauseNoEntries}</span>}
      {breaks > 0 && <span className="kl-muted dt-small" data-testid="gap-breaks">{T.gapBreaks(breaks)}</span>}
    </div>
  );
}

function ItemCard({ item, tint, refLabel, value, goal, pauseGoal, gapGoal, showPause, showGap, r, today, onPlus, onMinus, onOpenEntries, onEdit }) {
  const down = item.direction === 'down';
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
          <button
            type="button" className={'dt-counter__value' + (down && !goal ? ' dt-counter__value--wide' : '')}
            onClick={() => onOpenEntries(item.id)} aria-label={heroLabel(item, value, goal, r, today)}
          >
            {!down ? <CountHero value={value} bump={bump} />
              : goal ? (
                <>
                  <output key={bump} className={'dt-counter__num' + (bump ? ' kl-counter__value--bump' : '')} data-testid="hero">{Math.abs(goal.value - value)}</output>
                  <span className="dt-counter__lbl">{value <= goal.value ? T.restOf(goal.value) : T.overLimit}</span>
                </>
              ) : <SinceHero r={r} today={today} value={value} />}
          </button>
          <Button variant="primary" icon="plus" label={T.plus} onClick={() => onPlus(item.id)} />
        </div>
      </div>
      {down && (
        <div className="dt-counter__sub dt-small kl-muted">
          <output data-testid="value">{value}</output> {T.entriesWord(value)}
        </div>
      )}
      {goal && (
        <div className="dt-goal">
          <div className="dt-goal__line">
            <span className="dt-small">{T.goalText(goal.type, goal.value, item.period)}</span>
            <GoalStatus goal={goal} value={value} />
          </div>
          {/* Bei „weniger ist besser“ leert sich der Balken, statt sich zu füllen. */}
          <Bar value={down ? Math.max(0, goal.value - value) : value} max={goal.value} label={T.progressLabel(item.label)} tint={tint} />
        </div>
      )}
      {showGap && gapGoal != null && <GapRow r={r} today={today} goalMinutes={gapGoal} label={item.label} tint={tint} />}
      {showPause && pauseGoal != null && <PauseRow r={r} today={today} goalMinutes={pauseGoal} label={item.label} tint={tint} />}
    </Card>
  );
}

export default memo(ItemCard);
