import { readFile, writeFile } from "node:fs/promises";
import { $, question } from "zx";

// Pre-flight: clean working tree
const status = (await $`git status --porcelain`).stdout;
if (status.trim() !== "") {
  console.error("Error: working tree is not clean.");
  process.exit(1);
}

const changelogPath = "CHANGELOG.md";
const changelog = await readFile(changelogPath, "utf-8");

// Current base game version from hengband/.gitrepo
const gitrepo = await readFile("hengband/.gitrepo", "utf-8");
const branchMatch = gitrepo.match(/^\s*branch\s*=\s*(.+?)\s*$/m);
if (!branchMatch) {
  console.error("Error: could not find 'branch' field in hengband/.gitrepo.");
  process.exit(1);
}
const currentBaseVersion = branchMatch[1]!;

// Previous tag
let prevBaseVersion: string | null = null;
let counter = 0;

try {
  const prevTag = (await $`git describe --tags --abbrev=0`).stdout.trim();
  const tagMatch = prevTag.match(/^v([^+]+)\+(\d+)(?:-.+)?$/);
  if (!tagMatch) {
    console.error(
      `Error: previous tag '${prevTag}' does not match expected format v{version}+{n}[-info].`,
    );
    process.exit(1);
  }
  prevBaseVersion = tagMatch[1]!;
  counter = parseInt(tagMatch[2]!, 10);
} catch {
  // No tags yet
}

function compareVersions(a: string, b: string): number {
  const parse = (v: string) => {
    const idx = v.indexOf("-");
    return {
      nums: (idx === -1 ? v : v.slice(0, idx)).split(".").map(Number),
      suffix: idx === -1 ? null : v.slice(idx + 1),
    };
  };

  const va = parse(a);
  const vb = parse(b);

  for (let i = 0; i < Math.max(va.nums.length, vb.nums.length); i++) {
    const diff = (va.nums[i] ?? 0) - (vb.nums[i] ?? 0);
    if (diff !== 0) return diff;
  }

  if (va.suffix === null && vb.suffix !== null) return 1;
  if (va.suffix !== null && vb.suffix === null) return -1;
  if (va.suffix === null || vb.suffix === null) return 0;
  return va.suffix < vb.suffix ? -1 : va.suffix > vb.suffix ? 1 : 0;
}

// Next version
let nextVersion: string;
if (prevBaseVersion === null) {
  nextVersion = `v${currentBaseVersion}+1`;
} else {
  const cmp = compareVersions(prevBaseVersion, currentBaseVersion);
  if (cmp === 0) {
    nextVersion = `v${currentBaseVersion}+${counter + 1}`;
  } else if (cmp < 0) {
    nextVersion = `v${currentBaseVersion}+1`;
  } else {
    nextVersion = `v${prevBaseVersion}+${counter + 1}-really-${currentBaseVersion}`;
  }
}

// Confirm
const prevDisplay = prevBaseVersion === null ? "(none)" : `v${prevBaseVersion}+${counter}`;
console.log(`Prev version: ${prevDisplay}`);
console.log(`Next version: ${nextVersion}`);
const answer = await question("Proceed? [y/N] ");
if (answer.toLowerCase() !== "y") {
  console.log("Aborted.");
  process.exit(0);
}

// Update CHANGELOG.md
const today = new Date();
const date = [
  today.getUTCFullYear(),
  String(today.getUTCMonth() + 1).padStart(2, "0"),
  String(today.getUTCDate()).padStart(2, "0"),
].join("-");
const updatedChangelog = changelog.replace(
  /^(## Unreleased\n)/m,
  `$1\n## ${nextVersion} (${date})\n`,
);
if (updatedChangelog === changelog) {
  console.error("Error: CHANGELOG.md has no '## Unreleased' section.");
  process.exit(1);
}
await writeFile(changelogPath, updatedChangelog);

// Commit and tag
await $`git add ${changelogPath}`;
await $`git commit -m ${`Release ${nextVersion}`}`;
await $`git tag -s ${nextVersion} -m ${`Release ${nextVersion}`}`;

console.log(`\nDone! Created tag ${nextVersion}.`);
