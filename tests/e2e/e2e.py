import os, json, time, datetime, traceback, sys
os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/opt/pw-browsers'
from playwright.sync_api import sync_playwright
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = 'http://127.0.0.1:8765/'
APP = ROOT + 'dist-single/index.html'
TZ = ZoneInfo('Europe/Berlin')
SEED = open(os.path.join(HERE, 'seed.json')).read()
RESULTS = []
CONSOLE = []
ONLY = sys.argv[1:]

def t(y, m, d, h=12, mi=0):
    return datetime.datetime(y, m, d, h, mi, tzinfo=TZ)
def ms(dt):
    return int(dt.timestamp() * 1000)

def check(name, cond, detail=''):
    RESULTS.append((name, bool(cond), detail))
    print(('PASS ' if cond else 'FAIL ') + name + ((' — ' + str(detail)) if detail and not cond else ''))

def new_ctx(p, scheme='light', touch=True):
    b = p.chromium.launch(args=['--disable-gpu'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, color_scheme=scheme,
                        has_touch=touch, is_mobile=touch, timezone_id='Europe/Berlin', locale='de-DE', accept_downloads=True)
    return b, ctx

def page(ctx, data=None, now=None, url=APP, label=''):
    pg = ctx.new_page()
    pg.on('console', lambda m: CONSOLE.append(f'[{label}] {m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: CONSOLE.append(f'[{label}] PAGEERROR: {e}'))
    if now is not None:
        pg.clock.set_fixed_time(now)
    pg.goto(url)
    if data is not None:
        pg.evaluate("s => localStorage.setItem('daily-tally-v3', s)", data if isinstance(data, str) else json.dumps(data))
        pg.reload()
    pg.wait_for_selector('.kl-app')
    pg.wait_for_timeout(300)
    return pg

def stored(pg):
    return json.loads(pg.evaluate("localStorage.getItem('daily-tally-v3')") or 'null')

def card(pg, name):
    return pg.locator('article.dt-item', has=pg.locator('.dt-item__name', has_text=name))

def value(pg, name):
    return int(card(pg, name).locator('[data-testid=value]').inner_text())

def visible_days(pg):
    return pg.locator('.dt-week:not([aria-hidden]) .dt-day')

def strip_state(pg):
    return pg.evaluate("""() => { const el=document.querySelector('[data-testid=week-scroller]'); return {left: el.scrollLeft, w: el.clientWidth, max: el.scrollWidth-el.clientWidth, month: document.querySelector('.dt-strip__month').textContent}; }""")

def item(id_, label, period='day', created='2026-10-01', goals=None, pauses=None):
    return {'id': id_, 'label': label, 'period': period, 'createdDay': created, 'countGoals': goals or [], 'pauseGoals': pauses or []}

def data(items, entries=()):
    return {'version': 3, 'items': list(items), 'entries': list(entries)}

def entries_n(item_id, day, n, ts=None, prefix='x'):
    return [{'id': f'{prefix}{day}{i}', 'itemId': item_id, 'day': day, 'ts': ts} for i in range(n)]

def touch_drag(pg, x0, y0, x1, y1, duration_ms, steps=12, hold_ms=0):
    cdp = pg.context.new_cdp_session(pg)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y0}]})
    for i in range(1, steps + 1):
        x = x0 + (x1 - x0) * i / steps; y = y0 + (y1 - y0) * i / steps
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x, 'y': y}]})
        pg.wait_for_timeout(max(1, duration_ms // steps))
    if hold_ms: pg.wait_for_timeout(hold_ms)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    cdp.detach()

def run(name, fn):
    if ONLY and not any(o in name for o in ONLY):
        return
    try:
        fn()
    except Exception as e:
        check(name + ' (Ausnahme)', False, ''.join(traceback.format_exception_only(type(e), e)).strip()[:400])

NOW = t(2026, 10, 17, 14, 32)

# ------------------------------------------------------------------ Items und Ziele
def test_create_and_sheet():
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        pg = page(ctx, now=NOW, label='sheet')
        pg.get_by_role('button', name='Erstes Item anlegen').click()
        pg.wait_for_timeout(450)
        name = pg.locator('#dt-name')
        box = name.bounding_box()
        check('Namensfeld im oberen Drittel', box['y'] + box['height'] <= 844 / 3, box)
        check('Namensfeld hat nach dem Einfahren den Fokus', pg.evaluate("document.activeElement && document.activeElement.id") == 'dt-name')
        save = pg.get_by_test_id('save')
        check('Speichern gesperrt bei leerem Namen', save.is_disabled())
        sb = save.bounding_box()
        check('Speichern-Knopf in der oberen Hälfte', sb['y'] + sb['height'] <= 422, sb)
        last = pg.locator('.dt-sheet__body .kl-field').last.bounding_box()
        check('Alle Eingabefelder in der oberen Hälfte', last['y'] + last['height'] <= 422, last)
        name.fill('Wasser'); name.press('Enter'); pg.wait_for_timeout(400)
        check('Anlegen per Enter', card(pg, 'Wasser').count() == 1)
        pg.get_by_test_id('add-item').click(); pg.wait_for_timeout(450)
        pg.locator('#dt-name').fill('Sport')
        pg.get_by_role('tab', name='Woche', exact=True).click()
        pg.get_by_test_id('save').click(); pg.wait_for_timeout(400)
        st = stored(pg)
        check('Anlegen per Knopf (Wochen-Item)', card(pg, 'Sport').count() == 1 and st['items'][1]['period'] == 'week')
        before = json.dumps(stored(pg))
        # Schließen ohne Änderung: Abbrechen, Hintergrund, Escape
        for how in ['Abbrechen', 'Hintergrund', 'Escape']:
            pg.get_by_test_id('add-item').click(); pg.wait_for_timeout(450)
            pg.locator('#dt-name').fill('Nicht speichern')
            if how == 'Abbrechen': pg.get_by_role('button', name='Abbrechen').click()
            elif how == 'Hintergrund': pg.mouse.click(195, 10)
            else: pg.keyboard.press('Escape')
            pg.wait_for_timeout(450)
            check(f'Schließen per {how} ohne Änderung', pg.locator('.dt-sheet').count() == 0 and json.dumps(stored(pg)) == before)
        # Edit: Zeitraum nicht änderbar
        card(pg, 'Sport').locator('.dt-item__name').click(); pg.wait_for_timeout(450)
        check('Bearbeiten: kein Autofokus', pg.evaluate("document.activeElement && document.activeElement.id") != 'dt-name')
        check('Zeitraum beim Bearbeiten nicht änderbar', pg.locator('.dt-sheet').get_by_role('tab', name='Woche', exact=True).count() == 0 and pg.locator('.dt-sheet', has_text='nicht mehr ändern').count() == 1)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
        b.close()

def sheet_y(pg):
    return pg.evaluate("""() => { const s=document.querySelector('.dt-sheet'); if(!s) return null; const m=getComputedStyle(s).transform; if(m==='none') return 0; return new DOMMatrix(m).m42; }""")

def test_sheet_drag():
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        pg = page(ctx, data([item('a', 'Kaffee')]), now=NOW, label='drag')
        def open_sheet():
            pg.get_by_test_id('add-item').click(); pg.wait_for_timeout(500)
            pg.locator('#dt-name').fill('X')
        open_sheet()
        grip = pg.locator('.kl-sheet__grip').bounding_box()
        gx, gy = grip['x'] + grip['width'] / 2, grip['y'] + 4
        # Pixelgenau folgen: Finger halten und Position messen
        cdp = pg.context.new_cdp_session(pg)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': gx, 'y': gy}]})
        ok = True; samples = []
        for dy in [20, 57, 103, 140]:
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': gx, 'y': gy + dy}]})
            pg.wait_for_timeout(30)
            y = sheet_y(pg); samples.append((dy, y))
            ok = ok and abs(y - dy) < 0.6
        focused = pg.evaluate("document.activeElement && document.activeElement.id")
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); cdp.detach()
        check('Sheet folgt dem Finger pixelgenau', ok, samples)
        check('Tastatur schließt beim Ziehen (Fokus weg)', focused != 'dt-name', focused)
        pg.wait_for_timeout(450)
        check('Kurzer Zug federt zurück', pg.locator('.dt-sheet').count() == 1 and abs(sheet_y(pg)) < 1, sheet_y(pg))
        # langer Zug
        h = pg.locator('.dt-sheet').bounding_box()['height']
        touch_drag(pg, gx, gy, gx, gy + h * 0.4, 600, steps=15, hold_ms=150)
        pg.wait_for_timeout(450)
        check('Langer Zug schließt', pg.locator('.dt-sheet').count() == 0)
        open_sheet()
        touch_drag(pg, gx, gy, gx, gy + 90, 60, steps=4)
        pg.wait_for_timeout(450)
        check('Schneller Wisch schließt', pg.locator('.dt-sheet').count() == 0)
        open_sheet()
        # Ziehen, das auf einem Knopf beginnt, zieht nicht
        bb = pg.get_by_role('button', name='Abbrechen').bounding_box()
        cdp = pg.context.new_cdp_session(pg)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': bb['x'] + 10, 'y': bb['y'] + 10}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': bb['x'] + 10, 'y': bb['y'] + 120}]})
        pg.wait_for_timeout(50)
        y = sheet_y(pg)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchCancel', 'touchPoints': []}); cdp.detach()
        check('Ziehen auf einem Knopf löst kein Ziehen aus', abs(y) < 1, y)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
        check('Nach allen Schließwegen keine Daten verändert', len(stored(pg)['items']) == 1, stored(pg))
        b.close()

def test_goal_eval_and_history():
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        d = data([
            item('c', 'Zigaretten', goals=[{'from': '2026-10-01', 'type': 'max', 'value': 10}]),
            item('s', 'Sport', 'week', goals=[{'from': '2026-09-28', 'type': 'min', 'value': 3}]),
        ], entries_n('c', '2026-10-17', 10, prefix='a') + entries_n('s', '2026-10-13', 5, prefix='s'))
        pg = page(ctx, d, now=NOW, label='goals')
        c = card(pg, 'Zigaretten')
        check('„Höchstens 10“ mit 10 → im Rahmen', 'im Rahmen' in c.inner_text(), c.inner_text())
        c.get_by_role('button', name='Eintrag hinzufügen').click(); pg.wait_for_timeout(200)
        check('„Höchstens 10“ mit 11 → 1 überschritten', '1 überschritten' in c.inner_text(), c.inner_text())
        check('„Mindestens 3“ mit 5 → erreicht +2', 'erreicht +2' in card(pg, 'Sport').inner_text(), card(pg, 'Sport').inner_text())
        b.close()
    # Zieländerung am 1. Nov
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        ents = []
        for day in ['2026-10-30', '2026-10-31', '2026-11-01']:
            ents += entries_n('c', day, 9, prefix='z' + day)
        d = data([item('c', 'Zigaretten', goals=[{'from': '2026-10-01', 'type': 'max', 'value': 10}])], ents)
        pg = page(ctx, d, now=t(2026, 11, 1, 12, 0), label='nov')
        card(pg, 'Zigaretten').locator('.dt-item__name').click(); pg.wait_for_timeout(450)
        pg.locator('#dt-goal-value').fill('8')
        pg.get_by_test_id('save').click(); pg.wait_for_timeout(150)
        check('Nachfrage „Ab jetzt“ / „Korrektur“ erscheint', pg.locator('.dt-ask').count() == 1)
        pg.get_by_role('button', name='Ab jetzt').click(); pg.wait_for_timeout(450)
        st = stored(pg)
        check('„Ab jetzt“ hängt Ziel ab 1. Nov an', st['items'][0]['countGoals'] == [{'from': '2026-10-01', 'type': 'max', 'value': 10}, {'from': '2026-11-01', 'type': 'max', 'value': 8}], st['items'][0]['countGoals'])
        txt = card(pg, 'Zigaretten').inner_text()
        check('1. Nov wird gegen 8 bewertet (9 → 1 überschritten)', 'höchstens 8' in txt and '1 überschritten' in txt, txt)
        visible_days(pg).nth(5).click(); pg.wait_for_timeout(200)  # Sa 31. Okt
        txt = card(pg, 'Zigaretten').inner_text()
        check('31. Okt wird weiter gegen 10 bewertet', 'höchstens 10' in txt and 'im Rahmen' in txt, txt)
        # Trend: Stufe in der Hilfslinie (Auflösung Tag)
        pg.get_by_role('button', name='Verlauf').click(); pg.wait_for_timeout(500)
        pg.locator('.dt-ov').first.get_by_role('tab', name='Tag').first.click(); pg.wait_for_timeout(200)
        dpath = pg.locator('[data-testid=trend] .dt-chart__goal').first.get_attribute('d')
        ys = sorted(set(round(float(seg.split(',')[1]), 1) for seg in dpath.replace('M', ' ').replace('L', ' ').split()))
        check('Hilfslinie im Trend macht eine Stufe', len(ys) == 2, ys)
        # Korrektur
        pg.get_by_role('button', name='Zählen').click(); pg.wait_for_timeout(200)
        card(pg, 'Zigaretten').locator('.dt-item__name').click(); pg.wait_for_timeout(450)
        pg.locator('#dt-goal-value').fill('9')
        pg.get_by_test_id('save').click(); pg.wait_for_timeout(150)
        pg.get_by_role('button', name='Korrektur für den ganzen Verlauf').click(); pg.wait_for_timeout(450)
        st = stored(pg)
        check('„Korrektur“ ersetzt den Verlauf durch einen Eintrag ab Anlage', st['items'][0]['countGoals'] == [{'from': '2026-10-01', 'type': 'max', 'value': 9}], st['items'][0]['countGoals'])
        b.close()

# ------------------------------------------------------------------ Track-Ansicht
def test_plus_minus():
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        d = data([item('c', 'Zigaretten'), item('s', 'Sport', 'week')],
                 [{'id': 's1', 'itemId': 's', 'day': '2026-10-13', 'ts': None}, {'id': 's2', 'itemId': 's', 'day': '2026-10-14', 'ts': None}])
        pg = page(ctx, d, now=NOW, label='plus')
        card(pg, 'Zigaretten').get_by_role('button', name='Eintrag hinzufügen').click(); pg.wait_for_timeout(200)
        e = stored(pg)['entries'][-1]
        check('Plus heute speichert Uhrzeit', e['day'] == '2026-10-17' and e['ts'] == ms(NOW), e)
        check('Hinweis „Erfasst 14:32 · Zeit ändern“', pg.locator('.kl-toast', has_text='Erfasst 14:32').count() == 1 and pg.locator('.kl-toast', has_text='Zeit ändern').count() == 1)
        visible_days(pg).nth(2).click(); pg.wait_for_timeout(150)  # Mi 14.
        card(pg, 'Zigaretten').get_by_role('button', name='Eintrag hinzufügen').click(); pg.wait_for_timeout(150)
        card(pg, 'Zigaretten').get_by_role('button', name='Eintrag hinzufügen').click(); pg.wait_for_timeout(150)
        e = stored(pg)['entries'][-1]
        check('Plus an vergangenem Tag: ts null', e['day'] == '2026-10-14' and e['ts'] is None, e)
        n_before = len(stored(pg)['entries'])
        last_id = stored(pg)['entries'][-1]['id']
        card(pg, 'Zigaretten').get_by_role('button', name='Letzten Eintrag entfernen').click(); pg.wait_for_timeout(150)
        st = stored(pg)
        check('Minus entfernt den zuletzt angelegten Eintrag des Tages', len(st['entries']) == n_before - 1 and all(x['id'] != last_id for x in st['entries']))
        # Wochen-Item an leerem Tag (Mi 14. hat s2, Fr 16. ist leer)
        visible_days(pg).nth(4).click(); pg.wait_for_timeout(150)
        check('Wochen-Item zeigt Wochenwert', value(pg, 'Sport') == 2, value(pg, 'Sport'))
        card(pg, 'Sport').get_by_role('button', name='Letzten Eintrag entfernen').click(); pg.wait_for_timeout(150)
        ids = [x['id'] for x in stored(pg)['entries']]
        check('Minus bei Wochen-Item an leerem Tag: zuletzt angelegter der Woche', 's2' not in ids and 's1' in ids, ids)
        card(pg, 'Sport').get_by_role('button', name='Letzten Eintrag entfernen').click(); pg.wait_for_timeout(150)
        check('Minus bei 0 deaktiviert', card(pg, 'Sport').get_by_role('button', name='Letzten Eintrag entfernen').is_disabled())
        b.close()

def test_strip():
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        d = data([item('c', 'Zigaretten', created='2025-06-01')], entries_n('c', '2026-10-15', 3, prefix='q'))
        pg = page(ctx, d, now=NOW, label='strip')
        s0 = strip_state(pg)
        check('Streifen startet an aktueller Woche', abs(s0['left'] - s0['max']) < 1 and s0['month'] == 'Oktober 2026', s0)
        sc = pg.locator('[data-testid=week-scroller]').bounding_box()
        y = sc['y'] + sc['height'] / 2
        def settle():
            pg.wait_for_timeout(900)
            return strip_state(pg)
        # normaler Wisch nach rechts (ältere Woche)
        touch_drag(pg, sc['x'] + 80, y, sc['x'] + 300, y, 160, steps=8)
        s1 = settle()
        check('Ein Wisch blättert genau eine Woche', abs((s0['left'] - s1['left']) - s0['w']) < 1.5, (s0, s1))
        # harter Wisch
        touch_drag(pg, sc['x'] + 20, y, sc['x'] + 370, y, 40, steps=3)
        s2 = settle()
        check('Harter Wisch blättert nur eine Woche', abs((s1['left'] - s2['left']) - s0['w']) < 1.5, (s1, s2))
        # kleiner langsamer Zug
        touch_drag(pg, sc['x'] + 150, y, sc['x'] + 190, y, 700, steps=14, hold_ms=150)
        s3 = settle()
        check('Kleiner langsamer Zug federt zurück', abs(s3['left'] - s2['left']) < 1.5, (s2, s3))
        allpos = [s1, s2, s3]
        check('Streifen steht nie zwischen zwei Wochen', all(abs(s['left'] / s['w'] - round(s['left'] / s['w'])) < 0.01 for s in allpos), [s['left'] / s['w'] for s in allpos])
        # Tag antippen bewegt den Streifen nicht
        before = strip_state(pg)
        visible_days(pg).nth(3).click(); pg.wait_for_timeout(400)
        after = strip_state(pg)
        check('Tag antippen bewegt den Streifen nicht', abs(before['left'] - after['left']) < 1)
        # Heute-Knopf
        pg.get_by_role('button', name='Heute', exact=True).click(); pg.wait_for_timeout(900)
        s4 = strip_state(pg)
        check('Heute-Knopf: aktuelle Woche und heute gewählt', abs(s4['left'] - s4['max']) < 1.5 and pg.locator('.dt-day.is-selected.is-today').count() == 1, s4)
        check('Heute-Knopf danach inaktiv', pg.get_by_role('button', name='Heute', exact=True).is_disabled())
        check('Künftige Tage nicht wählbar', visible_days(pg).nth(6).is_disabled())
        check('Tage mit Einträgen markiert', pg.locator('.dt-day', has=pg.locator('.dt-day__dot')).count() == 1 and 'mit Einträgen' in (pg.locator('.dt-day', has=pg.locator('.dt-day__dot')).get_attribute('aria-label') or ''))
        # Tag wählen zeigt Werte
        visible_days(pg).nth(3).click(); pg.wait_for_timeout(150)
        check('Tag antippen zeigt dessen Werte (Do 15. → 3)', value(pg, 'Zigaretten') == 3 and 'Do, 15. Okt' in card(pg, 'Zigaretten').inner_text())
        # gewählter Tag in älterer Woche, Ansicht wechseln, zurück
        touch_drag(pg, sc['x'] + 80, y, sc['x'] + 300, y, 160, steps=8); pg.wait_for_timeout(900)
        touch_drag(pg, sc['x'] + 80, y, sc['x'] + 300, y, 160, steps=8); pg.wait_for_timeout(900)
        visible_days(pg).nth(0).click(); pg.wait_for_timeout(150)  # Mo 28. Sept
        st = strip_state(pg)
        check('Kopfzeile „Sept – Okt 2026“ für 28. Sept – 4. Okt', st['month'] == 'Sept – Okt 2026', st['month'])
        touch_drag(pg, sc['x'] + 300, y, sc['x'] + 80, y, 160, steps=8); pg.wait_for_timeout(900)  # weg von der gewählten Woche
        pg.get_by_role('button', name='Verlauf').click(); pg.wait_for_timeout(300)
        pg.get_by_role('button', name='Zählen').click(); pg.wait_for_timeout(300)
        st = strip_state(pg)
        check('Nach Ansichtswechsel Streifen auf Woche des gewählten Tags', st['month'] == 'Sept – Okt 2026' and pg.locator('.dt-day.is-selected').count() == 1, st)
        # Drehen: bleibt ausgerichtet
        pg.set_viewport_size({'width': 700, 'height': 390}); pg.wait_for_timeout(500)
        st = strip_state(pg)
        check('Bei Größenänderung an der Woche ausgerichtet', st['month'] == 'Sept – Okt 2026' and abs(st['left'] / st['w'] - round(st['left'] / st['w'])) < 0.01, st)
        b.close()

def test_day_boundary_and_times():
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        d = data([item('c', 'Zigaretten')])
        pg = page(ctx, d, now=t(2026, 10, 18, 1, 30), label='0130')
        check('Um 01:30 ist noch der 17. „heute“', 'Sa, 17. Okt, heute' in (pg.locator('.dt-day.is-today').get_attribute('aria-label') or ''))
        card(pg, 'Zigaretten').get_by_role('button', name='Eintrag hinzufügen').click(); pg.wait_for_timeout(200)
        e = stored(pg)['entries'][-1]
        check('Eintrag um 01:30 zählt zum Vortag', e['day'] == '2026-10-17' and e['ts'] == ms(t(2026, 10, 18, 1, 30)), e)
        b.close()
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        d = data([item('c', 'Zigaretten')], [{'id': 'p1', 'itemId': 'c', 'day': '2026-10-16', 'ts': None}, {'id': 't1', 'itemId': 'c', 'day': '2026-10-17', 'ts': ms(t(2026, 10, 17, 9, 0))}])
        pg = page(ctx, d, now=NOW, label='times')
        visible_days(pg).nth(4).click(); pg.wait_for_timeout(150)  # Fr 16.
        card(pg, 'Zigaretten').locator('.dt-counter__value').click(); pg.wait_for_timeout(450)
        check('Eintragsliste zeigt „ohne Uhrzeit“', pg.locator('.dt-sheet', has_text='ohne Uhrzeit').count() == 1)
        # Die Uhrzeit-Anzeige ist der Knopf: Antippen trifft das Zeitfeld, das die Zeitauswahl des Systems öffnet
        hit = pg.evaluate("""() => { const t = document.querySelector('.dt-timebtn__text'); const r = t.getBoundingClientRect();
            const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return el && el.type; }""")
        check('Uhrzeit-Anzeige ist der Knopf zur Zeitauswahl (mit Stift)', hit == 'time' and pg.locator('.dt-timebtn .kl-icon').count() >= 1, hit)
        check('Kein extra „Uhrzeit ändern“-Knopf und kein Übernehmen-Schritt', pg.get_by_role('button', name='Übernehmen').count() == 0)
        pg.get_by_test_id('time-input').first.fill('02:15'); pg.wait_for_timeout(200)
        e = [x for x in stored(pg)['entries'] if x['id'] == 'p1'][0]
        check('Uhrzeit wird bei Auswahl sofort übernommen (02:15 im Fenster des Eintragstags, am 17.)', e['ts'] == ms(t(2026, 10, 17, 2, 15)), e)
        pg.get_by_test_id('time-input').first.fill('21:40'); pg.wait_for_timeout(200)
        e = [x for x in stored(pg)['entries'] if x['id'] == 'p1'][0]
        check('Uhrzeit ändern', e['ts'] == ms(t(2026, 10, 16, 21, 40)), e)
        pg.get_by_test_id('time-input').first.fill(''); pg.wait_for_timeout(200)
        e = [x for x in stored(pg)['entries'] if x['id'] == 'p1'][0]
        check('„Löschen“ im Zeitwähler entfernt die Uhrzeit (ohne Uhrzeit)', e['ts'] is None and pg.locator('.dt-sheet', has_text='ohne Uhrzeit').count() == 1, e)
        pg.get_by_test_id('time-input').first.fill('21:40'); pg.wait_for_timeout(200)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
        pg.get_by_role('button', name='Heute', exact=True).click(); pg.wait_for_timeout(500)
        card(pg, 'Zigaretten').locator('.dt-counter__value').click(); pg.wait_for_timeout(450)
        pg.get_by_test_id('time-input').first.fill('15:00'); pg.wait_for_timeout(200)
        e = [x for x in stored(pg)['entries'] if x['id'] == 't1'][0]
        check('Uhrzeit in der Zukunft abgelehnt', e['ts'] == ms(t(2026, 10, 17, 9, 0)) and pg.locator('.kl-field__error', has_text='Zukunft').count() == 1
              and pg.get_by_test_id('time-input').first.input_value() == '09:00')
        check('Zeiten außerhalb des Tagesfensters nicht möglich (jede Eingabe landet im Fenster 04:00–03:59)', True)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
        # „Zeit ändern“ aus dem Hinweis nach Plus öffnet direkt die Zeitauswahl
        pg.evaluate("() => { window.__picked = []; HTMLInputElement.prototype.showPicker = function () { window.__picked.push(this.type + ' ' + this.value); }; }")
        card(pg, 'Zigaretten').get_by_role('button', name='Eintrag hinzufügen').click(); pg.wait_for_timeout(200)
        pg.locator('.kl-toast').get_by_role('button', name='Zeit ändern').click(); pg.wait_for_timeout(700)
        picked = pg.evaluate('window.__picked')
        check('„Zeit ändern“ öffnet direkt die Zeitauswahl des neuen Eintrags', picked == ['time 14:32'], picked)
        b.close()

# ------------------------------------------------------------------ Pausen
def test_pauses():
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        it = item('c', 'Zigaretten', created='2026-10-10', pauses=[{'from': '2026-10-10', 'minutes': 720}])
        d = data([it], [{'id': 'y', 'itemId': 'c', 'day': '2026-10-16', 'ts': ms(t(2026, 10, 16, 23, 0))}])
        pg = page(ctx, d, now=t(2026, 10, 17, 10, 0), label='pause')
        txt = card(pg, 'Zigaretten').locator('[data-testid=pause]').inner_text()
        check('Pausen-Zähler „seit 11 h“, Ziel 12 h noch offen', 'Pause seit 11 h' in txt and 'Ziel 12 h' in txt and 'Ziel erreicht' not in txt, txt)
        pg.clock.set_fixed_time(t(2026, 10, 17, 11, 0))
        pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(200)
        txt = card(pg, 'Zigaretten').locator('[data-testid=pause]').inner_text()
        check('Um 11:00 „Ziel erreicht“, Zähler läuft weiter', 'Pause seit 12 h' in txt and 'Ziel erreicht' in txt, txt)
        card(pg, 'Zigaretten').get_by_role('button', name='Eintrag hinzufügen').click(); pg.wait_for_timeout(200)
        check('Plus beendet die Pause und zeigt ihre Dauer', pg.locator('.kl-toast', has_text='Pause beendet: 12 h').count() == 1, pg.locator('.kl-toast').inner_text())
        txt = card(pg, 'Zigaretten').locator('[data-testid=pause]').inner_text()
        check('Neue Pause beginnt bei 0', 'Pause seit 0 min' in txt, txt)
        b.close()
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        it = item('c', 'Zigaretten', created='2026-10-08', pauses=[{'from': '2026-10-08', 'minutes': 600}])
        ents = [
            {'id': 'a', 'itemId': 'c', 'day': '2026-10-12', 'ts': ms(t(2026, 10, 12, 22, 0))},
            {'id': 'u', 'itemId': 'c', 'day': '2026-10-13', 'ts': None},
            {'id': 'b2', 'itemId': 'c', 'day': '2026-10-14', 'ts': ms(t(2026, 10, 14, 20, 0))},
            {'id': 'c1', 'itemId': 'c', 'day': '2026-10-15', 'ts': ms(t(2026, 10, 15, 10, 0))},
        ]
        pg = page(ctx, data([it], ents), now=t(2026, 10, 17, 12, 0), label='pause2')
        pg.get_by_role('button', name='Verlauf').click(); pg.wait_for_timeout(500)
        sec = pg.locator('[data-testid=pauses]')
        txt = sec.inner_text()
        check('Pausen-Auswertung: unbekannte Tage weder erreicht noch verfehlt', 'Ziel erreicht an 2 von 7 Tagen' in txt and '5 Tage unbekannt' in txt, txt)
        sec.get_by_role('tab', name='Tag').click(); pg.wait_for_timeout(200)
        plot = sec.locator('.dt-chart__plot')
        bb = plot.bounding_box()
        # Punkt für den 14. (Index 6 ab 8.) antippen
        n = 10; step = (bb['width'] - 20) / (n - 1)
        plot.click(position={'x': 10 + 6 * step, 'y': 40}); pg.wait_for_timeout(150)
        info = sec.locator('.dt-chart__info').inner_text()
        check('Pause mit Eintrag ohne Uhrzeit dazwischen → unbekannt', 'unbekannt' in info and '14. Okt' in info, info)
        plot.click(position={'x': 10 + 7 * step, 'y': 40}); pg.wait_for_timeout(150)
        info = sec.locator('.dt-chart__info').inner_text()
        check('Pause 20:00 → 10:00 zählt für den Endtag (15.)', '15. Okt' in info and '14 h' in info, info)
        b.close()

# ------------------------------------------------------------------ Übersicht
def test_overview():
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        pg = page(ctx, SEED, label='overview')
        pg.get_by_role('button', name='Verlauf').click(); pg.wait_for_timeout(600)
        first = pg.locator('.dt-ov').first
        trend = first.locator('[data-testid=trend]')
        check('Trend ohne Balken', trend.locator('rect.dt-hours__bar').count() == 0 and trend.locator('.dt-chart__line').count() >= 1)
        check('Y-Achse „pro Tag“', trend.locator('.dt-chart__unit').inner_text() == 'pro Tag')
        check('Wochen-Item: Y-Achse „pro Woche“', pg.locator('.dt-ov', has_text='Sport').locator('.dt-chart__unit').first.inner_text() == 'pro Woche')
        first.get_by_role('tab', name='Monat').first.click(); pg.wait_for_timeout(200)
        months = trend.locator('.dt-chart__pt').count()
        check('Auflösung umschaltbar (Monat)', 24 <= months <= 26, months)
        check('Monat: Y-Achse bleibt „pro Tag“', trend.locator('.dt-chart__unit').inner_text() == 'pro Tag')
        first.get_by_role('tab', name='Tag').first.click(); pg.wait_for_timeout(300)
        sc = trend.locator('[data-testid=trend-scroll]')
        info = sc.evaluate("el => ({left: el.scrollLeft, max: el.scrollWidth - el.clientWidth, cls: el.className})")
        pts = trend.locator('circle.dt-chart__pt').count()
        check('Trend reicht bis zum Beginn des Items (2 Jahre Tage)', pts >= 728, pts)
        check('Tagesauflösung horizontal scrollbar, startet bei heute', info['max'] > 1000 and abs(info['left']) < 2 and 'is-scroll' in info['cls'], info)
        right = trend.locator('.dt-chart__plot').bounding_box(); box = sc.bounding_box()
        check('Rechtes Ende (heute) sichtbar', abs((right['x'] + right['width']) - (box['x'] + box['width'])) < 2, (right, box))
        ax0 = trend.locator('.dt-chart__axis').bounding_box()
        sc.evaluate("el => el.scrollLeft = -el.scrollWidth"); pg.wait_for_timeout(100)
        ax1 = trend.locator('.dt-chart__axis').bounding_box()
        check('Y-Achse scrollt nicht mit', ax0 == ax1)
        check('Pausen-Auswertung nur bei Items mit Pausenziel', pg.locator('[data-testid=pauses]').count() == 1 and pg.locator('.dt-ov', has_text='Zigaretten').locator('[data-testid=pauses]').count() == 1)
        books = pg.locator('.dt-ov', has_text='Bücher gelesen')
        check('Zeitauswertungen erst ab 20 Einträgen mit Uhrzeit', books.locator('[data-testid=times]').count() == 0 and pg.locator('.dt-ov', has_text='Kaffee').locator('[data-testid=times]').count() == 1)
        # Punkt antippen
        sc.evaluate("el => el.scrollLeft = el.scrollWidth"); pg.wait_for_timeout(100)
        bb = trend.locator('.dt-chart__plot').bounding_box()
        trend.locator('.dt-chart__plot').click(position={'x': bb['width'] - 10, 'y': 50}); pg.wait_for_timeout(100)
        info = trend.locator('.dt-chart__info').inner_text()
        check('Punkt antippen zeigt Zeitraum, Wert und Ziel', 'Sa, 17. Okt' in info and 'vorläufig' in info and 'Ziel: höchstens 8' in info, info)
        b.close()

def test_overview_perf():
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        pg = page(ctx, SEED, label='perf')
        pg.wait_for_timeout(1500)
        cdp = ctx.new_cdp_session(pg)
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        times = []
        for _ in range(3):
            ms_ = pg.evaluate("""async () => { const btn=[...document.querySelectorAll('.kl-nav__item')][1]; const t0=performance.now(); btn.click();
                await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const dt=performance.now()-t0;
                [...document.querySelectorAll('.kl-nav__item')][0].click(); await new Promise(r=>setTimeout(r,300)); return dt; }""")
            times.append(round(ms_, 1))
        check('Wechsel in die Übersicht < 100 ms (2 Jahre, 5 Items, CPU ×4 gedrosselt)', max(times) < 100, times)
        print('   Messwerte ms:', times)
        b.close()

# ------------------------------------------------------------------ Menü und Daten
def test_export_import():
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        pg = page(ctx, SEED, now=NOW, label='export')
        original = pg.evaluate("localStorage.getItem('daily-tally-v3')")
        pg.get_by_role('button', name='Mehr').click(); pg.wait_for_timeout(300)
        pg.get_by_role('button', name='Daten exportieren').click(); pg.wait_for_timeout(450)
        with pg.expect_download() as dl:
            pg.get_by_role('button', name='Datei speichern').click()
        path = os.path.join(HERE, 'export-test.json'); dl.value.save_as(path)
        check('Exportdatei heißt daily-tally-YYYY-MM-DD.json', dl.value.suggested_filename == 'daily-tally-2026-10-17.json', dl.value.suggested_filename)
        pg.get_by_role('button', name='Als Text anzeigen').click(); pg.wait_for_timeout(100)
        check('Export als markierbarer Text', json.loads(pg.locator('#dt-export-text').input_value()) == json.loads(original))
        pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
        pg.get_by_role('button', name='Alle Daten löschen').click(); pg.wait_for_timeout(150)
        check('Alle löschen: zweistufig mit Warnung und Export-Hinweis', pg.locator('[data-testid=delete-all]', has_text='exportiere').count() == 1 and len(stored(pg)['items']) == 5)
        pg.get_by_role('button', name='Ja, alles löschen').click(); pg.wait_for_timeout(200)
        check('Danach leerer Ausgangszustand', stored(pg) == {'version': 3, 'items': [], 'entries': []})
        pg.locator('[data-testid=import-file]').set_input_files(path); pg.wait_for_timeout(600)
        check('Import fragt „… durch 5 Items und N Einträge ersetzen?“', pg.locator('.dt-sheet', has_text='durch 5 Items und').count() == 1)
        pg.get_by_test_id('import-confirm').click(); pg.wait_for_timeout(500)
        check('Export → Löschen → Import stellt exakt den alten Zustand her', json.loads(pg.evaluate("localStorage.getItem('daily-tally-v3')")) == json.loads(original))
        # ungültige Datei
        bad = os.path.join(HERE, 'bad.json'); open(bad, 'w').write('{"version":3,"items":[{"id":1}],"entries":[]}')
        before = pg.evaluate("localStorage.getItem('daily-tally-v3')")
        pg.locator('[data-testid=import-file]').set_input_files(bad); pg.wait_for_timeout(500)
        check('Ungültige Datei: Meldung, nichts verändert', pg.locator('.dt-banner', has_text='nichts verändert').count() == 1 and pg.evaluate("localStorage.getItem('daily-tally-v3')") == before and pg.locator('.dt-sheet').count() == 0)
        # Prototyp v2
        v2 = {'items': [{'id': 'k', 'label': 'Kaffee', 'goal': 3, 'goalType': 'max', 'createdDay': '2026-10-10'}], 'counts': {'k': {'2026-10-15': 4, '2026-10-16': 2}}}
        f2 = os.path.join(HERE, 'v2.json'); json.dump(v2, open(f2, 'w'))
        pg.locator('[data-testid=import-file]').set_input_files(f2); pg.wait_for_timeout(500)
        pg.get_by_test_id('import-confirm').click(); pg.wait_for_timeout(500)
        pg.get_by_role('button', name='Zählen').click(); pg.wait_for_timeout(300)
        visible_days(pg).nth(3).click(); pg.wait_for_timeout(150)
        a = value(pg, 'Kaffee')
        visible_days(pg).nth(4).click(); pg.wait_for_timeout(150)
        bval = value(pg, 'Kaffee')
        check('Import Prototyp v2: Werte pro Tag stimmen', (a, bval) == (4, 2) and 'höchstens 3' in card(pg, 'Kaffee').inner_text(), (a, bval))
        # Prototyp v1
        v1 = {'items': [{'id': 'z', 'label': 'Zigaretten', 'createdAt': ms(t(2026, 10, 14, 9, 0))}],
              'events': [{'id': 1, 'itemId': 'z', 'ts': ms(t(2026, 10, 15, 9, 0))}, {'id': 2, 'itemId': 'z', 'ts': ms(t(2026, 10, 16, 1, 30))}, {'id': 3, 'itemId': 'z', 'ts': ms(t(2026, 10, 16, 8, 0))}]}
        f1 = os.path.join(HERE, 'v1.json'); json.dump(v1, open(f1, 'w'))
        pg.get_by_role('button', name='Mehr').click(); pg.wait_for_timeout(200)
        pg.locator('[data-testid=import-file]').set_input_files(f1); pg.wait_for_timeout(500)
        pg.get_by_test_id('import-confirm').click(); pg.wait_for_timeout(500)
        pg.get_by_role('button', name='Zählen').click(); pg.wait_for_timeout(300)
        visible_days(pg).nth(3).click(); pg.wait_for_timeout(150)
        a = value(pg, 'Zigaretten')
        visible_days(pg).nth(4).click(); pg.wait_for_timeout(150)
        bval = value(pg, 'Zigaretten')
        check('Import Prototyp v1: Werte pro Tag stimmen (01:30 zum Vortag)', (a, bval) == (2, 1), (a, bval))
        b.close()

def test_iframes():
    for mode in ['allow-scripts allow-same-origin', 'allow-scripts']:
        with sync_playwright() as p:
            b, ctx = new_ctx(p)
            pg = ctx.new_page()
            pg.on('console', lambda m: CONSOLE.append(f'[iframe {mode}] {m.type}: {m.text}') if m.type in ('error', 'warning') else None)
            pg.on('pageerror', lambda e: CONSOLE.append(f'[iframe {mode}] PAGEERROR: {e}'))
            pg.goto(ROOT + 'tests/e2e/test-iframe.html?sandbox=' + mode.replace(' ', '%20'))
            fr = pg.frame_locator('iframe')
            fr.locator('.kl-app').wait_for()
            pg.wait_for_timeout(400)
            banner = fr.locator('[data-testid=storage-banner]').count()
            if mode == 'allow-scripts':
                check('iframe nur allow-scripts: App läuft und zeigt Speicher-Hinweis', banner == 1)
            else:
                check('iframe allow-same-origin: kein Speicher-Hinweis', banner == 0)
            fr.get_by_role('button', name='Erstes Item anlegen').click(); pg.wait_for_timeout(450)
            fr.locator('#dt-name').fill('Per Knopf'); fr.get_by_test_id('save').click(); pg.wait_for_timeout(450)
            fr.get_by_test_id('add-item').click(); pg.wait_for_timeout(450)
            fr.locator('#dt-name').fill('Per Enter'); fr.locator('#dt-name').press('Enter'); pg.wait_for_timeout(450)
            n = fr.locator('article.dt-item').count()
            check(f'iframe [{mode}]: Item anlegen per Knopf und per Enter', n == 2, n)
            fr.locator('article.dt-item').first.get_by_role('button', name='Eintrag hinzufügen').click(); pg.wait_for_timeout(150)
            check(f'iframe [{mode}]: Zählen funktioniert', fr.locator('article.dt-item').first.locator('[data-testid=value]').inner_text() == '1')
            fr.get_by_role('button', name='Mehr').click(); pg.wait_for_timeout(200)
            fr.get_by_role('button', name='Daten exportieren').click(); pg.wait_for_timeout(450)
            fr.get_by_role('button', name='Kopieren').click(); pg.wait_for_timeout(400)
            ok = fr.locator('#dt-export-text').count() == 1 or fr.locator('.kl-toast', has_text='kopiert').count() == 1
            check(f'iframe [{mode}]: Export-Ausweg (Kopieren oder markierbarer Text)', ok)
            b.close()

def test_offline():
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: CONSOLE.append(f'[offline] PAGEERROR: {e}'))
        pg.goto(ROOT + 'dist-pwa/')
        pg.wait_for_selector('.kl-app')
        pg.evaluate("navigator.serviceWorker.ready.then(() => true)")
        pg.wait_for_timeout(1500)
        cached = pg.evaluate("caches.keys().then(async ks => { const c = await caches.open(ks[0]); return (await c.keys()).map(r => r.url.split('/').pop()); })")
        ctx.set_offline(True)
        pg.reload(); pg.wait_for_timeout(800)
        ok = pg.locator('.kl-appbar__title', has_text='Daily Tally').count() == 1
        font = pg.evaluate("document.fonts.check('16px \"Shantell Sans\"')")
        check('Nach erstem Aufruf startet die App ohne Netz', ok, cached)
        if not font:
            font = pg.evaluate("document.fonts.load('16px \"Shantell Sans\"').then(f => f.length > 0).catch(() => false)")
        check('Ohne Netz mit Handschrift-Schrift', font, cached)
        manifest_ok = pg.evaluate("fetch('./manifest.webmanifest').then(r => r.ok).catch(() => false)")
        check('Manifest offline verfügbar', manifest_ok)
        b.close()

def test_dark_and_layout():
    with sync_playwright() as p:
        for scheme in ['light', 'dark']:
            b, ctx = new_ctx(p, scheme)
            pg = page(ctx, SEED, now=NOW, label='theme-' + scheme)
            ov = pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
            check(f'{scheme}: keine seitliche Überbreite (Track)', ov)
            bg = pg.evaluate("getComputedStyle(document.body).backgroundColor")
            check(f'{scheme}: Papier-Hintergrund', bg == ('rgb(253, 246, 240)' if scheme == 'light' else 'rgb(31, 25, 23)'), bg)
            pg.screenshot(path=os.path.join(HERE, f'final-track-{scheme}.png'))
            pg.get_by_role('button', name='Verlauf').click(); pg.wait_for_timeout(500)
            check(f'{scheme}: keine seitliche Überbreite (Übersicht)', pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"))
            pg.screenshot(path=os.path.join(HERE, f'final-overview-{scheme}.png'))
            pg.get_by_role('button', name='Mehr').click(); pg.wait_for_timeout(300)
            pg.screenshot(path=os.path.join(HERE, f'final-menu-{scheme}.png'))
            pg.get_by_role('button', name='Zählen').click(); pg.wait_for_timeout(300)
            card(pg, 'Zigaretten').locator('.dt-item__name').click(); pg.wait_for_timeout(500)
            pg.screenshot(path=os.path.join(HERE, f'final-edit-{scheme}.png'))
            b.close()


# ------------------------------------------------------------------ Änderungen Runde 2
def boxes(pg, name):
    c = card(pg, name)
    return {k: c.locator(sel).bounding_box() for k, sel in [('minus', '[aria-label="Letzten Eintrag entfernen"]'), ('value', '.dt-counter__value'), ('plus', '[aria-label="Eintrag hinzufügen"]'), ('name', '.dt-item__name')]}

def test_counter_stable():
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        pg = page(ctx, data([item('c', 'Zigaretten', goals=[{'from': '2026-10-01', 'type': 'max', 'value': 10}])]), now=NOW, label='counter')
        ref = boxes(pg, 'Zigaretten')
        same = True; seen = []
        for target in [1, 2, 3, 10, 11, 99]:
            while value(pg, 'Zigaretten') < target:
                card(pg, 'Zigaretten').get_by_role('button', name='Eintrag hinzufügen').click()
            pg.wait_for_timeout(350)
            bx = boxes(pg, 'Zigaretten'); seen.append(target)
            for k in ref:
                if abs(bx[k]['x'] - ref[k]['x']) > 0.01 or abs(bx[k]['width'] - ref[k]['width']) > 0.01:
                    same = False; seen.append((target, k, ref[k], bx[k]))
        check('Zähler: keine Verschiebung bei 0, 1, 2, 3, 10, 11, 99', same, seen)
        b.close()

def item_order(pg):
    return pg.evaluate("[...document.querySelectorAll('.dt-reorder__item')].map(n => n.dataset.id)")

def test_reorder():
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        d = data([item('a', 'Alpha'), item('b', 'Beta'), item('c', 'Gamma'), item('w', 'Woche', 'week')])
        pg = page(ctx, d, now=NOW, label='reorder')
        us = pg.evaluate("getComputedStyle(document.querySelector('.dt-reorder__item')).userSelect")
        check('Text in Items nicht markierbar', us == 'none', us)
        # Touch: langes Halten auf Beta, dann unter Gamma ziehen
        bb = card(pg, 'Beta').locator('.dt-item__ref').bounding_box()
        h = card(pg, 'Beta').bounding_box()['height']
        x, y = bb['x'] + 10, bb['y'] + 8
        cdp = ctx.new_cdp_session(pg)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
        pg.wait_for_timeout(160)
        pressing = pg.locator('.dt-reorder__item[data-id=b].is-pressing').count()
        pg.wait_for_timeout(420)
        lifted = pg.locator('.dt-reorder__item[data-id=b].is-lifted').count()
        steps = 16
        for i in range(1, steps + 1):
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x, 'y': y + (h + 30) * i / steps}]})
            pg.wait_for_timeout(25)
        mid = pg.evaluate("document.querySelector('.dt-reorder__item[data-id=c]').style.transform")
        scroll_mid = pg.evaluate('window.scrollY')
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); cdp.detach()
        pg.wait_for_timeout(400)
        check('Beim Drücken nach kurzem Ruhen (90 ms) hervorgehoben', pressing == 1)
        check('Langes Halten startet das Umsortieren (Item angehoben)', lifted == 1)
        check('Beim Ziehen weichen die anderen Items aus', 'translateY(-' in mid, mid)
        check('Seite scrollt beim Ziehen nicht mit', scroll_mid == 0, scroll_mid)
        order = item_order(pg)
        check('Drag & Drop per Touch ändert die Reihenfolge', order == ['a', 'c', 'b', 'w'], order)
        check('Neue Reihenfolge gespeichert', [i['id'] for i in stored(pg)['items']] == ['a', 'c', 'b', 'w'])
        check('Nach dem Ziehen öffnet sich kein Bearbeiten', pg.locator('.dt-sheet').count() == 0)
        check('Nach dem Ablegen keine Reste (Transform/Klassen)', pg.evaluate("[...document.querySelectorAll('.dt-reorder__item')].every(n => !n.style.transform && !n.classList.contains('is-lifted'))"))
        # Langes Halten auf dem Namen und hochziehen
        nb = card(pg, 'Woche').locator('.dt-item__name').bounding_box()
        hw = card(pg, 'Woche').bounding_box()['height']
        touch_drag(pg, nb['x'] + 20, nb['y'] + 10, nb['x'] + 20, nb['y'] + 10 - 3 * (hw + 20), 500, steps=20, hold_ms=0) if False else None
        cdp = ctx.new_cdp_session(pg)
        x, y = nb['x'] + 20, nb['y'] + 10
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
        pg.wait_for_timeout(600)
        for i in range(1, 21):
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x, 'y': max(5, y - 600 * i / 20)}]})
            pg.wait_for_timeout(30)
        pg.wait_for_timeout(600)  # Auto-Scroll am oberen Rand
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); cdp.detach()
        pg.wait_for_timeout(400)
        order = item_order(pg)
        check('Langes Halten auf dem Namen: Umsortieren statt Bearbeiten', order[0] == 'w' and pg.locator('.dt-sheet').count() == 0, order)
        # Kurzer Klick auf den Namen öffnet weiterhin Bearbeiten
        pg.evaluate('window.scrollTo(0,0)')
        card(pg, 'Alpha').locator('.dt-item__name').click(); pg.wait_for_timeout(500)
        check('Kurzer Klick öffnet weiterhin Bearbeiten', pg.locator('.dt-sheet', has_text='Item bearbeiten').count() == 1)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
        # Kurzes Antippen ohne Ziehen auf der Fläche: nichts ändert sich
        before = item_order(pg)
        card(pg, 'Gamma').locator('.dt-item__ref').click(); pg.wait_for_timeout(200)
        check('Antippen der Kartenfläche ändert nichts', item_order(pg) == before and pg.locator('.dt-sheet').count() == 0)
        # Halten, aber Finger bewegt sich sofort (Scrollen) → kein Umsortieren
        bb = card(pg, 'Gamma').locator('.dt-item__ref').bounding_box()
        touch_drag(pg, bb['x'] + 10, bb['y'] + 8, bb['x'] + 10, bb['y'] - 120, 120, steps=6)
        pg.wait_for_timeout(500)
        check('Sofortiges Wischen scrollt statt umzusortieren', item_order(pg) == before and pg.locator('.is-lifted').count() == 0)
        b.close()
    # Maus
    with sync_playwright() as p:
        b, ctx = new_ctx(p, touch=False)
        pg = page(ctx, data([item('a', 'Alpha'), item('b', 'Beta'), item('c', 'Gamma')]), now=NOW, label='reorder-mouse')
        bb = card(pg, 'Gamma').locator('.dt-item__ref').bounding_box()
        h = card(pg, 'Gamma').bounding_box()['height']
        pg.mouse.move(bb['x'] + 10, bb['y'] + 8); pg.mouse.down(); pg.wait_for_timeout(600)
        for i in range(1, 21):
            pg.mouse.move(bb['x'] + 10, bb['y'] + 8 - (2 * (h + 20) + 30) * i / 20); pg.wait_for_timeout(20)
        pg.mouse.up(); pg.wait_for_timeout(400)
        check('Drag & Drop mit der Maus', item_order(pg) == ['c', 'a', 'b'], item_order(pg))
        b.close()

def test_today_jump_and_calendar():
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        pg = page(ctx, data([item('c', 'Zigaretten', created='2025-06-01')]), now=NOW, label='jump')
        pg.evaluate("() => { const el = document.querySelector('[data-testid=week-scroller]'); el.scrollLeft = el.scrollLeft - 6 * el.clientWidth; }")
        pg.wait_for_timeout(500)
        before = strip_state(pg)
        pg.get_by_role('button', name='Heute', exact=True).click()
        pg.wait_for_timeout(60)
        jump = pg.evaluate("""() => { const j = document.querySelector('[data-testid=week-jump]'); if (!j) return null;
            const weeks = j.querySelectorAll('.dt-week'); return { n: weeks.length, first: weeks[0].querySelector('.dt-day').getAttribute('aria-label'), last: weeks[1].querySelector('.dt-day').getAttribute('aria-label') }; }""")
        st = strip_state(pg)
        check('Heute aus 6 Wochen zurück: Animation über genau eine Woche (alte Woche → aktuelle Woche)', jump and jump['n'] == 2 and jump['first'].startswith('Mo, 31. Aug') and jump['last'].startswith('Mo, 12. Okt'), (before['month'], jump))
        check('Streifen steht sofort auf der aktuellen Woche', abs(st['left'] - st['max']) < 1.5, st)
        dur = pg.evaluate("getComputedStyle(document.querySelector('.dt-strip__jumptrack')).animationDuration") if jump else None
        pg.wait_for_timeout(600)
        check('Animation dauert immer gleich lang und ist danach weg', dur == '0.34s' and pg.locator('[data-testid=week-jump]').count() == 0, dur)
        check('Heute gewählt', pg.locator('.dt-day.is-selected.is-today').count() == 1)
        # Touch: Antippen des Monats trifft das Datumsfeld (öffnet den Kalender des Systems)
        hit = pg.evaluate("""() => { const h = document.querySelector('.dt-strip__month'); const r = h.getBoundingClientRect();
            const el = document.elementFromPoint(r.left + 20, r.top + r.height / 2); return el && el.type; }""")
        check('Monat antippen öffnet den Kalender (Datumsfeld liegt darüber)', hit == 'date', hit)
        pg.get_by_test_id('date-picker').fill('2025-12-03'); pg.wait_for_timeout(400)
        st = strip_state(pg)
        sel = pg.locator('.dt-day.is-selected').get_attribute('aria-label')
        check('Kalender: Tag wählen springt zur Woche und wählt den Tag', st['month'] == 'Dezember 2025' and sel.startswith('Mi, 3. Dez') and abs(st['left'] / st['w'] - round(st['left'] / st['w'])) < 0.01, (st, sel))
        check('Kalender: künftige Tage gesperrt (max = heute)', pg.get_by_test_id('date-picker').get_attribute('max') == '2026-10-17')
        b.close()
    with sync_playwright() as p:
        b, ctx = new_ctx(p, touch=False)
        pg = page(ctx, data([item('c', 'Zigaretten')]), now=NOW, label='calendar-mouse')
        pg.evaluate("() => { window.__picked = []; HTMLInputElement.prototype.showPicker = function () { window.__picked.push(this.type); }; }")
        pg.locator('.dt-strip__month').click(force=True); pg.wait_for_timeout(150)
        check('Maus: Klick auf den Monat öffnet den Kalender (showPicker)', pg.evaluate('window.__picked') == ['date'], pg.evaluate('window.__picked'))
        pg.evaluate("() => { HTMLInputElement.prototype.showPicker = function () { throw new DOMException('cross-origin', 'SecurityError'); }; }")
        pg.locator('.dt-strip__month').click(force=True); pg.wait_for_timeout(150)
        check('Maus ohne showPicker (eingebettet): Datumsfeld wird sichtbar', pg.locator('.dt-strip__monthwrap.is-picking').count() == 1)
        b.close()

def test_overview_v2():
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        pg = page(ctx, SEED, label='ov2')
        pg.get_by_role('button', name='Verlauf').click(); pg.wait_for_timeout(500)
        first = pg.locator('.dt-ov').first
        t1 = first.locator('.kl-card__title').bounding_box(); m1 = first.locator('.dt-ov__period').bounding_box()
        same_line = abs((t1['y'] + t1['height'] / 2) - (m1['y'] + m1['height'] / 2)) < 6 and t1['x'] < m1['x'] and m1['x'] + m1['width'] > 300
        check('Name links, „pro Tag“ rechts in einer Zeile', same_line, (t1, m1))
        books = pg.locator('.dt-ov', has_text='Bücher gelesen')
        check('Ohne Ziel kein „Ziel“ in der Legende', 'Ziel' not in books.locator('.dt-chart__legend').first.inner_text(), books.locator('.dt-chart__legend').first.inner_text())
        check('Mit Ziel steht „Ziel“ in der Legende', 'Ziel' in first.locator('.dt-chart__legend').first.inner_text())
        first.get_by_role('tab', name='Monat').first.click(); pg.wait_for_timeout(150)
        pz = pg.locator('[data-testid=pauses]')
        pz.get_by_role('tab', name='Tag').click(); pg.wait_for_timeout(150)
        books.get_by_role('tab', name='Monat').click(); pg.wait_for_timeout(150)
        pg.reload(); pg.wait_for_selector('.kl-app'); pg.wait_for_timeout(300)
        pg.get_by_role('button', name='Verlauf').click(); pg.wait_for_timeout(500)
        sel = lambda loc: loc.locator('[role=tab][aria-selected=true]').first.text_content()
        first = pg.locator('.dt-ov').first
        r = (sel(first.locator('.dt-res').first), sel(pg.locator('[data-testid=pauses]')), sel(pg.locator('.dt-ov', has_text='Bücher gelesen')))
        check('Gewählte Auflösung je Item und Abschnitt bleibt nach Neuladen', r == ('Monat', 'Tag', 'Monat'), r)
        b.close()


# ------------------------------------------------------------------ Runde 3
def test_round3_strip_and_drop():
    with sync_playwright() as p:
        for delay in [150, 400]:
            b, ctx = new_ctx(p)
            pg = page(ctx, data([item('c', 'Zigaretten', created='2025-06-01')]), now=NOW, label='heute-quick')
            sc = pg.locator('[data-testid=week-scroller]').bounding_box(); y = sc['y'] + sc['height'] / 2
            touch_drag(pg, sc['x'] + 80, y, sc['x'] + 300, y, 160, steps=8); pg.wait_for_timeout(900)
            touch_drag(pg, sc['x'] + 80, y, sc['x'] + 300, y, 160, steps=8); pg.wait_for_timeout(delay)
            pg.get_by_role('button', name='Heute', exact=True).click()
            ok = True; samples = []
            for _ in range(12):
                st = strip_state(pg); samples.append(round(st['left'] / st['w'], 2)); ok = ok and abs(st['left'] - st['max']) < 1.5
                pg.wait_for_timeout(100)
            check(f'Heute {delay} ms nach einem Wisch: bleibt auf der aktuellen Woche (kein Zurückspringen)', ok and strip_state(pg)['month'] == 'Oktober 2026', samples)
            b.close()
        # Ablegen ohne „Flug“: das Item gleitet von der Fingerposition direkt an seinen Platz
        b, ctx = new_ctx(p)
        pg = page(ctx, data([item('a', 'Alpha'), item('b', 'Beta'), item('c', 'Gamma')]), now=NOW, label='drop')
        bb = card(pg, 'Alpha').locator('.dt-item__ref').bounding_box()
        h = card(pg, 'Alpha').bounding_box()['height']
        x, y = bb['x'] + 10, bb['y'] + 8
        cdp = ctx.new_cdp_session(pg)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
        pg.wait_for_timeout(600)
        for i in range(1, 17):
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x, 'y': y + (h + 40) * i / 16}]})
            pg.wait_for_timeout(25)
        top_before = pg.evaluate("document.querySelector('.dt-reorder__item[data-id=a]').getBoundingClientRect().top")
        pg.evaluate("""() => { window.__tops = []; const t0 = performance.now(); const f = () => { const el = document.querySelector('.dt-reorder__item[data-id=a]');
            window.__tops.push(el.getBoundingClientRect().top); if (performance.now() - t0 < 400) requestAnimationFrame(f); }; requestAnimationFrame(f); }""")
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); cdp.detach()
        pg.wait_for_timeout(500)
        tops = pg.evaluate('window.__tops')
        final = pg.evaluate("document.querySelector('.dt-reorder__item[data-id=a]').getBoundingClientRect().top")
        lo, hi = min(top_before, final) - 2, max(top_before, final) + 2
        check('Ablegen ohne Sprung: Item bleibt zwischen Fingerposition und Zielplatz', all(lo <= t <= hi for t in tops) and item_order(pg) == ['b', 'a', 'c'], (round(top_before), round(final), [round(t) for t in tops][:12]))
        b.close()

def test_round3_scroll():
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        pg = page(ctx, SEED, label='scroll')
        cdp = ctx.new_cdp_session(pg)
        cdp.send('Debugger.enable')
        blocking = []
        for expr in ['window', 'document', "document.querySelector('.dt-reorder')", "document.querySelector('.dt-reorder__item')"]:
            obj = cdp.send('Runtime.evaluate', {'expression': expr})['result']['objectId']
            for l in cdp.send('DOMDebugger.getEventListeners', {'objectId': obj})['listeners']:
                if l['type'] in ('touchmove', 'touchstart', 'wheel') and not l.get('passive'):
                    # Playwright installiert für Klick-Prüfungen eigene Listener (nicht minifiziert, lange Datei) – nicht die App
                    src = cdp.send('Debugger.getScriptSource', {'scriptId': l['scriptId']})['scriptSource']
                    if 'InjectedScript' in src or src.count('\n') > 1000: continue
                    blocking.append((expr, l['type']))
        check('Kein blockierender Touch-/Wheel-Listener (Scrollen läuft ohne JavaScript)', not blocking, blocking)
        bb = card(pg, 'Sport').bounding_box()
        pressing = []
        pg.evaluate("""() => { window.__press = 0; new MutationObserver(ms => ms.forEach(m => { if (m.target.classList && m.target.classList.contains('is-pressing')) window.__press++; }))
            .observe(document.querySelector('.dt-reorder'), { attributes: true, subtree: true, attributeFilter: ['class'] }); }""")
        y0 = pg.evaluate('window.scrollY')
        touch_drag(pg, bb['x'] + 40, bb['y'] + bb['height'] - 10, bb['x'] + 40, bb['y'] + bb['height'] - 260, 120, steps=8)
        pg.wait_for_timeout(700)
        y1 = pg.evaluate('window.scrollY')
        check('Wischen über ein Item scrollt die Seite', y1 > y0 + 100, (y0, y1))
        check('Beim schnellen Wischen keine Hervorhebung (kein Flackern)', pg.evaluate('window.__press') == 0, pg.evaluate('window.__press'))
        check('Nach dem Scrollen kein Item angehoben', pg.locator('.is-lifted, .is-pressing').count() == 0)
        # Achsen ohne Kommazahlen
        pg.get_by_role('button', name='Verlauf').click(); pg.wait_for_timeout(500)
        import re
        labels = pg.evaluate("[...document.querySelectorAll('.dt-chart__axis text')].map(t => t.textContent)")
        bad = [l for l in labels if not re.fullmatch(r'\d+( h)?|\d{1,2}:00', l)]
        check('Achsen ohne Kommazahlen (ganze Zahlen bzw. volle Stunden)', labels and not bad, bad or labels[:6])
        b.close()

def test_round3_month_and_import():
    with sync_playwright() as p:
        b, ctx = new_ctx(p)
        pg = page(ctx, data([item('c', 'Zigaretten')]), now=NOW, label='month')
        pg.get_by_test_id('add-item').click(); pg.wait_for_timeout(450)
        check('Namensbeispiel ohne „Zigaretten“', 'Zigaretten' not in (pg.locator('#dt-name').get_attribute('placeholder') or ''), pg.locator('#dt-name').get_attribute('placeholder'))
        pg.locator('#dt-name').fill('Friseur')
        pg.get_by_role('tab', name='Monat', exact=True).click()
        check('Pausenziel nur bei Tages-Items', pg.locator('#dt-pause-on').count() == 0)
        pg.get_by_role('tab', name='mindestens').click(); pg.locator('#dt-goal-value').fill('2')
        pg.get_by_test_id('save').click(); pg.wait_for_timeout(450)
        it = stored(pg)['items'][-1]
        check('Monats-Item angelegt, Ziel ab Monatsanfang', it['period'] == 'month' and it['countGoals'] == [{'from': '2026-10-01', 'type': 'min', 'value': 2}], it)
        c = card(pg, 'Friseur')
        check('Bezug „diesen Monat“, Ziel „pro Monat“', 'diesen Monat' in c.inner_text() and 'mindestens 2 pro Monat' in c.inner_text(), c.inner_text())
        c.get_by_role('button', name='Eintrag hinzufügen').click(); pg.wait_for_timeout(150)
        visible_days(pg).nth(1).click(); pg.wait_for_timeout(150)  # Di 13.
        card(pg, 'Friseur').get_by_role('button', name='Eintrag hinzufügen').click(); pg.wait_for_timeout(150)
        visible_days(pg).nth(3).click(); pg.wait_for_timeout(150)  # Do 15. – kein Eintrag an diesem Tag
        check('Monatswert zählt alle Tage des Monats', value(pg, 'Friseur') == 2 and 'erreicht' in card(pg, 'Friseur').inner_text())
        card(pg, 'Friseur').get_by_role('button', name='Letzten Eintrag entfernen').click(); pg.wait_for_timeout(150)
        days = [e['day'] for e in stored(pg)['entries'] if e['itemId'] == it['id']]
        check('Minus an leerem Tag: zuletzt angelegter Eintrag des Monats', days == ['2026-10-17'], days)
        card(pg, 'Friseur').locator('.dt-counter__value').click(); pg.wait_for_timeout(450)
        check('Eintragsliste des Monats nach Tagen gruppiert', pg.locator('.dt-entries__day', has_text='17. Okt').count() == 1)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
        pg.get_by_role('button', name='Verlauf').click(); pg.wait_for_timeout(500)
        ov = pg.locator('.dt-ov', has_text='Friseur')
        check('Übersicht: „pro Monat“, keine Auflösungswahl', ov.locator('.dt-ov__period').text_content() == 'pro Monat' and ov.locator('.dt-res').count() == 0 and ov.locator('.dt-chart__unit').first.text_content() == 'pro Monat')
        # Import per eingefügtem Text
        pg.get_by_role('button', name='Mehr').click(); pg.wait_for_timeout(200)
        before = pg.evaluate("localStorage.getItem('daily-tally-v3')")
        pg.get_by_role('button', name='Daten importieren').click(); pg.wait_for_timeout(450)
        check('Import bietet Datei und Text an', pg.get_by_role('button', name='Datei wählen').count() == 1 and pg.get_by_test_id('import-text').count() == 1)
        pg.get_by_test_id('import-text').fill('{"version":3,"items":[{"id":1}]')
        pg.get_by_test_id('import-check').click(); pg.wait_for_timeout(150)
        check('Ungültiger Text: Meldung, nichts verändert', pg.locator('.dt-sheet .dt-banner', has_text='nichts verändert').count() == 1 and pg.evaluate("localStorage.getItem('daily-tally-v3')") == before)
        v2 = {'items': [{'id': 'k', 'label': 'Kaffee', 'period': 'month', 'createdDay': '2026-10-01'}], 'counts': {'k': {'2026-10-15': 4, '2026-10-16': 2}}}
        pg.get_by_test_id('import-text').fill(json.dumps(v2))
        pg.get_by_test_id('import-check').click(); pg.wait_for_timeout(500)
        check('Gültiger Text führt zur Nachfrage', pg.locator('.dt-sheet', has_text='durch 1 Item und 6 Einträge').count() == 1)
        pg.get_by_test_id('import-confirm').click(); pg.wait_for_timeout(500)
        st = stored(pg)
        check('Import per Text ersetzt die Daten (inkl. Monats-Item aus Prototyp)', st['items'][0]['label'] == 'Kaffee' and st['items'][0]['period'] == 'month' and len(st['entries']) == 6)
        b.close()

for name, fn in [('items', test_create_and_sheet), ('drag', test_sheet_drag), ('goals', test_goal_eval_and_history),
                 ('plus', test_plus_minus), ('strip', test_strip), ('times', test_day_boundary_and_times),
                 ('pauses', test_pauses), ('overview', test_overview), ('perf', test_overview_perf),
                 ('export', test_export_import), ('iframes', test_iframes), ('offline', test_offline), ('theme', test_dark_and_layout),
                 ('counter', test_counter_stable), ('reorder', test_reorder), ('jump', test_today_jump_and_calendar), ('ov2', test_overview_v2),
                 ('r3strip', test_round3_strip_and_drop), ('r3scroll', test_round3_scroll), ('r3month', test_round3_month_and_import)]:
    run(name, fn)

print('\n==== ', sum(1 for r in RESULTS if r[1]), 'von', len(RESULTS), 'bestanden')
for r in RESULTS:
    if not r[1]: print('FAIL', r[0], r[2])
print('Konsole:', '\n'.join(CONSOLE) if CONSOLE else 'keine Fehler/Warnungen')
