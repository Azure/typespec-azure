import { coreRepoRoot, run } from "./helpers.js";

const cwd = coreRepoRoot;
run("git", ["fetch", "https://github.com/microsoft/typespec", "main"], { cwd });

const proc = run("git", ["merge-base", "--is-ancestor", "HEAD", "FETCH_HEAD"], {
  cwd,
  throwOnNonZeroExit: false,
});

if (proc.status !== 0) {
  console.error(
    "ERROR: Core submodule does not point to a commit merged to https://github.com/microsoft/typespec main."
  );
  process.exit(1);
}
