/* eslint-disable no-console */

import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";

export interface NativeDiagnostic {
  rule: string;
  message: string;
  sourceFile?: string;
  line?: number;
  column?: number;
}

export interface NativePackage {
  name: string;
  version: string;
  entrypoint: string;
  sha256?: string;
}

export interface NativeProjectResult {
  project: string;
  status: "success" | "failed";
  assessmentMode?: "package-evidence";
  nativePackage?: string;
  error?: string;
  rawDiagnostics: NativeDiagnostic[];
  diagnostics: NativeDiagnostic[];
  packages: NativePackage[];
  defaultTargetDiagnostics?: Array<{ rule: string; message: string }>;
  defaultActivation?: "not-assessed";
}

interface DatasetProject {
  sourcePath: string;
  apiVersion?: string;
  compileStatus: string;
  validationStatus: string;
}

interface ValidatorDiagnostic {
  rule?: string;
  project: string;
  swaggerFile: string;
  path: Array<string | number>;
}

interface ProjectCounts {
  project: string;
  apiVersion?: string;
  validatorRawCount: number;
  validatorFileIndependentCount: number;
  nativeRawCount: number;
  nativeDefaultCount: number | null;
  nativeAlignedCount: number;
  nativeSourceCount: number;
  nativeLocationlessCount: number;
  difference: number;
  rawDifference: number;
}

export interface Config {
  candidateRepo: string;
  specsRepo: string;
  tgzDir: string;
  output: string;
  validatorRule: string;
  validatorRules: string[];
  tspRules: string[];
  nativePackage?: string;
  scope: "source" | "http-reachable" | "boolean-http";
  concurrency: number;
  filter?: string;
  limit?: number;
  baselineRun?: string;
  baselineCompatibilityReceipt?: string;
  baselinePolicy?: "strict" | "frozen-reference";
  candidateWorkingTree?: boolean;
  nativeBudgetSeconds?: number;
  nativeMode?: "configured" | "target-only";
}

export function parseNativeCoverageArgs(args: string[]): Config {
  const values = new Map<string, string>();
  const tspRules: string[] = [];
  const validatorRules: string[] = [];
  const names = new Set([
    "--candidate-repo",
    "--specs-repo",
    "--tgz-dir",
    "--output",
    "--validator-rule",
    "--tsp-rule",
    "--native-package",
    "--scope",
    "--concurrency",
    "--filter",
    "--limit",
    "--baseline-run",
    "--baseline-compatibility-receipt",
    "--baseline-policy",
    "--candidate-working-tree",
    "--native-budget-seconds",
    "--native-mode",
  ]);
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!names.has(name) || !value || value.startsWith("--")) {
      throw new Error(`Unknown argument or missing value: ${name}`);
    }
    if (name === "--validator-rule") {
      if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(value) || validatorRules.includes(value)) {
        throw new Error(`Invalid or duplicate validator rule: ${value}`);
      }
      validatorRules.push(value);
    } else if (name === "--tsp-rule") {
      if (!/^@azure-tools\/[^/]+\/[^/]+$/.test(value) || tspRules.includes(value)) {
        throw new Error(`Invalid or duplicate official rule: ${value}`);
      }
      tspRules.push(value);
    } else {
      if (values.has(name)) throw new Error(`Duplicate argument: ${name}`);
      values.set(name, value);
    }
  }
  const required = (name: string) => {
    const value = values.get(name);
    if (!value) throw new Error(`Missing required argument: ${name}`);
    return value;
  };
  const positiveInteger = (name: string, fallback?: number) => {
    const value = values.get(name);
    if (value === undefined) return fallback;
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
      throw new Error(`${name} must be a positive integer.`);
    }
    return Number(value);
  };
  const scope = values.get("--scope") ?? "source";
  if (scope !== "source" && scope !== "http-reachable" && scope !== "boolean-http") {
    throw new Error(`Unsupported comparison scope: ${scope}`);
  }
  const nativePackage = values.get("--native-package");
  if (nativePackage !== undefined) {
    if (
      !/^@azure-tools\/typespec-(azure-core|azure-resource-manager|client-generator-core)$/.test(
        nativePackage,
      )
    ) {
      throw new Error("--native-package must name an official native destination package.");
    }
    if (tspRules.length > 0 || scope !== "source") {
      throw new Error("--native-package evidence requires source scope and no --tsp-rule.");
    }
  } else if (tspRules.length === 0) {
    throw new Error("At least one --tsp-rule or an explicit --native-package is required.");
  }
  if (validatorRules.length === 0) throw new Error("At least one --validator-rule is required.");
  if (validatorRules.length > 1 && tspRules.length > 1) {
    throw new Error("General many-to-many mappings are not supported.");
  }
  if (values.has("--baseline-compatibility-receipt") && !values.has("--baseline-run")) {
    throw new Error("--baseline-compatibility-receipt requires --baseline-run.");
  }
  const baselinePolicy = values.get("--baseline-policy") ?? "strict";
  if (baselinePolicy !== "strict" && baselinePolicy !== "frozen-reference") {
    throw new Error(`Unsupported baseline policy: ${baselinePolicy}`);
  }
  if (
    baselinePolicy === "frozen-reference" &&
    (!values.has("--baseline-run") || values.has("--baseline-compatibility-receipt"))
  ) {
    throw new Error("frozen-reference requires --baseline-run without a lint-only receipt.");
  }
  const candidateWorkingTree = values.get("--candidate-working-tree") ?? "false";
  if (candidateWorkingTree !== "true" && candidateWorkingTree !== "false") {
    throw new Error("--candidate-working-tree must be true or false.");
  }
  const nativeMode = values.get("--native-mode") ?? "configured";
  if (nativeMode !== "configured" && nativeMode !== "target-only") {
    throw new Error(`Unsupported native mode: ${nativeMode}`);
  }
  const nativeBudgetSeconds = positiveInteger("--native-budget-seconds");
  if (nativeBudgetSeconds !== undefined && nativeBudgetSeconds > 2_147_483) {
    throw new Error("--native-budget-seconds exceeds the supported timer range.");
  }
  if (
    scope === "boolean-http" &&
    (tspRules.length !== 1 || tspRules[0] !== "@azure-tools/typespec-azure-core/no-boolean")
  ) {
    throw new Error("boolean-http alignment is supported only for Azure Core no-boolean.");
  }
  return {
    candidateRepo: required("--candidate-repo"),
    specsRepo: required("--specs-repo"),
    tgzDir: required("--tgz-dir"),
    output: required("--output"),
    validatorRule: validatorRules[0],
    validatorRules,
    tspRules,
    nativePackage,
    scope,
    concurrency: positiveInteger("--concurrency", 2)!,
    filter: values.get("--filter"),
    limit: positiveInteger("--limit"),
    baselineRun: values.get("--baseline-run"),
    baselineCompatibilityReceipt: values.get("--baseline-compatibility-receipt"),
    baselinePolicy,
    candidateWorkingTree: candidateWorkingTree === "true",
    nativeBudgetSeconds,
    nativeMode,
  };
}

function sourceIdentity(diagnostic: NativeDiagnostic, index: number): string {
  return diagnostic.sourceFile !== undefined &&
    diagnostic.line !== undefined &&
    diagnostic.column !== undefined
    ? JSON.stringify([diagnostic.rule, diagnostic.sourceFile, diagnostic.line, diagnostic.column])
    : `locationless:${index}`;
}

export function buildNativeCoverageReport(
  projects: DatasetProject[],
  validator: ValidatorDiagnostic[],
  native: NativeProjectResult[],
  validatorRules = [...new Set(validator.map((item) => item.rule ?? "unspecified"))],
) {
  const selected = new Set<string>();
  for (const project of projects) {
    if (selected.has(project.sourcePath)) throw new Error("Duplicate dataset project.");
    selected.add(project.sourcePath);
  }
  const receipts = new Map<string, NativeProjectResult>();
  for (const receipt of native) {
    if (receipts.has(receipt.project)) throw new Error("Duplicate native project receipt.");
    if (!selected.has(receipt.project))
      throw new Error("Native receipt outside selected population.");
    receipts.set(receipt.project, receipt);
  }
  if (validator.some((diagnostic) => !selected.has(diagnostic.project))) {
    throw new Error("Validator diagnostic outside selected population.");
  }
  const unassessedProjects: Array<{ project: string; reason: string }> = [];
  const rows: ProjectCounts[] = [];
  let unassessedValidatorRawCount = 0;
  for (const project of projects) {
    const receipt = receipts.get(project.sourcePath);
    if (!receipt) throw new Error(`Missing native project receipt: ${project.sourcePath}`);
    const swagger = validator.filter((diagnostic) => diagnostic.project === project.sourcePath);
    if (
      project.compileStatus !== "success" ||
      project.validationStatus !== "success" ||
      receipt.status !== "success"
    ) {
      unassessedProjects.push({
        project: project.sourcePath,
        reason:
          receipt.error ??
          `Swagger compile=${project.compileStatus}, validation=${project.validationStatus}`,
      });
      unassessedValidatorRawCount += swagger.length;
      continue;
    }
    const validatorFileIndependentCount = new Set(
      swagger.map((item) => JSON.stringify([item.rule, item.path])),
    ).size;
    const nativeSourceCount = new Set(receipt.diagnostics.map(sourceIdentity)).size;
    rows.push({
      project: project.sourcePath,
      apiVersion: project.apiVersion,
      validatorRawCount: swagger.length,
      validatorFileIndependentCount,
      nativeRawCount: receipt.rawDiagnostics.length,
      nativeDefaultCount:
        receipt.defaultActivation === "not-assessed"
          ? null
          : (receipt.defaultTargetDiagnostics?.length ?? 0),
      nativeAlignedCount: receipt.diagnostics.length,
      nativeSourceCount,
      nativeLocationlessCount: receipt.diagnostics.filter(
        (item) =>
          item.sourceFile === undefined || item.line === undefined || item.column === undefined,
      ).length,
      difference: validatorFileIndependentCount - nativeSourceCount,
      rawDifference: swagger.length - receipt.diagnostics.length,
    });
  }
  const validatorProjects = rows
    .filter((row) => row.validatorRawCount > 0)
    .map((row) => row.project)
    .sort();
  const nativeProjects = rows
    .filter((row) => row.nativeAlignedCount > 0)
    .map((row) => row.project)
    .sort();
  const validatorSet = new Set(validatorProjects);
  const nativeSet = new Set(nativeProjects);
  const assessable = new Set(rows.map((row) => row.project));
  const overlapProjects = validatorProjects.filter((project) => nativeSet.has(project));
  const sum = (
    field:
      | "validatorRawCount"
      | "validatorFileIndependentCount"
      | "nativeRawCount"
      | "nativeAlignedCount"
      | "nativeSourceCount"
      | "nativeLocationlessCount",
  ) => rows.reduce((total, row) => total + row[field], 0);
  return {
    schemaVersion: 2,
    equivalence: "not-determined" as const,
    countingUnit:
      "sum of raw member validator occurrences versus aligned native diagnostics, counted once",
    crossValidatorOverlap: "not-normalized; shared paths do not establish semantic identity",
    memberNativeAttribution: "unavailable; member-specific semantic tests are required",
    members: validatorRules.map((rule) => {
      const observations = validator.filter((item) => (item.rule ?? "unspecified") === rule);
      return {
        rule,
        rawCount: observations.length,
        assessableRawCount: observations.filter((item) => assessable.has(item.project)).length,
        unassessedRawCount: observations.filter((item) => !assessable.has(item.project)).length,
        observations,
        projects: [...new Set(observations.map((item) => item.project))].sort(),
        nativeAttribution: "unavailable",
        semanticCompleteness: "not-determined",
      };
    }),
    selectedProjectCount: projects.length,
    selectedValidatorRawCount: validator.length,
    assessableProjectCount: rows.length,
    unassessedProjects,
    unassessedValidatorRawCount,
    unassessedNativeRawCount: native
      .filter((item) => !assessable.has(item.project))
      .reduce((total, item) => total + item.rawDiagnostics.length, 0),
    validatorProjects,
    nativeProjects,
    overlapProjects,
    validatorOnlyProjects: validatorProjects.filter((project) => !nativeSet.has(project)),
    nativeOnlyProjects: nativeProjects.filter((project) => !validatorSet.has(project)),
    observedProjectCoveragePercent:
      validatorProjects.length === 0
        ? null
        : (overlapProjects.length / validatorProjects.length) * 100,
    validatorRawCount: sum("validatorRawCount"),
    validatorFileIndependentCount: sum("validatorFileIndependentCount"),
    nativeRawCount: sum("nativeRawCount"),
    nativeDefaultCount: native.some((item) => item.defaultActivation === "not-assessed")
      ? null
      : rows.reduce((total, item) => total + (item.nativeDefaultCount ?? 0), 0),
    defaultActivationUnassessedProjects: native
      .filter((item) => item.defaultActivation === "not-assessed")
      .map((item) => item.project)
      .sort(),
    nativeAlignedCount: sum("nativeAlignedCount"),
    nativeSourceCount: sum("nativeSourceCount"),
    nativeLocationlessCount: sum("nativeLocationlessCount"),
    rawValidatorExcess: rows.reduce((total, row) => total + Math.max(0, row.rawDifference), 0),
    rawNativeExcess: rows.reduce((total, row) => total + Math.max(0, -row.rawDifference), 0),
    projectsWithEqualRawCounts: rows.filter((row) => row.rawDifference === 0).length,
    projectsWithEqualCounts: rows.filter((row) => row.difference === 0).length,
    validatorExcess: rows.reduce((total, row) => total + Math.max(0, row.difference), 0),
    nativeExcess: rows.reduce((total, row) => total + Math.max(0, -row.difference), 0),
    projects: rows.sort(
      (left, right) =>
        Math.abs(right.rawDifference) - Math.abs(left.rawDifference) ||
        Math.abs(right.difference) - Math.abs(left.difference) ||
        left.project.localeCompare(right.project),
    ),
  };
}

export function buildNativePackageEvidenceReport(
  projects: DatasetProject[],
  validator: ValidatorDiagnostic[],
  native: NativeProjectResult[],
  nativePackage: string,
  validatorRules: string[],
) {
  for (const receipt of native) {
    if (
      receipt.status === "success" &&
      (receipt.assessmentMode !== "package-evidence" ||
        receipt.nativePackage !== nativePackage ||
        receipt.rawDiagnostics.length > 0 ||
        receipt.diagnostics.length > 0 ||
        (receipt.defaultTargetDiagnostics?.length ?? 0) > 0 ||
        !receipt.packages.some((item) => item.name === nativePackage))
    ) {
      throw new Error(`Invalid package-evidence receipt: ${receipt.project}`);
    }
  }
  const observations = buildNativeCoverageReport(projects, validator, native, validatorRules);
  return {
    schemaVersion: 3,
    assessmentMode: "package-evidence" as const,
    nativePackage,
    equivalence: "not-assessed" as const,
    countingUnit: "Swagger member observations only; no selected native lint diagnostic unit",
    nativeDiagnosticCounts: null,
    diagnosticComparison: null,
    observedProjectCoveragePercent: null,
    selectedProjectCount: observations.selectedProjectCount,
    selectedValidatorRawCount: observations.selectedValidatorRawCount,
    assessableProjectCount: observations.assessableProjectCount,
    validatorRawCount: observations.validatorRawCount,
    validatorFileIndependentCount: observations.validatorFileIndependentCount,
    validatorProjects: observations.validatorProjects,
    unassessedProjects: observations.unassessedProjects,
    unassessedValidatorRawCount: observations.unassessedValidatorRawCount,
    members: observations.members.map((member) => ({
      rule: member.rule,
      rawCount: member.rawCount,
      assessableRawCount: member.assessableRawCount,
      unassessedRawCount: member.unassessedRawCount,
      observations: member.observations,
      projects: member.projects,
      nativeAttribution: "not-applicable; no selected native lint",
      semanticCompleteness: "not-determined; separate native controls required",
    })),
    projects: observations.projects.map((row) => ({
      project: row.project,
      apiVersion: row.apiVersion,
      validatorRawCount: row.validatorRawCount,
      validatorFileIndependentCount: row.validatorFileIndependentCount,
      nativeCompilation: "success",
      nativeDiagnosticCounts: null,
      diagnosticComparison: null,
    })),
  };
}

function packageEvidenceMarkdown(report: ReturnType<typeof buildNativePackageEvidenceReport>) {
  return [
    "# Native package evidence (not a lint comparison)",
    "",
    `Package: \`${report.nativePackage}\``,
    "",
    "**No native lint is selected. Native finding counts, overlap, count equality and functional equivalence are not assessed.**",
    "Successful compilation is not proof of template enforcement or equivalent native validation.",
    "",
    "| Measure | Observation |",
    "| --- | ---: |",
    `| Selected projects | ${report.selectedProjectCount} |`,
    `| Successful source compilation and Swagger validation | ${report.assessableProjectCount} |`,
    `| Unassessed projects | ${report.unassessedProjects.length} |`,
    `| Swagger raw findings in assessed projects | ${report.validatorRawCount} |`,
    `| Swagger findings in unassessed projects | ${report.unassessedValidatorRawCount} |`,
    "| Native finding counts and comparison metrics | Not applicable |",
    "",
    "## Swagger observations by project",
    "",
    "| Project | Raw findings | File-independent member paths |",
    "| --- | ---: | ---: |",
    ...report.projects.map(
      (row) =>
        `| ${row.project} | ${row.validatorRawCount} | ${row.validatorFileIndependentCount} |`,
    ),
    "",
    "## Unassessed projects",
    "",
    ...report.unassessedProjects.map(
      (item) => `- \`${item.project}\`: ${item.reason.replace(/\r?\n/g, " ")}`,
    ),
    "",
  ].join("\n");
}

function git(root: string, args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
}

export function snapshot(root: string, allowWorkingTree = false) {
  const status = git(root, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (status && !allowWorkingTree) {
    throw new Error(`Comparison input must be clean: ${root}`);
  }
  const changedFiles = allowWorkingTree
    ? [
        ...new Set(
          execFileSync("git", ["-C", root, "diff", "--name-only", "-z", "--no-renames", "HEAD"], {
            encoding: "utf8",
          })
            .split("\0")
            .filter(Boolean)
            .concat(
              execFileSync(
                "git",
                ["-C", root, "ls-files", "-z", "--others", "--exclude-standard"],
                { encoding: "utf8" },
              )
                .split("\0")
                .filter(Boolean),
            ),
        ),
      ]
        .sort()
        .map((file) => {
          const absolute = path.resolve(root, file);
          const relative = path.relative(root, absolute);
          if (relative.startsWith("..") || path.isAbsolute(relative)) {
            throw new Error(`Source path escapes the checkout: ${file}`);
          }
          const stat = fs.lstatSync(absolute, { throwIfNoEntry: false });
          if (!stat) return { file, sha256: null };
          if (!stat.isFile()) {
            throw new Error(`Changed source must be a regular file: ${file}`);
          }
          return { file, sha256: hash(fs.readFileSync(absolute)) };
        })
    : undefined;
  return {
    root,
    repository: git(root, ["remote", "get-url", "origin"]),
    commit: git(root, ["rev-parse", "HEAD"]),
    ...(allowWorkingTree
      ? {
          status,
          diffSha256: hash(execFileSync("git", ["-C", root, "diff", "--binary", "HEAD"])),
          indexDiffSha256: hash(execFileSync("git", ["-C", root, "diff", "--cached", "--binary"])),
          changedFiles,
        }
      : {}),
  };
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function hash(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function contentIdentity(value: unknown): string {
  return hash(JSON.stringify(value));
}

function containedFile(root: string, relative: string): string {
  const target = path.resolve(root, relative);
  const local = path.relative(root, target);
  if (!local || local.startsWith("..") || path.isAbsolute(local)) {
    throw new Error(`Evidence path escapes its directory: ${relative}`);
  }
  let current = root;
  for (const part of local.split(path.sep)) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) {
      throw new Error(`Evidence must not contain symbolic links: ${relative}`);
    }
  }
  return target;
}

export function inventoryDataset(root: string): Array<{ file: string; sha256: string }> {
  const files: Array<{ file: string; sha256: string }> = [];
  function visit(directory: string) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error("Dataset contains a symbolic link.");
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) {
        files.push({
          file: path.relative(root, absolute),
          sha256: hash(fs.readFileSync(absolute)),
        });
      } else throw new Error("Unsupported dataset file type.");
    }
  }
  visit(root);
  return files.sort((left, right) => left.file.localeCompare(right.file));
}

export interface BaselineContext {
  specsCommit: string;
  specsRepository: string;
  coreCommit: string;
  nodeVersion: string;
  specsPackageManager: string;
  scope: Config["scope"];
  filter?: string;
  limit?: number;
  generatorFiles: Array<{ file: string; sha256: string }>;
  toolingDependencies: Array<{ file: string; sha256: string }>;
  runtimeInstallation: Array<{ file: string; sha256: string }>;
  candidateCommit: string;
  artifacts: Array<{ file: string; sha256: string }>;
  lintArtifactContents: Array<{ artifact: string; files: Array<{ file: string; sha256: string }> }>;
}

export function packedFileInventory(archive: Buffer): Array<{ file: string; sha256: string }> {
  const data = gunzipSync(archive);
  const files = new Map<string, string>();
  let extendedPath: string | undefined;
  for (let offset = 0; offset + 512 <= data.length;) {
    const header = data.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const text = (start: number, end: number) =>
      header.subarray(start, end).toString("utf8").replace(/\0.*$/s, "");
    const sizeText = text(124, 136).trim();
    if (!/^[0-7]+$/.test(sizeText)) throw new Error("Unsupported tar entry size.");
    const size = Number.parseInt(sizeText, 8);
    const start = offset + 512;
    if (!Number.isSafeInteger(size) || start + size > data.length) {
      throw new Error("Truncated packed artifact.");
    }
    const content = data.subarray(start, start + size);
    const type = text(156, 157);
    const prefix = text(345, 500);
    const file = extendedPath ?? (prefix ? `${prefix}/${text(0, 100)}` : text(0, 100));
    if (type === "x") {
      let position = 0;
      while (position < content.length) {
        const separator = content.indexOf(32, position);
        const length = Number(content.subarray(position, separator).toString("utf8"));
        if (
          separator < position ||
          !Number.isSafeInteger(length) ||
          length <= 0 ||
          position + length > content.length
        )
          throw new Error("Invalid tar extended header.");
        const record = content.subarray(separator + 1, position + length - 1).toString("utf8");
        if (record.startsWith("path=")) extendedPath = record.slice(5);
        else if (!/^(mtime|atime|ctime)=/.test(record)) {
          throw new Error("Unsupported tar extended metadata.");
        }
        position += length;
      }
    } else {
      extendedPath = undefined;
      if (!file.startsWith("package/") || file.split("/").includes("..")) {
        throw new Error("Packed artifact path escapes its package.");
      }
      if (type === "0" || type === "") {
        if (files.has(file)) throw new Error("Duplicate packed artifact file.");
        files.set(file, hash(content));
      } else if (type !== "5") throw new Error("Unsupported packed artifact entry type.");
    }
    offset = start + Math.ceil(size / 512) * 512;
  }
  if (files.size === 0 || extendedPath !== undefined)
    throw new Error("Empty or invalid packed artifact.");
  return [...files]
    .map(([file, sha256]) => ({ file, sha256 }))
    .sort((left, right) => left.file.localeCompare(right.file));
}

function isLintArtifact(file: string): boolean {
  return /^azure-tools-typespec-(azure-core|azure-resource-manager|client-generator-core)-/.test(
    file,
  );
}

export interface BaselineEvidence {
  schemaVersion: 1;
  context: BaselineContext;
  files: Array<{ file: string; sha256: string }>;
  projects: DatasetProject[];
}

interface CoverageDataset {
  schemaVersion: number;
  complete: boolean;
  specsCommit: string;
  specsRepository: string;
  resultFiles: string[];
  commonTypesFiles: string[];
  filters: { serviceType: string; path?: string; limit?: number };
  projects: DatasetProject[];
}

export function readCoverageDataset(
  datasetDir: string,
  context: BaselineContext,
  requireSuccessful = false,
) {
  const dataset: CoverageDataset = JSON.parse(
    fs.readFileSync(containedFile(datasetDir, "_meta.json"), "utf8"),
  );
  if (
    dataset.schemaVersion !== 4 ||
    dataset.complete !== true ||
    !context.specsCommit ||
    dataset.specsCommit !== context.specsCommit ||
    dataset.specsRepository !== context.specsRepository ||
    !Array.isArray(dataset.projects) ||
    dataset.projects.length === 0 ||
    dataset.filters?.serviceType !== "resource-manager" ||
    dataset.filters.path !== context.filter?.replace(/\\/g, "/") ||
    dataset.filters.limit !== context.limit
  ) {
    throw new Error(
      "Dataset schema, completion, snapshot or population selection is incompatible.",
    );
  }
  const selected = new Set<string>();
  for (const project of dataset.projects) {
    if (
      typeof project.sourcePath !== "string" ||
      !project.sourcePath ||
      path.isAbsolute(project.sourcePath) ||
      project.sourcePath.split(/[\\/]/).includes("..") ||
      selected.has(project.sourcePath) ||
      !["success", "failed"].includes(project.compileStatus) ||
      !["success", "failed", "no-swagger"].includes(project.validationStatus) ||
      (requireSuccessful &&
        (project.compileStatus !== "success" || project.validationStatus !== "success"))
    ) {
      throw new Error("Baseline population contains duplicate, invalid or failed projects.");
    }
    selected.add(project.sourcePath);
  }
  const references = [
    dataset.resultFiles,
    dataset.commonTypesFiles,
    ...dataset.projects.flatMap((project) => {
      const record = project as DatasetProject & {
        swaggerFiles: string[];
        swaggerAssets: string[];
        rawFiles: string[];
        typespecFiles: string[];
      };
      return [record.swaggerFiles, record.swaggerAssets, record.rawFiles, record.typespecFiles];
    }),
  ];
  for (const files of references) {
    if (!Array.isArray(files)) throw new Error("Missing dataset file inventory.");
    for (const file of files) {
      if (typeof file !== "string" || !fs.statSync(containedFile(datasetDir, file)).isFile()) {
        throw new Error("Missing referenced dataset file.");
      }
    }
  }
  const index: {
    schemaVersion: number;
    specsCommit: string;
    totalViolations: number;
    rules: Record<string, { count: number; resultsFile: string }>;
  } = JSON.parse(fs.readFileSync(containedFile(datasetDir, "validator-results.json"), "utf8"));
  if (index.schemaVersion !== 4 || index.specsCommit !== context.specsCommit || !index.rules) {
    throw new Error("Invalid validator dataset index.");
  }
  const members = new Map<string, ValidatorDiagnostic[]>();
  for (const [rule, entry] of Object.entries(index.rules)) {
    if (!rule || !Number.isSafeInteger(entry.count) || entry.count < 0) {
      throw new Error(`Invalid validator index entry: ${rule}`);
    }
    const shard = JSON.parse(fs.readFileSync(containedFile(datasetDir, entry.resultsFile), "utf8"));
    if (
      shard.schemaVersion !== 4 ||
      shard.rule !== rule ||
      shard.specsCommit !== context.specsCommit ||
      !Array.isArray(shard.results) ||
      shard.results.length !== entry.count ||
      shard.results.some(
        (item: ValidatorDiagnostic) =>
          item.rule !== rule ||
          !selected.has(item.project) ||
          typeof item.swaggerFile !== "string" ||
          !Array.isArray(item.path) ||
          item.path.some((part) => typeof part !== "string" && typeof part !== "number"),
      )
    ) {
      throw new Error(`Invalid validator shard: ${rule}`);
    }
    members.set(rule, shard.results);
  }
  if (
    contentIdentity([...dataset.resultFiles].sort()) !==
    contentIdentity(
      Object.values(index.rules)
        .map((entry) => entry.resultsFile)
        .sort(),
    )
  ) {
    throw new Error("Dataset and validator shard inventories differ.");
  }
  if (
    [...members.values()].reduce((total, items) => total + items.length, 0) !==
    index.totalViolations
  ) {
    throw new Error("Validator index totals do not match its shards.");
  }
  return { dataset, members };
}

export function validateBaselineCompatibility(
  evidence: BaselineEvidence,
  context: BaselineContext,
  receipt?: unknown,
  policy: Config["baselinePolicy"] = "strict",
): void {
  if (policy === "frozen-reference") {
    const selection = (value: BaselineContext) => ({
      specsCommit: value.specsCommit,
      specsRepository: value.specsRepository,
      specsPackageManager: value.specsPackageManager,
      scope: value.scope,
      filter: value.filter,
      limit: value.limit,
    });
    if (
      receipt !== undefined ||
      contentIdentity(selection(evidence.context)) !== contentIdentity(selection(context))
    ) {
      throw new Error("Frozen baseline source or selection is incompatible.");
    }
    return;
  }
  const {
    candidateCommit: beforeCommit,
    artifacts: beforeArtifacts,
    runtimeInstallation: beforeRuntime,
    lintArtifactContents: beforeContents,
    ...before
  } = evidence.context;
  const {
    candidateCommit: afterCommit,
    artifacts: afterArtifacts,
    runtimeInstallation: afterRuntime,
    lintArtifactContents: afterContents,
    ...after
  } = context;
  if (contentIdentity(before) !== contentIdentity(after)) {
    throw new Error(
      "Baseline compiler, generator, settings, runtime or specs context is incompatible.",
    );
  }
  if (
    beforeCommit === afterCommit &&
    contentIdentity(beforeArtifacts) === contentIdentity(afterArtifacts) &&
    beforeRuntime.some((item) => /lock/.test(item.file)) &&
    contentIdentity(beforeRuntime) === contentIdentity(afterRuntime)
  ) {
    return;
  }
  const old = new Map(beforeArtifacts.map((item) => [item.file, item.sha256]));
  const changed = afterArtifacts.filter((item) => old.get(item.file) !== item.sha256);
  if (
    beforeArtifacts.length !== afterArtifacts.length ||
    beforeArtifacts.some((item) => !afterArtifacts.some((other) => other.file === item.file)) ||
    changed.some((item) => !isLintArtifact(item.file))
  ) {
    throw new Error(
      "Changed compiler, emitter, dependency artifacts or artifact population invalidate baseline reuse.",
    );
  }
  const emissionClosure = (files: Array<{ file: string; sha256: string }>) =>
    files.filter(
      (item) =>
        !/^package\/dist\/src\/(?:rules\/.+|linter)\.(?:js|d\.ts)(?:\.map)?$/.test(item.file),
    );
  for (const artifact of changed) {
    const previous = beforeContents.find((item) => item.artifact === artifact.file);
    const current = afterContents.find((item) => item.artifact === artifact.file);
    if (
      !previous ||
      !current ||
      previous.files.length === 0 ||
      current.files.length === 0 ||
      !previous.files.some((item) => item.file === "package/package.json") ||
      !current.files.some((item) => item.file === "package/package.json") ||
      contentIdentity(emissionClosure(previous.files)) !==
        contentIdentity(emissionClosure(current.files))
    ) {
      throw new Error(
        "Packed emission/library/metadata/dependency closure changed or is unverifiable.",
      );
    }
  }
  const reviewed = receipt as
    | {
        schemaVersion?: number;
        baselineIdentity?: string;
        candidateContextIdentity?: string;
        reviewedBy?: string;
        rationale?: string;
        assertions?: Record<string, boolean>;
      }
    | undefined;
  if (
    reviewed?.schemaVersion !== 1 ||
    reviewed.baselineIdentity !== contentIdentity(evidence) ||
    reviewed.candidateContextIdentity !== contentIdentity(context) ||
    typeof reviewed.reviewedBy !== "string" ||
    !reviewed.reviewedBy.trim() ||
    typeof reviewed.rationale !== "string" ||
    !reviewed.rationale.trim() ||
    [
      "lintOnly",
      "unchangedCompiler",
      "unchangedLibraries",
      "unchangedEmission",
      "unchangedMetadata",
      "unchangedDependencies",
      "noUnknownChanges",
    ].some((assertion) => reviewed.assertions?.[assertion] !== true)
  ) {
    throw new Error(
      `A reviewed lint-only compatibility receipt is required. baselineIdentity=${contentIdentity(evidence)} candidateContextIdentity=${contentIdentity(context)}`,
    );
  }
}

export function reuseBaseline(
  run: string,
  destination: string,
  context: BaselineContext,
  receipt?: unknown,
  policy: Config["baselinePolicy"] = "strict",
) {
  const manifestFile = containedFile(run, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const baselineFile = containedFile(run, "baseline.json");
  const evidence: BaselineEvidence = JSON.parse(fs.readFileSync(baselineFile, "utf8"));
  if (
    manifest.schemaVersion !== 2 ||
    manifest.status !== "complete" ||
    typeof manifest.finishedAt !== "string" ||
    !Number.isFinite(Date.parse(manifest.finishedAt)) ||
    evidence.schemaVersion !== 1 ||
    !Array.isArray(evidence.files) ||
    manifest.baselineIdentity !== contentIdentity(evidence)
  ) {
    throw new Error("Only a completed, sealed schema-2 baseline run can be reused.");
  }
  validateBaselineCompatibility(evidence, context, receipt, policy);
  const datasetDir = containedFile(run, "dataset");
  if (contentIdentity(inventoryDataset(datasetDir)) !== contentIdentity(evidence.files)) {
    throw new Error("Baseline dataset inventory or file hashes are corrupt.");
  }
  const result = readCoverageDataset(datasetDir, context, true);
  if (contentIdentity(result.dataset.projects) !== contentIdentity(evidence.projects)) {
    throw new Error("Baseline project population changed.");
  }
  if (fs.existsSync(destination)) throw new Error("Baseline copy destination already exists.");
  fs.cpSync(datasetDir, destination, { recursive: true, errorOnExist: true, force: false });
  if (contentIdentity(inventoryDataset(destination)) !== contentIdentity(evidence.files)) {
    throw new Error("Copied baseline dataset failed integrity verification.");
  }
  return {
    evidence,
    provenance: {
      run: path.resolve(run),
      manifestSha256: hash(fs.readFileSync(manifestFile)),
      baselineIdentity: contentIdentity(evidence),
      policy,
      candidateContextIdentity: contentIdentity(context),
      compatibilityAssumption:
        policy === "frozen-reference"
          ? "Candidate runtime is assumed backward compatible; historical Swagger is not re-emitted or proven identical."
          : null,
      compatibilityReceipt: receipt ?? null,
      compatibilityReceiptIdentity: receipt === undefined ? null : contentIdentity(receipt),
    },
  };
}

export async function prepareCoverageBaseline(
  config: Pick<Config, "baselineRun" | "baselineCompatibilityReceipt" | "baselinePolicy">,
  datasetDir: string,
  context: BaselineContext,
  generateSwaggerAndValidate: () => Promise<void>,
) {
  if (config.baselineRun) {
    const receipt = config.baselineCompatibilityReceipt
      ? JSON.parse(fs.readFileSync(config.baselineCompatibilityReceipt, "utf8"))
      : undefined;
    return reuseBaseline(
      path.resolve(config.baselineRun),
      datasetDir,
      context,
      receipt,
      config.baselinePolicy,
    );
  }
  await generateSwaggerAndValidate();
  const generated = readCoverageDataset(datasetDir, context);
  return {
    evidence: {
      schemaVersion: 1 as const,
      context,
      files: inventoryDataset(datasetDir),
      projects: generated.dataset.projects,
    },
    provenance: undefined,
  };
}

export async function command(
  cwd: string,
  args: string[],
  log: string,
  deadline?: number,
): Promise<void> {
  if (deadline !== undefined && Date.now() >= deadline) {
    throw new Error("Native execution budget exhausted before project launch.");
  }
  console.log(`Running ${path.basename(log)}; raw output: ${log}`);
  const fd = fs.openSync(log, "w");
  fs.writeSync(fd, `${JSON.stringify({ cwd, executable: process.execPath, args })}\n`);
  const heartbeat = setInterval(() => console.log(`HEARTBEAT ${path.basename(log)}`), 60_000);
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, args, { cwd, stdio: ["ignore", fd, fd] });
      let expired = false;
      const timeout =
        deadline === undefined
          ? undefined
          : setTimeout(
              () => {
                expired = true;
                child.kill();
              },
              Math.max(1, deadline - Date.now()),
            );
      child.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once("exit", (code, signal) => {
        clearTimeout(timeout);
        if (expired)
          reject(new Error(`Native execution budget exhausted; worker stopped; inspect ${log}`));
        else if (code === 0) resolve();
        else reject(new Error(`Command failed (${code ?? signal}); inspect ${log}`));
      });
    });
  } finally {
    clearInterval(heartbeat);
    fs.closeSync(fd);
  }
}

function markdown(report: ReturnType<typeof buildNativeCoverageReport>, config: Config): string {
  const lines = [
    "# Native TypeSpec coverage analysis",
    "",
    `Validators: ${config.validatorRules.map((rule) => `\`${rule}\``).join(", ")}`,
    `Native rules: ${config.tspRules.map((rule) => `\`${rule}\``).join(", ")}`,
    `Scope: \`${config.scope}\`; partial: ${config.filter !== undefined || config.limit !== undefined}.`,
    "",
    "**This is observed coverage, not an automatic equivalence decision.**",
    `Primary counting unit: ${report.countingUnit}.`,
    "Member-native attribution is unavailable. Test every member's semantics, including members with no observations.",
    "Cross-validator overlap is not normalized. Equal source locations do not establish one actionable grouped violation.",
    "JSON paths and source locations are different identity domains. One-sided projects and outliers require investigation.",
    config.scope === "source"
      ? "Source diagnostics include all declared versions; Swagger uses the latest emitted API version."
      : "Aligned diagnostics are source diagnostics filtered by locations in the selected-version HTTP graph, not a rerun of arbitrary rule predicates on a projected program.",
    "",
    "| Measure | Value |",
    "| --- | ---: |",
    `| Selected / assessable projects | ${report.selectedProjectCount} / ${report.assessableProjectCount} |`,
    `| Unassessed projects | ${report.unassessedProjects.length} |`,
    `| Validator / native / overlap projects | ${report.validatorProjects.length} / ${report.nativeProjects.length} / ${report.overlapProjects.length} |`,
    `| Observed validator-project coverage | ${report.observedProjectCoveragePercent ?? "N/A"} |`,
    `| Validator raw / file-independent paths | ${report.validatorRawCount} / ${report.validatorFileIndependentCount} |`,
    `| Native raw / aligned / source targets | ${report.nativeRawCount} / ${report.nativeAlignedCount} / ${report.nativeSourceCount} |`,
    `| Native findings under project defaults | ${report.nativeDefaultCount ?? "not assessed"} |`,
    `| Validator excess / native excess | ${report.validatorExcess} / ${report.nativeExcess} |`,
    `| Raw validator excess / raw native excess (primary) | ${report.rawValidatorExcess} / ${report.rawNativeExcess} |`,
    "",
    "## Member observations (not member-native coverage)",
    "",
    ...report.members.map(
      (member) =>
        `- ${member.rule}: ${member.rawCount} raw observations; completeness not determined.`,
    ),
    "",
    "## One-sided projects",
    "",
    ...report.validatorOnlyProjects.map((project) => `- Validator only: \`${project}\``),
    ...report.nativeOnlyProjects.map((project) => `- Native only: \`${project}\``),
    "",
    "## Unassessed projects",
    "",
    ...report.unassessedProjects.map(
      (item) => `- \`${item.project}\`: ${item.reason.replace(/\r?\n/g, " ")}`,
    ),
    "",
    "## Diagnostic outliers",
    "",
    "| Project | Validator raw | Native aligned | Raw difference | Validator paths | Native targets | Location difference |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...report.projects
      .filter((row) => row.difference !== 0 || row.rawDifference !== 0)
      .map(
        (row) =>
          `| ${row.project} | ${row.validatorRawCount} | ${row.nativeAlignedCount} | ${row.rawDifference} | ${row.validatorFileIndependentCount} | ${row.nativeSourceCount} | ${row.difference} |`,
      ),
    "",
  ];
  return lines.join("\n");
}

export async function runNativeCoverage(config: Config): Promise<void> {
  const candidateRepo = path.resolve(config.candidateRepo);
  const specsRepo = path.resolve(config.specsRepo);
  const output = path.resolve(config.output);
  if (fs.existsSync(output) && fs.readdirSync(output).length > 0) {
    throw new Error(
      "Output must be a new or empty run directory; previous evidence is never overwritten.",
    );
  }
  for (const root of [
    candidateRepo,
    specsRepo,
    ...(config.baselineRun ? [path.resolve(config.baselineRun)] : []),
  ]) {
    const relative = path.relative(root, output);
    if (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative)) {
      throw new Error("Output must be outside input checkouts and retained baseline runs.");
    }
  }
  const candidate = snapshot(candidateRepo, config.candidateWorkingTree);
  const specs = snapshot(specsRepo);
  const tgzDir = path.resolve(config.tgzDir);
  const artifacts = fs
    .readdirSync(tgzDir)
    .filter((file) => file.endsWith(".tgz"))
    .sort()
    .map((file) => ({
      file: path.join(tgzDir, file),
      sha256: createHash("sha256")
        .update(fs.readFileSync(path.join(tgzDir, file)))
        .digest("hex"),
    }));
  if (artifacts.length === 0) throw new Error("No packed candidate artifacts found.");
  const integration = path.join(
    candidateRepo,
    "core",
    "packages",
    "tsp-integration",
    "cmd",
    "tsp-integration.js",
  );
  if (!fs.existsSync(integration))
    throw new Error(`Missing @typespec/integration-tester CLI: ${integration}`);
  fs.mkdirSync(output, { recursive: true });
  const manifest = {
    schemaVersion: 2,
    startedAt: new Date().toISOString(),
    status: "running",
    config: { ...config, candidateRepo, specsRepo, output, tgzDir },
    candidate,
    specs,
    artifacts,
    coreCommit: git(path.join(candidateRepo, "core"), ["rev-parse", "HEAD"]),
    generatorCommit: git(path.resolve(import.meta.dirname, "..", "..", "..", ".."), [
      "rev-parse",
      "HEAD",
    ]),
    generatorFiles: [
      ...["native-coverage.ts", "native-coverage-worker.mjs", "spec-dataset.ts"].map((file) => ({
        file,
        sha256: createHash("sha256")
          .update(fs.readFileSync(path.join(import.meta.dirname, file)))
          .digest("hex"),
      })),
      { file: "candidate:tsp-integration", sha256: hash(fs.readFileSync(integration)) },
    ],
    nodeVersion: process.version,
    specsPackageManager: JSON.parse(fs.readFileSync(path.join(specsRepo, "package.json"), "utf8"))
      .packageManager,
    policies: {
      swagger: "latest-emitted-api-version; production ARM validator; no readme suppressions",
      native: config.nativePackage
        ? "package evidence only; existing project configuration; no selected native lint or comparable finding counts"
        : config.nativeMode === "target-only"
          ? "mapped rules only; configured/inherited target options and source suppressions retained; project default activation not assessed"
          : "existing project configuration plus explicit mapped-rule enablement; source suppressions retained",
      equivalence: "manual decision required; no fuzzy matching or name-only normalization",
      baseline: config.baselinePolicy ?? "strict",
    },
    baselineIdentity: undefined as string | undefined,
    baselineReuse: undefined as ReturnType<typeof reuseBaseline>["provenance"] | undefined,
    baselineContext: undefined as BaselineContext | undefined,
    nativeExecution: undefined as
      | { startedAt: string; budgetSeconds?: number; finishedAt?: string; budgetExceeded?: boolean }
      | undefined,
  };
  writeJson(path.join(output, "manifest.json"), manifest);
  try {
    await command(
      candidateRepo,
      [
        integration,
        "azure-specs",
        "--repo",
        specsRepo,
        "--stage",
        "patch",
        "--stage",
        "install",
        "--tgz-dir",
        tgzDir,
      ],
      path.join(output, "integration.log"),
    );
    const datasetDir = path.join(output, "dataset");
    const runtimeFiles = [
      path.join(specsRepo, "package.json"),
      path.join(specsRepo, "pnpm-lock.yaml"),
      path.join(specsRepo, "package-lock.json"),
      path.join(specsRepo, "node_modules", ".pnpm", "lock.yaml"),
      path.join(specsRepo, "node_modules", ".package-lock.json"),
    ]
      .filter((file) => fs.existsSync(file))
      .map((file, index) => ({
        file: `${index}-${path.basename(file)}`,
        content: fs.readFileSync(file),
      }));
    for (const item of runtimeFiles) {
      const destination = path.join(output, "runtime-installation", item.file);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, item.content);
    }
    const context: BaselineContext = {
      specsCommit: specs.commit,
      specsRepository: specs.repository,
      coreCommit: manifest.coreCommit,
      nodeVersion: process.version,
      specsPackageManager: manifest.specsPackageManager,
      scope: config.scope,
      filter: config.filter,
      limit: config.limit,
      generatorFiles: manifest.generatorFiles,
      toolingDependencies: [
        path.join(candidateRepo, "pnpm-lock.yaml"),
        path.resolve(import.meta.dirname, "..", "..", "package.json"),
        path.resolve(import.meta.dirname, "..", "..", "..", "..", "pnpm-lock.yaml"),
      ]
        .filter((file) => fs.existsSync(file))
        .map((file, index) => ({
          file: `${index}:${path.basename(file)}`,
          sha256: hash(fs.readFileSync(file)),
        })),
      runtimeInstallation: runtimeFiles.map((item) => ({
        file: item.file,
        sha256: hash(item.content),
      })),
      candidateCommit: candidate.commit,
      artifacts: artifacts.map((item) => ({ ...item, file: path.basename(item.file) })),
      lintArtifactContents: artifacts
        .filter((item) => isLintArtifact(path.basename(item.file)))
        .map((item) => ({
          artifact: path.basename(item.file),
          files: packedFileInventory(fs.readFileSync(item.file)),
        })),
    };
    manifest.baselineContext = context;
    writeJson(path.join(output, "manifest.json"), manifest);
    const prepared = await prepareCoverageBaseline(config, datasetDir, context, async () => {
      const generatorArgs = [
        "--import",
        import.meta.resolve("tsx/esm"),
        path.join(import.meta.dirname, "spec-dataset.ts"),
        "--specs-repo",
        specsRepo,
        "--commit",
        specs.commit,
        "--output",
        datasetDir,
        "--concurrency",
        String(config.concurrency),
      ];
      if (config.filter !== undefined) generatorArgs.push("--filter", config.filter);
      if (config.limit !== undefined) generatorArgs.push("--limit", String(config.limit));
      await command(
        path.resolve(import.meta.dirname, "..", ".."),
        generatorArgs,
        path.join(output, "swagger.log"),
      );
      for (const item of runtimeFiles) {
        const destination = path.join(datasetDir, "_baseline-runtime", item.file);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, item.content);
      }
    });
    const evidence = prepared.evidence;
    manifest.baselineReuse = prepared.provenance;
    writeJson(path.join(output, "baseline.json"), evidence);
    manifest.baselineIdentity = contentIdentity(evidence);
    writeJson(path.join(output, "manifest.json"), manifest);
    const { dataset, members } = readCoverageDataset(datasetDir, context);
    const validator = config.validatorRules.flatMap((rule) => members.get(rule) ?? []);
    const native: NativeProjectResult[] = [];
    const nativeStarted = Date.now();
    const deadline =
      config.nativeBudgetSeconds === undefined
        ? undefined
        : nativeStarted + config.nativeBudgetSeconds * 1000;
    const nativeExecution: NonNullable<typeof manifest.nativeExecution> = {
      startedAt: new Date(nativeStarted).toISOString(),
      budgetSeconds: config.nativeBudgetSeconds,
    };
    manifest.nativeExecution = nativeExecution;
    writeJson(path.join(output, "manifest.json"), manifest);
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(config.concurrency, dataset.projects.length) }, async () => {
        while (next < dataset.projects.length) {
          const index = next++;
          const project = dataset.projects[index];
          const input = path.join(output, `native-${index}.input.json`);
          const receipt = path.join(output, `native-${index}.json`);
          writeJson(input, {
            specsRepo,
            project,
            validatorRule: config.validatorRule,
            validatorRules: config.validatorRules,
            tspRules: config.tspRules,
            nativePackage: config.nativePackage,
            scope: config.scope,
            nativeMode: config.nativeMode,
          });
          try {
            await command(
              specsRepo,
              [path.join(import.meta.dirname, "native-coverage-worker.mjs"), input, receipt],
              path.join(output, `native-${index}.log`),
              deadline,
            );
            native.push(JSON.parse(fs.readFileSync(receipt, "utf8")));
          } catch (error) {
            if (fs.existsSync(receipt)) {
              const failure: NativeProjectResult = JSON.parse(fs.readFileSync(receipt, "utf8"));
              if (failure.status !== "failed" || failure.project !== project.sourcePath) {
                throw new Error(`Invalid failed worker receipt: ${receipt}`, { cause: error });
              }
              native.push(failure);
              continue;
            }
            const failure: NativeProjectResult = {
              project: project.sourcePath,
              status: "failed",
              error: error instanceof Error ? error.message : String(error),
              rawDiagnostics: [],
              diagnostics: [],
              packages: [],
              ...(config.nativeMode === "target-only"
                ? { defaultActivation: "not-assessed" as const }
                : {}),
            };
            writeJson(receipt, failure);
            native.push(failure);
          }
        }
      }),
    );
    nativeExecution.finishedAt = new Date().toISOString();
    nativeExecution.budgetExceeded = deadline !== undefined && Date.now() >= deadline;
    const report = config.nativePackage
      ? buildNativePackageEvidenceReport(
          dataset.projects,
          validator,
          native,
          config.nativePackage,
          config.validatorRules,
        )
      : buildNativeCoverageReport(dataset.projects, validator, native, config.validatorRules);
    writeJson(path.join(output, "coverage.json"), {
      ...report,
      baselineComparison: manifest.baselineReuse ?? { policy: "fresh" },
      nativeExecution: manifest.nativeExecution,
    });
    fs.writeFileSync(
      path.join(output, "coverage.md"),
      "assessmentMode" in report ? packageEvidenceMarkdown(report) : markdown(report, config),
    );
    if (
      contentIdentity(snapshot(candidateRepo, config.candidateWorkingTree)) !==
        contentIdentity(candidate) ||
      git(path.join(candidateRepo, "core"), ["rev-parse", "HEAD"]) !== manifest.coreCommit ||
      git(path.join(candidateRepo, "core"), ["status", "--porcelain"]) !== "" ||
      snapshot(specsRepo).commit !== specs.commit
    ) {
      throw new Error("An input checkout moved during the comparison.");
    }
    for (const artifact of artifacts) {
      if (
        createHash("sha256").update(fs.readFileSync(artifact.file)).digest("hex") !==
        artifact.sha256
      ) {
        throw new Error(`Candidate artifact changed during the comparison: ${artifact.file}`);
      }
    }
    if (contentIdentity(inventoryDataset(datasetDir)) !== contentIdentity(evidence.files)) {
      throw new Error("Dataset changed during the comparison.");
    }
    manifest.status = report.unassessedProjects.length > 0 ? "incomplete" : "complete";
    writeJson(path.join(output, "manifest.json"), {
      ...manifest,
      finishedAt: new Date().toISOString(),
    });
    console.log(`Coverage report: ${path.join(output, "coverage.md")}`);
    if (report.unassessedProjects.length > 0) {
      throw new Error(
        `${report.unassessedProjects.length} project(s) remain unassessed; inspect coverage.json.`,
      );
    }
  } catch (error) {
    writeJson(path.join(output, "manifest.json"), {
      ...manifest,
      status: manifest.status === "incomplete" ? "incomplete" : "failed",
      finishedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runNativeCoverage(parseNativeCoverageArgs(process.argv.slice(2))).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
