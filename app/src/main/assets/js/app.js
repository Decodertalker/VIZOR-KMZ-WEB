/* Vizor G — lógica principal */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const D2R = Math.PI / 180;

  /* ---------- iconos ---------- */
  const ICONS = {
    menu: 'M4 7h16M4 12h16M4 17h10', search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
    locate: 'M12 3v3M12 18v3M3 12h3M18 12h3M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z',
    layers: 'M12 3l9 5-9 5-9-5 9-5zM3 12.5l9 5 9-5M3 16.5l9 5 9-5',
    ruler: 'M3.5 16.5l13-13 4 4-13 13-4-4zM8 8l2.5 2.5M11 5l2 2M5 11l2 2M13 13l2.5 2.5',
    plus: 'M12 5v14M5 12h14', x: 'M6 6l12 12M18 6L6 18',
    nav: 'M3.5 11.2l16-7.2-7.2 16-2.2-6.6-6.6-2.2z', pin: 'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4', trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6',
    copy: 'M9 9h11v11H9zM5 15V4h11', share: 'M12 15V3M7 8l5-5 5 5M5 14v6h14v-6',
    download: 'M12 3v12M7 10l5 5 5-5M5 20h14', upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
    map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14', moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
    check: 'M5 12.5l5 5 9-10', undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
    reset: 'M4 4v6h6M20 20v-6h-6M20 9A8 8 0 0 0 6 6L4 10M4 15a8 8 0 0 0 14 3l2-4',
    cloud: 'M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 20 10a4 4 0 0 1-1 8M12 11v7M9 15l3 3 3-3',
    offline: 'M3 3l18 18M9 9a8 8 0 0 0-5 3M5.5 15.5a8 8 0 0 1 4-2M12 19.5h.01M15 11a8 8 0 0 1 5 2M17 14.5a5 5 0 0 0-2-.8',
    app: 'M12 3v11M8 10l4 4 4-4M4 17v3h16v-3', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', team: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6.5 6.5 0 0 1 3.5 6', clip: 'M9 4h6l1 2h3v15H5V6h3l1-2zM9 12h6M9 16h6', phone: 'M6 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 2-3z', chat: 'M4 5h16v11H9l-5 4V5z', box: 'M4 8l8-4 8 4v8l-8 4-8-4V8zM4 8l8 4 8-4M12 12v8'
  };
  function hydrate(root) {
    (root || document).querySelectorAll('i[data-i]').forEach(el => {
      if (!el.firstChild) el.innerHTML = '<svg viewBox="0 0 24 24"><path d="' + (ICONS[el.dataset.i] || '') + '"/></svg>';
    });
  }
  const ic = n => '<i data-i="' + n + '"></i>';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = s => String(s || '').toUpperCase().replace(/\s+/g, '');

  /* ---------- estado ---------- */
  const SETTINGS_KEY = 'cajas.settings.v1';
  const S = {
    feats: [], pts: [], areas: [], lines: [], nextId: 1, sel: null, selAreas: [], pos: null,
    layers: { cajas: true, areas: true, rutas: true, etiquetas: true }, base: 'dark', theme: 'dark', themeMode: 'auto',
    radius: 1000, follow: false, userMoved: false, centered: false, meas: { on: false, pts: [] }, pick: null,
    showLine: true, pin: null, evals: [], team: { on: false, list: [], t: 0 }, groups: new Map(), munis: new Map(), seedName: 'GLOBAL ZONA NORTE 1'
  };
  try { Object.assign(S, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'), { sel: null }); } catch (e) { }
  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ layers: S.layers, base: S.base, theme: S.theme, themeMode: S.themeMode, radius: S.radius, gkey: S.gkey || '' })); } catch (e) { }
  }

  const BASES = {
    dark: { label: 'Oscuro', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19, filter: 'invert(1) hue-rotate(180deg) brightness(.92) contrast(.95) saturate(.8)', attr: '© OpenStreetMap', bg: '#0b1220', grid: 'rgba(255,255,255,.045)' },
    light: { label: 'Calles', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19, attr: '© OpenStreetMap', bg: '#e9edf2', grid: 'rgba(20,30,50,.06)' },
    sat: { label: 'Satélite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 19, attr: 'Esri, Maxar, Earthstar Geographics', bg: '#101820', grid: 'rgba(255,255,255,.05)' },
    gmap: { label: 'Google Maps · Mapa', google: true, gtype: 'roadmap', attr: '' },
    gsat: { label: 'Google Maps · Satélite', google: true, gtype: 'hybrid', attr: '' },
    vec: { label: 'Calles sin conexión', vector: true, attr: '© OpenStreetMap · Protomaps' },
    none: { label: 'Sin mapa (solo datos)', url: null, attr: 'Modo sin mapa base', bg: null, grid: null }
  };

  let COL = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
    COL = { accent: v('--accent'), node: v('--node'), nueva: v('--new'), user: v('--user'), text: v('--text'), bg: v('--bg'), solid: v('--solid') };
  }
  function applyTheme() {
    document.documentElement.dataset.theme = S.theme;
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = S.theme === 'light' ? '#e8edf3' : '#0b1220';
    readColors(); if (VEC) VEC.setTheme(S.theme);
    const b = BASES[S.base] || BASES.dark;
    map.bg = b.bg || (S.theme === 'light' ? '#e8edf3' : '#0b1220');
    map.grid = b.grid || (S.theme === 'light' ? 'rgba(20,30,50,.07)' : 'rgba(255,255,255,.05)');
    map.invalidate();
  }
  /* ---------- tema automático según el sol ---------- */
  function sunTimes(date, lat, lon) {
    const R = Math.PI / 180, DAY = 864e5, J1970 = 2440588, J2000 = 2451545, E = R * 23.4397, J0 = 0.0009;
    const days = date.getTime() / DAY - 0.5 + J1970 - J2000, lw = R * -lon, phi = R * lat;
    const n = Math.round(days - J0 - lw / (2 * Math.PI)), ds = J0 + (0 + lw) / (2 * Math.PI) + n;
    const M = R * (357.5291 + 0.98560028 * ds);
    const L = M + R * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + R * 102.9372 + Math.PI;
    const dec = Math.asin(Math.sin(E) * Math.sin(L));
    const Jn = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
    const w = Math.acos(Math.max(-1, Math.min(1, (Math.sin(-0.833 * R) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)))));
    const a = J0 + (w + lw) / (2 * Math.PI) + n, Js = J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L), Jr = Jn - (Js - Jn);
    const toD = j => new Date((j + 0.5 - J1970) * DAY);
    return { rise: toD(Jr), set: toD(Js) };
  }
  function autoTheme() {
    let th = S.themeMode;
    if (th === 'auto') {
      const p = S.pos ? { lat: S.pos.lat, lon: S.pos.lon } : { lat: 13.5, lon: -86.3 };
      const t = sunTimes(new Date(), p.lat, p.lon), now = Date.now();
      th = now >= t.rise.getTime() && now < t.set.getTime() ? 'light' : 'dark';
    }
    const baseWas = S.base, themeWas = S.theme;
    S.theme = th;
    if (S.base === 'dark' || S.base === 'light') S.base = th === 'dark' ? 'dark' : 'light';
    if (S.base !== baseWas) applyBase(); else if (S.theme !== themeWas) applyTheme();
  }
  const THEME_LABEL = { auto: 'Automático (sol)', light: 'Claro', dark: 'Oscuro' };

  /* ---------- Google Maps ---------- */
  const NB = window.AndroidBridge || null;
  let gmap = null, gLoading = null;
  function loadGoogle(key) {
    if (window.google && window.google.maps) return Promise.resolve();
    if (gLoading) return gLoading;
    gLoading = new Promise((res, rej) => {
      window.__gmReady = () => res();
      window.gm_authFailure = () => { toast('La clave de Google Maps no es válida o no tiene activada “Maps JavaScript API”', 5000); if (BASES[S.base] && BASES[S.base].google) { S.base = 'dark'; saveSettings(); } applyBase(); };
      const sc = document.createElement('script');
      sc.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) + '&callback=__gmReady&v=weekly&language=es';
      sc.onerror = () => { gLoading = null; rej(new Error('red')); };
      setTimeout(() => { if (!(window.google && window.google.maps)) { gLoading = null; rej(new Error('tiempo')); } }, 15000);
      document.head.appendChild(sc);
    });
    return gLoading;
  }
  async function useGoogle(type) {
    if (!S.gkey) { askKey(); return false; }
    if (!navigator.onLine) { toast('Sin internet: se usa el mapa propio', 3000); return false; }
    try { await loadGoogle(S.gkey); } catch (e) { toast('No se pudo cargar Google Maps', 3000); return false; }
    if (!gmap) {
      const c = map.center();
      gmap = new google.maps.Map($('#gmap'), { center: { lat: c.lat, lng: c.lon }, zoom: Math.round(map.z), disableDefaultUI: true, gestureHandling: 'greedy', clickableIcons: false, keyboardShortcuts: false, mapTypeId: type });
      $('#gmap').hidden = false; map.attachGoogle(gmap);
    } else { $('#gmap').hidden = false; gmap.setMapTypeId(type); map.attachGoogle(gmap); }
    return true;
  }
  function askKey() {
    const m = modal('<h3>Clave de Google Maps</h3><p class="lead">Para usar el mapa oficial de Google necesitas una clave API de tu cuenta de Google Cloud con “Maps JavaScript API” activada. Pégala aquí; se guarda solo en este teléfono.</p>' +
      '<label class="field"><span>CLAVE API</span><input id="gK" value="' + esc(S.gkey || '') + '" placeholder="AIza…" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' +
      '<div class="btnrow"><button class="btn" id="gC">' + (S.gkey ? 'Quitar clave' : 'Cancelar') + '</button><button class="btn accent" id="gS">' + ic('check') + 'Guardar</button></div>');
    hydrate(m);
    m.querySelector('#gC').onclick = () => { if (S.gkey) { S.gkey = ''; if (BASES[S.base].google) S.base = 'dark'; saveSettings(); applyBase(); } closeModal(); };
    m.querySelector('#gS').onclick = () => {
      const v = m.querySelector('#gK').value.trim(); if (v.length < 20) { toast('La clave parece incompleta'); return; }
      S.gkey = v; saveSettings(); closeModal(); if (!BASES[S.base].google) S.base = 'gmap'; saveSettings(); applyBase();
    };
  }
  /* ---------- mapa de calles sin conexión (vectorial) ---------- */
  const VEC_URL = 'mapa/norte.pmtiles';
  let VEC = null, vecTried = false;
  async function ensureVector() {
    if (!vecTried) { vecTried = true; VEC = await Vec.openVector(VEC_URL); }
    if (VEC) VEC.setTheme(S.theme === 'light' ? 'light' : 'dark');
    return !!VEC;
  }
  const isOffline = () => !navigator.onLine || S.netBad;
  let lastMode = '';
  async function applyBase() {
    if (BASES[S.base] && BASES[S.base].google) S.base = 'dark';
    let b = BASES[S.base] || BASES.dark;
    const auto = isOffline() && !b.vector;
    if (b.vector || auto) {
      if (await ensureVector()) {
        if (gmap) { map.detachGoogle(); $('#gmap').hidden = true; }
        map.setSource(null); map.setVector(VEC); $('#attrib').textContent = BASES.vec.attr; applyTheme();
        if (auto && lastMode !== 'vec-auto') toast('Sin conexión: se activó el mapa de calles sin internet', 3500);
        lastMode = auto ? 'vec-auto' : 'vec'; return;
      }
      if (b.vector) { toast('Esta versión no trae el mapa de calles sin conexión', 4000); b = BASES.dark; }
    }
    map.setVector(null);
    if (lastMode === 'vec-auto' && !auto) toast('Conexión recuperada: mapa en línea', 2500);
    lastMode = 'online';
    if (b.google) {
      if (await useGoogle(b.gtype)) { map.setSource(null); $('#attrib').textContent = ''; applyTheme(); return; }
      b = BASES.dark;
    }
    if (gmap) { map.detachGoogle(); $('#gmap').hidden = true; }
    map.setSource(b.url ? { url: b.url, maxZoom: b.maxZoom, minZoom: 0, filter: b.filter || '' } : null);
    $('#attrib').textContent = b.attr; applyTheme();
  }
  /* ---------- utilidades geográficas ---------- */
  function hav(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * D2R, dLon = (lon2 - lon1) * D2R;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * D2R) * Math.cos(lat2 * D2R) * Math.sin(dLon / 2) ** 2;
    return 12742000 * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  const lengthM = c => { let s = 0; for (let i = 1; i < c.length; i++) s += hav(c[i - 1][1], c[i - 1][0], c[i][1], c[i][0]); return s; };
  function ringArea(r) {
    const lat0 = r[0][1] * D2R, kx = 111320 * Math.cos(lat0), ky = 110574; let a = 0;
    for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += (p[0] * kx) * (q[1] * ky) - (q[0] * kx) * (p[1] * ky); }
    return Math.abs(a) / 2;
  }
  function bearing(lat1, lon1, lat2, lon2) {
    const y = Math.sin((lon2 - lon1) * D2R) * Math.cos(lat2 * D2R);
    const x = Math.cos(lat1 * D2R) * Math.sin(lat2 * D2R) - Math.sin(lat1 * D2R) * Math.cos(lat2 * D2R) * Math.cos((lon2 - lon1) * D2R);
    return (Math.atan2(y, x) / D2R + 360) % 360;
  }
  const CARD = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
  const cardinal = b => CARD[Math.round(b / 45) % 8];
  function fmtD(m) {
    if (m == null || !isFinite(m)) return '—';
    if (m < 1000) return Math.round(m) + ' m';
    return (m / 1000).toFixed(m < 10000 ? 2 : 1) + ' km';
  }
  const fmtA = m2 => m2 >= 1e6 ? (m2 / 1e6).toFixed(2) + ' km²' : Math.round(m2).toLocaleString('es') + ' m²';
  function pip(x, y, r) {
    let inside = false;
    for (let i = 0, j = r.length - 2; i < r.length; i += 2) {
      const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
      j = i;
    }
    return inside;
  }

  /* ---------- puente con la app Android (si existe) ---------- */
  function openExt(url, fallback) { if (NB) NB.openExternal(url, fallback || ''); else window.open(fallback || url, '_blank', 'noopener'); }
  function saveBlob(blob, name, share) {
    if (NB) {
      const fr = new FileReader();
      fr.onload = () => NB.saveFile(name, String(fr.result).split(',')[1], blob.type || 'application/octet-stream', !!share);
      fr.readAsDataURL(blob); return;
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  /* ---------- UI helpers ---------- */
  let toastT;
  function toast(msg, ms) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms || 2600);
  }
  function busy(msg) { $('#loadMsg').textContent = msg || 'Procesando…'; $('#loading').classList.remove('done'); }
  function idle() { $('#loading').classList.add('done'); }
  function modal(html) {
    const root = $('#modalRoot');
    root.innerHTML = '<div class="scrim"></div><div class="modal"><div class="grab"></div>' + html + '</div>';
    hydrate(root); root.querySelector('.scrim').onclick = closeModal;
    return root.querySelector('.modal');
  }
  function closeModal() { $('#modalRoot').innerHTML = ''; }
  function confirmBox(title, text, okLabel, danger) {
    return new Promise(res => {
      const m = modal('<h3>' + esc(title) + '</h3><p class="lead">' + esc(text) + '</p><div class="btnrow"><button class="btn" data-r="0">Cancelar</button><button class="btn ' + (danger ? 'danger' : 'accent') + '" data-r="1">' + esc(okLabel || 'Aceptar') + '</button></div>');
      m.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { closeModal(); res(b.dataset.r === '1'); });
      m.parentElement.querySelector('.scrim').onclick = () => { closeModal(); res(false); };
    });
  }

  /* ---------- datos ---------- */
  function prep(f) {
    if (f.t === 'p') { f.mx = Merc.mxOf(f.c[0]); f.my = Merc.myOf(f.c[1]); return; }
    let x0 = 9, y0 = 9, x1 = -9, y1 = -9;
    f.R = f.c.map(ring => {
      const a = new Float64Array(ring.length * 2);
      for (let i = 0; i < ring.length; i++) {
        const x = Merc.mxOf(ring[i][0]), y = Merc.myOf(ring[i][1]); a[i * 2] = x; a[i * 2 + 1] = y;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      return a;
    });
    f.bb = [x0, y0, x1, y1];
  }
  const gkey = f => f.g.join('/');
  function reindex() {
    S.pts = []; S.areas = []; S.lines = []; S.nextId = 1;
    S.areasByName = new Map(); S.areasByGroup = new Map(); S.linesByGroup = new Map();
    S.groups = new Map(); S.munis = new Map();
    S.feats.forEach(f => {
      if (f.id >= S.nextId) S.nextId = f.id + 1;
      if (f.t === 'p') S.pts.push(f);
      else if (f.t === 'a') {
        S.areas.push(f);
        const n = norm(f.n); if (!S.areasByName.has(n)) S.areasByName.set(n, []); S.areasByName.get(n).push(f);
        const k = gkey(f); if (!S.areasByGroup.has(k)) S.areasByGroup.set(k, []); S.areasByGroup.get(k).push(f);
      } else {
        S.lines.push(f);
        const k = gkey(f); if (!S.linesByGroup.has(k)) S.linesByGroup.set(k, []); S.linesByGroup.get(k).push(f);
      }
    });
    S.pts.forEach(p => {
      const m = p.g[0] || 'Sin grupo';
      if (!S.munis.has(m)) S.munis.set(m, new Set());
      if (p.g[1]) S.munis.get(m).add(p.g[1]);
      [m, p.g.slice(0, 2).join(' › ')].forEach((k, i) => {
        if (i === 1 && p.g.length < 2) return;
        let g = S.groups.get(k); if (!g) { g = { label: k, pts: [], lvl: i }; S.groups.set(k, g); }
        g.pts.push(p);
      });
    });
  }
  const kindOf = f => f.st === 'new' ? 'nueva' : KML.kindOf(f);
  const kindLabel = f => f.st === 'new' && f.src !== S.seedName ? 'Caja nueva' : (KML.kindOf(f) === 'caja' ? 'Caja' : 'Nodo / cabina');

  async function loadData() {
    let rows = await DB.all();
    if (!rows.length) {
      $('#loadMsg').textContent = 'Cargando cajas del KMZ…';
      const r = await fetch('data/seed.json'); const j = await r.json();
      S.seedName = j.name;
      rows = j.f.map(f => { const o = Object.assign({}, f, { id: f.i, src: j.name }); delete o.i; return o; });
      await DB.putMany(rows);
    } else {
      const sn = await DB.getMeta('seedName'); if (sn) S.seedName = sn;
    }
    DB.setMeta('seedName', S.seedName);
    S.feats = rows; rows.forEach(prep); reindex();
  }

  function assocAreas(p) {
    const byName = S.areasByName.get(norm(p.n)); if (byName && byName.length) return byName;
    const cand = S.areasByGroup.get(gkey(p)) || [];
    return cand.filter(a => a.R.some(r => pip(p.mx, p.my, r)));
  }

  /* ---------- mapa y dibujo ---------- */
  const map = new GeoMap($('#map'));
  const labelsSeen = new Set();
  function tracePath(ctx, R, m, step) {
    for (let k = 0; k < R.length; k++) {
      const a = R[k], n = a.length / 2, st = step > 1 ? step : 1;
      for (let i = 0; i < n; i += st) {
        const x = (a[i * 2] - m.cx) * m.s + m.w / 2, y = (a[i * 2 + 1] - m.cy) * m.s + m.h / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    }
  }
  function draw(ctx, m) {
    const b = m.bounds(), L = S.layers, z = m.z, s = m.s;
    const inView = f => f.bb[2] >= b.x0 && f.bb[0] <= b.x1 && f.bb[3] >= b.y0 && f.bb[1] <= b.y1;
    const sel = S.sel, selGroup = sel ? gkey(sel) : null;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    if (L.areas && z >= 12.5) {
      ctx.beginPath();
      for (const f of S.areas) {
        if (!inView(f)) continue;
        const w = (f.bb[2] - f.bb[0]) * s, h = (f.bb[3] - f.bb[1]) * s; if (w < 3 && h < 3) continue;
        tracePath(ctx, f.R, m, f.R[0].length > 160 && w < 200 ? 3 : 1);
      }
      ctx.fillStyle = hexA(COL.accent, .10); ctx.fill(); ctx.strokeStyle = hexA(COL.accent, .55); ctx.lineWidth = 1.1; ctx.stroke();
    }
    if (L.rutas && z >= 12.5) {
      ctx.beginPath();
      for (const f of S.lines) { if (!inView(f)) continue; tracePath(ctx, f.R, m, 1); }
      ctx.strokeStyle = hexA(COL.node, .7); ctx.lineWidth = 1.6; ctx.stroke();
    }
    if (sel) {
      if (S.selAreas.length) {
        ctx.beginPath(); S.selAreas.forEach(a => tracePath(ctx, a.R, m, 1));
        ctx.fillStyle = hexA(COL.accent, .22); ctx.fill(); ctx.strokeStyle = COL.accent; ctx.lineWidth = 2.2; ctx.stroke();
      }
      const gl = (S.linesByGroup.get(selGroup) || []);
      if (gl.length && L.rutas) { ctx.beginPath(); gl.forEach(l => tracePath(ctx, l.R, m, 1)); ctx.strokeStyle = COL.node; ctx.lineWidth = 2.6; ctx.stroke(); }
    }

    if (L.cajas) {
      const r = z < 11 ? 2.2 : z < 13 ? 3.2 : z < 15 ? 4.6 : z < 17 ? 6.5 : 8;
      const sets = { caja: [], nodo: [], nueva: [] }, edited = [];
      for (const p of S.pts) {
        if (p.mx < b.x0 || p.mx > b.x1 || p.my < b.y0 || p.my > b.y1) continue;
        const x = (p.mx - m.cx) * s + m.w / 2, y = (p.my - m.cy) * s + m.h / 2;
        sets[kindOf(p)].push(p, x, y); if (p.st === 'edit') edited.push(x, y);
      }
      for (const k of ['caja', 'nodo', 'nueva']) {
        const a = sets[k]; if (!a.length) continue;
        ctx.beginPath();
        for (let i = 0; i < a.length; i += 3) { ctx.moveTo(a[i + 1] + r, a[i + 2]); ctx.arc(a[i + 1], a[i + 2], r, 0, 6.2832); }
        ctx.fillStyle = k === 'caja' ? COL.accent : k === 'nodo' ? COL.node : COL.nueva; ctx.fill();
        if (z >= 13) { ctx.lineWidth = z >= 15 ? 2 : 1.2; ctx.strokeStyle = S.base === 'light' || S.theme === 'light' ? 'rgba(255,255,255,.95)' : 'rgba(8,14,26,.85)'; ctx.stroke(); }
      }
      if (edited.length) {
        ctx.beginPath(); for (let i = 0; i < edited.length; i += 2) { ctx.moveTo(edited[i] + r + 3, edited[i + 1]); ctx.arc(edited[i], edited[i + 1], r + 3, 0, 6.2832); }
        ctx.strokeStyle = COL.nueva; ctx.lineWidth = 2; ctx.stroke();
      }
      if (L.etiquetas && z >= 17) {
        labelsSeen.clear(); ctx.font = '600 12px ui-rounded,system-ui,sans-serif'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round';
        const halo = S.base === 'light' || S.theme === 'light' ? 'rgba(255,255,255,.92)' : 'rgba(8,14,26,.9)';
        ctx.fillStyle = COL.text; let n = 0;
        for (const k of ['caja', 'nodo', 'nueva']) {
          const a = sets[k];
          for (let i = 0; i < a.length && n < 160; i += 3) {
            const cell = ((a[i + 1] / 130) | 0) + ':' + ((a[i + 2] / 20) | 0); if (labelsSeen.has(cell)) continue; labelsSeen.add(cell);
            ctx.strokeStyle = halo; ctx.strokeText(a[i].n, a[i + 1] + r + 5, a[i + 2]); ctx.fillText(a[i].n, a[i + 1] + r + 5, a[i + 2]); n++;
          }
        }
      }
    }

    // selección + línea hacia mí
    if (sel) {
      const [x, y] = m.toScreenN(sel.mx, sel.my);
      if (S.pos && S.showLine) {
        const [ux, uy] = m.toScreen(S.pos.lat, S.pos.lon);
        ctx.setLineDash([7, 7]); ctx.strokeStyle = COL.user; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
        const d = hav(S.pos.lat, S.pos.lon, sel.c[1], sel.c[0]);
        pill(ctx, fmtD(d), (ux + x) / 2, (uy + y) / 2 - 12, COL.user);
      }
      ctx.beginPath(); ctx.arc(x, y, 17, 0, 6.2832); ctx.fillStyle = hexA(COL.accent, .18); ctx.fill();
      ctx.strokeStyle = COL.accent; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 6, 0, 6.2832); ctx.fillStyle = '#fff'; ctx.fill();
    }

    // medición
    if (S.meas.pts.length) {
      const pts = S.meas.pts.map(p => m.toScreen(p[1], p[0]));
      ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      ctx.strokeStyle = '#ff4d9d'; ctx.lineWidth = 4; ctx.stroke();
      pts.forEach((p, i) => {
        ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, 6.2832); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#ff4d9d'; ctx.lineWidth = 3; ctx.stroke();
        if (i) pill(ctx, fmtD(hav(S.meas.pts[i - 1][1], S.meas.pts[i - 1][0], S.meas.pts[i][1], S.meas.pts[i][0])), (p[0] + pts[i - 1][0]) / 2, (p[1] + pts[i - 1][1]) / 2 - 12, '#ff4d9d');
      });
    }

    // equipo (solo administrador)
    if (S.team.on && S.team.list.length && z >= 8) {
      ctx.font = '800 12px ui-rounded,system-ui,sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      for (const u of S.team.list) {
        const [x, y] = m.toScreen(u.lat, u.lon); if (x < -60 || y < -60 || x > m.w + 60 || y > m.h + 60) continue;
        const age = Date.now() - new Date(u.updated_at).getTime();
        const col = age < 180000 ? '#22c55e' : age < 900000 ? '#ffb547' : '#8b97a8';
        ctx.beginPath(); ctx.arc(x, y, 16, 0, 6.2832); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.fillStyle = '#04141f'; ctx.fillText(initials(u.name), x, y + .5);
        if (z >= 12) { pill(ctx, (u.name || '').split(' ')[0], x, y + 29, col); ctx.font = '800 12px ui-rounded,system-ui,sans-serif'; ctx.textAlign = 'center'; }
      }
      ctx.textAlign = 'start';
    }
    // evaluaciones técnicas pendientes
    if (S.evals.length && z >= 11) {
      const rs = routeStops();
      if (rs.length) {
        ctx.beginPath(); let first = true;
        if (!S.routeView && S.pos) { const st = m.toScreen(S.pos.lat, S.pos.lon); ctx.moveTo(st[0], st[1]); first = false; }
        rs.forEach(e => { const [x, y] = m.toScreen(e.lat, e.lon); if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); });
        ctx.setLineDash([9, 7]); ctx.strokeStyle = '#ff5d8f'; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.font = '700 11.5px ui-rounded,system-ui,sans-serif'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      const rr = z < 14 ? 7 : 11;
      for (const e of S.evals) {
        if (e.lat == null || e.estado === 'hecha') continue;
        const [x, y] = m.toScreen(e.lat, e.lon); if (x < -30 || y < -30 || x > m.w + 30 || y > m.h + 30) continue;
        ctx.beginPath(); ctx.moveTo(x, y - rr - 3); ctx.lineTo(x + rr + 3, y); ctx.lineTo(x, y + rr + 3); ctx.lineTo(x - rr - 3, y); ctx.closePath();
        ctx.fillStyle = e.tipo === 'Daño' ? '#ff5252' : '#ff5d8f'; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = '#fff'; ctx.stroke();
        if (e.asg && e.seq != null && z >= 13.5) { ctx.font = '800 11px ui-rounded,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(e.seq, x, y + .5); ctx.textAlign = 'start'; ctx.font = '700 11.5px ui-rounded,system-ui,sans-serif'; }
        if (z >= 15.5 && e.orden) {
          ctx.lineWidth = 3.5; ctx.strokeStyle = S.base === 'light' || S.theme === 'light' ? 'rgba(255,255,255,.92)' : 'rgba(8,14,26,.9)';
          ctx.strokeText(e.orden, x + rr + 8, y); ctx.fillStyle = COL.text; ctx.fillText(e.orden, x + rr + 8, y);
        }
      }
    }
    // punto buscado
    const pinPt = S.pin || (S.pick && S.pick.anchor);
    if (pinPt) {
      const [x, y] = m.toScreen(pinPt.lat, pinPt.lon);
      ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.2832); ctx.fillStyle = 'rgba(255,210,63,.35)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x - 6, y - 14, x - 15, y - 20, x - 15, y - 31); ctx.arc(x, y - 31, 15, Math.PI, 0); ctx.bezierCurveTo(x + 15, y - 20, x + 6, y - 14, x, y); ctx.closePath();
      ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#1b2230'; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - 31, 5.5, 0, 6.2832); ctx.fillStyle = '#1b2230'; ctx.fill();
    }

    // mi ubicación
    if (S.pos) {
      const [x, y] = m.toScreen(S.pos.lat, S.pos.lon), rr = S.pos.acc / m.metersPerPx(S.pos.lat);
      if (rr > 14) { ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.2832); ctx.fillStyle = hexA(COL.user, .12); ctx.fill(); ctx.strokeStyle = hexA(COL.user, .4); ctx.lineWidth = 1; ctx.stroke(); }
      if (S.pos.heading != null && isFinite(S.pos.heading) && S.pos.speed > 0.6) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(S.pos.heading * D2R);
        ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(-11, -9); ctx.lineTo(11, -9); ctx.closePath(); ctx.fillStyle = COL.user; ctx.fill(); ctx.restore();
      }
      ctx.beginPath(); ctx.arc(x, y, 11, 0, 6.2832); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 7.5, 0, 6.2832); ctx.fillStyle = COL.user; ctx.fill();
    }
  }
  function pill(ctx, text, x, y, color) {
    ctx.font = '700 12.5px ui-rounded,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 14;
    ctx.fillStyle = color; roundRect(ctx, x - w / 2, y - 11, w, 22, 11); ctx.fill();
    ctx.fillStyle = '#04141f'; if (color === '#ff4d9d') ctx.fillStyle = '#fff'; ctx.fillText(text, x, y + .5); ctx.textAlign = 'start';
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function hexA(hex, a) {
    hex = hex.trim();
    if (hex[0] !== '#') return hex;
    if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    return 'rgba(' + parseInt(hex.slice(1, 3), 16) + ',' + parseInt(hex.slice(3, 5), 16) + ',' + parseInt(hex.slice(5, 7), 16) + ',' + a + ')';
  }
  map.onDraw = draw;
  // Si hay "señal" pero no llegan mosaicos, tratamos la red como caída y probamos cada 25 s
  let probeT = 0;
  map.onNetBad = () => {
    if (S.netBad || !navigator.onLine) return; S.netBad = true; netState(); applyBase();
    clearInterval(probeT);
    probeT = setInterval(() => {
      const im = new Image(); const done = ok => { if (ok && S.netBad) { S.netBad = false; clearInterval(probeT); netState(); applyBase(); } };
      im.onload = () => done(true); im.onerror = () => done(false); im.src = 'https://tile.openstreetmap.org/0/0/0.png?_=' + Date.now();
    }, 25000);
  };


  /* ---------- toques en el mapa ---------- */
  function hitPoint(px, py) {
    if (!S.layers.cajas) return null;
    const m = map, lim = Math.max(20, (m.z < 13 ? 3 : 7) + 14); let best = null, bd = lim * lim;
    const b = m.bounds();
    for (const p of S.pts) {
      if (p.mx < b.x0 || p.mx > b.x1 || p.my < b.y0 || p.my > b.y1) continue;
      const x = (p.mx - m.cx) * m.s + m.w / 2 - px, y = (p.my - m.cy) * m.s + m.h / 2 - py, d = x * x + y * y;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  map.onTap = (px, py) => {
    hideResults();
    if (S.pick) return;
    if (S.meas.on) {
      const h = hitPoint(px, py), ll = h ? { lat: h.c[1], lon: h.c[0] } : map.fromScreen(px, py);
      S.meas.pts.push([ll.lon, ll.lat]); updateMeasure(); return;
    }
    const ht = hitTeam(px, py); if (ht) { openUserDetail(ht); return; }
    const he = hitEval(px, py); if (he) { openEvalDetail(he); return; }
    const h = hitPoint(px, py);
    if (h) select(h, true, true); else if (S.sel) deselect();
  };
  map.onUserMove = () => { S.userMoved = true; if (S.follow) { S.follow = false; $('#btnLocate').classList.remove('on'); } };
  map.onMoveEnd = () => { if (!S.pos) updateNearby(); };
  map.onMove = () => { if (S.pick) $('#pickCoords').textContent = coordTxt(map.center().lat, map.center().lon); };
  const coordTxt = (la, lo) => la.toFixed(6) + ', ' + lo.toFixed(6);

  /* ---------- GPS ---------- */
  let lastNb = { lat: 0, lon: 0, t: 0 };
  function startGps() {
    if (!navigator.geolocation) { toast('Este dispositivo no tiene GPS'); return; }
    const pg = $('#pillGps'); pg.hidden = false; pg.className = 'pill'; pg.textContent = 'Buscando GPS…';
    // 1) posición rápida (red / última conocida)  2) GPS preciso en seguida
    navigator.geolocation.getCurrentPosition(p => { if (!S.pos) onPos(p); }, () => { }, { enableHighAccuracy: false, maximumAge: 600000, timeout: 10000 });
    if (S.watchId != null) { try { navigator.geolocation.clearWatch(S.watchId); } catch (e) { } }
    S.watchId = navigator.geolocation.watchPosition(onPos, onGpsErr, { enableHighAccuracy: true, maximumAge: 1000, timeout: 60000 });
    // si la persona da el permiso después, se retoma solo (sin recargar la página)
    if (!S.permWatch && navigator.permissions && navigator.permissions.query) {
      S.permWatch = true;
      navigator.permissions.query({ name: 'geolocation' }).then(st => { st.onchange = () => { if (st.state === 'granted') { S.gpsDenied = false; closeGpsHelp(); startGps(); toast('Ubicación activada'); } }; }).catch(() => { });
    }
  }
  function onPos(p) {
    const c = p.coords;
    S.pos = { lat: c.latitude, lon: c.longitude, acc: c.accuracy, heading: c.heading, speed: c.speed };
    const pg = $('#pillGps'); pg.hidden = false; pg.className = 'pill ' + (c.accuracy <= 25 ? 'ok' : 'warn'); pg.textContent = 'GPS ±' + Math.round(c.accuracy) + ' m';
    if (!S.centered) autoTheme();
    if (!S.centered) { S.centered = true; if (!S.userMoved && !S.sel) map.flyTo(S.pos.lat, S.pos.lon, 16.5, 0.4); }
    else if (S.follow && !S.sel && !S.pick) map.flyTo(S.pos.lat, S.pos.lon, Math.max(map.z, 16), 0.4, 400);
    cloudReport();
    const now = Date.now();
    if (hav(lastNb.lat, lastNb.lon, S.pos.lat, S.pos.lon) > 8 || now - lastNb.t > 6000) { lastNb = { lat: S.pos.lat, lon: S.pos.lon, t: now }; updateNearby(); }
    if (S.sel) renderDetail(true);
    map.invalidate();
  }
  function onGpsErr(e) {
    // Equipos sin GPS (PC): si falla la alta precisión, se usa la ubicación por red / Wi-Fi
    if ((e.code === 2 || e.code === 3) && !S.lowAcc) {
      S.lowAcc = true; try { if (S.watchId != null) navigator.geolocation.clearWatch(S.watchId); } catch (x) { }
      const pg0 = $('#pillGps'); pg0.hidden = false; pg0.className = 'pill'; pg0.textContent = 'Buscando ubicación…';
      S.watchId = navigator.geolocation.watchPosition(onPos, onGpsErr, { enableHighAccuracy: false, maximumAge: 30000, timeout: 30000 }); return;
    }
    const pg = $('#pillGps'); pg.hidden = false; pg.className = 'pill warn tap';
    pg.textContent = e.code === 1 ? 'GPS sin permiso · toca aquí' : 'Sin señal GPS · toca para reintentar';
    if (e.code === 1) { S.gpsDenied = true; if (!S.gpsToast) { S.gpsToast = true; toast('Sin permiso de ubicación. Toca “GPS sin permiso” para ver cómo activarlo', 4500); } }
    updateCloudPill();
  }
  function closeGpsHelp() { const m = document.querySelector('#modalRoot [data-gpshelp]'); if (m) closeModal(); }
  $('#pillGps').onclick = () => {
    if (!S.gpsDenied) { if (!S.pos) { toast('Buscando señal GPS…'); S.lowAcc = false; startGps(); } return; }
    const web = !NB;
    const m = modal('<h3 data-gpshelp>Activar la ubicación</h3><p class="lead">' + (web
      ? 'El navegador bloqueó la ubicación de esta página. Para verte en el mapa:'
      : 'La app no tiene permiso de ubicación. Para verte en el mapa:') + '</p><ol class="steps">' + (web
      ? '<li>Toca el <b>candado</b> (o el icono de ubicación tachado) a la izquierda de la dirección web.</li><li>Entra a <b>Permisos</b> o <b>Configuración del sitio</b>.</li><li>En <b>Ubicación</b> elige <b>Permitir</b>.</li><li>Vuelve aquí: se activa sola, o pulsa “Reintentar”.</li>'
      : '<li>Abre los <b>Ajustes</b> del teléfono › <b>Aplicaciones</b> › <b>Vizor G</b>.</li><li>Entra a <b>Permisos</b> › <b>Ubicación</b>.</li><li>Elige <b>Permitir solo mientras se usa la app</b> y activa <b>Ubicación precisa</b>.</li><li>Vuelve a la app y pulsa “Reintentar”.</li>') + '</ol>' +
      '<p class="lead">Para ver tu posición, el GPS también debe estar encendido en el dispositivo. Si solo administras desde la computadora, no necesitas activarlo.</p>' +
      '<div class="btnrow"><button class="btn" id="gpC">Cerrar</button><button class="btn accent" id="gpR">Reintentar</button></div>');
    m.querySelector('#gpC').onclick = closeModal;
    m.querySelector('#gpR').onclick = () => { closeModal(); S.gpsDenied = false; $('#pillGps').className = 'pill'; $('#pillGps').textContent = 'Buscando GPS…'; startGps(); };
  };
  $('#btnLocate').onclick = () => {
    if (!S.pos) { toast('Buscando tu ubicación…'); startGpsOnce(); return; }
    S.follow = true; $('#btnLocate').classList.add('on'); S.userMoved = false;
    map.flyTo(S.pos.lat, S.pos.lon, Math.max(map.z, 16.5), S.sel ? 0.3 : 0.4);
  };
  function startGpsOnce() { if (!S.gpsStarted) { S.gpsStarted = true; startGps(); } }

  /* ---------- cercanas ---------- */
  const RADII = [[300, '300 m'], [1000, '1 km'], [3000, '3 km'], [10000, '10 km']];
  function refPoint() { if (S.pos) return { lat: S.pos.lat, lon: S.pos.lon, gps: true }; const c = map.center(); return { lat: c.lat, lon: c.lon, gps: false }; }
  function nearest(ref, max, filter) {
    const out = [];
    for (const p of S.pts) {
      if (filter && !filter(p)) continue;
      const dl = Math.abs(p.c[1] - ref.lat); if (dl > 3) continue;
      out.push([hav(ref.lat, ref.lon, p.c[1], p.c[0]), p]);
    }
    out.sort((a, b) => a[0] - b[0]); return out.slice(0, max);
  }
  function subOf(f) { return f.g.length > 1 ? f.g[0] + ' · ' + f.g[f.g.length - 1] : (f.g[0] || ''); }
  function cardHtml(f, d) {
    return '<button class="card" data-id="' + f.id + '"><div class="row top"><span class="dot ' + kindOf(f) + '"></span><div class="meta"><div class="nm">' + esc(f.n) + '</div><div class="sb">' + esc(subOf(f)) + '</div></div></div><div class="dd">' + fmtD(d).replace(/ (m|km)$/, ' <small>$1</small>') + '</div></button>';
  }
  function updateNearby() {
    if (!S.pts.length) return;
    const ref = refPoint(), all = nearest(ref, 60), inR = all.filter(a => a[0] <= S.radius);
    const rl = (RADII.find(r => r[0] === S.radius) || [0, ''])[1];
    $('#nbChips').innerHTML = RADII.map(r => '<button class="chip' + (r[0] === S.radius ? ' on' : '') + '" data-r="' + r[0] + '">' + r[1] + '</button>').join('');
    const list = $('#nbList');
    $('#nbSub').textContent = (inR.length ? inR.length + (inR.length >= 60 ? '+' : '') + ' en ' + rl : 'Ninguna en ' + rl) + (ref.gps ? ' · desde tu ubicación' : ' · desde el centro del mapa');
    if (inR.length) list.innerHTML = inR.slice(0, 40).map(a => cardHtml(a[1], a[0])).join('');
    else list.innerHTML = all.slice(0, 3).map(a => cardHtml(a[1], a[0])).join('') || '<div class="empty">No hay cajas cargadas.</div>';
  }
  $('#nbChips').onclick = e => { const b = e.target.closest('[data-r]'); if (b) { S.radius = +b.dataset.r; saveSettings(); updateNearby(); } };
  $('#nbList').onclick = e => { const b = e.target.closest('[data-id]'); if (b) { const f = S.feats.find(x => x.id === +b.dataset.id); if (f) select(f, true); } };
  function dragSheet(grab, onUp, onDown) {
    let y0 = null;
    grab.addEventListener('pointerdown', e => { y0 = e.clientY; });
    grab.addEventListener('pointerup', e => {
      if (y0 == null) return; const dy = e.clientY - y0; y0 = null;
      if (dy < -25) onUp(); else if (dy > 25) onDown(); else (dy >= -25 && dy <= 25) && (grab._tap ? grab._tap() : 0);
    });
  }
  const nb = $('#nearby');
  $('#nbGrab')._tap = () => { nb.dataset.state = nb.dataset.state === 'full' ? 'peek' : 'full'; };
  dragSheet($('#nbGrab'), () => nb.dataset.state = 'full', () => nb.dataset.state = 'peek');
  nb.querySelector('.sheet-h').addEventListener('click', e => { if (!e.target.closest('.chip')) nb.dataset.state = nb.dataset.state === 'full' ? 'peek' : 'full'; });

  /* ---------- búsqueda ---------- */
  const q = $('#q');
  function hideResults() { $('#results').hidden = true; }
  q.addEventListener('input', () => {
    $('#qClear').hidden = !q.value;
    const t = norm(q.value); const box = $('#results');
    if (t.length < 2) { box.hidden = true; return; }
    const ref = refPoint(); let res = [];
    const gp = Geo.parse(q.value); if (gp) res.push({ geo: gp });
    S.evals.filter(e => evHay(e).includes(t)).slice(0, 5).forEach(e => res.push({ e }));
    const grp = [];
    S.groups.forEach(g => { if (norm(g.label).includes(t)) grp.push(g); });
    grp.sort((a, b) => a.lvl - b.lvl).slice(0, 3).forEach(g => res.push({ g }));
    const hits = [];
    for (const p of S.pts) { const n = norm(p.n); const i = n.indexOf(t); if (i >= 0) hits.push([i, hav(ref.lat, ref.lon, p.c[1], p.c[0]), p]); }
    hits.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    hits.slice(0, 30).forEach(h => res.push({ f: h[2], d: h[1] }));
    box.hidden = false;
    box.innerHTML = res.length ? res.map((r, i) => r.geo
      ? '<button class="res" data-geo="' + r.geo.lat + ',' + r.geo.lon + '"><span class="dot geo"></span><div><b>Ir a ' + r.geo.lat.toFixed(6) + ', ' + r.geo.lon.toFixed(6) + '</b><small>Georreferencia (' + r.geo.kind + ') · ver en el mapa</small></div></button>'
      : r.e ? '<button class="res" data-ev="' + esc(r.e.id) + '"><span class="dot ev"></span><div><b>' + esc(r.e.cliente || r.e.orden) + '</b><small>Orden ' + esc(r.e.orden || '—') + ' · ' + esc(r.e.tipo || '') + ' · ' + esc(r.e.tecnico || '') + '</small></div></button>'
      : r.g
      ? '<button class="res" data-g="' + esc(r.g.label) + '"><span class="dot nodo"></span><div><b>' + esc(r.g.label) + '</b><small>' + r.g.pts.length + ' cajas · ver zona</small></div></button>'
      : '<button class="res" data-id="' + r.f.id + '"><span class="dot ' + kindOf(r.f) + '"></span><div><b>' + esc(r.f.n) + '</b><small>' + esc(subOf(r.f)) + '</small></div><span class="dist">' + fmtD(r.d) + '</span></button>').join('')
      : '<div class="empty">Sin resultados para “' + esc(q.value) + '”</div>';
  });
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { const b = $('#results .res'); if (b) b.click(); } if (e.key === 'Escape') { q.value = ''; q.dispatchEvent(new Event('input')); q.blur(); } });
  $('#qClear').onclick = () => { q.value = ''; q.dispatchEvent(new Event('input')); };
  $('#results').onclick = e => {
    const b = e.target.closest('.res'); if (!b) return;
    q.blur(); hideResults();
    if (b.dataset.geo) { const p = b.dataset.geo.split(',').map(Number); setPin(p[0], p[1]); return; }
    if (b.dataset.ev) { const e = S.evals.find(x => x.id === b.dataset.ev); if (e) openEvalDetail(e); return; }
    if (b.dataset.g) {
      const g = S.groups.get(b.dataset.g); if (!g) return;
      let a = 90, c = -90, d = 180, f = -180; g.pts.forEach(p => { a = Math.min(a, p.c[1]); c = Math.max(c, p.c[1]); d = Math.min(d, p.c[0]); f = Math.max(f, p.c[0]); });
      deselect(); S.userMoved = true; map.fitBounds(a, d, c, f, 50);
    } else { const f = S.feats.find(x => x.id === +b.dataset.id); if (f) select(f, true); }
  };

  /* ---------- hojas ---------- */
  function setSheetH() {
    let el = null;
    if (S.pick) el = $('#pickBar'); else if (S.meas.on) el = $('#measureBar'); else el = S.sel ? $('#detail') : S.pin ? $('#pinBar') : $('#nearby');
    const h = el && !el.hidden ? el.offsetHeight + (el.id === 'detail' || el.id === 'nearby' ? 0 : 14) : 0;
    document.documentElement.style.setProperty('--sheet-h', Math.max(h, 0) + 'px');
  }
  function layout() {
    const meas = S.meas.on, pick = !!S.pick;
    $('#nearby').hidden = !!S.sel || meas || pick || !!S.pin;
    $('#pinBar').hidden = !S.pin || !!S.sel || meas || pick;
    $('#detail').hidden = !S.sel || meas || pick;
    $('#measureBar').hidden = !meas; $('#pickLayer').hidden = !pick;
    $('#fabs').hidden = pick || !!S.sel; $('#top').hidden = pick; $('#pills').hidden = pick;
    $('#btnMeasure').classList.toggle('on', meas);
    setSheetH();
  }
  const ro = new ResizeObserver(setSheetH); ['#nearby', '#detail', '#measureBar', '#pickBar', '#pinBar'].forEach(s => ro.observe($(s)));

  /* ---------- detalle ---------- */
  function select(f, fly, fromTap) {
    S.sel = f; S.selAreas = assocAreas(f); S.userMoved = true; S.follow = false; $('#btnLocate').classList.remove('on');
    layout(); renderDetail(); $('#detail .d-scroll').scrollTop = 0;
    if (fly) map.flyTo(f.c[1], f.c[0], Math.max(map.z, fromTap ? 16.5 : 17.5), 0.27);
    map.invalidate();
  }
  function deselect() { S.sel = null; S.selAreas = []; layout(); map.invalidate(); }
  $('#dClose').onclick = deselect;
  $('#dGrab').onclick = deselect;
  dragSheet($('#dGrab'), () => { }, deselect);

  function renderDetail(soft) {
    const f = S.sel; if (!f) return;
    const k = kindOf(f), d = S.pos ? hav(S.pos.lat, S.pos.lon, f.c[1], f.c[0]) : null;
    if (soft) { const sd = $('#dStats .dist'); if (sd) sd.textContent = fmtD(d); return; }
    $('#dIco').className = 'd-ico ' + k; $('#dIco').innerHTML = ic('box'); hydrate($('#dIco'));
    $('#dName').textContent = f.n; $('#dSub').textContent = subOf(f);
    const estado = f.st === 'new' ? 'Nueva' : f.st === 'edit' ? 'Editada' : 'Original';
    $('#dStats').innerHTML = '<div class="stat"><small>Distancia</small><b class="dist">' + (d == null ? '—' : fmtD(d)) + '</b></div><div class="stat"><small>Tipo</small><b>' + esc(kindLabel(f)) + '</b></div><div class="stat"><small>Estado</small><b>' + estado + '</b></div>';
    const rows = [['Municipio', f.g[0] || '—'], ['Cabina / carpeta', f.g.slice(1).join(' › ') || '—'], ['Latitud, longitud', f.c[1].toFixed(6) + ', ' + f.c[0].toFixed(6)]];
    Object.keys(f.x || {}).forEach(key => { if (norm(f.x[key]) !== norm(f.n)) rows.push([key, f.x[key]]); });
    if (f.d) rows.push(['Notas', f.d]);
    if (f.src) rows.push(['Origen', f.src]);
    $('#dInfo').innerHTML = rows.map(r => '<div><dt>' + esc(r[0]) + '</dt><dd style="white-space:pre-line">' + esc(r[1]) + '</dd></div>').join('');
  }
  const wazeUrl = f => 'https://waze.com/ul?ll=' + f.c[1] + ',' + f.c[0] + '&navigate=yes&zoom=17';
  $('#aWaze').onclick = () => { const f = S.sel; if (f) openExt('waze://?ll=' + f.c[1] + ',' + f.c[0] + '&navigate=yes', wazeUrl(f)); };
  $('#aGmaps').onclick = () => { const f = S.sel; if (f) openExt('google.navigation:q=' + f.c[1] + ',' + f.c[0], 'https://www.google.com/maps/dir/?api=1&destination=' + f.c[1] + ',' + f.c[0] + '&travelmode=driving'); };
  const shareText = f => f.n + '\n' + f.c[1].toFixed(6) + ',' + f.c[0].toFixed(6) + '\nhttps://maps.google.com/?q=' + f.c[1] + ',' + f.c[0];
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) { } ta.remove(); return ok;
    }
  }
  $('#aCopy').onclick = async () => { if (S.sel) toast((await copyText(shareText(S.sel))) ? 'Coordenadas copiadas' : 'No se pudo copiar'); };
  $('#aShare').onclick = async () => {
    const f = S.sel; if (!f) return;
    if (NB) NB.shareText(shareText(f));
    else if (navigator.share) { try { await navigator.share({ title: f.n, text: shareText(f) }); } catch (e) { } }
    else toast((await copyText(shareText(f))) ? 'Copiado para pegar en un mensaje' : 'No se pudo compartir');
  };
  $('#aEdit').onclick = () => S.sel && openForm(S.sel);

  /* ---------- metraje ---------- */
  $('#aMetraje').onclick = () => S.sel && openMetraje(S.sel);
  function openMetraje(f) {
    const rows = []; let big = '—', bigSub = 'Activa el GPS para medir desde tu ubicación';
    if (S.pos) {
      const d = hav(S.pos.lat, S.pos.lon, f.c[1], f.c[0]), b = bearing(S.pos.lat, S.pos.lon, f.c[1], f.c[0]);
      big = fmtD(d); bigSub = 'en línea recta desde tu ubicación · rumbo ' + cardinal(b) + ' (' + Math.round(b) + '°)';
      if (S.pos.acc > 30) bigSub += ' · precisión GPS ±' + Math.round(S.pos.acc) + ' m';
    }
    const gk = gkey(f);
    const sameG = S.pts.filter(p => p !== f && gkey(p) === gk);
    if (sameG.length) {
      let bp = null, bd = 1e12; sameG.forEach(p => { const d = hav(f.c[1], f.c[0], p.c[1], p.c[0]); if (d < bd) { bd = d; bp = p; } });
      rows.push(['Caja más cercana en esta cabina', esc(bp.n) + ' · ' + fmtD(bd)]);
    }
    const lines = S.linesByGroup.get(gk) || [];
    if (lines.length) {
      let tot = 0, seg = 0; lines.forEach(l => l.c.forEach(c => { tot += lengthM(c); seg++; }));
      rows.push(['Fibra trazada en esta cabina', fmtD(tot) + ' · ' + seg + ' tramos']);
    }
    S.selAreas.forEach((a, i) => {
      if (i > 1) return;
      rows.push(['Área de cobertura' + (a.n ? ' (' + esc(a.n) + ')' : ''), fmtA(a.c.reduce((s, r) => s + ringArea(r), 0)) + ' · perímetro ' + fmtD(a.c.reduce((s, r) => s + lengthM(r), 0))]);
    });
    rows.push(['Coordenadas', f.c[1].toFixed(6) + ', ' + f.c[0].toFixed(6)]);
    const m = modal('<h3>Metraje · ' + esc(f.n) + '</h3><div class="big">' + big + '</div><p class="lead">' + esc(bigSub) + '</p>' +
      rows.map(r => '<div class="mrow"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join('') +
      '<p class="lead" style="margin-top:12px">Las distancias son en línea recta. Para el recorrido por carretera usa “Ir con Waze”. Para el metraje real del cable, traza el recorrido sobre el mapa.</p>' +
      '<div class="btnrow"><button class="btn" id="mmLine">' + ic('nav') + (S.showLine ? 'Ocultar línea' : 'Mostrar línea') + '</button><button class="btn accent" id="mmTrace">' + ic('ruler') + 'Trazar recorrido</button></div>');
    hydrate(m);
    m.querySelector('#mmLine').onclick = () => { S.showLine = !S.showLine; closeModal(); map.invalidate(); };
    m.querySelector('#mmTrace').onclick = () => { closeModal(); startMeasure(f); };
  }
  function startMeasure(f) {
    S.meas = { on: true, pts: f ? [[f.c[0], f.c[1]]] : [] };
    if (f && S.sel) { S.sel = null; S.selAreas = []; }
    hideResults(); layout(); updateMeasure();
    if (f) map.flyTo(f.c[1], f.c[0], Math.max(map.z, 17), 0.35);
    toast(f ? 'Toca el mapa para marcar el recorrido desde la caja' : 'Toca el mapa para ir sumando metros', 3200);
  }
  function updateMeasure() {
    let t = 0; for (let i = 1; i < S.meas.pts.length; i++) t += hav(S.meas.pts[i - 1][1], S.meas.pts[i - 1][0], S.meas.pts[i][1], S.meas.pts[i][0]);
    $('#mTotal').textContent = fmtD(t) === '—' ? '0 m' : fmtD(t); map.invalidate();
  }
  function stopMeasure() { S.meas = { on: false, pts: [] }; layout(); map.invalidate(); }
  $('#btnMeasure').onclick = () => S.meas.on ? stopMeasure() : startMeasure(null);
  $('#mUndo').onclick = () => { S.meas.pts.pop(); updateMeasure(); };
  $('#mClear').onclick = () => { S.meas.pts = []; updateMeasure(); };
  $('#mDone').onclick = stopMeasure;

  /* ---------- agregar / editar ---------- */
  const fc = v => v === '' || v == null ? '' : (isFinite(+v) ? (+v).toFixed(6) : v);
  function parseNums(str) { return (String(str).match(/-?\d+(?:[.,]\d+)?/g) || []).map(n => parseFloat(n.replace(',', '.'))); }
  function openForm(f, draft) {
    const edit = !!f; let d = draft;
    if (!d) {
      d = { n: f ? f.n : '', muni: f ? f.g[0] || '' : '', cab: f ? f.g.slice(1).join(' › ') : '', lat: f ? f.c[1] : '', lon: f ? f.c[0] : '', d: f ? f.d || '' : '' };
      if (!f) {
        const ref = refPoint(), nn = nearest(ref, 1)[0];
        if (nn && nn[0] < 5000) { d.muni = nn[1].g[0] || ''; d.cab = nn[1].g.slice(1).join(' › '); }
      }
    }
    const munis = Array.from(S.munis.keys()).sort();
    const m = modal('<h3>' + (edit ? 'Editar caja' : 'Agregar caja') + '</h3><p class="lead">' + (edit ? 'Cambia los datos o la ubicación. Se marcará como “editada” al exportar.' : 'Escribe las coordenadas, usa tu GPS o fija el punto sobre el mapa.') + '</p>' +
      '<label class="field"><span>NOMBRE DE LA CAJA *</span><input id="fN" value="' + esc(d.n) + '" placeholder="Ej. NI101/102-YALGC0101" autocapitalize="characters" autocomplete="off"></label>' +
      '<div class="two"><label class="field"><span>MUNICIPIO</span><input id="fM" list="dlM" value="' + esc(d.muni) + '" autocomplete="off"><datalist id="dlM">' + munis.map(x => '<option value="' + esc(x) + '">').join('') + '</datalist></label>' +
      '<label class="field"><span>CABINA / CARPETA</span><input id="fC" list="dlC" value="' + esc(d.cab) + '" autocomplete="off"><datalist id="dlC"></datalist></label></div>' +
      '<div class="two"><label class="field"><span>LATITUD</span><input id="fLa" value="' + esc(fc(d.lat)) + '" placeholder="13.4542" autocomplete="off"></label>' +
      '<label class="field"><span>LONGITUD</span><input id="fLo" value="' + esc(fc(d.lon)) + '" placeholder="-86.4069" autocomplete="off"></label></div>' +
      '<div class="btnrow" style="margin:-2px 0 14px"><button class="btn small" id="fGps">' + ic('locate') + 'Mi GPS</button><button class="btn small" id="fPick">' + ic('pin') + 'Fijar en el mapa</button></div>' +
      '<label class="field"><span>NOTAS (OPCIONAL)</span><textarea id="fD" placeholder="Referencia, FAT, estado…">' + esc(d.d) + '</textarea></label>' +
      '<div class="btnrow">' + (edit && canDelete() ? '<button class="btn danger" id="fDel" style="flex:.45">' + ic('trash') + '</button>' : '') + '<button class="btn" id="fCancel">Cancelar</button><button class="btn accent" id="fSave">' + ic('check') + 'Guardar</button></div>');
    hydrate(m);
    const $$ = s => m.querySelector(s);
    const fillCab = () => { const set = S.munis.get($$('#fM').value.trim()); $$('#dlC').innerHTML = set ? Array.from(set).sort().map(x => '<option value="' + esc(x) + '">').join('') : ''; };
    fillCab(); $$('#fM').addEventListener('input', fillCab);
    const splitPaste = () => {
      const a = $$('#fLa'), o = $$('#fLo'); const nums = parseNums(a.value);
      if (nums.length >= 2) { a.value = nums[0]; o.value = nums[1]; }
    };
    $$('#fLa').addEventListener('input', splitPaste);
    const grab = () => ({ n: $$('#fN').value.trim(), muni: $$('#fM').value.trim(), cab: $$('#fC').value.trim(), lat: $$('#fLa').value.trim(), lon: $$('#fLo').value.trim(), d: $$('#fD').value.trim() });
    $$('#fGps').onclick = () => {
      if (!S.pos) { startGpsOnce(); toast('Esperando señal GPS… intenta de nuevo en unos segundos'); return; }
      $$('#fLa').value = S.pos.lat.toFixed(6); $$('#fLo').value = S.pos.lon.toFixed(6); toast('Ubicación actual (±' + Math.round(S.pos.acc) + ' m)');
    };
    $$('#fCancel').onclick = closeModal;
    $$('#fPick').onclick = () => { const dd = grab(); closeModal(); startPick(dd, f); };
    if ($$('#fDel')) $$('#fDel').onclick = async () => {
      if (await confirmBox('¿Eliminar ' + f.n + '?', 'Se quitará de la app. Si ya la exportaste, el archivo anterior no cambia.', 'Eliminar', true)) {
        await removeFeats([f]); deselect(); updateNearby(); map.invalidate(); toast('Caja eliminada');
      }
    };
    $$('#fSave').onclick = async () => {
      const v = grab(); let lat = parseFloat(v.lat.replace(',', '.')), lon = parseFloat(v.lon.replace(',', '.'));
      if (!v.n) { toast('Escribe el nombre de la caja'); $$('#fN').focus(); return; }
      if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) { toast('Revisa las coordenadas'); return; }
      const nn = nearest({ lat, lon }, 1)[0];
      if (nn && nn[0] > 150000 && !(await confirmBox('Ubicación lejana', 'Este punto queda a ' + fmtD(nn[0]) + ' de la caja más cercana. ¿Las coordenadas son correctas (¿falta el signo − en la longitud?)', 'Guardar igual'))) return;
      const g = [v.muni || 'Sin municipio'].concat(v.cab ? v.cab.split(/\s*›\s*/).filter(Boolean) : []);
      let tgt = f;
      if (edit) {
        const moved = hav(f.c[1], f.c[0], lat, lon) > 0.5;
        if (f.n !== v.n || moved || gkey(f) !== g.join('/') || (f.d || '') !== v.d) { if (f.st !== 'new') f.st = 'edit'; }
        f.n = v.n; f.c = [Math.round(lon * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6]; f.g = g; f.d = v.d || undefined; f.ts = Date.now();
      } else {
        tgt = { id: S.nextId++, t: 'p', n: v.n, g, c: [Math.round(lon * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6], d: v.d || undefined, st: 'new', ts: Date.now(), src: 'Agregada en la app' };
        S.feats.push(tgt);
      }
      prep(tgt); await DB.put(tgt); syncSoon(); reindex(); closeModal(); select(tgt, true); updateNearby();
      toast(edit ? 'Cambios guardados' : 'Caja agregada');
    };
  }
  function startPick(draft, f) {
    S.pick = { draft, f }; map.lock = null; layout();
    if (draft.lat !== '' && isFinite(parseFloat(draft.lat)) && isFinite(parseFloat(draft.lon))) map.flyTo(parseFloat(draft.lat), parseFloat(draft.lon), Math.max(map.z, 18), 0.5, 500);
    else if (S.pos) map.flyTo(S.pos.lat, S.pos.lon, Math.max(map.z, 18), 0.5, 500);
    $('#pickCoords').textContent = coordTxt(map.center().lat, map.center().lon);
  }
  $('#pickCancel').onclick = () => { const p = S.pick; S.pick = null; map.lock = null; layout(); openForm(p.f, p.draft); };
  $('#pickOk').onclick = () => {
    const p = S.pick, c = (p.anchor && map.lock) ? p.anchor : map.center(); S.pick = null; map.lock = null; p.draft.lat = c.lat.toFixed(6); p.draft.lon = c.lon.toFixed(6); layout(); openForm(p.f, p.draft);
  };
  // Pegar una georeferencia (decimal, grados/minutos/segundos, UTM o enlace de mapa) para colocar el punto
  $('#pickPaste').onclick = async () => {
    let clip = ''; try { clip = await navigator.clipboard.readText(); } catch (e) { }
    const m = modal('<h3>Pegar georeferencia</h3><p class="lead">Pega coordenadas (13.4542, -86.4069), grados/minutos/segundos, UTM o un enlace de Google Maps.</p><label class="field"><span>GEOREFERENCIA</span><input id="ppT" value="' + esc(Geo.parse(clip) ? clip.trim() : '') + '" placeholder="13.4542, -86.4069" autocomplete="off" autocapitalize="off"></label><p class="lead" id="ppE" style="min-height:18px"></p><div class="btnrow"><button class="btn" id="ppX">Cancelar</button><button class="btn accent" id="ppOk">' + ic('check') + 'Ir al punto</button></div>');
    hydrate(m); const q = s => m.querySelector(s); setTimeout(() => { q('#ppT').focus(); q('#ppT').select(); }, 60);
    q('#ppX').onclick = closeModal;
    const go = () => {
      const g = Geo.parse(q('#ppT').value); if (!g) { q('#ppE').textContent = 'No se entendió. Revisa el formato de la georeferencia'; return; }
      closeModal(); if (S.pick) { S.pick.anchor = { lat: g.lat, lon: g.lon }; map.lock = { x: Merc.mxOf(g.lon), y: Merc.myOf(g.lat) }; } map.flyTo(g.lat, g.lon, Math.max(map.z, 18), 0.5, 500); $('#pickCoords').textContent = coordTxt(g.lat, g.lon); toast('Punto marcado. Puedes hacer zoom sin que se mueva; si arrastras el mapa lo ajustas. Luego toca “Fijar aquí”', 4500); map.invalidate();
    };
    q('#ppOk').onclick = go; q('#ppT').onkeydown = e => { if (e.key === 'Enter') go(); };
  };
  $('#btnAdd').onclick = () => { if (S.sel) deselect(); openForm(null); };

  /* ---------- capas ---------- */
  $('#btnLayers').onclick = () => {
    const m = modal('<h3>Mapa y capas</h3><p class="lead">Elige el fondo y qué mostrar sobre el mapa.</p><div id="lyB"></div><div class="sep"></div><div id="lyL"></div><div class="legend"><span><i class="dot"></i>Caja</span><span><i class="dot nodo"></i>Nodo / cabina</span><span><i class="dot nueva"></i>Nueva</span></div>');
    const render = () => {
      const keys = ['auto', 'dark', 'light', 'sat', 'none'];
      const lab = k => k === 'auto' ? 'Automático · día y noche' : BASES[k].label;
      const sub = k => k === 'auto' ? '<small>Claro de día y oscuro de noche, según el sol</small>' : k === 'none' ? '<small>No descarga nada · ideal sin señal</small>' : '';
      const on = k => k === 'auto' ? (S.themeMode === 'auto' && (S.base === 'dark' || S.base === 'light')) : (k === 'dark' || k === 'light') ? (S.themeMode !== 'auto' && S.base === k) : S.base === k;
      m.querySelector('#lyB').innerHTML = keys.map(k => '<button class="opt' + (on(k) ? ' on' : '') + '" data-b="' + k + '"><span class="rad"></span><div><b>' + lab(k) + '</b>' + sub(k) + '</div></button>').join('');
      const L = [['cajas', 'Cajas y nodos'], ['areas', 'Áreas de cobertura'], ['rutas', 'Rutas de fibra'], ['etiquetas', 'Nombres de las cajas']];
      m.querySelector('#lyL').innerHTML = L.map(l => '<button class="opt' + (S.layers[l[0]] ? ' on' : '') + '" data-l="' + l[0] + '"><b>' + l[1] + '</b><span class="sw"></span></button>').join('');
    };
    render();
    m.onclick = e => {
      const b = e.target.closest('[data-b]'), l = e.target.closest('[data-l]');
      if (b) {
        const k = b.dataset.b;
        if (k === 'auto') { S.themeMode = 'auto'; if (S.base !== 'dark' && S.base !== 'light') S.base = 'dark'; autoTheme(); }
        else if (k === 'dark' || k === 'light') { S.themeMode = k; S.base = k; S.theme = k; applyBase(); }
        else { S.base = k; applyBase(); }
        saveSettings(); render();
      }
      if (l) { S.layers[l.dataset.l] = !S.layers[l.dataset.l]; saveSettings(); map.invalidate(); render(); }
    };
  };

  /* ---------- menú ---------- */
  let installEv = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEv = e; });
  $('#btnMenu').onclick = openMenu;
  function openMenu() {
    const nNew = S.pts.filter(p => p.st === 'new').length, nEd = S.pts.filter(p => p.st === 'edit').length;
    const cu = Cloud.user(), adm = cu && cu.role === 'admin', isT = cu && !adm;
    const nEv = S.evals.length, pEv = S.evals.filter(e => e.estado !== 'hecha').length;
    const items = [
      ...(adm ? [['team', 'Administración', 'Usuarios y ubicación del equipo', 'admin'], ['clip', 'Asignaciones', 'Asignar evaluaciones y rutas a los técnicos', 'asig'], ['box', 'Datos de cajas y KMZ', 'Ver, agregar y eliminar lo que se sincroniza', 'datos']] : []),
      ...(cu ? [['reset', 'Sincronización automática', SY.err ? 'Error: ' + SY.err + ' · toca para reintentar' : (SY.t ? 'Al día · última vez ' + ago(SY.t) : 'Web y app comparten los mismos datos'), 'sync']] : []),
      ...(cu ? [['user', 'Mi cuenta', cu.name + ' · ' + (cu.role === 'admin' ? 'Administrador' : 'Técnico'), 'acct']] : (Cloud.configured() ? [] : [['user', 'Conectar servidor', 'Activa usuarios, administrador y ubicación del equipo', 'srv']])),
      ['clip', isT ? 'Mis evaluaciones y ruta' : 'Evaluaciones técnicas', nEv ? nEv + ' órdenes · ' + pEv + ' pendientes' : (isT ? 'Aquí aparecen las que te asignen' : 'Carga un Excel con clientes y órdenes'), 'evals'],
      ...(isT ? [] : [['upload', 'Importar KMZ / KML', 'Suma o actualiza cajas desde otro archivo', 'imp'], ['download', 'Exportar KMZ', 'Todo con tus cambios, listo para Google Earth', 'exp']]),
      ['cloud', 'Guardar mosaicos de esta zona', 'Opcional: fondo en línea guardado para usar sin internet', 'off'],
      ['moon', 'Tema: ' + THEME_LABEL[S.themeMode], 'Toca para cambiar: automático, claro u oscuro', 'theme']
    ];
    if (installEv) items.push(['app', 'Instalar en el teléfono', 'Úsala como una app más', 'inst']);
    items.push(['map', 'Mapa de calles sin conexión', VEC ? 'Incluido · se activa solo cuando no hay internet' : 'No incluido en esta versión', 'vecinfo']);
    if (VEC && !NB && !S.vecSaved) items.push(['download', 'Descargar mapa de calles', 'Guarda el mapa de calles en este teléfono para usarlo sin internet', 'vecsave']);
    const m = modal('<h3>Vizor G <small style="font-size:12px;color:var(--muted);font-weight:500">v2.6 · mapa OpenStreetMap</small></h3><div class="kpis"><div class="stat"><small>Cajas</small><b>' + S.pts.length.toLocaleString('es') + '</b></div><div class="stat"><small>Nuevas</small><b>' + nNew + '</b></div><div class="stat"><small>Editadas</small><b>' + nEd + '</b></div></div>' +
      items.map(i => '<button class="menu-item" data-a="' + i[3] + '"><span class="mi">' + ic(i[0]) + '</span><div><b>' + i[1] + '</b><small>' + i[2] + '</small></div></button>').join(''));
    hydrate(m);
    m.onclick = async e => {
      const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a; closeModal();
      if (a === 'evals') openEvals();
      if (a === 'admin') openAdmin();
      if (a === 'datos') openDatos();
      if (a === 'asig') openAssign();
      if (a === 'sync') { await syncNow(true); toast(SY.err ? 'No se pudo sincronizar: ' + SY.err : 'Sincronizado', 3000); }
      if (a === 'acct') openAccount();
      if (a === 'srv') openServer();
      if (a === 'imp') $('#fileIn').click();
      if (a === 'exp') openExport();
      if (a === 'off') openOffline();
      if (a === 'vecsave') { busy('Descargando mapa de calles…'); try { await Vec.save(VEC_URL); S.vecSaved = true; VEC = null; vecTried = false; await ensureVector(); toast('Mapa de calles guardado en el teléfono'); } catch (e) { toast('No se pudo descargar el mapa: ' + e.message, 4000); } idle(); }
      if (a === 'vecinfo') { await ensureVector(); toast(VEC ? 'Mapa de calles listo. Se usa solo, sin internet.' : 'Esta versión no trae el mapa de calles sin conexión', 4000); }
      if (a === 'theme') { S.themeMode = { auto: 'light', light: 'dark', dark: 'auto' }[S.themeMode]; saveSettings(); autoTheme(); toast('Tema: ' + THEME_LABEL[S.themeMode]); }
      if (a === 'inst' && installEv) { installEv.prompt(); installEv = null; }
    };
  }

  /* ---------- importar ---------- */
  $('#fileIn').onchange = async e => {
    const files = Array.from(e.target.files || []); e.target.value = ''; if (!files.length) return;
    if (Cloud.user() && !isAdmin()) { toast('Solo el administrador puede importar KMZ'); return; }
    busy('Leyendo ' + (files.length > 1 ? files.length + ' archivos' : files[0].name) + '…');
    try {
      const sum = { add: 0, upd: 0, same: 0, p: 0, a: 0, l: 0, names: [] };
      for (const file of files) {
        await new Promise(r => setTimeout(r, 30));
        const list = await KML.readFile(file); if (!list.length) { sum.names.push(file.name + ' (vacío)'); continue; }
        const r = await mergeFeats(list, file.name); ['add', 'upd', 'same', 'p', 'a', 'l'].forEach(k => sum[k] += r[k]); sum.names.push(file.name);
      }
      reindex(); updateNearby(); map.invalidate(); idle();
      modal('<h3>Importación lista</h3><p class="lead">' + esc(sum.names.join(', ')) + '</p><div class="kpis"><div class="stat"><small>Nuevos</small><b>' + sum.add + '</b></div><div class="stat"><small>Actualizados</small><b>' + sum.upd + '</b></div><div class="stat"><small>Sin cambios</small><b>' + sum.same + '</b></div></div>' +
        '<p class="lead">Cajas nuevas o actualizadas: ' + sum.p + ' · áreas: ' + sum.a + ' · rutas: ' + sum.l + '.<br>Lo nuevo aparece en color morado hasta que lo exportes.</p><button class="btn accent wide" id="okI">Entendido</button>').querySelector('#okI').onclick = closeModal;
    } catch (err) { idle(); console.error(err); modal('<h3>No se pudo importar</h3><p class="lead">' + esc(err.message || err) + '</p><button class="btn wide" id="okI">Cerrar</button>').querySelector('#okI').onclick = closeModal; }
  };
  async function mergeFeats(list, srcName) {
    const r = { add: 0, upd: 0, same: 0, p: 0, a: 0, l: 0 }, toSave = [], now = Date.now(), seen = new Set();
    const idx = new Map(); S.pts.forEach(p => { const k = norm(p.n); if (!idx.has(k)) idx.set(k, []); idx.get(k).push(p); });
    const sig = c => c.length + ':' + c[0].length + ':' + c[0][0][0] + ',' + c[0][0][1];
    const gk = f => f.t + '|' + norm(f.n) + '|' + gkey(f);
    const gidx = new Map(), gsig = new Map();
    [...S.areas, ...S.lines].forEach(f => {
      const k = gk(f); if (!gidx.has(k)) gidx.set(k, []); gidx.get(k).push(f); gsig.set(k + '|' + sig(f.c), f);
    });
    for (const n of list) {
      if (n.t === 'p') {
        const cands = idx.get(norm(n.n)) || []; let hit = null, bd = 1e9;
        for (const c of cands) { if (seen.has(c.id)) continue; const d = hav(c.c[1], c.c[0], n.c[1], n.c[0]); if (d < 60 && d < bd) { bd = d; hit = c; } }
        if (!hit && cands.some(c => seen.has(c.id) && hav(c.c[1], c.c[0], n.c[1], n.c[0]) < 3)) { r.same++; continue; }
        if (!hit) { const sg = cands.filter(c => !seen.has(c.id) && gkey(c) === gkey(n)); if (sg.length === 1) hit = sg[0]; }
        if (hit) {
          seen.add(hit.id);
          const moved = hav(hit.c[1], hit.c[0], n.c[1], n.c[0]) > 1, newD = n.d && n.d !== hit.d;
          const newX = n.x && Object.keys(n.x).some(k => (hit.x || {})[k] !== n.x[k]);
          if (moved || newD || newX) {
            hit.c = n.c; if (n.d) hit.d = n.d; if (n.x) hit.x = Object.assign({}, hit.x, n.x);
            if (hit.st !== 'new') hit.st = 'edit'; hit.ts = now; prep(hit); toSave.push(hit); r.upd++; r.p++;
          } else r.same++;
        } else {
          const f = Object.assign(n, { id: S.nextId++, st: 'new', ts: now, src: srcName }); prep(f); S.feats.push(f); S.pts.push(f); seen.add(f.id);
          if (!idx.has(norm(f.n))) idx.set(norm(f.n), []); idx.get(norm(f.n)).push(f); toSave.push(f); r.add++; r.p++;
        }
      } else {
        const k = gk(n), exact = gsig.get(k + '|' + sig(n.c));
        if (exact) { seen.add(exact.id); r.same++; continue; }
        const list1 = (gidx.get(k) || []).filter(f => !seen.has(f.id));
        if (list1.length === 1 && (gidx.get(k) || []).length === 1) {
          const ex = list1[0]; seen.add(ex.id); ex.c = n.c; ex.ts = now; if (ex.st !== 'new') ex.st = 'edit'; prep(ex); toSave.push(ex); r.upd++; r[n.t]++;
        } else {
          const f = Object.assign(n, { id: S.nextId++, st: 'new', ts: now, src: srcName }); prep(f); S.feats.push(f); seen.add(f.id);
          if (!gidx.has(k)) gidx.set(k, []); gidx.get(k).push(f); gsig.set(k + '|' + sig(f.c), f); toSave.push(f); r.add++; r[n.t]++;
        }
      }
    }
    if (toSave.length) { await DB.putMany(toSave); syncSoon(); }
    return r;
  }

  /* ---------- exportar ---------- */
  function today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function passGate(title, sub) {
    return new Promise(res => {
      const m = modal('<h3>' + esc(title) + '</h3><p class="lead">' + esc(sub) + '</p><label class="field"><span>TU CONTRASEÑA</span><input id="pgP" type="password" autocomplete="current-password"></label><p class="lead" id="pgE" style="color:var(--bad,#ff6b6b);min-height:18px"></p><div class="btnrow"><button class="btn" id="pgX">Cancelar</button><button class="btn accent" id="pgOk">' + ic('check') + 'Continuar</button></div>');
      hydrate(m); const q = s => m.querySelector(s); let done = false; setTimeout(() => q('#pgP').focus(), 50);
      q('#pgX').onclick = () => { closeModal(); res(false); };
      const go = async () => {
        if (done) return; const p = q('#pgP').value; if (!p) { q('#pgE').textContent = 'Escribe tu contraseña'; return; }
        done = true; q('#pgOk').disabled = true; q('#pgE').textContent = 'Comprobando…';
        try { if (await Cloud.verifyPassword(p)) { res(true); return; } q('#pgE').textContent = 'Contraseña incorrecta'; }
        catch (e) { q('#pgE').textContent = Cloud.errText(e); }
        done = false; q('#pgOk').disabled = false; q('#pgP').select();
      };
      q('#pgOk').onclick = go; q('#pgP').onkeydown = e => { if (e.key === 'Enter') go(); };
    });
  }
  async function openExport() {
    if (!Cloud.user()) { toast('Inicia sesión como administrador para exportar'); return; }
    if (!isAdmin()) { toast('Solo el administrador puede exportar KMZ'); return; }
    if (!(await passGate('Exportar KMZ', 'Por seguridad, escribe tu contraseña de administrador para exportar.'))) return;
    const ch = S.feats.filter(f => f.st), nP = S.pts.length;
    let mode = 'all';
    const m = modal('<h3>Exportar KMZ</h3><p class="lead">Archivo listo para abrir en Google Earth (con carpetas por municipio y cabina).</p>' +
      '<button class="opt on" data-m="all"><span class="rad"></span><div><b>Todo con mis cambios</b><small>' + nP.toLocaleString('es') + ' cajas · ' + S.areas.length.toLocaleString('es') + ' áreas · ' + S.lines.length + ' rutas</small></div></button>' +
      '<button class="opt" data-m="chg"><span class="rad"></span><div><b>Solo nuevas y editadas</b><small>' + ch.length + ' elementos</small></div></button>' +
      '<label class="field" style="margin-top:14px"><span>NOMBRE DEL ARCHIVO</span><input id="xName" value="Cajas_ZonaNorte_' + today() + '"></label>' +
      '<div class="btnrow"><button class="btn accent" id="xGo">' + ic('download') + 'Descargar KMZ</button>' + (navigator.canShare || NB ? '<button class="btn" id="xShare">' + ic('share') + 'Enviar</button>' : '') + '</div>');
    hydrate(m);
    m.onclick = e => { const o = e.target.closest('[data-m]'); if (o) { mode = o.dataset.m; m.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === o)); } };
    const make = async () => {
      const list = mode === 'all' ? S.feats : ch; if (!list.length) { toast('No hay cambios para exportar'); return null; }
      busy('Creando KMZ…'); await new Promise(r => setTimeout(r, 40));
      const kml = KML.build(list, { rootName: S.seedName, docName: S.seedName + ' (actualizado ' + today() + ')' });
      const blob = await KML.toKMZ(kml); idle();
      const nm = (m.querySelector('#xName').value.trim() || 'Cajas').replace(/[\\/:*?"<>|]+/g, '_') + '.kmz'; return { blob, nm };
    };
    m.querySelector('#xGo').onclick = async () => {
      const r = await make(); if (!r) return; saveBlob(r.blob, r.nm, false);
      closeModal(); if (!NB) toast('KMZ listo: ' + r.nm, 1500);
    };
    if (m.querySelector('#xShare')) m.querySelector('#xShare').onclick = async () => {
      const r = await make(); if (!r) return; if (NB) { saveBlob(r.blob, r.nm, true); closeModal(); return; } const file = new File([r.blob], r.nm, { type: 'application/vnd.google-earth.kmz' });
      if (navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: r.nm }); } catch (e) { } closeModal(); } else toast('Este navegador no puede enviar archivos; usa Descargar');
    };
  }

  /* ---------- mapa sin conexión ---------- */
  function tilesFor(center, rKm, zmin, zmax) {
    const out = [], dLat = rKm / 110.574, dLon = rKm / (111.32 * Math.cos(center.lat * D2R));
    for (let z = zmin; z <= zmax; z++) {
      const n = 2 ** z, x0 = Math.floor(Merc.mxOf(center.lon - dLon) * n), x1 = Math.floor(Merc.mxOf(center.lon + dLon) * n);
      const y0 = Math.floor(Merc.myOf(center.lat + dLat) * n), y1 = Math.floor(Merc.myOf(center.lat - dLat) * n);
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push([z, x, y]);
    }
    return out;
  }
  function openOffline() {
    const b = BASES[S.base];
    if (b && b.google) { toast('El mapa de Google no se puede guardar sin conexión. Elige Oscuro, Calles o Satélite en “Capas”.', 5000); return; }
    if (!b || !b.url) { toast('Elige un mapa base (Oscuro, Calles o Satélite) en “Capas”'); return; }
    if (!navigator.onLine) { toast('Necesitas conexión para descargar el mapa'); return; }
    if (!('caches' in window)) { toast('Este navegador no permite guardar mapas'); return; }
    const c = S.pos ? { lat: S.pos.lat, lon: S.pos.lon } : map.center(); let rad = 2, zmax = 17;
    const m = modal('<h3>Mapa sin conexión</h3><p class="lead">Guarda el fondo (“' + esc(b.label) + '”) alrededor de ' + (S.pos ? 'tu ubicación' : 'el centro del mapa') + '. Las cajas, áreas y rutas ya funcionan sin internet.</p>' +
      '<label class="field"><span>RADIO</span><select id="oR"><option value="1">1 km</option><option value="2" selected>2 km</option><option value="4">4 km</option></select></label>' +
      '<label class="field"><span>DETALLE MÁXIMO</span><select id="oZ"><option value="16">Calles (zoom 16)</option><option value="17" selected>Casas (zoom 17)</option><option value="18">Máximo (zoom 18)</option></select></label>' +
      '<p class="lead" id="oEst"></p><div class="bar" id="oBar" hidden><i></i></div><div class="btnrow"><button class="btn" id="oC">Cerrar</button><button class="btn accent" id="oGo">' + ic('cloud') + 'Descargar</button></div>');
    hydrate(m);
    const est = () => { rad = +m.querySelector('#oR').value; zmax = +m.querySelector('#oZ').value; const n = tilesFor(c, rad, 11, zmax).length; m.querySelector('#oEst').textContent = '≈ ' + n.toLocaleString('es') + ' mosaicos (≈ ' + Math.round(n * 18 / 1024 * 10) / 10 + ' MB). ' + (n > 1500 ? 'Es demasiado: reduce el radio o el detalle.' : ''); m.querySelector('#oGo').disabled = n > 1500; return n; };
    m.querySelector('#oR').onchange = est; m.querySelector('#oZ').onchange = est; est();
    let cancel = false; m.querySelector('#oC').onclick = () => { cancel = true; closeModal(); };
    m.parentElement.querySelector('.scrim').onclick = () => { cancel = true; closeModal(); };
    m.querySelector('#oGo').onclick = async () => {
      const list = tilesFor(c, rad, 11, zmax), cache = await caches.open('tiles-v1'); let done = 0, fail = 0;
      m.querySelector('#oBar').hidden = false; m.querySelector('#oGo').disabled = true;
      const bar = m.querySelector('#oBar i'), txt = m.querySelector('#oEst');
      let i = 0;
      const worker = async () => {
        while (i < list.length && !cancel) {
          const [z, x, y] = list[i++], url = b.url.replace('{z}', z).replace('{x}', x).replace('{y}', y);
          try { if (!(await cache.match(url, { ignoreVary: true }))) { const r = await fetch(url, { mode: 'cors' }); if (r.ok) await cache.put(url, r); else fail++; } } catch (e) { fail++; }
          done++; if (done % 8 === 0 || done === list.length) { bar.style.width = (done / list.length * 100) + '%'; txt.textContent = done.toLocaleString('es') + ' de ' + list.length.toLocaleString('es') + ' mosaicos…'; }
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));
      if (!cancel) { txt.textContent = fail ? 'Listo, con ' + fail + ' mosaicos que no se pudieron bajar.' : '¡Listo! Esta zona ya funciona sin conexión.'; m.querySelector('#oC').textContent = 'Cerrar'; }
    };
  }


  /* ---------- punto buscado (georreferencia) ---------- */
  function setPin(lat, lon) {
    deselect(); S.pin = { lat, lon }; S.userMoved = true; S.follow = false; $('#btnLocate').classList.remove('on');
    layout(); renderPin(); map.flyTo(lat, lon, Math.max(map.z, 17.5), 0.35); map.invalidate();
  }
  // Ubicación recibida desde otra app (WhatsApp, Maps…): geo:lat,lon o enlace de mapa
  function geoFromShared(raw) {
    let t = String(raw || ''); try { t = decodeURIComponent(t); } catch (e) { }
    let m = t.match(/[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i);
    if (!m) { const g = Geo.parse(t); if (g) return g; }
    if (!m) m = t.match(/^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
    if (m && !(+m[1] === 0 && +m[2] === 0) && Math.abs(+m[1]) <= 90 && Math.abs(+m[2]) <= 180) return { lat: +m[1], lon: +m[2] };
    return null;
  }
  window.__geoIntent = () => {
    if (!NB || !NB.takeGeo) return; const raw = NB.takeGeo(); if (!raw) return;
    const g = geoFromShared(raw);
    if (!g) { toast('Ese enlace no trae coordenadas que la app pueda abrir', 4500); return; }
    closeModal(); setPin(g.lat, g.lon); toast('Ubicación recibida', 2500);
  };
  function clearPin() { S.pin = null; layout(); map.invalidate(); }
  function renderPin() {
    const p = S.pin; if (!p) return;
    $('#pinCoords').textContent = coordTxt(p.lat, p.lon);
    const nn = nearest(p, 1)[0], d = S.pos ? hav(S.pos.lat, S.pos.lon, p.lat, p.lon) : null;
    $('#pinNear').textContent = (nn ? 'Caja más cercana: ' + nn[1].n + ' · ' + fmtD(nn[0]) : 'Sin cajas cerca') + (d != null ? ' · a ' + fmtD(d) + ' de ti' : '');
    $('#pinCaja').disabled = !nn;
  }
  $('#pinX').onclick = clearPin;
  $('#pinWaze').onclick = () => { const p = S.pin; if (p) openExt('waze://?ll=' + p.lat + ',' + p.lon + '&navigate=yes', 'https://waze.com/ul?ll=' + p.lat + ',' + p.lon + '&navigate=yes&zoom=17'); };
  $('#pinCaja').onclick = () => { const nn = S.pin && nearest(S.pin, 1)[0]; if (nn) select(nn[1], true); };
  $('#pinAdd').onclick = () => {
    const p = S.pin; if (!p) return; const nn = nearest(p, 1)[0];
    openForm(null, { n: '', muni: nn && nn[0] < 5000 ? nn[1].g[0] || '' : '', cab: nn && nn[0] < 5000 ? nn[1].g.slice(1).join(' › ') : '', lat: p.lat.toFixed(6), lon: p.lon.toFixed(6), d: '' });
  };

  /* ---------- evaluaciones técnicas (Excel) ---------- */
  const EV_COLS = ['Nombre del cliente', 'Contacto del cliente', 'Dirección del cliente', 'Ubicación geográfica caja', 'Orden', 'Tipo de orden', 'Código técnico', 'Nombre del técnico'];
  const nrm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const evHay = e => norm([e.cliente, e.orden, e.tecnico, e.cod, e.contacto, e.direccion].join(' '));
  async function loadEvals() { try { const v = await DB.getMeta('evals'); S.evals = Array.isArray(v) ? v : []; } catch (e) { S.evals = []; } }
  function saveEvals() { const p = DB.setMeta('evals', S.evals); syncSoon(); return p; }
  const evTipoCls = t => t === 'Instalación' ? 'inst' : t === 'Daño' ? 'dano' : 'otro';
  function hitEval(px, py) {
    let best = null, bd = 26 * 26;
    for (const e of S.evals) {
      if (e.lat == null || e.estado === 'hecha' || map.z < 11) continue;
      const [x, y] = map.toScreen(e.lat, e.lon), d = (x - px) * (x - px) + (y - py) * (y - py);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  function normTipo(v) {
    const t = nrm(v);
    if (!t) return '';
    if (/inst|alta|nuev|activ/.test(t)) return 'Instalación';
    if (/dan|aver|falla|repar|soporte|sin servicio|mante/.test(t)) return 'Daño';
    return String(v).trim();
  }
  const FIELD_TESTS = [
    ['cod', /(cod|id|carnet|num).*(tec)|(tec).*(cod|id|carnet)/],
    ['tecnico', /tecn/],
    ['tipo', /tipo|clase|tipo/],
    ['contacto', /contact|telef|\btel\b|celular|\bcel\b|movil|whatsapp/],
    ['direccion', /direc|domicilio|referencia/],
    ['ubic', /ubic|geo|coord|caja|gps|georef/],
    ['orden', /orden|\bot\b|ticket|caso|\bnumero\b/],
    ['cliente', /cliente|nombre|abonado|suscriptor|usuario/],
    ['lat', /^lat/], ['lon', /^(lon|lng)/]
  ];
  function mapHeader(row) {
    const map = {}; let hits = 0;
    row.forEach((h, i) => {
      const t = nrm(h); if (!t) return;
      for (const [k, re] of FIELD_TESTS) if (!(k in map) && re.test(t)) { map[k] = i; hits++; break; }
    });
    return { map, hits };
  }
  let cajaByName = null;
  function findCaja(txt) {
    if (!cajaByName) { cajaByName = new Map(); S.pts.forEach(p => cajaByName.set(norm(p.n), p)); }
    const k = norm(txt); if (!k) return null;
    if (cajaByName.has(k)) return cajaByName.get(k);
    if (k.length >= 5) { const c = S.pts.filter(p => norm(p.n).includes(k)); if (c.length === 1) return c[0]; }
    return null;
  }
  function resolveLoc(e, latTxt, lonTxt) {
    let lat = null, lon = null, caja = '', cajaD = null;
    if (latTxt && lonTxt) { const g = Geo.parse(latTxt + ', ' + lonTxt); if (g) { lat = g.lat; lon = g.lon; } }
    if (lat == null && e.ubic) {
      const g = Geo.parse(e.ubic);
      if (g) { lat = g.lat; lon = g.lon; }
      else { const f = findCaja(e.ubic); if (f) { lat = f.c[1]; lon = f.c[0]; caja = f.n; cajaD = 0; } }
    }
    if (lat != null && !caja) { const nn = nearest({ lat, lon }, 1)[0]; if (nn && nn[0] <= 300) { caja = nn[1].n; cajaD = Math.round(nn[0]); } }
    e.lat = lat == null ? null : Math.round(lat * 1e6) / 1e6; e.lon = lon == null ? null : Math.round(lon * 1e6) / 1e6; e.caja = caja; e.cajaD = cajaD;
  }
  async function importEvalRows(rows, srcName) {
    if (!rows.length) throw new Error('El archivo está vacío');
    let { map: cm, hits } = mapHeader(rows[0]), start = 1;
    if (hits < 3) { // sin encabezados reconocibles: se asume el orden de la plantilla
      cm = { cliente: 0, contacto: 1, direccion: 2, ubic: 3, orden: 4, tipo: 5, cod: 6, tecnico: 7 }; start = 0;
    }
    cajaByName = null;
    const me = Cloud.user(), pre = me ? me.id.slice(0, 8) + ':' : '';
    const g = (r, k) => (k in cm && r[cm[k]] != null ? String(r[cm[k]]).trim() : '');
    const idx = new Map(); S.evals.forEach(e => idx.set(e.key, e));
    let add = 0, upd = 0, noLoc = 0, skip = 0;
    for (let i = start; i < rows.length; i++) {
      const r = rows[i];
      const e = { cliente: g(r, 'cliente'), contacto: g(r, 'contacto'), direccion: g(r, 'direccion'), ubic: g(r, 'ubic'), orden: g(r, 'orden'), tipo: normTipo(g(r, 'tipo')), cod: g(r, 'cod'), tecnico: g(r, 'tecnico') };
      if (!e.cliente && !e.orden) { skip++; continue; }
      resolveLoc(e, g(r, 'lat'), g(r, 'lon'));
      if (e.lat == null) noLoc++;
      e.key = pre + (e.orden ? 'o:' + nrm(e.orden) : 'c:' + nrm(e.cliente + ' ' + e.direccion)); e.owner = me ? me.id : null;
      const old = idx.get(e.key);
      if (old) { Object.assign(old, e, { src: srcName, ts: Date.now() }); upd++; }
      else { const n = Object.assign(e, { id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), estado: 'pend', nota: '', src: srcName, ts: Date.now() }); S.evals.push(n); idx.set(n.key, n); add++; }
    }
    await saveEvals(); map.invalidate();
    return { add, upd, noLoc, skip, total: rows.length - start };
  }
  $('#fileEval').onchange = async e => {
    const f = (e.target.files || [])[0]; e.target.value = ''; if (!f) return;
    busy('Leyendo ' + f.name + '…');
    try {
      const rows = await XLS.read(f); const r = await importEvalRows(rows, f.name); r.auto = await autoAssign(); idle();
      const m = modal('<h3>Evaluaciones cargadas</h3><p class="lead">' + esc(f.name) + '</p><div class="kpis"><div class="stat"><small>Nuevas</small><b>' + r.add + '</b></div><div class="stat"><small>Actualizadas</small><b>' + r.upd + '</b></div><div class="stat"><small>Sin ubicación</small><b>' + r.noLoc + '</b></div></div>' +
        (r.noLoc ? '<p class="lead">Las órdenes sin ubicación se ven en la lista pero no en el mapa. Revisa la columna “Ubicación geográfica caja”: puede ser coordenadas (12.1367, -86.2512) o el nombre de la caja.</p>' : '') +
        (r.auto ? '<p class="lead">' + r.auto + ' evaluaciones se asignaron solas a los técnicos con el mismo código técnico.</p>' : '') +
        (r.skip ? '<p class="lead">' + r.skip + ' filas vacías se omitieron.</p>' : '') +
        '<button class="btn accent wide" id="evGo">' + ic('clip') + 'Ver evaluaciones</button>');
      hydrate(m); m.querySelector('#evGo').onclick = () => openEvals();
    } catch (err) { idle(); console.error(err); modal('<h3>No se pudo leer el archivo</h3><p class="lead">' + esc(err.message || err) + '</p><button class="btn wide" id="okE">Cerrar</button>').querySelector('#okE').onclick = closeModal; }
  };
  function evRow(e) {
    return [e.cliente, e.contacto, e.direccion, e.ubic, e.orden, e.tipo, e.cod, e.tecnico];
  }
  async function evTemplate() {
    const exf = S.pts.find(p => kindOf(p) === 'caja'), ex = exf ? exf.n : 'NI101/102-XXXX0101';
    const rows = [EV_COLS,
      ['Juan Pérez López', '88881234', 'Barrio Larreynaga, de la iglesia 2 c. al sur', '12.136789, -86.251234', 'OT-100245', 'Instalación', 'T-0456', 'Carlos Gómez'],
      ['María Rodríguez', '77775678', 'Residencial Los Pinos, casa #12', ex, 'OT-100246', 'Daño', 'T-0457', 'Ana Martínez']];
    saveBlob(await XLS.write(rows, [26, 20, 40, 30, 14, 16, 16, 26], 'Evaluaciones'), 'Plantilla_Evaluaciones.xlsx', true);
  }
  async function evExport() {
    if (!S.evals.length) { toast('Aún no hay evaluaciones'); return; }
    const rows = [EV_COLS.concat(['Estado', 'Nota', 'Caja cercana', 'Latitud', 'Longitud'])];
    S.evals.forEach(e => rows.push(evRow(e).concat([e.estado === 'hecha' ? 'Hecha' : 'Pendiente', e.nota || '', e.caja || '', e.lat == null ? '' : e.lat, e.lon == null ? '' : e.lon])));
    saveBlob(await XLS.write(rows, [26, 20, 40, 30, 14, 16, 16, 26, 12, 30, 24, 12, 12], 'Evaluaciones'), 'Evaluaciones_' + new Date().toISOString().slice(0, 10) + '.xlsx', true);
  }
  const evF = { tipo: '', est: '', asg: '', q: '' };
  function openEvals() {
    const pend = S.evals.filter(e => e.estado !== 'hecha').length, cu = Cloud.user(), adm = isAdmin(), tech = cu && !adm;
    const rt = tech ? myRoute() : [], nx = rt[0];
    const m = modal('<h3>' + (tech ? 'Mis evaluaciones y ruta' : 'Evaluaciones técnicas') + '</h3>' +
      (rt.length ? '<div class="credbox" style="border-style:solid"><small style="color:var(--muted);text-transform:uppercase;letter-spacing:.6px;font-size:11px">Siguiente parada · ' + rt.length + (rt.length === 1 ? ' pendiente' : ' pendientes') + ' en tu ruta</small><br><b style="user-select:none">#' + (nx.seq || 1) + ' · ' + esc(nx.cliente || nx.orden) + '</b><br><span style="color:var(--muted);font-size:13px">' + esc(nx.direccion || '') + '</span><div class="btnrow" style="margin-top:10px"><button class="btn waze small" id="rtGo"' + (nx.lat == null ? ' disabled' : '') + '>' + ic('nav') + 'Ir con Waze</button><button class="btn small" id="rtMap">' + ic('pin') + 'Ver mi ruta</button></div></div>' : '') + '<div class="kpis"><div class="stat"><small>Total</small><b>' + S.evals.length + '</b></div><div class="stat"><small>Pendientes</small><b>' + pend + '</b></div><div class="stat"><small>Hechas</small><b>' + (S.evals.length - pend) + '</b></div></div>' +
      '<div class="evtools"><button class="btn accent" id="evImp">' + ic('upload') + 'Importar Excel</button><button class="btn" id="evTpl">' + ic('download') + 'Plantilla</button><button class="btn" id="evExp">' + ic('share') + 'Exportar</button></div>' +
      '<div class="evfilter" id="evChips"></div><input class="evsearch" id="evQ" placeholder="Buscar cliente, orden o técnico…" autocomplete="off" value="' + esc(evF.q) + '"><div id="evList"></div>');
    hydrate(m);
    const chips = [['', '', 'Todas'], ['tipo', 'Instalación', 'Instalación'], ['tipo', 'Daño', 'Daño'], ['est', 'pend', 'Pendientes'], ['est', 'hecha', 'Hechas']].concat(adm ? [['asg', 'none', 'Sin asignar'], ['asg', 'any', 'Asignadas']] : []);
    const list = () => {
      m.querySelector('#evChips').innerHTML = chips.map(c => '<button class="chip' + ((!c[0] && !evF.tipo && !evF.est && !evF.asg) || (c[0] && evF[c[0]] === c[1]) ? ' on' : '') + '" data-k="' + c[0] + '" data-v="' + c[1] + '">' + c[2] + '</button>').join('');
      const t = norm(evF.q), ref = refPoint();
      let L = S.evals.filter(e => (!evF.tipo || e.tipo === evF.tipo) && (!evF.est || (evF.est === 'hecha') === (e.estado === 'hecha')) && (!evF.asg || (evF.asg === 'none') === !e.asg) && (!t || evHay(e).includes(t)));
      L.forEach(e => e._d = e.lat != null ? hav(ref.lat, ref.lon, e.lat, e.lon) : null);
      L.sort((a, b) => (a.estado === 'hecha') - (b.estado === 'hecha') || (!(tech && a.asg) - !(tech && b.asg)) || (tech && a.asg && b.asg ? (a.seq || 1e9) - (b.seq || 1e9) : 0) || (a._d == null) - (b._d == null) || (a._d || 0) - (b._d || 0));
      m.querySelector('#evList').innerHTML = L.length ? L.slice(0, 200).map(e =>
        '<button class="evc" data-id="' + esc(e.id) + '"><div class="evt"><b>' + (e.asg && e.seq != null && e.estado !== 'hecha' ? '<span class="badge otro" style="margin-right:6px">#' + e.seq + '</span>' : '') + esc(e.cliente || 'Sin nombre') + '</b><span class="badge ' + evTipoCls(e.tipo) + '">' + esc(e.tipo || 'Sin tipo') + '</span></div>' +
        '<div class="evs">Orden ' + esc(e.orden || '—') + ' · ' + (adm ? (e.asgName ? 'Asignada a ' + esc(e.asgName) : 'Sin asignar') : esc(e.tecnico || '')) + '</div>' +
        (e.direccion ? '<div class="evs">' + esc(e.direccion) + '</div>' : '') +
        '<div class="evm"><span class="st ' + (e.estado === 'hecha' ? 'hecha' : 'pend') + '">' + (e.estado === 'hecha' ? 'Hecha' : 'Pendiente') + '</span><span class="dist">' + (e._d == null ? 'Sin ubicación' : fmtD(e._d)) + '</span></div></button>').join('')
        : '<p class="lead">' + (S.evals.length ? 'Ninguna evaluación coincide con el filtro.' : 'Todavía no hay evaluaciones. Toca “Plantilla” para bajar el Excel con el formato, llénalo y cárgalo con “Importar Excel”.') + '</p>';
    };
    list();
    m.querySelector('#evImp').onclick = () => { closeModal(); $('#fileEval').click(); };
    if (m.querySelector('#rtGo')) m.querySelector('#rtGo').onclick = () => openExt('waze://?ll=' + nx.lat + ',' + nx.lon + '&navigate=yes', 'https://waze.com/ul?ll=' + nx.lat + ',' + nx.lon + '&navigate=yes&zoom=17');
    if (m.querySelector('#rtMap')) m.querySelector('#rtMap').onclick = () => { closeModal(); fitRoute(rt); };
    m.querySelector('#evTpl').onclick = evTemplate;
    m.querySelector('#evExp').onclick = evExport;
    m.querySelector('#evQ').oninput = ev => { evF.q = ev.target.value; list(); };
    m.addEventListener('click', ev => {
      const c = ev.target.closest('.chip'); if (c) { evF.tipo = ''; evF.est = ''; evF.asg = ''; if (c.dataset.k) evF[c.dataset.k] = c.dataset.v; list(); return; }
      const b = ev.target.closest('.evc'); if (b) { const e = S.evals.find(x => x.id === b.dataset.id); if (e) openEvalDetail(e); }
    });
  }
  function openEvalDetail(e) {
    const rows = [['Cliente', e.cliente], ['Contacto', e.contacto], ['Dirección', e.direccion], ['Orden', e.orden], ['Tipo de orden', e.tipo], ['Código técnico', e.cod], ['Técnico', e.tecnico],
      ['Ubicación', e.lat != null ? coordTxt(e.lat, e.lon) : 'Sin ubicación' + (e.ubic ? ' (no se entendió “' + e.ubic + '”)' : '')],
      ['Caja', e.caja ? e.caja + (e.cajaD ? ' · a ' + fmtD(e.cajaD) : '') : '—'], ['Asignada a', e.asgName ? e.asgName + (e.seq != null ? ' · parada #' + e.seq : '') : (isAdmin() ? 'Sin asignar' : '')]];
    if (e.lat != null && S.pos) rows.push(['Distancia a ti', fmtD(hav(S.pos.lat, S.pos.lon, e.lat, e.lon))]);
    const digits = String(e.contacto || '').replace(/\D/g, '');
    const m = modal('<h3>' + esc(e.cliente || 'Evaluación') + '</h3><p class="lead"><span class="badge ' + evTipoCls(e.tipo) + '">' + esc(e.tipo || 'Sin tipo') + '</span> &nbsp;Orden ' + esc(e.orden || '—') + ' · <span class="st ' + (e.estado === 'hecha' ? 'hecha' : 'pend') + '">' + (e.estado === 'hecha' ? 'Hecha' : 'Pendiente') + '</span></p>' +
      '<div class="d-actions"><button class="btn waze" id="evW"' + (e.lat == null ? ' disabled' : '') + '>' + ic('nav') + 'Ir con Waze</button><button class="btn" id="evMap"' + (e.lat == null ? ' disabled' : '') + '>' + ic('pin') + 'Ver en el mapa</button></div>' +
      (isAdmin() ? '<div class="evgrid" style="grid-template-columns:1fr 1fr;margin-top:0"><button class="btn ghost" id="evEdit">' + ic('edit') + '<span>Editar datos</span></button><button class="btn ghost" id="evAsg">' + ic('team') + '<span>' + (e.asg ? 'Reasignar' : 'Asignar a técnico') + '</span></button></div>' : '') +
      '<div class="evgrid"><button class="btn ghost" id="evTel"' + (digits ? '' : ' disabled') + '>' + ic('phone') + '<span>Llamar</span></button><button class="btn ghost" id="evWa"' + (digits ? '' : ' disabled') + '>' + ic('chat') + '<span>WhatsApp</span></button><button class="btn ghost" id="evOk">' + ic('check') + '<span>' + (e.estado === 'hecha' ? 'Reabrir' : 'Marcar hecha') + '</span></button></div>' +
      '<dl class="evinfo">' + rows.filter(r => r[1]).map(r => '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>').join('') + '</dl>' +
      '<label class="field"><span>NOTA DE LA EVALUACIÓN</span><textarea id="evN" placeholder="Observaciones, metraje, materiales…">' + esc(e.nota || '') + '</textarea></label>' +
      '<div class="evcom"><div class="evfilter" style="margin:4px 0 6px"><b style="font-size:13px;color:var(--muted)">COMENTARIOS</b></div><div id="cmList"><p class="lead">Cargando…</p></div>' + (Cloud.user() ? '<textarea id="cmT" maxlength="1500" placeholder="Escribe un comentario para revisión…" style="min-height:64px"></textarea><button class="btn small accent" id="cmSend" style="margin-top:6px">' + ic('chat') + 'Enviar comentario</button>' : '') + '</div>' +
      '<div class="btnrow">' + (canDeleteEval(e) ? '<button class="btn danger" id="evDel" style="flex:.45">' + ic('trash') + '</button>' : '') + '<button class="btn" id="evBack">Lista</button><button class="btn accent" id="evSave">' + ic('check') + 'Guardar nota</button></div>');
    hydrate(m);
    const $$ = s => m.querySelector(s);
    $$('#evW').onclick = () => openExt('waze://?ll=' + e.lat + ',' + e.lon + '&navigate=yes', 'https://waze.com/ul?ll=' + e.lat + ',' + e.lon + '&navigate=yes&zoom=17');
    $$('#evMap').onclick = () => { closeModal(); const f = e.caja ? S.pts.find(p => p.n === e.caja) : null; if (f && (e.cajaD || 0) <= 300) select(f, true); else setPin(e.lat, e.lon); };
    $$('#evTel').onclick = () => openExt('tel:' + (e.contacto || '').replace(/[^\d+]/g, ''));
    $$('#evWa').onclick = () => openExt('https://wa.me/' + (digits.length === 8 ? '505' + digits : digits));
    $$('#evOk').onclick = async () => { e.estado = e.estado === 'hecha' ? 'pend' : 'hecha'; e.nota = $$('#evN').value.trim(); e.ts = Date.now(); await saveEvals(); map.invalidate(); toast(e.estado === 'hecha' ? 'Evaluación marcada como hecha' : 'Evaluación reabierta'); openEvalDetail(e); };
    $$('#evSave').onclick = async () => { e.nota = $$('#evN').value.trim(); e.ts = Date.now(); await saveEvals(); toast('Nota guardada'); };
    $$('#evBack').onclick = () => openEvals();
    const cmU = 'ev:' + e.key, cmL = $$('#cmList'), me = Cloud.user();
    const fmtAt = s => { const d = new Date(s); return d.toLocaleDateString('es', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); };
    const cmDraw = L => {
      cmL.innerHTML = L.length ? L.map(c => '<div class="evinfo" style="margin:0 0 6px;padding:8px 10px;border:1px solid var(--line,#ffffff1f);border-radius:10px"><div style="display:flex;gap:6px;align-items:center;font-size:12px;color:var(--muted)"><b style="color:var(--text)">' + esc(c.name) + '</b><span class="badge ' + (c.role === 'admin' ? 'otro' : '') + '">' + (c.role === 'admin' ? 'Admin' : 'Técnico') + '</span><span style="margin-left:auto">' + esc(fmtAt(c.at)) + '</span>' + (isAdmin() ? '<button class="btn small danger" data-cd="' + esc(c.id) + '" style="padding:2px 8px">✕</button>' : '') + '</div><div style="white-space:pre-wrap;margin-top:4px">' + esc(c.body) + '</div></div>').join('') : '<p class="lead">Sin comentarios todavía.</p>';
    };
    const cmLoad = async () => {
      if (!me) { cmL.innerHTML = '<p class="lead">Inicia sesión para ver comentarios.</p>'; return; }
      try { cmDraw(await Cloud.commentsList(cmU)); }
      catch (er) { cmL.innerHTML = '<p class="lead">' + esc(er.code === 'forbidden' ? 'Aún no se sincroniza esta evaluación. Toca Sincronizar y vuelve a abrirla.' : er.code === 'network' ? 'Sin conexión: los comentarios se ven y se envían con internet.' : Cloud.errText(er)) + '</p>'; }
    };
    cmLoad();
    if ($$('#cmSend')) $$('#cmSend').onclick = async () => {
      const t = $$('#cmT').value.trim(); if (!t) { toast('Escribe un comentario'); return; }
      const b = $$('#cmSend'); b.disabled = true;
      try {
        try { await Cloud.commentAdd(cmU, t); } catch (er) { if (er.code !== 'forbidden') throw er; await syncNow(true); await Cloud.commentAdd(cmU, t); }
        $$('#cmT').value = ''; toast('Comentario guardado en el servidor'); await cmLoad();
      } catch (er) { toast(er.code === 'network' ? 'Sin internet: no se pudo enviar el comentario' : Cloud.errText(er), 3500); }
      b.disabled = false;
    };
    cmL.onclick = async ev => { const d = ev.target.closest('[data-cd]'); if (!d) return; if (await confirmBox('¿Eliminar este comentario?', '', 'Eliminar', true)) { try { await Cloud.commentDelete(d.dataset.cd); } catch (er) { toast(Cloud.errText(er)); } openEvalDetail(e); } };
    if ($$('#evEdit')) { $$('#evEdit').onclick = () => openEvalEdit(e); $$('#evAsg').onclick = () => openAssign(e); }
    if ($$('#evDel')) $$('#evDel').onclick = async () => { if (await confirmBox('¿Eliminar esta evaluación?', (e.cliente || '') + ' · orden ' + (e.orden || '—'), 'Eliminar', true)) { S.evals = S.evals.filter(x => x !== e); await addTomb('ev:' + e.key, 'eval'); if (S.routeView) renum(S.routeView.tech); await saveEvals(); map.invalidate(); openEvals(); } };
  }



  /* ---------- sincronización de datos (web ⇄ app) ---------- */
  const SY = { busy: false, t: 0, err: '', info: '' };
  const canDelete = () => !Cloud.user() || isAdmin();
  const canDeleteEval = e => !Cloud.user() || isAdmin() || e.owner === Cloud.user().id;
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  const featU = f => f.u || (f.src === S.seedName ? 'seed:' + f.id : (f.u = uuid()));
  const metaGet = async (k, def) => { try { const v = await DB.getMeta(k); return v == null ? def : v; } catch (e) { return def; } };
  async function addTomb(u, kind) {
    if (!Cloud.user()) return; const t = await metaGet('tomb', []); if (!t.some(x => x.u === u)) t.push({ u, kind: kind || 'feat' }); await DB.setMeta('tomb', t);
  }
  async function removeFeats(list) {
    if (!list.length) return; const set = new Set(list);
    for (const f of list) if (Cloud.user() && !(f.st === 'new' && !f.sy)) await addTomb(featU(f), 'feat');
    S.feats = S.feats.filter(x => !set.has(x)); await DB.delMany(list.map(f => f.id)); reindex(); updateNearby(); map.invalidate(); syncSoon();
  }
  let syT = 0;
  function syncSoon() { if (!Cloud.user()) return; clearTimeout(syT); syT = setTimeout(() => syncNow(), 2500); }
  function updateSyncPill() {
    const el = $('#pillSync'), u = Cloud.user(); el.hidden = !u; if (!u) return;
    el.className = 'pill ' + (SY.err ? 'warn' : SY.busy ? '' : 'ok'); el.textContent = SY.busy ? (SY.info || 'Sincronizando…') : SY.err ? 'Sin sincronizar' : 'Sincronizado';
  }
  const featData = f => ({ t: f.t, n: f.n, g: f.g, c: f.c, d: f.d, x: f.x, st: f.st, src: f.src, ts: f.ts });
  const evData = e => { const o = Object.assign({}, e); delete o._d; delete o.sy; delete o.id; return o; };
  async function pushAll() {
    const admin = isAdmin(), items = [], done = [];
    S.feats.forEach(f => { if (f.st && (f.ts || 0) > (f.sy || 0)) { items.push({ u: featU(f), kind: 'feat', data: featData(f), deleted: false }); done.push(() => { f.sy = f.ts; return f; }); } });
    const snap = new Map(); S.feats.forEach(f => snap.set(f, f.ts));
    S.evals.forEach(e => { if ((e.ts || 0) > (e.sy || 0)) { items.push({ u: 'ev:' + e.key, kind: 'eval', data: evData(e), deleted: false }); const ts = e.ts; done.push(() => { e.sy = ts; return null; }); } });
    const allTomb = await metaGet('tomb', []), tomb = allTomb.filter(t => admin || t.kind === 'eval');
    tomb.forEach(t => items.push({ u: t.u, kind: t.kind, data: null, deleted: true }));
    if (!items.length) return 0;
    const chunks = []; let cur = [], sz = 0;
    items.forEach(it => { const s = JSON.stringify(it).length; if (cur.length && (sz + s > 350000 || cur.length >= 150)) { chunks.push(cur); cur = []; sz = 0; } cur.push(it); sz += s; });
    if (cur.length) chunks.push(cur);
    let sent = 0;
    for (const ch of chunks) {
      SY.info = 'Subiendo ' + sent + '/' + items.length; updateSyncPill();
      await Cloud.push(ch); sent += ch.length;
    }
    const saved = []; done.forEach(fn => { const f = fn(); if (f) saved.push(f); });
    if (saved.length) await DB.putMany(saved); await saveEvalsQuiet();
    if (tomb.length) await DB.setMeta('tomb', allTomb.filter(t => !tomb.includes(t)));
    return sent;
  }
  const saveEvalsQuiet = () => DB.setMeta('evals', S.evals);
  async function pullAll() {
    let cur = await metaGet('sync', { ts: 'epoch', u: '' }), total = 0, chg = false;
    const byU = new Map(); S.feats.forEach(f => byU.set(featU2(f), f)); const evByK = new Map(S.evals.map(e => [e.key, e]));
    const tomb = new Set((await metaGet('tomb', [])).map(t => t.u));
    for (let guard = 0; guard < 400; guard++) {
      const page = await Cloud.pull(cur.ts, cur.u, 200); if (!page || !page.length) break;
      const save = [], del = []; let evChg = false;
      for (const it of page) {
        if (it.kind === 'feat') {
          if (tomb.has(it.u)) continue; let f = byU.get(it.u);
          if (it.deleted) { if (f) { del.push(f.id); S.feats = S.feats.filter(x => x !== f); byU.delete(it.u); } continue; }
          const d = it.data || {}; if (!d.t || !d.c) continue;
          if (f && f.st && (f.ts || 0) > (f.sy || 0)) continue; // cambio local sin subir
          if (!f) { f = { id: S.nextId++, t: d.t }; S.feats.push(f); byU.set(it.u, f); }
          Object.assign(f, { t: d.t, n: d.n, g: d.g || [], c: d.c, d: d.d, x: d.x, st: d.st, src: d.src, ts: d.ts || 0, u: it.u, sy: d.ts || 0 }); prep(f); save.push(f);
        } else {
          const key = it.u.slice(3); let e = evByK.get(key);
          if (it.deleted) { if (e) { S.evals = S.evals.filter(x => x !== e); evByK.delete(key); evChg = true; } continue; }
          const d = it.data || {}; const me = Cloud.user();
          if (me && me.role !== 'admin' && d.owner !== me.id && d.asg !== me.id) { if (e) { S.evals = S.evals.filter(x => x !== e); evByK.delete(key); evChg = true; } continue; }
          if (e && (e.ts || 0) > (e.sy || 0)) continue;
          if (!e) { e = { id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }; S.evals.push(e); evByK.set(key, e); }
          Object.assign(e, d, { key, sy: d.ts || 0 }); evChg = true;
        }
      }
      if (save.length) await DB.putMany(save); if (del.length) await DB.delMany(del);
      if (save.length || del.length) chg = true; if (evChg) { await saveEvalsQuiet(); chg = true; }
      const last = page[page.length - 1]; cur = { ts: last.ts, u: last.u }; await DB.setMeta('sync', cur); total += page.length;
      SY.info = 'Descargando ' + total; updateSyncPill();
      if (page.length < 200) break;
    }
    if (chg) { reindex(); cajaByName = null; updateNearby(); map.invalidate(); if (S.sel && !S.feats.includes(S.sel)) deselect(); }
    return total;
  }
  const featU2 = f => f.u || (f.src === S.seedName ? 'seed:' + f.id : '');
  function adoptEvals() {
    const me = Cloud.user(); if (!me) return; const pre = me.id.slice(0, 8) + ':';
    S.evals.forEach(e => { if (!e.owner && !e.sy) { e.owner = me.id; if (!e.key.startsWith(pre)) e.key = pre + e.key; e.ts = Date.now(); } });
  }
  async function syncNow(manual) {
    if (!Cloud.user() || SY.busy) return; if (!navigator.onLine) { if (manual) SY.err = 'Sin internet'; updateSyncPill(); return; }
    SY.busy = true; SY.err = ''; SY.info = ''; updateSyncPill();
    try { adoptEvals(); await pushAll(); const n = await pullAll(); SY.t = Date.now(); if (n && !manual) toast('Datos actualizados desde el servidor (' + n + ')', 2500); }
    catch (e) { SY.err = e.code === 'network' ? 'Sin conexión con el servidor' : Cloud.errText(e); }
    finally { SY.busy = false; updateSyncPill(); }
  }

  /* administración de datos (solo administrador) */
  function openDatos() {
    if (!isAdmin()) return;
    const bySrc = new Map(); S.feats.forEach(f => { const k = f.src || 'Sin origen'; const o = bySrc.get(k) || { p: 0, a: 0, l: 0 }; o[f.t]++; bySrc.set(k, o); });
    const m = modal('<h3>Datos de cajas y KMZ</h3><div class="kpis"><div class="stat"><small>Cajas</small><b>' + S.pts.length.toLocaleString('es') + '</b></div><div class="stat"><small>Áreas</small><b>' + S.areas.length.toLocaleString('es') + '</b></div><div class="stat"><small>Rutas</small><b>' + S.lines.length + '</b></div></div>' +
      '<div class="evtools"><button class="btn accent" id="dtImp">' + ic('upload') + 'Importar KMZ</button><button class="btn" id="dtAdd">' + ic('plus') + 'Agregar caja</button></div>' +
      '<p class="lead" style="margin:6px 0">Lo que importes, agregues o elimines aquí se sincroniza con la web y con todos los teléfonos.</p>' +
      '<div class="evfilter" style="margin-bottom:4px"><b style="font-size:13px;color:var(--muted)">POR ARCHIVO DE ORIGEN</b></div><div id="dtSrc"></div>' +
      '<div class="evfilter" style="margin:12px 0 6px"><b style="font-size:13px;color:var(--muted)">BUSCAR Y ELIMINAR UNA CAJA</b></div><input class="evsearch" id="dtQ" placeholder="Nombre de la caja…" autocomplete="off" autocapitalize="characters"><div id="dtRes"></div>');
    hydrate(m);
    m.querySelector('#dtSrc').innerHTML = Array.from(bySrc).map(([k, o]) => '<div class="urow"><div class="meta"><b>' + esc(k) + '</b><small>' + o.p + ' cajas · ' + o.a + ' áreas · ' + o.l + ' rutas</small></div><button class="btn small danger" data-src="' + esc(k) + '">' + ic('trash') + '</button></div>').join('');
    m.querySelector('#dtImp').onclick = () => { closeModal(); $('#fileIn').click(); };
    m.querySelector('#dtAdd').onclick = () => { closeModal(); openForm(null); };
    m.querySelector('#dtSrc').onclick = async ev => {
      const b = ev.target.closest('[data-src]'); if (!b) return; const k = b.dataset.src, list = S.feats.filter(f => (f.src || 'Sin origen') === k);
      if (await confirmBox('¿Eliminar “' + k + '”?', 'Se borrarán ' + list.length.toLocaleString('es') + ' elementos de este archivo, también en la web y en los teléfonos. No se puede deshacer.', 'Eliminar todo', true)) {
        busy('Eliminando…'); await new Promise(r => setTimeout(r, 30)); await removeFeats(list); idle(); toast('Eliminado: ' + list.length + ' elementos'); openDatos();
      }
    };
    m.querySelector('#dtQ').oninput = ev => {
      const t = norm(ev.target.value), box = m.querySelector('#dtRes'); if (t.length < 2) { box.innerHTML = ''; return; }
      const L = S.pts.filter(p => norm(p.n).includes(t)).slice(0, 25);
      box.innerHTML = L.length ? L.map(p => '<div class="urow"><div class="meta"><b>' + esc(p.n) + '</b><small>' + esc(subOf(p)) + '</small></div><button class="btn small" data-v="' + p.id + '">' + ic('pin') + '</button><button class="btn small danger" data-d="' + p.id + '">' + ic('trash') + '</button></div>').join('') : '<p class="lead">Sin resultados</p>';
      hydrate(box);
    };
    m.querySelector('#dtRes').onclick = async ev => {
      const v = ev.target.closest('[data-v]'), d = ev.target.closest('[data-d]');
      if (v) { const f = S.feats.find(x => x.id === +v.dataset.v); if (f) { closeModal(); select(f, true); } }
      if (d) { const f = S.feats.find(x => x.id === +d.dataset.d); if (f && await confirmBox('¿Eliminar ' + f.n + '?', 'Se quitará también en la web y en los teléfonos.', 'Eliminar', true)) { await removeFeats([f]); toast('Caja eliminada'); m.querySelector('#dtQ').dispatchEvent(new Event('input')); } }
    };
  }


  /* ---------- asignaciones y rutas ---------- */
  S.routeView = null;
  const myRoute = () => { const me = Cloud.user(); return me ? S.evals.filter(e => e.asg === me.id && e.estado !== 'hecha').sort((a, b) => (a.seq || 1e9) - (b.seq || 1e9)) : []; };
  function routeStops() {
    const me = Cloud.user(), id = S.routeView ? S.routeView.tech : (me && me.role !== 'admin' ? me.id : null); if (!id) return [];
    return S.evals.filter(e => e.asg === id && e.estado !== 'hecha' && e.lat != null).sort((a, b) => (a.seq || 1e9) - (b.seq || 1e9));
  }
  function fitRoute(list) {
    const L = (list || routeStops()).filter(e => e.lat != null); if (!L.length) { toast('Esta ruta no tiene paradas con ubicación'); return; }
    let a = 90, c = -90, d = 180, f = -180; L.forEach(e => { a = Math.min(a, e.lat); c = Math.max(c, e.lat); d = Math.min(d, e.lon); f = Math.max(f, e.lon); });
    if (S.pos && !S.routeView) { a = Math.min(a, S.pos.lat); c = Math.max(c, S.pos.lat); d = Math.min(d, S.pos.lon); f = Math.max(f, S.pos.lon); }
    deselect(); S.userMoved = true; S.follow = false; if (L.length === 1 && !S.pos) map.flyTo(L[0].lat, L[0].lon, 16.5, 0.4); else map.fitBounds(a, d, c, f, 80); map.invalidate();
  }
  function setRouteView(tech, name) {
    S.routeView = tech ? { tech, name } : null; const p = $('#pillRoute'); p.hidden = !tech;
    if (tech) p.textContent = 'Ruta de ' + (name || 'técnico') + ' · quitar ✕'; map.invalidate();
  }
  $('#pillRoute').onclick = () => setRouteView(null);
  function renum(techId) {
    const L = S.evals.filter(e => e.asg === techId && e.estado !== 'hecha').sort((a, b) => (a.seq || 1e9) - (b.seq || 1e9));
    L.forEach((e, i) => { if (e.seq !== i + 1) { e.seq = i + 1; e.ts = Date.now(); } });
  }
  function assignTo(e, tech) {
    const max = S.evals.filter(x => x.asg === tech.id && x.estado !== 'hecha').reduce((m, x) => Math.max(m, x.seq || 0), 0);
    e.asg = tech.id; e.asgName = tech.name; e.seq = max + 1; e.ts = Date.now();
  }
  function unassign(e) {
    const old = e.asg; e.prev = Array.from(new Set((e.prev || []).concat(old ? [old] : []))); e.asg = null; e.asgName = null; e.seq = null; e.ts = Date.now(); if (old) renum(old);
  }
  async function autoAssign() {
    if (!isAdmin() || !navigator.onLine) return 0;
    try {
      const users = (await Cloud.listUsers()).filter(u => u.role === 'tecnico' && u.active !== false && u.code), byCode = new Map(users.map(u => [String(u.code).toLowerCase(), u]));
      let n = 0; S.evals.forEach(e => { if (!e.asg && e.cod && e.estado !== 'hecha') { const u = byCode.get(String(e.cod).toLowerCase()); if (u) { assignTo(e, u); n++; } } });
      if (n) await saveEvals(); return n;
    } catch (err) { return 0; }
  }
  function nearestOrder(list, start) {
    const out = [], rest = list.filter(e => e.lat != null), none = list.filter(e => e.lat == null); let cur = start;
    while (rest.length) {
      let bi = 0, bd = 1e12;
      rest.forEach((e, i) => { const d = cur ? hav(cur.lat, cur.lon, e.lat, e.lon) : 0; if (d < bd) { bd = d; bi = i; } });
      const e = rest.splice(bi, 1)[0]; out.push(e); cur = { lat: e.lat, lon: e.lon };
    }
    return out.concat(none);
  }
  async function openAssign(pre) {
    if (!isAdmin()) return;
    busy('Cargando técnicos…'); let users;
    try { users = (await Cloud.listUsers()).filter(u => u.active !== false); } catch (e) { idle(); toast(Cloud.errText(e), 3500); return; } idle();
    const techs = users.filter(u => u.role === 'tecnico');
    if (!techs.length) { const m = modal('<h3>Asignaciones</h3><p class="lead">Todavía no hay técnicos. Créalos en Administración › Nuevo usuario y vuelve aquí.</p><button class="btn wide" id="asX">Cerrar</button>'); m.querySelector('#asX').onclick = closeModal; return; }
    const st = { tech: (pre && pre.asg && techs.some(t => t.id === pre.asg) ? pre.asg : (S.asgLast && techs.some(t => t.id === S.asgLast) ? S.asgLast : techs[0].id)), sel: new Set(pre && !pre.asg ? [pre.id] : []), q: '' };
    const render = () => {
      S.asgLast = st.tech; const tech = techs.find(t => t.id === st.tech), t = norm(st.q);
      const route = S.evals.filter(e => e.asg === tech.id && e.estado !== 'hecha').sort((a, b) => (a.seq || 1e9) - (b.seq || 1e9));
      const done = S.evals.filter(e => e.asg === tech.id && e.estado === 'hecha').length;
      const free = S.evals.filter(e => !e.asg && e.estado !== 'hecha' && (!t || evHay(e).includes(t)));
      const m = modal('<h3>Asignaciones</h3><label class="field"><span>TÉCNICO</span><select class="sel" id="asT">' + techs.map(u => '<option value="' + esc(u.id) + '"' + (u.id === st.tech ? ' selected' : '') + '>' + esc(u.name) + (u.code ? ' (' + esc(u.code) + ')' : '') + '</option>').join('') + '</select></label>' +
        '<div class="kpis"><div class="stat"><small>En su ruta</small><b>' + route.length + '</b></div><div class="stat"><small>Hechas</small><b>' + done + '</b></div><div class="stat"><small>Sin asignar</small><b>' + S.evals.filter(e => !e.asg && e.estado !== 'hecha').length + '</b></div></div>' +
        '<div class="evfilter" style="margin:4px 0 6px"><b style="font-size:13px;color:var(--muted)">RUTA DE ' + esc(tech.name.toUpperCase()) + '</b></div><div id="asRoute">' +
        (route.length ? route.map((e, i) => '<div class="urow"><span class="av on">' + (i + 1) + '</span><div class="meta"><b>' + esc(e.cliente || e.orden) + '</b><small>Orden ' + esc(e.orden || '—') + ' · ' + esc(e.tipo || '') + (e.lat == null ? ' · sin ubicación' : '') + '</small><small>' + esc(e.direccion || '') + '</small></div>' +
          '<button class="btn small" data-up="' + esc(e.id) + '"' + (i === 0 ? ' disabled' : '') + '>▲</button><button class="btn small" data-dn="' + esc(e.id) + '"' + (i === route.length - 1 ? ' disabled' : '') + '>▼</button><button class="btn small danger" data-rm="' + esc(e.id) + '">✕</button></div>').join('') : '<p class="lead">Sin paradas todavía. Marca evaluaciones abajo y toca “Asignar”.</p>') + '</div>' +
        '<div class="evtools"><button class="btn" id="asOpt"' + (route.length < 2 ? ' disabled' : '') + '>' + ic('nav') + 'Ordenar por cercanía</button><button class="btn" id="asMap"' + (route.length ? '' : ' disabled') + '>' + ic('map') + 'Ver ruta en el mapa</button></div>' +
        '<div class="evfilter" style="margin:12px 0 6px"><b style="font-size:13px;color:var(--muted)">SIN ASIGNAR</b></div><input class="evsearch" id="asQ" placeholder="Buscar cliente u orden…" autocomplete="off" value="' + esc(st.q) + '"><div id="asFree">' +
        (free.length ? free.slice(0, 120).map(e => '<label class="urow"><input type="checkbox" data-c="' + esc(e.id) + '"' + (st.sel.has(e.id) ? ' checked' : '') + ' style="width:20px;height:20px;accent-color:var(--accent)"><div class="meta"><b>' + esc(e.cliente || e.orden) + '</b><small>Orden ' + esc(e.orden || '—') + ' · ' + esc(e.tipo || '') + (e.lat == null ? ' · sin ubicación' : '') + '</small><small>' + esc(e.direccion || '') + '</small></div></label>').join('') : '<p class="lead">No hay evaluaciones sin asignar.</p>') + '</div>' +
        '<div class="btnrow" style="position:sticky;bottom:-22px;background:var(--solid);padding:10px 0 4px"><button class="btn" id="asAll">Todas</button><button class="btn accent" id="asGo"' + (st.sel.size ? '' : ' disabled') + '>' + ic('check') + 'Asignar (' + st.sel.size + ')</button></div>');
      hydrate(m); const q = s => m.querySelector(s);
      q('#asT').onchange = ev => { st.tech = ev.target.value; st.sel.clear(); render(); };
      q('#asQ').oninput = ev => { st.q = ev.target.value; const pos = ev.target.selectionStart; render(); const i = document.querySelector('#asQ'); i.focus(); i.setSelectionRange(pos, pos); };
      q('#asFree').onchange = ev => { const c = ev.target.closest('[data-c]'); if (!c) return; if (c.checked) st.sel.add(c.dataset.c); else st.sel.delete(c.dataset.c); q('#asGo').disabled = !st.sel.size; q('#asGo').lastChild.textContent = 'Asignar (' + st.sel.size + ')'; };
      q('#asAll').onclick = () => { free.slice(0, 120).forEach(e => st.sel.add(e.id)); render(); };
      q('#asGo').onclick = async () => {
        const L = S.evals.filter(e => st.sel.has(e.id) && !e.asg); L.forEach(e => assignTo(e, tech)); st.sel.clear(); await saveEvals(); map.invalidate(); toast(L.length + (L.length === 1 ? ' evaluación asignada a ' : ' evaluaciones asignadas a ') + tech.name, 3000); render();
      };
      q('#asRoute').onclick = async ev => {
        const up = ev.target.closest('[data-up]'), dn = ev.target.closest('[data-dn]'), rm = ev.target.closest('[data-rm]'); if (!up && !dn && !rm) return;
        const id = (up || dn || rm).dataset.up || (up || dn || rm).dataset.dn || (up || dn || rm).dataset.rm, i = route.findIndex(e => e.id === id); if (i < 0) return;
        if (rm) unassign(route[i]);
        else { const j = up ? i - 1 : i + 1; const a1 = route[i], b1 = route[j]; const s1 = a1.seq; a1.seq = b1.seq; b1.seq = s1; a1.ts = b1.ts = Date.now(); renum(tech.id); }
        await saveEvals(); map.invalidate(); render();
      };
      q('#asOpt').onclick = async () => {
        const u = tech, start = u.lat != null ? { lat: u.lat, lon: u.lon } : null, ord = nearestOrder(route, start);
        ord.forEach((e, i) => { if (e.seq !== i + 1) { e.seq = i + 1; e.ts = Date.now(); } }); await saveEvals(); map.invalidate(); toast('Ruta ordenada por cercanía' + (start ? ' desde su última ubicación' : ''), 3000); render();
      };
      q('#asMap').onclick = () => { closeModal(); setRouteView(tech.id, tech.name); fitRoute(); };
      m.querySelector('.grab') && null;
    };
    render();
  }
  function openEvalEdit(e) {
    const m = modal('<h3>Editar evaluación</h3><label class="field"><span>NOMBRE DEL CLIENTE</span><input id="eeC" value="' + esc(e.cliente) + '"></label><div class="two"><label class="field"><span>CONTACTO</span><input id="eeT" value="' + esc(e.contacto) + '"></label><label class="field"><span>ORDEN</span><input id="eeO" value="' + esc(e.orden) + '"></label></div>' +
      '<label class="field"><span>DIRECCIÓN</span><input id="eeD" value="' + esc(e.direccion) + '"></label><label class="field"><span>UBICACIÓN (COORDENADAS O NOMBRE DE CAJA)</span><input id="eeU" value="' + esc(e.ubic) + '"></label>' +
      '<div class="two"><label class="field"><span>TIPO DE ORDEN</span><select class="sel" id="eeP"><option' + (e.tipo === 'Instalación' ? ' selected' : '') + '>Instalación</option><option' + (e.tipo === 'Daño' ? ' selected' : '') + '>Daño</option></select></label><label class="field"><span>CÓDIGO TÉCNICO</span><input id="eeK" value="' + esc(e.cod) + '"></label></div>' +
      '<div class="btnrow"><button class="btn" id="eeX">Cancelar</button><button class="btn accent" id="eeS">' + ic('check') + 'Guardar</button></div>');
    hydrate(m); const v = id => m.querySelector(id).value.trim();
    m.querySelector('#eeX').onclick = () => openEvalDetail(e);
    m.querySelector('#eeS').onclick = async () => {
      Object.assign(e, { cliente: v('#eeC'), contacto: v('#eeT'), orden: v('#eeO'), direccion: v('#eeD'), ubic: v('#eeU'), tipo: v('#eeP'), cod: v('#eeK'), ts: Date.now() });
      cajaByName = null; resolveLoc(e); await saveEvals(); map.invalidate(); toast(e.lat == null ? 'Guardado, pero no se entendió la ubicación' : 'Evaluación actualizada', 3000); openEvalDetail(e);
    };
  }

  /* ---------- cuenta, administración y equipo ---------- */
  const isAdmin = () => { const u = Cloud.user(); return !!u && u.role === 'admin'; };
  const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const ago = ts => {
    if (!ts) return 'sin ubicación';
    const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 60) return 'ahora'; if (s < 3600) return 'hace ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'hace ' + Math.round(s / 3600) + ' h'; return 'hace ' + Math.round(s / 86400) + ' d';
  };
  const ageCls = ts => { if (!ts) return ''; const a = Date.now() - new Date(ts).getTime(); return a < 180000 ? 'on' : a < 900000 ? 'mid' : ''; };
  function genPass() { const al = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', r = new Uint32Array(8); crypto.getRandomValues(r); return Array.from(r, v => al[v % al.length]).join(''); }
  function zoneOf(lat, lon) {
    const mx = Merc.mxOf(lon), my = Merc.myOf(lat); let area = null;
    for (const a of S.areas) { if (mx < a.bb[0] || mx > a.bb[2] || my < a.bb[1] || my > a.bb[3]) continue; if (a.R.some(r => pip(mx, my, r))) { area = a; break; } }
    const nn = nearest({ lat, lon }, 1)[0], ref = area || (nn && nn[0] <= 3000 ? nn[1] : null);
    if (!ref) return { zone: 'Fuera de la zona de cajas', extra: nn ? 'Caja más cercana: ' + nn[1].n + ' a ' + fmtD(nn[0]) : '' };
    const muni = ref.g[0] || '', cab = ref.g.length > 1 ? ref.g[ref.g.length - 1] : '';
    return { zone: [muni, cab].filter(Boolean).join(' · '), extra: (area ? 'Dentro del área ' + area.n + (nn ? ' · ' : '') : '') + (nn ? 'Caja ' + nn[1].n + ' a ' + fmtD(nn[0]) : '') };
  }

  /* inicio de sesión */
  const LG = { mode: 'login', pass: '' };
  function showLogin(mode, msg) {
    LG.mode = mode || 'login';
    $('#login').hidden = false; $('#lgLogin').hidden = LG.mode !== 'login'; $('#lgChange').hidden = LG.mode !== 'change';
    $('#lgSub').textContent = LG.mode === 'change' ? 'Es tu primer ingreso: crea tu propia contraseña' : 'Inicia sesión para continuar';
    $('#lgGo').textContent = LG.mode === 'change' ? 'Guardar contraseña' : 'Entrar'; $('#lgCfg').hidden = LG.mode === 'change';
    $('#lgErr').textContent = msg || ''; if (LG.mode === 'login') { $('#lgP').value = ''; setTimeout(() => $('#lgU').focus(), 100); }
  }
  const hideLogin = () => { $('#login').hidden = true; };
  $('#lgCfg').onclick = () => openServer();
  $('#loginForm').onsubmit = async ev => {
    ev.preventDefault(); const err = $('#lgErr'), go = $('#lgGo'); err.textContent = ''; go.disabled = true;
    try {
      if (LG.mode === 'login') {
        const u = $('#lgU').value.trim(), p = $('#lgP').value; if (!u || !p) { err.textContent = 'Escribe tu usuario y contraseña'; return; }
        go.textContent = 'Entrando…'; let s;
        try { s = await Cloud.login(u, p); } catch (e1) { if (e1.code !== 'network') throw e1; s = await Cloud.loginOffline(u, p); toast('Sin conexión: entraste con tu último acceso en este dispositivo', 4000); }
        LG.pass = p;
        if (s.user.must_change) showLogin('change'); else { hideLogin(); startSession(); }
      } else {
        const n1 = $('#lgN1').value, n2 = $('#lgN2').value;
        if (n1.length < 8) { err.textContent = 'La contraseña debe tener al menos 8 caracteres'; return; }
        if (n1 !== n2) { err.textContent = 'Las contraseñas no coinciden'; return; }
        await Cloud.changePassword(LG.pass, n1); LG.pass = ''; $('#lgN1').value = $('#lgN2').value = ''; hideLogin(); toast('Contraseña guardada'); startSession();
      }
    } catch (e) { err.textContent = Cloud.errText(e); }
    finally { go.disabled = false; if (!$('#login').hidden) go.textContent = LG.mode === 'change' ? 'Guardar contraseña' : 'Entrar'; }
  };

  let sessionOn = false;
  function initCloud() {
    Cloud.onExpired = () => { stopSession(); showLogin('login', 'Tu sesión terminó. Entra de nuevo'); };
    if (!Cloud.configured()) return;
    if (!Cloud.session()) showLogin('login'); else startSession();
  }
  function startSession() {
    if (!sessionOn) { sessionOn = true; setInterval(() => cloudReport(true), 60000); setInterval(() => syncNow(), 30000); document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(() => syncNow(), 600); }); window.addEventListener('focus', () => setTimeout(() => syncNow(), 600)); window.addEventListener('online', () => setTimeout(() => syncNow(), 1500)); }
    updateCloudPill(); updateSyncPill(); $('#btnTeam').hidden = !isAdmin();
    Cloud.me().then(u => { $('#btnTeam').hidden = !isAdmin(); if (u.must_change) showLogin('change'); }).catch(() => { });
    cloudReport(true); syncNow();
    if (isAdmin() && S.team.on) teamPoll(true);
  }
  function stopSession() { teamPoll(false); updateSyncPill(); S.team = { on: false, list: [], t: 0 }; rep.last = null; rep.ok = null; $('#btnTeam').hidden = true; $('#btnTeam').classList.remove('on'); updateCloudPill(); map.invalidate(); }

  /* envío de mi ubicación al servidor */
  const rep = { last: null, t: 0, busy: false, ok: null };
  function cloudReport(force) {
    const u = Cloud.user(); if (!u || !S.pos || rep.busy) return;
    const now = Date.now(), moved = rep.last ? hav(rep.last.lat, rep.last.lon, S.pos.lat, S.pos.lon) : 1e9;
    if (!force && moved < 25 && now - rep.t < 60000) return;
    if (now - rep.t < 15000 && !force) return;
    rep.busy = true; const p = { lat: S.pos.lat, lon: S.pos.lon };
    Cloud.sendLocation(p.lat, p.lon, S.pos.acc, S.pos.speed).then(() => { rep.last = p; rep.ok = true; }).catch(() => { rep.ok = false; })
      .finally(() => { rep.t = Date.now(); rep.busy = false; updateCloudPill(); });
  }
  function updateCloudPill() {
    const el = $('#pillCloud'), u = Cloud.user(); el.hidden = !u || (!S.pos && rep.ok == null); if (!u) return;
    el.className = 'pill ' + (rep.ok === false ? 'warn' : rep.ok ? 'ok' : ''); el.textContent = rep.ok === false ? 'Ubicación sin enviar' : rep.ok ? 'Ubicación compartida' : 'Conectando…';
  }

  /* equipo en el mapa */
  let teamT = 0;
  async function teamRefresh() {
    if (!isAdmin()) return; const me = Cloud.user();
    try { S.team.list = (await Cloud.locations()).filter(u => u.id !== me.id); S.team.t = Date.now(); map.invalidate(); return S.team.list; }
    catch (e) { if (e.code !== 'network') toast(Cloud.errText(e)); }
  }
  function teamPoll(on) { clearInterval(teamT); if (on) { teamRefresh(); teamT = setInterval(teamRefresh, 20000); } }
  function fitTeam() {
    const L = S.team.list; if (!L.length) return;
    let a = 90, c = -90, d = 180, f = -180; L.forEach(u => { a = Math.min(a, u.lat); c = Math.max(c, u.lat); d = Math.min(d, u.lon); f = Math.max(f, u.lon); });
    S.userMoved = true; if (L.length === 1) map.flyTo(L[0].lat, L[0].lon, 16, 0.4); else map.fitBounds(a, d, c, f, 70);
  }
  async function teamToggle(on, fit) {
    S.team.on = on; $('#btnTeam').classList.toggle('on', on); teamPoll(on); map.invalidate();
    if (on) { const L = await teamRefresh(); toast(L && L.length ? 'Mostrando ' + L.length + (L.length === 1 ? ' persona' : ' personas') + ' del equipo' : 'Nadie ha compartido su ubicación todavía', 3200); if (fit !== false) fitTeam(); }
  }
  $('#btnTeam').onclick = () => teamToggle(!S.team.on);
  function hitTeam(px, py) {
    if (!S.team.on) return null; let best = null, bd = 26 * 26;
    for (const u of S.team.list) { const [x, y] = map.toScreen(u.lat, u.lon), d = (x - px) * (x - px) + (y - py) * (y - py); if (d < bd) { bd = d; best = u; } }
    return best;
  }

  /* mi cuenta */
  function openAccount() {
    const u = Cloud.user(); if (!u) return;
    const m = modal('<h3>Mi cuenta</h3><div class="evinfo"><div><dt>Nombre</dt><dd>' + esc(u.name) + '</dd></div><div><dt>Usuario</dt><dd>' + esc(u.username) + '</dd></div><div><dt>Rol</dt><dd>' + (u.role === 'admin' ? 'Administrador' : 'Técnico') + '</dd></div>' + (u.code ? '<div><dt>Código técnico</dt><dd>' + esc(u.code) + '</dd></div>' : '') + '</div>' +
      '<p class="lead">Mientras la app esté abierta, tu ubicación se comparte con el administrador.</p>' +
      '<div class="btnrow"><button class="btn" id="acPw">Cambiar contraseña</button><button class="btn danger" id="acOut">Cerrar sesión</button></div>');
    m.querySelector('#acPw').onclick = () => openChangePw();
    m.querySelector('#acOut').onclick = async () => {
      if (!(await confirmBox('¿Cerrar sesión?', 'Dejarás de compartir tu ubicación y tendrás que entrar otra vez con tu usuario y contraseña.', 'Cerrar sesión', true))) return;
      closeModal(); await Cloud.logout(); stopSession(); showLogin('login');
    };
  }
  function openChangePw() {
    const m = modal('<h3>Cambiar contraseña</h3><label class="field"><span>CONTRASEÑA ACTUAL</span><input id="cpO" type="password" autocomplete="current-password"></label><label class="field"><span>NUEVA CONTRASEÑA (MÍNIMO 8)</span><input id="cpN" type="password" autocomplete="new-password"></label><label class="field"><span>REPETIR</span><input id="cpR" type="password" autocomplete="new-password"></label><div class="btnrow"><button class="btn" id="cpC">Cancelar</button><button class="btn accent" id="cpS">Guardar</button></div>');
    m.querySelector('#cpC').onclick = openAccount;
    m.querySelector('#cpS').onclick = async () => {
      const o = m.querySelector('#cpO').value, n = m.querySelector('#cpN').value, r = m.querySelector('#cpR').value;
      if (n.length < 8) return toast('La nueva contraseña debe tener al menos 8 caracteres'); if (n !== r) return toast('Las contraseñas no coinciden');
      try { await Cloud.changePassword(o, n); closeModal(); toast('Contraseña cambiada'); } catch (e) { toast(Cloud.errText(e), 3500); }
    };
  }

  /* servidor */
  function openServer() {
    const c = Cloud.config();
    const m = modal('<h3>Servidor de usuarios</h3><p class="lead">Datos de tu proyecto de Supabase (Project Settings › API). Se guardan solo en este teléfono. Si ya vienen dentro de la app, no hace falta tocarlos.</p>' +
      '<label class="field"><span>PROJECT URL</span><input id="svU" value="' + esc(c.url) + '" placeholder="https://xxxx.supabase.co" autocapitalize="none" spellcheck="false"></label>' +
      '<label class="field"><span>CLAVE PÚBLICA (ANON / PUBLISHABLE)</span><textarea id="svK" placeholder="eyJ... o sb_publishable_..." spellcheck="false" style="min-height:80px">' + esc(c.key) + '</textarea></label>' +
      '<div class="btnrow"><button class="btn" id="svC">Cancelar</button><button class="btn accent" id="svS">Guardar</button></div>');
    m.querySelector('#svC').onclick = closeModal;
    m.querySelector('#svS').onclick = () => {
      const u = m.querySelector('#svU').value, k = m.querySelector('#svK').value;
      if (!u.trim() || !k.trim()) return toast('Escribe la URL y la clave');
      Cloud.setConfig(u, k); closeModal(); toast('Servidor guardado');
      if (!Cloud.session()) showLogin('login'); else startSession();
    };
  }

  /* administración */
  async function openAdmin() {
    if (!isAdmin()) return;
    busy('Cargando usuarios…'); let L;
    try { L = await Cloud.listUsers(); } catch (e) { idle(); toast(Cloud.errText(e), 3500); return; } idle();
    const me = Cloud.user(), online = L.filter(u => ageCls(u.updated_at) === 'on').length;
    const m = modal('<h3>Administración</h3><div class="kpis"><div class="stat"><small>Usuarios</small><b>' + L.length + '</b></div><div class="stat"><small>En línea</small><b>' + online + '</b></div><div class="stat"><small>Suspendidos</small><b>' + L.filter(u => !u.active).length + '</b></div></div>' +
      '<div class="evtools"><button class="btn accent" id="adNew">' + ic('plus') + 'Nuevo usuario</button><button class="btn" id="adMap">' + ic('team') + 'Ver en el mapa</button></div><div id="adList"></div>');
    hydrate(m);
    m.querySelector('#adList').innerHTML = L.map(u => {
      const z = u.lat != null ? zoneOf(u.lat, u.lon).zone : 'Sin ubicación todavía';
      return '<button class="urow' + (u.active ? '' : ' off') + '" data-id="' + esc(u.id) + '"><span class="av ' + ageCls(u.updated_at) + '">' + esc(initials(u.name)) + '</span><div class="meta"><b>' + esc(u.name) + (u.id === me.id ? ' (tú)' : '') + '</b><small>@' + esc(u.username) + (u.code ? ' · ' + esc(u.code) : '') + ' · ' + (u.role === 'admin' ? 'Admin' : 'Técnico') + (u.active ? '' : ' · suspendido') + '</small><small>' + esc(z) + ' · ' + ago(u.updated_at) + '</small></div></button>';
    }).join('');
    m.querySelector('#adNew').onclick = () => openNewUser();
    m.querySelector('#adMap').onclick = () => { closeModal(); teamToggle(true); };
    m.querySelector('#adList').onclick = ev => { const b = ev.target.closest('.urow'); if (b) { const u = L.find(x => x.id === b.dataset.id); if (u) openUserDetail(u); } };
  }
  function openNewUser() {
    const pw = genPass();
    const m = modal('<h3>Nuevo usuario</h3><label class="field"><span>NOMBRE COMPLETO *</span><input id="nuN" placeholder="Carlos Gómez" autocomplete="off"></label>' +
      '<div class="two"><label class="field"><span>USUARIO *</span><input id="nuU" placeholder="carlos.gomez" autocapitalize="none" autocomplete="off" spellcheck="false"></label><label class="field"><span>CÓDIGO TÉCNICO</span><input id="nuC" placeholder="T-0456" autocomplete="off"></label></div>' +
      '<label class="field"><span>ROL</span><select class="sel" id="nuR"><option value="tecnico">Técnico</option><option value="admin">Administrador</option></select></label>' +
      '<label class="field"><span>CONTRASEÑA INICIAL</span><input id="nuP" value="' + pw + '" autocapitalize="none" spellcheck="false"></label>' +
      '<p class="lead">El usuario deberá crear su propia contraseña la primera vez que entre.</p><div class="btnrow"><button class="btn" id="nuX">Cancelar</button><button class="btn accent" id="nuS">' + ic('check') + 'Crear</button></div>');
    hydrate(m);
    m.querySelector('#nuN').addEventListener('input', ev => { const u = m.querySelector('#nuU'); if (!u.dataset.t) u.value = nrm(ev.target.value).replace(/ /g, '.').slice(0, 30); });
    m.querySelector('#nuU').addEventListener('input', ev => ev.target.dataset.t = '1');
    m.querySelector('#nuX').onclick = openAdmin;
    m.querySelector('#nuS').onclick = async () => {
      const v = id => m.querySelector(id).value.trim(); const btn = m.querySelector('#nuS'); btn.disabled = true;
      try {
        const u = await Cloud.createUser(v('#nuU').toLowerCase(), v('#nuN'), v('#nuC'), v('#nuR'), v('#nuP'));
        const pass = v('#nuP'), txt = 'Vizor G\nUsuario: ' + u.username + '\nContraseña inicial: ' + pass;
        const m2 = modal('<h3>Usuario creado</h3><p class="lead">Entrégale estos datos a ' + esc(u.name) + '. Al entrar por primera vez, la app le pedirá crear su propia contraseña.</p><div class="credbox">Usuario: <b>' + esc(u.username) + '</b><br>Contraseña: <b>' + esc(pass) + '</b></div><div class="btnrow"><button class="btn" id="crCp">' + ic('copy') + 'Copiar</button><button class="btn accent" id="crOk">Listo</button></div>');
        hydrate(m2); m2.querySelector('#crCp').onclick = async () => toast((await copyText(txt)) ? 'Datos copiados' : 'No se pudo copiar'); m2.querySelector('#crOk').onclick = openAdmin;
      } catch (e) { btn.disabled = false; toast(Cloud.errText(e), 4000); }
    };
  }
  function openUserDetail(u) {
    const me = Cloud.user(), self = me && u.id === me.id, has = u.lat != null, z = has ? zoneOf(u.lat, u.lon) : null;
    const d = has && S.pos ? fmtD(hav(S.pos.lat, S.pos.lon, u.lat, u.lon)) : '';
    const m = modal('<h3>' + esc(u.name) + '</h3><p class="lead">@' + esc(u.username) + (u.code ? ' · ' + esc(u.code) : '') + ' · ' + (u.role === 'admin' ? 'Administrador' : 'Técnico') + (u.active === false ? ' · <b>suspendido</b>' : '') + '</p>' +
      '<div class="evinfo"><div><dt>Zona actual</dt><dd>' + esc(z ? z.zone : 'Sin ubicación todavía') + '</dd></div>' + (z && z.extra ? '<div><dt>Detalle</dt><dd>' + esc(z.extra) + '</dd></div>' : '') +
      '<div><dt>Última ubicación</dt><dd>' + ago(u.updated_at) + (has ? ' · ±' + Math.round(u.acc || 0) + ' m' + (d ? ' · a ' + d + ' de ti' : '') : '') + '</dd></div>' + (has ? '<div><dt>Coordenadas</dt><dd>' + coordTxt(u.lat, u.lon) + '</dd></div>' : '') + '</div>' +
      '<div class="d-actions"><button class="btn waze" id="udW"' + (has ? '' : ' disabled') + '>' + ic('nav') + 'Ir con Waze</button><button class="btn" id="udMap"' + (has ? '' : ' disabled') + '>' + ic('pin') + 'Ver en el mapa</button></div>' +
      (isAdmin() ? '<div class="evgrid"><button class="btn ghost" id="udPw">' + ic('reset') + '<span>Contraseña</span></button><button class="btn ghost" id="udAct"' + (self ? ' disabled' : '') + '>' + ic('user') + '<span>' + (u.active === false ? 'Activar' : 'Suspender') + '</span></button><button class="btn ghost" id="udDel"' + (self ? ' disabled' : '') + '>' + ic('trash') + '<span>Eliminar</span></button></div>' : '') +
      '<button class="btn wide" id="udBack" style="margin-top:6px">' + (isAdmin() ? 'Volver a la lista' : 'Cerrar') + '</button>');
    hydrate(m); const q = s => m.querySelector(s);
    q('#udW').onclick = () => openExt('waze://?ll=' + u.lat + ',' + u.lon + '&navigate=yes', 'https://waze.com/ul?ll=' + u.lat + ',' + u.lon + '&navigate=yes&zoom=17');
    q('#udMap').onclick = async () => { closeModal(); if (!S.team.on) await teamToggle(true, false); S.userMoved = true; map.flyTo(u.lat, u.lon, Math.max(map.z, 16.5), 0.4); };
    q('#udBack').onclick = () => isAdmin() ? openAdmin() : closeModal();
    if (isAdmin()) {
      q('#udPw').onclick = () => {
        const pw = genPass(), m2 = modal('<h3>Nueva contraseña</h3><p class="lead">Para ' + esc(u.name) + '. Tendrá que cambiarla al entrar y su sesión actual se cerrará.</p><label class="field"><span>CONTRASEÑA TEMPORAL</span><input id="rpP" value="' + pw + '" autocapitalize="none" spellcheck="false"></label><div class="btnrow"><button class="btn" id="rpX">Cancelar</button><button class="btn accent" id="rpS">Guardar</button></div>');
        m2.querySelector('#rpX').onclick = () => openUserDetail(u);
        m2.querySelector('#rpS').onclick = async () => { const p = m2.querySelector('#rpP').value.trim(); try { await Cloud.resetPassword(u.id, p); await copyText('Vizor G\nUsuario: ' + u.username + '\nContraseña temporal: ' + p); toast('Contraseña cambiada y copiada', 3500); openAdmin(); } catch (e) { toast(Cloud.errText(e), 4000); } };
      };
      if (!self) {
        q('#udAct').onclick = async () => { try { await Cloud.setActive(u.id, u.active === false); toast(u.active === false ? 'Usuario activado' : 'Usuario suspendido'); openAdmin(); } catch (e) { toast(Cloud.errText(e), 4000); } };
        q('#udDel').onclick = async () => { if (await confirmBox('¿Eliminar a ' + u.name + '?', 'Se borra su usuario y su última ubicación. Esto no se puede deshacer.', 'Eliminar', true)) { try { await Cloud.deleteUser(u.id); S.team.list = S.team.list.filter(x => x.id !== u.id); map.invalidate(); toast('Usuario eliminado'); openAdmin(); } catch (e) { toast(Cloud.errText(e), 4000); } } };
      }
    }
  }

  /* ---------- conexión ---------- */
  function netState() { const off = isOffline(); const p = $('#pillNet'); p.hidden = !off; p.lastChild.textContent = VEC && lastMode === 'vec-auto' ? 'Sin conexión · mapa sin internet' : 'Sin conexión'; }
  window.addEventListener('online', () => { S.netBad = false; applyBase().then(netState); });
  window.addEventListener('offline', () => { applyBase().then(netState); });

  /* ---------- arranque ---------- */
  async function boot() {
    hydrate(document);
    autoTheme(); readColors(); applyBase();
    try { await loadData(); await loadEvals(); } catch (e) { console.error(e); $('#loadMsg').textContent = 'Error al cargar los datos: ' + e.message; return; }
    if (S.pts.length) {
      let a = 90, c = -90, d = 180, f = -180; S.pts.forEach(p => { a = Math.min(a, p.c[1]); c = Math.max(c, p.c[1]); d = Math.min(d, p.c[0]); f = Math.max(f, p.c[0]); });
      map.fitBounds(a, d, c, f, 30);
    }
    layout(); updateNearby(); netState(); applyTheme(); idle();
    initCloud();
    ensureVector().then(async () => { S.vecSaved = await Vec.isSaved(VEC_URL); netState(); });
    startGpsOnce();
    setTimeout(() => window.__geoIntent(), 600);
    if (!NB && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      // Actualización automática de la web: cuando se publica una versión nueva, la página se recarga sola (sin Ctrl+F5)
      let skip = !navigator.serviceWorker.controller, reloading = false; // la primera toma de control (instalación inicial) no recarga
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (skip) { skip = false; return; } if (reloading) return; reloading = true;
        const tryReload = () => { if ($('#modalRoot').firstChild || (document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName) && document.activeElement.value)) setTimeout(tryReload, 4000); else location.reload(); };
        setTimeout(tryReload, 800);
      });
      navigator.serviceWorker.register('sw.js').then(reg => {
        const chk = () => { try { reg.update(); } catch (e) { } };
        setInterval(chk, 5 * 60000); document.addEventListener('visibilitychange', () => { if (!document.hidden) chk(); });
      }).catch(() => { });
    }
    window.__back = () => {
      if ($('#modalRoot').firstChild) { closeModal(); return true; }
      if (S.pick) { $('#pickCancel').click(); return true; }
      if (S.meas.on) { stopMeasure(); return true; }
      if (!$('#results').hidden) { hideResults(); return true; }
      if (S.sel) { deselect(); return true; }
      if (!$('#login').hidden) return true;
      if (S.pin) { clearPin(); return true; }
      if ($('#nearby').dataset.state === 'full') { $('#nearby').dataset.state = 'peek'; return true; }
      return false;
    };
    setInterval(autoTheme, 60000);
    window.__app = { syncNow, removeFeats, zoneOf, teamRefresh, sunTimes, autoTheme, S, map, select, openForm, setPin, openEvals, openEvalDetail, importEvalRows };
  }
  boot();
})();
