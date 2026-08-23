#!/usr/bin/env node
// Rewrites the "currently working on" line in README.md to point at whichever
// public repo the user pushed to most recently (excluding this profile repo
// and forks). Edits in place between the CURRENT_PROJECT markers.
//
// Usage: node scripts/update-current-project.mjs [githubUsername] [readmePath]

import { readFile, writeFile } from "node:fs/promises";

const username = process.argv[2] ?? "omprince";
const readmePath = process.argv[3] ?? "README.md";
const START = "<!-- CURRENT_PROJECT:START -->";
const END = "<!-- CURRENT_PROJECT:END -->";

async function fetchLatestRepo() {
  const res = await fetch(
    `https://api.github.com/users/${username}/repos?sort=pushed&direction=desc&per_page=10`,
    {
      headers: {
        "User-Agent": "readme-updater",
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
    }
  );
  if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${await res.text()}`);
  const repos = await res.json();
  const candidate = repos.find(
    (r) => !r.fork && r.name.toLowerCase() !== username.toLowerCase()
  );
  if (!candidate) throw new Error("No eligible repo found to use as the current project.");
  return candidate;
}

async function main() {
  const repo = await fetchLatestRepo();
  const desc = repo.description ? ` — ${repo.description}` : "";
  const line = `- 🔭 I'm currently working on **[${repo.name}](${repo.html_url})**${desc}`;

  const readme = await readFile(readmePath, "utf8");
  const startIdx = readme.indexOf(START);
  const endIdx = readme.indexOf(END);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Markers ${START} / ${END} not found in ${readmePath}`);
  }

  const before = readme.slice(0, startIdx + START.length);
  const after = readme.slice(endIdx);
  const updated = `${before}\n${line}\n${after}`;

  if (updated === readme) {
    console.log("No change — current project is already up to date.");
    return;
  }
  await writeFile(readmePath, updated, "utf8");
  console.log(`Updated current project to: ${repo.name}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
