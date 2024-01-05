import { runOrExit } from "../../core/packages/internal-build-utils/dist/src/common.js";
import { coreRepoRoot } from "./helpers.js";

const cwd = coreRepoRoot;
await runOrExit("git", ["fetch", "https://github.com/microsoft/typespec", "main"], { cwd });

const proc = await runOrExit("git", ["merge-base", "--is-ancestor", "HEAD", "FETCH_HEAD"], {
  cwd,
  throwOnNonZeroExit: false,
});

if (proc.status !== 0) {
  console.error(
    "ERROR: Core submodule does not point to a commit merged to https://github.com/microsoft/typespec main."
  );
  process.exit(1);
}
