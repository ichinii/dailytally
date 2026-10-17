/* @ds-bundle: {"format":4,"namespace":"Kladde","components":[{"name":"Icon"},{"name":"Mark"},{"name":"Button"},{"name":"Card"},{"name":"Checkbox"},{"name":"Rule"},{"name":"ListRow"},{"name":"Field"},{"name":"Input"},{"name":"Textarea"},{"name":"Toggle"},{"name":"Tabs"},{"name":"AppBar"},{"name":"BottomNav"},{"name":"Counter"},{"name":"Progress"},{"name":"Tag"},{"name":"Note"},{"name":"Toast"},{"name":"SaveStatus"},{"name":"Sheet"}]} */
/* Kladde — Komponenten aus dem Designsystem, als ES-Modul (Quelle: components/bundle.js). */
import React from 'react';
var h = React.createElement;
function cx() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
function omit(o, keys) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k) && keys.indexOf(k) < 0) r[k] = o[k]; return r; }

/* Hand-drawn icon paths, 24×24, stroked in currentColor. A path starting with "." is a dot (heavier stroke). */
var ICONS = {
  plus: ['M12 5.2c.1 4.6-.1 9.2.1 13.6', 'M5.3 12.1c4.5-.2 9 .1 13.5-.1'],
  minus: ['M5.3 12.2c4.5-.3 9 .1 13.5-.2'],
  check: ['M5 12.8c1.8 1.4 3.3 3 4.6 5 2.9-5 6.1-8.8 9.6-11.6'],
  close: ['M6.4 6.2c3.8 3.9 7.4 7.6 11.2 11.6', 'M17.7 6.3c-3.9 3.7-7.6 7.5-11.4 11.4'],
  heart: ['M12 19.5c-3.4-2.6-7.6-5.6-7.9-9.6-.2-2.6 1.6-4.6 3.9-4.6 1.8 0 3.2 1.1 4 2.7.9-1.7 2.4-2.8 4.2-2.7 2.3.1 3.9 2.2 3.6 4.7-.4 3.9-4.5 6.8-7.8 9.5z'],
  sparkle: ['M12 3.5c.6 3.9 1.9 6.9 6.5 8.3-4.4 1.5-5.8 4.4-6.4 8.6-.7-4.1-2.2-7.2-6.6-8.5 4.4-1.4 5.8-4.4 6.5-8.4z'],
  star: ['M12 4.2c.9 2.1 1.7 4 2.6 5.8 2 .2 4 .4 5.9.7-1.5 1.4-3 2.8-4.4 4.1.4 2 .8 3.9 1.1 5.9-1.8-1-3.5-2-5.2-3-1.8 1-3.5 2-5.3 2.9.4-2 .8-3.9 1.2-5.9-1.5-1.4-2.9-2.8-4.3-4.2 2-.2 4-.4 5.9-.6.8-1.8 1.6-3.7 2.5-5.7z'],
  moon: ['M18.3 15.1c-3.9 1.4-8.2-.7-9.6-4.6-1-2.7-.3-5.6 1.5-7.5-4.2.6-7.1 4.5-6.5 8.7.6 4.3 4.6 7.3 8.9 6.7 2.5-.3 4.6-1.6 5.7-3.3z'],
  'chevron-right': ['M9.3 5.6c2.4 2.2 4.6 4.3 6.6 6.5-2 2.2-4.2 4.3-6.5 6.4'],
  'chevron-left': ['M14.7 5.6c-2.4 2.2-4.6 4.3-6.6 6.5 2 2.2 4.2 4.3 6.5 6.4'],
  'chevron-down': ['M5.6 9.3c2.2 2.4 4.3 4.6 6.5 6.6 2.2-2 4.3-4.2 6.4-6.5'],
  menu: ['M4.6 7.2c5-.2 9.9.1 14.8-.1', 'M4.5 12.1c5 .1 9.9-.2 14.9 0', 'M4.7 16.9c4.9-.1 9.8.2 14.7 0'],
  more: ['.M6 12.1h.1', '.M12 12h.1', '.M18 12.1h.1'],
  trash: ['M4.8 7.1c4.8-.3 9.6-.1 14.4 0', 'M9.4 6.9c0-1.3.6-2.2 1.6-2.2h2c1 0 1.6.9 1.6 2.2', 'M6.6 7.4c.4 3.8.7 7.6 1 11.4.1.9.8 1.5 1.7 1.5h5.4c.9 0 1.6-.6 1.7-1.5.3-3.8.6-7.6 1-11.4', 'M10.2 10.8c.1 2 .2 4 .2 6', 'M13.9 10.8c-.1 2-.2 4-.2 6'],
  edit: ['M15.6 4.9c1.2-1.1 2.6-.9 3.5.1.9 1 .9 2.3-.2 3.4L9.4 18l-4.3 1.2 1.1-4.4 9.4-9.9z', 'M14.1 6.6l3.3 3.2'],
  undo: ['M8.6 6.2c-1.6 1.3-3 2.6-4.1 4 1.5 1.1 3 2.3 4.4 3.6', 'M4.9 10.2c3.6-.4 7.2-.6 10.2.2 2.7.8 4.3 2.9 4.1 5.2-.2 2.4-2.3 3.9-5.1 4'],
  search: ['M10.8 4.6c3.4-.1 6 2.5 6 5.8.1 3.3-2.6 6-6 6-3.3.1-6-2.5-6-5.8-.1-3.4 2.6-6 6-6z', 'M15.3 15.2c1.4 1.4 2.8 2.8 4.2 4.3'],
  calendar: ['M5.2 6.6c4.6-.3 9.1-.2 13.7 0 .4 4.2.4 8.4.1 12.6-4.6.3-9.2.2-13.8 0-.3-4.2-.3-8.4 0-12.6z', 'M5.3 10.4c4.5-.1 9 .1 13.6-.1', 'M8.9 4.4c0 1.2 0 2.3.1 3.4', 'M15.1 4.3c.1 1.2 0 2.4 0 3.5'],
  clock: ['M12 4.3c4.3-.1 7.7 3.3 7.7 7.6.1 4.3-3.4 7.8-7.7 7.8-4.3.1-7.7-3.4-7.7-7.7-.1-4.3 3.4-7.7 7.7-7.7z', 'M12 7.9c.1 1.5 0 3 .1 4.4 1.1.6 2.2 1.3 3.3 2'],
  home: ['M4.6 11.2c2.4-2.3 4.9-4.5 7.4-6.6 2.6 2.1 5.1 4.3 7.5 6.6', 'M6.6 9.7c-.1 3.2 0 6.4.2 9.6 3.5.2 6.9.2 10.4 0 .2-3.2.2-6.4.1-9.6', 'M10.3 19.2c-.1-1.7 0-3.4.1-5h3.3c.1 1.7.1 3.3 0 5'],
  list: ['M9.4 7c3.4-.1 6.7.1 10 0', 'M9.3 12.1c3.4.1 6.7-.1 10.1 0', 'M9.5 17.1c3.3-.1 6.6.1 9.9 0', '.M5 7.1h.1', '.M5 12.1h.1', '.M5 17.1h.1'],
  chart: ['M4.8 4.8c-.1 4.8 0 9.7.2 14.5 4.8.2 9.6.2 14.3 0', 'M8.6 15.8c-.1-1.4 0-2.8 0-4.2', 'M12.4 15.9c0-2.7-.1-5.3.1-8', 'M16.3 15.8c-.1-1.9 0-3.9.1-5.8'],
  sliders: ['M4.8 7.2c4.9-.1 9.7.1 14.5 0', 'M4.7 16.9c4.9.1 9.8-.1 14.6 0', 'M9 5c.1 1.5 0 3 0 4.5', 'M15.1 14.6c-.1 1.5 0 3.1 0 4.6'],
  download: ['M12 4.6c.1 3.6 0 7.3.1 10.9', 'M8 11.8c1.3 1.3 2.7 2.6 4 3.9 1.4-1.3 2.7-2.6 4-3.9', 'M5.2 15.6c-.1 1.2 0 2.4.1 3.6 4.5.2 9 .2 13.5 0 .1-1.2.1-2.4 0-3.6'],
  upload: ['M12 15.4c-.1-3.6 0-7.2-.1-10.8', 'M8 8.4c1.3-1.3 2.7-2.6 4-3.9 1.4 1.3 2.7 2.6 4 3.9', 'M5.2 15.6c-.1 1.2 0 2.4.1 3.6 4.5.2 9 .2 13.5 0 .1-1.2.1-2.4 0-3.6'],
  alert: ['M12 4.6c3.1 4.9 5.5 9.4 7.4 14.6-4.9.3-9.9.3-14.8 0 2-5.2 4.3-9.8 7.4-14.6z', 'M12 9.9c0 1.6.1 3.1 0 4.6', '.M12 16.9h.1'],
  clip: ['M8 9.6c0-2.2-.1-4.4.1-6.6.2-1.6 1.4-2.6 2.9-2.6s2.7 1 2.8 2.6c.2 4.6.1 9.3 0 13.9-.1 1.2-.9 2-2 2s-1.9-.8-1.9-2c-.1-3.6 0-7.2 0-10.8']
};

function iconPaths(name) {
  var list = ICONS[name] || ICONS.sparkle;
  return list.map(function (d, i) {
    var dot = d.charAt(0) === '.';
    return h('path', { key: i, d: dot ? d.slice(1) : d, style: dot ? { strokeWidth: 2.8 } : undefined });
  });
}

function Icon(p) {
  var size = p.size || 24;
  return h('svg', {
    className: cx('kl-icon', p.className), viewBox: '0 0 24 24', width: size, height: size, style: p.style,
    'aria-hidden': p.title ? undefined : 'true', role: p.title ? 'img' : undefined, 'aria-label': p.title || undefined, focusable: 'false'
  }, iconPaths(p.name));
}

/* SVG markup for plain-HTML apps: Kladde.iconSVG('plus', 20) */
function iconSVG(name, size) {
  size = size || 24;
  var list = ICONS[name] || ICONS.sparkle;
  return '<svg class="kl-icon" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" aria-hidden="true">' +
    list.map(function (d) { return d.charAt(0) === '.' ? '<path d="' + d.slice(1) + '" style="stroke-width:2.8"/>' : '<path d="' + d + '"/>'; }).join('') + '</svg>';
}

function Mark(p) {
  return h(p.as || 'span', { className: cx('kl-mark', p.tint && 'kl-mark--' + p.tint, p.className) }, p.children);
}

function Button(p) {
  var variant = p.variant || 'secondary';
  var iconOnly = !p.children && !!p.icon;
  var rest = omit(p, ['variant', 'size', 'icon', 'iconRight', 'block', 'className', 'children', 'label', 'as']);
  if (iconOnly || variant === 'fab') rest['aria-label'] = rest['aria-label'] || p.label;
  var tag = p.as || (p.href ? 'a' : 'button');
  if (tag === 'button' && !rest.type) rest.type = 'button';
  return h(tag, Object.assign(rest, {
    className: cx('kl-btn', variant !== 'secondary' && 'kl-btn--' + variant, p.size === 'sm' && 'kl-btn--sm', iconOnly && variant !== 'fab' && 'kl-btn--icon', p.block && 'kl-btn--block', p.className)
  }), p.icon && h(Icon, { name: p.icon, size: p.size === 'sm' ? 18 : 22 }), p.children, p.iconRight && h(Icon, { name: p.iconRight, size: p.size === 'sm' ? 18 : 22 }));
}

function Card(p) {
  var tilt = p.tilt === 'left' || p.tilt === -1 ? 'kl-card--tilt-left' : p.tilt === 'right' || p.tilt === 1 ? 'kl-card--tilt-right' : null;
  var hasHead = p.mark || p.title || p.action;
  return h(p.as || 'section', { className: cx('kl-card', 'kl-card--' + (p.tint || 'rose'), tilt, p.className), style: p.style },
    hasHead && h('div', { className: 'kl-card__head' },
      h('div', { className: 'kl-card__heads' },
        p.mark && h(Mark, { tint: p.markTint || (p.tint && p.tint !== 'paper' ? p.tint : 'rose'), className: 'kl-card__eyebrow' }, p.mark),
        p.title && h('h3', { className: 'kl-card__title' }, p.title)),
      p.action && h('div', { className: 'kl-card__action' }, p.action)),
    p.children,
    p.doodle && h(Icon, { name: p.doodle, className: 'kl-card__doodle', size: 40 }));
}

function Checkbox(p) {
  var rest = omit(p, ['children', 'className', 'onCheckedChange']);
  if (p.onCheckedChange && !p.onChange) rest.onChange = function (e) { p.onCheckedChange(e.target.checked); };
  rest.type = 'checkbox';
  return h('label', { className: cx('kl-check', p.className) },
    h('input', rest), h('span', { className: 'kl-check__box', 'aria-hidden': 'true' }), h('span', { className: 'kl-check__label' }, p.children));
}

function Rule(p) {
  return h('div', { role: 'separator', className: cx('kl-rule', p.heart && 'kl-rule--heart', p.className) },
    p.heart && h('span', { className: 'kl-rule__heart', 'aria-hidden': 'true' }));
}

function ListRow(p) {
  var tag = p.href ? 'a' : p.onClick ? 'button' : 'div';
  var props = { className: cx('kl-row', p.className), href: p.href, onClick: p.onClick };
  if (tag === 'button') props.type = 'button';
  var lead = p.leading == null ? null : typeof p.leading === 'string'
    ? h('span', { className: 'kl-row__lead', style: p.leadTint ? { background: 'var(--tint-' + p.leadTint + ')' } : undefined }, h(Icon, { name: p.leading, size: 22 }))
    : p.leading;
  var trail = p.trailing === undefined && (p.onClick || p.href) ? h(Icon, { name: 'chevron-right', size: 20 }) : p.trailing;
  return h(tag, props, lead,
    h('span', { className: 'kl-row__text' }, h('span', { className: 'kl-row__title' }, p.title), p.meta && h('span', { className: 'kl-row__meta' }, p.meta)),
    trail != null && trail !== false && h('span', { className: 'kl-row__trail' }, trail));
}

var fieldSeq = 0;
function Field(p) {
  var id = React.useMemo(function () { return p.id || 'kl-f' + (++fieldSeq); }, [p.id]);
  var child = React.Children.only(p.children);
  var describedBy = p.error ? id + '-err' : p.hint ? id + '-hint' : undefined;
  var control = React.cloneElement(child, { id: id, 'aria-invalid': p.error ? 'true' : undefined, 'aria-describedby': describedBy });
  return h('div', { className: cx('kl-field', p.className) },
    p.label && h('label', { className: 'kl-field__label', htmlFor: id }, p.label),
    control,
    p.error ? h('span', { className: 'kl-field__error', id: id + '-err' }, h(Icon, { name: 'alert', size: 16 }), p.error)
      : p.hint && h('span', { className: 'kl-field__hint', id: id + '-hint' }, p.hint));
}

function Input(p) { return h('input', Object.assign(omit(p, ['className']), { className: cx('kl-input', p.className) })); }
function Textarea(p) { return h('textarea', Object.assign(omit(p, ['className', 'lined']), { className: cx('kl-input', p.lined && 'kl-input--lined', p.className) })); }

function Toggle(p) {
  var rest = omit(p, ['label', 'className', 'onCheckedChange', 'children']);
  if (p.onCheckedChange && !p.onChange) rest.onChange = function (e) { p.onCheckedChange(e.target.checked); };
  rest.type = 'checkbox'; rest.role = 'switch';
  return h('label', { className: cx('kl-toggle', p.className) },
    h('span', null, p.label || p.children), h('input', rest), h('span', { className: 'kl-toggle__track', 'aria-hidden': 'true' }));
}

function Tabs(p) {
  return h('div', { className: cx('kl-tabs', p.className), role: 'tablist', 'aria-label': p.label },
    (p.items || []).map(function (it) {
      var id = typeof it === 'string' ? it : it.id, label = typeof it === 'string' ? it : it.label;
      return h('button', { key: id, type: 'button', role: 'tab', className: 'kl-tab', 'aria-selected': p.value === id ? 'true' : 'false', onClick: function () { p.onChange && p.onChange(id); } }, label);
    }));
}

function AppBar(p) {
  var subs = p.subtitle == null ? null : Array.isArray(p.subtitle) ? p.subtitle : [p.subtitle];
  var sub = subs && h('div', { className: 'kl-appbar__sub' }, subs.map(function (s, i) {
    return i ? [h(Icon, { key: 's' + i, name: 'sparkle', size: 12 }), h('span', { key: i }, s)] : h('span', { key: i }, s);
  }));
  var start = p.onBack ? h(Button, { variant: 'ghost', icon: 'chevron-left', label: p.backLabel || 'Zurück', onClick: p.onBack }) : p.start;
  var title = p.mark ? h(Mark, { tint: p.markTint || 'rose' }, p.title) : p.title;
  return h('header', { className: cx('kl-appbar', p.compact && 'kl-appbar--compact', p.align === 'start' && 'kl-appbar--start', p.className) },
    p.align !== 'start' || start ? h('div', { className: 'kl-appbar__side' }, start) : null,
    h('div', { className: 'kl-appbar__titles' }, h('h1', { className: 'kl-appbar__title' }, title), sub),
    h('div', { className: 'kl-appbar__side' }, p.end));
}

function BottomNav(p) {
  return h('nav', { className: cx('kl-nav', p.fixed && 'kl-nav--fixed', p.className), 'aria-label': p.label || 'Hauptnavigation' },
    (p.items || []).map(function (it) {
      return h('button', { key: it.id, type: 'button', className: 'kl-nav__item', 'aria-current': p.value === it.id ? 'page' : undefined, onClick: function () { p.onChange && p.onChange(it.id); } },
        h(Icon, { name: it.icon, size: 26 }), h('span', null, it.label));
    }));
}

function Counter(p) {
  var min = p.min == null ? 0 : p.min, max = p.max == null ? Infinity : p.max, step = p.step || 1;
  var s = React.useState(0), bump = s[0], setBump = s[1];
  function set(v) { v = Math.max(min, Math.min(max, v)); if (v !== p.value) { p.onChange && p.onChange(v); setBump(bump + 1); } }
  return h('div', { className: cx('kl-counter-wrap', p.className) },
    h('div', { className: 'kl-counter' },
      h(Button, { icon: 'minus', label: 'Weniger', onClick: function () { set(p.value - step); }, disabled: p.value <= min }),
      h('output', { key: bump, className: 'kl-counter__value' + (bump ? ' kl-counter__value--bump' : ''), 'aria-live': 'polite' }, p.value),
      h(Button, { variant: 'primary', icon: 'plus', label: 'Mehr', onClick: function () { set(p.value + step); }, disabled: p.value >= max })),
    p.label && h('span', { className: 'kl-counter__label' }, p.label));
}

function Progress(p) {
  var max = p.max || 100, pct = Math.max(0, Math.min(100, (p.value / max) * 100));
  return h('div', { className: cx('kl-progress', p.className) },
    (p.label || p.showValue) && h('div', { className: 'kl-progress__top' }, h('span', null, p.label), p.showValue !== false && h('span', null, p.valueText || Math.round(pct) + ' %')),
    h('div', { className: 'kl-progress__track', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': p.value, 'aria-label': p.label },
      h('div', { className: 'kl-progress__fill', style: { width: pct + '%', '--kl-mark-c': p.tint ? 'var(--mark-' + p.tint + ')' : undefined } })));
}

function Tag(p) {
  var icon = p.icon || (p.tone === 'success' ? 'check' : p.tone === 'danger' ? 'alert' : null);
  return h('span', { className: cx('kl-tag', 'kl-tag--' + (p.tone || p.tint || 'rose'), p.className) }, icon && h(Icon, { name: icon, size: 14 }), p.children);
}

function Note(p) {
  return h('aside', { className: cx('kl-note', p.center && 'kl-note--center', p.className), style: p.style },
    p.clip !== false && h(Icon, { name: 'clip', className: 'kl-note__clip', size: 34 }),
    p.title && h('strong', { className: 'kl-note__title' }, p.title), p.children);
}

function Toast(p) {
  return h('div', { className: cx('kl-toast', p.fixed && 'kl-toast--fixed', p.className), role: 'status' },
    p.icon && h(Icon, { name: p.icon, size: 20 }),
    h('span', { className: 'kl-toast__text' }, p.children),
    p.action && h(Button, { variant: 'ghost', size: 'sm', icon: p.action.icon, onClick: p.action.onClick }, p.action.label),
    p.onClose && h(Button, { variant: 'ghost', size: 'sm', icon: 'close', label: 'Schließen', onClick: p.onClose }));
}

function SaveStatus(p) {
  var state = p.state || 'saved';
  var text = p.children || (state === 'saving' ? 'speichert …' : state === 'error' ? 'nicht gespeichert' : 'gespeichert');
  var icon = state === 'saving' ? 'edit' : state === 'error' ? 'alert' : 'check';
  return h('span', { className: cx('kl-saved', 'kl-saved--' + state, p.className), role: 'status' }, h(Icon, { name: icon, size: 16 }), text);
}

function Sheet(p) {
  React.useEffect(function () {
    if (!p.open || p.inline) return;
    function onKey(e) { if (e.key === 'Escape' && p.onClose) p.onClose(); }
    document.addEventListener('keydown', onKey);
    return function () { document.removeEventListener('keydown', onKey); };
  }, [p.open, p.inline]);
  if (!p.open) return null;
  var sheet = h('div', { className: cx('kl-sheet', p.inline && 'kl-sheet--inline', p.className), role: 'dialog', 'aria-modal': p.inline ? undefined : 'true', 'aria-label': typeof p.title === 'string' ? p.title : undefined, onClick: function (e) { e.stopPropagation(); } },
    h('div', { className: 'kl-sheet__grip', 'aria-hidden': 'true' }),
    (p.title || p.onClose) && h('div', { className: 'kl-sheet__head' },
      h('h2', { className: 'kl-sheet__title' }, p.title),
      p.onClose && h(Button, { variant: 'ghost', icon: 'close', label: 'Schließen', onClick: p.onClose })),
    h('div', { className: 'kl-sheet__body' }, p.children),
    p.actions && h('div', { className: 'kl-sheet__actions' }, p.actions));
  return p.inline ? sheet : h('div', { className: 'kl-scrim', onClick: p.onClose }, sheet);
}

var Kladde = {
  Icon: Icon, Mark: Mark, Button: Button, Card: Card, Checkbox: Checkbox, Rule: Rule, ListRow: ListRow,
  Field: Field, Input: Input, Textarea: Textarea, Toggle: Toggle, Tabs: Tabs, AppBar: AppBar, BottomNav: BottomNav,
  Counter: Counter, Progress: Progress, Tag: Tag, Note: Note, Toast: Toast, SaveStatus: SaveStatus, Sheet: Sheet,
  icons: ICONS, iconSVG: iconSVG,
  tints: ['rose', 'lilac', 'butter', 'mint', 'sky', 'peach', 'aqua']
};
export default Kladde;
export { Icon, Mark, Button, Card, Checkbox, Rule, ListRow, Field, Input, Textarea, Toggle, Tabs, AppBar, BottomNav, Counter, Progress, Tag, Note, Toast, SaveStatus, Sheet, iconSVG };

