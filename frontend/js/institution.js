/* Institution profile page — renders all modules from one institution object. */
(() => {
  const root = document.getElementById('profile');
  const COLORS = ['var(--c1)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c2)', 'var(--c6)'];

  const kpi = (label, value, sub = '') =>
    `<div class="kpi"><div class="k-label">${label}</div><div class="k-value">${value}</div>${sub ? `<div class="k-sub">${sub}</div>` : ''}</div>`;
  const regIcon = (r) => ({ ok: '✅', issue: '❌', expired: '⚠️', na: '—' }[r.state]);
  const ceoTrend = (dir) => ({ up: '↗ Growing', down: '↘ Declining', flat: '→ Stable' }[dir]);

  // ------------------------------------------------------------------ Header
  function header(inst, r) {
    return `<div class="profile-head">
      <div>
        <div class="breadcrumb"><a href="index.html">Search</a> › ${esc(inst.state)} › ${esc(inst.city)}</div>
        <h1>${esc(inst.name)}</h1>
        <div class="meta">
          <span>${esc(inst.city)}, ${esc(inst.state)}</span><span>AISHE ${esc(inst.aishe)}</span>
          <span>${esc(inst.university)}</span><span>Est. ${inst.established}</span><span>${esc(inst.website)}</span>
        </div>
      </div>
      <div style="text-align:right">
        <span class="pill ${r.overall.key}" style="font-size:14px;padding:6px 14px">${r.overall.icon} Overall: ${r.overall.label}</span>
        <div class="small muted" style="margin-top:10px">${r.counts.critical} critical · ${r.counts.attention} attention · ${r.counts.ok} verified</div>
        <div class="no-print" style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap">
          <button type="button" class="btn-ghost" id="cmpBtn"></button>
          <a class="btn-ghost" id="cmpGo" href="compare.html">Open compare</a>
        </div>
      </div>
    </div>`;
  }

  // ------------------------------------------------------------------ 9. Executive view
  function executive(inst, r) {
    const m = r.metrics;
    const last = inst.admissions.at(-1);
    const nirfLatest = Object.entries(inst.nirf).map(([cat, rows]) => [cat, rows.at(-1).rank.v]).find(([, v]) => v != null);
    const keyRisks = [...r.flags.filter((f) => f.level === 'critical'), ...r.flags.filter((f) => f.level === 'attention'), ...r.flags.filter((f) => f.level === 'ok')].slice(0, 5);
    const regOverall = inst.regulatory.some((x) => x.state === 'issue') ? '❌ Issue' : inst.regulatory.some((x) => x.state === 'expired') ? '⚠️ Lapsed item' : '✅ Clear';
    const oppCls = { High: 'green', Medium: 'amber', Low: 'red' }[r.opportunity.level];

    return `<section class="card" id="executive">
      <h2>Executive view</h2>
      <p class="sub">One-screen view. Hover any value with a coloured dot to see its source, date and verification status.</p>
      <div class="exec-grid">
        <div class="panel"><h4>Executive snapshot</h4>
          <table class="kv">
            <tr><td>Ownership</td><td>${esc(inst.ownership)}</td></tr>
            <tr><td>Affiliated university</td><td>${esc(inst.university)}</td></tr>
            <tr><td>Current intake</td><td>${ev(last.intake)}</td></tr>
            <tr><td>Current admissions (verified)</td><td>${ev(last.verified)}</td></tr>
            <tr><td>Capacity utilisation</td><td>${Fmt.pct(m.lastUtil)} ${trendArrow(m.admDir)}</td></tr>
            <tr><td>Placement</td><td>${m.plVerified ? ev(inst.placements.at(-1).placed, () => Fmt.pct(m.lastPl)) : ev(inst.placements.at(-1).claimedPct, (v) => `${v}%`)}</td></tr>
            <tr><td>NIRF</td><td>${nirfLatest ? `${Fmt.rank(nirfLatest[1])} (${nirfLatest[0]})` : 'Not ranked'}</td></tr>
            <tr><td>Campus status</td><td>${esc(inst.campusStatus)}</td></tr>
          </table>
        </div>
        <div class="panel"><h4>Business snapshot</h4>
          <table class="kv">
            <tr><td>Capacity</td><td>${ev(inst.commercial.capacity)}</td></tr>
            <tr><td>Current students</td><td>${ev(inst.campus.students)}</td></tr>
            <tr><td>Last-year new admissions</td><td>${ev(last.verified)}</td></tr>
            <tr><td>5-year admission trend</td><td>${trendArrow(m.admDir)} ${Fmt.pct(m.admCagr, 1)} CAGR</td></tr>
            <tr><td>Average fee</td><td>${ev(inst.commercial.avgFee, Fmt.lakh)}</td></tr>
            <tr><td>Available capacity</td><td>${Fmt.num(m.available)} (${Fmt.pct(m.availablePct)})</td></tr>
            <tr><td>Potential new admissions</td><td>${Fmt.num(m.potentialAdm[0])}–${Fmt.num(m.potentialAdm[1])}</td></tr>
            <tr><td>Partnership opportunity</td><td><span class="pill ${oppCls}">${r.opportunity.level}</span></td></tr>
          </table>
        </div>
        <div class="panel"><h4>Regulatory</h4>
          <div class="reg-strip">${inst.regulatory.filter((x) => x.state !== 'na' || x.body === 'Autonomy').map((x) =>
            `<span class="pill ${x.state === 'ok' ? 'green' : x.state === 'issue' ? 'red' : x.state === 'expired' ? 'amber' : 'grey'}">${regIcon(x)} ${esc(x.body)}${x.naac ? ' ' + esc(x.value.v.split(' ')[0]) : ''}</span>`).join('')}</div>
          <h4 style="margin-top:18px">Key risks</h4>
          <ul class="risk-list">${keyRisks.map((f) =>
            `<li class="flag ${f.level}">${{ critical: '🔴', attention: '🟠', ok: '🟢' }[f.level]} ${esc(f.title)}</li>`).join('')}</ul>
        </div>
      </div>
      <div class="ceo">
        <div><span>Admissions</span><b>${ceoTrend(m.admDir)}</b></div>
        <div><span>Placements</span><b>${m.plVerified ? ceoTrend(m.plDir) : '⚠️ Unverified'}</b></div>
        <div><span>Infrastructure</span><b>${m.hostelPct > 95 || m.fsr > 20 ? '⚠️ Gaps' : '✅ Adequate'}</b></div>
        <div><span>Regulatory</span><b>${regOverall}</b></div>
        <div><span>Commercial</span><b>${r.counts.critical ? 'Not recommended' : 'Requires diligence'}</b></div>
      </div>
    </section>`;
  }

  // ------------------------------------------------------------------ 1. Admissions
  function admissions(inst, r) {
    const m = r.metrics, adm = inst.admissions, last = adm.at(-1);
    const verdict = m.variancePct > 15 ? ['red', '🔴 Significant discrepancy'] : m.variancePct > 8 ? ['amber', '🟠 Requires validation'] : ['green', '🟢 Within tolerance'];
    const active = inst.courses.filter((c) => c.status !== 'discontinued');
    const maxIntake = Math.max(...active.map((c) => c.intake));

    return `<section class="card" id="admissions">
      <h2>Admissions. Five years.</h2>
      <p class="sub">Approved intake vs university-verified admissions. College-claimed figures are shown separately and never mixed with verified data.</p>
      <div class="grid-4">
        ${kpi('5-yr avg utilisation', Fmt.pct(m.avgUtil))}
        ${kpi('Latest utilisation', `${Fmt.pct(m.lastUtil)} ${trendArrow(m.admDir)}`)}
        ${kpi('Admissions CAGR', Fmt.pct(m.admCagr, 1), `${Fmt.num(adm[0].verified?.v)} → ${Fmt.num(last.verified?.v)}`)}
        ${kpi('Utilisation trend', `<span style="font-size:15px">${m.util.map((u) => Fmt.pct(u)).join(' → ')}</span>`)}
      </div>

      <h3>University portal verification — ${esc(last.year)}</h3>
      <div class="variance">
        <div><div class="k-label">College claims</div><div class="k-value">${ev(last.claimed, Fmt.num, `Admissions ${last.year} — college claim`)}</div></div>
        <div><div class="k-label">University portal verified</div><div class="k-value">${ev(last.verified, Fmt.num, `Admissions ${last.year} — university verified`)}</div></div>
        <div><div class="k-label">Variance</div><div class="k-value">${Fmt.num(m.variance)} / ${Fmt.pct(m.variancePct, 1)}</div></div>
        <div class="verdict"><span class="pill ${verdict[0]}" style="font-size:13px">${verdict[1]}</span></div>
      </div>

      <div class="grid-2" style="margin-top:8px">
        <div><h3>Intake vs verified admissions</h3>
          ${Charts.bars({
            labels: adm.map((a) => a.year),
            series: [
              { name: 'Approved intake', values: adm.map((a) => a.intake.v), color: 'var(--c2)' },
              { name: 'University-verified', values: adm.map((a) => a.verified?.v), color: 'var(--c1)' },
            ],
            line: { name: 'Utilisation %', values: m.util, color: 'var(--c4)' },
          })}
        </div>
        <div><h3>Year-wise detail</h3>
          <div class="table-wrap"><table class="data">
            <thead><tr><th>Year</th><th class="r">Approved intake</th><th class="r">College claim</th><th class="r">Univ. verified</th><th class="r">Utilisation</th><th class="r">Gap</th></tr></thead>
            <tbody>${adm.slice().reverse().map((a) => {
              const gap = a.verified ? ((a.claimed.v - a.verified.v) / a.claimed.v) * 100 : null;
              return `<tr><td>${a.year}</td>
                <td class="r">${ev(a.intake, Fmt.num, `Approved intake ${a.year}`)}</td>
                <td class="r">${ev(a.claimed, Fmt.num, `College-claimed admissions ${a.year}`)}</td>
                <td class="r">${ev(a.verified, Fmt.num, `Verified admissions ${a.year}`)}</td>
                <td class="r">${a.verified ? Fmt.pct((a.verified.v / a.intake.v) * 100) : '—'}</td>
                <td class="r" style="color:${gap > 15 ? 'var(--red)' : gap > 8 ? 'var(--amber)' : 'inherit'}">${Fmt.pct(gap, 1)}</td></tr>`;
            }).join('')}</tbody>
          </table></div>
        </div>
      </div>

      <h3>Course-wise intake vs admission (${esc(last.year)}) ${statusBadge(inst.coursesSource.st)}</h3>
      ${Charts.hbars(inst.courses.map((c) => ({
        label: c.name,
        tag: c.status === 'new' ? `<span class="tag new">New ${esc(c.since)}</span>` : c.status === 'discontinued' ? `<span class="tag disc">Discontinued ${esc(c.since)}</span>` : '',
        value: c.admitted, max: maxIntake,
        cls: c.intake && c.admitted / c.intake < 0.5 ? 'bad' : c.intake && c.admitted / c.intake < 0.75 ? 'warn' : '',
        note: c.status === 'discontinued' ? '—' : `${c.admitted} / ${c.intake}`,
      })))}
      <p class="small muted" style="margin-top:10px">Bar length = admitted students; label = admitted / approved intake. Amber &lt; 75% fill, red &lt; 50% fill.</p>
    </section>`;
  }

  // ------------------------------------------------------------------ 2. Placements
  function placements(inst, r) {
    const m = r.metrics, pl = inst.placements, rec = inst.recruiters, lastP = pl.at(-1);
    const gap = m.plVerified ? m.lastClaim - m.lastPl : null;

    return `<section class="card" id="placements">
      <h2>Placements.</h2>
      <p class="sub">Verified placement (NIRF / AISHE submissions) compared against claims on the college website.</p>

      <div class="variance">
        <div><div class="k-label">Placement claim</div><div class="k-value">${ev(lastP.claimedPct, (v) => `${v}%`, `Placement claim ${lastP.year}`)}</div></div>
        <div><div class="k-label">AISHE / NIRF disclosure</div><div class="k-value">${m.plVerified ? ev(lastP.placed, () => Fmt.pct(m.lastPl), `Verified placement ${lastP.year}`) : '<span class="muted">No verified data</span>'}</div></div>
        <div><div class="k-label">Gap</div><div class="k-value">${gap == null ? '—' : `${gap.toFixed(0)} pts`}</div></div>
        <div class="verdict"><span class="pill ${!m.plVerified || gap > 10 ? 'amber' : 'green'}" style="font-size:13px">${!m.plVerified || gap > 10 ? '⚠️ Requires validation' : '✅ Consistent'}</span></div>
      </div>

      <div class="grid-2" style="margin-top:8px">
        <div><h3>Placement % — claimed vs verified</h3>
          ${Charts.lines({ labels: pl.map((p) => p.year), series: [
            { name: 'Verified %', values: m.plPct, color: 'var(--c1)' },
            { name: 'College claim %', values: pl.map((p) => p.claimedPct.v), color: 'var(--c4)', dashed: true },
          ] })}
        </div>
        <div><h3>Year-wise detail</h3>
          <div class="table-wrap"><table class="data">
            <thead><tr><th>Batch</th><th class="r">Eligible</th><th class="r">Placed</th><th class="r">Placed %</th><th class="r">Highest</th><th class="r">Average</th><th class="r">Median</th></tr></thead>
            <tbody>${pl.slice().reverse().map((p, i, arr) => `<tr><td>${p.year}</td>
              <td class="r">${ev(p.eligible, Fmt.num, `Eligible students ${p.year}`)}</td>
              <td class="r">${p.placed ? ev(p.placed, Fmt.num, `Students placed ${p.year}`) : '—'}</td>
              <td class="r">${Fmt.pct(m.plPct[arr.length - 1 - i])}</td>
              <td class="r">${ev(p.highest, Fmt.lakh, `Highest package ${p.year}`)}</td>
              <td class="r">${ev(p.average, Fmt.lakh, `Average package ${p.year}`)}</td>
              <td class="r">${ev(p.median, Fmt.lakh)}</td></tr>`).join('')}</tbody>
          </table></div>
        </div>
      </div>

      <h3>Employer intelligence</h3>
      <div class="grid-4">
        ${kpi('Recruiters', ev(rec.total, Fmt.num, 'Total recruiters'))}
        ${kpi('Repeat recruiters', ev(rec.repeat, Fmt.num, 'Repeat recruiters'), `${Fmt.pct((rec.repeat.v / rec.total.v) * 100)} of total`)}
        ${kpi('New recruiters', ev(rec.newCount, Fmt.num, 'New recruiters'))}
        ${kpi('International placements', ev(rec.international, Fmt.num, 'International placements'))}
      </div>
      <div class="grid-3" style="margin-top:16px">
        <div class="panel"><h4>Sector split</h4>${Charts.donut(rec.sectors, COLORS)}</div>
        <div class="panel"><h4>Placement location</h4>${Charts.hbars(Object.entries(rec.locations).map(([k, v]) => ({ label: k, value: v, max: 100, note: `${v}%` })))}</div>
        <div class="panel"><h4>Top recruiters</h4><div class="tags">${rec.top.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
          <h4 style="margin-top:14px">Internship companies</h4><div class="tags">${rec.internships.map((t) => `<span>${esc(t)}</span>`).join('')}</div></div>
      </div>
      <p class="small muted" style="margin-top:12px">Batch size vs placed: ${Fmt.num(lastP.eligible.v)} eligible, ${lastP.placed ? Fmt.num(lastP.placed.v) + ' placed (verified)' : 'placed count not independently verified'}.</p>
    </section>`;
  }

  // ------------------------------------------------------------------ 3. Rankings & accreditation
  function rankings(inst) {
    const years = Object.values(inst.nirf)[0].map((r) => r.year);
    return `<section class="card" id="rankings">
      <h2>Rankings &amp; accreditation.</h2>
      <p class="sub">NIRF timeline across applicable categories, plus current statutory approvals and accreditation validity.</p>
      <h3>NIRF timeline</h3>
      <div class="table-wrap"><div class="timeline">
        <div class="tl-head tl-cat">Category</div>${years.map((y) => `<div class="tl-head">${y}</div>`).join('')}
        ${Object.entries(inst.nirf).map(([cat, rows]) => `<div class="tl-cat">${esc(cat)}</div>` +
          rows.map((row) => `<div class="${row.rank.v == null ? 'nr' : 'rk'}">${row.rank.v == null ? 'Not ranked' : ev(row.rank, Fmt.rank, `NIRF ${cat} ${row.year}`)}</div>`).join('')).join('')}
      </div></div>

      <h3>Recognition, approval & accreditation</h3>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>Body</th><th>Item</th><th>Status</th><th>Valid until</th><th>Source</th><th></th></tr></thead>
        <tbody>${inst.regulatory.map((x) => `<tr>
          <td><b>${esc(x.body)}</b></td><td>${esc(x.item)}</td>
          <td>${ev(x.value, (v) => v, `${x.body} — ${x.item}`)}</td>
          <td>${x.validUntil ? Fmt.date(x.validUntil) : '—'}</td>
          <td>${statusBadge(x.value.st)}</td>
          <td>${regIcon(x)}</td></tr>`).join('')}</tbody>
      </table></div>
    </section>`;
  }

  // ------------------------------------------------------------------ 4. Promoter
  function promoter(inst) {
    const p = inst.promoter;
    const legalLegend = ['complaint', 'civil_dispute', 'fir', 'regulatory_action', 'charge', 'prosecution', 'conviction', 'acquittal']
      .map((k) => `<div><b>${LEGAL_TYPES[k].label}</b>${LEGAL_TYPES[k].desc}</div>`).join('');
    const list = (arr) => arr.length ? `<ul style="margin:0;padding-left:18px">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<span class="muted">None on record</span>';

    return `<section class="card" id="promoter">
      <h2>Owner &amp; promoter.</h2>
      <p class="sub">Separate due-diligence section — not mixed into the institution's performance metrics.</p>
      <div class="grid-3">
        <div class="panel"><h4>Trust / Society</h4>
          <table class="kv">
            <tr><td>Entity</td><td>${esc(p.trust)}</td></tr>
            <tr><td>Type</td><td>${esc(p.entityType)}</td></tr>
            <tr><td>Established</td><td>${p.trustEstablished}</td></tr>
            <tr><td>Registration</td><td>${ev(p.registration, (v) => v, 'Trust registration')}</td></tr>
            <tr><td>Insolvency</td><td>${ev(p.insolvency, (v) => v, 'Insolvency check')}</td></tr>
          </table>
        </div>
        <div class="panel"><h4>Promoters</h4><div class="people">${p.promoters.map((x) => `<div><b>${esc(x.name)}</b><span>${esc(x.role)}</span></div>`).join('')}</div>
          <h4 style="margin-top:14px">Key management</h4><div class="people">${p.keyManagement.map((x) => `<div>${esc(x.name)}<span>${esc(x.role)}</span></div>`).join('')}</div></div>
        <div class="panel"><h4>Board members</h4>${list(p.board)}</div>
      </div>
      <div class="grid-3" style="margin-top:16px">
        <div class="panel"><h4>Other educational institutions</h4>${list(p.otherInstitutions)}</div>
        <div class="panel"><h4>Other businesses / associated companies</h4>${list(p.otherBusinesses)}</div>
        <div class="panel"><h4>Previous institutions</h4>${list(p.previousInstitutions)}</div>
      </div>

      <h3>Litigation, regulatory actions & public records</h3>
      <div class="callout" style="margin-bottom:12px">These categories are <b>not equivalent</b>. A complaint or FIR is an allegation, not a finding. Only a conviction is a court finding of guilt. Each record is labelled with its exact legal stage.</div>
      <div class="legal-legend">${legalLegend}</div>
      ${p.legal.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Type</th><th>Matter</th><th>Party</th><th>Forum</th><th>Year</th><th>Current status</th><th>Source</th></tr></thead>
        <tbody>${p.legal.map((l) => `<tr>
          <td><span class="ltype sev${LEGAL_TYPES[l.type].sev}">${LEGAL_TYPES[l.type].label}</span></td>
          <td>${esc(l.title)}${l.material ? ' <span class="tag disc">Material</span>' : ''}</td>
          <td>${esc(l.party)}</td><td>${esc(l.forum)}</td><td>${l.year}</td><td>${esc(l.status)}</td>
          <td class="small">${esc(l.src)}<br><span class="muted">${Fmt.date(l.date)}</span></td></tr>`).join('')}</tbody>
      </table></div>` : '<div class="empty">✅ No litigation, regulatory actions or court records found in searched public sources.</div>'}
    </section>`;
  }

  // ------------------------------------------------------------------ 5. Campus health
  function campus(inst, r) {
    const c = inst.campus, m = r.metrics;
    return `<section class="card" id="campus">
      <h2>Campus health.</h2>
      <p class="sub">Academic outcomes and infrastructure. Baseline from AISHE; infrastructure confirmed during campus visit where noted.</p>
      <h3>Academic</h3>
      <div class="grid-4">
        ${kpi('Student strength', ev(c.students, Fmt.num, 'Student strength'))}
        ${kpi('Faculty strength', ev(c.faculty, Fmt.num, 'Faculty strength'), `Ratio 1:${m.fsr.toFixed(1)}`)}
        ${kpi('Faculty attrition', ev(c.facultyAttrition, Fmt.pct, 'Faculty attrition'))}
        ${kpi('Attendance', ev(c.attendance, Fmt.pct, 'Attendance'))}
        ${kpi('Pass percentage', ev(c.passPct, Fmt.pct, 'Pass percentage'))}
        ${kpi('Students with backlogs', ev(c.backlogs, Fmt.pct, 'Backlogs'))}
        ${kpi('Dropout rate', ev(c.dropouts, (v) => Fmt.pct(v, 1), 'Dropout rate'))}
        ${kpi('Graduation rate', ev(c.graduationRate, Fmt.pct, 'Graduation rate'), `Higher studies: ${c.higherStudies.v}%`)}
      </div>
      <h3>Infrastructure</h3>
      <div class="grid-4">
        ${kpi('Land', ev(c.land, (v) => `${v} acres`, 'Land'))}
        ${kpi('Built-up area', ev(c.builtUp, (v) => `${Fmt.num(v)} sq ft`, 'Built-up area'))}
        ${kpi('Classrooms', ev(c.classrooms, Fmt.num, 'Classrooms'))}
        ${kpi('Labs', ev(c.labs, Fmt.num, 'Labs'))}
        ${kpi('Library volumes', ev(c.library, Fmt.num, 'Library volumes'))}
        ${kpi('Hostel occupancy', `${ev(c.hostelOccupancy, Fmt.num, 'Hostel occupancy')} / ${ev(c.hostelCapacity, Fmt.num, 'Hostel capacity')}`, `${Fmt.pct(m.hostelPct)} occupied`)}
        ${kpi('Transport', ev(c.buses, (v) => `${v} buses`, 'Transport fleet'))}
        ${kpi('Campus utilisation', Fmt.pct((c.students.v / inst.commercial.capacity.v) * 100), 'Students ÷ sanctioned capacity')}
      </div>
      <p class="small muted" style="margin-top:12px">Sports: ${esc(c.sports)}</p>
    </section>`;
  }

  // ------------------------------------------------------------------ 6. Commercial
  function commercial(inst, r) {
    const cm = inst.commercial, m = r.metrics, c = inst.campus;
    const revPerStudent = cm.avgFee.v * (1 - cm.scholarshipPct.v / 100 * 0.5) * (1 - cm.discountPct.v / 100);
    const oppCls = { High: 'green', Medium: 'amber', Low: 'red' }[r.opportunity.level];
    return `<section class="card" id="commercial">
      <h2>Commercial potential.</h2>
      <p class="sub">Revenue potential and growth headroom for partnership decisions.</p>
      <div class="grid-2">
        <div class="panel"><h4>Partnership opportunity</h4>
          <table class="kv">
            <tr><td>Addressable students</td><td>${ev(c.students)}</td></tr>
            <tr><td>Annual new admissions</td><td>${Fmt.num(m.newAdm)}</td></tr>
            <tr><td>Average fee</td><td>${ev(cm.avgFee, Fmt.lakh, 'Average fee')}</td></tr>
            <tr><td>Potential gross revenue (new admissions × avg fee)</td><td>${Fmt.crore(m.grossRevenueCr)}</td></tr>
            <tr><td>Current occupancy</td><td>${Fmt.pct(100 - m.availablePct)}</td></tr>
            <tr><td>Capacity available</td><td>${Fmt.pct(m.availablePct)} (${Fmt.num(m.available)} seats)</td></tr>
            <tr><td>5-year admission CAGR</td><td>${Fmt.pct(m.admCagr, 1)} ${trendArrow(m.admDir)}</td></tr>
          </table>
        </div>
        <div class="panel"><h4>Opportunity rating: <span class="pill ${oppCls}">${r.opportunity.level}</span></h4>
          <p class="small muted" style="margin:0 0 10px">Based on defined business criteria (not an automated score):</p>
          <ul class="criteria">${r.opportunity.criteria.map((x) => `<li>${x.pass ? '✅' : '❌'} ${esc(x.text)}</li>`).join('')}</ul>
          <p class="small muted" style="margin:10px 0 0">High = all criteria met · Medium = no critical flags but other criteria missed · Low = any critical flag.</p>
        </div>
      </div>
      <h3>Revenue quality</h3>
      <div class="grid-4">
        ${kpi('Collection efficiency', ev(cm.collectionEfficiency, Fmt.pct, 'Collection efficiency'))}
        ${kpi('Outstanding fees', ev(cm.outstanding, Fmt.crore, 'Outstanding fees'))}
        ${kpi('Scholarship %', ev(cm.scholarshipPct, Fmt.pct, 'Scholarship %'))}
        ${kpi('Discount %', ev(cm.discountPct, Fmt.pct, 'Discount %'))}
        ${kpi('Refunds (last FY)', ev(cm.refunds, Fmt.crore, 'Refunds'))}
        ${kpi('Est. revenue / student', Fmt.lakh(revPerStudent), 'After discounts & ~50% scholarship offset')}
        ${kpi('Total capacity', ev(cm.capacity, Fmt.num, 'Sanctioned capacity'))}
        ${kpi('Potential new admissions', `${Fmt.num(m.potentialAdm[0])}–${Fmt.num(m.potentialAdm[1])}`, '30–42% of available seats')}
      </div>
      <h3>Course-wise fee</h3>
      <div class="table-wrap"><table class="data" style="max-width:520px">
        <thead><tr><th>Course</th><th class="r">Annual fee</th></tr></thead>
        <tbody>${cm.courseFees.map((f) => `<tr><td>${esc(f.course)}</td><td class="r">${Fmt.lakh(f.fee)}</td></tr>`).join('')}</tbody>
      </table></div>
      <h3>Internal intelligence</h3>
      <div class="callout"><b>Campus visit ${Fmt.date(inst.internal.visitDate)}</b> · ${esc(inst.internal.visitedBy)}<br>${esc(inst.internal.notes)}<br><br><b>Partnership history:</b> ${esc(inst.internal.partnershipHistory)}</div>
    </section>`;
  }

  // ------------------------------------------------------------------ 7. Risk centre
  function riskCentre(r) {
    const col = (level, title) => {
      const items = r.flags.filter((f) => f.level === level);
      return `<div class="risk-col"><h4>${title} <span class="pill ${level === 'critical' ? 'red' : level === 'attention' ? 'amber' : 'green'}">${items.length}</span></h4>
        ${items.length ? items.map((f) => `<div class="flag ${level}"><b>${esc(f.title)}</b><p>${esc(f.detail)}</p><a href="#${f.section}">View evidence →</a></div>`).join('')
          : '<p class="muted small">None</p>'}</div>`;
    };
    return `<section class="card" id="risk">
      <h2>Risk &amp; red flags.</h2>
      <p class="sub">Rule-based indicators with their underlying evidence. No single automated score — leadership makes the commercial call.</p>
      <div class="risk-cols">${col('critical', '🔴 Critical')}${col('attention', '🟠 Attention')}${col('ok', '🟢 Verified')}</div>
    </section>`;
  }

  // ------------------------------------------------------------------ 8. Sources
  function sources() {
    const rows = Evidence.log;
    const counts = rows.reduce((a, e) => ((a[e.st] = (a[e.st] || 0) + 1), a), {});
    return `<section class="card" id="sources">
      <h2>Sources &amp; verification.</h2>
      <p class="sub">Every number on this profile with its source, date and verification status (${rows.length} data points).</p>
      <div class="grid-4" style="grid-template-columns:repeat(5,1fr)">${Object.entries(STATUS).map(([k, s]) =>
        kpi(`${s.icon} ${s.label}`, counts[k] || 0, s.desc)).join('')}</div>
      <div class="filter-row" style="margin-top:16px" id="srcFilter">
        <button class="chip active" data-st="all">All</button>${Object.entries(STATUS).map(([k, s]) => `<button class="chip" data-st="${k}">${s.label}</button>`).join('')}
      </div>
      <div class="table-wrap"><table class="data" id="srcTable">
        <thead><tr><th>Data point</th><th class="r">Value</th><th>Source</th><th>Date</th><th>Status</th></tr></thead>
        <tbody>${rows.map((e) => `<tr data-st="${e.st}"><td>${esc(e.label)}</td><td class="r num">${esc(e.value)}</td><td>${esc(e.src)}</td><td>${Fmt.date(e.date)}</td><td>${statusBadge(e.st)}</td></tr>`).join('')}</tbody>
      </table></div>
    </section>`;
  }

  // ------------------------------------------------------------------ Render
  function bindSourceFilter() {
    document.getElementById('srcFilter').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      document.querySelectorAll('#srcFilter .chip').forEach((c) => c.classList.toggle('active', c === chip));
      document.querySelectorAll('#srcTable tbody tr').forEach((tr) => {
        tr.hidden = chip.dataset.st !== 'all' && tr.dataset.st !== chip.dataset.st;
      });
    });
  }

  function bindScrollSpy() {
    const links = [...document.querySelectorAll('.sidenav a[href^="#"]')];
    const obs = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${en.target.id}`));
    }), { rootMargin: '-30% 0px -60% 0px' });
    document.querySelectorAll('main section.card').forEach((s) => obs.observe(s));
  }

  function bindCompare(inst) {
    const btn = document.getElementById('cmpBtn');
    const go = document.getElementById('cmpGo');
    const paint = () => {
      const ids = CompareStore.get();
      const inList = ids.includes(inst.id);
      btn.textContent = inList ? '✓ In compare list' : '＋ Add to compare';
      btn.disabled = !inList && ids.length >= CompareStore.MAX;
      go.href = `compare.html?ids=${ids.map(encodeURIComponent).join(',')}`;
      go.hidden = ids.length < 2;
    };
    btn.addEventListener('click', () => { CompareStore.toggle(inst.id); paint(); });
    paint();
  }

  async function init() {
    if (!Auth.requireLogin()) return;
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { location.href = 'index.html'; return; }
    try {
      const inst = await API.getInstitution(id);
      const r = Risk.evaluate(inst);
      document.title = `${inst.shortName} · Institution Intelligence`;
      Evidence.reset();
      // Detailed sections first so the evidence log is complete before Sources renders.
      const body = [admissions(inst, r), placements(inst, r), rankings(inst), promoter(inst), campus(inst, r), commercial(inst, r), riskCentre(r)].join('');
      const hero = document.getElementById('profileHero');
      hero.innerHTML = header(inst, r);
      hero.hidden = false;
      document.getElementById('subnavTitle').textContent = inst.shortName;
      root.innerHTML = executive(inst, r) + body + sources();
      const crit = document.getElementById('critCount');
      if (r.counts.critical) { crit.textContent = r.counts.critical; crit.hidden = false; }
      bindSourceFilter();
      bindScrollSpy();
      bindCompare(inst);
      if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
    } catch (err) {
      root.innerHTML = `<div class="empty">${esc(err.message)}. <a href="index.html">Back to search</a></div>`;
    }
  }

  init();
})();
