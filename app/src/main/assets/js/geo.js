/* Lectura de georreferencias escritas de varias formas (decimal, grados°min'seg", UTM, enlaces de mapas) */
(function (g) {
  'use strict';
  const D2R = Math.PI / 180;
  const num = s => parseFloat(String(s).replace(',', '.'));
  const ok = (la, lo) => isFinite(la) && isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180 && !(la === 0 && lo === 0);

  // UTM (WGS84) -> lat/lon
  function utm(zone, north, E, N) {
    const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996, e2 = f * (2 - f), ep2 = e2 / (1 - e2);
    const x = E - 500000, y = north ? N : N - 10000000;
    const M = y / k0, mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const p = mu + (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * Math.pow(e1, 4) / 32) * Math.sin(4 * mu) +
      (151 * Math.pow(e1, 3) / 96) * Math.sin(6 * mu) + (1097 * Math.pow(e1, 4) / 512) * Math.sin(8 * mu);
    const s = Math.sin(p), c = Math.cos(p), t = Math.tan(p);
    const N1 = a / Math.sqrt(1 - e2 * s * s), T1 = t * t, C1 = ep2 * c * c, R1 = a * (1 - e2) / Math.pow(1 - e2 * s * s, 1.5), D = x / (N1 * k0);
    const lat = p - (N1 * t / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * Math.pow(D, 4) / 24 +
      (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * Math.pow(D, 6) / 720);
    const lon0 = ((zone - 1) * 6 - 180 + 3) * D2R;
    const lon = lon0 + (D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * Math.pow(D, 5) / 120) / c;
    return { lat: lat / D2R, lon: lon / D2R };
  }

  function parse(raw) {
    if (raw == null) return null;
    let t = String(raw).trim();
    if (!t) return null;
    let m;
    // Enlaces de Google Maps / Waze / texto con @lat,lon
    if (/https?:\/\//i.test(t) || /[?&@]/.test(t)) {
      m = t.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) || t.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ||
        t.match(/[?&](?:q|ll|query|destination|center|daddr)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i);
      if (m && ok(+m[1], +m[2])) return { lat: +m[1], lon: +m[2], kind: 'enlace' };
    }
    t = t.replace(/%2C/gi, ',').replace(/[()\[\]]/g, ' ').replace(/\bLAT(ITUD)?\b[:=]?|\bLON(G|GITUD)?\b[:=]?|\bLNG\b[:=]?/gi, ' ');

    // UTM: "16P 580123 1340456" o "16N 580123 1340456" o "zona 16 E 580123 N 1340456"
    m = t.match(/(?:^|\s)(\d{1,2})\s*([C-HJ-NP-X])?\s*[,;\s]\s*E?\s*(\d{5,7}(?:[.,]\d+)?)\s*(?:m?E)?[\s,;]+N?\s*(\d{6,8}(?:[.,]\d+)?)\s*(?:m?N)?\s*$/i);
    if (m && +m[1] >= 1 && +m[1] <= 60) {
      const band = (m[2] || 'N').toUpperCase(), north = band >= 'N';
      const r = utm(+m[1], north, num(m[3]), num(m[4]));
      if (ok(r.lat, r.lon)) return { lat: r.lat, lon: r.lon, kind: 'UTM' };
    }

    // Con letras N/S/E/W/O o símbolos de grados: grados° minutos' segundos"
    if (/[°º]/.test(t) || /(^|[\d\s.,'"′″])[NSEWO]($|[\s\d.,'"′″])/i.test(t)) {
      const prefix = /^\s*[NSEWO]/i.test(t);
      const core = '(-?\\d{1,3}(?:[.,]\\d+)?)(?:(?:\\s*[°º]\\s*|\\s+)(\\d{1,2}(?:[.,]\\d+)?))?(?:(?:\\s*[\'′’]\\s*|\\s+)(\\d{1,2}(?:[.,]\\d+)?))?\\s*(?:["″”]|\'\')?';
      const re = prefix ? new RegExp('([NSEWO])\\s*' + core, 'gi') : new RegExp(core + '\\s*([NSEWO])?(?![A-Za-z])', 'gi');
      const parts = [];
      let x;
      while ((x = re.exec(t))) {
        let L, d, mi, se;
        if (prefix) { L = x[1]; d = x[2]; mi = x[3]; se = x[4]; } else { d = x[1]; mi = x[2]; se = x[3]; L = x[4]; }
        if (d == null || d === '') { if (re.lastIndex === x.index) re.lastIndex++; continue; }
        let v = Math.abs(num(d)) + (mi ? num(mi) / 60 : 0) + (se ? num(se) / 3600 : 0);
        if (num(d) < 0) v = -v;
        L = (L || '').toUpperCase();
        if (L === 'S' || L === 'W' || L === 'O') v = -Math.abs(v);
        parts.push({ v, L });
        if (re.lastIndex === x.index) re.lastIndex++;
      }
      if (parts.length === 2) {
        let la = parts[0], lo = parts[1];
        if (/[EWO]/.test(la.L) || /[NS]/.test(lo.L)) { const tmp = la; la = lo; lo = tmp; }
        if (ok(la.v, lo.v)) return { lat: la.v, lon: lo.v, kind: 'grados' };
      }
    }

    // Decimal: "12.136789, -86.251234" | "12,136789 -86,251234" | "12.13 -86.25"
    let nums = t.match(/-?\d+(?:\.\d+)?/g);
    if (/^[^.]*$/.test(t) && /-?\d+,\d+/.test(t)) {
      const c = t.match(/-?\d+,\d+/g);
      if (c && c.length === 2) nums = c.map(s => s.replace(',', '.'));
    }
    if (nums && nums.length === 2) {
      let la = +nums[0], lo = +nums[1];
      if (Math.abs(la) > 90 || (la < -60 && lo > 0 && lo <= 90)) { const tmp = la; la = lo; lo = tmp; }
      if (ok(la, lo) && (String(nums[0]).indexOf('.') >= 0 || String(nums[1]).indexOf('.') >= 0 || /[,;]/.test(t))) return { lat: la, lon: lo, kind: 'decimal' };
    }
    return null;
  }

  g.Geo = { parse, utm };
})(window);
