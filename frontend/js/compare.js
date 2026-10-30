/* Compare 2–4 institutions side by side. */
(() => {
  if (!Auth.requireLogin()) return;

  const COLORS = ['var(--c1)', 'var(--c4)', 'var(--c3)', 'var(--c5)'];
  const root = document.getElementById('compare');
  const picked = document.getElementById('picked');
  const select = document.getElementById('addSelect');

  let all = [];   // [{id, name, shortName}] for the picker
  let ids = [];

  const fromUrl = (new URLSearchParams(location.search).get('ids') || '').split(',').filter(Boolean);
  ids = (fromUrl.length ? fromUrl : CompareStore.get()).slice(0, CompareStore.MAX);

  const latestNirf = (inst) => {
    for (const [cat, rows] of Object.entries(inst.nirf)) {
      const v = rows.at(-1).rank.v;
      if (v != null) return `${Fmt.rank(v)} <span class="muted small">${esc(cat)}</span>`;
    }
    return '<span class="muted">Not ranked</span>';
  };
  const regSummary = (inst) => inst.regulatory.some((x) => x.state === 'issue') ? '<span class="pill red">❌ Issue</span>'
    : inst.regulatory.some((x) => x.state === 'expired') ? '<span class="pill amber">⚠️ Lapsed item</span>' : '<span class="pill green">✅ Clear</span>';
  const oppPill = (r) => `<span class="pill ${{ High: 'green', Medium: 'amber', Low: 'red' }[r.opportunity.level]}">${r.opportunity.level}</span>`;

  /*
   * Row spec:
   *   html(inst, r)       → cell HTML, or
   *   val(inst, r) + fmt  → numeric value (used for "best" highlighting)
   *   evd(inst, r)        → evidence object to render with source tooltip
   *   better: 'high' | 'low'
   */
  const ROWS = [
    { group: 'Overview' },
    { label: 'Category', html: (i) => esc(i.category) },
    { label: 'Location', html: (i) => `${esc(i.city)}, ${esc(i.state)}` },
    { label: 'Ownership', html: (i) => esc(i.ownership) },
    { label: 'Established', val: (i) => i.established, fmt: String },
    { label: 'Affiliated university', html: (i) => esc(i.university) },
    { label: 'NAAC', html: (i, r) => r.metrics.naac ? ev(r.metrics.naac.value, (v) => v.split(' ')[0]) : '—' },
    { label: 'NIRF (latest)', html: latestNirf },
    { label: 'Regulatory status', html: regSummary },

    { group: 'Admissions' },
    { label: 'Approved intake (latest)', evd: (i) => i.admissions.at(-1).intake, val: (i) => i.admissions.at(-1).intake.v, fmt: Fmt.num, better: 'high' },
    { label: 'University-verified admissions', evd: (i) => i.admissions.at(-1).verified, val: (i) => i.admissions.at(-1).verified?.v, fmt: Fmt.num, better: 'high' },
    { label: 'Capacity utilisation', val: (i, r) => r.metrics.lastUtil, fmt: Fmt.pct, better: 'high' },
    { label: '5-year avg utilisation', val: (i, r) => r.metrics.avgUtil, fmt: Fmt.pct, better: 'high' },
    { label: '5-year admissions CAGR', val: (i, r) => r.metrics.admCagr, fmt: (v) => `${Fmt.pct(v, 1)}`, better: 'high', trend: (i, r) => r.metrics.admDir },
    { label: 'Claimed vs verified gap', val: (i, r) => r.metrics.variancePct, fmt: (v) => Fmt.pct(v, 1), better: 'low' },

    { group: 'Placements' },
    { label: 'Verified placement %', val: (i, r) => r.metrics.plVerified ? r.metrics.lastPl : null, fmt: Fmt.pct, better: 'high', empty: '⚠️ Not verified' },
    { label: 'College-claimed %', evd: (i) => i.placements.at(-1).claimedPct, fmt: (v) => `${v}%` },
    { label: 'Claim vs verified gap', val: (i, r) => r.metrics.plVerified ? r.metrics.lastClaim - r.metrics.lastPl : null, fmt: (v) => `${v.toFixed(0)} pts`, better: 'low' },
    { label: 'Average package', evd: (i) => i.placements.at(-1).average, val: (i) => i.placements.at(-1).average.v, fmt: Fmt.lakh, better: 'high' },
    { label: 'Median package', evd: (i) => i.placements.at(-1).median, val: (i) => i.placements.at(-1).median.v, fmt: Fmt.lakh, better: 'high' },
    { label: 'Number of recruiters', evd: (i) => i.recruiters.total, val: (i) => i.recruiters.total.v, fmt: Fmt.num, better: 'high' },

    { group: 'Campus health' },
    { label: 'Student strength', evd: (i) => i.campus.students, val: (i) => i.campus.students.v, fmt: Fmt.num },
    { label: 'Student : faculty ratio', val: (i, r) => r.metrics.fsr, fmt: (v) => `1:${v.toFixed(1)}`, better: 'low' },
    { label: 'Pass percentage', evd: (i) => i.campus.passPct, val: (i) => i.campus.passPct.v, fmt: Fmt.pct, better: 'high' },
    { label: 'Dropout rate', evd: (i) => i.campus.dropouts, val: (i) => i.campus.dropouts.v, fmt: (v) => Fmt.pct(v, 1), better: 'low' },
    { label: 'Faculty attrition', evd: (i) => i.campus.facultyAttrition, val: (i) => i.campus.facultyAttrition.v, fmt: Fmt.pct, better: 'low' },
    { label: 'Hostel occupancy', val: (i, r) => r.metrics.hostelPct, fmt: Fmt.pct },

    { group: 'Commercial' },
    { label: 'Sanctioned capacity', evd: (i) => i.commercial.capacity, val: (i) => i.commercial.capacity.v, fmt: Fmt.num },
    { label: 'Available capacity', val: (i, r) => r.metrics.availablePct, fmt: (v, i, r) => `${Fmt.pct(v)} <span class="muted small">(${Fmt.num(r.metrics.available)} seats)</span>`, better: 'high' },
    { label: 'Average fee', evd: (i) => i.commercial.avgFee, val: (i) => i.commercial.avgFee.v, fmt: Fmt.lakh, better: 'high' },
    { label: 'Potential gross revenue', val: (i, r) => r.metrics.grossRevenueCr, fmt: Fmt.crore, better: 'high' },
    { label: 'Collection efficiency', evd: (i) => i.commercial.collectionEfficiency, val: (i) => i.commercial.collectionEfficiency.v, fmt: Fmt.pct, better: 'high' },
    { label: 'Partnership opportunity', html: (i, r) => oppPill(r) },

    { group: 'Risk' },
    { label: 'Overall', html: (i, r) => `<span class="pill ${r.overall.key}">${r.overall.icon} ${r.overall.label}</span>` },
    { label: '🔴 Critical flags', val: (i, r) => r.counts.critical, fmt: String, better: 'low' },
    { label: '🟠 Attention flags', val: (i, r) => r.counts.attention, fmt: String, better: 'low' },
    { label: 'Open legal / regulatory matters', val: (i) => i.promoter.legal.filter((l) => !/disposed|settled|acquitted|closed/i.test(l.status)).length, fmt: String, better: 'low' },
  ];

  function cell(row, inst, r, isBest) {
    const v = row.val ? row.val(inst, r) : undefined;
    let html;
    if (row.html) html = row.html(inst, r);
    else if (row.val && (v == null || Number.isNaN(v))) html = `<span class="muted">${row.empty || '—'}</span>`;
    else if (row.evd) html = ev(row.evd(inst, r), (x) => row.fmt(x, inst, r));
    else html = row.fmt(v, inst, r);
    if (row.trend) html += ` ${trendArrow(row.trend(inst, r))}`;
    return `<td class="${isBest ? 'best' : ''}">${html}</td>`;
  }

  function bestIndex(row, list) {
    if (!row.better || !row.val) return -1;
    const vals = list.map(({ inst, r }) => row.val(inst, r));
    const valid = vals.filter((v) => v != null && !Number.isNaN(v));
    if (valid.length < 2 || new Set(valid).size === 1) return -1;
    const target = row.better === 'high' ? Math.max(...valid) : Math.min(...valid);
    return vals.indexOf(target);
  }

  function table(list) {
    const head = `<tr><th class="row-label"></th>${list.map(({ inst, r }, n) => `<th>
      <div class="cmp-head"><i class="dot" style="background:${COLORS[n]}"></i>
        <a href="institution.html?id=${encodeURIComponent(inst.id)}">${esc(inst.name)}</a></div>
      <div class="small muted">${esc(inst.city)} · AISHE ${esc(inst.aishe)}</div></th>`).join('')}</tr>`;
    const body = ROWS.map((row) => {
      if (row.group) return `<tr class="group"><td colspan="${list.length + 1}">${row.group}</td></tr>`;
      const best = bestIndex(row, list);
      return `<tr><td class="row-label">${row.label}</td>${list.map(({ inst, r }, n) => cell(row, inst, r, n === best)).join('')}</tr>`;
    }).join('');
    return `<div class="card"><div class="table-wrap"><table class="data cmp-table"><thead>${head}</thead><tbody>${body}</tbody></table></div></div>`;
  }

  function charts(list) {
    const series = (fn) => list.map(({ inst, r }, n) => ({ name: inst.shortName, values: fn(inst, r), color: COLORS[n] }));
    return `<div class="grid-2">
      <div class="card"><h2>Capacity utilisation — 5 years</h2><p class="sub">University-verified admissions ÷ approved intake</p>
        ${Charts.lines({ labels: list[0].inst.admissions.map((a) => a.year), series: series((i, r) => r.metrics.util), showValues: list.length <= 2 })}</div>
      <div class="card"><h2>Verified placement % — 5 years</h2><p class="sub">Self-reported-only institutions are omitted</p>
        ${Charts.lines({ labels: list[0].inst.placements.map((p) => p.year), series: series((i, r) => r.metrics.plPct), showValues: list.length <= 2 })}</div>
    </div>`;
  }

  function flags(list) {
    return `<div class="card"><h2>⚠️ Key red flags</h2><p class="sub">Critical and attention items for each institution</p>
      <div class="cmp-flags" style="grid-template-columns:repeat(${list.length},1fr)">${list.map(({ inst, r }, n) => {
        const items = r.flags.filter((f) => f.level !== 'ok');
        return `<div><h4><i class="dot" style="background:${COLORS[n]}"></i>${esc(inst.shortName)}</h4>
          ${items.length ? items.map((f) => `<div class="flag ${f.level}"><b>${esc(f.title)}</b><p>${esc(f.detail)}</p></div>`).join('')
            : '<div class="flag ok"><b>No red flags</b></div>'}</div>`;
      }).join('')}</div></div>`;
  }

  function renderPicker() {
    picked.innerHTML = ids.length ? ids.map((id, n) => {
      const inst = all.find((x) => x.id === id);
      return `<span class="pick-chip"><i class="dot" style="background:${COLORS[n]}"></i>${esc(inst ? inst.name : id)}
        <button type="button" data-remove="${esc(id)}" aria-label="Remove">×</button></span>`;
    }).join('') : '<span class="muted">No institutions selected yet.</span>';

    const remaining = all.filter((x) => !ids.includes(x.id));
    const full = ids.length >= CompareStore.MAX;
    select.disabled = full || !remaining.length;
    select.innerHTML = `<option value="">${full ? `Maximum ${CompareStore.MAX} institutions` : '＋ Add institution…'}</option>` +
      remaining.map((x) => `<option value="${esc(x.id)}">${esc(x.name)} — ${esc(x.city)}</option>`).join('');
  }

  async function renderCompare() {
    if (ids.length < 2) {
      root.innerHTML = `<div class="empty">Select at least two institutions above to compare them side by side.</div>`;
      return;
    }
    root.innerHTML = '<div class="loading">Loading comparison…</div>';
    try {
      const profiles = await API.compareInstitutions(ids);
      Evidence.reset();
      const list = profiles.map((inst) => ({ inst, r: Risk.evaluate(inst) }));
      root.innerHTML = table(list) + charts(list) + flags(list);
    } catch (err) {
      root.innerHTML = `<div class="empty">⚠️ ${esc(err.message)}</div>`;
    }
  }

  function setIds(next) {
    ids = next.slice(0, CompareStore.MAX);
    CompareStore.set(ids);
    history.replaceState(null, '', ids.length ? `?ids=${ids.map(encodeURIComponent).join(',')}` : location.pathname);
    renderPicker();
    renderCompare();
  }

  picked.addEventListener('click', (e) => {
    const id = e.target.dataset.remove;
    if (id) setIds(ids.filter((x) => x !== id));
  });
  select.addEventListener('change', () => {
    if (select.value) setIds([...ids, select.value]);
  });

  (async () => {
    try {
      all = (await API.searchInstitutions('')).map(({ id, name, shortName, city }) => ({ id, name, shortName, city }));
    } catch (err) {
      root.innerHTML = `<div class="empty">⚠️ ${esc(err.message)}</div>`;
      return;
    }
    ids = ids.filter((id) => all.some((x) => x.id === id));
    setIds(ids);
  })();
})();
