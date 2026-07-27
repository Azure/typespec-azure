/* eslint-disable no-console */
// postCompile hook: run once per spec by the shared spector-runner engine right
// after its `tsp compile` succeeds (SPECTOR_OUTPUT_DIR points at the generated
// folder). Emits the committed `.gitignore` and the self-contained test
// `tsconfig.json` the integration tests need.
import * as fs from "fs/promises";
import { join as joinPath } from "path";

const outputPath = process.env.SPECTOR_OUTPUT_DIR;
if (!outputPath) {
  console.error("SPECTOR_OUTPUT_DIR is not set; run this through spector-runner.");
  process.exit(1);
}

async function emitGitignore() {
  await fs.writeFile(
    joinPath(outputPath, ".gitignore"),
    `/**
!/src
/src/**
!/src/index.d.ts
!/.gitignore
!/tspconfig.yaml
`,
  );
}

async function emitTestTsconfig() {
  // The emitter produces a monorepo-style tsconfig.json (project references into
  // ./config/*.json that `extends` the azure-sdk-for-js repo's shared eng/tsconfigs).
  // Those base configs don't exist in this repo, so vite/oxc can't load the config
  // chain when it transforms the generated sources during integration tests. Overwrite
  // the package tsconfig with a self-contained one so each generated package is
  // transformable here. tsconfig.json is not part of the committed baseline, so this
  // only affects local/CI test runs.
  const tsconfig = {
    compilerOptions: {
      target: "es2022",
      module: "esnext",
      moduleResolution: "bundler",
      verbatimModuleSyntax: false,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
    },
    include: ["src/**/*.ts"],
  };
  await fs.writeFile(
    joinPath(outputPath, "tsconfig.json"),
    JSON.stringify(tsconfig, null, 2) + "\n",
  );
}

await emitGitignore();
await emitTestTsconfig();
