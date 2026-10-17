import React, { useCallback, useEffect, useRef } from 'react';
import { cssMs, prefersReducedMotion } from '../lib/ui.js';

const NO_DRAG = 'button, input, textarea, select, a, label, [role="tab"], [role="switch"]';

/**
 * Bottom-Sheet über einer Abdunklung. Schließt per Abbrechen (close aus children), Tipp auf den Hintergrund,
 * Escape oder Herunterziehen am Griff – alle mit derselben Ausblend-Animation.
 * children: (close) => ReactNode. onEntered: nach dem Einfahren (z. B. Fokus setzen).
 */
export default function DragSheet({ title, headStart, headEnd, tall, onClosed, onEntered, children, className }) {
  const scrimRef = useRef(null);
  const sheetRef = useRef(null);
  const closing = useRef(false);
  const entered = useRef(false);
  const drag = useRef(null);
  const closedCb = useRef(onClosed);
  closedCb.current = onClosed;

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const sheet = sheetRef.current, scrim = scrimRef.current;
    if (document.activeElement && sheet && sheet.contains(document.activeElement)) document.activeElement.blur();
    const dur = prefersReducedMotion() ? 0 : cssMs('--dur-sheet-out', 220);
    if (!sheet || dur === 0) { closedCb.current(); return; }
    sheet.style.animation = 'none';
    sheet.style.transition = `transform ${dur}ms var(--ease-in)`;
    sheet.style.transform = 'translateY(calc(100% + 32px))';
    scrim.style.animation = 'none';
    scrim.style.transition = `opacity ${dur}ms ease`;
    scrim.style.opacity = '0';
    setTimeout(() => closedCb.current(), dur);
  }, []);

  const enteredCb = useRef(onEntered);
  enteredCb.current = onEntered;
  const markEntered = useCallback(() => {
    if (entered.current || closing.current) return;
    entered.current = true;
    if (enteredCb.current) enteredCb.current();
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(markEntered, cssMs('--dur-sheet-in', 280) + 80);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); document.body.style.overflow = prevOverflow; };
  }, [close, markEntered]);

  // ---- Ziehen am Griff: Pointer Events + Pointer Capture, Position direkt am Element ----
  const onPointerDown = (e) => {
    if (closing.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target.closest(NO_DRAG)) return;
    const sheet = sheetRef.current;
    drag.current = { id: e.pointerId, y0: e.clientY, h: sheet.offsetHeight, moved: false, samples: [{ y: e.clientY, t: e.timeStamp }] };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* egal */ }
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const sheet = sheetRef.current, scrim = scrimRef.current;
    const raw = e.clientY - d.y0;
    if (!d.moved) {
      if (Math.abs(raw) < 3) return;
      d.moved = true;
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); // Tastatur schließt
      sheet.style.animation = 'none';
      sheet.style.transition = 'none';
      scrim.style.animation = 'none';
      scrim.style.transition = 'none';
    }
    const dy = Math.max(0, raw);
    sheet.style.transform = `translateY(${dy}px)`;
    scrim.style.opacity = String(1 - Math.min(1, dy / d.h) * 0.7);
    d.dy = dy;
    d.samples.push({ y: e.clientY, t: e.timeStamp });
    while (d.samples.length > 2 && e.timeStamp - d.samples[0].t > 100) d.samples.shift();
  };
  const springBack = () => {
    const sheet = sheetRef.current, scrim = scrimRef.current;
    const dur = prefersReducedMotion() ? 0 : cssMs('--dur-sheet-in', 280);
    sheet.style.transition = `transform ${dur}ms var(--kl-ease)`;
    sheet.style.transform = 'translateY(0)';
    scrim.style.transition = `opacity ${dur}ms ease`;
    scrim.style.opacity = '1';
  };
  const onPointerUp = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (!d.moved) return;
    const first = d.samples[0], last = { y: e.clientY, t: e.timeStamp };
    const v = last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0; // px/ms, positiv = nach unten
    const dy = d.dy || 0;
    if (dy > d.h * 0.25 || (v > 0.5 && dy > 12)) close();
    else springBack();
  };
  const onPointerCancel = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (d.moved) springBack();
  };

  return (
    <div className="kl-scrim dt-scrim" ref={scrimRef} onClick={close}>
      <div
        ref={sheetRef}
        className={`kl-sheet dt-sheet${tall ? ' dt-sheet--tall' : ''}${className ? ' ' + className : ''}`}
        role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={(e) => { if (e.target === sheetRef.current) markEntered(); }}
      >
        <div
          className="dt-sheet__handle"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
        >
          <div className="kl-sheet__grip" aria-hidden="true" />
          <div className="kl-sheet__head dt-sheet__head">
            {headStart}
            <h2 className="kl-sheet__title">{title}</h2>
            {headEnd}
          </div>
        </div>
        <div className="dt-sheet__body">{children(close)}</div>
      </div>
    </div>
  );
}
