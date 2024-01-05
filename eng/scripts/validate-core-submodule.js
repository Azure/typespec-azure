// @ts-check
import { execFileSync, spawnSync } from "child_process";
import { coreRepoRoot } from "./helpers.js";
const cwd = coreRepoRoot;

execFileSync("git", ["fetch", "https://github.com/microsoft/typespec", "main"], { cwd });

const proc = spawnSync("git", ["merge-base", "--is-ancestor", "HEAD", "FETCH_HEAD"], {
  cwd,
});

if (proc.status !== 0) {
  console.error(
    "ERROR: Core submodule does not point to a commit merged to https://github.com/microsoft/typespec main."
  );
  process.exit(1);
}
