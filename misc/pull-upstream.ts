// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $, argv } from "zx";

const subrepoPath = "hengband";
const isContinue = argv._[0] === "continue";
const targetRef = isContinue ? argv._[1] : argv._[0];
if (!targetRef) {
  console.error("Usage: pull-upstream.ts <upstream-ref>");
  console.error("       pull-upstream.ts continue <upstream-ref>  (after resolving conflicts)");
  console.error("  e.g. pull-upstream.ts 3.0.2.4-Beta");
  process.exit(1);
}

if (isContinue) {
  const worktree = await findSubrepoWorktree();
  if (worktree) {
    await continueLegacyImport(targetRef, worktree);
  } else {
    await assertNoConflicts();
  }
  await finalizeImport(targetRef);
  console.log(`\nDone! hengband updated to ${targetRef}.`);
  process.exit(0);
}

await assertCleanWorkingTree();

const currentRef = await getSubrepoRef();
if (currentRef === targetRef) {
  console.error(`Error: hengband is already at upstream ref '${targetRef}'.`);
  process.exit(1);
}

const currentCommit = await getSubrepoCommit();
console.log(`Current hengband ref: ${currentRef}`);
console.log(`Target  hengband ref: ${targetRef}`);

try {
  const patchPath = await createLocalPatch(currentRef, currentCommit);
  try {
    // git-subrepo's reconstructed history has an unreliable merge base. Replace
    // the vendor tree, then three-way apply only this project's local port.
    await $`git subrepo pull --force --branch=${targetRef} --update ${subrepoPath}`;
    await $`git apply --3way --index --directory=${subrepoPath} ${patchPath}`;
  } finally {
    await rm(patchPath, { force: true });
  }
} catch (error) {
  console.error("\nUnable to apply the local hengband changes to the new upstream ref.");
  console.error(error);
  await reportRootConflicts(targetRef);
  process.exit(1);
}

await finalizeImport(targetRef);
console.log(`\nDone! hengband updated from ${currentRef} to ${targetRef}.`);

async function assertCleanWorkingTree() {
  const status = (await $`git status --porcelain`).stdout;
  if (status.trim() !== "") {
    console.error("Error: working tree is not clean.");
    process.exit(1);
  }
}

async function getSubrepoRef() {
  const gitrepo = await readFile(`${subrepoPath}/.gitrepo`, "utf-8");
  const refMatch = gitrepo.match(/^\s*branch\s*=\s*(.+?)\s*$/m);
  if (!refMatch) {
    console.error(`Error: could not find 'branch' field in ${subrepoPath}/.gitrepo.`);
    process.exit(1);
  }
  return refMatch[1]!;
}

async function getSubrepoCommit() {
  const gitrepo = await readFile(`${subrepoPath}/.gitrepo`, "utf-8");
  const commitMatch = gitrepo.match(/^\s*commit\s*=\s*([0-9a-f]{40})\s*$/m);
  if (!commitMatch) {
    console.error(`Error: could not find a commit field in ${subrepoPath}/.gitrepo.`);
    process.exit(1);
  }
  return commitMatch[1]!;
}

async function createLocalPatch(currentRef: string, currentCommit: string) {
  // Ensure the recorded release object is available, including in fresh clones.
  await $`git fetch --no-tags --quiet https://github.com/hengband/hengband ${currentRef}`;
  // Recover cleanly if a prior patch-generation attempt was interrupted.
  await $`git subrepo clean ${subrepoPath}`;
  await $`git subrepo branch ${subrepoPath}`;
  const patch =
    await $`git diff --binary ${currentCommit} subrepo/${subrepoPath} -- . ${":(exclude).gitrepo"}`;
  const patchPath = join(await mkdtemp(join(tmpdir(), "hengband-local-patch-")), "local.patch");
  await writeFile(patchPath, patch.stdout);
  await $`git subrepo clean ${subrepoPath}`;
  return patchPath;
}

async function findSubrepoWorktree() {
  const output = (await $`git worktree list --porcelain`).stdout;
  for (const entry of output.trim().split("\n\n")) {
    if (entry.includes(`branch refs/heads/subrepo/${subrepoPath}`)) {
      return entry
        .split("\n")
        .find((line) => line.startsWith("worktree "))
        ?.slice(9);
    }
  }
}

async function continueLegacyImport(ref: string, worktree: string) {
  const conflicts = await getConflicts(worktree);
  if (conflicts.length > 0) {
    await reportConflicts(worktree, ref, conflicts);
    process.exit(1);
  }

  const mergeHead = await $`git -C ${worktree} rev-parse -q --verify MERGE_HEAD`.nothrow();
  if (mergeHead.exitCode === 0) {
    try {
      await $`git -C ${worktree} merge --continue`;
    } catch (error) {
      console.error("\nUnable to complete the resolved merge.");
      console.error(error);
      process.exit(1);
    }
  }

  const status = (await $`git -C ${worktree} status --porcelain`).stdout;
  if (status.trim() !== "") {
    console.error("Error: the temporary subrepo worktree still has uncommitted changes.");
    console.error(`Inspect it with: git -C ${worktree} status`);
    process.exit(1);
  }

  await $`git subrepo commit ${subrepoPath}`;
}

async function assertNoConflicts() {
  const conflicts = (await $`git diff --name-only --diff-filter=U`).stdout.trim();
  if (conflicts !== "") {
    await reportRootConflicts(targetRef, conflicts.split("\n"));
    process.exit(1);
  }
}

async function reportRootConflicts(ref: string, conflicts?: string[]) {
  console.error("\nResolve and stage the local hengband conflicts, then run:");
  console.error("  git add <resolved files>");
  console.error(`  pnpm pull-upstream continue ${ref}`);
  if (conflicts && conflicts.length > 0) {
    console.error("\nConflicting files:");
    for (const file of conflicts) console.error(`  ${file}`);
  }
}

async function getConflicts(worktree: string) {
  const conflicts = (await $`git -C ${worktree} diff --name-only --diff-filter=U`).stdout.trim();
  return conflicts === "" ? [] : conflicts.split("\n");
}

async function reportConflicts(worktree: string, ref: string, conflicts?: string[]) {
  conflicts ??= await getConflicts(worktree);
  console.error("\nMerge conflict while importing hengband.");
  console.error("Resolve the conflicts in git-subrepo's temporary worktree, then run:");
  console.error(`  git -C ${worktree} add <resolved files>`);
  console.error(`  pnpm pull-upstream continue ${ref}`);
  if (conflicts.length > 0) {
    console.error("\nConflicting files:");
    for (const file of conflicts) console.error(`  ${file}`);
  }
}

async function finalizeImport(ref: string) {
  const gitrepoPath = `${subrepoPath}/.gitrepo`;
  const gitrepo = await readFile(gitrepoPath, "utf-8");
  const updatedGitrepo = gitrepo.replace(/^([\t ]*branch\s*=\s*)(.+?)\s*$/m, `$1${ref}`);
  if (updatedGitrepo !== gitrepo) {
    await writeFile(gitrepoPath, updatedGitrepo);
  }

  const gitmodulesPath = ".gitmodules";
  const hengbandGitmodules = await readFile(`${subrepoPath}/.gitmodules`, "utf-8");
  const updatedGitmodules = hengbandGitmodules
    .replace(/^(\[submodule ")(.+?)("\])/gm, `$1${subrepoPath}/$2$3`)
    .replace(/^([\t ]*path\s*=\s*)(.+)/gm, `$1${subrepoPath}/$2`);
  await writeFile(gitmodulesPath, updatedGitmodules);
  await $`git submodule update --init`;

  const changelogPath = "CHANGELOG.md";
  const changelog = await readFile(changelogPath, "utf-8");
  const entry = `- Upgrade base game to ${ref}`;
  const updatedChangelog = changelog.includes(entry)
    ? changelog
    : changelog.replace(/^(## Unreleased\n)/m, `$1\n${entry}\n`);
  if (updatedChangelog === changelog && !changelog.includes(entry)) {
    console.error("Error: CHANGELOG.md has no '## Unreleased' section.");
    process.exit(1);
  }
  if (updatedChangelog !== changelog) {
    await writeFile(changelogPath, updatedChangelog);
  }

  await $`git add ${gitrepoPath} ${gitmodulesPath} ${changelogPath}`;
  await $`git commit --amend --no-edit`;
}
