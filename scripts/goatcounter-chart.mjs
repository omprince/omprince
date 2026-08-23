#!/usr/bin/env node
// Fetches daily page-view totals from GoatCounter and renders a dark
// "analytics card" SVG (line + gradient area chart) for the README.
//
// Required env vars:
//   GOATCOUNTER_CODE   - your GoatCounter site code (the part before .goatcounter.com)
//   GOATCOUNTER_TOKEN  - API bearer token (Settings -> API, needs "stats: read")
//
// Usage:
//   node scripts/goatcounter-chart.mjs [outputPath] [--days=14]
//   node scripts/goatcounter-chart.mjs --mock [outputPath]   (sample data, no API call)

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const useMock = args.includes("--mock");
const daysArg = args.find((a) => a.startsWith("--days="));
const days = daysArg ? Number(daysArg.split("=")[1]) : 14;
const outPath = args.find((a) => !a.startsWith("--")) ?? "dist/pageviews.svg";

function mockSeries(n) {
  const out = [];
  let v = 18;
  for (let i = 0; i < n; i++) {
    v = Math.max(2, Math.round(v + (Math.random() - 0.45) * 10));
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (n - 1 - i));
    out.push({ day: d.toISOString().slice(0, 10), count: v });
  }
  return out;
}

async function fetchSeries(code, token, days) {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const url = new URL(`https://${code}.goatcounter.com/api/v0/stats/total`);
  url.searchParams.set("start", start.toISOString());
  url.searchParams.set("end", end.toISOString());

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`GoatCounter API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return (data.stats ?? []).map((s) => ({ day: s.day, count: s.daily ?? 0 }));
}

function buildSvg(series) {
  const width = 800;
  const height = 260;
  const padL = 46;
  const padR = 24;
  const padT = 64;
  const padB = 36;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const counts = series.map((s) => s.count);
  const total = counts.reduce((a, b) => a + b, 0);
  const peak = Math.max(...counts, 1);
  const avg = Math.round(total / (counts.length || 1));
  const maxY = Math.max(peak * 1.15, 5);

  const n = series.length;
  const x = (i) => padL + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  const y = (v) => padT + chartH - (v / maxY) * chartH;

  const points = series.map((s, i) => [x(i), y(s.count)]);

  // Smooth line via simple cubic bezier between points
  const linePath = points.reduce((acc, [px, py], i) => {
    if (i === 0) return `M ${px.toFixed(1)} ${py.toFixed(1)}`;
    const [px0, py0] = points[i - 1];
    const cx = (px0 + px) / 2;
    return `${acc} C ${cx.toFixed(1)} ${py0.toFixed(1)}, ${cx.toFixed(1)} ${py.toFixed(1)}, ${px.toFixed(1)} ${py.toFixed(1)}`;
  }, "");

  const areaPath = `${linePath} L ${x(n - 1).toFixed(1)} ${(padT + chartH).toFixed(1)} L ${x(0).toFixed(1)} ${(padT + chartH).toFixed(1)} Z`;

  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => {
    const gy = padT + chartH - f * chartH;
    return `<line x1="${padL}" y1="${gy.toFixed(1)}" x2="${width - padR}" y2="${gy.toFixed(1)}" stroke="#21262d" stroke-width="1"/>`;
  }).join("");

  const labelEvery = Math.max(1, Math.ceil(n / 7));
  const xLabels = series.map((s, i) => {
    if (i % labelEvery !== 0 && i !== n - 1) return "";
    const d = new Date(s.day + "T00:00:00Z");
    const label = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
    return `<text x="${x(i).toFixed(1)}" y="${height - 12}" font-size="11" fill="#7d8590" text-anchor="middle" font-family="Consolas, 'Fira Code', monospace">${label}</text>`;
  }).join("");

  const dots = points.map(([px, py], i) => {
    const isLast = i === n - 1;
    return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${isLast ? 4 : 2.5}" fill="${isLast ? "#22d3ee" : "#818cf8"}" ${isLast ? 'stroke="#0d1117" stroke-width="2"' : ""}/>`;
  }).join("");

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, Consolas, 'Fira Code', monospace">
  <defs>
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
    <clipPath id="card"><rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="14"/></clipPath>
  </defs>

  <g clip-path="url(#card)">
    <rect width="${width}" height="${height}" fill="#0d1117"/>
    <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="14" fill="none" stroke="#30363d"/>

    <text x="24" y="34" font-size="13" letter-spacing="2" fill="#7d8590" font-weight="600">PAGE VIEWS</text>
    <text x="24" y="58" font-size="26" fill="#e6edf3" font-weight="700">${total.toLocaleString()}</text>
    <text x="${width - 24}" y="30" font-size="11" fill="#7d8590" text-anchor="end">last ${n} days</text>
    <text x="${width - 24}" y="46" font-size="11" fill="#7d8590" text-anchor="end">peak <tspan fill="#22d3ee" font-weight="600">${peak}</tspan> &#183; avg <tspan fill="#818cf8" font-weight="600">${avg}</tspan></text>

    ${gridLines}
    <path d="${areaPath}" fill="url(#area)"/>
    <path d="${linePath}" fill="none" stroke="url(#stroke)" stroke-width="2.5" stroke-linecap="round"/>
    ${dots}
    ${xLabels}
  </g>
</svg>`;
}

async function main() {
  let series;
  if (useMock) {
    series = mockSeries(days);
  } else {
    const code = process.env.GOATCOUNTER_CODE;
    const token = process.env.GOATCOUNTER_TOKEN;
    if (!code || !token) {
      throw new Error("Set GOATCOUNTER_CODE and GOATCOUNTER_TOKEN env vars (or pass --mock to preview).");
    }
    series = await fetchSeries(code, token, days);
  }

  const svg = buildSvg(series);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, svg, "utf8");
  console.log(`Wrote ${outPath} (${series.length} days, total ${series.reduce((a, b) => a + b.count, 0)} views)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
