import React, { useEffect, useRef, useState } from 'react';
import { AppBar, Button, Card, Icon, ListRow, SaveStatus } from '../kladde/kladde.js';
import DragSheet from './DragSheet.jsx';
import { exportFileName, exportText, parseImport } from '../lib/importExport.js';
import { T, FORMAT_NAMES, IMPORT_ERRORS } from '../strings.js';

let downloadsPromise = null;
/** Download-Funktion der claude.ai-Vorschau, falls die App dort läuft; sonst null. */
function viewerDownloads() {
  if (!downloadsPromise) {
    try {
      downloadsPromise = window.claude && typeof window.claude.use === 'function'
        ? Promise.resolve(window.claude.use('downloads')).catch(() => null)
        : Promise.resolve(null);
    } catch { downloadsPromise = Promise.resolve(null); }
  }
  return downloadsPromise;
}

function clipboardAllowed() {
  try {
    const policy = document.permissionsPolicy || document.featurePolicy;
    return !policy || policy.allowsFeature('clipboard-write');
  } catch { return true; }
}

function ExportSheet({ data, today, onClosed, onToast }) {
  const [msg, setMsg] = useState('');
  const [showText, setShowText] = useState(false);
  useEffect(() => { viewerDownloads(); }, []);
  const taRef = useRef(null);
  const text = exportText(data);
  const file = exportFileName(today);

  const download = async () => {
    // In der claude.ai-Vorschau geht ein Download nur über deren Speichern-Dialog.
    const viewer = await viewerDownloads();
    if (viewer) {
      try {
        await viewer.save({ filename: file, data: text });
        setMsg(T.exportSaved(file));
      } catch (e) {
        if (e && e.code === 'declined') setMsg('');
        else { setMsg(T.exportManual); setShowText(true); }
      }
      return;
    }
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setMsg(T.exportStarted(file));
    } catch {
      setMsg(T.exportManual); setShowText(true);
    }
  };

  const manual = () => {
    setMsg(T.exportManual); setShowText(true);
    setTimeout(() => { if (taRef.current) { taRef.current.focus(); taRef.current.select(); } }, 0);
  };

  const copy = () => {
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand && document.execCommand('copy');
        ta.remove();
        if (ok) { onToast(T.copied); setMsg(''); } else manual();
      } catch { manual(); }
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText && clipboardAllowed()) {
        navigator.clipboard.writeText(text).then(() => { onToast(T.copied); setMsg(''); }, fallback);
      } else fallback();
    } catch { fallback(); }
  };

  return (
    <DragSheet title={T.exportTitle} onClosed={onClosed}>
      {() => (
        <>
          <p className="dt-small">{T.exportText}</p>
          <div className="dt-ask__buttons">
            <Button variant="primary" icon="download" onClick={download}>{T.exportFile}</Button>
            <Button icon="list" onClick={copy}>{T.exportCopy}</Button>
          </div>
          {msg && <p className="dt-small kl-muted" role="status">{msg}</p>}
          {showText
            ? <textarea ref={taRef} id="dt-export-text" className="kl-input dt-export" readOnly value={text} onFocus={(e) => e.target.select()} aria-label={T.exportTitle} />
            : <Button variant="ghost" size="sm" onClick={manual} className="dt-left">{T.exportShowText}</Button>}
        </>
      )}
    </DragSheet>
  );
}

/** Import: Datei wählen oder exportierten Text einfügen (falls Dateien hier nicht gehen). */
function ImportChooseSheet({ onPickFile, onParsed, onClosed }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const check = () => {
    const res = parseImport(text.trim());
    if (res.ok) onParsed(res);
    else setError(T.importError(res.error));
  };
  return (
    <DragSheet title={T.importTitle} onClosed={onClosed}>
      {() => (
        <>
          <p className="dt-small">{T.importChooseText}</p>
          <Button variant="primary" icon="upload" block onClick={onPickFile}>{T.importFile}</Button>
          <div className="kl-field">
            <label className="kl-field__label" htmlFor="dt-import-text">{T.importPasteLabel}</label>
            <textarea
              id="dt-import-text" className="kl-input dt-export" value={text} placeholder={T.importPastePlaceholder}
              spellCheck={false} autoCapitalize="off" autoCorrect="off" data-testid="import-text"
              onChange={(e) => { setText(e.target.value); setError(''); }}
            />
          </div>
          {error && <div className="dt-banner" role="alert"><Icon name="alert" size={20} /><span>{error}</span></div>}
          <Button icon="check" disabled={!text.trim()} onClick={check} data-testid="import-check">{T.importPasteCheck}</Button>
        </>
      )}
    </DragSheet>
  );
}

function ImportSheet({ parsed, onConfirm, onClosed }) {
  return (
    <DragSheet title={T.importTitle} onClosed={onClosed}>
      {(close) => (
        <>
          <p>{T.importAsk(parsed.data.items.length, parsed.data.entries.length)}</p>
          <p className="dt-small kl-muted">{T.importFormat(FORMAT_NAMES[parsed.format])}</p>
          <div className="dt-ask__buttons">
            <Button onClick={close}>{T.cancel}</Button>
            <Button variant="primary" icon="upload" onClick={() => { onConfirm(parsed.data); close(); }} data-testid="import-confirm">{T.importReplace}</Button>
          </div>
        </>
      )}
    </DragSheet>
  );
}

/** App-Menü: Export, Import, Alle Daten löschen – als Liste, damit später weitere Einträge dazukommen können. */
export default function MenuView({ data, today, saveState, onReplaceAll, onDeleteAll, onToast }) {
  const fileRef = useRef(null);
  const [sheet, setSheet] = useState(null); // 'export' | { import: parsed }
  const [error, setError] = useState('');
  const [confirmAll, setConfirmAll] = useState(false);

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      const res = parseImport(String(reader.result));
      if (res.ok) setSheet({ import: res });
      else { setSheet(null); setError(T.importError(res.error)); }
    };
    reader.onerror = () => { setSheet(null); setError(T.importError(IMPORT_ERRORS.read)); };
    reader.readAsText(f);
  };

  return (
    <>
      <AppBar title={T.menuTitle} mark markTint="mint" subtitle={T.menuSubtitle} />
      <div className="kl-view">
        <Card tint="paper" className="dt-menu">
          <div className="dt-menu__head">
            <h3 className="kl-section-title dt-flat">{T.dataSection}</h3>
            <SaveStatus state={saveState === 'error' ? 'error' : 'saved'}>{saveState === 'error' ? T.notSaved : T.saved}</SaveStatus>
          </div>
          <p className="dt-small kl-muted">{T.stored(data.items.length, data.entries.length)}</p>
          <ul className="kl-list">
            <li><ListRow leading="download" leadTint="mint" title={T.exportRow} meta={T.exportMeta} onClick={() => setSheet('export')} /></li>
            <li><ListRow leading="upload" leadTint="sky" title={T.importRow} meta={T.importMeta} onClick={() => { setError(''); setSheet('import-choose'); }} /></li>
            <li><ListRow leading="trash" leadTint="peach" title={T.deleteAllRow} meta={T.deleteAllMeta} onClick={() => setConfirmAll(true)} /></li>
          </ul>
          <input ref={fileRef} id="dt-import-file" type="file" accept="application/json,.json,text/plain" hidden onChange={onFile} data-testid="import-file" />
        </Card>

        {error && (
          <div className="dt-banner" role="alert">
            <Icon name="alert" size={20} />
            <span>{error}</span>
          </div>
        )}

        {confirmAll && (
          <div className="dt-confirm dt-confirm--card" role="alert" data-testid="delete-all">
            <strong>{T.deleteAllTitle}</strong>
            <span>{T.deleteAllText}</span>
            <div className="dt-ask__buttons">
              <Button icon="download" onClick={() => { setConfirmAll(false); setSheet('export'); }}>{T.exportFirst}</Button>
              <Button variant="danger" icon="trash" onClick={() => { setConfirmAll(false); onDeleteAll(); }}>{T.deleteAllConfirm}</Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setConfirmAll(false)} className="dt-left">{T.cancel}</Button>
          </div>
        )}
      </div>

      {sheet === 'export' && <ExportSheet data={data} today={today} onToast={onToast} onClosed={() => setSheet(null)} />}
      {sheet === 'import-choose' && (
        <ImportChooseSheet
          onPickFile={() => fileRef.current && fileRef.current.click()}
          onParsed={(res) => setSheet({ import: res })}
          onClosed={() => setSheet((s) => (s === 'import-choose' ? null : s))}
        />
      )}
      {sheet && sheet.import && <ImportSheet parsed={sheet.import} onConfirm={onReplaceAll} onClosed={() => setSheet(null)} />}
    </>
  );
}
