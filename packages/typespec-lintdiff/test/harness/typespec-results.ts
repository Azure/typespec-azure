#!/usr/bin/env node

/* eslint-disable no-console */

import { execFile, execFileSync } from "child_process";
import { createHash, randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";
import { promisify } from "util";
import YAML from "yaml";

const execFileAsync = promisify(execFile);
const ANALYSIS_SCHEMA_VERSION = 1;
const DATASET_SCHEMA_VERSION = 4;
const LOCAL_RULESET = "tsp-lintdiff-local-linter/all";
const LOCAL_RULE_PREFIX = "tsp-lintdiff-local-linter/";
const MAX_BUFFER = 256 * 1024 * 1024;

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

interface ValidatorShard {
  results: Array<{ project: string }>;
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

interface TypeSpecProjectResult {
  project: string;
  status: "success" | "failed";
  durationMs: number;
  diagnosticCount: number;
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
  mappedTypeSpecRules: string[];
  validatorProjectCount: number;
  typeSpecProjectCount: number;
  overlapProjectCount: number;
  validatorOnlyProjectCount: number;
  typeSpecOnlyProjectCount: number;
  validatorDiagnosticCount: number;
  typeSpecDiagnosticCount: number;
  validatorProjects: string[];
  typeSpecProjects: string[];
  overlapProjects: string[];
  validatorOnlyProjects: string[];
  typeSpecOnlyProjects: string[];
}

export interface ComparisonResults {
  schemaVersion: number;
  specsCommit: string;
  generatedAt: string;
  partial: boolean;
  sourceProjectCount: number;
  projectCount: number;
  projects: string[];
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

interface TypeSpecAnalysisMetadata {
  schemaVersion: number;
  generatedAt: string;
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

export function compareResults(
  specsCommit: string,
  generatedAt: string,
  validatorRules: Record<string, ValidatorRuleData>,
  aggregate: TypeSpecAggregate,
  mappings: Map<string, Set<string>>,
  scope: AnalysisScope,
): ComparisonResults {
  const rules = Object.entries(validatorRules)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([validatorRule, validator]) => {
      const mappedTypeSpecRules = [...(mappings.get(validatorRule) ?? [])].sort();
      const validatorProjects = new Set(validator.projects);
      const typeSpecProjects = new Set<string>();
      let typeSpecDiagnosticCount = 0;

      for (const typeSpecRule of mappedTypeSpecRules) {
        const result = aggregate.rules[typeSpecRule];
        if (!result) {
          continue;
        }
        typeSpecDiagnosticCount += result.count;
        for (const diagnostic of result.results) {
          typeSpecProjects.add(diagnostic.project);
        }
      }

      const overlapProjects = intersection(validatorProjects, typeSpecProjects);
      const validatorOnlyProjects = difference(validatorProjects, typeSpecProjects);
      const typeSpecOnlyProjects = difference(typeSpecProjects, validatorProjects);
      return {
        validatorRule,
        mappedTypeSpecRules,
        validatorProjectCount: validatorProjects.size,
        typeSpecProjectCount: typeSpecProjects.size,
        overlapProjectCount: overlapProjects.length,
        validatorOnlyProjectCount: validatorOnlyProjects.length,
        typeSpecOnlyProjectCount: typeSpecOnlyProjects.length,
        validatorDiagnosticCount: validator.count,
        typeSpecDiagnosticCount,
        validatorProjects: [...validatorProjects].sort(),
        typeSpecProjects: [...typeSpecProjects].sort(),
        overlapProjects,
        validatorOnlyProjects,
        typeSpecOnlyProjects,
      };
    });

  const mappedTypeSpecRules = new Set([...mappings.values()].flatMap((values) => [...values]));
  const unmappedTypeSpecRules = Object.entries(aggregate.rules)
    .filter(([rule]) => !mappedTypeSpecRules.has(rule))
    .map(([rule, result]) => ({
      rule,
      count: result.count,
      projectCount: result.projectCount,
      projects: [...new Set(result.results.map((diagnostic) => diagnostic.project))].sort(),
    }))
    .sort((left, right) => left.rule.localeCompare(right.rule));

  return {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    specsCommit,
    generatedAt,
    partial: scope.partial,
    sourceProjectCount: scope.sourceProjectCount,
    projectCount: scope.projects.length,
    projects: scope.projects,
    filters: scope.filters,
    rules,
    unmappedTypeSpecRules,
  };
}

export function loadValidatorMappings(fixturesDir: string): Map<string, Set<string>> {
  const mappings = new Map<string, Set<string>>();
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
      tspLints?: unknown;
    };
    if (typeof metadata.validatorRuleId !== "string") {
      throw new Error(`Missing validatorRuleId in ${rulePath}`);
    }

    if (
      metadata.tspLints !== undefined &&
      (!Array.isArray(metadata.tspLints) ||
        metadata.tspLints.some((value) => typeof value !== "string"))
    ) {
      throw new Error(`tspLints must be a string array in ${rulePath}`);
    }

    const validatorRule = metadata.validatorRuleId;
    const typeSpecRules = (metadata.tspLints ?? []) as string[];
    const existing = mappings.get(validatorRule) ?? new Set<string>();
    for (const typeSpecRule of typeSpecRules) {
      existing.add(typeSpecRule);
    }
    mappings.set(validatorRule, existing);
  }

  return mappings;
}

function assertDatasetPath(datasetDir: string, relativePath: string): string {
  const root = path.resolve(datasetDir);
  const absolutePath = path.resolve(root, relativePath);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Dataset path escapes the output directory: ${relativePath}`);
  }
  return absolutePath;
}

function loadValidatorRuleData(
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

  const diagnostics = [
    ...parseTypeSpecDiagnostics(stdout, project.sourcePath, projectDir),
    ...parseTypeSpecDiagnostics(stderr, project.sourcePath, projectDir),
  ];
  return {
    result: {
      project: project.sourcePath,
      status,
      durationMs: Date.now() - started,
      diagnosticCount: diagnostics.length,
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
): string[] {
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
  return ["typespec-results.json", ...resultFiles];
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

function comparisonMarkdown(comparison: ComparisonResults): string {
  const lines = [
    "# Validator and TypeSpec diagnostic comparison",
    "",
    `Specs commit: \`${comparison.specsCommit}\``,
    "",
    `Scope: ${comparison.partial ? "partial" : "full"} (${comparison.projectCount}/${comparison.sourceProjectCount} projects)`,
    "",
    ...(comparison.filters.path ? [`Path filter: \`${comparison.filters.path}\``, ""] : []),
    "| Validator rule | Mapped TypeSpec rules | Validator projects | TypeSpec projects | Overlap | Validator only | TypeSpec only | Validator diagnostics | TypeSpec diagnostics |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const entry of comparison.rules) {
    lines.push(
      `| ${escapeMarkdown(entry.validatorRule)} | ${escapeMarkdown(
        entry.mappedTypeSpecRules.join("<br>") || "—",
      )} | ${entry.validatorProjectCount} | ${entry.typeSpecProjectCount} | ${
        entry.overlapProjectCount
      } | ${entry.validatorOnlyProjectCount} | ${entry.typeSpecOnlyProjectCount} | ${
        entry.validatorDiagnosticCount
      } | ${entry.typeSpecDiagnosticCount} |`,
    );
  }

  lines.push(
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

  if (requiresCheckout) {
    console.log(`Checking out specs commit ${meta.specsCommit}.`);
    git(config.specsRepo, ["checkout", "--quiet", meta.specsCommit]);
  }

  try {
    setupLocalLinter(packageDir, config.specsRepo);
    const fingerprint = fingerprintLocalLinter(packageDir);
    invalidateExistingAnalysis(config.datasetDir, meta);
    const projectRuns = await mapWithConcurrency(
      selectedProjects,
      config.concurrency,
      async (project, index) => {
        process.stdout.write(
          `[${index + 1}/${selectedProjects.length}] ${project.sourcePath} ... `,
        );
        const result = await compileProject(config, project);
        console.log(`${result.result.status}, ${result.diagnostics.length} diagnostic(s)`);
        return result;
      },
    );

    const generatedAt = new Date().toISOString();
    const projectResults = projectRuns.map((run) => run.result);
    const aggregate = aggregateTypeSpecResults(
      meta.specsCommit,
      generatedAt,
      projectRuns.flatMap((run) => run.diagnostics),
    );
    const resultFiles = writeTypeSpecResults(config.datasetDir, aggregate, projectResults, scope);

    const mappings = loadValidatorMappings(path.resolve(import.meta.dirname, "..", "fixtures"));
    const comparison = compareResults(
      meta.specsCommit,
      generatedAt,
      loadValidatorRuleData(config.datasetDir, validatorIndex, new Set(scope.projects)),
      aggregate,
      mappings,
      scope,
    );
    writeJson(path.join(config.datasetDir, "comparison-results.json"), comparison);
    fs.writeFileSync(
      path.join(config.datasetDir, "comparison-results.md"),
      comparisonMarkdown(comparison),
    );
    resultFiles.push("comparison-results.json", "comparison-results.md");

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
      ruleCount: Object.keys(aggregate.rules).length,
      failedProjectCount: projectResults.filter((project) => project.status === "failed").length,
      resultFiles: resultFiles.sort(),
      rawFiles,
    };
    writeJson(path.join(config.datasetDir, "_meta.json"), meta);
    console.log(`TypeSpec analysis written to ${config.datasetDir}.`);
  } finally {
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
