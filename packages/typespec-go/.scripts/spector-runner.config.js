// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.
//
// Regeneration config for the Go emitter, driven by the shared
// `@azure-tools/spector-runner` CLI:
//
//   spector-runner --config-file .scripts/spector-runner.config.js [--filter <regex>] [--verbose]
//
// The CLI owns parsing (`--filter`, `--jobs`, `--verbose`, `--cwd`), parallel
// `tsp compile` scheduling, reporting, and the hook lifecycle. This file only
// declares *what* to compile (scenarios) and the Go-specific pre/post steps.
//
// Two rarely-used toggles are read from the environment (the CLI has no matching
// flags): set `TYPESPEC_GO_EMITTER_INSTALLED=1` to emit with the installed
// package instead of the local build, and `TYPESPEC_GO_DEBUGGER=1` to pass the
// emitter `debugger` option.
import { buildScenarios, defineConfig } from "@azure-tools/spector-runner";
import { existsSync, opendirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { syncAzureRestApiSpecs } from "./sync-azure-rest-api-specs.js";

// limit to 8 concurrent builds
const MAX_JOBS = 8;

// Emitter *name*, used as the key for emitter options regardless of whether we
// emit against the locally-built package (a path) or the installed package.
const EMITTER_NAME = "@azure-tools/typespec-go";

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Stub tspconfig passed to every compile so that upstream tspconfig.yaml files
// (e.g. those shipped with azure-rest-api-specs) don't bleed emitter options
// into our regenerated test output. See .scripts/tspconfig.yaml.
const stubConfig = resolve(pkgRoot, ".scripts/tspconfig.yaml");

const httpSpecs = resolve(pkgRoot, "node_modules/@typespec/http-specs/specs") + "/";
const azureHttpSpecs = resolve(pkgRoot, "node_modules/@azure-tools/azure-http-specs/specs") + "/";

// default to using the locally built emitter unless told to use the installed one.
const emitter = process.env.TYPESPEC_GO_EMITTER_INSTALLED ? EMITTER_NAME : pkgRoot;
const useDebugger = process.env.TYPESPEC_GO_DEBUGGER !== undefined;

// Emitter options applied to every module unless a spec overrides them by key.
// TODO: disable examples by default https://github.com/Azure/autorest.go/issues/1441
const defaultOptions = {
  "generate-fakes": true,
  "inject-spans": true,
  "head-as-boolean": true,
  "fix-const-stuttering": true,
  "file-prefix": "zz_",
};
if (useDebugger) {
  defaultOptions.debugger = true;
}

// Resolve a local input to its entry file: an explicit .tsp, else client.tsp
// preferred over main.tsp.
function entrypoint(input) {
  if (input.endsWith(".tsp")) {
    return input;
  }
  return existsSync(input + "/client.tsp") ? input + "/client.tsp" : input + "/main.tsp";
}

// Build a CompileScenario for a spec that isn't in the shared spector config.
function local(moduleName, input, outputDir, options = {}) {
  const merged = { ...defaultOptions, ...options };
  // A containing-module replaces the per-module output; otherwise pass module.
  if (merged["containing-module"] === undefined) {
    merged.module = moduleName;
  }
  merged["emitter-output-dir"] = resolve(pkgRoot, outputDir);
  return {
    name: moduleName,
    entrypoint: entrypoint(input),
    emit: [emitter],
    options: { [EMITTER_NAME]: merged },
  };
}

// The spec-selection config (spector.config.*.yaml) plus these driver settings
// are all buildScenarios needs to expand the http/azure-http scenarios; it
// handles output-dir + option merging.
const shared = {
  emit: [emitter],
  emitterName: EMITTER_NAME,
  options: defaultOptions,
  cwd: pkgRoot,
};

export default defineConfig({
  cwd: pkgRoot,
  jobs: MAX_JOBS,
  tspconfig: stubConfig,
  scenarios: (ctx) => {
    const shouldGenerate = (name) => ctx.filter === undefined || new RegExp(ctx.filter).test(name);

    // Service specs come from Azure/azure-rest-api-specs at a pinned commit
    // (see .scripts/azure-rest-api-specs.json). Only sync (a network clone,
    // no-op when cached) when a spec that needs them is actually selected.
    const needsServiceSpecs = shouldGenerate("azkeys") || shouldGenerate("azblob");
    const azureServiceSpecs = needsServiceSpecs ? syncAzureRestApiSpecs() + "/" : undefined;

    return [
      ...buildScenarios({
        ...shared,
        config: resolve(pkgRoot, "spector.config.http.yaml"),
        specsRoot: httpSpecs,
        outputDir: "test/http-specs/{parentDir}/{options.module}",
      }),
      ...buildScenarios({
        ...shared,
        config: resolve(pkgRoot, "spector.config.azure.yaml"),
        specsRoot: azureHttpSpecs,
        outputDir: "test/azure-http-specs/{parentDir}/{options.module}",
      }),
      // Local specs that aren't part of the shared spector spec packages: azkeys
      // and azblob come from azure-rest-api-specs; the rest are checked-in test tsp.
      azureServiceSpecs &&
        local(
          "azkeys",
          azureServiceSpecs + "specification/keyvault/data-plane/Keys/client.tsp",
          "test/local/azkeys",
          { "single-client": true, "omit-constructors": true },
        ),
      azureServiceSpecs &&
        local(
          "azblob",
          azureServiceSpecs + "specification/storage/data-plane/BlobStorage/client.tsp",
          "test/local/azblob",
          { "generate-fakes": false, "omit-constructors": true, "inject-spans": false },
        ),
      local("gogenerate", resolve(pkgRoot, "test/tsp/GoGenerate"), "test/local/gogenerate", {
        "generate-fakes": false,
        "go-generate": "after_generate.go",
      }),
      local("fakeserver", resolve(pkgRoot, "test/tsp/FakeServer"), "test/local/fakeserver"),
      local(
        "containingmod",
        resolve(pkgRoot, "test/tsp/ContainingMod"),
        "test/local/containingmod/subpkg",
        { "containing-module": "containingmod" },
      ),
    ].filter((scenario) => scenario);
  },
  // Per-scenario post-processing that used to run after each subprocess compile.
  postScenario: (result) => {
    const fullOutputDir = result.scenario.options[EMITTER_NAME]["emitter-output-dir"];
    if (result.success) {
      // Force emitter version to a constant in _metadata.json to avoid unnecessary
      // version drift in committed files.
      const metadataPath = `${fullOutputDir}/testdata/_metadata.json`;
      if (existsSync(metadataPath)) {
        const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
        metadata.emitterVersion = "0.0.0";
        writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + "\n");
      }
    } else {
      // delete files on error so it's easy to spot codegen failures
      cleanGeneratedFiles(fullOutputDir);
    }
  },
});

function cleanGeneratedFiles(outputDir) {
  if (!existsSync(outputDir)) {
    return;
  }
  const dir = opendirSync(outputDir);
  while (true) {
    const dirEnt = dir.readSync();
    if (dirEnt === null) {
      break;
    }
    // preserve the version.go file so we can test the v2+ major version scenario
    if (dirEnt.isFile() && dirEnt.name.startsWith("zz_") && dirEnt.name !== "zz_version.go") {
      unlinkSync(dir.path + "/" + dirEnt.name);
    }
  }
  dir.close();
  cleanGeneratedFiles(outputDir + "/fake");
}
