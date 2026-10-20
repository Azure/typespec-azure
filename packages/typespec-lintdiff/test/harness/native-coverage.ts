/* eslint-disable no-console */

import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

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
  error?: string;
  rawDiagnostics: NativeDiagnostic[];
  diagnostics: NativeDiagnostic[];
  packages: NativePackage[];
  defaultTargetDiagnostics?: Array<{ rule: string; message: string }>;
}

interface DatasetProject {
  sourcePath: string;
  apiVersion?: string;
  compileStatus: string;
  validationStatus: string;
}

interface ValidatorDiagnostic {
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
  nativeDefaultCount: number;
  nativeAlignedCount: number;
  nativeSourceCount: number;
  nativeLocationlessCount: number;
  difference: number;
}

interface Config {
  candidateRepo: string;
  specsRepo: string;
  tgzDir: string;
  output: string;
  validatorRule: string;
  tspRules: string[];
  scope: "source" | "http-reachable" | "boolean-http";
  concurrency: number;
  filter?: string;
  limit?: number;
}

export function parseNativeCoverageArgs(args: string[]): Config {
  const values = new Map<string, string>();
  const tspRules: string[] = [];
  const names = new Set([
    "--candidate-repo",
    "--specs-repo",
    "--tgz-dir",
    "--output",
    "--validator-rule",
    "--tsp-rule",
    "--scope",
    "--concurrency",
    "--filter",
    "--limit",
  ]);
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!names.has(name) || !value || value.startsWith("--")) {
      throw new Error(`Unknown argument or missing value: ${name}`);
    }
    if (name === "--tsp-rule") {
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
  if (tspRules.length === 0) throw new Error("At least one --tsp-rule is required.");
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
    validatorRule: required("--validator-rule"),
    tspRules,
    scope,
    concurrency: positiveInteger("--concurrency", 2)!,
    filter: values.get("--filter"),
    limit: positiveInteger("--limit"),
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
    const validatorFileIndependentCount = new Set(swagger.map((item) => JSON.stringify(item.path)))
      .size;
    const nativeSourceCount = new Set(receipt.diagnostics.map(sourceIdentity)).size;
    rows.push({
      project: project.sourcePath,
      apiVersion: project.apiVersion,
      validatorRawCount: swagger.length,
      validatorFileIndependentCount,
      nativeRawCount: receipt.rawDiagnostics.length,
      nativeDefaultCount: receipt.defaultTargetDiagnostics?.length ?? 0,
      nativeAlignedCount: receipt.diagnostics.length,
      nativeSourceCount,
      nativeLocationlessCount: receipt.diagnostics.filter(
        (item) =>
          item.sourceFile === undefined || item.line === undefined || item.column === undefined,
      ).length,
      difference: validatorFileIndependentCount - nativeSourceCount,
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
  const overlapProjects = validatorProjects.filter((project) => nativeSet.has(project));
  const sum = (
    field:
      | "validatorRawCount"
      | "validatorFileIndependentCount"
      | "nativeRawCount"
      | "nativeDefaultCount"
      | "nativeAlignedCount"
      | "nativeSourceCount"
      | "nativeLocationlessCount",
  ) => rows.reduce((total, row) => total + row[field], 0);
  return {
    schemaVersion: 1,
    equivalence: "not-determined" as const,
    selectedProjectCount: projects.length,
    assessableProjectCount: rows.length,
    unassessedProjects,
    unassessedValidatorRawCount,
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
    nativeDefaultCount: sum("nativeDefaultCount"),
    nativeAlignedCount: sum("nativeAlignedCount"),
    nativeSourceCount: sum("nativeSourceCount"),
    nativeLocationlessCount: sum("nativeLocationlessCount"),
    projectsWithEqualCounts: rows.filter((row) => row.difference === 0).length,
    validatorExcess: rows.reduce((total, row) => total + Math.max(0, row.difference), 0),
    nativeExcess: rows.reduce((total, row) => total + Math.max(0, -row.difference), 0),
    projects: rows.sort(
      (left, right) =>
        Math.abs(right.difference) - Math.abs(left.difference) ||
        left.project.localeCompare(right.project),
    ),
  };
}

function git(root: string, args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
}

function snapshot(root: string) {
  if (git(root, ["status", "--porcelain"])) {
    throw new Error(`Comparison input must be clean: ${root}`);
  }
  return {
    root,
    repository: git(root, ["remote", "get-url", "origin"]),
    commit: git(root, ["rev-parse", "HEAD"]),
  };
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function command(cwd: string, args: string[], log: string): Promise<void> {
  console.log(`Running ${path.basename(log)}; raw output: ${log}`);
  const fd = fs.openSync(log, "w");
  fs.writeSync(fd, `${JSON.stringify({ cwd, executable: process.execPath, args })}\n`);
  const heartbeat = setInterval(() => console.log(`HEARTBEAT ${path.basename(log)}`), 60_000);
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, args, { cwd, stdio: ["ignore", fd, fd] });
      child.once("error", reject);
      child.once("exit", (code, signal) => {
        if (code === 0) resolve();
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
    `Validator: \`${config.validatorRule}\``,
    `Native rules: ${config.tspRules.map((rule) => `\`${rule}\``).join(", ")}`,
    `Scope: \`${config.scope}\`; partial: ${config.filter !== undefined || config.limit !== undefined}.`,
    "",
    "**This is observed coverage, not an automatic equivalence decision.**",
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
    `| Native findings under project defaults | ${report.nativeDefaultCount} |`,
    `| Validator excess / native excess | ${report.validatorExcess} / ${report.nativeExcess} |`,
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
    "| Project | Validator paths | Native targets | Difference |",
    "| --- | ---: | ---: | ---: |",
    ...report.projects
      .filter((row) => row.difference !== 0)
      .map(
        (row) =>
          `| ${row.project} | ${row.validatorFileIndependentCount} | ${row.nativeSourceCount} | ${row.difference} |`,
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
  for (const root of [candidateRepo, specsRepo]) {
    const relative = path.relative(root, output);
    if (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative)) {
      throw new Error("Output must be outside the candidate and specs checkouts.");
    }
  }
  const candidate = snapshot(candidateRepo);
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
    schemaVersion: 1,
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
    generatorFiles: ["native-coverage.ts", "native-coverage-worker.mjs", "spec-dataset.ts"].map(
      (file) => ({
        file,
        sha256: createHash("sha256")
          .update(fs.readFileSync(path.join(import.meta.dirname, file)))
          .digest("hex"),
      }),
    ),
    nodeVersion: process.version,
    specsPackageManager: JSON.parse(fs.readFileSync(path.join(specsRepo, "package.json"), "utf8"))
      .packageManager,
    policies: {
      swagger: "latest-emitted-api-version; production ARM validator; no readme suppressions",
      native:
        "existing project configuration plus explicit mapped-rule enablement; source suppressions retained",
      equivalence: "manual decision required; no fuzzy matching or name-only normalization",
    },
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
    const dataset: { specsCommit: string; projects: DatasetProject[] } = JSON.parse(
      fs.readFileSync(path.join(datasetDir, "_meta.json"), "utf8"),
    );
    if (dataset.specsCommit !== specs.commit || dataset.projects.length === 0) {
      throw new Error("Generated dataset has the wrong snapshot or an empty population.");
    }
    const index: { rules: Record<string, { resultsFile: string }> } = JSON.parse(
      fs.readFileSync(path.join(datasetDir, "validator-results.json"), "utf8"),
    );
    const shard = index.rules[config.validatorRule];
    const validator: ValidatorDiagnostic[] = shard
      ? JSON.parse(fs.readFileSync(path.join(datasetDir, shard.resultsFile), "utf8")).results
      : [];
    const native: NativeProjectResult[] = [];
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
            tspRules: config.tspRules,
            scope: config.scope,
          });
          try {
            await command(
              specsRepo,
              [path.join(import.meta.dirname, "native-coverage-worker.mjs"), input, receipt],
              path.join(output, `native-${index}.log`),
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
            };
            writeJson(receipt, failure);
            native.push(failure);
          }
        }
      }),
    );
    const report = buildNativeCoverageReport(dataset.projects, validator, native);
    writeJson(path.join(output, "coverage.json"), report);
    fs.writeFileSync(path.join(output, "coverage.md"), markdown(report, config));
    if (
      snapshot(candidateRepo).commit !== candidate.commit ||
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
