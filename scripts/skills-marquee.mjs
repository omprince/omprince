#!/usr/bin/env node
// Generates a self-animating SVG "marquee" of tool icons (scrolling row,
// icon + label) for the README. Icons come from tandpfun/skill-icons
// (verified filenames only — see TOOLS below) via raw.githubusercontent.com.
//
// Usage: node scripts/skills-marquee.mjs [outputPath]

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const outPath = process.argv[2] ?? "dist/skills-marquee.svg";

const ICON_BASE = "https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons";

// { label, file } - file is the exact filename in the skill-icons repo.
// Icons with a Dark/Light split use the Dark variant to suit the dark card background.
const TOOLS = [
  { label: "HTML", file: "HTML" },
  { label: "CSS", file: "CSS" },
  { label: "JavaScript", file: "JavaScript" },
  { label: "React", file: "React-Dark" },
  { label: "Next.js", file: "NextJS-Dark" },
  { label: "Node.js", file: "NodeJS-Dark" },
  { label: "Express", file: "ExpressJS-Dark" },
  { label: "Tailwind", file: "TailwindCSS-Dark" },
  { label: "Bootstrap", file: "Bootstrap" },
  { label: "Python", file: "Python-Dark" },
  { label: "TensorFlow", file: "TensorFlow-Dark" },
  { label: "PyTorch", file: "PyTorch-Dark" },
  { label: "Unity", file: "Unity-Dark" },
  { label: "C", file: "C" },
  { label: "C++", file: "CPP" },
  { label: "Java", file: "Java-Dark" },
  { label: "Git", file: "Git" },
  { label: "Docker", file: "Docker" },
  { label: "MongoDB", file: "MongoDB" },
  { label: "MySQL", file: "MySQL-Dark" },
  { label: "Figma", file: "Figma-Dark" },
  { label: "Blender", file: "Blender-Dark" },
  { label: "Illustrator", file: "Illustrator" },
  { label: "Linux", file: "Linux-Dark" },
];

async function fetchIconDataUri(file) {
  const res = await fetch(`${ICON_BASE}/${file}.svg`);
  if (!res.ok) throw new Error(`Failed to fetch icon ${file}: ${res.status}`);
  const svgText = await res.text();
  const base64 = Buffer.from(svgText, "utf8").toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

function buildSvg(tools) {
  const itemW = 92;
  const iconSize = 40;
  const height = 100;
  const width = 800; // fixed visible window; content scrolls through it
  const setW = itemW * tools.length; // full content width (wider than the window)
  const durationS = Math.round(tools.length * 1.8);

  const renderSet = (offset) =>
    tools
      .map((t, i) => {
        const x = offset + i * itemW + itemW / 2;
        return `
      <g transform="translate(${x}, 0)">
        <image href="${t.dataUri}" x="${-iconSize / 2}" y="14" width="${iconSize}" height="${iconSize}"/>
        <text x="0" y="76" font-size="11" fill="#c9d1d9" text-anchor="middle" font-family="Segoe UI, Consolas, sans-serif">${t.label}</text>
      </g>`;
      })
      .join("");

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0d1117" stop-opacity="1"/>
      <stop offset="6%" stop-color="#0d1117" stop-opacity="0"/>
      <stop offset="94%" stop-color="#0d1117" stop-opacity="0"/>
      <stop offset="100%" stop-color="#0d1117" stop-opacity="1"/>
    </linearGradient>
    <clipPath id="clip"><rect x="0" y="0" width="${width}" height="${height}" rx="14"/></clipPath>
  </defs>

  <rect width="${width}" height="${height}" rx="14" fill="#0d1117" stroke="#30363d"/>

  <g clip-path="url(#clip)">
    <g>
      ${renderSet(0)}
      ${renderSet(setW)}
      <animateTransform attributeName="transform" attributeType="XML" type="translate"
        from="0 0" to="${-setW} 0" dur="${durationS}s" repeatCount="indefinite"/>
    </g>
  </g>

  <rect width="${width}" height="${height}" rx="14" fill="url(#fade)"/>
</svg>`;
}

async function main() {
  const tools = await Promise.all(
    TOOLS.map(async (t) => ({ ...t, dataUri: await fetchIconDataUri(t.file) }))
  );
  const svg = buildSvg(tools);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, svg, "utf8");
  console.log(`Wrote ${outPath} (${tools.length} tools)`);
}

main();
