import { checkForChangedFiles, coreRepoRoot, repoRoot } from "./helpers.js";

if (
  (await checkForChangedFiles(coreRepoRoot, "## typespec ##")) ||
  (await checkForChangedFiles(repoRoot, "## typespec-azure ##"))
) {
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
  run("git", ["diff"], { cwd: coreRepoRoot });
  run("git", ["diff"], { cwd: repoRoot });
  process.exit(1);
}
