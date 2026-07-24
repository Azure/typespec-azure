// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.
import { loadSpectorConfig, resolveSpecs } from "@azure-tools/spector-runner";
import { exec, execSync } from "child_process";
import { existsSync, opendirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { semaphore } from "./semaphore.js";
import { syncAzureRestApiSpecs } from "./sync-azure-rest-api-specs.js";

// limit to 8 concurrent builds
const sem = semaphore(8);

const pkgRoot =
  execSync("git rev-parse --show-toplevel").toString().trim() + "/packages/typespec-go/";

const httpSpecs = pkgRoot + "node_modules/@typespec/http-specs/specs/";
const azureHttpSpecs = pkgRoot + "node_modules/@azure-tools/azure-http-specs/specs/";

// Service specs come from Azure/azure-rest-api-specs at a pinned commit
// (see .scripts/azure-rest-api-specs.json). The sync call is a no-op when
// the cache already matches the pin.
const azureServiceSpecs = syncAzureRestApiSpecs() + "/";

const compiler = pkgRoot + "node_modules/@typespec/compiler/cmd/tsp.js";

// Stub tspconfig used for every compile so that upstream tspconfig.yaml files
// (e.g. those shipped with azure-rest-api-specs) don't bleed emitter options
// from azure-sdk-for-go into our regenerated test fixtures.
const stubConfig = pkgRoot + ".scripts/tspconfig.yaml";

// Spec selection lives in the opt-in `spector.config.*.yaml` files (see
// Azure/typespec-azure#4997), parsed by the shared @azure-tools/spector-runner
// package. Each enabled spec resolves to a `module` option (the Go module name) plus any
// per-test emitter options. We rebuild the legacy group shape below so the rest of this
// script (loopSpec/generate) is unchanged.
//
// legacy group shape: { 'moduleName': [ 'input', 'emitter option 1', ... ] }
// if no .tsp file is specified in input, it's assumed to be main.tsp
function loadGroup(configPath) {
  const group = {};
  for (const { path, options } of resolveSpecs(loadSpectorConfig(configPath))) {
    const { module, ...rest } = options;
    if (module === undefined) {
      throw new Error(`spec "${path}" in ${configPath} is missing the required "module" option`);
    }
    const optionArgs = Object.entries(rest).map(([key, value]) => `${key}=${value}`);
    if (group[module] !== undefined) {
      throw new Error(`duplicate module "${module}" in ${configPath}`);
    }
    group[module] = [path, ...optionArgs];
  }
  return group;
}

const httpSpecsGroup = loadGroup(pkgRoot + "spector.config.http.yaml");
const azureHttpSpecsGroup = loadGroup(pkgRoot + "spector.config.azure.yaml");

// default to using the locally built emitter
let emitter = pkgRoot;
const args = process.argv.slice(2);
var filter = undefined;
const switches = [];
for (var i = 0; i < args.length; i += 1) {
  const filterArg = args[i].match(/--filter=(?<filter>\w+)/);
  if (filterArg) {
    filter = filterArg.groups["filter"];
    continue;
  }

  switch (args[i]) {
    case "--verbose":
      switches.push("--verbose");
      break;
    case "--emitter-installed":
      // the emitter has been installed so use that one instead
      emitter = "@azure-tools/typespec-go";
      break;
    default:
      break;
  }
}

if (filter !== undefined) {
  console.log("Using filter: " + filter);
}

function should_generate(name) {
  if (filter !== undefined) {
    const re = new RegExp(filter);
    return re.test(name);
  }
  return true;
}

const azkeys = azureServiceSpecs + "specification/keyvault/data-plane/Keys/client.tsp";
generate("azkeys", azkeys, "test/local/azkeys", ["single-client=true", "omit-constructors=true"]);

const azblob = azureServiceSpecs + "specification/storage/data-plane/BlobStorage/client.tsp";
generate("azblob", azblob, "test/local/azblob", [
  "generate-fakes=false",
  "omit-constructors=true",
  "inject-spans=false",
]);

const gogenerate = pkgRoot + "test/tsp/GoGenerate";
generate("gogenerate", gogenerate, "test/local/gogenerate", [
  "generate-fakes=false",
  "go-generate=after_generate.go",
]);

const fakeserver = pkgRoot + "test/tsp/FakeServer";
generate("fakeserver", fakeserver, "test/local/fakeserver");

loopSpec(httpSpecsGroup, httpSpecs, "test/http-specs");
loopSpec(azureHttpSpecsGroup, azureHttpSpecs, "test/azure-http-specs");

function loopSpec(group, root, prefix) {
  for (const module in group) {
    const values = group[module];
    let perTestOptions;
    if (values.length > 1) {
      perTestOptions = values.slice(1);
    }
    // keep the output directory structure similar to the cadl input directory.
    // remove the last dir from the input path as we'll use the module name instead.
    // if the input specifies a .tsp file, remove that first.
    let outDir = values[0];
    if (outDir.lastIndexOf(".tsp") > -1) {
      outDir = outDir.substring(0, outDir.lastIndexOf("/"));
    }
    outDir = outDir.substring(0, outDir.lastIndexOf("/"));
    generate(module, root + values[0], `${prefix}/${outDir}/` + module, perTestOptions);
  }
}

function generate(moduleName, input, outputDir, perTestOptions) {
  if (!should_generate(moduleName)) {
    return;
  }
  if (perTestOptions === undefined) {
    perTestOptions = [];
  }

  const fullOutputDir = pkgRoot + outputDir;

  // check for containing-module and swap out module for it as needed
  let outputKind = `module=${moduleName}`;
  for (const perTestOption of perTestOptions) {
    if (perTestOption.match(/containing\-module/)) {
      outputKind = perTestOption;
      break;
    }
  }

  // these options can't be changed per test
  const fixedOptions = [outputKind, `emitter-output-dir=${fullOutputDir}`, "file-prefix=zz_"];

  // these options _can_ be changed per test
  // TODO: disabled examples by default https://github.com/Azure/autorest.go/issues/1441
  const defaultOptions = [
    "generate-fakes=true",
    "inject-spans=true",
    "head-as-boolean=true",
    "fix-const-stuttering=true",
  ];

  let allOptions = fixedOptions;

  // merge in any per-test options.
  // if a per-test option overlaps with a default option, use the per-test one.
  for (const perTestOption of perTestOptions) {
    // perTestOption === 'option=value', grab the option name
    const optionName = perTestOption.match(/^([a-zA-Z0-9_-]+)/)[0];
    const index = defaultOptions.findIndex((value, index, obj) => {
      return value.startsWith(optionName);
    });
    if (index > -1) {
      // found a match, replace the default option with the per-test one
      defaultOptions[index] = perTestOption;
    } else {
      allOptions.push(perTestOption);
    }
  }

  allOptions = allOptions.concat(defaultOptions);

  sem.take(function () {
    // if a tsp file isn't specified, first check
    // for a client.tsp file. if that doesn't exist
    // then fall back to main.tsp.
    if (input.lastIndexOf(".tsp") === -1) {
      if (existsSync(input + "/client.tsp")) {
        input += "/client.tsp";
      } else {
        input += "/main.tsp";
      }
    }
    console.log("generating " + input);
    const options = [];
    for (const option of allOptions) {
      options.push(`--option="@azure-tools/typespec-go.${option}"`);
    }
    if (switches.includes("--debugger")) {
      options.push(`--option="@azure-tools/typespec-go.debugger=true"`);
    }
    const command = `node ${compiler} compile ${input} --emit=${emitter} --config=${stubConfig} ${options.join(" ")}`;
    if (switches.includes("--verbose")) {
      console.log(command);
    }
    exec(command, function (error, stdout, stderr) {
      try {
        // print any output or error from the tsp compile command
        logResult(error, stdout, stderr);
        // format on success
        if (error === null) {
          // Force emitter version to a constant in _metadata.json to avoid unnecessary version drift in committed files
          const metadataPath = `${fullOutputDir}/testdata/_metadata.json`;
          if (existsSync(metadataPath)) {
            const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
            metadata.emitterVersion = "0.0.0";
            writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + "\n");
          }
        } else {
          // delete files on error so it's easy to spot codegen failures
          cleanGeneratedFiles(fullOutputDir);
          // record the failure so the script exits non-zero; otherwise an emit
          // error here would only surface later as a downstream lint failure.
          process.exitCode = 1;
        }
      } catch (err) {
        console.error("An error occurred:");
        if (err.message) {
          console.error("Message:", err.message);
        }
        if (err.stack) {
          console.error("Stack:", err.stack);
        }
        if (err.output) {
          console.error("Output:", err.output.toString());
        }
      } finally {
        sem.leave();
      }
    });
  });
}

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

function logResult(error, stdout, stderr) {
  if (stdout !== "") {
    console.log("stdout: " + stdout);
  }
  // typespec compiler prints compiler progress to stderr
  // but it's not an error, so we use console.log
  // to print it out.
  if (stderr !== "") {
    console.log("stderr: " + stderr);
  }
  if (error !== null) {
    console.error("\x1b[91m%s\x1b[0m", "exec error: " + error);
  }
}
