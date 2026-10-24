/* Mapa de calles sin conexión: lee un archivo PMTiles (datos de OpenStreetMap, esquema Protomaps)
   y lo dibuja en el canvas. Sin dependencias. */
(function (g) {
  'use strict';
  const TS = 256, EXT = 4096;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const td = new TextDecoder();

  /* ---------- PMTiles v3 ---------- */
  function u64(dv, o) { return dv.getUint32(o, true) + dv.getUint32(o + 4, true) * 4294967296; }
  async function gunzip(u8) {
    const ds = new DecompressionStream('gzip');
    return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer());
  }
  const maybeGunzip = u8 => (u8.length > 2 && u8[0] === 0x1f && u8[1] === 0x8b) ? gunzip(u8) : Promise.resolve(u8);

  function tileId(z, x, y) {
    let acc = 0; for (let i = 0; i < z; i++) acc += Math.pow(4, i);
    const n = Math.pow(2, z); let d = 0, tx = x, ty = y;
    for (let s = n / 2; s >= 1; s /= 2) {
      const rx = (tx & s) > 0 ? 1 : 0, ry = (ty & s) > 0 ? 1 : 0;
      d += s * s * ((3 * rx) ^ ry);
      if (ry === 0) { if (rx === 1) { tx = s - 1 - tx; ty = s - 1 - ty; } const t = tx; tx = ty; ty = t; }
    }
    return acc + d;
  }
  function parseDir(u8) {
    let p = 0;
    const rv = () => { let r = 0, m = 1, b; do { b = u8[p++]; r += (b & 127) * m; m *= 128; } while (b & 128); return r; };
    const n = rv(), e = new Array(n); let last = 0;
    for (let i = 0; i < n; i++) { last += rv(); e[i] = { id: last, run: 0, len: 0, off: 0 }; }
    for (let i = 0; i < n; i++) e[i].run = rv();
    for (let i = 0; i < n; i++) e[i].len = rv();
    for (let i = 0; i < n; i++) { const v = rv(); e[i].off = (v === 0 && i > 0) ? e[i - 1].off + e[i - 1].len : v - 1; }
    return e;
  }
  function findEntry(e, id) {
    let m = 0, n = e.length - 1;
    while (m <= n) { const k = (n + m) >> 1, c = id - e[k].id; if (c > 0) m = k + 1; else if (c < 0) n = k - 1; else return e[k]; }
    if (n >= 0 && (e[n].run === 0 || id - e[n].id < e[n].run)) return e[n];
    return null;
  }

  class PMTiles {
    constructor(read) { this.read = read; this.dirs = new Map(); }
    async open() {
      const h = await this.read(0, 127);
      if (!h || h.length < 127 || td.decode(h.subarray(0, 7)) !== 'PMTiles' || h[7] !== 3) throw new Error('No es un archivo PMTiles v3');
      const dv = new DataView(h.buffer, h.byteOffset, h.byteLength);
      this.rootOff = u64(dv, 8); this.rootLen = u64(dv, 16); this.leafOff = u64(dv, 40); this.dataOff = u64(dv, 56);
      this.internalComp = h[97]; this.tileComp = h[98]; this.tileType = h[99]; this.minZoom = h[100]; this.maxZoom = h[101];
      this.bounds = [dv.getInt32(102, true) / 1e7, dv.getInt32(106, true) / 1e7, dv.getInt32(110, true) / 1e7, dv.getInt32(114, true) / 1e7];
      if (this.tileType !== 1) throw new Error('El archivo no contiene mosaicos vectoriales');
      if (this.internalComp > 2 || this.tileComp > 2) throw new Error('Compresión no soportada (use gzip)');
      this.root = await this._dir(this.rootOff, this.rootLen);
      return this;
    }
    async _dir(off, len) {
      const k = off + ':' + len; let d = this.dirs.get(k);
      if (!d) {
        d = parseDir(await maybeGunzip(await this.read(off, len)));
        if (this.dirs.size > 60) this.dirs.delete(this.dirs.keys().next().value);
        this.dirs.set(k, d);
      }
      return d;
    }
    async getTile(z, x, y) {
      const id = tileId(z, x, y); let dir = this.root;
      for (let depth = 0; depth < 4; depth++) {
        const e = findEntry(dir, id); if (!e) return null;
        if (e.run > 0) return maybeGunzip(await this.read(this.dataOff + e.off, e.len));
        dir = await this._dir(this.leafOff + e.off, e.len);
      }
      return null;
    }
  }

  /* ---------- Mapbox Vector Tile (protobuf) ---------- */
  function parseMVT(u8) {
    let p = 0;
    const rv = () => { let r = 0, m = 1, b; do { b = u8[p++]; r += (b & 127) * m; m *= 128; } while (b & 128); return r; };
    const skip = w => { if (w === 0) rv(); else if (w === 1) p += 8; else if (w === 2) { const l = rv(); p += l; } else if (w === 5) p += 4; };
    const zz = n => (n >>> 1) ^ -(n & 1);
    const layers = {};
    while (p < u8.length) {
      const key = rv(), f = key >>> 3, w = key & 7;
      if (f === 3 && w === 2) { const l = rv(), end = p + l; const L = layer(end); if (L) layers[L.name] = L; p = end; } else skip(w);
    }
    function layer(end) {
      let name = '', ext = EXT; const keys = [], vals = [], feats = [];
      while (p < end) {
        const key = rv(), f = key >>> 3, w = key & 7;
        if (f === 1) { const l = rv(); name = td.decode(u8.subarray(p, p + l)); p += l; }
        else if (f === 2) { const l = rv(); feats.push([p, p + l]); p += l; }
        else if (f === 3) { const l = rv(); keys.push(td.decode(u8.subarray(p, p + l))); p += l; }
        else if (f === 4) { const l = rv(), e2 = p + l; vals.push(value(e2)); p = e2; }
        else if (f === 5) ext = rv();
        else skip(w);
      }
      return { name, ext, features: feats.map(r => feature(r[0], r[1], keys, vals)) };
    }
    function value(end) {
      let v = null;
      while (p < end) {
        const key = rv(), f = key >>> 3, w = key & 7;
        if (f === 1) { const l = rv(); v = td.decode(u8.subarray(p, p + l)); p += l; }
        else if (f === 2) { v = new DataView(u8.buffer, u8.byteOffset + p, 4).getFloat32(0, true); p += 4; }
        else if (f === 3) { v = new DataView(u8.buffer, u8.byteOffset + p, 8).getFloat64(0, true); p += 8; }
        else if (f === 4 || f === 5) v = rv();
        else if (f === 6) v = zz(rv());
        else if (f === 7) v = rv() !== 0;
        else skip(w);
      }
      return v;
    }
    function feature(s, e, keys, vals) {
      p = s; let type = 0, gs = 0, ge = 0; const props = {};
      while (p < e) {
        const key = rv(), f = key >>> 3, w = key & 7;
        if (f === 2 && w === 2) { const l = rv(), e2 = p + l; while (p < e2) { const k = rv(), v = rv(); props[keys[k]] = vals[v]; } }
        else if (f === 3) type = rv();
        else if (f === 4 && w === 2) { const l = rv(); gs = p; ge = p + l; p += l; }
        else skip(w);
      }
      return { type, props, parts: geom(gs, ge, type) };
    }
    function geom(s, e, type) {
      p = s; const parts = []; let cur = null, x = 0, y = 0;
      while (p < e) {
        const ci = rv(), cmd = ci & 7, cnt = ci >>> 3;
        if (cmd === 1) { for (let i = 0; i < cnt; i++) { x += zz(rv()); y += zz(rv()); if (type === 1) parts.push([x, y]); else { cur = [x, y]; parts.push(cur); } } }
        else if (cmd === 2) { for (let i = 0; i < cnt; i++) { x += zz(rv()); y += zz(rv()); cur.push(x, y); } }
        else if (cmd === 7) { if (cur) cur.push(cur[0], cur[1]); }
      }
      return parts;
    }
    return layers;
  }

  /* ---------- clasificación de elementos del mapa ---------- */
  function roadClass(pr) {
    const k = pr.kind, d = pr.kind_detail;
    if (k === 'highway') return 'hw';
    if (k === 'major_road') return 'major';
    if (k === 'minor_road') return d === 'tertiary' || d === 'tertiary_link' ? 'med' : (d === 'service' || d === 'track' || d === 'alley' || d === 'driveway' || d === 'parking_aisle') ? 'svc' : 'minor';
    if (k === 'path') return (d === 'sidewalk' || d === 'crossing' || d === 'corridor') ? null : (d === 'track' ? 'svc' : 'path');
    if (k === 'rail') return 'rail';
    return null;
  }
  const LAND = { park: 'green', garden: 'green', national_park: 'green', nature_reserve: 'green', protected_area: 'green', recreation_ground: 'green', pitch: 'green', playground: 'green', golf_course: 'green', grass: 'green', meadow: 'green', grassland: 'green', scrub: 'green', cemetery: 'green', forest: 'wood', wood: 'wood', farmland: 'farm', orchard: 'farm', farmyard: 'farm', industrial: 'indus', commercial: 'indus', military: 'indus', school: 'inst', hospital: 'inst', university: 'inst', college: 'inst', stadium: 'inst', sand: 'sand', beach: 'sand', barren: 'sand', bare_rock: 'sand', urban_area: 'urban', residential: 'urban' };
  const PLACE_RANK = { city: [1, 6], town: [2, 9], village: [3, 11.5], hamlet: [4, 13], locality: [4, 13], neighbourhood: [5, 14.5], quarter: [5, 14.5], suburb: [5, 14.5], macrohood: [5, 14] };

  function build(layers) {
    const T = { land: {}, water: new Path2D(), rivers: new Path2D(), streams: new Path2D(), bld: new Path2D(), roads: {}, places: [], names: [], ext: EXT, hasW: false, hasR: false, hasS: false, hasB: false };
    const add = (path, parts, close) => {
      for (const a of parts) { if (a.length < 4) continue; path.moveTo(a[0], a[1]); for (let i = 2; i < a.length; i += 2) path.lineTo(a[i], a[i + 1]); if (close) path.closePath(); }
    };
    const getp = (o, k) => o[k] || (o[k] = new Path2D());
    for (const nm of ['landcover', 'landuse']) {
      const L = layers[nm]; if (!L) continue; T.ext = L.ext;
      for (const f of L.features) { if (f.type !== 3) continue; const c = LAND[f.props.kind]; if (c) add(getp(T.land, c), f.parts, true); }
    }
    if (layers.water) {
      T.ext = layers.water.ext;
      for (const f of layers.water.features) {
        if (f.type === 3) { add(T.water, f.parts, true); T.hasW = true; }
        else if (f.type === 2) { const d = f.props.kind_detail; if (d === 'river' || d === 'canal') { add(T.rivers, f.parts, false); T.hasR = true; } else if (d === 'stream' || d === 'ditch' || d === 'drain') { add(T.streams, f.parts, false); T.hasS = true; } }
      }
    }
    if (layers.buildings) {
      for (const f of layers.buildings.features) if (f.type === 3 && f.props.kind !== 'address') { add(T.bld, f.parts, true); T.hasB = true; }
    }
    if (layers.roads) {
      T.ext = layers.roads.ext;
      for (const f of layers.roads.features) {
        if (f.type !== 2) continue; const c = roadClass(f.props); if (!c) continue;
        const o = T.roads[c] || (T.roads[c] = { path: new Path2D(), tun: new Path2D() });
        add(f.props.is_tunnel ? o.tun : o.path, f.parts, false);
        if (f.props.name && c !== 'rail' && c !== 'path') {
          let best = null, bl = 0;
          for (const a of f.parts) { const n = a.length / 2; if (n < 2) continue; const i = ((n - 1) >> 1) * 2; const dx = a[i + 2] - a[i], dy = a[i + 3] - a[i + 1], l = Math.hypot(dx, dy); if (a.length > 4 || l > bl) { if (l >= bl) { bl = l; best = { name: f.props.name, x: (a[i] + a[i + 2]) / 2, y: (a[i + 1] + a[i + 3]) / 2, ang: Math.atan2(dy, dx), len: l }; } } }
          if (best && best.len > 90) T.names.push(best);
        }
      }
    }
    if (layers.places) {
      for (const f of layers.places.features) {
        if (f.type !== 1 || !f.props.name) continue; const r = PLACE_RANK[f.props.kind_detail] || PLACE_RANK[f.props.kind];
        if (r) T.places.push({ name: f.props.name, x: f.parts[0][0], y: f.parts[0][1], rank: r[0], z: r[1] });
      }
    }
    return T;
  }

  /* ---------- estilos ---------- */
  const THEMES = {
    dark: { earth: '#141c2c', land: { green: '#17302a', wood: '#142b27', farm: '#1a2530', indus: '#1b2233', inst: '#1b2536', sand: '#2a2c30', urban: '#18202f' }, water: '#0f3552', river: '#124066', bld: '#26334b', bldLine: '#33415c', casing: '#0b1220', road: { hw: '#9fb0cc', major: '#8497b8', med: '#6d7f9f', minor: '#51617e', svc: '#3d4a63', path: '#5a6a4e', rail: '#55607a' }, text: '#e8eef8', halo: 'rgba(11,18,32,.92)', sub: '#9fb0cc' },
    light: { earth: '#eceae3', land: { green: '#d3e6c5', wood: '#c4dcb4', farm: '#e6e8cf', indus: '#e0ddd6', inst: '#e8e3d8', sand: '#f1e8cc', urban: '#e8e5de' }, water: '#a9d3ee', river: '#8ec3e6', bld: '#d9d4ca', bldLine: '#c9c3b7', casing: '#bfc3c9', road: { hw: '#f7b955', major: '#fde08a', med: '#ffffff', minor: '#ffffff', svc: '#fafafa', path: '#b8a78a', rail: '#9aa0a8' }, text: '#26313f', halo: 'rgba(255,255,255,.92)', sub: '#586479' }
  };
  const BASEW = { hw: 7, major: 6, med: 4.8, minor: 3.8, svc: 2.2, path: 1.3, rail: 1.2 };
  const MINZ = { hw: 0, major: 8, med: 11, minor: 12.5, svc: 14.5, path: 15.5, rail: 11 };
  const ORDER = ['rail', 'path', 'svc', 'minor', 'med', 'major', 'hw'];

  /* ---------- dibujo ---------- */
  class VectorMap {
    constructor(read) { this.pm = new PMTiles(read); this.tiles = new Map(); this.loading = new Set(); this.queue = []; this.theme = 'dark'; this.ready = false; this._busy = 0; }
    async open() { await this.pm.open(); this.ready = true; return this; }
    setTheme(t) { this.theme = t === 'light' ? 'light' : 'dark'; }
    _get(z, x, y, want, map) {
      const key = z + '/' + x + '/' + y; let t = this.tiles.get(key);
      if (t) { t.used = map._vf; return t.data; }
      if (!want || this.loading.has(key)) return null;
      this.loading.add(key); this.queue.push([key, z, x, y]); this._pump(map); return null;
    }
    _pump(map) {
      while (this._busy < 6 && this.queue.length) {
        const [key, z, x, y] = this.queue.pop(); this._busy = (this._busy || 0) + 1;
        this.pm.getTile(z, x, y).then(u8 => u8 ? build(parseMVT(u8)) : null).catch(() => null).then(data => {
          this._busy--; this.loading.delete(key); this.tiles.set(key, { data: data || false, used: map._vf }); this._evict(map); map.invalidate(); this._pump(map);
        });
      }
    }
    _evict(map) {
      if (this.tiles.size < 160) return;
      const arr = Array.from(this.tiles.entries()).sort((a, b) => a[1].used - b[1].used);
      for (let i = 0; i < arr.length - 110; i++) this.tiles.delete(arr[i][0]);
    }
    draw(ctx, m) {
      m._vf = (m._vf || 0) + 1; this._busy = this._busy || 0;
      const th = THEMES[this.theme], z = m.z, s = m.s;
      ctx.fillStyle = th.earth; ctx.fillRect(0, 0, m.w, m.h);
      const zi = clamp(Math.round(z), this.pm.minZoom, this.pm.maxZoom), n = Math.pow(2, zi), size = s / n, b = m.bounds();
      const x0 = Math.floor(b.x0 * n), x1 = Math.floor(b.x1 * n), y0 = Math.max(0, Math.floor(b.y0 * n)), y1 = Math.min(n - 1, Math.floor(b.y1 * n));
      if ((x1 - x0 + 1) * (y1 - y0 + 1) > 80) return;
      const items = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const wx = ((x % n) + n) % n, left = (x / n - m.cx) * s + m.w / 2, top = (y / n - m.cy) * s + m.h / 2;
        const t = this._get(zi, wx, y, true, m);
        if (t) { items.push({ t, left, top, size }); continue; }
        if (t === false) continue;
        for (let d = 1; d <= 3 && zi - d >= this.pm.minZoom; d++) {
          const k = Math.pow(2, d), p = this._get(zi - d, Math.floor(wx / k), Math.floor(y / k), false, m);
          if (p) { items.push({ t: p, left: left - (wx % k) * size, top: top - (y % k) * size, size: size * k, clip: [left, top, size] }); break; }
        }
      }
      const run = (fn) => { for (const it of items) { ctx.save(); if (it.clip) { ctx.beginPath(); ctx.rect(it.clip[0], it.clip[1], it.clip[2], it.clip[2]); ctx.clip(); } const k = it.size / it.t.ext; ctx.translate(it.left, it.top); ctx.scale(k, k); fn(it.t, k); ctx.restore(); } };
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      run(t => { for (const c in t.land) { ctx.fillStyle = th.land[c]; ctx.fill(t.land[c], 'evenodd'); } });
      run((t, k) => {
        if (t.hasW) { ctx.fillStyle = th.water; ctx.fill(t.water, 'evenodd'); }
        if (t.hasR) { ctx.strokeStyle = th.river; ctx.lineWidth = clamp(2.2 * Math.pow(2, (z - 14) * .6), .8, 14) / k; ctx.stroke(t.rivers); }
        if (t.hasS) { ctx.strokeStyle = th.river; ctx.lineWidth = clamp(1 * Math.pow(2, (z - 14) * .5), .6, 5) / k; ctx.stroke(t.streams); }
      });
      if (z >= 14.6) run((t, k) => { if (t.hasB) { ctx.fillStyle = th.bld; ctx.fill(t.bld, 'evenodd'); ctx.strokeStyle = th.bldLine; ctx.lineWidth = 1 / k; ctx.stroke(t.bld); } });
      const f = clamp(Math.pow(2, (z - 15) * .5), .28, 2.2);
      for (const c of ORDER) {
        if (z < MINZ[c]) continue;
        const w = BASEW[c] * f, cas = c === 'path' || c === 'rail' || w < 2.4 ? 0 : 1.6;
        if (cas) run((t, k) => { const o = t.roads[c]; if (o) { ctx.strokeStyle = th.casing; ctx.lineWidth = (w + cas) / k; ctx.stroke(o.path); } });
        run((t, k) => {
          const o = t.roads[c]; if (!o) return;
          ctx.strokeStyle = th.road[c]; ctx.lineWidth = Math.max(w, .7) / k;
          if (c === 'path' || c === 'rail') ctx.setLineDash([3 / k * 2, 2 / k * 2]);
          ctx.stroke(o.path); ctx.setLineDash([]);
        });
      }
      // etiquetas
      const seen = new Set();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      const lab = (txt, x, y, font, col, ang) => {
        const cell = ((x / 110) | 0) + ':' + ((y / 26) | 0); if (seen.has(cell)) return; seen.add(cell);
        ctx.save(); ctx.translate(x, y); if (ang) ctx.rotate(ang); ctx.font = font; ctx.lineWidth = 3.5; ctx.strokeStyle = th.halo; ctx.strokeText(txt, 0, 0); ctx.fillStyle = col; ctx.fillText(txt, 0, 0); ctx.restore();
      };
      if (z >= 15.2) for (const it of items) {
        if (it.clip) continue; const k = it.size / it.t.ext;
        for (const nm of it.t.names) {
          const x = it.left + nm.x * k, y = it.top + nm.y * k; if (x < 0 || x > m.w || y < 0 || y > m.h) continue;
          if (nm.len * k < nm.name.length * 6.2) continue;
          let a = nm.ang; if (a > Math.PI / 2) a -= Math.PI; else if (a < -Math.PI / 2) a += Math.PI;
          lab(nm.name, x, y, '600 11px system-ui,sans-serif', th.sub, a);
        }
      }
      const pl = [];
      for (const it of items) { if (it.clip) continue; const k = it.size / it.t.ext; for (const p of it.t.places) if (z >= p.z) pl.push([p, it.left + p.x * k, it.top + p.y * k]); }
      pl.sort((a, b) => a[0].rank - b[0].rank);
      for (const [p, x, y] of pl) { if (x < 0 || x > m.w || y < 0 || y > m.h) continue; lab(p.name, x, y, (p.rank <= 2 ? '700 15px' : p.rank === 3 ? '600 13px' : '600 12px') + ' system-ui,sans-serif', th.text, 0); }
      ctx.textAlign = 'start';
    }
  }

  /* ---------- lectura del archivo (Android: puente nativo; web: Range HTTP) ---------- */
  function b64(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function makeReader(url) {
    const NB = window.AndroidBridge;
    if (NB && NB.readRange) {
      return async (off, len) => { const r = NB.readRange(url, off, len); return r ? b64(r) : new Uint8Array(0); };
    }
    // Web: primero la copia guardada en el teléfono (Cache API); si no hay, lectura por partes del servidor
    let blobP = null;
    const getBlob = () => blobP || (blobP = (window.caches ? caches.open('mapa-v1').then(c => c.match(url)).then(r => r ? r.blob() : null) : Promise.resolve(null)).catch(() => null));
    return async (off, len) => {
      const bl = await getBlob();
      if (bl) return new Uint8Array(await bl.slice(off, off + len).arrayBuffer());
      const r = await fetch(url, { headers: { Range: 'bytes=' + off + '-' + (off + len - 1) } });
      if (r.status !== 206) throw new Error('El servidor no admite lectura por partes');
      return new Uint8Array(await r.arrayBuffer());
    };
  }
  async function isSaved(url) { try { return !!(window.caches && await (await caches.open('mapa-v1')).match(url)); } catch (e) { return false; } }
  async function save(url) { const r = await fetch(url); if (!r.ok) throw new Error('No se pudo descargar'); await (await caches.open('mapa-v1')).put(url, r); }
  async function openVector(url) {
    const NB = window.AndroidBridge;
    if (NB && NB.assetSize && NB.assetSize(url) <= 0) return null;
    try { return await new VectorMap(makeReader(url)).open(); } catch (e) { console.warn('Mapa vectorial no disponible:', e.message); return null; }
  }

  g.Vec = { isSaved, save, openVector, VectorMap, PMTiles, parseMVT, build, tileId };
})(window);
