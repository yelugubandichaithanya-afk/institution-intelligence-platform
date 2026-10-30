/* Formatting + evidence (source / date / verification) helpers */
const STATUS = {
  verified:   { label: 'Verified',          icon: '✅', cls: 'st-verified',   desc: 'Cross-checked against an official / university source' },
  govt:       { label: 'Government data',   icon: '🏛️', cls: 'st-govt',       desc: 'Published by a government or regulatory body' },
  self:       { label: 'Self-reported',     icon: '⚠️', cls: 'st-self',       desc: 'Submitted by the institution; not independently verified' },
  unverified: { label: 'Conflicting',       icon: '❌', cls: 'st-unverified', desc: 'Conflicts with another source' },
  internal:   { label: 'Internal',          icon: '🔒', cls: 'st-internal',   desc: 'From our own team (visit, management discussion, financials)' },
};

const LEGAL_TYPES = {
  complaint:         { label: 'Complaint',         sev: 1, desc: 'Allegation lodged with an authority. No finding of fault.' },
  civil_dispute:     { label: 'Civil dispute',     sev: 1, desc: 'Dispute between parties over money, property or contract. Not criminal.' },
  fir:               { label: 'FIR',               sev: 2, desc: 'First Information Report registered by police. Start of investigation, not a finding of guilt.' },
  charge:            { label: 'Charge-sheet',      sev: 3, desc: 'Police have filed a charge-sheet. The court has not decided guilt.' },
  prosecution:       { label: 'Prosecution',       sev: 3, desc: 'Criminal trial in progress. Presumed innocent until decided.' },
  conviction:        { label: 'Conviction',        sev: 4, desc: 'Court has found the person guilty.' },
  acquittal:         { label: 'Acquittal',         sev: 0, desc: 'Court has found the person not guilty.' },
  regulatory_action: { label: 'Regulatory action', sev: 2, desc: 'Notice, penalty or order by a regulator (UGC, AICTE, PCI, etc.).' },
};

const Fmt = {
  num: (n) => (n == null ? '—' : Number(n).toLocaleString('en-IN')),
  pct: (n, d = 0) => (n == null || isNaN(n) ? '—' : `${Number(n).toFixed(d)}%`),
  lakh: (n) => (n == null ? '—' : `₹${Number(n).toFixed(2).replace(/\.?0+$/, '')}L`),
  crore: (n) => (n == null ? '—' : `₹${Number(n).toFixed(1)} Cr`),
  date: (s) => {
    if (!s) return '—';
    const d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  },
  rank: (r) => (r == null ? 'Not ranked' : typeof r === 'number' ? `#${r}` : `Band ${r}`),
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/*
 * Evidence log — every value rendered through ev() is recorded so the
 * Source & Verification section can list all of them.
 */
const Evidence = {
  log: [],
  reset() { this.log = []; },
};

/** Render a value with its source tooltip + status dot. */
function ev(e, fmt = Fmt.num, label = '') {
  if (!e) return '<span class="muted">Not available</span>';
  const s = STATUS[e.st] || STATUS.self;
  const text = fmt(e.v);
  if (label) Evidence.log.push({ label, value: text, ...e });
  return `<span class="ev" tabindex="0">${esc(text)}<i class="ev-dot ${s.cls}" aria-label="${s.label}"></i>` +
    `<span class="ev-tip" role="tooltip"><b>${s.icon} ${s.label}</b><br>Source: ${esc(e.src)}<br>Date: ${Fmt.date(e.date)}</span></span>`;
}

function statusBadge(st) {
  const s = STATUS[st] || STATUS.self;
  return `<span class="badge ${s.cls}">${s.icon} ${s.label}</span>`;
}

function trendArrow(dir) {
  return { up: '<span class="trend up">↗</span>', down: '<span class="trend down">↘</span>', flat: '<span class="trend flat">→</span>' }[dir];
}

/** Compound annual growth rate between first and last value. */
function cagr(first, last, periods) {
  if (!first || !last || periods <= 0) return null;
  return (Math.pow(last / first, 1 / periods) - 1) * 100;
}

/* Colleges picked for comparison (max 4), remembered across pages. */
const CompareStore = {
  KEY: 'iip_compare',
  MAX: 4,
  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch { return []; }
  },
  set(ids) {
    try { localStorage.setItem(this.KEY, JSON.stringify(ids.slice(0, this.MAX))); } catch { /* storage blocked */ }
  },
  toggle(id) {
    const ids = this.get();
    const i = ids.indexOf(id);
    if (i >= 0) ids.splice(i, 1);
    else if (ids.length < this.MAX) ids.push(id);
    this.set(ids);
    return ids;
  },
};

function directionOf(pctChange, threshold = 2) {
  if (pctChange == null) return 'flat';
  if (pctChange > threshold) return 'up';
  if (pctChange < -threshold) return 'down';
  return 'flat';
}
