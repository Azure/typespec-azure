#!/usr/bin/env node

/* eslint-disable no-console */

/**
 * Generates a reusable corpus of Swagger emitted from ARM TypeSpec projects,
 * then runs the production AutoRest azure-validator command over every file.
 *
 * An explicit --commit always regenerates the dataset. Without --commit, an
 * existing complete _meta.json causes the entire cached dataset to be reused.
 */

import { execFile, execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { pathToFileURL } from "url";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const MAX_BUFFER = 64 * 1024 * 1024;
const SCHEMA_VERSION = 4;

interface Config {
  specsRepo: string;
  commit?: string;
  datasetDir: string;
  filter?: string;
  limit: number;
  concurrency: number;
}

interface ArmProject {
  sourcePath: string;
  projectDir: string;
  entrypoint: string;
  tspConfigPath: string;
}

interface EmittedSwagger {
  absolutePath: string;
  apiVersion: string;
}

interface ProjectRecord {
  sourcePath: string;
  typespecPath: string;
  typespecFiles: string[];
  apiVersion?: string;
  compileStatus: "success" | "failed";
  compileDurationMs: number;
  compileError?: string;
  swaggerFiles: string[];
  swaggerAssets: string[];
  validationStatus: "success" | "failed" | "no-swagger";
  validationDurationMs: number;
  validationError?: string;
  rawFiles: string[];
}

interface ValidatorViolation {
  rule: string;
  level: "warning" | "error" | "fatal";
  project: string;
  swaggerFile: string;
  message: string;
  path: Array<string | number>;
  details?: unknown;
}

interface DatasetMetadata {
  schemaVersion: number;
  complete: true;
  specsRepository: string;
  specsCommit: string;
  generatedAt: string;
  generator: string;
  validatorCommand: string;
  readmeSuppressionsApplied: false;
  commonTypesPath: string;
  commonTypesFiles: string[];
  filters: {
    serviceType: "resource-manager";
    path?: string;
    limit?: number;
  };
  summary: {
    discoveredProjects: number;
    compiledProjects: number;
    failedProjects: number;
    emittedSwaggerFiles: number;
    validatedProjects: number;
    validationFailures: number;
    violations: number;
    distinctRules: number;
  };
  resultFiles: string[];
  projects: ProjectRecord[];
}

interface AggregateResults {
  schemaVersion: number;
  specsCommit: string;
  generatedAt: string;
  totalViolations: number;
  rules: Record<
    string,
    {
      count: number;
      levels: Record<string, number>;
      results: ValidatorViolation[];
    }
  >;
}

interface AggregateIndex {
  schemaVersion: number;
  specsCommit: string;
  generatedAt: string;
  totalViolations: number;
  rules: Record<
    string,
    {
      count: number;
      levels: Record<string, number>;
      resultsFile: string;
    }
  >;
}

function parseArgs(): Config {
  const args = process.argv.slice(2);
  let specsRepo = "";
  let commit: string | undefined;
  let datasetDir = path.resolve(import.meta.dirname, "..", "..", "specs");
  let filter: string | undefined;
  let limit = Number.POSITIVE_INFINITY;
  let concurrency = 2;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--specs-repo":
        specsRepo = path.resolve(args[++i]);
        break;
      case "--commit":
        commit = args[++i];
        break;
      case "--output":
        datasetDir = path.resolve(args[++i]);
        break;
      case "--filter":
        filter = args[++i].replace(/\\/g, "/");
        break;
      case "--limit":
        limit = Number.parseInt(args[++i], 10);
        break;
      case "--concurrency":
        concurrency = Number.parseInt(args[++i], 10);
        break;
      default:
        throw new Error(`Unknown argument: ${args[i]}`);
    }
  }

  if (!specsRepo) {
    throw new Error(
      "Usage: npm run specs:generate -- --specs-repo <path> [--commit <sha>] " +
        "[--filter <path>] [--limit N] [--concurrency N] [--output <path>]",
    );
  }
  if (Number.isFinite(limit) && (!Number.isInteger(limit) || limit < 1)) {
    throw new Error("--limit must be a positive integer.");
  }
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("--concurrency must be a positive integer.");
  }

  return { specsRepo, commit, datasetDir, filter, limit, concurrency };
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

function listRelativeFiles(directory: string, datasetDir: string): string[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const files: string[] = [];
  const pending = [directory];
  while (pending.length > 0) {
    const current = pending.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(absolutePath);
      } else if (entry.isFile()) {
        files.push(normalizeRelative(path.relative(datasetDir, absolutePath)));
      }
    }
  }
  return files.sort();
}

function git(specsRepo: string, args: string[]): string {
  return execFileSync("git", ["-C", specsRepo, ...args], { encoding: "utf8" }).trim();
}

function tryGit(specsRepo: string, args: string[]): string | undefined {
  try {
    return git(specsRepo, args);
  } catch {
    return undefined;
  }
}

function ensureSpecsRepo(config: Config): void {
  if (!fs.existsSync(path.join(config.specsRepo, "specification"))) {
    throw new Error(`Not an azure-rest-api-specs clone: ${config.specsRepo}`);
  }
  const required = [
    path.join(
      config.specsRepo,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "tsp.cmd" : "tsp",
    ),
    path.join(config.specsRepo, "node_modules", "@microsoft.azure", "openapi-validator"),
  ];
  for (const requiredPath of required) {
    if (!fs.existsSync(requiredPath)) {
      throw new Error(`Required dependency is missing: ${requiredPath}`);
    }
  }
}

function tryReuseDataset(config: Config): boolean {
  if (config.commit) {
    return false;
  }

  const metaPath = path.join(config.datasetDir, "_meta.json");
  const resultsPath = path.join(config.datasetDir, "validator-results.json");
  if (!fs.existsSync(metaPath) || !fs.existsSync(resultsPath)) {
    throw new Error(
      `No complete cached dataset exists at ${config.datasetDir}. ` +
        "Supply --commit for the initial generation.",
    );
  }

  const meta = readJson<DatasetMetadata>(metaPath);
  if (meta.schemaVersion !== SCHEMA_VERSION || meta.complete !== true) {
    throw new Error(`Cached dataset metadata is incomplete or unsupported: ${metaPath}`);
  }

  const datasetRoot = path.resolve(config.datasetDir);
  const datasetPrefix = `${datasetRoot}${path.sep}`;
  if (
    !Array.isArray(meta.resultFiles) ||
    !Array.isArray(meta.commonTypesFiles) ||
    meta.projects.some(
      (project) => !Array.isArray(project.typespecFiles) || !Array.isArray(project.swaggerAssets),
    )
  ) {
    throw new Error(
      `Cached dataset metadata does not contain a complete file manifest: ${metaPath}`,
    );
  }
  const indexedFiles = [
    ...meta.resultFiles,
    ...meta.commonTypesFiles,
    ...meta.projects.flatMap((project) => [
      ...project.typespecFiles,
      ...project.swaggerAssets,
      ...project.rawFiles,
    ]),
  ];
  const missingFiles = indexedFiles.filter((relativePath) => {
    const absolutePath = path.resolve(datasetRoot, relativePath);
    return !absolutePath.startsWith(datasetPrefix) || !fs.existsSync(absolutePath);
  });
  if (missingFiles.length > 0) {
    throw new Error(
      `Cached dataset is incomplete; ${missingFiles.length} indexed file(s) are missing. ` +
        "Supply --commit to regenerate it.",
    );
  }

  console.log(`Reusing complete dataset for specs commit ${meta.specsCommit}.`);
  console.log(`Projects: ${meta.summary.discoveredProjects}`);
  console.log(`Swagger files: ${meta.summary.emittedSwaggerFiles}`);
  console.log(`Violations: ${meta.summary.violations}`);
  return true;
}

function cleanGeneratedDataset(datasetDir: string): void {
  // Invalidate the cache before deleting indexed content. If regeneration is
  // interrupted, the old dataset must not remain marked complete.
  const metaPath = path.join(datasetDir, "_meta.json");
  if (fs.existsSync(metaPath)) {
    fs.unlinkSync(metaPath);
  }
  for (const relativePath of [
    "projects",
    "common-types",
    "results",
    // Schema v1 used these top-level directories.
    "swagger",
    "raw",
  ]) {
    const target = path.join(datasetDir, relativePath);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }
  for (const relativePath of ["validator-results.json"]) {
    const target = path.join(datasetDir, relativePath);
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
  }
  fs.mkdirSync(datasetDir, { recursive: true });
}

function findAutorestOptionsIndex(content: string): number {
  const autorestPattern = /["']?@azure-tools\/typespec-autorest["']?\s*:/;
  const optionsIndex = content.indexOf("options:");
  const searchStart = optionsIndex === -1 ? 0 : optionsIndex;
  const relativeIndex = content.slice(searchStart).search(autorestPattern);
  return relativeIndex === -1 ? -1 : searchStart + relativeIndex;
}

function discoverArmProjects(config: Config): ArmProject[] {
  const specificationDir = path.join(config.specsRepo, "specification");
  const projects: ArmProject[] = [];

  function walk(directory: string): void {
    if (projects.length >= config.limit) {
      return;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }

    const hasConfig = entries.some((entry) => entry.isFile() && entry.name === "tspconfig.yaml");
    const hasMain = entries.some((entry) => entry.isFile() && entry.name === "main.tsp");
    if (hasConfig && hasMain) {
      const tspConfigPath = path.join(directory, "tspconfig.yaml");
      const configText = fs.readFileSync(tspConfigPath, "utf8");
      const sourcePath = normalizeRelative(path.relative(config.specsRepo, directory));
      if (
        configText.includes("typespec-azure-rulesets/resource-manager") &&
        (!config.filter || sourcePath.includes(config.filter))
      ) {
        projects.push({
          sourcePath,
          projectDir: directory,
          entrypoint: "main.tsp",
          tspConfigPath,
        });
      }
    }

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        walk(path.join(directory, entry.name));
      }
    }
  }

  walk(specificationDir);
  return projects;
}

export function updateAutorestOption(content: string, name: string, value: string): string {
  const autorestIndex = findAutorestOptionsIndex(content);

  if (autorestIndex === -1) {
    const autorestBlock = `  "@azure-tools/typespec-autorest":\n` + `    ${name}: "${value}"`;
    if (/^options:\s*$/m.test(content)) {
      return content.replace(/^options:\s*$/m, (match) => `${match}\n${autorestBlock}`);
    }
    return `${content}\noptions:\n${autorestBlock}\n`;
  }

  const remaining = content.slice(autorestIndex);
  const nextEmitter = remaining.match(/\n\s{2}["']?@[^@]/);
  const blockEnd = nextEmitter?.index ?? remaining.length;
  const block = remaining.slice(0, blockEnd);
  const optionPattern = new RegExp(`^(\\s{4}${name}:)\\s*.*$`, "m");
  const updatedBlock = optionPattern.test(block)
    ? block.replace(optionPattern, `$1 "${value}"`)
    : block.replace(/\r?\n/, `\n    ${name}: "${value}"\n`);

  return content.slice(0, autorestIndex) + updatedBlock + remaining.slice(blockEnd);
}

export function keepOutputFileInsideEmitterDirectory(content: string): string {
  return content.replace(/(output-file:\s*["']?)(?:(?:\.\.\/)+|\{project-root\}\/)+(.*)/, "$1$2");
}

function buildTempConfig(project: ArmProject, outputDir: string, commonTypesDir: string): string {
  let content = fs.readFileSync(project.tspConfigPath, "utf8");
  const yamlOutputDir = normalizeRelative(outputDir);
  content = updateAutorestOption(content, "emitter-output-dir", yamlOutputDir);
  content = updateAutorestOption(content, "arm-types-dir", normalizeRelative(commonTypesDir));

  // Keep every emitter output inside the dataset, even when a service normally
  // writes generated Swagger outside its TypeSpec project directory.
  const updatedAutorestIndex = findAutorestOptionsIndex(content);
  if (updatedAutorestIndex !== -1) {
    const block = content.slice(updatedAutorestIndex);
    const nextEmitter = block.match(/\n\s{2}["']?@[^@]/);
    const blockEnd = nextEmitter?.index ?? block.length;
    const autorestBlock = block.slice(0, blockEnd);
    const fixedBlock = keepOutputFileInsideEmitterDirectory(autorestBlock);
    content = content.slice(0, updatedAutorestIndex) + fixedBlock + block.slice(blockEnd);
  }

  const tempConfigPath = path.join(
    project.projectDir,
    `tspconfig.lintdiff-dataset-${process.pid}-${Date.now()}.yaml`,
  );
  fs.writeFileSync(tempConfigPath, content);
  return tempConfigPath;
}

function getProjectDatasetDir(config: Config, project: ArmProject): string {
  return path.join(config.datasetDir, "projects", project.sourcePath);
}

function copyTypeSpecProject(project: ArmProject, destination: string): void {
  const excludedDirectories = new Set([
    ".git",
    "dist",
    "node_modules",
    "preview",
    "stable",
    "temp",
    "tsp-output",
  ]);

  fs.cpSync(project.projectDir, destination, {
    recursive: true,
    filter: (source) => {
      const relativePath = path.relative(project.projectDir, source);
      if (!relativePath) {
        return true;
      }
      const segments = relativePath.split(path.sep);
      return (
        !segments.some((segment) => excludedDirectories.has(segment)) &&
        !path.basename(source).startsWith("tspconfig.lintdiff-dataset-")
      );
    },
  });
}

export function selectLatestApiVersion(apiVersions: string[]): string | undefined {
  return [...new Set(apiVersions)]
    .sort((left, right) => {
      const leftDate = left.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "";
      const rightDate = right.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "";
      return leftDate.localeCompare(rightDate) || left.localeCompare(right);
    })
    .at(-1);
}

function findSwaggerFiles(directory: string): EmittedSwagger[] {
  const files: EmittedSwagger[] = [];
  if (!fs.existsSync(directory)) {
    return files;
  }

  function walk(current: string): void {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "examples" && !entry.name.startsWith(".")) {
          walk(absolutePath);
        }
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        try {
          const document = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
          if (
            (document.swagger || document.openapi) &&
            typeof document.info?.version === "string"
          ) {
            files.push({
              absolutePath,
              apiVersion: document.info.version,
            });
          }
        } catch {
          // Non-OpenAPI JSON files such as examples are intentionally ignored.
        }
      }
    }
  }

  walk(directory);
  return files;
}

function collectLocalReferences(value: unknown, references: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectLocalReferences(item, references);
    }
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === "$ref" && typeof child === "string") {
      const filePart = child.split("#", 1)[0];
      if (filePart && !/^[a-z]+:/i.test(filePart)) {
        references.push(decodeURIComponent(filePart));
      }
    } else {
      collectLocalReferences(child, references);
    }
  }
}

function copyReferencedFileClosure(
  sourceFile: string,
  destinationRelativePath: string,
  outputDir: string,
  stagingDir: string,
  fallbackRoots: string[],
  seen: Set<string>,
): void {
  const seenKey = `${path.resolve(sourceFile)}|${destinationRelativePath}`;
  if (seen.has(seenKey) || !fs.existsSync(sourceFile)) {
    return;
  }
  seen.add(seenKey);

  let document: unknown;
  try {
    document = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
  } catch {
    return;
  }

  const references: string[] = [];
  collectLocalReferences(document, references);
  for (const reference of references) {
    const relativePath = path.normalize(
      path.join(path.dirname(destinationRelativePath), reference),
    );
    if (relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
      continue;
    }

    const emittedFile = path.join(outputDir, relativePath);
    const referencedFile = fs.existsSync(emittedFile)
      ? emittedFile
      : fallbackRoots
          .map((root) => path.join(root, relativePath))
          .find((candidate) => fs.existsSync(candidate));
    if (!referencedFile) {
      continue;
    }

    const destination = path.join(stagingDir, relativePath);
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(referencedFile, destination);
    }
    copyReferencedFileClosure(
      referencedFile,
      relativePath,
      outputDir,
      stagingDir,
      fallbackRoots,
      seen,
    );
  }
}

function retainLatestSwagger(
  outputDir: string,
  swaggerFiles: EmittedSwagger[],
  projectDir: string,
): { apiVersion?: string; swaggerFiles: EmittedSwagger[] } {
  const apiVersion = selectLatestApiVersion(swaggerFiles.map((file) => file.apiVersion));
  if (!apiVersion) {
    return { swaggerFiles: [] };
  }

  const selected = swaggerFiles.filter((file) => file.apiVersion === apiVersion);
  const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), "lintdiff-latest-swagger-"));
  try {
    const copiedRoots = new Set<string>();
    const sourceRoots: string[] = [];
    for (const swagger of selected) {
      const relativePath = path.relative(outputDir, swagger.absolutePath);
      const segments = relativePath.split(path.sep);
      const versionIndex = segments.indexOf(apiVersion);
      const relativeRoot =
        versionIndex === -1
          ? path.dirname(relativePath)
          : path.join(...segments.slice(0, versionIndex + 1));
      if (copiedRoots.has(relativeRoot)) {
        continue;
      }
      copiedRoots.add(relativeRoot);
      const source = path.join(outputDir, relativeRoot);
      sourceRoots.push(source);
      const destination = path.join(stagingDir, relativeRoot);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.cpSync(source, destination, { recursive: true });
    }

    const seenReferences = new Set<string>();
    const fallbackRoots: string[] = [];
    let fallbackRoot = projectDir;
    while (path.basename(fallbackRoot) !== "specification") {
      fallbackRoots.push(fallbackRoot);
      const parent = path.dirname(fallbackRoot);
      if (parent === fallbackRoot) {
        break;
      }
      fallbackRoot = parent;
    }
    for (const sourceRoot of sourceRoots) {
      const pending = [sourceRoot];
      while (pending.length > 0) {
        const current = pending.pop()!;
        const stat = fs.statSync(current);
        if (stat.isDirectory()) {
          for (const entry of fs.readdirSync(current)) {
            pending.push(path.join(current, entry));
          }
        } else if (current.endsWith(".json")) {
          copyReferencedFileClosure(
            current,
            path.relative(outputDir, current),
            outputDir,
            stagingDir,
            fallbackRoots,
            seenReferences,
          );
        }
      }
    }

    fs.rmSync(outputDir, { recursive: true, force: true });
    fs.mkdirSync(outputDir, { recursive: true });
    fs.cpSync(stagingDir, outputDir, { recursive: true });
  } finally {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }

  return {
    apiVersion,
    swaggerFiles: findSwaggerFiles(outputDir).filter(
      (swagger) => swagger.apiVersion === apiVersion,
    ),
  };
}

async function compileProject(
  config: Config,
  project: ArmProject,
): Promise<{
  status: "success" | "failed";
  durationMs: number;
  error?: string;
  apiVersion?: string;
  swaggerFiles: EmittedSwagger[];
}> {
  const projectDatasetDir = getProjectDatasetDir(config, project);
  const typespecDir = path.join(projectDatasetDir, "typespec");
  const outputDir = path.join(projectDatasetDir, "swagger");
  const commonTypesDir = path.join(config.datasetDir, "common-types", "resource-management");
  copyTypeSpecProject(project, typespecDir);
  fs.mkdirSync(outputDir, { recursive: true });
  const tempConfigPath = buildTempConfig(project, outputDir, commonTypesDir);
  const tsp = path.join(
    config.specsRepo,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "tsp.cmd" : "tsp",
  );
  const started = Date.now();

  try {
    await execFileAsync(
      tsp,
      [
        "compile",
        project.entrypoint,
        "--emit",
        "@azure-tools/typespec-autorest",
        "--warn-as-error=false",
        "--pretty",
        "false",
        "--config",
        tempConfigPath,
      ],
      {
        cwd: project.projectDir,
        maxBuffer: MAX_BUFFER,
        timeout: 300_000,
        env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=4096" },
        shell: process.platform === "win32",
      },
    );
    const latest = retainLatestSwagger(outputDir, findSwaggerFiles(outputDir), project.projectDir);
    return {
      status: "success",
      durationMs: Date.now() - started,
      apiVersion: latest.apiVersion,
      swaggerFiles: latest.swaggerFiles,
    };
  } catch (error: any) {
    const output = [error.stdout, error.stderr, error.message].filter(Boolean).join("\n");
    fs.rmSync(outputDir, { recursive: true, force: true });
    return {
      status: "failed",
      durationMs: Date.now() - started,
      error: output.slice(0, 4000),
      swaggerFiles: [],
    };
  } finally {
    try {
      fs.unlinkSync(tempConfigPath);
    } catch {
      // The compile error already contains the actionable failure.
    }
  }
}

export function parseViolations(
  stdout: string,
  project: ArmProject,
  swaggerFile: string,
): ValidatorViolation[] {
  const violations: ValidatorViolation[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim().startsWith("{")) {
      continue;
    }
    try {
      const value = JSON.parse(line);
      if (!["warning", "error", "fatal"].includes(value.level) || !value.code) {
        continue;
      }
      violations.push({
        rule: String(value.code),
        level: value.level,
        project: project.sourcePath,
        swaggerFile,
        message: String(value.message ?? ""),
        path: Array.isArray(value.details?.jsonpath) ? value.details.jsonpath : [],
        details: value.details,
      });
    } catch {
      // Raw output remains available for messages that are not valid JSON.
    }
  }
  return violations;
}

async function validateProject(
  config: Config,
  project: ArmProject,
  swaggerFiles: EmittedSwagger[],
): Promise<{
  status: "success" | "failed" | "no-swagger";
  durationMs: number;
  error?: string;
  rawFiles: string[];
  violations: ValidatorViolation[];
}> {
  if (swaggerFiles.length === 0) {
    return {
      status: "no-swagger",
      durationMs: 0,
      rawFiles: [],
      violations: [],
    };
  }

  const validatorDependency = path.join(
    config.specsRepo,
    "node_modules",
    "@microsoft.azure",
    "openapi-validator",
  );
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const rawFiles: string[] = [];
  const violations: ValidatorViolation[] = [];
  const errors: string[] = [];
  const started = Date.now();
  const projectDatasetDir = getProjectDatasetDir(config, project);
  const swaggerRoot = path.join(projectDatasetDir, "swagger");
  const rawRoot = path.join(projectDatasetDir, "raw");

  for (const swagger of swaggerFiles) {
    const relativeSwagger = normalizeRelative(
      path.relative(config.datasetDir, swagger.absolutePath),
    );
    const swaggerWithinProject = path.relative(swaggerRoot, swagger.absolutePath);
    const rawBase = path.join(rawRoot, swaggerWithinProject.replace(/\.json$/i, ""));
    const stdoutPath = `${rawBase}.jsonl`;
    const stderrPath = `${rawBase}.stderr.txt`;
    fs.mkdirSync(path.dirname(stdoutPath), { recursive: true });

    let stdout = "";
    let stderr = "";
    try {
      const result = await execFileAsync(
        npm,
        [
          "exec",
          "--",
          "autorest",
          "--v3",
          "--spectral",
          "--azure-validator",
          "--semantic-validator=false",
          "--model-validator=false",
          "--message-format=json",
          "--openapi-type=arm",
          "--openapi-subtype=arm",
          `--use=${validatorDependency}`,
          `--input-file=${swagger.absolutePath}`,
        ],
        {
          cwd: config.specsRepo,
          maxBuffer: MAX_BUFFER,
          timeout: 600_000,
          shell: process.platform === "win32",
        },
      );
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error: any) {
      stdout = error.stdout ?? "";
      stderr = error.stderr ?? "";
      errors.push(
        `${relativeSwagger}: ${String(error.message ?? "AutoRest failed").slice(0, 1000)}`,
      );
    }

    fs.writeFileSync(stdoutPath, stdout);
    fs.writeFileSync(stderrPath, stderr);
    rawFiles.push(
      normalizeRelative(path.relative(config.datasetDir, stdoutPath)),
      normalizeRelative(path.relative(config.datasetDir, stderrPath)),
    );
    violations.push(...parseViolations(stdout, project, relativeSwagger));
  }

  return {
    status: errors.length === 0 ? "success" : "failed",
    durationMs: Date.now() - started,
    error: errors.length > 0 ? errors.join("\n") : undefined,
    rawFiles,
    violations,
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

export function aggregateResults(
  specsCommit: string,
  generatedAt: string,
  violations: ValidatorViolation[],
): AggregateResults {
  const rules: AggregateResults["rules"] = {};
  for (const violation of violations) {
    const rule = rules[violation.rule] ?? {
      count: 0,
      levels: {},
      results: [],
    };
    rule.count++;
    rule.levels[violation.level] = (rule.levels[violation.level] ?? 0) + 1;
    rule.results.push(violation);
    rules[violation.rule] = rule;
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    specsCommit,
    generatedAt,
    totalViolations: violations.length,
    rules: Object.fromEntries(
      Object.entries(rules).sort(([left], [right]) => left.localeCompare(right)),
    ),
  };
}

function ruleFileName(rule: string): string {
  return `${rule.replace(/[^A-Za-z0-9._-]/g, (character) => {
    return `_${character.codePointAt(0)!.toString(16)}`;
  })}.json`;
}

function writeAggregateResults(datasetDir: string, aggregate: AggregateResults): string[] {
  const rules: AggregateIndex["rules"] = {};
  const resultFiles: string[] = [];

  for (const [rule, result] of Object.entries(aggregate.rules)) {
    const resultsFile = normalizeRelative(path.join("results", "by-rule", ruleFileName(rule)));
    writeJson(path.join(datasetDir, resultsFile), {
      schemaVersion: SCHEMA_VERSION,
      specsCommit: aggregate.specsCommit,
      generatedAt: aggregate.generatedAt,
      rule,
      ...result,
    });
    resultFiles.push(resultsFile);
    rules[rule] = {
      count: result.count,
      levels: result.levels,
      resultsFile,
    };
  }

  const index: AggregateIndex = {
    schemaVersion: SCHEMA_VERSION,
    specsCommit: aggregate.specsCommit,
    generatedAt: aggregate.generatedAt,
    totalViolations: aggregate.totalViolations,
    rules,
  };
  writeJson(path.join(datasetDir, "validator-results.json"), index);
  return resultFiles;
}

async function generateDataset(config: Config): Promise<void> {
  ensureSpecsRepo(config);

  const requestedCommit = config.commit!;
  const originalRef =
    tryGit(config.specsRepo, ["symbolic-ref", "--quiet", "--short", "HEAD"]) ??
    git(config.specsRepo, ["rev-parse", "HEAD"]);
  const originalCommit = git(config.specsRepo, ["rev-parse", "HEAD"]);
  const targetCommit = git(config.specsRepo, ["rev-parse", `${requestedCommit}^{commit}`]);
  const requiresCheckout = originalCommit !== targetCommit;

  const dirty = git(config.specsRepo, ["status", "--porcelain"]);
  if (dirty) {
    throw new Error(
      "The specs repo has local changes. Commit, stash or remove them before generating " +
        "a dataset for an explicit commit.",
    );
  }

  if (requiresCheckout) {
    console.log(`Checking out specs commit ${targetCommit}.`);
    git(config.specsRepo, ["checkout", "--quiet", targetCommit]);
  }

  try {
    cleanGeneratedDataset(config.datasetDir);

    const sourceCommonTypes = path.join(
      config.specsRepo,
      "specification",
      "common-types",
      "resource-management",
    );
    const datasetCommonTypes = path.join(config.datasetDir, "common-types", "resource-management");
    fs.mkdirSync(path.dirname(datasetCommonTypes), { recursive: true });
    fs.cpSync(sourceCommonTypes, datasetCommonTypes, { recursive: true });

    const projects = discoverArmProjects(config);
    console.log(`Discovered ${projects.length} ARM TypeSpec projects.`);

    const compiled = await mapWithConcurrency(
      projects,
      config.concurrency,
      async (project, index) => {
        process.stdout.write(
          `[compile ${index + 1}/${projects.length}] ${project.sourcePath} ... `,
        );
        const result = await compileProject(config, project);
        console.log(`${result.status}, ${result.swaggerFiles.length} Swagger file(s)`);
        return { project, ...result };
      },
    );

    const validated = await mapWithConcurrency(
      compiled,
      config.concurrency,
      async (result, index) => {
        process.stdout.write(
          `[validate ${index + 1}/${compiled.length}] ${result.project.sourcePath} ... `,
        );
        const validation =
          result.status === "success"
            ? await validateProject(config, result.project, result.swaggerFiles)
            : {
                status: "no-swagger" as const,
                durationMs: 0,
                rawFiles: [],
                violations: [],
              };
        console.log(`${validation.status}, ${validation.violations.length} violation(s)`);
        return { ...result, validation };
      },
    );

    const generatedAt = new Date().toISOString();
    const allViolations = validated.flatMap((result) => result.validation.violations);
    const aggregate = aggregateResults(targetCommit, generatedAt, allViolations);
    const resultFiles = writeAggregateResults(config.datasetDir, aggregate);

    const projectRecords: ProjectRecord[] = validated.map((result) => ({
      sourcePath: result.project.sourcePath,
      typespecPath: normalizeRelative(
        path.relative(
          config.datasetDir,
          path.join(getProjectDatasetDir(config, result.project), "typespec"),
        ),
      ),
      typespecFiles: listRelativeFiles(
        path.join(getProjectDatasetDir(config, result.project), "typespec"),
        config.datasetDir,
      ),
      apiVersion: result.apiVersion,
      compileStatus: result.status,
      compileDurationMs: result.durationMs,
      compileError: result.error,
      swaggerFiles: result.swaggerFiles.map((swagger) =>
        normalizeRelative(path.relative(config.datasetDir, swagger.absolutePath)),
      ),
      swaggerAssets: listRelativeFiles(
        path.join(getProjectDatasetDir(config, result.project), "swagger"),
        config.datasetDir,
      ),
      validationStatus: result.validation.status,
      validationDurationMs: result.validation.durationMs,
      validationError: result.validation.error,
      rawFiles: result.validation.rawFiles,
    }));
    const metadata: DatasetMetadata = {
      schemaVersion: SCHEMA_VERSION,
      complete: true,
      specsRepository:
        tryGit(config.specsRepo, ["remote", "get-url", "origin"]) ?? "Azure/azure-rest-api-specs",
      specsCommit: targetCommit,
      generatedAt,
      generator: "test/harness/spec-dataset.ts",
      validatorCommand:
        "npm exec -- autorest --v3 --spectral --azure-validator " +
        "--semantic-validator=false --model-validator=false --message-format=json " +
        "--openapi-type=arm --openapi-subtype=arm --use=<openapi-validator> " +
        "--input-file=<swagger>",
      readmeSuppressionsApplied: false,
      commonTypesPath: "common-types/resource-management",
      commonTypesFiles: listRelativeFiles(datasetCommonTypes, config.datasetDir),
      filters: {
        serviceType: "resource-manager",
        path: config.filter,
        limit: Number.isFinite(config.limit) ? config.limit : undefined,
      },
      summary: {
        discoveredProjects: projectRecords.length,
        compiledProjects: projectRecords.filter((record) => record.compileStatus === "success")
          .length,
        failedProjects: projectRecords.filter((record) => record.compileStatus === "failed").length,
        emittedSwaggerFiles: projectRecords.reduce(
          (count, record) => count + record.swaggerFiles.length,
          0,
        ),
        validatedProjects: projectRecords.filter((record) => record.validationStatus === "success")
          .length,
        validationFailures: projectRecords.filter((record) => record.validationStatus === "failed")
          .length,
        violations: allViolations.length,
        distinctRules: Object.keys(aggregate.rules).length,
      },
      resultFiles,
      projects: projectRecords,
    };

    // Written last: its presence means Swagger, raw output and aggregate data
    // all belong to the recorded commit and generation completed.
    writeJson(path.join(config.datasetDir, "_meta.json"), metadata);
    console.log(`Dataset written to ${config.datasetDir}.`);
  } finally {
    if (requiresCheckout) {
      console.log(`Restoring specs repo to ${originalRef}.`);
      git(config.specsRepo, ["checkout", "--quiet", originalRef]);
    }
  }
}

async function main(): Promise<void> {
  const config = parseArgs();
  if (tryReuseDataset(config)) {
    return;
  }
  await generateDataset(config);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
