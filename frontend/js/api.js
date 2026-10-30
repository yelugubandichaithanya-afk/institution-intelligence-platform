/* Data access layer — every call goes to the Flask API with the user's token. */
const API = (() => {
  const base = () => window.IIP_CONFIG.API_BASE;

  async function send(path, token) {
    try {
      return await fetch(base() + path, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      throw new Error('Cannot reach the server. Is the backend running?');
    }
  }

  async function get(path) {
    let s = Auth.session();
    if (s?.expires_at && s.expires_at * 1000 < Date.now() + 60_000) s = await Auth.refresh();
    if (!s) { Auth.redirectToLogin(); throw new Error('Please sign in.'); }

    let res = await send(path, s.access_token);
    if (res.status === 401) {
      s = await Auth.refresh();
      if (s) res = await send(path, s.access_token);
      if (!s || res.status === 401) { Auth.redirectToLogin(); throw new Error('Your session has expired.'); }
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  const qs = (o) => new URLSearchParams(o).toString();

  return {
    searchInstitutions: (q = '', field = 'all') => get(`/institutions?${qs({ q, field })}`),
    getInstitution: (id) => get(`/institutions/${encodeURIComponent(id)}`),
    compareInstitutions: (ids) => get(`/institutions/compare?${qs({ ids: ids.join(',') })}`),
  };
})();
