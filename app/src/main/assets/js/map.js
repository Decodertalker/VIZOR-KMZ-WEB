/* Motor de mapa propio (Web Mercator + mosaicos + vectores en canvas). Sin dependencias. */
(function (g) {
  'use strict';
  const TS = 256, PI = Math.PI, D2R = PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mxOf = lon => (lon + 180) / 360;
  const myOf = lat => { const s = Math.sin(clamp(lat, -85.05, 85.05) * D2R); return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * PI); };
  const lonOf = x => x * 360 - 180;
  const latOf = y => { const n = PI - 2 * PI * y; return 180 / PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); };

  class GeoMap {
    constructor(canvas) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.cx = mxOf(-86.2); this.cy = myOf(13.5); this.z = 9;
      this.minZ = 4; this.maxZ = 21;
      this.w = 0; this.h = 0; this.dpr = 1; this.s = TS * 512;
      this.src = null; this.tiles = new Map(); this.queue = []; this.low = []; this.old = null; this.zt = null; this.inflight = 0; this.frame = 0;
      this.bg = '#0b1220'; this.grid = 'rgba(255,255,255,.04)';
      this.vec = null; this.onNetBad = null; this._fails = 0; this._okAt = 0;
      this.lock = null; this.onDraw = null; this.onTap = null; this.onMove = null; this.onMoveEnd = null; this.onUserMove = null;
      this.anim = null; this.inertia = null; this._raf = 0; this._moveEndT = 0;
      this.gm = null; this._hold = 0; this._gl = 0; this.rot = 0; this.rotT = null; this.onRot = null;
      this._bind();
      new ResizeObserver(() => this._resize()).observe(canvas.parentElement || canvas);
      this._resize();
    }
    /* ---- conversiones ---- */
    toScreen(lat, lon) { return [(mxOf(lon) - this.cx) * this.s + this.w / 2, (myOf(lat) - this.cy) * this.s + this.h / 2]; }
    toScreenN(x, y) { return [(x - this.cx) * this.s + this.w / 2, (y - this.cy) * this.s + this.h / 2]; }
    fromScreen(px, py) { return { lat: latOf((py - this.h / 2) / this.s + this.cy), lon: lonOf((px - this.w / 2) / this.s + this.cx) }; }
    center() { return { lat: latOf(this.cy), lon: lonOf(this.cx) }; }
    _un(x, y) { const c = Math.cos(this.rot), s = Math.sin(this.rot), dx = x - this.w / 2, dy = y - this.h / 2; return { x: dx * c + dy * s + this.w / 2, y: -dx * s + dy * c + this.h / 2 }; }
    _unv(dx, dy) { const c = Math.cos(this.rot), s = Math.sin(this.rot); return [dx * c + dy * s, -dx * s + dy * c]; }
    resetNorth() { this.rotT = 0; this._schedule(); }
    setRot(r) { this.rot = Math.atan2(Math.sin(r), Math.cos(r)); this.invalidate(); this.onRot && this.onRot(this.rot); }
    bounds() { const c = Math.abs(Math.cos(this.rot)), sn = Math.abs(Math.sin(this.rot)), hx = (this.w * c + this.h * sn) / 2 / this.s, hy = (this.w * sn + this.h * c) / 2 / this.s; return { x0: this.cx - hx, x1: this.cx + hx, y0: this.cy - hy, y1: this.cy + hy }; }
    metersPerPx(lat) { return 40075016.686 * Math.cos((lat == null ? this.center().lat : lat) * D2R) / (TS * Math.pow(2, this.z)); }

    /* ---- vista ---- */
    _setS() { this.s = TS * Math.pow(2, this.z); }
    _fixCenter() {
      this.cx = ((this.cx % 1) + 1) % 1;
      const hy = this.h / 2 / this.s;
      this.cy = hy >= 0.5 ? 0.5 : clamp(this.cy, hy, 1 - hy);
    }
    setView(lat, lon, z) {
      this.cx = mxOf(lon); this.cy = myOf(lat);
      if (z != null) this.z = clamp(z, this.minZ, this.maxZ);
      this._setS(); this._fixCenter(); this._push(); this.invalidate(); this._emitMove();
    }
    zoomAt(px, py, nz) {
      nz = clamp(nz, this.minZ, this.maxZ);
      if (this.lock) { px = this.w / 2; py = this.h / 2; this.cx = this.lock.x; this.cy = this.lock.y; }  // punto fijado: el zoom no lo mueve
      const wx = (px - this.w / 2) / this.s + this.cx, wy = (py - this.h / 2) / this.s + this.cy;
      this.z = nz; this._setS();
      this.cx = wx - (px - this.w / 2) / this.s; this.cy = wy - (py - this.h / 2) / this.s;
      this._fixCenter(); this._push(); this.invalidate(); this._emitMove();
    }
    smoothZoom(px, py, nz) { this.anim = null; this.inertia = null; this.zt = { px, py, z: clamp(nz, this.minZ, this.maxZ) }; this._zl = 0; this._schedule(); }
    /* Vuela a un punto; `yFrac` = posición vertical (0..1) en que debe quedar el punto */
    flyTo(lat, lon, z, yFrac, dur) {
      z = clamp(z == null ? this.z : z, this.minZ, this.maxZ);
      const s2 = TS * Math.pow(2, z);
      const ty = myOf(lat) + (this.h * (0.5 - (yFrac == null ? 0.5 : yFrac))) / s2;
      let tx = mxOf(lon);
      // camino corto alrededor del mundo
      if (tx - this.cx > 0.5) tx -= 1; else if (this.cx - tx > 0.5) tx += 1;
      this.anim = { t0: performance.now(), dur: dur || 650, from: { cx: this.cx, cy: this.cy, z: this.z }, to: { cx: tx, cy: ty, z } };
      this.inertia = null; this._warm(tx, ty, z); this._schedule();
    }
    fitBounds(minLat, minLon, maxLat, maxLon, pad) {
      pad = pad || 40;
      const x0 = mxOf(minLon), x1 = mxOf(maxLon), y0 = myOf(maxLat), y1 = myOf(minLat);
      const zx = Math.log2((this.w - pad * 2) / (TS * Math.max(x1 - x0, 1e-9)));
      const zy = Math.log2((this.h - pad * 2) / (TS * Math.max(y1 - y0, 1e-9)));
      this.setView(latOf((y0 + y1) / 2), lonOf((x0 + x1) / 2), Math.min(zx, zy, 18));
    }
    _emitMove() { this.onMove && this.onMove(this); clearTimeout(this._moveEndT); this._moveEndT = setTimeout(() => this.onMoveEnd && this.onMoveEnd(this), 180); }

    /* ---- Google Maps como mapa base: Google maneja gestos y dibujo del fondo; este canvas dibuja encima ---- */
    attachGoogle(gm) {
      if (this.gm === gm) return;
      this.cv.style.pointerEvents = 'none';   // con Google, los gestos (arrastrar, zoom) los recibe Google; este lienzo solo dibuja encima
      this.gm = gm; this.rot = 0; this.rotT = null; this.onRot && this.onRot(0); this.src = null; this.tiles.clear(); this.queue = [];
      if (!this._gl) {
        this._gl = 1;
        gm.addListener('dragstart', () => this.onUserMove && this.onUserMove());
        gm.addListener('zoom_changed', () => { if (performance.now() > this._hold && this.onUserMove) this.onUserMove(); });
        gm.addListener('click', e => { if (!e.latLng || !this.onTap) return; const p = this.toScreen(e.latLng.lat(), e.latLng.lng()); this.onTap(p[0], p[1]); });
        const loop = () => { this._poll(); requestAnimationFrame(loop); };
        requestAnimationFrame(loop);
      }
      this._push(true); this.invalidate();
    }
    setVector(v) { this.vec = v || null; this.invalidate(); }
    detachGoogle() { this.gm = null; this.cv.style.pointerEvents = ''; this.invalidate(); }
    _push(force) {
      if (!this.gm) return;
      this._hold = performance.now() + 300;
      try { this.gm.moveCamera({ center: { lat: latOf(this.cy), lng: lonOf(this.cx) }, zoom: this.z }); } catch (e) { }
    }
    _poll() {
      if (!this.gm || this.anim || performance.now() < this._hold) return;
      const c = this.gm.getCenter(), z = this.gm.getZoom(); if (!c || z == null) return;
      const nx = mxOf(c.lng()), ny = myOf(c.lat());
      if (Math.abs(nx - this.cx) * this.s > 0.3 || Math.abs(ny - this.cy) * this.s > 0.3 || Math.abs(z - this.z) > 0.001) {
        this.cx = nx; this.cy = ny; this.z = z; this._setS(); this.invalidate(); this._emitMove();
      }
    }

    /* ---- mapa base ---- */
    setSource(src) {
      this.src = src; this.tiles = new Map(); this.queue = []; this.low = []; this.invalidate();
    }
    static fill(url, z, x, y) { return url.replace('{z}', z).replace('{x}', x).replace('{y}', y).replace('{s}', 'abcd'[(x + y) & 3]).replace('{r}', (window.devicePixelRatio || 1) >= 1.5 ? '@2x' : ''); }
    _tileUrl(z, x, y, ov) { return GeoMap.fill(ov ? this.src.overlay : this.src.url, z, x, y); }
    _getTile(z, x, y, want, low, ov) {
      const key = (ov ? 'o' : '') + z + '/' + x + '/' + y;
      let t = this.tiles.get(key);
      if (!t) {
        if (!want) return null;
        t = { key, z, x, y, ov: !!ov, st: 0, img: null, fail: 0, f: this.frame, at: 0 };
        this.tiles.set(key, t); (low ? this.low : this.queue).push(t);
      } else if (want) {
        t.f = this.frame;
        if (t.st === 0 && !low && t.low) { t.low = false; this.queue.push(t); }
        if (t.st === 3 && performance.now() - t.fail > 20000) { t.st = 0; (low ? this.low : this.queue).push(t); }
      }
      if (low && t.st === 0) t.low = true;
      return t.st === 2 ? t : null;
    }
    _pump() {
      while (this.inflight < 12 && this.queue.length) {
        const t = this.queue.pop();
        if (t.st !== 0) continue;
        if (t.f < this.frame - 2) { this.tiles.delete(t.key); continue; } // ya no se ve
        t.st = 1; this.inflight++;
        const img = new Image(); img.crossOrigin = 'anonymous'; img.decoding = 'async'; const srcAt = this.src;
        img.onload = () => {
          this._fails = 0; this._okAt = performance.now(); if (img._b) URL.revokeObjectURL(img._b);
          this.inflight--;
          if (srcAt && srcAt.ph && !t.ov && t.z >= 14 && this._isPH(img)) {
            // Esri no tiene imagen a este nivel: se usa la del nivel anterior ampliada
            t.st = 4; if (t.z > 0 && this.tiles.get(t.key) === t) this._getTile(t.z - 1, t.x >> 1, t.y >> 1, true, false, false);
          } else {
            let d = img;
            if (srcAt && srcAt.filter && !t.ov) {  // el filtro (modo oscuro) se aplica una sola vez, no en cada cuadro
              try { const c = document.createElement('canvas'); c.width = img.naturalWidth || 256; c.height = img.naturalHeight || 256; const x = c.getContext('2d'); x.filter = srcAt.filter; x.drawImage(img, 0, 0); d = c; } catch (e) { d = img; }
            }
            t.st = 2; t.img = d; t.at = performance.now();
          }
          this.invalidate(); this._pump();
        };
        img.onerror = () => {
          t.st = 3; t.fail = performance.now(); this.inflight--; this._pump();
          if (++this._fails >= 8 && performance.now() - this._okAt > 8000) { this._fails = 0; this.onNetBad && this.onNetBad(); }
        };
        const url = this._tileUrl(t.z, t.x, t.y, t.ov);
        if (window.caches) {
          caches.open('tiles-v1').then(c => c.match(url, { ignoreVary: true })).then(r => r ? r.blob() : null).then(b => {
            if (b) { img._b = URL.createObjectURL(b); img.src = img._b; }
            else if (navigator.serviceWorker && navigator.serviceWorker.controller) img.src = url;  // el service worker ya lo guarda
            else {
              img.src = url;  // una sola descarga; el navegador de la app ya guarda en su caché lo visto (el mapa descargado sin conexión se guarda aparte)
            }
          }).catch(() => { img.src = url; });
        } else img.src = url;
      }
    }
    _isPH(img) {
      try {
        const c = this._pc || (this._pc = document.createElement('canvas')); c.width = c.height = 8;
        const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, 8, 8);
        const d = x.getImageData(0, 0, 8, 8).data; let n = 0;
        for (let i = 0; i < 256; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2]; if (r > 185 && r < 230 && Math.abs(r - g) < 7 && Math.abs(g - b) < 7) n++; }
        return n >= 58;
      } catch (e) { return false; }
    }
    _evict() {
      const hi = this.src && this.src.r2 ? 220 : 600, lo = this.src && this.src.r2 ? 150 : 420;
      if (this.tiles.size < hi) return;
      let n = this.tiles.size - lo;
      for (const [k, t] of this.tiles) { if (n <= 0) break; if (t.f < this.frame - 1 && t.st !== 1) { this.tiles.delete(k); n--; } }
    }
    _drawTiles(ctx) {
      const src = this.src; if (!src) return;
      const b = this.bounds(); this.frame++;
      this._layer(ctx, src, false, b);
      if (src.overlay) this._layer(ctx, src, true, b);
      this._pump(); this._evict();
    }
    _layer(ctx, src, ov, b) {
      const zi = clamp(Math.round(this.z), ov ? 0 : (src.minZoom || 0), ov ? (src.ovMax || 18) : (src.maxZoom || 19));
      const n = Math.pow(2, zi), size = this.s / n;
      const x0 = Math.floor(b.x0 * n), x1 = Math.floor(b.x1 * n), y0 = Math.max(0, Math.floor(b.y0 * n)), y1 = Math.min(n - 1, Math.floor(b.y1 * n));
      if ((x1 - x0 + 1) * (y1 - y0 + 1) > (this.rot ? 240 : 120)) return;
      // pinta lo que haya de relleno: el "padre" más cercano en memoria
      const under = (wx, y, dx, dy, sz) => {
        for (let d = 1; d <= 5 && zi - d >= 0; d++) {
          const k = Math.pow(2, d), p = this._getTile(zi - d, Math.floor(wx / k), Math.floor(y / k), false, false, ov);
          if (p) { const ss = (p.img.width || TS) / k; ctx.drawImage(p.img, (wx % k) * ss, (y % k) * ss, ss, ss, dx, dy, sz, sz); return true; }
        }
        return false;
      };
      // se piden primero los cuadros del centro y al final los de las orillas (la cola saca el último que entró)
      const list = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const ex = (x + .5) / n - this.cx, ey = (y + .5) / n - this.cy; list.push([x, y, ex * ex + ey * ey]); }
      list.sort((a, b) => b[2] - a[2]);
      for (const [x, y] of list) {
        const wx = ((x % n) + n) % n;
        const dx = (x / n - this.cx) * this.s + this.w / 2, dy = (y / n - this.cy) * this.s + this.h / 2, sz = size + 0.6;
        const t = this._getTile(zi, wx, y, true, false, ov);
        if (t) { ctx.drawImage(t.img, dx, dy, sz, sz); continue; }
        under(wx, y, dx, dy, sz);
      }
    }
    /* Al volar a otra zona: se empiezan a bajar los cuadros del destino (y uno más lejano de relleno) mientras dura la animación */
    _warm(cx, cy, z) {
      const src = this.src; if (!src || this.gm || this.vec) return;
      const zi = clamp(Math.round(z), src.minZoom || 0, src.maxZoom || 19);
      for (const zz of [zi, Math.max(zi - 3, 0)]) {
        const n = Math.pow(2, zz), hx = this.w / 2 / (TS * Math.pow(2, z)) * n, hy = this.h / 2 / (TS * Math.pow(2, z)) * n, tx = cx * n, ty = cy * n, list = [];
        for (let y = Math.max(0, Math.floor(ty - hy)); y <= Math.min(n - 1, Math.floor(ty + hy)); y++) for (let x = Math.floor(tx - hx); x <= Math.floor(tx + hx); x++) list.push([x, y, (x + .5 - tx) ** 2 + (y + .5 - ty) ** 2]);
        if (list.length > 90) continue;
        list.sort((a, b) => b[2] - a[2]);
        for (const [x, y] of list) { const wx = ((x % n) + n) % n; this._getTile(zz, wx, y, true, false, false); const t = this.tiles.get(zz + '/' + wx + '/' + y); if (t) t.f = this.frame + 90; }
      }
      this._pump();
    }

    /* ---- dibujo ---- */
    invalidate() { this._dirty = true; this._schedule(); }
    _schedule() { if (!this._raf) this._raf = requestAnimationFrame(t => { this._raf = 0; this._tick(t); }); }
    _tick(now) {
      let busy = false;
      if (this.anim) {
        const a = this.anim, k = clamp((now - a.t0) / a.dur, 0, 1), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        this.cx = a.from.cx + (a.to.cx - a.from.cx) * e; this.cy = a.from.cy + (a.to.cy - a.from.cy) * e;
        this.z = a.from.z + (a.to.z - a.from.z) * e; this._setS(); this._fixCenter(); this._push(); this._dirty = true; this._emitMove();
        if (k >= 1) this.anim = null; else busy = true;
      }
      if (this.inertia) {
        const i = this.inertia, dt = Math.min(now - (i.t || now), 40); i.t = now;
        this.cx -= i.vx * dt / this.s; this.cy -= i.vy * dt / this.s; this._fixCenter();
        const f = Math.pow(0.94, dt / 16); i.vx *= f; i.vy *= f; this._dirty = true; this._emitMove();
        if (Math.abs(i.vx) + Math.abs(i.vy) < 0.02) this.inertia = null; else busy = true;
      }
      if (this.zt) {
        const q = this.zt, dt = Math.min(now - (this._zl || now), 50); this._zl = now;
        const dz = q.z - this.z;
        if (Math.abs(dz) < 0.004) { this.zoomAt(q.px, q.py, q.z); this.zt = null; this._zl = 0; }
        else { this.zoomAt(q.px, q.py, this.z + dz * (1 - Math.exp(-Math.max(dt, 8) / 75))); busy = true; }
      }
      if (this.rotT != null) {
        const dtr = Math.min(now - (this._rl || now), 50); this._rl = now;
        let d = this.rotT - this.rot; d = Math.atan2(Math.sin(d), Math.cos(d));
        if (Math.abs(d) < 0.004) { this.rot = this.rotT; this.rotT = null; this._rl = 0; } else { this.rot += d * (1 - Math.exp(-Math.max(dtr, 8) / 90)); busy = true; }
        this._dirty = true; this.onRot && this.onRot(this.rot);
      }
      if (this._dirty) { this._dirty = false; this._render(); }
      if (busy) this._schedule();
    }
    _rotOn(ctx) { if (this.rot && !this.gm) { ctx.translate(this.w / 2, this.h / 2); ctx.rotate(this.rot); ctx.translate(-this.w / 2, -this.h / 2); } }
    _render() {
      const ctx = this.ctx, dpr = this.dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (this.vec) { if (this.rot) { ctx.fillStyle = this.bg; ctx.fillRect(0, 0, this.w, this.h); this._rotOn(ctx); } this.vec.draw(ctx, this); this.onDraw && this.onDraw(ctx, this); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return; }
      if (this.gm) ctx.clearRect(0, 0, this.w, this.h);
      else {
        ctx.fillStyle = this.bg; ctx.fillRect(0, 0, this.w, this.h);
        if (!this.rot) this._drawGrid(ctx);
        this._rotOn(ctx); if (this.src) this._drawTiles(ctx);
      }
      this.onDraw && this.onDraw(ctx, this);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    _drawGrid(ctx) {
      const step = 64, ox = (this.cx * this.s - this.w / 2) % step, oy = (this.cy * this.s - this.h / 2) % step;
      ctx.strokeStyle = this.grid; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = -ox; x < this.w; x += step) { ctx.moveTo(Math.round(x) + .5, 0); ctx.lineTo(Math.round(x) + .5, this.h); }
      for (let y = -oy; y < this.h; y += step) { ctx.moveTo(0, Math.round(y) + .5); ctx.lineTo(this.w, Math.round(y) + .5); }
      ctx.stroke();
    }
    _resize() {
      const p = this.cv.parentElement || this.cv, r = p.getBoundingClientRect();
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = Math.max(1, Math.round(r.width)); this.h = Math.max(1, Math.round(r.height));
      this.cv.width = Math.round(this.w * this.dpr); this.cv.height = Math.round(this.h * this.dpr);
      this.cv.style.width = this.w + 'px'; this.cv.style.height = this.h + 'px';
      this._fixCenter(); this.invalidate();
    }

    /* ---- gestos ---- */
    _bind() {
      const cv = this.cv, P = new Map();
      let moved = 0, t0 = 0, lastTap = { t: 0, x: 0, y: 0 }, pinch = null, v = { x: 0, y: 0, t: 0 };
      const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      const U = p => this.rot ? this._un(p.x, p.y) : p;   // pantalla → mapa sin girar
      const pstate = () => {
        const a = Array.from(P.values()), dx = a[1].x - a[0].x, dy = a[1].y - a[0].y;
        return { d: Math.hypot(dx, dy) || 1, ang: Math.atan2(dy, dx), mx: (a[0].x + a[1].x) / 2, my: (a[0].y + a[1].y) / 2 };
      };
      cv.addEventListener('pointerdown', e => {
        cv.setPointerCapture(e.pointerId); const p = pos(e); P.set(e.pointerId, p);
        this.anim = null; this.inertia = null; this.zt = null; this.rotT = null;
        this.onUserMove && this.onUserMove();
        if (P.size === 1) { moved = 0; t0 = performance.now(); v = { x: 0, y: 0, t: t0 }; }
        if (P.size === 2) {
          const s = pstate(), m = U({ x: s.mx, y: s.my });
          pinch = { d: s.d, ang: s.ang, rot0: this.rot, on: false, base: 0, z: this.z, wx: (m.x - this.w / 2) / this.s + this.cx, wy: (m.y - this.h / 2) / this.s + this.cy };
          moved = 99;
        }
      });
      cv.addEventListener('pointermove', e => {
        if (!P.has(e.pointerId)) return;
        const p = pos(e), prev = P.get(e.pointerId); P.set(e.pointerId, p);
        if (P.size === 1) {
          const raw = this.rot ? this._unv(p.x - prev.x, p.y - prev.y) : [p.x - prev.x, p.y - prev.y], dx = raw[0], dy = raw[1];
          moved += Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y);
          if (moved < 6) return;
          if (this.lock) this.lock = null;  // al arrastrar el mapa se suelta el punto fijado
          this.cx -= dx / this.s; this.cy -= dy / this.s; this._fixCenter();
          const now = performance.now(), dt = Math.max(now - v.t, 1);
          v = { x: v.x * .6 + (dx / dt) * .4, y: v.y * .6 + (dy / dt) * .4, t: now };
          this.invalidate(); this._emitMove();
        } else if (P.size === 2 && pinch) {
          const s = pstate();
          this.z = clamp(pinch.z + Math.log2(s.d / pinch.d), this.minZ, this.maxZ); this._setS();
          if (!this.gm) {   // girar con dos dedos (solo después de ~8°, para no girar sin querer)
            let da = s.ang - pinch.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
            if (!pinch.on && Math.abs(da) > 0.14) { pinch.on = true; pinch.base = da; }
            if (pinch.on) { this.rot = Math.atan2(Math.sin(pinch.rot0 + da - pinch.base), Math.cos(pinch.rot0 + da - pinch.base)); this.onRot && this.onRot(this.rot); }
          }
          const dxs = s.mx - this.w / 2, dys = s.my - this.h / 2, c = Math.cos(this.rot), sn = Math.sin(this.rot);
          this.cx = pinch.wx - (dxs * c + dys * sn) / this.s; this.cy = pinch.wy - (-dxs * sn + dys * c) / this.s;
          if (this.lock) { this.cx = this.lock.x; this.cy = this.lock.y; }
          this._fixCenter(); this.invalidate(); this._emitMove();
        }
      });
      const up = e => {
        if (!P.has(e.pointerId)) return;
        const p = pos(e), wasOne = P.size === 1; P.delete(e.pointerId);
        if (wasOne) {
          const now = performance.now(), q = U(p);
          if (moved < 10 && now - t0 < 500) {
            if (now - lastTap.t < 320 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 30) {
              this.smoothZoom(q.x, q.y, Math.round(this.z) + 1); lastTap.t = 0;
            } else { lastTap = { t: now, x: p.x, y: p.y }; this.onTap && this.onTap(q.x, q.y); }
          } else if (now - v.t < 80 && Math.hypot(v.x, v.y) > 0.25) {
            this.inertia = { vx: v.x, vy: v.y, t: 0 }; this._schedule();
          }
        } else if (P.size === 1) { if (pinch && pinch.on && Math.abs(this.rot) < 0.1) this.resetNorth(); pinch = null; moved = 99; }
        if (P.size < 2) pinch = null;
      };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('wheel', e => {
        e.preventDefault(); const p = pos(e);
        this.onUserMove && this.onUserMove();
        if (e.shiftKey && !this.gm) { this.setRot(this.rot + (e.deltaY || e.deltaX) * 0.004); return; }   // Mayús + rueda: girar
        const q = U(p);
        this.smoothZoom(q.x, q.y, (this.zt ? this.zt.z : this.z) - e.deltaY * (e.ctrlKey ? 0.02 : 0.0025));
      }, { passive: false });
    }
  }

  g.GeoMap = GeoMap;
  g.Merc = { mxOf, myOf, lonOf, latOf };
})(window);
