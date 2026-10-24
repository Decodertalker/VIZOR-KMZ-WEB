/* Lectura (KML/KMZ) y escritura (KMZ para Google Earth) */
(function (g) {
  'use strict';

  const SKIP = new Set(['layer', 'subclasses', 'entityhandle', 'text', 'x', 'y', 'position_x', 'position_y',
    'latitud', 'longitud', 'latitude', 'longitude', 'latidud', 'count', 'label', 'estado']);

  function parseCoords(txt) {
    const out = [];
    (txt || '').trim().split(/\s+/).forEach(tok => {
      const p = tok.split(',');
      if (p.length >= 2) {
        const lo = parseFloat(p[0]), la = parseFloat(p[1]);
        if (isFinite(lo) && isFinite(la) && Math.abs(la) <= 90 && Math.abs(lo) <= 180)
          out.push([Math.round(lo * 1e6) / 1e6, Math.round(la * 1e6) / 1e6]);
      }
    });
    return out;
  }

  function kids(el, name) { return Array.from(el.children).filter(c => c.localName === name); }
  function kid(el, name) { return kids(el, name)[0] || null; }
  function txt(el, name) { const k = kid(el, name); return k && k.textContent ? k.textContent.trim() : ''; }
  function all(el, name) { return Array.from(el.getElementsByTagName(name)); }

  function toDoc(text) {
    // Muchos KML exportados tienen prefijos sin declarar (mwm:, xsi:…) que el parser estricto rechaza.
    // Se intenta primero tal cual y, si falla, se limpian esos prefijos.
    let t = text.replace(/^\uFEFF/, '');
    const bad = d => d.getElementsByTagName('parsererror').length > 0;
    let doc = new DOMParser().parseFromString(t, 'text/xml');
    if (bad(doc)) {
      t = t.replace(/<(\/?)[A-Za-z0-9_.-]+:([A-Za-z0-9_.-]+)/g, '<$1$2')
        .replace(/\s(?!xmlns)[A-Za-z0-9_.-]+:[A-Za-z0-9_.-]+="[^"]*"/g, '');
      doc = new DOMParser().parseFromString(t, 'text/xml');
    }
    if (bad(doc)) throw new Error('El archivo KML no se pudo leer (formato no válido)');
    return doc;
  }

  function parse(text, fileName) {
    const doc = toDoc(text);
    const root = doc.documentElement;
    const feats = [];
    const base = (fileName || 'Importado').replace(/\.(kmz|kml)$/i, '');

    function placemark(p, path) {
      const name = txt(p, 'name');
      let desc = txt(p, 'description');
      if (desc === 'Unknown Point Feature') desc = '';
      const x = {};
      const ed = kid(p, 'ExtendedData');
      if (ed) {
        all(ed, 'SimpleData').forEach(sd => {
          const k = sd.getAttribute('name'), v = (sd.textContent || '').trim();
          if (k && v && !SKIP.has(k.toLowerCase())) x[k] = v;
        });
        all(ed, 'Data').forEach(d => {
          const k = d.getAttribute('name'), v = txt(d, 'value');
          if (k && v && !SKIP.has(k.toLowerCase())) x[k] = v;
        });
      }
      const grp = path.slice();
      const pt = p.getElementsByTagName('Point')[0];
      if (pt) {
        const co = parseCoords(txt(pt, 'coordinates'))[0];
        if (!co) return;
        const f = { t: 'p', n: name, g: grp, c: co };
        if (desc) f.d = desc;
        if (Object.keys(x).length) f.x = x;
        feats.push(f); return;
      }
      const lines = all(p, 'LineString').map(l => parseCoords(txt(l, 'coordinates'))).filter(l => l.length > 1);
      if (lines.length) { feats.push({ t: 'l', n: name, g: grp, c: lines }); return; }
      let rings = [];
      all(p, 'Polygon').forEach(pg => {
        const ob = pg.getElementsByTagName('outerBoundaryIs')[0];
        const co = ob ? parseCoords(txt(ob.getElementsByTagName('LinearRing')[0] || ob, 'coordinates')) : [];
        if (co.length > 2) rings.push(co);
      });
      if (!rings.length) all(p, 'LinearRing').forEach(r => { const co = parseCoords(txt(r, 'coordinates')); if (co.length > 2) rings.push(co); });
      if (rings.length) feats.push({ t: 'a', n: name, g: grp, c: rings });
    }

    function walk(el, path) {
      Array.from(el.children).forEach(c => {
        const tag = c.localName;
        if (tag === 'Folder' || tag === 'Document') {
          const nm = txt(c, 'name');
          const np = path.slice();
          if (tag === 'Folder' && nm && np[np.length - 1] !== nm) np.push(nm);
          walk(c, np);
        } else if (tag === 'Placemark') placemark(c, path);
      });
    }
    walk(root, []);

    // Si todo viene envuelto en una sola carpeta raíz (como el KMZ original), se quita ese nivel.
    const firsts = new Set(feats.map(f => f.g[0]));
    if (feats.length && firsts.size === 1 && feats.every(f => f.g.length > 1) && feats.some(f => f.g.length > 2)) {
      feats.forEach(f => f.g = f.g.slice(1));
    }
    feats.forEach(f => { if (!f.g.length) f.g = [base]; });
    return feats;
  }

  async function readFile(file) {
    const buf = await file.arrayBuffer();
    const u8 = new Uint8Array(buf);
    const isZip = u8[0] === 0x50 && u8[1] === 0x4B;
    const out = [];
    if (isZip) {
      const zip = await JSZip.loadAsync(buf);
      const names = Object.keys(zip.files).filter(n => /\.kml$/i.test(n) && !zip.files[n].dir);
      names.sort((a, b) => (a === 'doc.kml' ? -1 : b === 'doc.kml' ? 1 : 0));
      for (const n of names) {
        const text = await zip.files[n].async('string');
        out.push(...parse(text, file.name));
      }
    } else {
      out.push(...parse(new TextDecoder('utf-8').decode(u8), file.name));
    }
    return out;
  }

  /* ---------- Exportación ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function kindOf(f) { return /^(N[I\d\/\s]|CTO)/i.test(f.n || '') ? 'caja' : 'nodo'; }

  function coordStr(c, closeRing) {
    const pts = closeRing && (c[0][0] !== c[c.length - 1][0] || c[0][1] !== c[c.length - 1][1]) ? c.concat([c[0]]) : c;
    return pts.map(p => p[0] + ',' + p[1] + ',0').join(' ');
  }

  function placemarkXml(f, ind) {
    const I = ind;
    let s = I + '<Placemark>\n' + I + '  <name>' + esc(f.n) + '</name>\n';
    if (f.d) s += I + '  <description>' + esc(f.d) + '</description>\n';
    const style = f.t === 'p' ? (f.st === 'new' ? '#sNueva' : '#s' + (kindOf(f) === 'caja' ? 'Caja' : 'Nodo'))
      : f.t === 'l' ? '#sRuta' : '#sArea';
    s += I + '  <styleUrl>' + style + '</styleUrl>\n';
    const ext = Object.assign({}, f.x || {});
    if (f.st === 'new') ext['Estado'] = 'Nueva'; else if (f.st === 'edit') ext['Estado'] = 'Editada';
    const keys = Object.keys(ext);
    if (keys.length) {
      s += I + '  <ExtendedData>\n';
      keys.forEach(k => { s += I + '    <Data name="' + esc(k) + '"><value>' + esc(ext[k]) + '</value></Data>\n'; });
      s += I + '  </ExtendedData>\n';
    }
    if (f.t === 'p') {
      s += I + '  <Point><coordinates>' + f.c[0] + ',' + f.c[1] + ',0</coordinates></Point>\n';
    } else if (f.t === 'l') {
      const inner = f.c.map(l => '<LineString><tessellate>1</tessellate><coordinates>' + coordStr(l) + '</coordinates></LineString>');
      s += I + '  ' + (inner.length > 1 ? '<MultiGeometry>' + inner.join('') + '</MultiGeometry>' : inner[0]) + '\n';
    } else {
      const inner = f.c.map(r => '<Polygon><tessellate>1</tessellate><outerBoundaryIs><LinearRing><coordinates>' + coordStr(r, true) + '</coordinates></LinearRing></outerBoundaryIs></Polygon>');
      s += I + '  ' + (inner.length > 1 ? '<MultiGeometry>' + inner.join('') + '</MultiGeometry>' : inner[0]) + '\n';
    }
    return s + I + '</Placemark>\n';
  }

  function build(feats, opt) {
    opt = opt || {};
    const root = { name: opt.rootName || 'Cajas', kids: new Map(), items: [] };
    feats.forEach(f => {
      let node = root;
      (f.g && f.g.length ? f.g : ['Sin grupo']).forEach(nm => {
        if (!node.kids.has(nm)) node.kids.set(nm, { name: nm, kids: new Map(), items: [] });
        node = node.kids.get(nm);
      });
      node.items.push(f);
    });
    function folder(n, ind, isRoot) {
      let s = ind + '<Folder>\n' + ind + '  <name>' + esc(n.name) + '</name>\n';
      if (isRoot) s += ind + '  <open>1</open>\n';
      n.kids.forEach(k => { s += folder(k, ind + '  ', false); });
      // primero puntos, luego rutas y áreas para que se vean encima
      n.items.slice().sort((a, b) => ('pla'.indexOf(a.t)) - ('pla'.indexOf(b.t))).forEach(f => { s += placemarkXml(f, ind + '  '); });
      return s + ind + '</Folder>\n';
    }
    const pin = 'http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png';
    const icon = (id, col, sc) => '  <Style id="' + id + '"><IconStyle><color>' + col + '</color><scale>' + sc + '</scale><Icon><href>' + pin + '</href></Icon></IconStyle><LabelStyle><scale>0.8</scale></LabelStyle></Style>\n';
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n  <name>' + esc(opt.docName || root.name) + '</name>\n';
    xml += icon('sCaja', 'ffb0e22d', 0.9) + icon('sNodo', 'ff47b5ff', 1.1) + icon('sNueva', 'ffff88b3', 1.1);
    xml += '  <Style id="sRuta"><LineStyle><color>ff47b5ff</color><width>2</width></LineStyle></Style>\n';
    xml += '  <Style id="sArea"><LineStyle><color>ffb0e22d</color><width>1.5</width></LineStyle><PolyStyle><color>33b0e22d</color></PolyStyle></Style>\n';
    xml += folder(root, '  ', true) + '</Document>\n</kml>\n';
    return xml;
  }

  async function toKMZ(kmlText) {
    const zip = new JSZip();
    zip.file('doc.kml', kmlText);
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 }, mimeType: 'application/vnd.google-earth.kmz' });
  }

  g.KML = { parse, readFile, build, toKMZ, kindOf };
})(window);
