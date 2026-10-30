/* Session handling: login / refresh / logout via the Flask API. */
const Auth = (() => {
  const KEY = 'iip_session';
  const base = () => window.IIP_CONFIG.API_BASE;

  function session() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
  }
  function save(s) {
    try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch { /* storage blocked */ }
  }

  async function post(path, body, token) {
    let res;
    try {
      res = await fetch(base() + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body || {}),
      });
    } catch {
      throw new Error('Cannot reach the server. Is the backend running?');
    }
    const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  async function login(email, password) {
    const r = await post('/auth/login', { email, password });
    if (!r.ok) throw new Error(r.data.error || 'Sign in failed.');
    save(r.data.session);
    return r.data.session.user;
  }

  let refreshing = null;
  function refresh() {
    // Share one in-flight refresh between parallel requests.
    refreshing = refreshing || (async () => {
      const s = session();
      if (!s?.refresh_token) return null;
      const r = await post('/auth/refresh', { refresh_token: s.refresh_token }).catch(() => null);
      if (!r || !r.ok) { save(null); return null; }
      save(r.data.session);
      return r.data.session;
    })().finally(() => { refreshing = null; });
    return refreshing;
  }

  async function logout() {
    const s = session();
    save(null);
    if (s) await post('/auth/logout', {}, s.access_token).catch(() => {});
    location.href = 'index.html';
  }

  function currentPage() {
    return location.pathname.split('/').pop() + location.search + location.hash;
  }

  function redirectToLogin() {
    save(null);
    location.replace(`login.html?next=${encodeURIComponent(currentPage())}`);
  }

  /** Only allow redirects to our own pages. */
  function safeNext(next) {
    return next && /^[\w-]+\.html([?#].*)?$/.test(next) ? next : 'search.html';
  }

  function renderUserMenu() {
    const el = document.getElementById('userMenu');
    const u = session()?.user;
    if (!el || !u) return;
    const name = u.full_name || u.email;
    el.innerHTML = `<span class="avatar">${esc(name.trim()[0].toUpperCase())}</span>
      <span class="user-name">${esc(name)}</span>
      <button type="button" class="link-btn" id="logoutBtn">Sign out</button>`;
    document.getElementById('logoutBtn').addEventListener('click', logout);
  }

  /** Call at the top of every protected page. */
  function requireLogin() {
    if (!session()) { redirectToLogin(); return false; }
    renderUserMenu();
    return true;
  }

  return { session, login, refresh, logout, requireLogin, redirectToLogin, safeNext };
})();
