/* Lectura y escritura de Excel (.xlsx) y CSV sin librerías externas (usa JSZip) */
(function (g) {
  'use strict';

  const colIdx = ref => { const m = /^([A-Z]+)/i.exec(ref || ''); if (!m) return 0; let n = 0; for (const ch of m[1].toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  const colName = i => { let s = ''; i++; while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };
  const xmlDoc = t => new DOMParser().parseFromString(t.replace(/^﻿/, ''), 'text/xml');
  const byLocal = (el, n) => Array.from(el.getElementsByTagName('*')).filter(x => x.localName === n);
  const kids = (el, n) => Array.from(el.children).filter(x => x.localName === n);

  function siText(si) {
    let s = '';
    Array.from(si.children).forEach(c => {
      if (c.localName === 't') s += c.textContent;
      else if (c.localName === 'r') kids(c, 't').forEach(t => s += t.textContent);
    });
    return s;
  }

  async function readXlsx(buf) {
    const zip = await JSZip.loadAsync(buf);
    let sheetPath = null;
    try {
      const wb = xmlDoc(await zip.file('xl/workbook.xml').async('string'));
      const sh = byLocal(wb, 'sheet')[0];
      const rid = sh && (sh.getAttribute('r:id') || Array.from(sh.attributes).find(a => /:id$/.test(a.name) || a.name === 'id') && Array.from(sh.attributes).find(a => /:id$/.test(a.name)).value);
      const rels = xmlDoc(await zip.file('xl/_rels/workbook.xml.rels').async('string'));
      const rel = byLocal(rels, 'Relationship').find(r => r.getAttribute('Id') === rid);
      if (rel) { let tg = rel.getAttribute('Target'); sheetPath = tg.charAt(0) === '/' ? tg.slice(1) : 'xl/' + tg.replace(/^\.\//, ''); }
    } catch (e) { }
    if (!sheetPath || !zip.file(sheetPath)) {
      sheetPath = Object.keys(zip.files).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/i.test(n)).sort()[0];
    }
    if (!sheetPath) throw new Error('El archivo no tiene hojas de Excel');
    const shared = [];
    const sf = zip.file('xl/sharedStrings.xml');
    if (sf) byLocal(xmlDoc(await sf.async('string')), 'si').forEach(si => shared.push(siText(si)));
    const doc = xmlDoc(await zip.file(sheetPath).async('string'));
    const rows = [];
    byLocal(doc, 'row').forEach(r => {
      const arr = []; let next = 0;
      kids(r, 'c').forEach(c => {
        const ref = c.getAttribute('r'); const i = ref ? colIdx(ref) : next; next = i + 1;
        const t = c.getAttribute('t'); const v = kids(c, 'v')[0]; let val = '';
        if (t === 'inlineStr') { const is = kids(c, 'is')[0]; val = is ? siText(is) : ''; }
        else if (v) { val = v.textContent; if (t === 's') val = shared[+val] != null ? shared[+val] : ''; else if (t === 'b') val = val === '1' ? 'Sí' : 'No'; }
        arr[i] = String(val).trim();
      });
      for (let i = 0; i < arr.length; i++) if (arr[i] == null) arr[i] = '';
      rows.push(arr);
    });
    return rows.filter(r => r.some(x => x !== ''));
  }

  function readCsv(u8) {
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(u8); } catch (e) { text = new TextDecoder('windows-1252').decode(u8); }
    text = text.replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const cnt = ch => first.split(ch).length - 1;
    const d = [';', '\t', ','].sort((a, b) => cnt(b) - cnt(a))[0];
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === d) { row.push(cur.trim()); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur.trim()); cur = ''; rows.push(row); row = []; }
      else cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur.trim()); rows.push(row); }
    return rows.filter(r => r.some(x => x !== ''));
  }

  async function read(file) {
    const buf = await file.arrayBuffer(), u8 = new Uint8Array(buf);
    if (u8[0] === 0x50 && u8[1] === 0x4B) return readXlsx(buf);
    if (u8[0] === 0xD0 && u8[1] === 0xCF) throw new Error('Este es un Excel antiguo (.xls). Ábrelo en Excel y guárdalo como “Libro de Excel (.xlsx)”.');
    return readCsv(u8);
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  async function write(rows, widths, sheetName) {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    zip.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + esc(sheetName || 'Hoja1') + '" sheetId="1" r:id="rId1"/></sheets></workbook>');
    zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    zip.file('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0AA37F"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>');
    let sd = '';
    rows.forEach((r, ri) => {
      sd += '<row r="' + (ri + 1) + '">';
      r.forEach((v, ci) => { sd += '<c r="' + colName(ci) + (ri + 1) + '" t="inlineStr" s="' + (ri === 0 ? 1 : 2) + '"><is><t xml:space="preserve">' + esc(v) + '</t></is></c>'; });
      sd += '</row>';
    });
    const cols = (widths || []).map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('');
    zip.file('xl/worksheets/sheet1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' + (cols ? '<cols>' + cols + '</cols>' : '') + '<sheetData>' + sd + '</sheetData></worksheet>');
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  g.XLS = { read, write };
})(window);
