/* Home page: search, suggestions, result cards, compare selection */
(() => {
  if (!Auth.requireLogin()) return;

  const $ = (id) => document.getElementById(id);
  const input = $('q'), suggest = $('suggest'), results = $('results'), tray = $('compareTray');
  let field = 'all', hl = -1, timer, lastResults = [];
  const names = {}; // id -> short name, for the compare tray

  const profileUrl = (i) => `institution.html?id=${encodeURIComponent(i.id)}`;

  function card(inst) {
    const r = Risk.evaluate(inst);
    const m = r.metrics;
    const naac = m.naac ? m.naac.value.v.split(' ')[0] : '—';
    const picked = CompareStore.get().includes(inst.id);
    names[inst.id] = inst.shortName;
    return `<article class="inst-card">
      <div class="card-top">
        <div><h3><a class="card-link" href="${profileUrl(inst)}">${esc(inst.name)}</a></h3>
          <div class="meta">${esc(inst.city)}, ${esc(inst.state)} · Est. ${inst.established} · ${esc(inst.category)}<br>
          ${esc(inst.university)} · AISHE ${esc(inst.aishe)}</div></div>
        <span class="pill ${r.overall.key}">${r.overall.icon} ${r.overall.label}</span>
      </div>
      <div class="stats">
        <div>Utilisation<b>${Fmt.pct(m.lastUtil)} ${trendArrow(m.admDir)}</b></div>
        <div>Placement<b>${m.plVerified ? Fmt.pct(m.lastPl) : `${m.lastClaim}%*`}</b></div>
        <div>NAAC<b>${esc(naac)}</b></div>
      </div>
      <label class="cmp-toggle"><input type="checkbox" data-id="${esc(inst.id)}" ${picked ? 'checked' : ''}> Compare</label>
    </article>`;
  }

  function renderTray() {
    const ids = CompareStore.get();
    tray.hidden = !ids.length;
    tray.innerHTML = `<span><b>Compare</b> ${ids.length}/${CompareStore.MAX}</span>
      <span class="tray-items">${ids.map((id) => `<span class="pill grey">${esc(names[id] || id)}</span>`).join('')}</span>
      <button type="button" class="link-btn" id="trayClear">Clear</button>
      <a class="btn ${ids.length < 2 ? 'disabled' : ''}" href="${ids.length < 2 ? '#' : `compare.html?ids=${ids.map(encodeURIComponent).join(',')}`}"
        ${ids.length < 2 ? 'aria-disabled="true" title="Select at least 2"' : ''}>Compare →</a>`;
    // Cap selection at MAX
    const full = ids.length >= CompareStore.MAX;
    results.querySelectorAll('.cmp-toggle input').forEach((cb) => { cb.disabled = full && !cb.checked; });
  }

  async function run(q = input.value) {
    results.innerHTML = '<div class="loading">Searching…</div>';
    try {
      lastResults = await API.searchInstitutions(q, field);
    } catch (err) {
      results.innerHTML = `<div class="empty" style="grid-column:1/-1">⚠️ ${esc(err.message)}</div>`;
      return;
    }
    $('resultsTitle').textContent = q ? `Results for “${q}”` : 'All institutions';
    $('resultsCount').textContent = `${lastResults.length} institution${lastResults.length === 1 ? '' : 's'}`;
    results.innerHTML = lastResults.length ? lastResults.map(card).join('')
      : `<div class="empty" style="grid-column:1/-1">No institutions match “${esc(q)}”. Try a city, AISHE code (e.g. C-90231) or promoter name.</div>`;
    renderTray();
  }

  async function showSuggestions() {
    const q = input.value.trim();
    if (q.length < 2) { suggest.style.display = 'none'; return; }
    let list;
    try { list = (await API.searchInstitutions(q, field)).slice(0, 6); } catch { return; }
    hl = -1;
    if (!list.length || input.value.trim() !== q) { suggest.style.display = 'none'; return; }
    suggest.innerHTML = list.map((i) =>
      `<a href="${profileUrl(i)}">${esc(i.name)}<span>${esc(i.aishe)} · ${esc(i.city)}</span></a>`).join('');
    suggest.style.display = 'block';
  }

  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(showSuggestions, 250); });
  input.addEventListener('keydown', (e) => {
    const items = [...suggest.querySelectorAll('a')];
    if (!items.length || suggest.style.display === 'none') return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      hl = (hl + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((a, i) => a.classList.toggle('hl', i === hl));
    } else if (e.key === 'Enter' && hl >= 0) {
      e.preventDefault();
      location.href = items[hl].href;
    } else if (e.key === 'Escape') suggest.style.display = 'none';
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search-panel')) suggest.style.display = 'none'; });

  $('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    suggest.style.display = 'none';
    history.replaceState(null, '', input.value ? `?q=${encodeURIComponent(input.value)}` : location.pathname);
    run();
  });

  $('fieldChips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#fieldChips .chip').forEach((c) => c.classList.toggle('active', c === chip));
    field = chip.dataset.field;
    run();
  });

  results.addEventListener('change', (e) => {
    if (!e.target.matches('.cmp-toggle input')) return;
    CompareStore.toggle(e.target.dataset.id);
    renderTray();
  });

  tray.addEventListener('click', (e) => {
    if (e.target.id === 'trayClear') {
      CompareStore.set([]);
      results.querySelectorAll('.cmp-toggle input').forEach((cb) => { cb.checked = false; });
      renderTray();
    } else if (e.target.closest('a.disabled')) e.preventDefault();
  });

  const initial = new URLSearchParams(location.search).get('q') || '';
  input.value = initial;
  run(initial);
})();
