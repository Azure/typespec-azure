// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

// Markdown-driven snapshot tests for the Go emitter.
//
// Each `.md` scenario file contains one or more scenarios. A scenario provides a
// TypeSpec input block and one or more expected Go output blocks; the runner
// compiles the TypeSpec with the Go emitter (entirely in memory, no filesystem
// or Go toolchain) and compares the generated Go source against the expected
// blocks. Run with SCENARIOS_UPDATE=true to (re)generate the expected output.

import type { EmitContext } from "@typespec/compiler";
import { resolvePath } from "@typespec/compiler";
import { createTester, resolveVirtualPath } from "@typespec/compiler/testing";
import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import path from "path";
import { assert, describe, it } from "vitest";
import * as codegen from "../../src/codegen/index.js";
import type { GoEmitterOptions } from "../../src/lib.js";
import { Adapter } from "../../src/tcgcadapter/adapter.js";

const SCENARIOS_UPDATE = process.env["SCENARIOS_UPDATE"] === "true";

// Base tester for most scenarios. Kept lean (no ARM) so the common case compiles
// quickly; ARM libraries are heavy to load and would slow every scenario.
const GoTester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@typespec/xml",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-client-generator-core",
  ],
})
  .import(
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@typespec/xml",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-client-generator-core",
  )
  .using("Http", "Rest", "Versioning", "Azure.Core", "Azure.ClientGenerator.Core");

// Tester that additionally loads Azure.ResourceManager for ARM scenarios. Only
// used when a scenario references ARM constructs (see pickTester) so non-ARM
// scenarios don't pay the ARM load cost.
const GoArmTester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@typespec/openapi",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
    "@azure-tools/typespec-client-generator-core",
  ],
})
  .import(
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
    "@azure-tools/typespec-client-generator-core",
  )
  .using(
    "Http",
    "Rest",
    "Versioning",
    "Azure.Core",
    "Azure.ResourceManager",
    "Azure.ClientGenerator.Core",
  );

/** Routes ARM scenarios to the ARM-enabled tester, everything else to the base. */
function pickTester(code: string) {
  return /armProviderNamespace|Azure\.ResourceManager|@armResource/.test(code)
    ? GoArmTester
    : GoTester;
}

/**
 * Compiles the given TypeSpec with the Go emitter and returns the generated Go
 * source files keyed by file name (for example `zz_models.go`). The emit runs
 * against an in-memory file host, so no files are written and no Go tooling
 * (gofmt / go mod tidy) is invoked.
 */
export async function emitGoFor(
  code: string,
  options: GoEmitterOptions = {},
  inputFiles: Record<string, string> = {},
): Promise<Map<string, string>> {
  // Additional input files (for example the `examples/**.json` that drive
  // sample generation) are injected into the in-memory file system at the exact
  // path given by their heading, mirroring the real on-disk layout. TCGC's
  // `createSdkContext` then loads `examples/**` from the project root and
  // attaches them to operations, which the emitter turns into
  // `*_example_test.go` files alongside the regular generated Go source.
  const tester = pickTester(code);
  let program;
  if (Object.keys(inputFiles).length > 0) {
    const instance = await tester.createInstance();
    for (const [filePath, content] of Object.entries(inputFiles)) {
      instance.fs.addTypeSpecFile(filePath, content);
    }
    ({ program } = await instance.compile(code));
  } else {
    ({ program } = await tester.compile(code));
  }

  const emitterOptions: Record<string, unknown> = { ...options };

  // `emitter-output-dir` is a standard emitter option that the compiler normally
  // resolves into EmitContext.emitterOutputDir; resolve it here (including the
  // `{output-dir}` template) since this helper drives the emitter directly. The
  // last path segment becomes the package name when a containing-module is used.
  const baseOutputDir = "tsp-output";
  let outputDir = baseOutputDir;
  if (emitterOptions["emitter-output-dir"]) {
    outputDir = String(emitterOptions["emitter-output-dir"]).replace(
      /\{output-dir\}/g,
      baseOutputDir,
    );
    delete emitterOptions["emitter-output-dir"];
  }
  // The portion of the output dir below {output-dir} (for example `subpkg` from
  // `{output-dir}/subpkg`). Emitted file paths are relative to emitterOutputDir,
  // so prefix them with this subpath to mirror the on-disk layout the real
  // emitter produces under {output-dir}.
  const subpath = outputDir.startsWith(`${baseOutputDir}/`)
    ? `${outputDir.slice(baseOutputDir.length + 1)}/`
    : "";

  // `module` and `containing-module` are mutually exclusive; only default the
  // module when the scenario specifies neither.
  if (!emitterOptions.module && !emitterOptions["containing-module"]) {
    emitterOptions.module = "testmodule";
  }
  const context = {
    program,
    emitterOutputDir: resolveVirtualPath(...outputDir.split("/")),
    options: emitterOptions,
  } as unknown as EmitContext<GoEmitterOptions>;

  const adapter = await Adapter.create(context);
  const codeModel = adapter.tcgcToGoCodeModel();

  let filePrefix = (emitterOptions["file-prefix"] as string | undefined) ?? "zz_";
  if (filePrefix.length > 0 && !filePrefix.endsWith("_")) {
    filePrefix += "_";
  }

  const files = new Map<string, string>();
  const emitter = new codegen.Emitter(
    codeModel,
    {
      exists: (name: string) => Promise.resolve(files.has(`${subpath}${name}`)),
      read: (name: string) => Promise.resolve(files.get(`${subpath}${name}`) ?? ""),
      write: (name: string, content: string) => {
        files.set(`${subpath}${name}`, content);
        return Promise.resolve();
      },
    },
    { filePrefix },
  );
  await emitter.emit("tsp");
  if (codeModel.options.generateExamples) {
    await emitter.emitExamples();
  }

  return files;
}

type EmitterFunction = (
  tsp: string,
  namedArgs: Record<string, string>,
  configs: Record<string, unknown>,
  inputFiles: Record<string, string>,
) => Promise<string>;

const NOT_GENERATED = "// (file was not generated)";

/**
 * Maps an output code-block heading to the generated Go file it should contain.
 * The heading after `go ` selects a file and may include a subdirectory:
 *   `go models`              -> zz_models.go
 *   `go client`              -> zz_<pkg>_client.go (matched by `_client.go` suffix)
 *   `go fake/rawjson_server` -> fake/zz_rawjson_server.go
 * The last path segment is the file base (spaces become `_`); an optional leading
 * segment selects the directory. Names are matched against `zz_<base>.go`, then
 * `<base>.go`, then any file ending in `_<base>.go` within the chosen directory.
 */
function resolveGoFile(files: Map<string, string>, name: string): string {
  const trimmed = name.trim();
  const slash = trimmed.lastIndexOf("/");
  const dir = slash >= 0 ? trimmed.slice(0, slash) : "";
  const base = (slash >= 0 ? trimmed.slice(slash + 1) : trimmed).trim().replace(/\s+/g, "_");
  const prefix = dir ? `${dir}/` : "";

  const direct = files.get(`${prefix}zz_${base}.go`) ?? files.get(`${prefix}${base}.go`);
  if (direct !== undefined) {
    return direct;
  }
  // Some files embed the package/client name (for example `zz_<pkg>_client.go`);
  // match by suffix, scoped to the requested directory (top level when none).
  for (const [fileName, content] of files) {
    if (dir) {
      if (!fileName.startsWith(`${dir}/`)) {
        continue;
      }
    } else if (fileName.includes("/")) {
      continue;
    }
    if (fileName.endsWith(`_${base}.go`)) {
      return content;
    }
  }
  return NOT_GENERATED;
}

/**
 * The parsed `yaml` config block of a scenario is passed through as emitter
 * options (kebab-case keys matching the emitter options, for example `module`,
 * `file-prefix`, `containing-module`, `emitter-output-dir`, `generate-fakes`).
 * This lets a scenario exercise the emitter under a specific configuration.
 */
function emitterOptionsFrom(configs: Record<string, unknown>): GoEmitterOptions {
  return configs as GoEmitterOptions;
}

const OUTPUT_CODE_BLOCK_TYPES: Record<string, EmitterFunction> = {
  // Snapshot of a whole generated Go file. The name after `go ` selects a file
  // and may include a subdirectory, e.g.
  //   ```go models                       -> zz_models.go
  //   ```go fake/widget_server            -> fake/zz_widget_server.go
  //   ```go employees_client_example_test -> zz_employees_client_example_test.go
  // Sample (`*_example_test.go`) files are matched the same way as any other
  // generated file; they only appear when `generate-samples` is set and one or
  // more `examples/**.json` input files are provided (see below).
  "go {name}": async (tsp, { name }, configs, inputFiles) => {
    const files = await emitGoFor(tsp, emitterOptionsFrom(configs), inputFiles);
    return resolveGoFile(files, name ?? "");
  },
};

interface CodeScenarioPart {
  kind: "code";
  heading: string;
  content: string;
}
interface TextScenarioPart {
  kind: "text";
  text: string;
}
type ScenarioPart = TextScenarioPart | CodeScenarioPart;

interface Scenario {
  only: boolean;
  skip: boolean;
  heading: string;
  parts: ScenarioPart[];
}
type ScenarioFile = Scenario[];

function readScenarios(fileContent: string): ScenarioFile {
  const [, ...rawParts] = fileContent.split(/^# /gm);
  const scenarios: Scenario[] = [];
  for (const part of rawParts) {
    const [rawHeading, ...lines] = part.split("\n");
    const isOnly = rawHeading!.startsWith("only: ");
    const isSkip = rawHeading!.startsWith("skip: ");
    const heading = isOnly
      ? rawHeading!.substring("only: ".length)
      : isSkip
        ? rawHeading!.substring("skip: ".length)
        : rawHeading!;
    const content = lines.join("\n");

    const partStrings = content.split(/^```/gm);
    let inCodeBlock = false;
    const parts: ScenarioPart[] = [];
    for (const contentPart of partStrings) {
      if (inCodeBlock) {
        const [codeBlockHeading, ...blockLines] = contentPart.split("\n");
        parts.push({
          kind: "code",
          heading: codeBlockHeading ?? "",
          content: blockLines.join("\n"),
        });
      } else {
        parts.push({ kind: "text", text: contentPart });
      }
      inCodeBlock = !inCodeBlock;
    }

    scenarios.push({ only: Boolean(isOnly), skip: Boolean(isSkip), heading, parts });
  }
  return scenarios;
}

function writeScenarios(file: ScenarioFile): string {
  let output = "";
  for (const scenario of file) {
    const prefix = scenario.only ? "only: " : scenario.skip ? "skip: " : "";
    output += `# ${prefix}${scenario.heading}\n`;
    for (const part of scenario.parts) {
      if (part.kind === "text") {
        output += part.text;
      } else {
        output += `\`\`\`${part.heading}\n${part.content}\`\`\``;
      }
    }
  }
  return output;
}

// Minimal parser for the flat `key: value` config blocks used by scenarios.
// Values are coerced to boolean / number / JSON where possible, else kept as
// strings. Nested structures are not supported (none are needed).
function parseYaml(yamlConfigs: string[]): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const yaml of yamlConfigs) {
    for (const rawLine of yaml.split("\n")) {
      const line = rawLine.trim();
      if (line === "" || line.startsWith("#")) {
        continue;
      }
      const idx = line.indexOf(":");
      if (idx === -1) {
        continue;
      }
      const key = line.slice(0, idx).trim();
      const rawValue = line.slice(idx + 1).trim();
      let value: unknown = rawValue;
      if (rawValue === "true") {
        value = true;
      } else if (rawValue === "false") {
        value = false;
      } else if (rawValue !== "" && !isNaN(Number(rawValue))) {
        value = Number(rawValue);
      } else if (rawValue.startsWith("{") || rawValue.startsWith("[")) {
        try {
          value = JSON.parse(rawValue);
        } catch {
          value = rawValue;
        }
      }
      record[key] = value;
    }
  }
  return record;
}

function normalize(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\s+$/g, "").trimStart();
}

/**
 * True for code-block headings that describe an additional compiler input file
 * to place in the virtual file system, e.g. `json examples/Foo.json`. The
 * heading is `<syntax-tag> <virtual-path>` where the path carries a file
 * extension. Output headings such as `go models` or `go fake/rawjson_server`
 * name a generated file by its base (no extension) and are therefore excluded,
 * as are the reserved `tsp`/`typespec`/`yaml` input tags handled separately.
 */
function isInputFileBlock(heading: string): boolean {
  const parts = heading.trim().split(/\s+/);
  if (parts.length !== 2) {
    return false;
  }
  const [tag, filePath] = parts as [string, string];
  if (tag === "go" || tag === "tsp" || tag === "typespec" || tag === "yaml") {
    return false;
  }
  const lastSegment = filePath.slice(filePath.lastIndexOf("/") + 1);
  return lastSegment.includes(".");
}

export function describeScenarioDir(location: string): void {
  for (const child of readdirSync(location)) {
    const fullPath = path.join(location, child);
    if (statSync(fullPath).isFile() && child.endsWith(".md")) {
      describeScenarioFile(fullPath);
    }
  }
}

export function describeScenarioFile(scenarioFile: string): void {
  describe(path.basename(scenarioFile), () => {
    const scenarios = readScenarios(readFileSync(scenarioFile, "utf-8"));
    for (const scenario of scenarios) {
      if (scenario.skip) {
        describe.skip(scenario.heading, () => {});
        continue;
      }
      (scenario.only ? describe.only : describe)(scenario.heading, () => {
        const codeBlocks = scenario.parts.filter((x): x is CodeScenarioPart => x.kind === "code");
        const tspBlocks = codeBlocks.filter(
          (x) => x.heading.startsWith("tsp") || x.heading.startsWith("typespec"),
        );
        const yamlConfigs = codeBlocks.filter((x) => x.heading.startsWith("yaml"));
        const configs = parseYaml(yamlConfigs.map((x) => x.content));
        // Input-file blocks are written verbatim into the in-memory file system
        // at the virtual path given by their heading (the token after the syntax
        // tag), e.g. ```json examples/Employees_get.json. This is how additional
        // compiler inputs such as the `examples/**.json` that drive sample
        // generation are supplied; the routing is purely filename-based.
        const inputFileBlocks = codeBlocks.filter((x) => isInputFileBlock(x.heading));
        const inputFiles: Record<string, string> = {};
        for (const block of inputFileBlocks) {
          const filePath = block.heading.trim().split(/\s+/)[1];
          if (filePath) {
            inputFiles[filePath] = block.content;
          }
        }
        const outputBlocks = codeBlocks.filter(
          (x) => !tspBlocks.includes(x) && !yamlConfigs.includes(x) && !inputFileBlocks.includes(x),
        );
        const inputTsp = tspBlocks.map((x) => x.content).join("\n");

        const testCases = outputBlocks
          .map((block) => {
            for (const [template, fn] of Object.entries(OUTPUT_CODE_BLOCK_TYPES)) {
              const templateRegex = new RegExp(
                "^" + template.replace(/\{(\w+)\}/g, "(?<$1>.+)") + "$",
              );
              const match = block.heading.replace(/(\r\n|\n|\r)/gm, "").match(templateRegex);
              if (match !== null) {
                return { block, fn, args: match.groups ?? {} };
              }
            }
            return undefined;
          })
          .filter((x): x is NonNullable<typeof x> => x !== undefined);

        // A scenario with input (tsp) but no recognized output block would
        // silently do nothing under `pnpm test:update` — the harness only
        // (re)generates the content of `go <name>` output blocks. Surface that
        // as an explicit failure so a new scenario doesn't look like it "passed"
        // while producing no Go. Add an output block such as ```go models
        // (its body can start empty) for each generated file you want to snapshot.
        if (tspBlocks.length > 0 && testCases.length === 0) {
          it("has at least one output block", () => {
            assert.fail(
              `Scenario "${scenario.heading}" has a tsp block but no output block. ` +
                "Add a code block like ```go <name> (e.g. ```go models) — its body can " +
                "start empty and `pnpm test:update` will fill it with the generated Go.",
            );
          });
        }

        for (const testCase of testCases) {
          it(testCase.block.heading, async () => {
            const result = await testCase.fn(inputTsp, testCase.args, configs, inputFiles);

            if (SCENARIOS_UPDATE) {
              testCase.block.content = result.endsWith("\n") ? result : result + "\n";
              writeFileSync(scenarioFile, writeScenarios(scenarios));
            }

            assert.strictEqual(
              normalize(result),
              normalize(testCase.block.content),
              `Generated Go output for "${testCase.block.heading}" did not match. ` +
                `Re-run with SCENARIOS_UPDATE=true to update the snapshot.`,
            );
          });
        }
      });
    }
  });
}
