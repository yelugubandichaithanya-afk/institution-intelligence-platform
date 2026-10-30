/* Lightweight SVG charts — no libraries. */
const Charts = (() => {
  const W = 640, H = 260, P = { t: 20, r: 44, b: 34, l: 48 };
  const iw = W - P.l - P.r, ih = H - P.t - P.b;

  function niceMax(v) {
    const pow = Math.pow(10, Math.floor(Math.log10(v || 1)));
    return Math.ceil(v / pow) * pow;
  }

  function legend(items) {
    return `<div class="legend">${items.map((s) =>
      `<span><i style="background:${s.color}${s.dashed ? ';height:2px' : ''}"></i>${esc(s.name)}</span>`).join('')}</div>`;
  }

  function axes(labels, yMax, ticks, fmtY, x0, step) {
    let g = '';
    for (let i = 0; i <= ticks; i++) {
      const y = P.t + ih - (ih * i) / ticks;
      g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}" class="grid"/>` +
        `<text x="${P.l - 8}" y="${y + 4}" class="axis" text-anchor="end">${fmtY((yMax * i) / ticks)}</text>`;
    }
    labels.forEach((l, i) => {
      g += `<text x="${x0 + step * i}" y="${H - 10}" class="axis" text-anchor="middle">${esc(l)}</text>`;
    });
    return g;
  }

  /** Grouped bars + optional % line on a secondary axis. */
  function bars({ labels, series, line }) {
    const max = niceMax(Math.max(...series.flatMap((s) => s.values.filter((v) => v != null))));
    const step = iw / labels.length;
    const gw = step * 0.7, bw = gw / series.length;
    let svg = axes(labels, max, 4, (v) => Fmt.num(Math.round(v)), P.l + step / 2, step);

    series.forEach((s, si) => s.values.forEach((v, i) => {
      if (v == null) return;
      const h = (v / max) * ih;
      const x = P.l + step * i + (step - gw) / 2 + bw * si;
      svg += `<rect x="${x + 2}" y="${P.t + ih - h}" width="${bw - 4}" height="${h}" rx="3" style="fill:${s.color}">` +
        `<title>${esc(s.name)} ${labels[i]}: ${Fmt.num(v)}</title></rect>`;
    }));

    if (line) {
      const pts = line.values.map((v, i) => v == null ? null : [P.l + step * i + step / 2, P.t + ih - (v / 100) * ih]);
      svg += `<polyline points="${pts.filter(Boolean).map((p) => p.join(',')).join(' ')}" class="line" style="stroke:${line.color}"/>`;
      pts.forEach((p, i) => p && (svg += `<circle cx="${p[0]}" cy="${p[1]}" r="4" style="fill:${line.color}"/>` +
        `<text x="${p[0]}" y="${p[1] - 9}" class="pt-label" text-anchor="middle">${Fmt.pct(line.values[i])}</text>`));
      for (let i = 0; i <= 4; i++) {
        const y = P.t + ih - (ih * i) / 4;
        svg += `<text x="${W - P.r + 8}" y="${y + 4}" class="axis">${25 * i}%</text>`;
      }
    }
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">${svg}</svg>` +
      legend([...series, ...(line ? [{ ...line, dashed: true }] : [])]);
  }

  /** Multi-series line chart, y axis 0–100 (%). */
  function lines({ labels, series, yMax = 100, showValues = true }) {
    const step = iw / (labels.length - 1 || 1);
    let svg = axes(labels, yMax, 4, (v) => `${Math.round(v)}%`, P.l, step);
    series.forEach((s) => {
      const pts = s.values.map((v, i) => v == null ? null : [P.l + step * i, P.t + ih - (v / yMax) * ih]);
      const valid = pts.filter(Boolean);
      if (!valid.length) return;
      svg += `<polyline points="${valid.map((p) => p.join(',')).join(' ')}" class="line${s.dashed ? ' dashed' : ''}" style="stroke:${s.color}"/>`;
      pts.forEach((p, i) => p && (svg += `<circle cx="${p[0]}" cy="${p[1]}" r="4" style="fill:${s.color}"><title>${esc(s.name)} ${labels[i]}: ${Fmt.pct(s.values[i])}</title></circle>` +
        (showValues ? `<text x="${p[0]}" y="${p[1] - 9}" class="pt-label" text-anchor="middle">${Fmt.pct(s.values[i])}</text>` : '')));
    });
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">${svg}</svg>` + legend(series);
  }

  /** Donut for a {label: percent} split. */
  function donut(split, colors) {
    const entries = Object.entries(split);
    const total = entries.reduce((a, [, v]) => a + v, 0);
    const r = 60, c = 2 * Math.PI * r;
    let offset = 0, arcs = '';
    entries.forEach(([k, v], i) => {
      const len = (v / total) * c;
      arcs += `<circle r="${r}" cx="80" cy="80" fill="none" stroke-width="26" style="stroke:${colors[i % colors.length]}"
        stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 80 80)"><title>${esc(k)}: ${v}%</title></circle>`;
      offset += len;
    });
    return `<div class="donut-wrap"><svg viewBox="0 0 160 160" class="donut">${arcs}</svg>
      <ul class="donut-legend">${entries.map(([k, v], i) =>
        `<li><i style="background:${colors[i % colors.length]}"></i>${esc(k)}<b>${v}%</b></li>`).join('')}</ul></div>`;
  }

  /** Horizontal bars, HTML-only. items: [{label, value, max, note, cls}] */
  function hbars(items, fmt = Fmt.num) {
    return `<div class="hbars">${items.map((it) => {
      const w = it.max ? Math.min(100, (it.value / it.max) * 100) : 0;
      return `<div class="hbar"><span class="hbar-label">${esc(it.label)}${it.tag || ''}</span>
        <span class="hbar-track"><span class="hbar-fill ${it.cls || ''}" style="width:${w}%"></span></span>
        <span class="hbar-val">${it.note ?? fmt(it.value)}</span></div>`;
    }).join('')}</div>`;
  }

  /** Mini sparkline. */
  function spark(values, color = 'var(--accent)') {
    const v = values.filter((x) => x != null);
    if (v.length < 2) return '';
    const min = Math.min(...v), max = Math.max(...v), w = 90, h = 26;
    const pts = v.map((x, i) => `${(i / (v.length - 1)) * w},${h - 3 - ((x - min) / (max - min || 1)) * (h - 6)}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" class="spark"><polyline points="${pts}" style="stroke:${color}"/></svg>`;
  }

  return { bars, lines, donut, hbars, spark };
})();
