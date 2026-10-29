/* Cliente del servidor de usuarios y ubicaciones (Supabase, solo con fetch) */
(function (g) {
  'use strict';
  const K_CFG = 'cajas.cloud.cfg', K_SES = 'cajas.cloud.session';
  // La sesión vive en sessionStorage: al cerrar la pestaña o la ventana de la web se pierde y vuelve a pedir usuario y contraseña
  const st = k => (k === 'cajas.cloud.session' ? sessionStorage : localStorage);
  const rd = k => { try { return JSON.parse(st(k).getItem(k) || 'null'); } catch (e) { return null; } };
  const wr = (k, v) => { try { if (v == null) st(k).removeItem(k); else st(k).setItem(k, JSON.stringify(v)); } catch (e) { } };
  try { localStorage.removeItem('cajas.cloud.session'); } catch (e) { }

  function normUrl(u) {
    u = String(u || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
    if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
    return u;
  }
  let cfg = { url: normUrl((g.CAJAS_CLOUD || {}).url), key: String((g.CAJAS_CLOUD || {}).key || '').trim() };
  const saved = rd(K_CFG); if ((!cfg.url || !cfg.key) && saved && saved.url && saved.key) cfg = { url: normUrl(saved.url), key: String(saved.key).trim() };
  // En la app Android, la sesión solo vale mientras la app siga abierta: si se cierra por completo, pide usuario y contraseña otra vez
  const BOOT = (g.AndroidBridge && g.AndroidBridge.bootId) ? String(g.AndroidBridge.bootId()) : '';
  let ses = rd(K_SES);
  if (BOOT && ses && ses.boot !== BOOT) { ses = null; wr(K_SES, null); }
  const K_OFF = 'cajas.cloud.off';
  const hex = u8 => Array.from(u8, b => b.toString(16).padStart(2, '0')).join('');
  async function pbk(pass, salt) {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
    return hex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, k, 256)));
  }

  const MSG = {
    bad_credentials: 'Usuario o contraseña incorrectos', locked: 'Demasiados intentos. Espera 5 minutos e inténtalo otra vez',
    no_session: 'Tu sesión terminó. Entra de nuevo', forbidden: 'Solo el administrador puede hacer esto',
    username_taken: 'Ese usuario ya existe', bad_username: 'El usuario debe tener 3 a 30 letras, números, punto, guion o guion bajo (sin espacios)',
    bad_name: 'Escribe el nombre completo', weak_password: 'La contraseña es muy corta (mínimo 8 para la tuya, 6 para una inicial)',
    bad_items: 'Datos no válidos', cannot_delete_self: 'No puedes eliminar ni suspender tu propia cuenta', not_found: 'El usuario ya no existe', bad_location: 'Ubicación no válida',
    bad_comment: 'Escribe un comentario (máximo 1500 letras)',
    forbidden_admin: 'Solo el administrador principal puede eliminar administradores', cannot_delete_main: 'El administrador principal no se puede eliminar',
    bad_version: 'Escribe el nombre de la versión (por ejemplo 3.12)', bad_code: 'El número de versión debe ser un entero mayor que 0', bad_url: 'El enlace debe empezar con https://',
    network: 'No hay conexión con el servidor. Revisa tu internet', config: 'Falta configurar el servidor'
  };
  const errText = e => MSG[e && e.code] || (e && e.message) || 'Error desconocido';

  async function rpc(fn, args, ms) {
    if (!cfg.url || !cfg.key) { const e = new Error(MSG.config); e.code = 'config'; throw e; }
    const h = { 'Content-Type': 'application/json', apikey: cfg.key };
    if (/^eyJ/.test(cfg.key)) h.Authorization = 'Bearer ' + cfg.key;
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), ms || 15000);
    let res;
    try { res = await fetch(cfg.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: h, body: JSON.stringify(args || {}), signal: ctl.signal }); }
    catch (e) { clearTimeout(tm); const er = new Error(MSG.network); er.code = 'network'; throw er; }
    clearTimeout(tm);
    const txt = await res.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { }
    if (!res.ok) {
      const code = j && (j.message || j.hint) ? String(j.message).trim() : 'http_' + res.status;
      const er = new Error(MSG[code] || (j && j.message) || 'Error ' + res.status); er.code = code;
      if (code === 'no_session' && ses) { ses = null; wr(K_SES, null); if (api.onExpired) api.onExpired(); }
      throw er;
    }
    return j;
  }
  const tk = () => (ses ? ses.token : '');
  async function remember(u, p) {
    try {
      if (!crypto.subtle || !ses) return; const salt = crypto.getRandomValues(new Uint8Array(16));
      wr(K_OFF, { u: String(u).trim().toLowerCase(), salt: hex(salt), hash: await pbk(p, salt), token: ses.token, user: ses.user });
    } catch (e) { }
  }

  // App Android: se le pasa la sesión del técnico para que pueda avisarle de nuevas asignaciones (también con la app cerrada)
  function native() { try { const B = g.AndroidBridge; if (B && B.setAuth && ses && ses.user) B.setAuth(cfg.url, cfg.key, ses.token, ses.user.id, ses.user.role); } catch (e) { } }

  const api = {
    onExpired: null, errText,
    configured: () => !!(cfg.url && cfg.key),
    config: () => ({ url: cfg.url, key: cfg.key }),
    setConfig(url, key) { cfg = { url: normUrl(url), key: String(key || '').trim() }; wr(K_CFG, cfg); },
    clearConfig() { cfg = { url: normUrl((g.CAJAS_CLOUD || {}).url), key: String((g.CAJAS_CLOUD || {}).key || '').trim() }; wr(K_CFG, null); },
    session: () => ses,
    user: () => (ses ? ses.user : null),
    async login(u, p) {
      const r = await rpc('cj_login', { p_user: u, p_pass: p });
      if (r && r.error) { const e = new Error(MSG[r.error] || r.error); e.code = r.error; throw e; }
      ses = { token: r.token, user: r.user, boot: BOOT }; wr(K_SES, ses); await remember(u, p); native(); return ses;
    },
    // Acceso sin internet: se compara con el último acceso correcto en este dispositivo
    async loginOffline(u, p) {
      const o = rd(K_OFF); u = String(u || '').trim().toLowerCase();
      if (!o || o.u !== u || !crypto.subtle) { const e = new Error('Sin conexión. Para entrar sin internet, tu usuario debe haber iniciado sesión antes en este dispositivo'); e.code = 'network'; throw e; }
      const salt = Uint8Array.from(o.salt.match(/../g).map(h => parseInt(h, 16)));
      if ((await pbk(p, salt)) !== o.hash) { const e = new Error(MSG.bad_credentials); e.code = 'bad_credentials'; throw e; }
      ses = { token: o.token, user: o.user, boot: BOOT }; wr(K_SES, ses); native(); return ses;
    },
    remember,
    async me() { const u = await rpc('cj_me', { p_token: tk() }); if (ses) { ses.user = u; wr(K_SES, ses); } return u; },
    async logout() { const t = tk(); try { if (g.AndroidBridge && g.AndroidBridge.clearAuth) g.AndroidBridge.clearAuth(); } catch (e) { } ses = null; wr(K_SES, null); wr(K_OFF, null); if (t) { try { await rpc('cj_logout', { p_token: t }, 6000); } catch (e) { } } },
    async changePassword(o, n) { await rpc('cj_change_password', { p_token: tk(), p_old: o, p_new: n }); if (ses) { ses.user.must_change = false; wr(K_SES, ses); await remember(ses.user.username, n); } },
    commentsList: u => rpc('cj_comments_list', { p_token: tk(), p_eval_u: u }),
    commentAdd: (u, body) => rpc('cj_comment_add', { p_token: tk(), p_eval_u: u, p_body: body }),
    commentDelete: id => rpc('cj_comment_delete', { p_token: tk(), p_id: id }),
    // Comprueba la contraseña de la sesión actual (con internet en el servidor; sin internet contra la copia segura del dispositivo)
    async verifyPassword(p) {
      try { await rpc('cj_verify_password', { p_token: tk(), p_pass: p }, 12000); return true; }
      catch (e) {
        if (e.code !== 'network') { if (e.code === 'bad_credentials') return false; throw e; }
        const o = rd(K_OFF); if (!o || !ses || o.u !== String(ses.user.username).toLowerCase() || !crypto.subtle) throw e;
        return (await pbk(p, Uint8Array.from(o.salt.match(/../g).map(h => parseInt(h, 16))))) === o.hash;
      }
    },
    listUsers: () => rpc('cj_list_users', { p_token: tk() }),
    createUser: (username, name, code, role, pass) => rpc('cj_create_user', { p_token: tk(), p_username: username, p_name: name, p_code: code || '', p_role: role, p_pass: pass }),
    deleteUser: id => rpc('cj_delete_user', { p_token: tk(), p_id: id }),
    resetPassword: (id, pass) => rpc('cj_reset_password', { p_token: tk(), p_id: id, p_new: pass }),
    setActive: (id, on) => rpc('cj_set_active', { p_token: tk(), p_id: id, p_active: !!on }),
    sendLocation: (lat, lon, acc, speed) => rpc('cj_send_location', { p_token: tk(), p_lat: lat, p_lon: lon, p_acc: acc == null ? null : acc, p_speed: speed == null || !isFinite(speed) ? null : speed }, 10000),
    locations: () => rpc('cj_locations', { p_token: tk() }),
    releaseGet: () => rpc('cj_release_get', { p_token: tk() }),
    releasePublish: (version, code, url, notes, mandatory) => rpc('cj_release_publish', { p_token: tk(), p_version: version, p_code: code, p_url: url, p_notes: notes || '', p_mandatory: !!mandatory }),
    uploadLog: (name, boxes, areas, routes) => rpc('cj_upload_log', { p_token: tk(), p_name: name, p_boxes: boxes | 0, p_areas: areas | 0, p_routes: routes | 0 }),
    uploadsList: () => rpc('cj_uploads_list', { p_token: tk() }),
    pull: (ts, u, limit) => rpc('cj_pull', { p_token: tk(), p_ts: ts, p_u: u, p_limit: limit || 200 }, 40000),
    push: items => rpc('cj_push', { p_token: tk(), p_items: items }, 60000)
  };
  g.Cloud = api;
  if (ses) native();
})(window);
