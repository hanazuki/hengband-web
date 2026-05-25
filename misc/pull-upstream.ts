// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { readFile, writeFile } from "node:fs/promises";
import { $, argv } from "zx";

const isContinue = argv._[0] === "continue";
const newBranch = isContinue ? argv._[1] : argv._[0];
if (!newBranch) {
  console.error("Usage: pull-upstream.ts <new-version>");
  console.error("       pull-upstream.ts continue <new-version>  (after resolving conflicts)");
  console.error("  e.g. pull-upstream.ts 3.0.2.3-Beta");
  process.exit(1);
}

if (isContinue) {
  await updateChangelog(newBranch);
  console.log(`\nDone!`);
  process.exit(0);
}

// Pre-flight: clean working tree
const status = (await $`git status --porcelain`).stdout;
if (status.trim() !== "") {
  console.error("Error: working tree is not clean.");
  process.exit(1);
}

// Current branch from hengband/.gitrepo
const gitrepo = await readFile("hengband/.gitrepo", "utf-8");
const branchMatch = gitrepo.match(/^\s*branch\s*=\s*(.+?)\s*$/m);
if (!branchMatch) {
  console.error("Error: could not find 'branch' field in hengband/.gitrepo.");
  process.exit(1);
}
const currentBranch = branchMatch[1]!;

console.log(`Current hengband branch: ${currentBranch}`);
console.log(`Target  hengband branch: ${newBranch}`);

try {
  await $`git subrepo pull --branch=${newBranch} hengband`;
} catch {
  const conflicts = (await $`git diff --name-only --diff-filter=U`).stdout.trim();
  console.error("\nMerge conflict. Resolve the conflicts, then run:");
  console.error("  git add <resolved files>");
  console.error("  GIT_EDITOR=true git merge --continue");
  console.error(`  pnpm pull-upstream continue ${newBranch}`);
  if (conflicts) {
    console.error("\nConflicting files:");
    for (const f of conflicts.split("\n")) console.error(`  ${f}`);
  }
  process.exit(1);
}

await updateChangelog(newBranch);
console.log(`\nDone! hengband updated from ${currentBranch} to ${newBranch}.`);

async function updateChangelog(branch: string) {
  const changelogPath = "CHANGELOG.md";
  const changelog = await readFile(changelogPath, "utf-8");
  const updatedChangelog = changelog.replace(
    /^(## Unreleased\n)/m,
    `$1\n- Upgrade base game to ${branch}\n`,
  );
  if (updatedChangelog === changelog) {
    console.error("Error: CHANGELOG.md has no '## Unreleased' section.");
    process.exit(1);
  }
  await writeFile(changelogPath, updatedChangelog);
  await $`git add ${changelogPath}`;
  await $`git commit --amend --no-edit`;
}
