import React, { useEffect, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { cssMs } from '../lib/ui.js';

// Bereiche, die beim Drücken kein Umsortieren starten (Zählknöpfe).
const NO_LIFT = '.dt-counter, input, textarea, select';
const MOVE_CANCEL_PX = 8;
const EDGE_PX = 90;
const PRESS_DELAY_MS = 90; // Hervorhebung erst, wenn der Finger kurz ruht – beim Scrollen flackert nichts

/**
 * Liste, deren Einträge sich per langem Drücken anheben und per Ziehen umsortieren lassen.
 * Kurzes Tippen bleibt ein normaler Klick (z. B. Bearbeiten öffnen).
 *
 * Normales Scrollen bleibt unangetastet: es gibt keinen blockierenden Touch-Listener.
 * Erst wenn ein Item angehoben ist, wird das Scrollen der Seite gesperrt und der Finger
 * über Touch-Events verfolgt (die laufen weiter, auch wenn der Browser die Zeiger-Geste abbricht).
 */
export default function ReorderList({ ids, onMove, renderItem, className }) {
  const listRef = useRef(null);
  const st = useRef(null);
  const suppressClick = useRef(false);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  // Handler einmal anlegen: sie lesen nur Refs, damit Neu-Renders mitten in der Geste nichts verlieren.
  const api = useMemo(() => {
    let raf = 0;
    const root = document.documentElement;

    const listen = (on) => {
      const f = on ? window.addEventListener : window.removeEventListener;
      f('pointermove', onPointerMove);
      f('pointerup', onPointerUp);
      f('pointercancel', onPointerCancel);
      f('touchmove', onTouchMove, { passive: true });
      f('touchend', onTouchEnd);
      f('touchcancel', onTouchEnd);
    };

    // Touch: Seite während des Ziehens nicht scrollen lassen (Maus braucht das nicht; dort bliebe die Scrollleiste stehen).
    const lockScroll = (on, touch) => {
      root.classList.toggle('dt-dragging', on);
      root.classList.toggle('dt-scroll-locked', on && touch);
    };

    const layout = () => {
      const s = st.current;
      if (!s || !s.dragging) return;
      const dy = s.lastY - s.y0 + (window.scrollY - s.scroll0);
      s.el.style.transform = `translateY(${dy}px)`;
      const me = s.rects[s.index];
      const center = me.top + me.h / 2 + dy;
      let target = s.index;
      for (let i = 0; i < s.rects.length; i++) {
        const r = s.rects[i];
        const mid = r.top + r.h / 2;
        if (i < s.index && center < mid) { target = i; break; }
        if (i > s.index && center > mid) target = i;
      }
      s.target = target;
      const shift = me.h + s.gap;
      s.rects.forEach((r, i) => {
        if (i === s.index) return;
        let t = 0;
        if (target > s.index && i > s.index && i <= target) t = -shift;
        if (target < s.index && i >= target && i < s.index) t = shift;
        r.el.style.transform = t ? `translateY(${t}px)` : '';
      });
    };

    const autoScroll = () => {
      const s = st.current;
      if (!s || !s.dragging) return;
      const bottomEdge = window.innerHeight - EDGE_PX - 40;
      let v = 0;
      if (s.lastY < EDGE_PX) v = -Math.ceil((EDGE_PX - s.lastY) / 6);
      else if (s.lastY > bottomEdge) v = Math.ceil((s.lastY - bottomEdge) / 6);
      if (v) { window.scrollBy(0, v); layout(); }
      raf = requestAnimationFrame(autoScroll);
    };

    const lift = () => {
      const s = st.current;
      if (!s) return;
      s.dragging = true;
      clearTimeout(s.pressTimer);
      try { if (navigator.vibrate) navigator.vibrate(12); } catch { /* egal */ }
      const children = Array.from(listRef.current.children);
      s.rects = children.map((el) => { const b = el.getBoundingClientRect(); return { el, top: b.top + window.scrollY, h: b.height }; });
      s.index = children.indexOf(s.el);
      s.target = s.index;
      s.gap = parseFloat(getComputedStyle(listRef.current).rowGap) || 20;
      s.scroll0 = window.scrollY;
      s.el.classList.remove('is-pressing');
      s.el.classList.add('is-lifted');
      listRef.current.classList.add('is-sorting');
      lockScroll(true, s.touch);
      if (window.getSelection) try { window.getSelection().removeAllRanges(); } catch { /* egal */ }
      raf = requestAnimationFrame(autoScroll);
    };

    const moveTo = (x, y) => {
      const s = st.current;
      if (!s.dragging) {
        if (Math.hypot(x - s.x0, y - s.y0) > MOVE_CANCEL_PX) finish(false); // Scrollen statt Halten
        return;
      }
      s.lastY = y;
      layout();
    };

    function onPointerMove(e) {
      const s = st.current;
      if (!s || e.pointerId !== s.pointerId) return;
      if (s.touch && s.dragging) return; // Touch nach dem Anheben: Touch-Events übernehmen
      moveTo(e.clientX, e.clientY);
    }
    function onPointerUp(e) {
      const s = st.current;
      if (!s || e.pointerId !== s.pointerId || (s.touch && s.dragging)) return;
      finish(true);
    }
    function onPointerCancel(e) {
      const s = st.current;
      if (!s || e.pointerId !== s.pointerId) return;
      if (s.touch && s.dragging) return; // Browser gibt die Geste ab – wir folgen weiter per Touch
      finish(false);
    }
    function onTouchMove(e) {
      const s = st.current;
      if (!s || !s.touch || !s.dragging) return;
      const t = e.touches[0];
      if (t) moveTo(t.clientX, t.clientY);
    }
    function onTouchEnd(e) {
      const s = st.current;
      if (!s || !s.touch || !s.dragging) return;
      if (e.touches.length === 0) finish(e.type === 'touchend');
    }

    const finish = (commit) => {
      const s = st.current;
      if (!s) return;
      st.current = null;
      clearTimeout(s.timer);
      clearTimeout(s.pressTimer);
      cancelAnimationFrame(raf);
      listen(false);
      s.el.classList.remove('is-pressing');
      if (!s.dragging) return;
      lockScroll(false, false);
      suppressClick.current = true;
      setTimeout(() => { suppressClick.current = false; }, 400);

      const list = listRef.current;
      const dur = cssMs('--dur-mid', 200);
      const visualTop = s.el.getBoundingClientRect().top; // wo das Item gerade unter dem Finger liegt
      if (commit && s.target !== s.index) flushSync(() => onMoveRef.current(s.el.dataset.id, s.target));
      // Alle Versätze ohne Übergang entfernen – die anderen Items stehen damit schon an ihrem Platz.
      list.classList.remove('is-sorting');
      s.rects.forEach((r) => { r.el.style.transition = 'none'; r.el.style.transform = ''; });
      // FLIP: das abgelegte Item von der Fingerposition sanft an seinen Platz gleiten lassen.
      const delta = visualTop - s.el.getBoundingClientRect().top;
      s.el.style.transform = `translateY(${delta}px)`;
      void s.el.offsetHeight;
      s.el.classList.remove('is-lifted');
      s.el.style.transition = `transform ${dur}ms var(--kl-ease)`;
      s.el.style.transform = '';
      s.rects.forEach((r) => { if (r.el !== s.el) r.el.style.transition = ''; });
      setTimeout(() => { s.el.style.transition = ''; }, dur + 50);
    };

    const onPointerDown = (e) => {
      if (st.current) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest(NO_LIFT)) return;
      const el = e.currentTarget;
      st.current = {
        el, pointerId: e.pointerId, touch: e.pointerType === 'touch',
        x0: e.clientX, y0: e.clientY, lastY: e.clientY, dragging: false,
        pressTimer: setTimeout(() => { if (st.current && st.current.el === el) el.classList.add('is-pressing'); }, PRESS_DELAY_MS),
        timer: setTimeout(lift, cssMs('--dur-longpress', 450)),
      };
      listen(true);
    };

    const cancelAll = () => { if (st.current) finish(false); };

    return { onPointerDown, cancelAll };
  }, []);

  useEffect(() => () => api.cancelAll(), [api]);

  return (
    <div
      ref={listRef} className={'dt-reorder ' + (className || '')}
      onClickCapture={(e) => { if (suppressClick.current) { suppressClick.current = false; e.stopPropagation(); e.preventDefault(); } }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {ids.map((id) => (
        <div key={id} data-id={id} className="dt-reorder__item" onPointerDown={api.onPointerDown}>
          {renderItem(id)}
        </div>
      ))}
    </div>
  );
}
