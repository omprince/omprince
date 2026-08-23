#!/usr/bin/env node
// Generates a self-animating "hero" SVG banner: drifting/twinkling particles
// behind a glowing name. Fully self-contained (no external image refs), so it
// renders correctly when GitHub displays it via <img>.
//
// Usage: node scripts/hero-banner.mjs [outputPath] [--seed=N]

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const outPath = process.argv[2] ?? "dist/hero-banner.svg";
const seedArg = process.argv.find((a) => a.startsWith("--seed="));
let seed = seedArg ? Number(seedArg.split("=")[1]) : 42;

// deterministic PRNG so the output is reproducible
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

const WIDTH = 900;
const HEIGHT = 240;
const NAME = "Pranav Kumar";

function buildParticles(count) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const cx = rand() * WIDTH;
    const cy = rand() * HEIGHT;
    const r = 1 + rand() * 2.2;
    const drift = 14 + rand() * 22;
    const dur = (5 + rand() * 6).toFixed(1);
    const delay = (rand() * 5).toFixed(1);
    const maxOpacity = (0.25 + rand() * 0.5).toFixed(2);
    const colorPick = rand() > 0.5 ? "#818cf8" : "#22d3ee";
    parts.push(`
    <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${colorPick}" opacity="0">
      <animate attributeName="cy" values="${cy.toFixed(1)};${(cy - drift).toFixed(1)};${cy.toFixed(1)}" dur="${dur}s" begin="-${delay}s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0;${maxOpacity};0" dur="${dur}s" begin="-${delay}s" repeatCount="indefinite"/>
    </circle>`);
  }
  return parts.join("");
}

function buildSvg() {
  const particles = buildParticles(55);
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2 - 10;

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow-bg" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#1a1f3a" stop-opacity="1"/>
      <stop offset="100%" stop-color="#0d1117" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="name-fill" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#a5b4fc"/>
      <stop offset="50%" stop-color="#e6edf3"/>
      <stop offset="100%" stop-color="#67e8f9"/>
    </linearGradient>
    <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="7" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <clipPath id="card-clip"><rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="16"/></clipPath>
  </defs>

  <g clip-path="url(#card-clip)">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow-bg)"/>
    ${particles}

    <text x="${cx}" y="${cy}" text-anchor="middle" font-family="Segoe UI, Consolas, sans-serif"
      font-size="52" font-weight="700" fill="#67e8f9" opacity="0.35" filter="url(#soft-glow)">${NAME}</text>
    <text x="${cx}" y="${cy}" text-anchor="middle" font-family="Segoe UI, Consolas, sans-serif"
      font-size="52" font-weight="700" fill="url(#name-fill)">${NAME}
      <animate attributeName="opacity" values="0.85;1;0.85" dur="4s" repeatCount="indefinite"/>
    </text>

    <text x="${cx}" y="${cy + 34}" text-anchor="middle" font-family="Segoe UI, Consolas, sans-serif"
      font-size="15" letter-spacing="2" fill="#8b949e">AI AGENT DEVELOPER &#183; FULLSTACK DEVELOPER &#183; GAME DEVELOPER</text>
  </g>
  <rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="16" fill="none" stroke="#30363d"/>
</svg>`;
}

async function main() {
  const svg = buildSvg();
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, svg, "utf8");
  console.log(`Wrote ${outPath}`);
}

main();
