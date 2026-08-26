#!/usr/bin/env node

/* eslint-disable no-console */

import { execFile, execFileSync } from "child_process";
import { createHash, randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";
import { promisify } from "util";
import YAML from "yaml";
import { formatProgressHeartbeat } from "./progress.js";
import type { ProjectedEnumResult, ProjectedHttpGraphResult } from "./projected-enum-worker.js";

const execFileAsync = promisify(execFile);
const ANALYSIS_SCHEMA_VERSION = 7;
const DATASET_SCHEMA_VERSION = 4;
const LOCAL_RULESET = "tsp-lintdiff-local-linter/all";
const LOCAL_RULE_PREFIX = "tsp-lintdiff-local-linter/";
const ENUM_INSTEAD_OF_BOOLEAN_RULE = "tsp-lintdiff-local-linter/enum-instead-of-boolean";
const VALID_QUERY_PARAMETERS_FOR_POINT_OPERATIONS_RULE =
  "tsp-lintdiff-local-linter/valid-query-parameters-for-point-operations";
const TSX_ESM_LOADER = import.meta.resolve("tsx/esm");
const MAX_BUFFER = 256 * 1024 * 1024;
const HEARTBEAT_INTERVAL_MS = 60_000;

interface Config {
  specsRepo: string;
  datasetDir: string;
  concurrency: number;
  filter?: string;
  limit: number;
}

export interface DatasetProject {
  sourcePath: string;
  typespecPath: string;
  apiVersion?: string;
  swaggerFiles?: string[];
  rawFiles: string[];
}

interface DatasetMetadata {
  schemaVersion: number;
  complete: boolean;
  specsCommit: string;
  projects: DatasetProject[];
  typespecAnalysis?: TypeSpecAnalysisMetadata;
  [key: string]: unknown;
}

interface ValidatorIndex {
  schemaVersion: number;
  specsCommit: string;
  rules: Record<
    string,
    {
      count: number;
      levels: Record<string, number>;
      resultsFile: string;
    }
  >;
}

export interface ValidatorDiagnostic {
  project: string;
  swaggerFile?: string;
  message: string;
  path: Array<string | number>;
}

interface ValidatorShard {
  results: ValidatorDiagnostic[];
}

export type DiagnosticOrigin = "local" | "official" | "compiler";

export interface TypeSpecDiagnostic {
  rule: string;
  level: "warning" | "error";
  origin: DiagnosticOrigin;
  project: string;
  sourceFile?: string;
  line?: number;
  column?: number;
  message: string;
}

export interface TypeSpecProjectResult {
  project: string;
  status: "success" | "failed";
  durationMs: number;
  diagnosticCount: number;
  rawDiagnosticCount: number;
  projectedDiagnosticCount: number;
  error?: string;
  rawFiles: string[];
}

export interface TypeSpecAggregate {
  schemaVersion: number;
  specsCommit: string;
  generatedAt: string;
  totalDiagnostics: number;
  rules: Record<
    string,
    {
      count: number;
      levels: Record<string, number>;
      projectCount: number;
      results: TypeSpecDiagnostic[];
    }
  >;
}

interface TypeSpecIndex {
  schemaVersion: number;
  specsCommit: string;
  generatedAt: string;
  durationMs: number;
  ruleset: string;
  partial: boolean;
  sourceProjectCount: number;
  projectCount: number;
  filters: {
    path?: string;
    limit?: number;
  };
  failedProjectCount: number;
  totalDiagnostics: number;
  rules: Record<
    string,
    {
      count: number;
      levels: Record<string, number>;
      projectCount: number;
      resultsFile: string;
    }
  >;
  projects: TypeSpecProjectResult[];
}

export interface ValidatorRuleData {
  count: number;
  projects: string[];
  results?: ValidatorDiagnostic[];
}

export interface ValidatorFixtureMetadata {
  coverageKind: string;
  tspLints: Set<string>;
  projectionScope: "none" | "http-reachable";
}

export interface AnalysisScope {
  partial: boolean;
  sourceProjectCount: number;
  projects: string[];
  filters: {
    path?: string;
    limit?: number;
  };
}

export interface ComparisonEntry {
  validatorRule: string;
  validatorMode: "production" | "staging";
  coverageKind: string;
  mappedTypeSpecRules: string[];
  firedTypeSpecRules: string[];
  officialMapping: boolean;
  validatorProjectCount: number;
  assessableValidatorProjectCount: number;
  typeSpecProjectCount: number;
  overlapProjectCount: number;
  validatorOnlyProjectCount: number;
  unassessedProjectCount: number;
  typeSpecOnlyProjectCount: number;
  observedCoveragePercent: number | null;
  validatorDiagnosticCount: number;
  typeSpecDiagnosticCount: number;
  normalizedValidatorDiagnosticCount: number | null;
  normalizedTypeSpecDiagnosticCount: number | null;
  diagnosticConsistencyPercent: number | null;
  normalizationMethod: string | null;
  validatorProjects: string[];
  assessableValidatorProjects: string[];
  typeSpecProjects: string[];
  overlapProjects: string[];
  validatorOnlyProjects: string[];
  unassessedProjects: string[];
  typeSpecOnlyProjects: string[];
}

export interface ComparisonResults {
  schemaVersion: number;
  specsCommit: string;
  generatedAt: string;
  durationMs: number;
  partial: boolean;
  sourceProjectCount: number;
  projectCount: number;
  successfulProjectCount: number;
  failedProjectCount: number;
  projects: string[];
  unassessedProjects: string[];
  filters: {
    path?: string;
    limit?: number;
  };
  rules: ComparisonEntry[];
  unmappedTypeSpecRules: Array<{
    rule: string;
    count: number;
    projectCount: number;
    projects: string[];
  }>;
}

export interface CoverageBreakdown {
  schemaVersion: number;
  specsCommit: string;
  generatedAt: string;
  durationMs: number;
  partial: boolean;
  sourceProjectCount: number;
  projectCount: number;
  successfulProjectCount: number;
  failedProjectCount: number;
  projects: string[];
  unassessedProjects: string[];
  filters: AnalysisScope["filters"];
  summary: {
    validatorRuleCount: number;
    hundredPercentObservedCoverageCount: number;
    partialObservedCoverageCount: number;
    zeroObservedCoverageCount: number;
    unmappedValidatorRuleCount: number;
    validatorRulesNeverFiredCount: number;
    typeSpecOnlyRuleCount: number;
    unassessedProjectCount: number;
  };
  categories: {
    hundredPercentObservedCoverage: string[];
    partialObservedCoverage: string[];
    zeroObservedCoverage: string[];
    unmappedValidatorRules: string[];
    validatorRulesNeverFired: string[];
    typeSpecOnlyRules: string[];
    unassessedProjects: string[];
  };
  rules: ComparisonEntry[];
  typeSpecOnlyRules: ComparisonResults["unmappedTypeSpecRules"];
}

interface TypeSpecAnalysisMetadata {
  schemaVersion: number;
  generatedAt: string;
  durationMs: number;
  ruleset: string;
  localLinterFingerprint: string;
  localLinterFingerprintFiles: string[];
  localLinterGitCommit?: string;
  localLinterGitBranch?: string;
  partial: boolean;
  sourceProjectCount: number;
  projectCount: number;
  filters: {
    path?: string;
    limit?: number;
  };
  diagnosticCount: number;
  rawDiagnosticCount: number;
  projectedDiagnosticCount: number;
  ruleCount: number;
  failedProjectCount: number;
  resultFiles: string[];
  rawFiles: string[];
}

function parseArgs(): Config {
  const args = process.argv.slice(2);
  let specsRepo = "";
  let datasetDir = path.resolve(import.meta.dirname, "..", "..", "specs");
  let concurrency = 2;
  let filter: string | undefined;
  let limit = Number.POSITIVE_INFINITY;

  for (let index = 0; index < args.length; index++) {
    switch (args[index]) {
      case "--specs-repo":
        specsRepo = path.resolve(args[++index]);
        break;
      case "--output":
        datasetDir = path.resolve(args[++index]);
        break;
      case "--concurrency":
        concurrency = Number.parseInt(args[++index], 10);
        break;
      case "--filter":
        filter = args[++index].replace(/\\/g, "/");
        break;
      case "--limit":
        limit = Number.parseInt(args[++index], 10);
        break;
      default:
        throw new Error(`Unknown argument: ${args[index]}`);
    }
  }

  if (!specsRepo) {
    throw new Error(
      "Usage: npm run specs:typespec -- --specs-repo <path> " +
        "[--output <path>] [--filter <path>] [--limit N] [--concurrency N]",
    );
  }
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("--concurrency must be a positive integer.");
  }
  if (Number.isFinite(limit) && (!Number.isInteger(limit) || limit < 1)) {
    throw new Error("--limit must be a positive integer.");
  }

  return { specsRepo, datasetDir, concurrency, filter, limit };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeRelative(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function git(workingDirectory: string, args: string[]): string {
  return execFileSync("git", ["-C", workingDirectory, ...args], {
    encoding: "utf8",
  }).trim();
}

function tryGit(workingDirectory: string, args: string[]): string | undefined {
  try {
    return git(workingDirectory, args);
  } catch {
    return undefined;
  }
}

function validateInputs(config: Config): {
  meta: DatasetMetadata;
  validatorIndex: ValidatorIndex;
} {
  const metaPath = path.join(config.datasetDir, "_meta.json");
  const validatorPath = path.join(config.datasetDir, "validator-results.json");
  if (!fs.existsSync(metaPath) || !fs.existsSync(validatorPath)) {
    throw new Error(
      `The dataset at ${config.datasetDir} must contain _meta.json and validator-results.json.`,
    );
  }

  const meta = readJson<DatasetMetadata>(metaPath);
  const validatorIndex = readJson<ValidatorIndex>(validatorPath);
  if (
    meta.schemaVersion !== DATASET_SCHEMA_VERSION ||
    meta.complete !== true ||
    typeof meta.specsCommit !== "string" ||
    !Array.isArray(meta.projects)
  ) {
    throw new Error(`Unsupported or incomplete spec dataset metadata: ${metaPath}`);
  }
  if (
    validatorIndex.schemaVersion !== DATASET_SCHEMA_VERSION ||
    validatorIndex.specsCommit !== meta.specsCommit ||
    !validatorIndex.rules
  ) {
    throw new Error(`Validator results do not match dataset commit ${meta.specsCommit}.`);
  }
  if (!fs.existsSync(path.join(config.specsRepo, "specification"))) {
    throw new Error(`Not an azure-rest-api-specs clone: ${config.specsRepo}`);
  }

  const tspBin = path.join(
    config.specsRepo,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "tsp.cmd" : "tsp",
  );
  if (!fs.existsSync(tspBin)) {
    throw new Error(`TypeSpec CLI is missing from the specs repo: ${tspBin}`);
  }

  return { meta, validatorIndex };
}

function indentation(line: string): number {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function quoteYaml(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Adds the local ruleset to the existing linter configuration without replacing
 * any official rulesets or other linter settings.
 */
export function injectLocalRuleset(config: string): string {
  if (config.includes(LOCAL_RULESET)) {
    return config;
  }

  const newline = config.includes("\r\n") ? "\r\n" : "\n";
  const lines = config.split(/\r?\n/);
  const linterIndex = lines.findIndex((line) => /^(\s*)linter:\s*(?:#.*)?$/.test(line));

  if (linterIndex === -1) {
    const suffix = config.endsWith("\n") || config.length === 0 ? "" : newline;
    return `${config}${suffix}linter:${newline}  extends:${newline}    - ${quoteYaml(
      LOCAL_RULESET,
    )}${newline}`;
  }

  const linterIndent = indentation(lines[linterIndex]);
  let sectionEnd = lines.length;
  for (let index = linterIndex + 1; index < lines.length; index++) {
    const trimmed = lines[index].trim();
    if (trimmed && !trimmed.startsWith("#") && indentation(lines[index]) <= linterIndent) {
      sectionEnd = index;
      break;
    }
  }

  const extendsIndex = lines.findIndex((line, index) => {
    return (
      index > linterIndex &&
      index < sectionEnd &&
      indentation(line) > linterIndent &&
      /^\s*extends:\s*/.test(line)
    );
  });

  if (extendsIndex === -1) {
    const childIndent = " ".repeat(linterIndent + 2);
    const itemIndent = " ".repeat(linterIndent + 4);
    lines.splice(
      linterIndex + 1,
      0,
      `${childIndent}extends:`,
      `${itemIndent}- ${quoteYaml(LOCAL_RULESET)}`,
    );
    return lines.join(newline);
  }

  const match = lines[extendsIndex].match(/^(\s*)extends:\s*(.*)$/)!;
  const extendsIndent = match[1];
  const value = match[2].trim();
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    lines[extendsIndex] =
      `${extendsIndent}extends: [${inner}${inner ? ", " : ""}${quoteYaml(LOCAL_RULESET)}]`;
  } else if (value) {
    lines.splice(
      extendsIndex,
      1,
      `${extendsIndent}extends:`,
      `${extendsIndent}  - ${value}`,
      `${extendsIndent}  - ${quoteYaml(LOCAL_RULESET)}`,
    );
  } else {
    let existingItem: string | undefined;
    for (let index = extendsIndex + 1; index < sectionEnd; index++) {
      if (!lines[index].trim() || lines[index].trimStart().startsWith("#")) {
        continue;
      }
      if (/^\s*-\s+/.test(lines[index])) {
        existingItem = lines[index];
      }
      break;
    }
    const itemIndent = existingItem?.match(/^\s*/)?.[0] ?? `${extendsIndent}  `;
    lines.splice(extendsIndex + 1, 0, `${itemIndent}- ${quoteYaml(LOCAL_RULESET)}`);
  }

  return lines.join(newline);
}

export function classifyDiagnosticOrigin(rule: string): DiagnosticOrigin {
  if (rule.startsWith(LOCAL_RULE_PREFIX)) {
    return "local";
  }
  if (rule.includes("/")) {
    return "official";
  }
  return "compiler";
}

function relativeDiagnosticPath(sourceFile: string, projectDir: string): string {
  const normalizedSource = sourceFile.replace(/\\/g, "/");
  if (/^[A-Za-z]:[\\/]/.test(sourceFile)) {
    const relative = path.win32.relative(projectDir, sourceFile).replace(/\\/g, "/");
    if (
      relative &&
      relative !== ".." &&
      !relative.startsWith("../") &&
      !path.win32.isAbsolute(relative)
    ) {
      return relative;
    }
    return normalizedSource;
  }
  if (path.posix.isAbsolute(normalizedSource)) {
    const normalizedProject = projectDir.replace(/\\/g, "/");
    const relative = path.posix.relative(normalizedProject, normalizedSource);
    if (
      relative &&
      relative !== ".." &&
      !relative.startsWith("../") &&
      !path.posix.isAbsolute(relative)
    ) {
      return relative;
    }
  }
  return normalizedSource.replace(/^\.\//, "");
}

/**
 * Parses the non-pretty TypeSpec CLI format. The location expression is greedy
 * so the final numeric fields are used and Windows drive-letter paths are kept.
 */
export function parseTypeSpecDiagnostics(
  output: string,
  project: string,
  projectDir: string,
): TypeSpecDiagnostic[] {
  const diagnostics: TypeSpecDiagnostic[] = [];
  const locationPattern = /^(.+):(\d+):(\d+) - (warning|error) ([^:]+):\s?(.*)$/;
  const locationlessPattern = /^(warning|error) ([^:]+):\s?(.*)$/;

  for (const line of output.split(/\r?\n/)) {
    const located = line.match(locationPattern);
    if (located) {
      diagnostics.push({
        rule: located[5].trim(),
        level: located[4] as "warning" | "error",
        origin: classifyDiagnosticOrigin(located[5].trim()),
        project,
        sourceFile: relativeDiagnosticPath(located[1], projectDir),
        line: Number.parseInt(located[2], 10),
        column: Number.parseInt(located[3], 10),
        message: located[6],
      });
      continue;
    }

    const locationless = line.match(locationlessPattern);
    if (locationless) {
      diagnostics.push({
        rule: locationless[2].trim(),
        level: locationless[1] as "warning" | "error",
        origin: classifyDiagnosticOrigin(locationless[2].trim()),
        project,
        message: locationless[3],
      });
    }
  }

  return diagnostics;
}

function diagnosticLocationKey(
  diagnostic: Pick<TypeSpecDiagnostic, "sourceFile" | "line" | "column">,
): string | undefined {
  return diagnostic.sourceFile && diagnostic.line && diagnostic.column
    ? `${diagnostic.sourceFile}\0${diagnostic.line}\0${diagnostic.column}`
    : undefined;
}

export function filterProjectedEnumDiagnostics(
  diagnostics: TypeSpecDiagnostic[],
  projected: ProjectedEnumResult,
  emittedBooleanNames?: Set<string>,
): TypeSpecDiagnostic[] {
  const projectedLocations = new Map(
    projected.locations.map((location) => [diagnosticLocationKey(location)!, location]),
  );
  return diagnostics.filter((diagnostic) => {
    if (diagnostic.rule !== ENUM_INSTEAD_OF_BOOLEAN_RULE) {
      return true;
    }

    const key = diagnosticLocationKey(diagnostic);
    if (key === undefined) {
      return false;
    }
    const location = projectedLocations.get(key);
    return (
      location !== undefined &&
      (emittedBooleanNames === undefined || emittedBooleanNames.has(location.emittedName))
    );
  });
}

export function filterProjectedDiagnostics(
  diagnostics: TypeSpecDiagnostic[],
  projected: ProjectedHttpGraphResult,
  projectedRules: Set<string>,
): TypeSpecDiagnostic[] {
  const projectedLocations = new Set(
    projected.reachableLocations.map((location) => diagnosticLocationKey(location)!),
  );
  const projectedQueryParameterLocations = new Set(
    projected.queryParameterLocations.map((location) => diagnosticLocationKey(location)!),
  );
  return diagnostics.filter((diagnostic) => {
    if (!projectedRules.has(diagnostic.rule)) {
      return true;
    }
    const key = diagnosticLocationKey(diagnostic);
    if (diagnostic.rule === VALID_QUERY_PARAMETERS_FOR_POINT_OPERATIONS_RULE) {
      return key === undefined || projectedQueryParameterLocations.has(key);
    }
    return key === undefined || projectedLocations.has(key);
  });
}

function collectBooleanSchemaNames(document: unknown): Set<string> {
  const names = new Set<string>();

  function visit(value: unknown, currentPath: Array<string | number>): void {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, [...currentPath, index]));
      return;
    }
    if (value === null || typeof value !== "object") {
      return;
    }

    const record = value as Record<string, unknown>;
    if (record.type === "boolean") {
      if (typeof record.name === "string") {
        names.add(record.name);
      } else {
        const propertiesIndex = currentPath.lastIndexOf("properties");
        names.add(
          propertiesIndex >= 0 && propertiesIndex + 1 < currentPath.length
            ? String(currentPath[propertiesIndex + 1])
            : "$direct",
        );
      }
    }
    for (const [key, child] of Object.entries(record)) {
      visit(child, [...currentPath, key]);
    }
  }

  visit(document, []);
  return names;
}

function loadEmittedBooleanNames(datasetDir: string, project: DatasetProject): Set<string> {
  const names = new Set<string>();
  for (const swaggerFile of project.swaggerFiles ?? []) {
    for (const name of collectBooleanSchemaNames(
      readJson(assertDatasetPath(datasetDir, swaggerFile)),
    )) {
      names.add(name);
    }
  }
  return names;
}

export function aggregateTypeSpecResults(
  specsCommit: string,
  generatedAt: string,
  diagnostics: TypeSpecDiagnostic[],
): TypeSpecAggregate {
  const rules: TypeSpecAggregate["rules"] = {};
  for (const diagnostic of diagnostics) {
    const rule = rules[diagnostic.rule] ?? {
      count: 0,
      levels: {},
      projectCount: 0,
      results: [],
    };
    rule.count++;
    rule.levels[diagnostic.level] = (rule.levels[diagnostic.level] ?? 0) + 1;
    rule.results.push(diagnostic);
    rules[diagnostic.rule] = rule;
  }

  for (const rule of Object.values(rules)) {
    rule.projectCount = new Set(rule.results.map((result) => result.project)).size;
  }

  return {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    specsCommit,
    generatedAt,
    totalDiagnostics: diagnostics.length,
    rules: Object.fromEntries(
      Object.entries(rules).sort(([left], [right]) => left.localeCompare(right)),
    ),
  };
}

export function encodedRuleFileName(rule: string): string {
  return `${rule.replace(/[^A-Za-z0-9._-]/g, (character) => {
    return `_${character.codePointAt(0)!.toString(16)}`;
  })}.json`;
}

function difference(left: Set<string>, right: Set<string>): string[] {
  return [...left].filter((value) => !right.has(value)).sort();
}

function intersection(left: Set<string>, right: Set<string>): string[] {
  return [...left].filter((value) => right.has(value)).sort();
}

interface DiagnosticNormalization {
  validatorKeys: Set<string>;
  typeSpecKeys: Set<string>;
  method: string;
}

export interface DiagnosticNormalizationContext {
  selectedApiVersions: Map<string, string | undefined>;
  loadSwaggerDocument: (relativePath: string) => unknown;
  loadTypeSpecSource: (project: string, relativePath: string) => string;
}

function jsonPathValue(document: unknown, jsonPath: Array<string | number>): unknown {
  let current = document;
  for (const segment of jsonPath) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current;
}

function commonTypesVersion(value: string): string | undefined {
  return /(?:^|\/)resource-management\/(v\d+)\/types\.json(?:#|$)/i.exec(value)?.[1].toLowerCase();
}

export function normalizeLatestCommonTypesValidatorDiagnostic(
  diagnostic: ValidatorDiagnostic,
  swaggerDocument: unknown,
  selectedApiVersion?: string,
): string | undefined {
  const reference = jsonPathValue(swaggerDocument, diagnostic.path);
  if (typeof reference !== "string") {
    return undefined;
  }
  const version = commonTypesVersion(reference);
  return version
    ? `${diagnostic.project}\0${selectedApiVersion ?? "unversioned"}\0${version}`
    : undefined;
}

export function normalizeLatestCommonTypesTypeSpecDiagnostic(
  diagnostic: TypeSpecDiagnostic,
  selectedApiVersion?: string,
  sourceText?: string,
): string | undefined {
  if (selectedApiVersion && sourceText && diagnostic.line) {
    const targetLine = sourceText.split(/\r?\n/)[diagnostic.line - 1];
    const targetApiVersion = /:\s*"(\d{4}-\d{2}-\d{2}(?:-preview)?)"/i.exec(targetLine)?.[1];
    if (targetApiVersion && targetApiVersion !== selectedApiVersion) {
      return undefined;
    }
  }
  const version = /instead of '(v\d+)'/i.exec(diagnostic.message)?.[1].toLowerCase();
  return version
    ? `${diagnostic.project}\0${selectedApiVersion ?? "unversioned"}\0${version}`
    : undefined;
}

function normalizeDiagnostics(
  validatorRule: string,
  validatorDiagnostics: ValidatorDiagnostic[],
  typeSpecDiagnostics: TypeSpecDiagnostic[],
  failedProjects: Set<string>,
  context?: DiagnosticNormalizationContext,
): DiagnosticNormalization | undefined {
  if (validatorRule !== "LatestVersionOfCommonTypesMustBeUsed" || context === undefined) {
    return undefined;
  }

  const validatorKeys = new Set<string>();
  for (const diagnostic of validatorDiagnostics) {
    if (failedProjects.has(diagnostic.project) || !diagnostic.swaggerFile) {
      continue;
    }
    const selectedApiVersion = context.selectedApiVersions.get(diagnostic.project);
    const key = normalizeLatestCommonTypesValidatorDiagnostic(
      diagnostic,
      context.loadSwaggerDocument(diagnostic.swaggerFile),
      selectedApiVersion,
    );
    if (key) {
      validatorKeys.add(key);
    }
  }

  const typeSpecKeys = new Set<string>();
  for (const diagnostic of typeSpecDiagnostics) {
    if (failedProjects.has(diagnostic.project)) {
      continue;
    }
    const selectedApiVersion = context.selectedApiVersions.get(diagnostic.project);
    const sourceText =
      diagnostic.sourceFile === undefined
        ? undefined
        : context.loadTypeSpecSource(diagnostic.project, diagnostic.sourceFile);
    const key = normalizeLatestCommonTypesTypeSpecDiagnostic(
      diagnostic,
      selectedApiVersion,
      sourceText,
    );
    if (key) {
      typeSpecKeys.add(key);
    }
  }

  return {
    validatorKeys,
    typeSpecKeys,
    method: "project + selected API version + ARM common-types version",
  };
}

function consistencyPercent(left: Set<string>, right: Set<string>): number | null {
  const union = new Set([...left, ...right]);
  if (union.size === 0) {
    return null;
  }
  return (intersection(left, right).length / union.size) * 100;
}

export function compareResults(
  specsCommit: string,
  generatedAt: string,
  validatorRules: Record<string, ValidatorRuleData>,
  aggregate: TypeSpecAggregate,
  mappings: Map<string, Set<string>>,
  scope: AnalysisScope,
  options: {
    durationMs?: number;
    failedProjects?: Set<string>;
    knownValidatorRules?: Iterable<string>;
    fixtureMetadata?: Map<string, ValidatorFixtureMetadata>;
    normalizationContext?: DiagnosticNormalizationContext;
    stagingValidatorRules?: Set<string>;
  } = {},
): ComparisonResults {
  const failedProjects = options.failedProjects ?? new Set<string>();
  const knownValidatorRules = new Set([
    ...Object.keys(validatorRules),
    ...mappings.keys(),
    ...(options.knownValidatorRules ?? []),
  ]);
  const rules = [...knownValidatorRules]
    .sort((left, right) => left.localeCompare(right))
    .map((validatorRule) => {
      const validator = validatorRules[validatorRule] ?? { count: 0, projects: [] };
      const mappedTypeSpecRules = [...(mappings.get(validatorRule) ?? [])].sort();
      const validatorResults = validator.results?.filter(
        (diagnostic) => !failedProjects.has(diagnostic.project),
      );
      const validatorProjects = new Set(
        validatorResults
          ? validatorResults.map((diagnostic) => diagnostic.project)
          : difference(new Set(validator.projects), failedProjects),
      );
      const unassessedProjects: string[] = [];
      const assessableValidatorProjects = [...validatorProjects].sort();
      const assessableValidatorProjectSet = new Set(assessableValidatorProjects);
      const typeSpecProjects = new Set<string>();
      const firedTypeSpecRules: string[] = [];
      const mappedTypeSpecDiagnostics: TypeSpecDiagnostic[] = [];
      let typeSpecDiagnosticCount = 0;

      for (const typeSpecRule of mappedTypeSpecRules) {
        const result = aggregate.rules[typeSpecRule];
        if (!result) {
          continue;
        }
        let fired = false;
        for (const diagnostic of result.results) {
          if (failedProjects.has(diagnostic.project)) {
            continue;
          }
          fired = true;
          typeSpecDiagnosticCount++;
          mappedTypeSpecDiagnostics.push(diagnostic);
          typeSpecProjects.add(diagnostic.project);
        }
        if (fired) {
          firedTypeSpecRules.push(typeSpecRule);
        }
      }

      const overlapProjects = intersection(assessableValidatorProjectSet, typeSpecProjects);
      const validatorOnlyProjects = difference(assessableValidatorProjectSet, typeSpecProjects);
      const typeSpecOnlyProjects = difference(typeSpecProjects, assessableValidatorProjectSet);
      const observedCoveragePercent =
        assessableValidatorProjects.length === 0
          ? null
          : (overlapProjects.length / assessableValidatorProjects.length) * 100;
      const normalization = normalizeDiagnostics(
        validatorRule,
        validator.results ?? [],
        mappedTypeSpecDiagnostics,
        failedProjects,
        options.normalizationContext,
      );
      return {
        validatorRule,
        validatorMode: options.stagingValidatorRules?.has(validatorRule) ? "staging" : "production",
        coverageKind: options.fixtureMetadata?.get(validatorRule)?.coverageKind ?? "unknown",
        mappedTypeSpecRules,
        firedTypeSpecRules,
        officialMapping: mappedTypeSpecRules.some((rule) => rule.startsWith("@azure-tools/")),
        validatorProjectCount: validatorProjects.size,
        assessableValidatorProjectCount: assessableValidatorProjects.length,
        typeSpecProjectCount: typeSpecProjects.size,
        overlapProjectCount: overlapProjects.length,
        validatorOnlyProjectCount: validatorOnlyProjects.length,
        unassessedProjectCount: 0,
        typeSpecOnlyProjectCount: typeSpecOnlyProjects.length,
        observedCoveragePercent,
        validatorDiagnosticCount: validatorResults?.length ?? validator.count,
        typeSpecDiagnosticCount,
        normalizedValidatorDiagnosticCount: normalization?.validatorKeys.size ?? null,
        normalizedTypeSpecDiagnosticCount: normalization?.typeSpecKeys.size ?? null,
        diagnosticConsistencyPercent: normalization
          ? consistencyPercent(normalization.validatorKeys, normalization.typeSpecKeys)
          : null,
        normalizationMethod: normalization?.method ?? null,
        validatorProjects: [...validatorProjects].sort(),
        assessableValidatorProjects,
        typeSpecProjects: [...typeSpecProjects].sort(),
        overlapProjects,
        validatorOnlyProjects,
        unassessedProjects,
        typeSpecOnlyProjects,
      };
    });

  const mappedTypeSpecRules = new Set([...mappings.values()].flatMap((values) => [...values]));
  const unmappedTypeSpecRules = Object.entries(aggregate.rules)
    .filter(([rule]) => !mappedTypeSpecRules.has(rule))
    .map(([rule, result]) => {
      const diagnostics = result.results.filter(
        (diagnostic) => !failedProjects.has(diagnostic.project),
      );
      const projects = [...new Set(diagnostics.map((diagnostic) => diagnostic.project))].sort();
      return {
        rule,
        count: diagnostics.length,
        projectCount: projects.length,
        projects,
      };
    })
    .filter((entry) => entry.count > 0)
    .sort((left, right) => left.rule.localeCompare(right.rule));

  return {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    specsCommit,
    generatedAt,
    durationMs: options.durationMs ?? 0,
    partial: scope.partial,
    sourceProjectCount: scope.sourceProjectCount,
    projectCount: scope.projects.length - failedProjects.size,
    successfulProjectCount: scope.projects.length - failedProjects.size,
    failedProjectCount: failedProjects.size,
    projects: scope.projects.filter((project) => !failedProjects.has(project)),
    unassessedProjects: [...failedProjects].sort(),
    filters: scope.filters,
    rules,
    unmappedTypeSpecRules,
  };
}

export function loadValidatorFixtureMetadata(
  fixturesDir: string,
): Map<string, ValidatorFixtureMetadata> {
  const fixtureMetadata = new Map<string, ValidatorFixtureMetadata>();
  if (!fs.existsSync(fixturesDir)) {
    throw new Error(`Fixture directory does not exist: ${fixturesDir}`);
  }

  for (const directory of fs.readdirSync(fixturesDir, { withFileTypes: true })) {
    if (!directory.isDirectory()) {
      continue;
    }
    const rulePath = path.join(fixturesDir, directory.name, "rule.md");
    if (!fs.existsSync(rulePath)) {
      continue;
    }

    const content = fs.readFileSync(rulePath, "utf8");
    const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatter) {
      throw new Error(`Missing YAML frontmatter in ${rulePath}`);
    }

    const metadata = YAML.parse(frontmatter[1]) as {
      validatorRuleId?: unknown;
      coverageKind?: unknown;
      tspLints?: unknown;
      projectionScope?: unknown;
    };
    if (typeof metadata.validatorRuleId !== "string") {
      throw new Error(`Missing validatorRuleId in ${rulePath}`);
    }

    if (metadata.coverageKind !== undefined && typeof metadata.coverageKind !== "string") {
      throw new Error(`coverageKind must be a string in ${rulePath}`);
    }
    if (
      metadata.tspLints !== undefined &&
      (!Array.isArray(metadata.tspLints) ||
        metadata.tspLints.some((value) => typeof value !== "string"))
    ) {
      throw new Error(`tspLints must be a string array in ${rulePath}`);
    }
    if (
      metadata.projectionScope !== undefined &&
      metadata.projectionScope !== "none" &&
      metadata.projectionScope !== "http-reachable"
    ) {
      throw new Error(`projectionScope must be none or http-reachable in ${rulePath}`);
    }

    const validatorRule = metadata.validatorRuleId;
    const typeSpecRules = (metadata.tspLints ?? []) as string[];
    const existing = fixtureMetadata.get(validatorRule) ?? {
      coverageKind: "unknown",
      tspLints: new Set<string>(),
      projectionScope: "none" as const,
    };
    if (
      metadata.coverageKind !== undefined &&
      existing.coverageKind !== "unknown" &&
      existing.coverageKind !== metadata.coverageKind
    ) {
      throw new Error(`Conflicting coverageKind values for ${validatorRule}.`);
    }
    if (metadata.coverageKind !== undefined) {
      existing.coverageKind = metadata.coverageKind;
    }
    for (const typeSpecRule of typeSpecRules) {
      existing.tspLints.add(typeSpecRule);
    }
    if (metadata.projectionScope === "http-reachable") {
      existing.projectionScope = "http-reachable";
    }
    fixtureMetadata.set(validatorRule, existing);
  }

  return fixtureMetadata;
}

export function loadValidatorMappings(fixturesDir: string): Map<string, Set<string>> {
  return new Map(
    [...loadValidatorFixtureMetadata(fixturesDir)].map(([rule, metadata]) => [
      rule,
      metadata.tspLints,
    ]),
  );
}

export function loadKnownValidatorRules(metadataPath: string): Set<string> {
  const metadata = readJson<Array<{ id?: unknown }>>(metadataPath);
  if (!Array.isArray(metadata)) {
    throw new Error(`Validator rule metadata must be an array: ${metadataPath}`);
  }

  const rules = new Set<string>();
  for (const entry of metadata) {
    if (typeof entry.id !== "string") {
      throw new Error(`Validator rule metadata entry is missing id: ${metadataPath}`);
    }
    rules.add(entry.id);
  }
  return rules;
}

function assertDatasetPath(datasetDir: string, relativePath: string): string {
  const root = path.resolve(datasetDir);
  const absolutePath = path.resolve(root, relativePath);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Dataset path escapes the output directory: ${relativePath}`);
  }
  return absolutePath;
}

export function loadValidatorRuleData(
  datasetDir: string,
  validatorIndex: ValidatorIndex,
  selectedProjects: Set<string>,
): Record<string, ValidatorRuleData> {
  const rules: Record<string, ValidatorRuleData> = {};
  for (const [rule, summary] of Object.entries(validatorIndex.rules)) {
    const shardPath = assertDatasetPath(datasetDir, summary.resultsFile);
    if (!fs.existsSync(shardPath)) {
      throw new Error(`Validator result shard is missing: ${summary.resultsFile}`);
    }
    const shard = readJson<ValidatorShard>(shardPath);
    if (!Array.isArray(shard.results)) {
      throw new Error(`Validator result shard has no results array: ${summary.resultsFile}`);
    }
    const selectedResults = shard.results.filter((result) => selectedProjects.has(result.project));
    rules[rule] = {
      count: selectedResults.length,
      projects: [...new Set(selectedResults.map((result) => result.project))].sort(),
      results: selectedResults,
    };
  }
  return rules;
}

function listFingerprintFiles(packageDir: string): string[] {
  const files = ["package.json", "tsconfig.json", "tsconfig.build.json"];
  const sourceRoot = path.join(packageDir, "src");
  const pending = [sourceRoot];
  while (pending.length > 0) {
    const current = pending.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(absolutePath);
      } else if (entry.isFile()) {
        files.push(normalizeRelative(path.relative(packageDir, absolutePath)));
      }
    }
  }
  return files.sort();
}

function fingerprintLocalLinter(packageDir: string): { value: string; files: string[] } {
  const files = listFingerprintFiles(packageDir);
  const hash = createHash("sha256");
  for (const relativePath of files) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(packageDir, relativePath)));
    hash.update("\0");
  }
  return { value: `sha256:${hash.digest("hex")}`, files };
}

function setupLocalLinter(packageDir: string, specsRepo: string): void {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  console.log("Building local TypeSpec linter.");
  execFileSync(npm, ["run", "build"], {
    cwd: packageDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  console.log("Linking local TypeSpec linter into the specs repo.");
  execFileSync(npm, ["link"], {
    cwd: packageDir,
    stdio: "pipe",
    shell: process.platform === "win32",
  });
  execFileSync(npm, ["link", "tsp-lintdiff-local-linter"], {
    cwd: specsRepo,
    stdio: "pipe",
    shell: process.platform === "win32",
  });

  const linkedLinter = path.join(
    specsRepo,
    "node_modules",
    "tsp-lintdiff-local-linter",
    "dist",
    "src",
    "linter.js",
  );
  if (!fs.existsSync(linkedLinter)) {
    throw new Error(`Linked local linter has no built output: ${linkedLinter}`);
  }
}

function commandOutput(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return Buffer.isBuffer(value) ? value.toString("utf8") : "";
}

async function compileProject(
  config: Config,
  project: DatasetProject,
  projectedRules: Set<string>,
): Promise<{ result: TypeSpecProjectResult; diagnostics: TypeSpecDiagnostic[] }> {
  const projectDir = path.resolve(config.specsRepo, project.sourcePath);
  const mainPath = path.join(projectDir, "main.tsp");
  const configPath = path.join(projectDir, "tspconfig.yaml");
  if (!fs.existsSync(mainPath) || !fs.existsSync(configPath)) {
    throw new Error(`Dataset project no longer exists at the pinned commit: ${project.sourcePath}`);
  }

  const tempConfigPath = path.join(
    projectDir,
    `.tspconfig.lintdiff-${process.pid}-${randomUUID()}.yaml`,
  );
  const projectDatasetRoot = path.dirname(
    assertDatasetPath(config.datasetDir, project.typespecPath),
  );
  const rawRoot = path.join(projectDatasetRoot, "raw");
  const stdoutPath = path.join(rawRoot, "typespec.stdout.txt");
  const stderrPath = path.join(rawRoot, "typespec.stderr.txt");
  const projectedHttpGraphPath = path.join(rawRoot, "typespec.projected-http-graph.json");
  const rawFiles = [stdoutPath, stderrPath].map((filePath) =>
    normalizeRelative(path.relative(config.datasetDir, filePath)),
  );
  fs.mkdirSync(rawRoot, { recursive: true });

  let stdout = "";
  let stderr = "";
  let status: "success" | "failed" = "success";
  let errorMessage: string | undefined;
  const started = Date.now();

  try {
    fs.writeFileSync(tempConfigPath, injectLocalRuleset(fs.readFileSync(configPath, "utf8")));
    const tspBin = path.join(
      config.specsRepo,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "tsp.cmd" : "tsp",
    );
    try {
      const result = await execFileAsync(
        tspBin,
        [
          "compile",
          "main.tsp",
          "--no-emit",
          "--warn-as-error=false",
          "--pretty",
          "false",
          "--config",
          tempConfigPath,
        ],
        {
          cwd: projectDir,
          maxBuffer: MAX_BUFFER,
          timeout: 300_000,
          shell: process.platform === "win32",
          env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=4096" },
        },
      );
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error: unknown) {
      status = "failed";
      if (error && typeof error === "object") {
        const commandError = error as {
          stdout?: unknown;
          stderr?: unknown;
          message?: unknown;
        };
        stdout = commandOutput(commandError.stdout);
        stderr = commandOutput(commandError.stderr);
        errorMessage =
          typeof commandError.message === "string"
            ? commandError.message
            : "TypeSpec compilation failed.";
      } else {
        errorMessage = String(error);
      }
    }
  } finally {
    try {
      fs.writeFileSync(stdoutPath, stdout);
      fs.writeFileSync(stderrPath, stderr);
    } finally {
      fs.rmSync(tempConfigPath, { force: true });
    }
  }

  let diagnostics = [
    ...parseTypeSpecDiagnostics(stdout, project.sourcePath, projectDir),
    ...parseTypeSpecDiagnostics(stderr, project.sourcePath, projectDir),
  ];
  const rawDiagnosticCount = diagnostics.length;
  if (
    status === "success" &&
    project.apiVersion &&
    diagnostics.some(
      (diagnostic) =>
        projectedRules.has(diagnostic.rule) || diagnostic.rule === ENUM_INSTEAD_OF_BOOLEAN_RULE,
    )
  ) {
    const workerPath = path.join(import.meta.dirname, "projected-enum-worker.ts");
    const projected = await execFileAsync(
      process.execPath,
      ["--import", TSX_ESM_LOADER, workerPath, mainPath, configPath, project.apiVersion],
      {
        cwd: projectDir,
        maxBuffer: MAX_BUFFER,
        timeout: 300_000,
        env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=4096" },
      },
    );
    const projectedResult = JSON.parse(projected.stdout) as ProjectedEnumResult;
    writeJson(projectedHttpGraphPath, projectedResult);
    rawFiles.push(normalizeRelative(path.relative(config.datasetDir, projectedHttpGraphPath)));
    diagnostics = filterProjectedDiagnostics(diagnostics, projectedResult, projectedRules);
    diagnostics = filterProjectedEnumDiagnostics(
      diagnostics,
      projectedResult,
      loadEmittedBooleanNames(config.datasetDir, project),
    );
  } else {
    fs.rmSync(projectedHttpGraphPath, { force: true });
  }
  return {
    result: {
      project: project.sourcePath,
      status,
      durationMs: Date.now() - started,
      diagnosticCount: diagnostics.length,
      rawDiagnosticCount,
      projectedDiagnosticCount: diagnostics.length,
      error: errorMessage,
      rawFiles,
    },
    diagnostics,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  action: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      results[index] = await action(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

function writeTypeSpecResults(
  datasetDir: string,
  aggregate: TypeSpecAggregate,
  projectResults: TypeSpecProjectResult[],
  scope: AnalysisScope,
  durationMs: number,
): { index: TypeSpecIndex; resultFiles: string[] } {
  const shardRoot = path.join(datasetDir, "results", "by-typespec-rule");
  fs.rmSync(shardRoot, { recursive: true, force: true });

  const resultFiles: string[] = [];
  const rules: TypeSpecIndex["rules"] = {};
  for (const [rule, result] of Object.entries(aggregate.rules)) {
    const resultsFile = normalizeRelative(
      path.join("results", "by-typespec-rule", encodedRuleFileName(rule)),
    );
    writeJson(path.join(datasetDir, resultsFile), {
      schemaVersion: ANALYSIS_SCHEMA_VERSION,
      specsCommit: aggregate.specsCommit,
      generatedAt: aggregate.generatedAt,
      rule,
      ...result,
    });
    resultFiles.push(resultsFile);
    rules[rule] = {
      count: result.count,
      levels: result.levels,
      projectCount: result.projectCount,
      resultsFile,
    };
  }

  const index: TypeSpecIndex = {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    specsCommit: aggregate.specsCommit,
    generatedAt: aggregate.generatedAt,
    durationMs,
    ruleset: LOCAL_RULESET,
    partial: scope.partial,
    sourceProjectCount: scope.sourceProjectCount,
    projectCount: projectResults.length,
    filters: scope.filters,
    failedProjectCount: projectResults.filter((project) => project.status === "failed").length,
    totalDiagnostics: aggregate.totalDiagnostics,
    rules,
    projects: projectResults,
  };
  writeJson(path.join(datasetDir, "typespec-results.json"), index);
  return { index, resultFiles: ["typespec-results.json", ...resultFiles] };
}

function invalidateExistingAnalysis(datasetDir: string, meta: DatasetMetadata): void {
  const previousAnalysis = meta.typespecAnalysis;
  if (!previousAnalysis) {
    return;
  }

  const previousRawFiles = new Set(previousAnalysis.rawFiles);
  for (const project of meta.projects) {
    project.rawFiles = project.rawFiles.filter(
      (relativePath) => !previousRawFiles.has(relativePath),
    );
  }
  delete meta.typespecAnalysis;
  writeJson(path.join(datasetDir, "_meta.json"), meta);

  for (const relativePath of [...previousAnalysis.resultFiles, ...previousAnalysis.rawFiles]) {
    fs.rmSync(assertDatasetPath(datasetDir, relativePath), {
      recursive: true,
      force: true,
    });
  }
}

function escapeMarkdown(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function formatObservedPercent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

function coverageTableHeader(): string[] {
  return [
    "| Validator Rule | Mode | CovKind | Fired | TSP Fired | Lint/Overlap | Gap | TSP Only | Observed % | Official Mapping | Fired TSP Rules | Mapped TSP Rules | Validator Diagnostics | TSP Diagnostics |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: |",
  ];
}

function coverageTableRow(entry: ComparisonEntry): string {
  return `| ${escapeMarkdown(entry.validatorRule)} | ${entry.validatorMode} | ${escapeMarkdown(
    entry.coverageKind,
  )} | ${entry.validatorProjectCount} | ${entry.typeSpecProjectCount} | ${
    entry.overlapProjectCount
  } | ${entry.validatorOnlyProjectCount} | ${entry.typeSpecOnlyProjectCount} | ${formatObservedPercent(
    entry.observedCoveragePercent,
  )} | ${
    entry.officialMapping ? "yes" : "no"
  } | ${escapeMarkdown(entry.firedTypeSpecRules.join("<br>") || "—")} | ${escapeMarkdown(
    entry.mappedTypeSpecRules.join("<br>") || "—",
  )} | ${entry.validatorDiagnosticCount} | ${entry.typeSpecDiagnosticCount} |`;
}

function markdownDuration(durationMs: number): string {
  return `Analysis duration: ${durationMs} ms`;
}

export function comparisonMarkdown(comparison: ComparisonResults): string {
  const lines = [
    "# Validator and TypeSpec diagnostic comparison",
    "",
    `Specs commit: \`${comparison.specsCommit}\``,
    "",
    `Scope: ${comparison.partial ? "partial" : "full"} (${comparison.projectCount}/${comparison.sourceProjectCount} projects)`,
    "",
    markdownDuration(comparison.durationMs),
    "",
    ...(comparison.filters.path ? [`Path filter: \`${comparison.filters.path}\``, ""] : []),
    "Only successfully compiled TypeSpec projects are included in validator and TypeSpec counts.",
    "",
    "Coverage is observed only when a mapped TypeSpec diagnostic fires in the same included project as the validator rule.",
    "",
    ...coverageTableHeader(),
  ];

  for (const entry of comparison.rules) {
    lines.push(coverageTableRow(entry));
  }

  lines.push(
    "",
    "## Column definitions",
    "",
    "- **Fired**: included projects where the validator rule fired.",
    "- **Mode**: `production` for the normal AutoRest validator run or `staging` for a separately evaluated `stagingOnly` rule.",
    "- **TSP Fired**: included projects where at least one mapped TypeSpec rule fired.",
    "- **Lint/Overlap**: validator projects with a mapped TypeSpec diagnostic in the same project.",
    "- **Gap**: validator projects without a mapped TypeSpec diagnostic.",
    "- **TSP Only**: included projects where a mapped TypeSpec rule fired without the validator rule.",
    "- **Observed %**: Lint/Overlap divided by validator projects; unavailable when none fired.",
    "- **Official Mapping**: whether any mapped rule starts with `@azure-tools/`; it is not coverage unless it overlaps.",
    "- **Fired TSP Rules**: mapped rules with diagnostics in at least one successful project.",
    "- **Mapped TSP Rules**: all `tspLints` declared in fixture YAML frontmatter.",
    "- **Validator Diagnostics** and **TSP Diagnostics**: raw validator count and successful-project mapped TypeSpec diagnostic count.",
    "",
    "## Unmapped TypeSpec rules",
    "",
    "| TypeSpec rule | Projects | Diagnostics |",
    "| --- | ---: | ---: |",
  );
  if (comparison.unmappedTypeSpecRules.length === 0) {
    lines.push("| _None_ | 0 | 0 |");
  } else {
    for (const entry of comparison.unmappedTypeSpecRules) {
      lines.push(`| ${escapeMarkdown(entry.rule)} | ${entry.projectCount} | ${entry.count} |`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

export function createCoverageBreakdown(comparison: ComparisonResults): CoverageBreakdown {
  const hundredPercentObservedCoverage = comparison.rules
    .filter(
      (entry) =>
        entry.assessableValidatorProjectCount > 0 &&
        entry.overlapProjectCount === entry.assessableValidatorProjectCount,
    )
    .map((entry) => entry.validatorRule);
  const partialObservedCoverage = comparison.rules
    .filter(
      (entry) =>
        entry.overlapProjectCount > 0 &&
        entry.overlapProjectCount < entry.assessableValidatorProjectCount,
    )
    .map((entry) => entry.validatorRule);
  const zeroObservedCoverage = comparison.rules
    .filter(
      (entry) =>
        entry.mappedTypeSpecRules.length > 0 &&
        entry.assessableValidatorProjectCount > 0 &&
        entry.overlapProjectCount === 0,
    )
    .map((entry) => entry.validatorRule);
  const unmappedValidatorRules = comparison.rules
    .filter((entry) => entry.mappedTypeSpecRules.length === 0)
    .map((entry) => entry.validatorRule);
  const validatorRulesNeverFired = comparison.rules
    .filter((entry) => entry.validatorProjectCount === 0)
    .map((entry) => entry.validatorRule);
  const typeSpecOnlyRules = comparison.unmappedTypeSpecRules.map((entry) => entry.rule);

  return {
    schemaVersion: comparison.schemaVersion,
    specsCommit: comparison.specsCommit,
    generatedAt: comparison.generatedAt,
    durationMs: comparison.durationMs,
    partial: comparison.partial,
    sourceProjectCount: comparison.sourceProjectCount,
    projectCount: comparison.projectCount,
    successfulProjectCount: comparison.successfulProjectCount,
    failedProjectCount: comparison.failedProjectCount,
    projects: comparison.projects,
    unassessedProjects: comparison.unassessedProjects,
    filters: comparison.filters,
    summary: {
      validatorRuleCount: comparison.rules.length,
      hundredPercentObservedCoverageCount: hundredPercentObservedCoverage.length,
      partialObservedCoverageCount: partialObservedCoverage.length,
      zeroObservedCoverageCount: zeroObservedCoverage.length,
      unmappedValidatorRuleCount: unmappedValidatorRules.length,
      validatorRulesNeverFiredCount: validatorRulesNeverFired.length,
      typeSpecOnlyRuleCount: typeSpecOnlyRules.length,
      unassessedProjectCount: comparison.unassessedProjects.length,
    },
    categories: {
      hundredPercentObservedCoverage,
      partialObservedCoverage,
      zeroObservedCoverage,
      unmappedValidatorRules,
      validatorRulesNeverFired,
      typeSpecOnlyRules,
      unassessedProjects: comparison.unassessedProjects,
    },
    rules: comparison.rules,
    typeSpecOnlyRules: comparison.unmappedTypeSpecRules,
  };
}

function appendCoverageSection(
  lines: string[],
  title: string,
  ruleIds: string[],
  rulesById: Map<string, ComparisonEntry>,
): void {
  lines.push("", `## ${title} (${ruleIds.length})`, "", ...coverageTableHeader());
  if (ruleIds.length === 0) {
    lines.push("| _None_ | — | — | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |");
    return;
  }
  for (const ruleId of ruleIds) {
    lines.push(coverageTableRow(rulesById.get(ruleId)!));
  }
}

export function coverageBreakdownMarkdown(breakdown: CoverageBreakdown): string {
  const lines = [
    "# Observed validator and TypeSpec coverage breakdown",
    "",
    `Specs commit: \`${breakdown.specsCommit}\``,
    "",
    `Scope: ${breakdown.partial ? "partial" : "full"} (${breakdown.projectCount}/${breakdown.sourceProjectCount} projects)`,
    "",
    markdownDuration(breakdown.durationMs),
    "",
    "Only successfully compiled TypeSpec projects are included in validator and TypeSpec counts.",
    "",
    "Official mappings and fixture coverage kinds are context only. Coverage is credited only for diagnostics that overlap in the same successful project.",
    "",
    "Categories are investigative views and may overlap (for example, an unmapped rule may also have never fired).",
    "",
    "## Summary",
    "",
    "| Category | Count |",
    "| --- | ---: |",
    `| Known validator rules | ${breakdown.summary.validatorRuleCount} |`,
    `| 100% observed coverage | ${breakdown.summary.hundredPercentObservedCoverageCount} |`,
    `| Partial observed coverage | ${breakdown.summary.partialObservedCoverageCount} |`,
    `| Zero observed coverage | ${breakdown.summary.zeroObservedCoverageCount} |`,
    `| Unmapped validator rules | ${breakdown.summary.unmappedValidatorRuleCount} |`,
    `| Validator rules never fired | ${breakdown.summary.validatorRulesNeverFiredCount} |`,
    `| TypeSpec-only / unmapped TypeSpec rules | ${breakdown.summary.typeSpecOnlyRuleCount} |`,
    "",
    "## Column definitions",
    "",
    "- **Validator Rule**: validator rule identifier from the catalog, fixtures, or validator results.",
    "- **Mode**: `production` for the normal AutoRest validator run or `staging` for a separately evaluated `stagingOnly` rule.",
    "- **CovKind**: fixture `coverageKind` value, or `unknown` when no fixture supplies it.",
    "- **Fired**: included projects where the validator rule fired.",
    "- **TSP Fired**: included projects where at least one mapped TypeSpec rule fired.",
    "- **Lint/Overlap**: validator projects with a mapped TypeSpec diagnostic in the same project.",
    "- **Gap**: validator projects without a mapped TypeSpec diagnostic.",
    "- **TSP Only**: included projects where a mapped TypeSpec rule fired without the validator rule.",
    "- **Observed %**: Lint/Overlap divided by validator projects; unavailable when the denominator is zero.",
    "- **Official Mapping**: whether any mapped rule starts with `@azure-tools/`; mapping alone receives no coverage credit.",
    "- **Fired TSP Rules**: mapped rules that actually emitted diagnostics in successful projects.",
    "- **Mapped TSP Rules**: all fixture `tspLints` mappings.",
    "- **Validator Diagnostics** and **TSP Diagnostics**: raw validator count and successful-project mapped TypeSpec diagnostic count.",
  ];
  const rulesById = new Map(breakdown.rules.map((entry) => [entry.validatorRule, entry]));
  appendCoverageSection(
    lines,
    "100% observed coverage",
    breakdown.categories.hundredPercentObservedCoverage,
    rulesById,
  );
  appendCoverageSection(
    lines,
    "Partial observed coverage",
    breakdown.categories.partialObservedCoverage,
    rulesById,
  );
  appendCoverageSection(
    lines,
    "Zero observed coverage",
    breakdown.categories.zeroObservedCoverage,
    rulesById,
  );
  appendCoverageSection(
    lines,
    "Unmapped validator rules",
    breakdown.categories.unmappedValidatorRules,
    rulesById,
  );
  appendCoverageSection(
    lines,
    "Validator rules never fired",
    breakdown.categories.validatorRulesNeverFired,
    rulesById,
  );

  lines.push(
    "",
    `## TypeSpec-only / unmapped TypeSpec rules (${breakdown.typeSpecOnlyRules.length})`,
    "",
    "| TypeSpec Rule | Projects | Diagnostics | Project List |",
    "| --- | ---: | ---: | --- |",
  );
  if (breakdown.typeSpecOnlyRules.length === 0) {
    lines.push("| _None_ | 0 | 0 | — |");
  } else {
    for (const entry of breakdown.typeSpecOnlyRules) {
      lines.push(
        `| ${escapeMarkdown(entry.rule)} | ${entry.projectCount} | ${
          entry.count
        } | ${escapeMarkdown(entry.projects.join("<br>") || "—")} |`,
      );
    }
  }

  lines.push("");
  return lines.join("\n");
}

export function selectProjects(
  projects: DatasetProject[],
  filter: string | undefined,
  limit: number,
): DatasetProject[] {
  const matches = projects.filter((project) => !filter || project.sourcePath.includes(filter));
  const selected = Number.isFinite(limit) ? matches.slice(0, limit) : matches;
  if (selected.length === 0) {
    throw new Error(`No dataset projects matched filter ${JSON.stringify(filter ?? "")}.`);
  }
  return selected;
}

async function run(config: Config): Promise<void> {
  const { meta, validatorIndex } = validateInputs(config);
  const selectedProjects = selectProjects(meta.projects, config.filter, config.limit);
  const scope: AnalysisScope = {
    partial: selectedProjects.length !== meta.projects.length,
    sourceProjectCount: meta.projects.length,
    projects: selectedProjects.map((project) => project.sourcePath),
    filters: {
      path: config.filter,
      limit: Number.isFinite(config.limit) ? config.limit : undefined,
    },
  };
  const dirty = git(config.specsRepo, ["status", "--porcelain"]);
  if (dirty) {
    throw new Error("The specs repo has local changes. Commit, stash, or remove them first.");
  }

  const originalRef =
    tryGit(config.specsRepo, ["symbolic-ref", "--quiet", "--short", "HEAD"]) ??
    git(config.specsRepo, ["rev-parse", "HEAD"]);
  const originalCommit = git(config.specsRepo, ["rev-parse", "HEAD"]);
  const targetCommit = git(config.specsRepo, ["rev-parse", `${meta.specsCommit}^{commit}`]);
  const requiresCheckout = originalCommit !== targetCommit;
  const packageDir = path.resolve(import.meta.dirname, "..", "..");
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  if (requiresCheckout) {
    console.log(`Checking out specs commit ${meta.specsCommit}.`);
    git(config.specsRepo, ["checkout", "--quiet", meta.specsCommit]);
  }

  try {
    const analysisStarted = Date.now();
    setupLocalLinter(packageDir, config.specsRepo);
    const fingerprint = fingerprintLocalLinter(packageDir);
    invalidateExistingAnalysis(config.datasetDir, meta);
    const fixtureMetadata = loadValidatorFixtureMetadata(
      path.resolve(import.meta.dirname, "..", "fixtures"),
    );
    const projectedRules = new Set(
      [...fixtureMetadata.values()]
        .filter((metadata) => metadata.projectionScope === "http-reachable")
        .flatMap((metadata) => [...metadata.tspLints]),
    );
    const activeProjects = new Set<string>();
    let completedProjectCount = 0;
    let analysisPhase = "compile";
    heartbeat = setInterval(() => {
      console.log(
        formatProgressHeartbeat({
          phase: analysisPhase,
          completed: completedProjectCount,
          total: selectedProjects.length,
          activeProjects: [...activeProjects].sort(),
          elapsedMs: Date.now() - analysisStarted,
          memoryUsage: process.memoryUsage(),
        }),
      );
    }, HEARTBEAT_INTERVAL_MS);
    heartbeat.unref();

    const projectRuns = await mapWithConcurrency(
      selectedProjects,
      config.concurrency,
      async (project, index) => {
        activeProjects.add(project.sourcePath);
        console.log(`[start ${index + 1}/${selectedProjects.length}] ${project.sourcePath}`);
        try {
          const result = await compileProject(config, project, projectedRules);
          completedProjectCount++;
          console.log(
            `[done ${completedProjectCount}/${selectedProjects.length}] ${project.sourcePath}: ` +
              `${result.result.status}, ${result.diagnostics.length} diagnostic(s)`,
          );
          return result;
        } finally {
          activeProjects.delete(project.sourcePath);
        }
      },
    );

    analysisPhase = "aggregate";
    const generatedAt = new Date().toISOString();
    const projectResults = projectRuns.map((run) => run.result);
    const aggregate = aggregateTypeSpecResults(
      meta.specsCommit,
      generatedAt,
      projectRuns.flatMap((run) => run.diagnostics),
    );
    const typeSpecOutput = writeTypeSpecResults(
      config.datasetDir,
      aggregate,
      projectResults,
      scope,
      0,
    );
    const resultFiles = typeSpecOutput.resultFiles;

    const mappings = new Map(
      [...fixtureMetadata].map(([rule, metadata]) => [rule, metadata.tspLints]),
    );
    analysisPhase = "report";
    const failedProjects = new Set(
      projectResults
        .filter((project) => project.status === "failed")
        .map((project) => project.project),
    );
    const productionValidatorRules = loadValidatorRuleData(
      config.datasetDir,
      validatorIndex,
      new Set(scope.projects),
    );
    const stagingValidatorPath = path.join(config.datasetDir, "staging-validator-results.json");
    const stagingValidatorIndex = fs.existsSync(stagingValidatorPath)
      ? readJson<ValidatorIndex>(stagingValidatorPath)
      : undefined;
    if (stagingValidatorIndex && stagingValidatorIndex.specsCommit !== meta.specsCommit) {
      throw new Error(`Staging validator results do not match dataset commit ${meta.specsCommit}.`);
    }
    const stagingValidatorRules = stagingValidatorIndex
      ? loadValidatorRuleData(config.datasetDir, stagingValidatorIndex, new Set(scope.projects))
      : {};
    const comparison = compareResults(
      meta.specsCommit,
      generatedAt,
      { ...productionValidatorRules, ...stagingValidatorRules },
      aggregate,
      mappings,
      scope,
      {
        failedProjects,
        fixtureMetadata,
        stagingValidatorRules: new Set(Object.keys(stagingValidatorRules)),
        knownValidatorRules: loadKnownValidatorRules(
          path.join(packageDir, "catalog", "validator-rule-metadata.json"),
        ),
        normalizationContext: {
          selectedApiVersions: new Map(
            meta.projects.map((project) => [project.sourcePath, project.apiVersion]),
          ),
          loadSwaggerDocument: (relativePath) =>
            readJson(assertDatasetPath(config.datasetDir, relativePath)),
          loadTypeSpecSource: (project, relativePath) => {
            const specsRoot = path.resolve(config.specsRepo);
            const sourcePath = path.resolve(specsRoot, project, relativePath);
            if (sourcePath !== specsRoot && !sourcePath.startsWith(`${specsRoot}${path.sep}`)) {
              throw new Error(`TypeSpec diagnostic path escapes the specs repo: ${relativePath}`);
            }
            return fs.readFileSync(sourcePath, "utf8");
          },
        },
      },
    );
    const coverageBreakdown = createCoverageBreakdown(comparison);
    writeJson(path.join(config.datasetDir, "comparison-results.json"), comparison);
    fs.writeFileSync(
      path.join(config.datasetDir, "comparison-results.md"),
      comparisonMarkdown(comparison),
    );
    writeJson(path.join(config.datasetDir, "coverage-breakdown.json"), coverageBreakdown);
    fs.writeFileSync(
      path.join(config.datasetDir, "coverage-breakdown.md"),
      coverageBreakdownMarkdown(coverageBreakdown),
    );
    resultFiles.push(
      "comparison-results.json",
      "comparison-results.md",
      "coverage-breakdown.json",
      "coverage-breakdown.md",
    );

    const rawFiles = projectResults.flatMap((project) => project.rawFiles).sort();
    const rawFilesByProject = new Map(
      projectResults.map((project) => [project.project, project.rawFiles]),
    );
    for (const project of meta.projects) {
      const generatedRawFiles = rawFilesByProject.get(project.sourcePath);
      if (generatedRawFiles) {
        project.rawFiles = [...new Set([...project.rawFiles, ...generatedRawFiles])].sort();
      }
    }
    meta.typespecAnalysis = {
      schemaVersion: ANALYSIS_SCHEMA_VERSION,
      generatedAt,
      durationMs: 0,
      ruleset: LOCAL_RULESET,
      localLinterFingerprint: fingerprint.value,
      localLinterFingerprintFiles: fingerprint.files,
      localLinterGitCommit: tryGit(packageDir, ["rev-parse", "HEAD"]),
      localLinterGitBranch: tryGit(packageDir, ["branch", "--show-current"]) || undefined,
      partial: scope.partial,
      sourceProjectCount: scope.sourceProjectCount,
      projectCount: projectResults.length,
      filters: scope.filters,
      diagnosticCount: aggregate.totalDiagnostics,
      rawDiagnosticCount: projectResults.reduce(
        (total, project) => total + project.rawDiagnosticCount,
        0,
      ),
      projectedDiagnosticCount: aggregate.totalDiagnostics,
      ruleCount: Object.keys(aggregate.rules).length,
      failedProjectCount: projectResults.filter((project) => project.status === "failed").length,
      resultFiles: resultFiles.sort(),
      rawFiles,
    };

    // The initial result writes make report generation and I/O part of the
    // measured phase. Completion metadata is still written last.
    const durationMs = Date.now() - analysisStarted;
    typeSpecOutput.index.durationMs = durationMs;
    comparison.durationMs = durationMs;
    coverageBreakdown.durationMs = durationMs;
    meta.typespecAnalysis.durationMs = durationMs;
    writeJson(path.join(config.datasetDir, "typespec-results.json"), typeSpecOutput.index);
    writeJson(path.join(config.datasetDir, "comparison-results.json"), comparison);
    fs.writeFileSync(
      path.join(config.datasetDir, "comparison-results.md"),
      comparisonMarkdown(comparison),
    );
    writeJson(path.join(config.datasetDir, "coverage-breakdown.json"), coverageBreakdown);
    fs.writeFileSync(
      path.join(config.datasetDir, "coverage-breakdown.md"),
      coverageBreakdownMarkdown(coverageBreakdown),
    );
    writeJson(path.join(config.datasetDir, "_meta.json"), meta);
    console.log(`TypeSpec analysis written to ${config.datasetDir}.`);
  } finally {
    if (heartbeat) {
      clearInterval(heartbeat);
    }
    if (requiresCheckout) {
      console.log(`Restoring specs repo to ${originalRef}.`);
      git(config.specsRepo, ["checkout", "--quiet", originalRef]);
    }
  }
}

async function main(): Promise<void> {
  await run(parseArgs());
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
