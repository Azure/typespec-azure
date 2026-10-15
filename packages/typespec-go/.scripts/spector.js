// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.
import { execSync } from "child_process";

const nodeModulesRoot =
  execSync("git rev-parse --show-toplevel").toString().trim() +
  "/packages/typespec-go/node_modules/";
const httpSpecs = nodeModulesRoot + "@typespec/http-specs/specs";
const azureHttpSpecs = nodeModulesRoot + "@azure-tools/azure-http-specs/specs";

// Write the coverage report into the azure-http-specs package directory so the
// shared /eng/pipelines/templates/upload-spector-coverage.yml template (used by
// every emitter) can pick it up from the same conventional location.
const coverageFile = nodeModulesRoot + "@azure-tools/azure-http-specs/spec-coverage.json";

const switches = [];
let execSyncOptions;

switch (process.argv[2]) {
  case "--serve":
    switches.push("serve");
    switches.push(httpSpecs);
    switches.push(azureHttpSpecs);
    switches.push("--coverageFile");
    switches.push(coverageFile);
    execSyncOptions = { stdio: "inherit" };
    break;
  case "--start":
    switches.push("server");
    switches.push("start");
    switches.push(httpSpecs);
    switches.push(azureHttpSpecs);
    switches.push("--coverageFile");
    switches.push(coverageFile);
    break;
  case "--stop":
    switches.push("server");
    switches.push("stop");
    break;
}

if (switches.length === 0) {
  throw new Error("missing arg: [--start] [--stop]");
}

const cmdLine = "pnpm exec tsp-spector " + switches.join(" ");
console.log(cmdLine);
execSync(cmdLine, execSyncOptions);
