/* Almacenamiento local (IndexedDB) — todo queda en el teléfono */
(function (g) {
  'use strict';
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open('cajas-gpon', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('feats')) d.createObjectStore('feats', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  function tx(store, mode, fn) {
    return open().then(d => new Promise((res, rej) => {
      const t = d.transaction(store, mode);
      const s = t.objectStore(store);
      let out;
      try { out = fn(s); } catch (e) { rej(e); return; }
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = t.onabort = () => rej(t.error);
    }));
  }
  // Se guarda solo lo serializable (sin los cálculos de pantalla)
  function clean(f) {
    return { id: f.id, t: f.t, n: f.n, g: f.g, c: f.c, d: f.d, x: f.x, st: f.st, ts: f.ts, src: f.src, u: f.u, sy: f.sy };
  }
  g.DB = {
    all() { return tx('feats', 'readonly', s => s.getAll()); },
    putMany(list) { return tx('feats', 'readwrite', s => { list.forEach(f => s.put(clean(f))); }); },
    put(f) { return tx('feats', 'readwrite', s => { s.put(clean(f)); }); },
    del(id) { return tx('feats', 'readwrite', s => { s.delete(id); }); },
    clear() { return tx('feats', 'readwrite', s => { s.clear(); }); },
    getMeta(k) { return tx('meta', 'readonly', s => s.get(k)).then(v => (typeof IDBRequest !== 'undefined' && v instanceof IDBRequest) ? undefined : v); },
    delMany(ids) { return tx('feats', 'readwrite', s => { ids.forEach(id => s.delete(id)); }); },
    setMeta(k, v) { return tx('meta', 'readwrite', s => { s.put(v, k); }); }
  };
})(window);
