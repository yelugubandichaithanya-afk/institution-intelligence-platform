/*
 * Risk & red-flag engine. Rule-based and transparent — no single score.
 * Each flag: { level: 'critical'|'attention'|'ok', title, detail, section }
 * (These rules move to the Flask backend later; keep them in one place.)
 */
const RULES = {
  admissionVarianceCritical: 15, // % claimed vs university-verified
  admissionVarianceAttention: 8,
  lowUtilisation: 60,
  placementGap: 10,              // pts claimed vs verified
  placementDrop: 5,              // pts year-on-year
  facultyAttrition: 15,
  maxStudentFacultyRatio: 20,
  minCollection: 85,
  hostelFull: 95,
  highOpportunityHeadroom: 25,   // % available capacity
};

const Metrics = {
  compute(inst) {
    const adm = inst.admissions;
    const first = adm[0], last = adm[adm.length - 1];
    const util = adm.map((a) => a.verified ? (a.verified.v / a.intake.v) * 100 : null);
    const variance = last.verified ? last.claimed.v - last.verified.v : null;
    const variancePct = last.verified ? (variance / last.claimed.v) * 100 : null;
    const admCagr = first.verified && last.verified ? cagr(first.verified.v, last.verified.v, adm.length - 1) : null;

    const pl = inst.placements;
    const plPct = pl.map((p) => p.placed ? (p.placed.v / p.eligible.v) * 100 : null);
    const lastPl = plPct[plPct.length - 1];
    const prevPl = plPct[plPct.length - 2];
    const lastClaim = pl[pl.length - 1].claimedPct.v;

    const c = inst.campus;
    const fsr = c.students.v / c.faculty.v;
    const hostelPct = (c.hostelOccupancy.v / c.hostelCapacity.v) * 100;

    const cap = inst.commercial.capacity.v;
    const available = cap - c.students.v;
    const availablePct = (available / cap) * 100;
    const newAdm = last.verified ? last.verified.v : last.claimed.v;
    const grossRevenueCr = (newAdm * inst.commercial.avgFee.v) / 100; // lakh → crore
    const naac = inst.regulatory.find((r) => r.naac);

    return {
      util, lastUtil: util[util.length - 1], avgUtil: avg(util), variance, variancePct, admCagr,
      admDir: directionOf(admCagr),
      plPct, lastPl, prevPl, lastClaim, plVerified: lastPl != null,
      plDir: lastPl != null && prevPl != null ? directionOf(lastPl - prevPl, 1) : 'flat',
      fsr, hostelPct, cap, available, availablePct, newAdm, grossRevenueCr, naac,
      potentialAdm: [Math.round(available * 0.3 / 10) * 10, Math.round(available * 0.42 / 10) * 10],
    };
  },
};

function avg(arr) {
  const v = arr.filter((x) => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

const Risk = {
  evaluate(inst) {
    const m = Metrics.compute(inst);
    const flags = [];
    const add = (level, title, detail, section) => flags.push({ level, title, detail, section });

    // --- Regulatory
    const issues = inst.regulatory.filter((r) => r.state === 'issue');
    issues.forEach((r) => add('critical', r.affiliation ? 'Affiliation issue' : `Recognition issue — ${r.body}`,
      `${r.item}: ${r.value.v}`, 'rankings'));
    inst.regulatory.filter((r) => r.state === 'expired').forEach((r) =>
      add('attention', `${r.body} accreditation lapsed`, `${r.item} — validity ended ${Fmt.date(r.validUntil)}`, 'rankings'));
    if (!issues.length) add('ok', 'Recognition & affiliation verified', 'All statutory approvals current', 'rankings');
    if (m.naac && m.naac.state === 'ok') add('ok', 'Accreditation valid', `NAAC ${m.naac.value.v} until ${Fmt.date(m.naac.validUntil)}`, 'rankings');

    // --- Admissions
    if (m.variancePct != null) {
      const last = inst.admissions.at(-1);
      const msg = `College claims ${Fmt.num(last.claimed.v)}, university portal shows ${Fmt.num(last.verified.v)} (${Fmt.pct(m.variancePct, 1)} gap)`;
      if (m.variancePct > RULES.admissionVarianceCritical) add('critical', 'Significant admission data discrepancy', msg, 'admissions');
      else if (m.variancePct > RULES.admissionVarianceAttention) add('attention', 'Admission claims exceed verified numbers', msg, 'admissions');
    }
    if (m.admCagr != null && m.admCagr < -2) add('attention', 'Falling admissions', `5-year verified admissions CAGR ${Fmt.pct(m.admCagr, 1)}`, 'admissions');
    else if (m.admCagr != null) add('ok', 'Stable / growing admissions', `5-year verified admissions CAGR ${Fmt.pct(m.admCagr, 1)}`, 'admissions');
    if (m.lastUtil != null && m.lastUtil < RULES.lowUtilisation) add('attention', 'Low capacity utilisation', `Only ${Fmt.pct(m.lastUtil)} of approved intake filled`, 'admissions');

    // --- Placements
    if (!m.plVerified) {
      add('attention', 'Placement data requires verification', `Only self-reported figures available (${m.lastClaim}% claimed)`, 'placements');
    } else {
      if (m.lastClaim - m.lastPl > RULES.placementGap)
        add('attention', 'Placement claim exceeds verified data', `Claimed ${m.lastClaim}% vs verified ${Fmt.pct(m.lastPl)}`, 'placements');
      if (m.prevPl - m.lastPl > RULES.placementDrop || isDeclining(m.plPct))
        add('attention', 'Falling placement', `Verified placement trend: ${m.plPct.map((p) => Fmt.pct(p)).join(' → ')}`, 'placements');
      else add('ok', 'Stable placement', `Latest verified placement ${Fmt.pct(m.lastPl)}`, 'placements');
    }

    // --- Campus
    const c = inst.campus;
    if (c.facultyAttrition.v > RULES.facultyAttrition) add('attention', 'High faculty attrition', `${c.facultyAttrition.v}% annual attrition`, 'campus');
    if (m.fsr > RULES.maxStudentFacultyRatio) add('attention', 'Faculty shortfall', `Student:faculty ratio 1:${m.fsr.toFixed(1)}`, 'campus');
    if (m.hostelPct > RULES.hostelFull) add('attention', 'Infrastructure gap — hostel', `Hostel ${Fmt.pct(m.hostelPct)} occupied`, 'campus');
    if (m.fsr <= 15 && c.passPct.v >= 80) add('ok', 'Strong academic infrastructure', `1:${m.fsr.toFixed(1)} ratio, ${c.passPct.v}% pass`, 'campus');

    // --- Commercial
    if (inst.commercial.collectionEfficiency.v < RULES.minCollection)
      add('attention', 'Fee collection issues', `Collection efficiency ${inst.commercial.collectionEfficiency.v}%`, 'commercial');

    // --- Promoter / legal
    const openLegal = inst.promoter.legal.filter((l) => !/disposed|settled|acquitted|closed/i.test(l.status));
    openLegal.filter((l) => l.material).forEach((l) =>
      add('critical', l.type === 'regulatory_action' ? 'Major regulatory action' : 'Material litigation',
        `${LEGAL_TYPES[l.type].label}: ${l.title} (${l.status})`, 'promoter'));
    if (openLegal.some((l) => !l.material))
      add('attention', 'Promoter litigation requires review', `${openLegal.filter((l) => !l.material).length} open non-material matter(s)`, 'promoter');

    const counts = { critical: 0, attention: 0, ok: 0 };
    flags.forEach((f) => counts[f.level]++);
    const overall = counts.critical ? { key: 'red', label: 'High Risk', icon: '🔴' }
      : counts.attention ? { key: 'amber', label: 'Review', icon: '🟡' }
      : { key: 'green', label: 'Low Risk', icon: '🟢' };

    return { flags, counts, overall, metrics: m, opportunity: this.opportunity(m, counts) };
  },

  /** Partnership opportunity — defined, visible business criteria. */
  opportunity(m, counts) {
    const criteria = [
      { text: 'No critical red flags', pass: counts.critical === 0 },
      { text: `Available capacity ≥ ${RULES.highOpportunityHeadroom}%`, pass: m.availablePct >= RULES.highOpportunityHeadroom },
      { text: '5-year verified admissions not declining', pass: m.admCagr != null && m.admCagr >= 0 },
    ];
    const level = !criteria[0].pass ? 'Low' : criteria.every((c) => c.pass) ? 'High' : 'Medium';
    return { level, criteria };
  },
};

function isDeclining(arr) {
  const v = arr.filter((x) => x != null).slice(-3);
  return v.length === 3 && v[0] > v[1] && v[1] > v[2];
}
