/* eslint-disable no-console */

import rulesetsPkg from "@microsoft.azure/openapi-validator-rulesets";
import spectralPkg from "@stoplight/spectral-core";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { BaselineEvidence } from "./native-coverage.js";

const { Spectral } = spectralPkg;
const { spectralRulesets, deleteRulesPropertiesInPayloadNotValidForSpectralRules } = rulesetsPkg;
const require = createRequire(import.meta.url);
type StagingRule = (typeof spectralRulesets.azARM.rules)[string];
const identity = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export interface StagingObservation {
  rule: string;
  level: string;
  project: string;
  swaggerFile: string;
  validatorInputFile: string;
  sourceDocuments: string[];
  sourceAttribution: "reported" | "input-fallback";
  message: string;
  path: Array<string | number>;
}

interface InputReceipt {
  project: string;
  swaggerFile: string;
  status: "success" | "failed";
  rawFile: string;
  error?: string;
}

export interface StagingSupplement {
  schemaVersion: 1;
  profile: "arm-staging-spectral";
  status: "complete" | "failed";
  startedAt: string;
  finishedAt: string;
  parentBaselineIdentity: string;
  specsCommit: string;
  swaggerGeneration: "not-run";
  rules: string[];
  runtime: {
    nodeVersion: string;
    packages: Array<{ name: string; version: string; contentIdentity: string }>;
    producerSha256: string;
    lockfileSha256: string;
  };
  inputs: InputReceipt[];
  files: Array<{ file: string; sha256: string }>;
}

function write(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function fileWithin(root: string, relative: string): string {
  const parts = relative.split(/[\\/]/);
  if (
    !relative ||
    path.isAbsolute(relative) ||
    parts.some((part) => !part || part === "." || part === ".." || /[:\0]/.test(part))
  ) {
    throw new Error(`Unsafe evidence path: ${relative}`);
  }
  let file = root;
  if (fs.lstatSync(root).isSymbolicLink()) throw new Error("Symlinked evidence root.");
  for (const part of parts) {
    file = path.join(file, part);
    if (fs.lstatSync(file).isSymbolicLink()) throw new Error("Symlinked evidence file.");
  }
  return file;
}

function inventory(root: string, prefix = ""): Array<{ file: string; sha256: string }> {
  if (fs.lstatSync(root).isSymbolicLink()) throw new Error("Symlinked evidence root.");
  return fs
    .readdirSync(prefix ? fileWithin(root, prefix) : root, { withFileTypes: true })
    .flatMap((entry) => {
      const file = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) throw new Error("Symlinked supplement file.");
      if (entry.isDirectory()) return inventory(root, file);
      if (!entry.isFile()) throw new Error("Unsupported supplement file.");
      return [
        {
          file,
          sha256: createHash("sha256")
            .update(fs.readFileSync(fileWithin(root, file)))
            .digest("hex"),
        },
      ];
    })
    .sort((a, b) => a.file.localeCompare(b.file));
}

export function stagingRules(): Record<string, StagingRule> {
  return Object.fromEntries(
    Object.entries({ ...spectralRulesets.azCommon.rules, ...spectralRulesets.azARM.rules }).filter(
      ([, rule]) =>
        rule && typeof rule === "object" && "stagingOnly" in rule && rule.stagingOnly === true,
    ),
  );
}

export function selectStagingRules(requested: string[]): Record<string, StagingRule> {
  const available = stagingRules();
  const names = requested.length ? requested : Object.keys(available).sort();
  if (names.length === 0 || new Set(names).size !== names.length) {
    throw new Error("Expected distinct ARM/common staging-only Spectral rules.");
  }
  return Object.fromEntries(
    names.map((name) => {
      if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(name) || !Object.hasOwn(available, name)) {
        throw new Error(`Not an ARM/common staging-only Spectral rule: ${name}`);
      }
      return [name, available[name]];
    }),
  );
}

function packageReceipt(name: string) {
  let root = path.dirname(require.resolve(name));
  while (!fs.existsSync(path.join(root, "package.json"))) {
    const parent = path.dirname(root);
    if (parent === root) throw new Error(`Missing package metadata: ${name}`);
    root = parent;
  }
  const file = path.join(root, "package.json");
  const metadata = JSON.parse(fs.readFileSync(file, "utf8"));
  if (metadata.name !== name) throw new Error(`Unexpected package metadata: ${name}`);
  const files = [
    {
      file: "package.json",
      sha256: createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
    },
    ...inventory(path.join(root, "dist")).map((item) => ({ ...item, file: `dist/${item.file}` })),
  ];
  return { name, version: metadata.version as string, contentIdentity: identity(files) };
}

function sourceFile(root: string, source: string): string {
  const file = source.startsWith("file:") ? fileURLToPath(source) : source;
  return fileWithin(root, path.relative(root, file));
}

function checkReferences(root: string, file: string, seen = new Set<string>()): void {
  if (seen.has(file)) return;
  seen.add(file);
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if ("$ref" in value && typeof value.$ref === "string" && !value.$ref.startsWith("#")) {
      const url = new URL(value.$ref, pathToFileURL(file));
      if (url.protocol !== "file:") throw new Error(`Nonlocal reference: ${value.$ref}`);
      url.hash = "";
      checkReferences(root, sourceFile(root, url.href), seen);
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(JSON.parse(fs.readFileSync(file, "utf8")));
}

function physicalPath(file: string): string {
  const suffix: string[] = [];
  let ancestor = path.resolve(file);
  while (!fs.existsSync(ancestor)) {
    suffix.unshift(path.basename(ancestor));
    const parent = path.dirname(ancestor);
    if (parent === ancestor) throw new Error(`Missing filesystem root: ${file}`);
    ancestor = parent;
  }
  return path.join(fs.realpathSync(ancestor), ...suffix);
}

export async function produceStagingSupplement(
  baselineRun: string,
  output: string,
  requestedRules: string[] = [],
): Promise<StagingSupplement> {
  const { verifyBaselineRun } = await import("./native-coverage.js");
  const selected = selectStagingRules(requestedRules);
  baselineRun = physicalPath(baselineRun);
  output = physicalPath(output);
  const relative = path.relative(baselineRun, output);
  if (
    (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative)) ||
    fs.existsSync(output)
  ) {
    throw new Error("Supplement output must be new and outside the immutable baseline.");
  }
  const { evidence, datasetDir } = verifyBaselineRun(baselineRun);
  if (evidence.context.filter !== undefined || evidence.context.limit !== undefined) {
    throw new Error("Shared staging supplements require the full baseline population.");
  }
  const metadata = JSON.parse(fs.readFileSync(path.join(datasetDir, "_meta.json"), "utf8"));
  const rules = Object.keys(selected);
  const ruleset = { rules: copyRules(selected) };
  deleteRulesPropertiesInPayloadNotValidForSpectralRules(ruleset);
  const spectral = new Spectral();
  spectral.setRuleset(ruleset);
  const data = path.join(output, "data");
  fs.mkdirSync(data, { recursive: true });
  const results = new Map(rules.map((rule) => [rule, [] as StagingObservation[]]));
  const manifest: StagingSupplement = {
    schemaVersion: 1,
    profile: "arm-staging-spectral",
    status: "failed",
    startedAt: new Date().toISOString(),
    finishedAt: "",
    parentBaselineIdentity: identity(evidence),
    specsCommit: evidence.context.specsCommit,
    swaggerGeneration: "not-run",
    rules,
    runtime: {
      nodeVersion: process.version,
      packages: ["@microsoft.azure/openapi-validator-rulesets", "@stoplight/spectral-core"].map(
        packageReceipt,
      ),
      producerSha256: createHash("sha256")
        .update(fs.readFileSync(fileURLToPath(import.meta.url)))
        .digest("hex"),
      lockfileSha256: createHash("sha256")
        .update(
          fs.readFileSync(
            path.resolve(import.meta.dirname, "..", "..", "..", "..", "pnpm-lock.yaml"),
          ),
        )
        .digest("hex"),
    },
    inputs: [],
    files: [],
  };
  write(path.join(output, "manifest.json"), manifest);
  for (const project of metadata.projects) {
    for (const swaggerFile of project.swaggerFiles) {
      const rawFile = `raw/${manifest.inputs.length}.json`;
      const receipt: InputReceipt = {
        project: project.sourcePath,
        swaggerFile,
        status: "failed",
        rawFile,
      };
      try {
        const file = fileWithin(datasetDir, swaggerFile);
        checkReferences(datasetDir, file);
        const diagnostics = await spectral.run({
          parsed: {
            data: JSON.parse(fs.readFileSync(file, "utf8")),
            diagnostics: [],
            ast: null,
            lineMap: [],
          },
          source: file.replace(/\\/g, "/"),
          getLocationForJsonPath: () => undefined,
        });
        const normalized = diagnostics.map((diagnostic) => ({
          code: String(diagnostic.code),
          severity: diagnostic.severity,
          message: diagnostic.message,
          path: diagnostic.path,
          source: diagnostic.source
            ? path
                .relative(datasetDir, sourceFile(datasetDir, diagnostic.source))
                .replace(/\\/g, "/")
            : swaggerFile,
          sourceAttribution: diagnostic.source
            ? ("reported" as const)
            : ("input-fallback" as const),
        }));
        write(path.join(data, rawFile), normalized);
        const infrastructure = normalized.filter((item) => !results.has(item.code));
        if (infrastructure.length)
          throw new Error(
            `Non-rule diagnostics: ${infrastructure.map((item) => item.code).join(", ")}`,
          );
        for (const diagnostic of normalized) {
          results.get(diagnostic.code)!.push({
            rule: diagnostic.code,
            level: ["error", "warning", "information", "hint"][diagnostic.severity],
            project: project.sourcePath,
            swaggerFile: diagnostic.source,
            validatorInputFile: swaggerFile,
            sourceDocuments: diagnostic.sourceAttribution === "reported" ? [diagnostic.source] : [],
            sourceAttribution: diagnostic.sourceAttribution,
            message: diagnostic.message,
            path: diagnostic.path,
          });
        }
        receipt.status = "success";
      } catch (error) {
        receipt.error = String(error).replaceAll(datasetDir, "$BASELINE_DATASET");
        if (!fs.existsSync(path.join(data, rawFile)))
          write(path.join(data, rawFile), { error: receipt.error });
      }
      manifest.inputs.push(receipt);
    }
  }
  for (const [rule, observations] of results) {
    write(path.join(data, "rules", `${rule}.json`), {
      schemaVersion: 1,
      rule,
      count: observations.length,
      levels: observations.reduce<Record<string, number>>((levels, item) => {
        levels[item.level] = (levels[item.level] ?? 0) + 1;
        return levels;
      }, {}),
      results: observations,
    });
  }
  verifyBaselineRun(baselineRun);
  manifest.files = inventory(data);
  manifest.status = manifest.inputs.every((item) => item.status === "success")
    ? "complete"
    : "failed";
  manifest.finishedAt = new Date().toISOString();
  write(path.join(output, "manifest.json"), manifest);
  return manifest;
}

function copyRules(selected: Record<string, StagingRule>) {
  // Spectral rules contain functions, which structuredClone cannot copy.
  return Object.fromEntries(Object.entries(selected).map(([name, rule]) => [name, { ...rule }]));
}

export function readStagingSupplement(
  directory: string,
  baseline: BaselineEvidence,
  requested: string[],
): { manifest: StagingSupplement; identity: string; members: Map<string, StagingObservation[]> } {
  const manifest: StagingSupplement = JSON.parse(
    fs.readFileSync(fileWithin(directory, "manifest.json"), "utf8"),
  );
  if (
    manifest.schemaVersion !== 1 ||
    manifest.profile !== "arm-staging-spectral" ||
    manifest.status !== "complete" ||
    manifest.swaggerGeneration !== "not-run" ||
    manifest.parentBaselineIdentity !== identity(baseline) ||
    manifest.specsCommit !== baseline.context.specsCommit ||
    !manifest.runtime ||
    !/^v\d+\.\d+\.\d+$/.test(manifest.runtime.nodeVersion) ||
    !/^[a-f0-9]{64}$/.test(manifest.runtime.producerSha256) ||
    !/^[a-f0-9]{64}$/.test(manifest.runtime.lockfileSha256) ||
    !Array.isArray(manifest.runtime.packages) ||
    manifest.runtime.packages.length !== 2 ||
    ["@microsoft.azure/openapi-validator-rulesets", "@stoplight/spectral-core"].some(
      (name) =>
        !manifest.runtime.packages.some(
          (item) =>
            item.name === name && item.version && /^[a-f0-9]{64}$/.test(item.contentIdentity),
        ),
    ) ||
    !manifest.finishedAt ||
    !Number.isFinite(Date.parse(manifest.finishedAt)) ||
    !Array.isArray(manifest.rules) ||
    !manifest.rules.length ||
    new Set(manifest.rules).size !== manifest.rules.length ||
    manifest.rules.some((rule) => !/^[A-Za-z][A-Za-z0-9._-]*$/.test(rule))
  )
    throw new Error("Incomplete or incompatible staging supplement.");
  const data = fileWithin(directory, "data");
  if (identity(inventory(data)) !== identity(manifest.files))
    throw new Error("Staging supplement inventory mismatch.");
  const expected = baseline.projects.flatMap((project) =>
    (project as unknown as { swaggerFiles: string[] }).swaggerFiles.map((swaggerFile) => [
      project.sourcePath,
      swaggerFile,
    ]),
  );
  if (
    identity(manifest.inputs.map((item) => [item.project, item.swaggerFile])) !==
      identity(expected) ||
    manifest.inputs.some((item) => item.status !== "success")
  ) {
    throw new Error("Staging supplement population is incomplete or failed.");
  }
  for (const input of manifest.inputs) fileWithin(data, input.rawFile);
  const members = new Map<string, StagingObservation[]>();
  const projects = new Set(baseline.projects.map((project) => project.sourcePath));
  const baselineFiles = new Set(baseline.files.map((file) => file.file.replace(/\\/g, "/")));
  const inputs = new Set(
    manifest.inputs.map((input) => identity([input.project, input.swaggerFile])),
  );
  for (const rule of manifest.rules) {
    const shard = JSON.parse(fs.readFileSync(fileWithin(data, `rules/${rule}.json`), "utf8"));
    if (
      shard.schemaVersion !== 1 ||
      shard.rule !== rule ||
      !Array.isArray(shard.results) ||
      shard.count !== shard.results.length ||
      shard.results.some(
        (item: StagingObservation) =>
          item.rule !== rule ||
          !projects.has(item.project) ||
          !Array.isArray(item.path) ||
          !["error", "warning", "information", "hint"].includes(item.level) ||
          typeof item.message !== "string" ||
          !["reported", "input-fallback"].includes(item.sourceAttribution) ||
          !Array.isArray(item.sourceDocuments) ||
          identity(item.sourceDocuments) !==
            identity(item.sourceAttribution === "reported" ? [item.swaggerFile] : []) ||
          item.path.some((part) => typeof part !== "string" && typeof part !== "number") ||
          !inputs.has(identity([item.project, item.validatorInputFile])) ||
          typeof item.swaggerFile !== "string" ||
          !baselineFiles.has(item.swaggerFile.replace(/\\/g, "/")),
      )
    ) {
      throw new Error(`Invalid staging shard: ${rule}`);
    }
    const levels = shard.results.reduce(
      (counts: Record<string, number>, item: StagingObservation) => {
        counts[item.level] = (counts[item.level] ?? 0) + 1;
        return counts;
      },
      {},
    );
    if (identity(levels) !== identity(shard.levels))
      throw new Error(`Invalid staging severity totals: ${rule}`);
    members.set(rule, shard.results);
  }
  if (requested.some((rule) => !members.has(rule)))
    throw new Error("Selected rule was not evaluated by the staging supplement.");
  return { manifest, identity: identity(manifest), members };
}

async function main() {
  const args = process.argv.slice(2);
  const values = new Map<string, string>();
  const rules: string[] = [];
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (
      !["--baseline-run", "--output", "--verify-supplement", "--validator-rule"].includes(name) ||
      !value ||
      value.startsWith("--")
    ) {
      throw new Error(`Unknown argument or missing value: ${name}`);
    }
    if (name === "--validator-rule") rules.push(value);
    else if (values.has(name)) throw new Error(`Duplicate argument: ${name}`);
    else values.set(name, value);
  }
  if (!values.has("--baseline-run") || values.has("--output") === values.has("--verify-supplement"))
    throw new Error(
      "--baseline-run and exactly one of --output or --verify-supplement are required.",
    );
  if (values.has("--verify-supplement")) {
    const { verifyBaselineRun } = await import("./native-coverage.js");
    const { evidence } = verifyBaselineRun(path.resolve(values.get("--baseline-run")!));
    const result = readStagingSupplement(
      path.resolve(values.get("--verify-supplement")!),
      evidence,
      rules,
    );
    console.log(
      JSON.stringify({
        status: "verified",
        supplementIdentity: result.identity,
        parentBaselineIdentity: result.manifest.parentBaselineIdentity,
        rules: result.manifest.rules,
        swaggerGeneration: "not-run",
      }),
    );
    return;
  }
  const result = await produceStagingSupplement(
    values.get("--baseline-run")!,
    values.get("--output")!,
    rules,
  );
  console.log(
    JSON.stringify({
      status: result.status,
      rules: result.rules,
      inputs: result.inputs.length,
      failedInputs: result.inputs.filter((item) => item.status !== "success").length,
    }),
  );
  if (result.status !== "complete") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
