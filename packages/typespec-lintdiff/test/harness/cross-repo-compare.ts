/**
 * Cross-repo comparison tool.
 *
 * Compiles TypeSpec projects in azure-rest-api-specs, runs azure-openapi-validator
 * on the emitted swagger, and generates a comparison report between TypeSpec
 * diagnostics and validator violations.
 *
 * Usage:
 *   npm run compare -- --specs-repo <path> [--limit N] [--filter <glob>] [--concurrency N] [--output <dir>]
 */

import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { execFile, execSync } from "child_process";
import { promisify } from "util";
import pkg from "@stoplight/spectral-core";
const { Spectral } = pkg;
import rulesetsPkg from "@microsoft.azure/openapi-validator-rulesets";
const { spectralRulesets, deleteRulesPropertiesInPayloadNotValidForSpectralRules, nativeRulesets } =
  rulesetsPkg;
import corePkg from "@microsoft.azure/openapi-validator-core";
const { lint, OpenApiTypes } = corePkg;
import _ from "lodash";

const execFileAsync = promisify(execFile);

// --- Types ---

interface ProjectInfo {
  projectDir: string;
  entrypoint: string; // "main.tsp" or "client.tsp"
  tspConfigPath: string;
  serviceType: "resource-manager" | "data-plane" | "unknown";
  relativePath: string; // relative to specs repo root
}

type CompileStatus = "success" | "failed" | "skipped";
type ValidatorStatus = "success" | "failed" | "no-swagger" | "skipped";

interface DiagnosticEntry {
  code: string;
  severity: string;
  message: string;
}

interface ValidatorViolation {
  code: string;
  message: string;
  path: string[];
  severity: number;
}

interface ProjectResult {
  project: ProjectInfo;
  compileStatus: CompileStatus;
  compileError?: string;
  compileDurationMs: number;
  tspDiagnostics: DiagnosticEntry[];
  swaggerFiles: string[];
  validatorStatus: ValidatorStatus;
  validatorError?: string;
  validatorDurationMs: number;
  validatorViolations: ValidatorViolation[];
}

interface ComparisonReport {
  metadata: {
    specsRepo: string;
    specsCommit: string;
    timestamp: string;
    localLinter: boolean;
    linterBranch: string;
    totalProjects: number;
    compiledSuccessfully: number;
    compileSkipped: number;
    compileFailed: number;
    validatedSuccessfully: number;
    validatorFailed: number;
    noSwagger: number;
  };
  results: ProjectResult[];
  tspRuleSummary: Record<string, { count: number; projects: string[] }>;
  validatorRuleSummary: Record<string, { count: number; projects: string[] }>;
}

// --- Rule Correlation ---

/**
 * Builds bidirectional mappings between validator rule IDs and TypeSpec lint codes
 * by reading the tests/rule.md frontmatter from this repository.
 */
interface RuleCorrelation {
  /** validator rule ID to set of TypeSpec lint codes that cover it */
  validatorToTsp: Map<string, Set<string>>;
  /** TypeSpec lint code to set of validator rule IDs it covers */
  tspToValidator: Map<string, Set<string>>;
  /** validator rule ID to its coverage classification */
  validatorCoverage: Map<string, string>;
}

function loadRuleCorrelation(): RuleCorrelation {
  const validatorToTsp: Map<string, Set<string>> = new Map();
  const tspToValidator: Map<string, Set<string>> = new Map();
  const validatorCoverage: Map<string, string> = new Map();

  const testsDir = path.resolve(import.meta.dirname, "..", "fixtures");
  if (!fs.existsSync(testsDir)) return { validatorToTsp, tspToValidator, validatorCoverage };

  const dirs = fs.readdirSync(testsDir).filter((d) => {
    return fs.existsSync(path.join(testsDir, d, "rule.md"));
  });

  for (const dir of dirs) {
    const content = fs.readFileSync(path.join(testsDir, dir, "rule.md"), "utf-8");
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) continue;

    let fm: Record<string, unknown>;
    try {
      // Simple YAML frontmatter parser
      const lines = fmMatch[1].split(/\r?\n/);
      const parsed: Record<string, unknown> = {};
      let currentKey = "";
      let currentList: string[] | null = null;
      for (const line of lines) {
        const kvMatch = line.match(/^(\w+):\s*(.*)$/);
        if (kvMatch) {
          if (currentKey && currentList) {
            parsed[currentKey] = currentList;
          }
          currentKey = kvMatch[1];
          const val = kvMatch[2].trim();
          if (val === "" || val === "[]") {
            currentList = val === "[]" ? [] : [];
          } else {
            parsed[currentKey] = val;
            currentKey = "";
            currentList = null;
          }
        } else {
          const listMatch = line.match(/^\s*-\s+(.+)$/);
          if (listMatch && currentList) {
            // Strip surrounding quotes
            const item = listMatch[1].replace(/^['"]|['"]$/g, "");
            currentList.push(item);
          }
        }
      }
      if (currentKey && currentList) {
        parsed[currentKey] = currentList;
      }
      fm = parsed;
    } catch {
      continue;
    }

    const validatorId = fm.validatorRuleId as string | undefined;
    if (!validatorId) continue;

    // Store coverage kind for every known rule
    const coverageKind = (fm.coverageKind as string | undefined) ?? "none";
    validatorCoverage.set(validatorId, coverageKind);

    const tspLints = (fm.tspLints as string[] | undefined) ?? [];
    if (tspLints.length === 0) continue;

    if (!validatorToTsp.has(validatorId)) {
      validatorToTsp.set(validatorId, new Set());
    }
    for (const tspCode of tspLints) {
      validatorToTsp.get(validatorId)!.add(tspCode);
      if (!tspToValidator.has(tspCode)) {
        tspToValidator.set(tspCode, new Set());
      }
      tspToValidator.get(tspCode)!.add(validatorId);
    }
  }

  // Enrich with catalog.json classifications (tier + tspEquivalent)
  const catalogPath = path.resolve(import.meta.dirname, "..", "..", "catalog", "catalog.json");
  if (fs.existsSync(catalogPath)) {
    try {
      const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8")) as Array<{
        id: string;
        tier?: string;
        tspEquivalent?: string;
      }>;
      for (const entry of catalog) {
        const existing = validatorCoverage.get(entry.id);
        const unconfigured = !existing || existing === "none";

        // Map catalog tiers to coverage classifications
        if (entry.tier === "Infallible" && unconfigured) {
          validatorCoverage.set(entry.id, "infallible");
        } else if (entry.tier === "Template-enforced" && unconfigured) {
          validatorCoverage.set(entry.id, "template");
        }

        // Auto-correlate tspEquivalent from catalog when rule.md has no tspLints
        if (entry.tspEquivalent && !validatorToTsp.has(entry.id)) {
          const tspCode = entry.tspEquivalent;
          validatorToTsp.set(entry.id, new Set([tspCode]));
          if (!tspToValidator.has(tspCode)) {
            tspToValidator.set(tspCode, new Set());
          }
          tspToValidator.get(tspCode)!.add(entry.id);
        }
      }
    } catch {
      // catalog.json parse error — skip
    }
  }

  return { validatorToTsp, tspToValidator, validatorCoverage };
}

// --- CLI Args ---

function parseArgs(): {
  specsRepo: string;
  limit: number;
  filter: string | null;
  serviceTypeFilter: "resource-manager" | "data-plane" | null;
  concurrency: number;
  outputDir: string;
  localLinter: boolean;
  skipPerProject: boolean;
  commit: string | null;
  regenerate: string | null;
  compareWith: string | null;
} {
  const args = process.argv.slice(2);
  let specsRepo = "";
  let limit = Infinity;
  let filter: string | null = null;
  let serviceTypeFilter: "resource-manager" | "data-plane" | null = null;
  let concurrency = 2;
  let outputDir = path.resolve(import.meta.dirname, "..", "reports");
  let localLinter = true;
  let skipPerProject = false;
  let commit: string | null = null;
  let regenerate: string | null = null;
  let compareWith: string | null = null;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--specs-repo":
        specsRepo = args[++i];
        break;
      case "--limit":
        limit = parseInt(args[++i], 10);
        break;
      case "--filter":
        filter = args[++i];
        break;
      case "--type":
        const val = args[++i];
        if (val === "arm" || val === "resource-manager") {
          serviceTypeFilter = "resource-manager";
        } else if (val === "data-plane" || val === "dp") {
          serviceTypeFilter = "data-plane";
        } else {
          console.error("Invalid --type value: " + JSON.stringify(val) + '. Use "arm" or "data-plane".');
          process.exit(1);
        }
        break;
      case "--skip-local-linter":
        localLinter = false;
        break;
      case "--skip-per-project":
        skipPerProject = true;
        break;
      case "--commit":
        commit = args[++i];
        break;
      case "--regenerate":
        regenerate = args[++i];
        break;
      case "--compare-with":
        compareWith = args[++i];
        break;
      case "--concurrency":
        concurrency = parseInt(args[++i], 10);
        break;
      case "--output":
        outputDir = path.resolve(args[++i]);
        break;
    }
  }

  if (!regenerate && !specsRepo) {
    console.error("Usage: --specs-repo <path> [--limit N] [--filter <pattern>] [--type arm|data-plane] [--skip-local-linter] [--skip-per-project] [--commit <sha>] [--concurrency N] [--output <dir>]");
    console.error("       --regenerate <json-path> [--output <dir>] [--skip-per-project]");
    process.exit(1);
  }

  return { specsRepo: specsRepo ? path.resolve(specsRepo) : "", limit, filter, serviceTypeFilter, concurrency, outputDir, localLinter, skipPerProject, commit, regenerate, compareWith };
}

// --- Discovery ---

function discoverProjects(specsRepo: string, filter: string | null, serviceTypeFilter: "resource-manager" | "data-plane" | null, limit: number): ProjectInfo[] {
  const specDir = path.join(specsRepo, "specification");
  const projects: ProjectInfo[] = [];

  function walk(dir: string) {
    if (projects.length >= limit) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    const hasTspConfig = entries.some((e) => e.name === "tspconfig.yaml" && e.isFile());
    if (hasTspConfig) {
      const hasMain = entries.some((e) => e.name === "main.tsp" && e.isFile());
      const hasClient = entries.some((e) => e.name === "client.tsp" && e.isFile());
      const entrypoint = hasMain ? "main.tsp" : hasClient ? "client.tsp" : null;

      if (entrypoint) {
        const relativePath = path.relative(specsRepo, dir).replace(/\\/g, "/");
        const serviceType = classifyServiceType(path.join(dir, "tspconfig.yaml"));

        if (filter && !relativePath.includes(filter)) {
          // skip non-matching path filter
        } else if (serviceTypeFilter && serviceType !== serviceTypeFilter) {
          // skip non-matching service type
        } else {
          projects.push({
            projectDir: dir,
            entrypoint,
            tspConfigPath: path.join(dir, "tspconfig.yaml"),
            serviceType,
            relativePath,
          });
        }
      }
    }

    // Recurse into subdirectories
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        walk(path.join(dir, entry.name));
      }
    }
  }

  walk(specDir);
  return projects;
}

function classifyServiceType(tspConfigPath: string): "resource-manager" | "data-plane" | "unknown" {
  try {
    const content = fs.readFileSync(tspConfigPath, "utf-8");
    if (content.includes("typespec-azure-rulesets/resource-manager")) return "resource-manager";
    if (content.includes("typespec-azure-rulesets/data-plane")) return "data-plane";
  } catch {}
  return "unknown";
}

// --- TypeSpec Compilation ---

/**
 * Build a temp tspconfig that:
 *  1. Overrides emitter-output-dir to point to `swaggerOutputDir`, preserving
 *     all other autorest options (output-splitting, arm-types-dir, etc.).
 *  2. Strips `../` from output-file if present to prevent escaping the temp dir.
 *  3. Optionally injects the local linter ruleset.
 *
 * Uses string-based manipulation instead of YAML parse/serialize to preserve
 * the original formatting (the YAML library's serialization can break tsp compile).
 */
function buildTempConfig(
  project: ProjectInfo,
  swaggerOutputDir: string,
  localLinterPath: string | null,
): string {
  let content = fs.readFileSync(project.tspConfigPath, "utf-8");

  // Use forward slashes for YAML compatibility (backslashes are escape chars in double-quoted YAML)
  const yamlSafePath = swaggerOutputDir.replace(/\\/g, "/");

  // Find the autorest OPTIONS block (not the emit reference)
  const autorestOptionsPattern = /["']?@azure-tools\/typespec-autorest["']?\s*:/;
  const optionsIdx = content.indexOf("options:");
  const autorestIdx = optionsIdx !== -1
    ? optionsIdx + content.slice(optionsIdx).search(autorestOptionsPattern)
    : content.search(autorestOptionsPattern);
  if (autorestIdx !== -1) {
    const afterAutorest = content.slice(autorestIdx);
    const eodMatch = afterAutorest.match(/emitter-output-dir:\s*.+/);
    if (eodMatch && eodMatch.index !== undefined) {
      const globalIdx = autorestIdx + eodMatch.index;
      content = content.slice(0, globalIdx)
        + `emitter-output-dir: ${yamlSafePath}`
        + content.slice(globalIdx + eodMatch[0].length);
    } else {
      // No emitter-output-dir exists, add it after the autorest key line
      content = content.replace(
        /(["']?@azure-tools\/typespec-autorest["']?:\s*\r?\n)/,
        `$1    emitter-output-dir: ${yamlSafePath}\n`,
      );
    }

    // Strip ../ from output-file within the autorest block to prevent escaping the temp dir.
    // Only target the output-file that appears before the next emitter section.
    // Recalculate autorest position since content may have shifted from the replacement above.
    const optionsIdx2 = content.indexOf("options:");
    const autorestIdx2 = optionsIdx2 !== -1
      ? optionsIdx2 + content.slice(optionsIdx2).search(autorestOptionsPattern)
      : content.search(autorestOptionsPattern);
    const autorestBlock = content.slice(autorestIdx2);
    const nextEmitterMatch = autorestBlock.match(/\n\s{2}["']?@[^@]/);
    const blockEnd = nextEmitterMatch?.index ?? autorestBlock.length;
    const block = autorestBlock.slice(0, blockEnd);
    const fixedBlock = block.replace(
      /(output-file:\s*["']?)(\.\.\/)+(.*)/,
      "$1$3",
    );
    if (fixedBlock !== block) {
      content = content.slice(0, autorestIdx2) + fixedBlock + autorestBlock.slice(blockEnd);
    }
  }

  // Inject local linter ruleset if enabled
  if (localLinterPath) {
    const localRule = "tsp-lintdiff-local-linter/all";
    const blockExtends = /extends:\s*\r?\n(\s+- .+\r?\n)+/;
    const inlineExtends = /extends:\s*\[([^\]]*)\]/;
    if (blockExtends.test(content)) {
      content = content.replace(
        blockExtends,
        (match) => `${match}    - "${localRule}"\n`,
      );
    } else if (inlineExtends.test(content)) {
      // Handle inline-array syntax, e.g. `extends: ["@azure-tools/..."]`.
      content = content.replace(inlineExtends, (_m, inner) => {
        const trimmed = inner.trim();
        const sep = trimmed.length > 0 ? ", " : "";
        return `extends: [${trimmed}${sep}"${localRule}"]`;
      });
    } else if (content.includes("linter:")) {
      content = content.replace(
        /linter:/,
        `linter:\n  extends:\n    - "${localRule}"`,
      );
    } else {
      content += `\nlinter:\n  extends:\n    - "${localRule}"\n`;
    }
  }

  const tempConfigPath = path.join(project.projectDir, "tspconfig.compare.yaml");
  fs.writeFileSync(tempConfigPath, content);
  return tempConfigPath;
}

async function compileProject(
  project: ProjectInfo,
  specsRepo: string,
  localLinterPath: string | null,
): Promise<{ status: CompileStatus; diagnostics: DiagnosticEntry[]; swaggerFiles: string[]; swaggerOutputDir: string; error?: string; durationMs: number }> {
  const tspBin = path.join(specsRepo, "node_modules", ".bin", process.platform === "win32" ? "tsp.cmd" : "tsp");
  const swaggerOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), "tsp-swagger-"));
  const start = Date.now();

  const tempConfigPath = buildTempConfig(project, swaggerOutputDir, localLinterPath);

  try {
    const { stdout, stderr } = await execFileAsync(
      tspBin,
      [
        "compile", project.entrypoint,
        "--emit", "@azure-tools/typespec-autorest",
        "--warn-as-error=false", "--pretty", "false",
        "--config", tempConfigPath,
      ],
      {
        cwd: project.projectDir,
        maxBuffer: 20 * 1024 * 1024,
        timeout: 300_000,
        env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=4096" },
        shell: true,
      },
    );
    const durationMs = Date.now() - start;
    const diagnostics = parseTspDiagnostics(stdout + "\n" + stderr);
    const swaggerFiles = findSwaggerFiles(swaggerOutputDir);
    return { status: "success", diagnostics, swaggerFiles, swaggerOutputDir, durationMs };
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const output = [err.stdout, err.stderr].filter(Boolean).join("\n");
    const diagnostics = parseTspDiagnostics(output);
    const swaggerFiles = findSwaggerFiles(swaggerOutputDir);
    if (diagnostics.length > 0) {
      return { status: "success", diagnostics, swaggerFiles, swaggerOutputDir, durationMs };
    }
    return { status: "failed", diagnostics, swaggerFiles, swaggerOutputDir, error: (err.message || "").slice(0, 500), durationMs };
  } finally {
    try { fs.unlinkSync(tempConfigPath); } catch {}
  }
}

// --- Swagger Discovery ---

/** Recursively find swagger/openapi JSON files in an output directory. */
function findSwaggerFiles(outputDir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(outputDir)) return files;

  function walk(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "examples" && !entry.name.startsWith(".")) {
          walk(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        try {
          const head = fs.readFileSync(fullPath, "utf-8").slice(0, 300);
          if (head.includes('"swagger"') || head.includes('"openapi"')) {
            files.push(fullPath);
          }
        } catch {}
      }
    }
  }

  walk(outputDir);
  return files;
}

function parseTspDiagnostics(output: string): DiagnosticEntry[] {
  const diagnostics: DiagnosticEntry[] = [];
  // TypeSpec CLI outputs: path:line:col - error/warning code: message
  const regex = /- (error|warning) ([@\w\-/]+):/g;
  let match: RegExpExecArray | null;
  const seen = new Set<string>();

  while ((match = regex.exec(output)) !== null) {
    const key = `${match[2]}:${match[1]}`;
    if (!seen.has(key)) {
      seen.add(key);
      diagnostics.push({
        code: match[2],
        severity: match[1],
        message: "",
      });
    }
  }
  return diagnostics;
}

// --- Validator ---

async function runValidator(
  swaggerFiles: string[],
  serviceType: "resource-manager" | "data-plane" | "unknown",
): Promise<{ violations: ValidatorViolation[]; error?: string; durationMs: number }> {
  const start = Date.now();
  const allViolations: ValidatorViolation[] = [];

  for (const swaggerFile of swaggerFiles) {
    try {
      const content = fs.readFileSync(swaggerFile, "utf-8");
      const swagger = JSON.parse(content);

      // Run spectral rules
      const spectralViolations = await runSpectralRules(swagger, serviceType);
      allViolations.push(...spectralViolations);

      // Run native rules
      const nativeViolations = await runNativeRules(swagger, swaggerFile, serviceType);
      allViolations.push(...nativeViolations);
    } catch (err: any) {
      return {
        violations: allViolations,
        error: `Failed on ${path.basename(swaggerFile)}: ${(err.message || "").slice(0, 200)}`,
        durationMs: Date.now() - start,
      };
    }
  }

  return { violations: allViolations, durationMs: Date.now() - start };
}

async function runSpectralRules(
  swagger: any,
  serviceType: string,
): Promise<ValidatorViolation[]> {
  const rulesets = _.cloneDeep(Object.values(spectralRulesets));
  for (const ruleset of rulesets) {
    deleteRulesPropertiesInPayloadNotValidForSpectralRules(ruleset);
  }

  const linter = new Spectral();
  linter.setRuleset({ extends: rulesets as any, rules: {} });

  const results = await linter.run(swagger);
  return results.map((r) => ({
    code: String(r.code),
    message: r.message,
    path: r.path.map(String),
    severity: r.severity,
  }));
}

async function runNativeRules(
  swagger: any,
  filePath: string,
  serviceType: string,
): Promise<ValidatorViolation[]> {
  const openapiType =
    serviceType === "resource-manager"
      ? OpenApiTypes.arm
      : serviceType === "data-plane"
        ? OpenApiTypes.dataplane
        : OpenApiTypes.default;

  try {
    const results = await lint(filePath, openapiType, nativeRulesets);
    return results.map((r: any) => ({
      code: r.code || r.id || "unknown",
      message: r.message || "",
      path: r.path || [],
      severity: r.severity ?? 1,
    }));
  } catch {
    return [];
  }
}

// --- Concurrency helper ---

async function processWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const idx = nextIndex++;
      results[idx] = await fn(items[idx], idx);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// --- Report generation ---

function generateReport(results: ProjectResult[], specsRepo: string, specsCommit: string, localLinter: boolean, linterBranch: string): ComparisonReport {
  const compiled = results.filter((r) => r.compileStatus === "success");
  const skipped = results.filter((r) => r.compileStatus === "skipped");
  const failed = results.filter((r) => r.compileStatus === "failed");
  const validated = results.filter((r) => r.validatorStatus === "success");
  const noSwagger = results.filter((r) => r.validatorStatus === "no-swagger");

  // Aggregate TypeSpec rule violations
  const tspRuleSummary: Record<string, { count: number; projects: string[] }> = {};
  for (const r of results) {
    for (const d of r.tspDiagnostics) {
      if (!tspRuleSummary[d.code]) {
        tspRuleSummary[d.code] = { count: 0, projects: [] };
      }
      tspRuleSummary[d.code].count++;
      if (!tspRuleSummary[d.code].projects.includes(r.project.relativePath)) {
        tspRuleSummary[d.code].projects.push(r.project.relativePath);
      }
    }
  }

  // Aggregate validator violations
  const validatorRuleSummary: Record<string, { count: number; projects: string[] }> = {};
  for (const r of results) {
    // Deduplicate per project per rule
    const seenCodes = new Set<string>();
    for (const v of r.validatorViolations) {
      if (!seenCodes.has(v.code)) {
        seenCodes.add(v.code);
        if (!validatorRuleSummary[v.code]) {
          validatorRuleSummary[v.code] = { count: 0, projects: [] };
        }
        validatorRuleSummary[v.code].count++;
        validatorRuleSummary[v.code].projects.push(r.project.relativePath);
      }
    }
  }

  return {
    metadata: {
      specsRepo,
      specsCommit,
      timestamp: new Date().toISOString(),
      localLinter,
      linterBranch,
      totalProjects: results.length,
      compiledSuccessfully: compiled.length,
      compileSkipped: skipped.length,
      compileFailed: failed.length,
      validatedSuccessfully: validated.length,
      validatorFailed: results.filter((r) => r.validatorStatus === "failed").length,
      noSwagger: noSwagger.length,
    },
    results,
    tspRuleSummary,
    validatorRuleSummary,
  };
}

/** Strip common prefixes from TSP lint rule names for readability */
function shortTspRule(rule: string): string {
  return rule
    .replace(/^tsp-lintdiff-local-linter\//, "")
    .replace(/^@azure-tools\/typespec-azure-resource-manager\//, "arm/")
    .replace(/^@azure-tools\/typespec-azure-core\//, "core/");
}

/** Shorten a project path for table display — keep last 2 segments */
function shortProjectPath(p: string): string {
  const clean = p.replace(/^specification\//, "");
  const parts = clean.split("/");
  if (parts.length <= 2) return clean;
  return parts.slice(-2).join("/");
}

/** Format a markdown table — compact output, prettier handles alignment */
function formatTable(rows: string[][]): string[] {
  if (rows.length === 0) return [];
  const lines: string[] = [];
  // Header
  lines.push("| " + rows[0].join(" | ") + " |");
  // Separator — preserve alignment markers
  const sep = rows[1];
  lines.push("| " + sep.map((cell) => {
    const trimmed = cell.trim();
    if (trimmed.startsWith(":") && trimmed.endsWith(":")) return ":---:";
    if (trimmed.endsWith(":")) return "---:";
    return "---";
  }).join(" | ") + " |");
  // Data rows
  for (let i = 2; i < rows.length; i++) {
    lines.push("| " + rows[i].join(" | ") + " |");
  }
  return lines;
}

/** Compute coverage stats for a project result */
function computeCoverageStats(
  r: ProjectResult,
  correlation: RuleCorrelation,
): { tspRules: number; valRules: number; coveredByBoth: number; noActionNeeded: number; needsCoverage: number; templateGaps: number } {
  const tspCodes = new Set(r.tspDiagnostics.map((d) => d.code));
  const valCodes = new Set(r.validatorViolations.map((v) => v.code));
  let coveredByBoth = 0;
  let noActionNeeded = 0;
  let needsCoverage = 0;
  let templateGaps = 0;
  for (const valCode of valCodes) {
    const coverage = correlation.validatorCoverage.get(valCode);
    const mappedTspCodes = correlation.validatorToTsp.get(valCode);
    const hasTspFired = mappedTspCodes && [...mappedTspCodes].some((c) => tspCodes.has(c));
    if (hasTspFired) {
      coveredByBoth++;
    } else if (coverage === "blocked" || coverage === "infallible") {
      noActionNeeded++;
    } else if (coverage === "template") {
      needsCoverage++;
      templateGaps++;
    } else if (mappedTspCodes && mappedTspCodes.size > 0) {
      const hasOfficial = [...mappedTspCodes].some((c) => c.startsWith("@azure-tools/"));
      if (hasOfficial) {
        noActionNeeded++;
      } else {
        needsCoverage++;
      }
    } else {
      needsCoverage++;
    }
  }
  return { tspRules: tspCodes.size, valRules: valCodes.size, coveredByBoth, noActionNeeded, needsCoverage, templateGaps };
}

function generateProjectReport(
  r: ProjectResult,
  correlation: RuleCorrelation,
): string {
  const lines: string[] = [];
  const shortPath = r.project.relativePath.replace(/^specification\//, "");
  const type = r.project.serviceType === "resource-manager" ? "ARM" : r.project.serviceType === "data-plane" ? "Data-plane" : "Unknown";

  lines.push(`# ${shortPath}`);
  lines.push("");
  lines.push(`**Type:** ${type}`);
  lines.push(`**Compiled:** ${r.compileStatus === "success" ? "Yes" : "No"}`);
  lines.push(`**Swagger files:** ${r.swaggerFiles.length}`);
  const stats = computeCoverageStats(r, correlation);
  if (stats.valRules > 0) {
    lines.push(`**Gaps:** ${stats.needsCoverage} of ${stats.valRules} validator rules need coverage`);
  }
  lines.push("");

  if (r.compileStatus === "failed") {
    lines.push("## Compile Error");
    lines.push("");
    lines.push("```");
    lines.push(r.compileError || "unknown");
    lines.push("```");
    lines.push("");
    return lines.join("\n");
  }

  const tspCodes = new Set(r.tspDiagnostics.map((d) => d.code));
  const valCodes = new Set(r.validatorViolations.map((v) => v.code));

  // Build correlated overlap
  let coveredByBoth = 0;

  const accountedTsp = new Set<string>();
  const accountedVal = new Set<string>();

  const rows: Array<{
    validatorRule: string;
    tspRule: string;
    inTsp: boolean;
    inVal: boolean;
    correlated: boolean;
    coverage: string;
  }> = [];

  // First pass: for each validator code that fired, check if a correlated tsp code also fired
  for (const valCode of valCodes) {
    const coverage = correlation.validatorCoverage.get(valCode) ?? "";
    const mappedTspCodes = correlation.validatorToTsp.get(valCode);
    if (mappedTspCodes) {
      const firedTsp = [...mappedTspCodes].filter((c) => tspCodes.has(c));
      if (firedTsp.length > 0) {
        for (const tspCode of firedTsp) {
          rows.push({ validatorRule: valCode, tspRule: tspCode, inTsp: true, inVal: true, correlated: true, coverage });
          accountedTsp.add(tspCode);
        }
        accountedVal.add(valCode);
        coveredByBoth++;
      } else {
        rows.push({ validatorRule: valCode, tspRule: mappedTspCodes.values().next().value ?? "", inTsp: false, inVal: true, correlated: true, coverage });
        accountedVal.add(valCode);
      }
    }
  }

  // Second pass: validator codes with no known correlation
  for (const valCode of valCodes) {
    if (accountedVal.has(valCode)) continue;
    const coverage = correlation.validatorCoverage.get(valCode) ?? "";
    rows.push({ validatorRule: valCode, tspRule: "", inTsp: false, inVal: true, correlated: false, coverage });
  }

  // Third pass: tsp codes not yet accounted for
  for (const tspCode of tspCodes) {
    if (accountedTsp.has(tspCode)) continue;
    const mappedValCodes = correlation.tspToValidator.get(tspCode);
    if (mappedValCodes) {
      const firedVal = [...mappedValCodes].filter((c) => valCodes.has(c));
      if (firedVal.length === 0) {
        const firstVal = mappedValCodes.values().next().value ?? "";
        const coverage = correlation.validatorCoverage.get(firstVal) ?? "";
        rows.push({ validatorRule: firstVal, tspRule: tspCode, inTsp: true, inVal: false, correlated: true, coverage });
      }
    } else {
      rows.push({ validatorRule: "", tspRule: tspCode, inTsp: true, inVal: false, correlated: false, coverage: "" });
    }
  }

  lines.push("## Coverage Overlap");
  lines.push("");
  lines.push(`> **TypeSpec Lint:** ${tspCodes.size} rules | **Validator:** ${valCodes.size} rules | **Covered by both:** ${coveredByBoth}`);
  lines.push("");

  if (rows.length > 0) {
    rows.sort((a, b) => {
      if (a.inTsp && a.inVal && !(b.inTsp && b.inVal)) return -1;
      if (b.inTsp && b.inVal && !(a.inTsp && a.inVal)) return 1;
      const aName = a.validatorRule || a.tspRule;
      const bName = b.validatorRule || b.tspRule;
      return aName.localeCompare(bName);
    });

    const tableRows: string[][] = [];
    tableRows.push(["Validator Rule", "TypeSpec Lint Rule", "Validator", "TSP Lint", "Status"]);
    tableRows.push(["---", "---", ":---:", ":---:", ":---:"]);

    for (const row of rows) {
      const valCell = row.validatorRule ? "`" + row.validatorRule + "`" : "";
      const tspCell = row.tspRule ? "`" + shortTspRule(row.tspRule) + "`" : "";
      const inValMark = row.inVal ? "✓" : "";
      const inTspMark = row.inTsp ? "✓" : "";
      // Status column: show coverage kind for context
      let status = "";
      if (row.inTsp && row.inVal) {
        status = "🔗 both";
      } else if (row.coverage === "template") {
        status = "📋 partial (template)";
      } else if (row.coverage === "blocked") {
        status = "🚫 blocked";
      } else if (row.coverage === "infallible") {
        status = "💎 infallible";
      } else if (row.correlated && row.inTsp) {
        status = "✅ tsp-lint only";
      } else if (row.correlated && row.inVal) {
        const isOfficial = row.tspRule.startsWith("@azure-tools/");
        status = isOfficial ? "🏷️ official ruleset" : "⚠️ gap";
      } else if (row.inVal && !row.inTsp) {
        status = "❓ uncovered";
      }
      tableRows.push([valCell, tspCell, inValMark, inTspMark, status]);
    }
    lines.push(...formatTable(tableRows));
  } else {
    lines.push("No rules detected by either tool.");
  }
  lines.push("");

  return lines.join("\n");
}

function generateMarkdown(report: ComparisonReport, correlation: RuleCorrelation, baseline?: ComparisonReport): string {
  const lines: string[] = [];

  lines.push("# Cross-Repo Comparison Report");
  lines.push("");
  lines.push(`**Generated:** ${report.metadata.timestamp}`);
  lines.push(`**Specs repo:** ${report.metadata.specsRepo}`);
  lines.push(`**Specs commit:** \`${report.metadata.specsCommit}\``);
  lines.push(`**Local linter:** ${report.metadata.localLinter ? "✅ enabled" : "⏭️ skipped"}`);
  if (report.metadata.linterBranch) {
    lines.push(`**Linter branch:** \`${report.metadata.linterBranch}\``);
  }
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push("");
  const summaryTable: string[][] = [
    ["Metric", "Count"],
    ["---", "---:"],
    ["Total projects", String(report.metadata.totalProjects)],
    ["Compiled successfully", String(report.metadata.compiledSuccessfully)],
    ["Compile skipped (no main.tsp)", String(report.metadata.compileSkipped)],
    ["Compile failed", String(report.metadata.compileFailed)],
    ["Validated successfully", String(report.metadata.validatedSuccessfully)],
    ["Validator failed", String(report.metadata.validatorFailed)],
    ["No swagger emitted", String(report.metadata.noSwagger)],
  ];
  lines.push(...formatTable(summaryTable));
  lines.push("");

  // Coverage summary stats
  let projectsWithGaps = 0;
  let projectsNoGaps = 0;
  let projectsNoRules = 0;
  for (const r of report.results) {
    const valCodes = new Set(r.validatorViolations.map((v) => v.code));
    const tspCodes = new Set(r.tspDiagnostics.map((d) => d.code));
    if (valCodes.size === 0 && tspCodes.size === 0) {
      projectsNoRules++;
    } else {
      const stats = computeCoverageStats(r, correlation);
      if (stats.needsCoverage > 0) {
        projectsWithGaps++;
      } else {
        projectsNoGaps++;
      }
    }
  }
  const coverageSummaryTable: string[][] = [
    ["Coverage Metric", "Count"],
    ["---", "---:"],
    ["Projects with gaps", String(projectsWithGaps)],
    ["Projects with no gaps", String(projectsNoGaps)],
    ["Projects with no rules triggered", String(projectsNoRules)],
  ];
  lines.push(...formatTable(coverageSummaryTable));
  lines.push("");

  // Per-project comparison table
  lines.push("## Per-Project Comparison");
  lines.push("");
  const projTable: string[][] = [
    ["Project", "Type", "Compiled", "TSP Lints", "Validator Rules", "Gaps", "Swagger Files"],
    ["---", "---", ":---:", ":---:", ":---:", ":---:", ":---:"],
  ];
  for (const r of report.results) {
    const shortPath = r.project.relativePath.replace(/^specification\//, "");
    const compiled = r.compileStatus === "success" ? "✓" : r.compileStatus === "skipped" ? "⏭️" : "✗";
    const type = r.project.serviceType === "resource-manager" ? "ARM" : r.project.serviceType === "data-plane" ? "DP" : "?";
    const tspCount = String(r.tspDiagnostics.length);
    const valRules = new Set(r.validatorViolations.map((v) => v.code)).size;
    const stats = computeCoverageStats(r, correlation);
    const gapsStr = valRules > 0 ? String(stats.needsCoverage) : "-";
    projTable.push([shortPath, type, compiled, tspCount, String(valRules), gapsStr, String(r.swaggerFiles.length)]);
  }
  lines.push(...formatTable(projTable));
  lines.push("");

  // Coverage overlap summary (details in per-project reports)
  lines.push("## Coverage Overlap");
  lines.push("");
  lines.push("Detailed per-project overlap reports are in the `per-project-reports/` subdirectory.");
  lines.push("");
  const overlapTable: string[][] = [
    ["Project", "TSP Lint Rules", "Validator Rules", "Covered by Both", "No Action Needed", "Needs Coverage", "Only Template-Enforced", "Report"],
    ["---", ":---:", ":---:", ":---:", ":---:", ":---:", ":---:", "---"],
  ];

  for (const r of report.results) {
    const stats = computeCoverageStats(r, correlation);
    if (stats.tspRules === 0 && stats.valRules === 0) continue;

    const shortPath = r.project.relativePath.replace(/^specification\//, "");
    const fileName = shortPath.replace(/\//g, "_") + ".md";
    overlapTable.push([shortPath, String(stats.tspRules), String(stats.valRules), String(stats.coveredByBoth), String(stats.noActionNeeded), String(stats.needsCoverage), String(stats.templateGaps), "[details](per-project-reports/" + fileName + ")"]);
  }
  lines.push(...formatTable(overlapTable));
  lines.push("");

  // TypeSpec diagnostics table
  lines.push("## TypeSpec Lint Violations (Aggregate)");
  lines.push("");
  const tspEntries = Object.entries(report.tspRuleSummary)
    .sort((a, b) => b[1].count - a[1].count);

  if (tspEntries.length === 0) {
    lines.push("No TypeSpec lint violations found.");
  } else {
    const tspTable: string[][] = [
      ["Rule", "Projects Violating", "Example Projects"],
      ["---", ":---:", "---"],
    ];
    for (const [rule, data] of tspEntries) {
      const examples = data.projects.slice(0, 2).map((p) => shortProjectPath(p)).join(", ");
      const more = data.projects.length > 2 ? " (+" + (data.projects.length - 2) + " more)" : "";
      tspTable.push(["`" + shortTspRule(rule) + "`", String(data.count), examples + more]);
    }
    lines.push(...formatTable(tspTable));
  }
  lines.push("");

  // Validator violations table
  lines.push("## Azure OpenAPI Validator Violations (Aggregate)");
  lines.push("");
  const validatorEntries = Object.entries(report.validatorRuleSummary)
    .sort((a, b) => b[1].count - a[1].count);

  if (validatorEntries.length === 0) {
    lines.push("No validator violations found.");
  } else {
    const valTable: string[][] = [
      ["Rule", "Projects Violating", "Example Projects"],
      ["---", ":---:", "---"],
    ];
    for (const [rule, data] of validatorEntries) {
      const examples = data.projects.slice(0, 2).map((p) => shortProjectPath(p)).join(", ");
      const more = data.projects.length > 2 ? " (+" + (data.projects.length - 2) + " more)" : "";
      valTable.push(["`" + rule + "`", String(data.count), examples + more]);
    }
    lines.push(...formatTable(valTable));
  }
  lines.push("");

  // Compile failures
  const failures = report.results.filter((r) => r.compileStatus === "failed");
  if (failures.length > 0) {
    lines.push("## Compile Failures");
    lines.push("");
    const failTable: string[][] = [
      ["Project", "Error"],
      ["---", "---"],
    ];
    for (const f of failures.slice(0, 50)) {
      const errSummary = (f.compileError || "unknown").replace(/\|/g, "\\|").slice(0, 100);
      const shortPath = f.project.relativePath.replace(/^specification\//, "");
      failTable.push([shortPath, errSummary]);
    }
    if (failures.length > 50) {
      failTable.push(["...", (failures.length - 50) + " more failures"]);
    }
    lines.push(...formatTable(failTable));
  }
  lines.push("");

  // Comparison with baseline (if provided)
  if (baseline) {
    lines.push("## Changes from Previous Run");
    lines.push("");
    lines.push(`**Previous run:** ${baseline.metadata.timestamp} (commit \`${baseline.metadata.specsCommit?.slice(0, 10) ?? "unknown"}\`)`);
    lines.push("");

    // Overall stats comparison
    const statsTable: string[][] = [
      ["Metric", "Previous", "Current", "Change"],
      ["---", ":---:", ":---:", ":---:"],
      ["Compiled", String(baseline.metadata.compiledSuccessfully), String(report.metadata.compiledSuccessfully), delta(report.metadata.compiledSuccessfully, baseline.metadata.compiledSuccessfully)],
      ["TSP lint codes", String(Object.keys(baseline.tspRuleSummary).length), String(Object.keys(report.tspRuleSummary).length), delta(Object.keys(report.tspRuleSummary).length, Object.keys(baseline.tspRuleSummary).length)],
      ["Validator rules", String(Object.keys(baseline.validatorRuleSummary).length), String(Object.keys(report.validatorRuleSummary).length), delta(Object.keys(report.validatorRuleSummary).length, Object.keys(baseline.validatorRuleSummary).length)],
    ];

    // Compute aggregate gaps for both runs
    let oldTotalGaps = 0;
    let newTotalGaps = 0;
    let oldTemplateGaps = 0;
    let newTemplateGaps = 0;
    const oldGapsMap = new Map<string, number>();
    const newGapsMap = new Map<string, number>();

    for (const r of baseline.results) {
      const stats = computeCoverageStats(r, correlation);
      oldGapsMap.set(r.project.relativePath, stats.needsCoverage);
      oldTotalGaps += stats.needsCoverage;
      oldTemplateGaps += stats.templateGaps;
    }
    for (const r of report.results) {
      const stats = computeCoverageStats(r, correlation);
      newGapsMap.set(r.project.relativePath, stats.needsCoverage);
      newTotalGaps += stats.needsCoverage;
      newTemplateGaps += stats.templateGaps;
    }

    statsTable.push(["Total gaps", String(oldTotalGaps), String(newTotalGaps), delta(newTotalGaps, oldTotalGaps)]);
    statsTable.push(["  ↳ Only template-enforced", String(oldTemplateGaps), String(newTemplateGaps), delta(newTemplateGaps, oldTemplateGaps)]);
    lines.push(...formatTable(statsTable));
    lines.push("");

    // Per-project gap changes (top increases and decreases)
    const allProjects = new Set([...oldGapsMap.keys(), ...newGapsMap.keys()]);
    const diffs: Array<{ project: string; old: number; new: number; diff: number }> = [];
    for (const p of allProjects) {
      const oldG = oldGapsMap.get(p) ?? 0;
      const newG = newGapsMap.get(p) ?? 0;
      const diff = newG - oldG;
      if (diff !== 0) diffs.push({ project: p, old: oldG, new: newG, diff });
    }
    diffs.sort((a, b) => b.diff - a.diff);

    if (diffs.length > 0) {
      const mean = diffs.reduce((a, b) => a + b.diff, 0) / diffs.length;
      const variance = diffs.reduce((a, b) => a + (b.diff - mean) ** 2, 0) / diffs.length;
      const stddev = Math.sqrt(variance);
      lines.push(`> **${diffs.length}** projects changed gaps | Mean: ${mean.toFixed(1)} | Std dev: ${stddev.toFixed(1)}`);
      lines.push("");

      // Top increases
      const increases = diffs.filter((d) => d.diff > 0).slice(0, 10);
      if (increases.length > 0) {
        lines.push("### Top Gap Increases");
        lines.push("");
        const incTable: string[][] = [
          ["Project", "Previous", "Current", "Change"],
          ["---", ":---:", ":---:", ":---:"],
        ];
        for (const d of increases) {
          const shortPath = d.project.replace(/^specification\//, "");
          incTable.push([shortPath, String(d.old), String(d.new), "+" + d.diff]);
        }
        lines.push(...formatTable(incTable));
        lines.push("");
      }

      // Top decreases (improvements)
      const decreases = diffs.filter((d) => d.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 10);
      if (decreases.length > 0) {
        lines.push("### Top Gap Decreases (Improvements)");
        lines.push("");
        const decTable: string[][] = [
          ["Project", "Previous", "Current", "Change"],
          ["---", ":---:", ":---:", ":---:"],
        ];
        for (const d of decreases) {
          const shortPath = d.project.replace(/^specification\//, "");
          decTable.push([shortPath, String(d.old), String(d.new), String(d.diff)]);
        }
        lines.push(...formatTable(decTable));
        lines.push("");
      }
    } else {
      lines.push("No changes in gap counts between runs.");
      lines.push("");
    }
  }

  return lines.join("\n");
}

function delta(current: number, previous: number): string {
  const diff = current - previous;
  if (diff === 0) return "—";
  return diff > 0 ? "+" + diff : String(diff);
}

// --- Main ---

async function main() {
  const config = parseArgs();

  // Regenerate mode: re-generate reports from existing JSON data
  if (config.regenerate) {
    const jsonPath = path.resolve(config.regenerate);
    if (!fs.existsSync(jsonPath)) {
      console.error(`JSON file not found: ${jsonPath}`);
      process.exit(1);
    }
    console.log(`\n📄 Regenerating reports from ${jsonPath}...`);
    const report: ComparisonReport = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const correlation = loadRuleCorrelation();

    // Load baseline for comparison if specified
    let baseline: ComparisonReport | undefined;
    if (config.compareWith) {
      const baselinePath = path.resolve(config.compareWith);
      if (fs.existsSync(baselinePath)) {
        baseline = JSON.parse(fs.readFileSync(baselinePath, "utf-8"));
        console.log(`   Comparing with: ${baselinePath}`);
      } else {
        console.warn(`   ⚠️  Baseline not found: ${baselinePath}`);
      }
    }

    fs.mkdirSync(config.outputDir, { recursive: true });

    const mdPath = path.join(config.outputDir, "cross-repo-comparison.md");
    fs.writeFileSync(mdPath, generateMarkdown(report, correlation, baseline));
    console.log(`   Markdown: ${mdPath}`);

    if (!config.skipPerProject) {
      const perProjectDir = path.join(config.outputDir, "per-project-reports");
      fs.mkdirSync(perProjectDir, { recursive: true });
      let perProjectCount = 0;
      for (const r of report.results) {
        const shortPath = r.project.relativePath.replace(/^specification\//, "");
        const fileName = shortPath.replace(/\//g, "_") + ".md";
        const projectMd = generateProjectReport(r, correlation);
        fs.writeFileSync(path.join(perProjectDir, fileName), projectMd);
        perProjectCount++;
      }
      console.log(`   Per-project reports: ${perProjectDir} (${perProjectCount} files)`);
    }

    // Format with prettier
    const mdFiles = [mdPath];
    if (!config.skipPerProject) {
      const perProjectDir = path.join(config.outputDir, "per-project-reports");
      const entries = fs.readdirSync(perProjectDir).filter((f) => f.endsWith(".md"));
      for (const f of entries) {
        mdFiles.push(path.join(perProjectDir, f));
      }
    }
    console.log(`\n📐 Formatting ${mdFiles.length} markdown files with prettier...`);
    try {
      const batchSize = 50;
      for (let i = 0; i < mdFiles.length; i += batchSize) {
        const batch = mdFiles.slice(i, i + batchSize);
        await execFileAsync("npx", ["prettier", "--write", ...batch], {
          maxBuffer: 10 * 1024 * 1024,
          shell: true,
        });
      }
    } catch (e: any) {
      console.warn(`   ⚠️  Prettier formatting failed: ${e.message}`);
    }

    console.log(`\n✅ Reports regenerated!`);
    return;
  }

  const lastCommitFile = path.join(config.outputDir, ".last-commit");

  // Resolve the target commit for the specs repo
  let targetCommit = config.commit;
  if (!targetCommit && fs.existsSync(lastCommitFile)) {
    targetCommit = fs.readFileSync(lastCommitFile, "utf-8").trim();
    console.log(`\n📌 Reusing pinned specs commit: ${targetCommit.slice(0, 10)}...`);
  }

  // Get the current branch/commit so we can restore it later
  let originalRef: string | null = null;
  if (targetCommit) {
    try {
      const { stdout: branchOut } = await execFileAsync("git", ["-C", config.specsRepo, "symbolic-ref", "--short", "HEAD"]);
      originalRef = branchOut.trim();
    } catch {
      const { stdout: headOut } = await execFileAsync("git", ["-C", config.specsRepo, "rev-parse", "HEAD"]);
      originalRef = headOut.trim();
    }
    console.log(`   Checking out commit ${targetCommit.slice(0, 10)}...`);
    await execFileAsync("git", ["-C", config.specsRepo, "checkout", targetCommit, "--quiet"]);
  }

  // Read the actual HEAD commit (whether we checked out or not)
  const { stdout: commitOut } = await execFileAsync("git", ["-C", config.specsRepo, "rev-parse", "HEAD"]);
  const specsCommit = commitOut.trim();

  try {
    await runComparison(config, specsCommit);
  } finally {
    // Restore the original branch/commit if we changed it
    if (originalRef) {
      console.log(`\n🔄 Restoring specs repo to ${originalRef}...`);
      await execFileAsync("git", ["-C", config.specsRepo, "checkout", originalRef, "--quiet"]);
    }
  }

  // Save the commit for next run
  fs.mkdirSync(config.outputDir, { recursive: true });
  fs.writeFileSync(lastCommitFile, specsCommit + "\n");
}

async function runComparison(config: ReturnType<typeof parseArgs>, specsCommit: string) {
  console.log(`\n🔍 Discovering TypeSpec projects in ${config.specsRepo}...`);
  console.log(`   Specs commit: ${specsCommit.slice(0, 10)}...`);
  if (config.serviceTypeFilter) {
    console.log(`   Filtering to: ${config.serviceTypeFilter}`);
  }
  const projects = discoverProjects(config.specsRepo, config.filter, config.serviceTypeFilter, config.limit);
  console.log(`   Found ${projects.length} projects`);
  console.log(`   ARM: ${projects.filter((p) => p.serviceType === "resource-manager").length}`);
  console.log(`   Data-plane: ${projects.filter((p) => p.serviceType === "data-plane").length}`);
  console.log(`   Unknown: ${projects.filter((p) => p.serviceType === "unknown").length}`);

  // Build, link, and resolve local linter (enabled by default, skip with --skip-local-linter)
  let localLinterPath: string | null = null;
  if (config.localLinter) {
    const repoRoot = path.resolve(import.meta.dirname, "..", "..");
    localLinterPath = repoRoot;
    if (!fs.existsSync(path.join(localLinterPath, "package.json"))) {
      console.error(`Local linter not found at ${localLinterPath}. Use --skip-local-linter to run without it.`);
      process.exit(1);
    }

    console.log(`\n🔧 Local linter setup...`);

    // Build the linter
    try {
      console.log(`   Building linter...`);
      execSync("npm run build", { cwd: repoRoot, stdio: "pipe" });
      console.log(`   ✓ Linter built`);
    } catch (err: any) {
      console.error(`   ✗ Linter build failed: ${(err.stderr?.toString() || err.message).slice(0, 300)}`);
      process.exit(1);
    }

    // Link the linter globally, then into the specs repo
    try {
      console.log(`   Linking linter...`);
      execSync("npm link", { cwd: localLinterPath, stdio: "pipe" });
      execSync("npm link tsp-lintdiff-local-linter", { cwd: config.specsRepo, stdio: "pipe" });
      console.log(`   ✓ Linter linked into specs repo`);
    } catch (err: any) {
      console.error(`   ✗ Linter link failed: ${(err.stderr?.toString() || err.message).slice(0, 300)}`);
      process.exit(1);
    }

    // Verify the link has built output
    const linkedDist = path.join(config.specsRepo, "node_modules", "tsp-lintdiff-local-linter", "dist", "src", "linter.js");
    if (!fs.existsSync(linkedDist)) {
      console.error(`   ✗ Built output not found at ${linkedDist}. Build may have failed.`);
      process.exit(1);
    }

    console.log(`   ✓ Local linter ready: ${localLinterPath}`);
  } else {
    console.log(`\n⏭️  Local linter: skipped (--skip-local-linter)`);
  }

  // Process projects
  console.log(`\n⚙️  Processing with concurrency ${config.concurrency}...\n`);

  const results = await processWithConcurrency(projects, config.concurrency, async (project, idx) => {
    const progress = `[${idx + 1}/${projects.length}]`;
    process.stdout.write(`${progress} ${project.relativePath}...`);

    // Skip projects without main.tsp
    if (project.entrypoint !== "main.tsp") {
      process.stdout.write(` ⏭️ skipped (no main.tsp)\n`);
      const result: ProjectResult = {
        project,
        compileStatus: "skipped",
        compileDurationMs: 0,
        tspDiagnostics: [],
        swaggerFiles: [],
        validatorStatus: "no-swagger",
        validatorDurationMs: 0,
        validatorViolations: [],
      };
      return result;
    }

    // Compile and emit swagger to temp dir
    const compile = await compileProject(project, config.specsRepo, localLinterPath);

    try {
      const swaggerFiles = compile.swaggerFiles;

      let validatorResult: { violations: ValidatorViolation[]; error?: string; durationMs: number };
      let validatorStatus: ValidatorStatus;

      if (swaggerFiles.length === 0) {
        validatorResult = { violations: [], durationMs: 0 };
        validatorStatus = "no-swagger";
      } else {
        validatorResult = await runValidator(swaggerFiles, project.serviceType);
        validatorStatus = validatorResult.error ? "failed" : "success";
      }

    const tspCount = compile.diagnostics.length;
    const valCount = validatorResult.violations.length;
    const statusIcon = compile.status === "success" ? "✓" : "✗";
    process.stdout.write(` ${statusIcon} (tsp: ${tspCount}, val: ${valCount}, swagger: ${swaggerFiles.length})\n`);

    const result: ProjectResult = {
      project,
      compileStatus: compile.status,
      compileError: compile.error,
      compileDurationMs: compile.durationMs,
      tspDiagnostics: compile.diagnostics,
      swaggerFiles,
      validatorStatus,
      validatorError: validatorResult.error,
      validatorDurationMs: validatorResult.durationMs,
      validatorViolations: validatorResult.violations,
    };

    return result;
    } finally {
      // Clean up swagger temp dir
      try { fs.rmSync(compile.swaggerOutputDir, { recursive: true, force: true }); } catch {}
    }
  });

  // Generate report
  console.log(`\n📊 Generating report...`);
  const linterRepoRoot = path.resolve(import.meta.dirname, "..");
  const linterBranch = execSync("git branch --show-current", { cwd: linterRepoRoot, encoding: "utf-8" }).trim()
    || execSync("git rev-parse --short HEAD", { cwd: linterRepoRoot, encoding: "utf-8" }).trim();
  const report = generateReport(results, config.specsRepo, specsCommit, config.localLinter, linterBranch);
  const correlation = loadRuleCorrelation();

  // Load baseline for comparison if specified
  let baseline: ComparisonReport | undefined;
  if (config.compareWith) {
    const baselinePath = path.resolve(config.compareWith);
    if (fs.existsSync(baselinePath)) {
      baseline = JSON.parse(fs.readFileSync(baselinePath, "utf-8"));
      console.log(`   Comparing with: ${baselinePath}`);
    } else {
      console.warn(`   ⚠️  Baseline not found: ${baselinePath}`);
    }
  }

  // Write outputs
  fs.mkdirSync(config.outputDir, { recursive: true });

  const jsonPath = path.join(config.outputDir, "cross-repo-comparison.json");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`   JSON: ${jsonPath}`);

  const mdPath = path.join(config.outputDir, "cross-repo-comparison.md");
  fs.writeFileSync(mdPath, generateMarkdown(report, correlation, baseline));
  console.log(`   Markdown: ${mdPath}`);

  // Write per-project reports
  if (!config.skipPerProject) {
    const perProjectDir = path.join(config.outputDir, "per-project-reports");
    fs.mkdirSync(perProjectDir, { recursive: true });
    let perProjectCount = 0;
    for (const r of report.results) {
      const shortPath = r.project.relativePath.replace(/^specification\//, "");
      const fileName = shortPath.replace(/\//g, "_") + ".md";
      const projectMd = generateProjectReport(r, correlation);
      fs.writeFileSync(path.join(perProjectDir, fileName), projectMd);
      perProjectCount++;
    }
    console.log(`   Per-project reports: ${perProjectDir} (${perProjectCount} files)`);
  }

  // Format all markdown files with prettier (batched to avoid ENAMETOOLONG)
  const mdFiles = [mdPath];
  if (!config.skipPerProject) {
    const perProjectDir = path.join(config.outputDir, "per-project-reports");
    const entries = fs.readdirSync(perProjectDir).filter((f) => f.endsWith(".md"));
    for (const f of entries) {
      mdFiles.push(path.join(perProjectDir, f));
    }
  }
  console.log(`\n📐 Formatting ${mdFiles.length} markdown files with prettier...`);
  try {
    const batchSize = 50;
    for (let i = 0; i < mdFiles.length; i += batchSize) {
      const batch = mdFiles.slice(i, i + batchSize);
      await execFileAsync("npx", ["prettier", "--write", ...batch], {
        maxBuffer: 10 * 1024 * 1024,
        shell: true,
      });
    }
  } catch (e: any) {
    console.warn(`   ⚠️  Prettier formatting failed: ${e.message}`);
  }

  // Print quick summary
  console.log(`\n✅ Done!`);
  console.log(`   ${report.metadata.compiledSuccessfully}/${report.metadata.totalProjects} compiled`);
  if (report.metadata.compileSkipped > 0) {
    console.log(`   ${report.metadata.compileSkipped} skipped (no main.tsp)`);
  }
  console.log(`   ${report.metadata.validatedSuccessfully} validated with swagger`);
  console.log(`   ${Object.keys(report.tspRuleSummary).length} distinct TypeSpec lint codes fired`);
  console.log(`   ${Object.keys(report.validatorRuleSummary).length} distinct validator rule codes fired`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
