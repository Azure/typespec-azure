#!/usr/bin/env node
// @ts-check

import { runOrExit } from "@typespec/internal-build-utils";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

loadDotenv();

if (process.env.TYPESPEC_SKIP_DOCUSAURUS_BUILD?.toLowerCase() === "true") {
  console.log("Skipping docusaurus build: TYPESPEC_SKIP_DOCUSAURUS_BUILD=true");
  process.exit(0);
}

await runOrExit("docusaurus", ["build"], {
  env: {
    ...process.env,
    USE_SIMPLE_CSS_MINIFIER: "true",
  },
});

function loadDotenv() {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const dotenvPath = path.resolve(dirname, "../../../.env");
  dotenv.config({
    path: dotenvPath,
  });
}
