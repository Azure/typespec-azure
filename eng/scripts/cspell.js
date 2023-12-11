// @ts-check
import { resolve } from "path";
import { run, xplatCmd } from "../../core/packages/internal-build-utils/dist/src/index.js";
import { repoRoot } from "./helpers.js";
export const cspell = xplatCmd(
  resolve(repoRoot, "core/packages/internal-build-utils/node_modules/.bin/cspell")
);

await run(
  cspell,
  [
    "--no-progress",
    "**/*.md",
    "**/*.ts",
    "**/*.js",
    "**/changelog.json",
    "common/changes/**/*.json",
  ],
  {
    cwd: repoRoot,
  }
);
