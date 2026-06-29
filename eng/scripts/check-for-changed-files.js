import { checkForChangedFiles, coreRepoRoot, repoRoot, run } from "./helpers.js";

const ignoredCorePaths = new Set(["packages/typespec-vscode/ThirdPartyNotices.txt"]);

function getRelevantChangedFiles(output, ignoredPaths = new Set()) {
  return (output ?? "")
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !ignoredPaths.has(line.slice(3)));
}

function logChangedFiles(comment, lines) {
  if (lines.length === 0) {
    return false;
  }

  console.log();
  console.log(comment);
  console.log();
  console.log(lines.join("\n"));
  return true;
}

const coreStatus = await checkForChangedFiles(coreRepoRoot, undefined, { silent: true });
const coreChangedFiles = getRelevantChangedFiles(coreStatus, ignoredCorePaths);
const ignoredCoreOnly =
  (coreStatus ?? "").split(/\r?\n/).filter(Boolean).length > 0 && coreChangedFiles.length === 0;
const repoChangedFiles = getRelevantChangedFiles(
  await checkForChangedFiles(repoRoot, undefined, { silent: true }),
  ignoredCoreOnly ? new Set(["core"]) : undefined,
);

if (logChangedFiles("## typespec ##", coreChangedFiles) || logChangedFiles("## typespec-azure ##", repoChangedFiles)) {
  if (process.argv[2] !== "publish") {
    console.error(
      `ERROR: Files above were changed during PR validation, but not included in the PR.
Include any automated changes such as sample output, spec.html, and ThirdPartyNotices.txt in your PR.`,
    );
  } else {
    console.error(
      `ERROR: Changes have been made since this publish PR was prepared. 
In the future, remember to alert coworkers to avoid merging additional changes while publish PRs are in progress. 
Close this PR, run prepare-publish again.`,
    );
  }
  if (coreChangedFiles.length > 0) {
    run("git", ["diff"], { cwd: coreRepoRoot });
  }
  if (repoChangedFiles.length > 0) {
    run("git", ["diff"], { cwd: repoRoot });
  }
  process.exit(1);
}
