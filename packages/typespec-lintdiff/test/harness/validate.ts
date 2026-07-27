import pkg from "@stoplight/spectral-core";
const { Spectral } = pkg;
import rulesetsPkg from "@microsoft.azure/openapi-validator-rulesets";
const {
  spectralRulesets,
  deleteRulesPropertiesInPayloadNotValidForSpectralRules,
  nativeRulesets,
} = rulesetsPkg;
import corePkg from "@microsoft.azure/openapi-validator-core";
const { lint, OpenApiTypes } = corePkg;
import _ from "lodash";
import * as path from "path";
import * as fs from "fs";
import { execFile } from "child_process";
import {
  getDirectDiagnosticCodes,
  getMappingStatus,
  getTspDiagnosticStatus,
  getTemplateDiagnosticCodes,
  getVerifiedDiagnosticCodes,
  loadRuleConfig,
  resolveTspRuleset,
  type RuleApplicability,
  type MappingStatus,
  type RuleConfig,
  type RuleSeverity,
  type RuleRuleset,
  type TspDiagnosticStatus,
  type TspRulesetSource,
} from "./lib/rule-config.js";
import { auditRuleMetadata } from "./lib/rule-metadata-audit.js";

// --- Types ---

interface TestCase {
  ruleDir: string;
  ruleConfig: RuleConfig;
  testCaseId: string;
  mainTspPath: string;
  expectViolation: boolean;
  reviewedAmbientDiagnostics: DiagnosticCodeCount[] | null;
  reviewedValidatorDiagnostics: DiagnosticCodeCount[] | null;
  suppressedDiagnosticCodes: string[];
}

type TestIntent = "violation" | "compliance";
type ValidatorResult = "violation" | "no-violation";
type TrustStatus =
  | "explicit-ruleset"
  | "inferred-ruleset"
  | "project-default-ruleset";
type ResultCategoryId =
  | "compile-failure"
  | "covered-direct"
  | "settled-template-enforced"
  | "covered-direct-and-template"
  | "partial-coverage"
  | "settled-prerequisite-blocked"
  | "gap-suppressed-diagnostics"
  | "gap-no-diagnostics"
  | "gap-unmapped-diagnostics"
  | "no-swagger-violation"
  | "compliant-clean"
  | "compliant-reviewed-ambient-diagnostics"
  | "compliant-unreviewed-ambient-diagnostics"
  | "compliant-unexpected-ambient-diagnostics"
  | "compliant-mapped-diagnostics"
  | "compliant-reviewed-validator-discrepancy"
  | "unexpected-violation";

interface TestResult {
  testCase: TestCase;
  testIntent: TestIntent;
  validatorResult: ValidatorResult;
  mappingStatus: MappingStatus;
  tspDiagnosticStatus: TspDiagnosticStatus;
  tspRuleset: RuleRuleset;
  tspRulesetSource: TspRulesetSource;
  trustStatus: TrustStatus;
  tspCompiled: boolean;
  tspDiagnostics: DiagnosticInfo[];
  swaggerGenerated: boolean;
  swaggerPath: string | null;
  validatorViolations: ValidatorViolation[];
  validatorRan: boolean;
  swaggerViolatesRule: boolean;
  tspHasRelatedWarning: boolean;
  tspHasDirectWarning: boolean;
  tspHasTemplateWarning: boolean;
  openApiSnapshotStatus: "match" | "updated" | "mismatch" | "missing" | "skipped";
  tspDiagnosticsSnapshotStatus: "match" | "updated" | "mismatch" | "missing" | "skipped";
  validatorDiagnosticsSnapshotStatus: "match" | "updated" | "mismatch" | "missing" | "skipped";
}

interface DiagnosticInfo {
  code: string;
  severity: string;
  message: string;
}

interface DiagnosticCodeCount {
  code: string;
  count: number;
}

interface TestExpectation {
  violation: boolean;
  ambientDiagnostics: DiagnosticCodeCount[] | null;
  validatorDiagnostics: DiagnosticCodeCount[] | null;
}

interface ValidatorViolation {
  code: string;
  message: string;
  path: string[];
  severity: number;
}

interface ResultCategoryDefinition {
  id: ResultCategoryId;
  label: string;
  confidence: string;
  meaning: string;
}

type RuleApplicabilityFilter = "arm" | "data-plane" | "sdk";

// --- Config ---

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const TESTS_DIR = path.join(REPO_ROOT, "fixtures");
// ARM common-types TypeSpec sources. Not vendored in this repo; provide via env
// (LINTDIFF_COMMON_TYPES) or `npm run compare:setup`, which populates ./common-types.
const COMMON_TYPES_DIR = process.env.LINTDIFF_COMMON_TYPES ?? path.join(REPO_ROOT, "common-types");
const RESULT_CATEGORIES: ResultCategoryDefinition[] = [
  {
    id: "covered-direct",
    label: "Covered by direct TypeSpec lint",
    confidence: "High confidence",
    meaning: "The validator rule fires and a directly-mapped TypeSpec lint also fires.",
  },
  {
    id: "settled-template-enforced",
    label: "Settled template-enforced coverage",
    confidence: "Resolved non-direct",
    meaning:
      "The validator rule fires, but the rule is intentionally treated as template-enforced rather than as a direct native-lint target.",
  },
  {
    id: "covered-direct-and-template",
    label: "Covered by direct and template-related lints",
    confidence: "High confidence",
    meaning: "The validator rule fires and both direct and template-related TypeSpec diagnostics are present.",
  },
  {
    id: "partial-coverage",
    label: "Partial coverage",
    confidence: "Mixed confidence",
    meaning: "The rule is intentionally modeled as only partially equivalent.",
  },
  {
    id: "settled-prerequisite-blocked",
    label: "Settled prerequisite-blocked coverage",
    confidence: "Resolved non-direct",
    meaning:
      "The validator rule fires, but the fixture depends on suppressing unrelated TypeSpec diagnostics and the rule metadata explicitly marks the outcome as prerequisite-blocked.",
  },
  {
    id: "gap-suppressed-diagnostics",
    label: "Gap masked by suppressed TypeSpec diagnostics",
    confidence: "Investigate fixture and prerequisites",
    meaning: "The validator rule fires, no mapped TypeSpec lint fires, and the fixture suppresses unrelated TypeSpec diagnostics that may make the scenario impossible in normal authoring.",
  },
  {
    id: "gap-no-diagnostics",
    label: "Confirmed gap without TypeSpec diagnostics",
    confidence: "Highest confidence deficiency",
    meaning: "The validator rule fires and TypeSpec emits no diagnostics at all.",
  },
  {
    id: "gap-unmapped-diagnostics",
    label: "Possible gap with unmapped TypeSpec diagnostics",
    confidence: "Investigate",
    meaning: "The validator rule fires, but only unmapped TypeSpec diagnostics are present.",
  },
  {
    id: "no-swagger-violation",
    label: "Expected violation but validator stayed silent",
    confidence: "Test quality issue",
    meaning: "A violation test did not reproduce the validator rule.",
  },
  {
    id: "compliant-clean",
    label: "Provably clean compliance case",
    confidence: "Strong proof",
    meaning: "The compliance test is clean in both systems.",
  },
  {
    id: "compliant-reviewed-ambient-diagnostics",
    label: "Provably compliant with reviewed ambient diagnostics",
    confidence: "Reviewed explicit proof",
    meaning:
      "The validator stays silent and the observed ambient TypeSpec diagnostics exactly match the reviewed expectation for the case.",
  },
  {
    id: "compliant-unreviewed-ambient-diagnostics",
    label: "Compliance case with unreviewed ambient diagnostics",
    confidence: "Needs review",
    meaning:
      "The validator stays silent, but ambient TypeSpec diagnostics are present without a reviewed expectation yet.",
  },
  {
    id: "compliant-unexpected-ambient-diagnostics",
    label: "Compliance case with unexpected ambient diagnostics",
    confidence: "Cleanup or drift review",
    meaning:
      "The validator stays silent, but the observed ambient TypeSpec diagnostics do not match the reviewed expectation.",
  },
  {
    id: "compliant-mapped-diagnostics",
    label: "Compliance case with mapped TypeSpec diagnostics",
    confidence: "Possible overbroad mapping",
    meaning: "The validator stays silent, but a mapped TypeSpec lint still fires.",
  },
  {
    id: "compliant-reviewed-validator-discrepancy",
    label: "Compliance case with reviewed validator discrepancy",
    confidence: "Settled test-quality issue",
    meaning:
      "The compliance test still hits a reviewed validator-only discrepancy, and the observed validator diagnostics match the expectation.",
  },
  {
    id: "unexpected-violation",
    label: "Unexpected validator violation in compliance case",
    confidence: "High priority test issue",
    meaning: "A compliance test still triggers the validator rule.",
  },
  {
    id: "compile-failure",
    label: "TypeSpec compile failure",
    confidence: "Harness/test failure",
    meaning: "TypeSpec did not successfully compile the test case.",
  },
];

function normalizeDiagnosticCodeCounts(
  raw: unknown,
  source: string,
): DiagnosticCodeCount[] {
  if (!Array.isArray(raw)) {
    throw new Error(`${source}: ambientDiagnostics must be an array when provided.`);
  }

  const counts = new Map<string, number>();
  for (const entry of raw) {
    let code: string | undefined;
    let count = 1;

    if (typeof entry === "string") {
      code = entry;
    } else if (entry && typeof entry === "object") {
      const candidate = entry as { code?: unknown; count?: unknown };
      if (typeof candidate.code === "string") {
        code = candidate.code;
      }
      if (candidate.count !== undefined) {
        if (!Number.isInteger(candidate.count) || candidate.count < 1) {
          throw new Error(
            `${source}: ambientDiagnostics count for '${String(candidate.code)}' must be a positive integer.`,
          );
        }
        count = candidate.count;
      }
    }

    if (!code || !code.trim()) {
      throw new Error(
        `${source}: ambientDiagnostics entries must be strings or { code, count } objects.`,
      );
    }

    const normalizedCode = code.trim();
    counts.set(normalizedCode, (counts.get(normalizedCode) ?? 0) + count);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, count]) => ({ code, count }));
}

// Load test case expectation from tests/{RuleName}/{testCaseId}/expect.json
function loadExpectation(testCasePath: string): TestExpectation {
  const expectPath = path.join(testCasePath, "expect.json");
  if (fs.existsSync(expectPath)) {
    const parsed = JSON.parse(fs.readFileSync(expectPath, "utf-8"));
    return {
      violation: parsed.violation ?? true,
      ambientDiagnostics: parsed.ambientDiagnostics === undefined
        ? null
        : normalizeDiagnosticCodeCounts(parsed.ambientDiagnostics, expectPath),
      validatorDiagnostics: parsed.validatorDiagnostics === undefined
        ? null
        : normalizeDiagnosticCodeCounts(parsed.validatorDiagnostics, expectPath),
    };
  }
  return {
    violation: true,
    ambientDiagnostics: null,
    validatorDiagnostics: null,
  };
}

function getSuppressedDiagnosticCodes(mainTspPath: string): string[] {
  const content = fs.readFileSync(mainTspPath, "utf-8");
  const matches = content.matchAll(/#suppress\s+"([^"]+)"/g);
  return [...new Set(Array.from(matches, (match) => match[1]))].sort();
}

// --- ANSI helpers ---

const ANSI = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

// --- Spectral Linter ---

function createSpectralLinter(targetRuleName: string) {
  const rulesets = _.cloneDeep(Object.values(spectralRulesets));

  for (const ruleset of rulesets) {
    for (const ruleName of Object.keys((ruleset as any).rules)) {
      if (ruleName !== targetRuleName) {
        delete (ruleset as any).rules[ruleName];
      }
    }
    deleteRulesPropertiesInPayloadNotValidForSpectralRules(ruleset);
  }

  const linter = new Spectral();
  linter.setRuleset({ extends: rulesets as any, rules: {} });

  // Force severity to error so it always fires
  if (linter.ruleset?.rules[targetRuleName]) {
    linter.ruleset.rules[targetRuleName].severity = 0;
  }

  return linter;
}

// --- TypeSpec Compilation (forked to child process to avoid OOM) ---

const COMPILE_WORKER = path.join(import.meta.dirname, "compile-worker.ts");

async function compileTypeSpec(
  mainTspPath: string,
  outputDir: string,
  ruleConfig: RuleConfig,
): Promise<{
  diagnostics: DiagnosticInfo[];
  success: boolean;
  ruleset: RuleRuleset;
  rulesetSource: TspRulesetSource;
}> {
  const { ruleset, source } = resolveTspRuleset(ruleConfig, mainTspPath);
  const enableLocalLinter = getVerifiedDiagnosticCodes(ruleConfig).some((code) =>
    code.startsWith("tsp-lintdiff-local-linter/"),
  );

  const args = [
    "--import", "tsx/esm",
    COMPILE_WORKER,
    mainTspPath,
    outputDir,
    ruleset,
    enableLocalLinter ? "true" : "false",
  ];

  return new Promise((resolve) => {
    execFile("node", args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      try {
        const result = JSON.parse(stdout);
        resolve({
          diagnostics: result.diagnostics,
          success: !result.hasErrors,
          ruleset,
          rulesetSource: source,
        });
      } catch {
        // Worker crashed or produced no output
        resolve({
          diagnostics: [{
            code: "worker-error",
            severity: "error",
            message: error?.message ?? "TypeSpec compilation worker failed",
          }],
          success: false,
          ruleset,
          rulesetSource: source,
        });
      }
    });
  });
}

// --- Find swagger output ---

function findSwaggerFile(outputDir: string): string | null {
  const autorestDir = path.join(outputDir, "@azure-tools", "typespec-autorest");
  if (!fs.existsSync(autorestDir)) return null;

  function walk(dir: string): string | null {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = walk(full);
        if (found) return found;
      } else if (entry.name === "openapi.json") {
        return full;
      }
    }
    return null;
  }

  return walk(autorestDir);
}

function syncTextSnapshot(
  snapshotPath: string,
  content: string,
  updateSnapshots: boolean,
): TestResult["openApiSnapshotStatus"] {
  if (updateSnapshots) {
    fs.writeFileSync(snapshotPath, content);
    return "updated";
  }
  if (fs.existsSync(snapshotPath)) {
    const existing = fs.readFileSync(snapshotPath, "utf-8");
    return existing === content ? "match" : "mismatch";
  }
  return "missing";
}

function syncJsonSnapshot(
  snapshotPath: string,
  value: unknown,
  updateSnapshots: boolean,
): TestResult["openApiSnapshotStatus"] {
  return syncTextSnapshot(
    snapshotPath,
    JSON.stringify(value, null, 2) + "\n",
    updateSnapshots,
  );
}

function getDirectDiagnostics(result: TestResult): DiagnosticInfo[] {
  return result.tspDiagnostics.filter((d) =>
    result.testCase.ruleConfig.tspLints.includes(d.code),
  );
}

function getTemplateDiagnostics(result: TestResult): DiagnosticInfo[] {
  return result.tspDiagnostics.filter((d) =>
    result.testCase.ruleConfig.tspTemplateLints.includes(d.code),
  );
}

function getUnmappedDiagnostics(result: TestResult): DiagnosticInfo[] {
  const verifiedCodes = getVerifiedDiagnosticCodes(result.testCase.ruleConfig);
  return result.tspDiagnostics.filter((d) => !verifiedCodes.includes(d.code));
}

function countDiagnosticCodes(diagnostics: { code: string }[]): DiagnosticCodeCount[] {
  const counts = new Map<string, number>();
  for (const diagnostic of diagnostics) {
    counts.set(diagnostic.code, (counts.get(diagnostic.code) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, count]) => ({ code, count }));
}

function sameDiagnosticCodeCounts(
  left: DiagnosticCodeCount[],
  right: DiagnosticCodeCount[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((entry, index) =>
    entry.code === right[index].code && entry.count === right[index].count
  );
}

type ComplianceAmbientStatus =
  | "not-applicable"
  | "clean"
  | "reviewed-match"
  | "reviewed-mismatch"
  | "unreviewed";

type ComplianceValidatorStatus =
  | "not-applicable"
  | "reviewed-match"
  | "reviewed-mismatch"
  | "unreviewed";

function getComplianceAmbientStatus(result: TestResult): ComplianceAmbientStatus {
  if (
    result.testCase.expectViolation ||
    result.swaggerViolatesRule ||
    result.tspHasRelatedWarning
  ) {
    return "not-applicable";
  }

  const observedAmbientDiagnostics = countDiagnosticCodes(getUnmappedDiagnostics(result));
  if (observedAmbientDiagnostics.length === 0) {
    return "clean";
  }

  const reviewedAmbientDiagnostics = result.testCase.reviewedAmbientDiagnostics;
  if (reviewedAmbientDiagnostics === null) {
    return "unreviewed";
  }

  return sameDiagnosticCodeCounts(
      observedAmbientDiagnostics,
      reviewedAmbientDiagnostics,
    )
    ? "reviewed-match"
    : "reviewed-mismatch";
}

function getComplianceValidatorStatus(result: TestResult): ComplianceValidatorStatus {
  if (result.testCase.expectViolation || !result.swaggerViolatesRule) {
    return "not-applicable";
  }

  const reviewedValidatorDiagnostics = result.testCase.reviewedValidatorDiagnostics;
  if (reviewedValidatorDiagnostics === null) {
    return "unreviewed";
  }

  const observedValidatorDiagnostics = countDiagnosticCodes(result.validatorViolations);
  return sameDiagnosticCodeCounts(
      observedValidatorDiagnostics,
      reviewedValidatorDiagnostics,
    )
    ? "reviewed-match"
    : "reviewed-mismatch";
}

function classifyResult(result: TestResult): ResultCategoryId {
  if (!result.tspCompiled && !result.swaggerGenerated) {
    return "compile-failure";
  }

  if (result.testCase.expectViolation) {
    if (!result.swaggerViolatesRule) {
      return "no-swagger-violation";
    }

    if (result.tspHasRelatedWarning) {
      if (result.testCase.ruleConfig.coverageKind === "partial") {
        return "partial-coverage";
      }
      if (result.tspHasDirectWarning && result.tspHasTemplateWarning) {
        return "covered-direct-and-template";
      }
      if (result.tspHasDirectWarning) {
        return "covered-direct";
      }
      return "settled-template-enforced";
    }

    if (
      result.testCase.ruleConfig.coverageKind === "blocked" &&
      result.testCase.suppressedDiagnosticCodes.length > 0
    ) {
      return "settled-prerequisite-blocked";
    }

    if (result.tspDiagnostics.length === 0) {
      return result.testCase.suppressedDiagnosticCodes.length > 0
        ? "gap-suppressed-diagnostics"
        : "gap-no-diagnostics";
    }

    return "gap-unmapped-diagnostics";
  }

  if (result.swaggerViolatesRule) {
    return getComplianceValidatorStatus(result) === "reviewed-match"
      ? "compliant-reviewed-validator-discrepancy"
      : "unexpected-violation";
  }
  if (result.tspHasRelatedWarning) {
    return "compliant-mapped-diagnostics";
  }
  switch (getComplianceAmbientStatus(result)) {
    case "clean":
      return "compliant-clean";
    case "reviewed-match":
      return "compliant-reviewed-ambient-diagnostics";
    case "reviewed-mismatch":
      return "compliant-unexpected-ambient-diagnostics";
    case "unreviewed":
      return "compliant-unreviewed-ambient-diagnostics";
    case "not-applicable":
      break;
  }

  return "compliant-clean";
}

function uniqueCodes(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function formatMarkdownCodeList(values: string[]): string {
  return values.length === 0 ? "—" : values.map((v) => `\`${v}\``).join("<br>");
}

function formatDiagnosticCodeCounts(values: DiagnosticCodeCount[]): string {
  if (values.length === 0) {
    return "none";
  }

  return values.map(({ code, count }) => count === 1 ? code : `${code} × ${count}`).join(", ");
}

function formatComplianceProof(result: TestResult): string {
  switch (classifyResult(result)) {
    case "compliant-clean":
      return "provably-clean";
    case "compliant-reviewed-ambient-diagnostics":
      return "reviewed-ambient";
    case "compliant-unreviewed-ambient-diagnostics":
      return "unreviewed-ambient";
    case "compliant-unexpected-ambient-diagnostics":
      return "ambient-mismatch";
    case "compliant-mapped-diagnostics":
      return "mapped-diagnostics";
    case "compliant-reviewed-validator-discrepancy":
      return "reviewed-validator-discrepancy";
    case "unexpected-violation":
      return "validator-violation";
    default:
      return "—";
  }
}

function formatSnapshotSummary(result: TestResult): string {
  const parts: string[] = [];
  if (result.openApiSnapshotStatus !== "match" && result.openApiSnapshotStatus !== "skipped") {
    parts.push(`openapi:${result.openApiSnapshotStatus}`);
  }
  if (
    result.tspDiagnosticsSnapshotStatus !== "match" &&
    result.tspDiagnosticsSnapshotStatus !== "skipped"
  ) {
    parts.push(`tsp:${result.tspDiagnosticsSnapshotStatus}`);
  }
  if (
    result.validatorDiagnosticsSnapshotStatus !== "match" &&
    result.validatorDiagnosticsSnapshotStatus !== "skipped"
  ) {
    parts.push(`validator:${result.validatorDiagnosticsSnapshotStatus}`);
  }
  return parts.length === 0 ? "ok" : parts.join(", ");
}

function buildMarkdownReport(
  results: TestResult[],
  options: {
    updateSnapshots: boolean;
    ruleFilter?: string;
    reportPath: string;
  },
): string {
  const lines: string[] = [];
  const generatedAt = new Date().toISOString();
  const violationTests = results.filter((r) => r.testCase.expectViolation);
  const complianceTests = results.filter((r) => !r.testCase.expectViolation);
  const categoryCounts = new Map<ResultCategoryId, number>();
  for (const category of RESULT_CATEGORIES) {
    categoryCounts.set(
      category.id,
      results.filter((r) => classifyResult(r) === category.id).length,
    );
  }

  const snapshotStatuses = results.flatMap((r) => [
    r.openApiSnapshotStatus,
    r.tspDiagnosticsSnapshotStatus,
    r.validatorDiagnosticsSnapshotStatus,
  ]);
  const snapshotMismatches = snapshotStatuses.filter((s) => s === "mismatch").length;
  const snapshotMissing = snapshotStatuses.filter((s) => s === "missing").length;
  const snapshotUpdated = snapshotStatuses.filter((s) => s === "updated").length;

  lines.push("# TypeSpec vs Azure OpenAPI Validator Validation Report");
  lines.push("");
  lines.push(`Generated: \`${generatedAt}\``);
  lines.push("");
  lines.push(`Report path: \`${options.reportPath}\``);
  lines.push("");
  if (options.ruleFilter) {
    lines.push(`Filtered rule: \`${options.ruleFilter}\``);
    lines.push("");
  }
  lines.push(`Snapshot mode: \`${options.updateSnapshots ? "update" : "check"}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("| --- | ---: |");
  lines.push(`| Total test cases | ${results.length} |`);
  lines.push(`| Violation tests | ${violationTests.length} |`);
  lines.push(`| Compliance tests | ${complianceTests.length} |`);
  lines.push(`| Snapshot mismatches | ${snapshotMismatches} |`);
  lines.push(`| Snapshot missing | ${snapshotMissing} |`);
  lines.push(`| Snapshots updated | ${snapshotUpdated} |`);
  lines.push("");
  lines.push("## Result type guide");
  lines.push("");
  lines.push("| Result type | Count | Confidence | Meaning |");
  lines.push("| --- | ---: | --- | --- |");
  for (const category of RESULT_CATEGORIES) {
    const count = categoryCounts.get(category.id) ?? 0;
    if (count === 0) continue;
    lines.push(`| ${category.label} | ${count} | ${category.confidence} | ${category.meaning} |`);
  }

  for (const category of RESULT_CATEGORIES) {
    const items = results
      .filter((r) => classifyResult(r) === category.id)
      .sort((a, b) =>
        `${a.testCase.ruleDir}/${a.testCase.testCaseId}`.localeCompare(
          `${b.testCase.ruleDir}/${b.testCase.testCaseId}`,
        )
      );
    if (items.length === 0) continue;

    lines.push("");
    lines.push(`## ${category.label} (${items.length})`);
    lines.push("");
    lines.push(category.meaning);
    lines.push("");
    lines.push("| Test | Mapping | TSP status | Ruleset | Trust | Validator codes | Direct TSP codes | Template TSP codes | Unmapped TSP codes | Suppressed TSP codes | Compliance proof | Snapshots |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");

    for (const result of items) {
      const id = `\`${result.testCase.ruleDir}/${result.testCase.testCaseId}\``;
      const validatorCodes = formatMarkdownCodeList(
        uniqueCodes(result.validatorViolations.map((v) => v.code)),
      );
      const directCodes = formatMarkdownCodeList(
        uniqueCodes(getDirectDiagnostics(result).map((d) => d.code)),
      );
      const templateCodes = formatMarkdownCodeList(
        uniqueCodes(getTemplateDiagnostics(result).map((d) => d.code)),
      );
      const unmappedCodes = formatMarkdownCodeList(
        uniqueCodes(getUnmappedDiagnostics(result).map((d) => d.code)),
      );
      const suppressedCodes = formatMarkdownCodeList(
        result.testCase.suppressedDiagnosticCodes,
      );

      lines.push(
        `| ${id} | \`${result.mappingStatus}\` | \`${result.tspDiagnosticStatus}\` | \`${result.tspRuleset}\` (${result.tspRulesetSource}) | \`${result.trustStatus}\` | ${validatorCodes} | ${directCodes} | ${templateCodes} | ${unmappedCodes} | ${suppressedCodes} | \`${formatComplianceProof(result)}\` | ${formatSnapshotSummary(result)} |`,
      );
    }
  }

  lines.push("");
  lines.push("## Confidence framing");
  lines.push("");
  lines.push("- **Settled prerequisite-blocked**: a violation test in `Settled prerequisite-blocked coverage`.");
  lines.push("- **Confirmed deficiency**: a violation test in `Confirmed gap without TypeSpec diagnostics`.");
  lines.push("- **Possible deficiency**: a violation test in `Possible gap with unmapped TypeSpec diagnostics` or `Gap masked by suppressed TypeSpec diagnostics`.");
  lines.push("- **Provably compliant**: a compliance test in `Provably clean compliance case` or `Provably compliant with reviewed ambient diagnostics`.");
  lines.push("- **Compliance cleanup needed**: a compliance test in `Compliance case with unreviewed ambient diagnostics`, `Compliance case with unexpected ambient diagnostics`, or `Compliance case with mapped TypeSpec diagnostics`.");
  lines.push("- **Settled validator discrepancy**: a compliance test in `Compliance case with reviewed validator discrepancy`.");
  lines.push("- **Possible overbroad mapping**: a compliance test in `Compliance case with mapped TypeSpec diagnostics`.");
  lines.push("- **Template-mediated coverage**: a violation test in `Settled template-enforced coverage`.");
  lines.push("- **Test quality issue**: anything in `Expected violation but validator stayed silent` or `Unexpected validator violation in compliance case`.");
  lines.push("");

  return lines.join("\n") + "\n";
}

// --- Run Spectral Validation ---

async function validateSwaggerSpectral(
  swaggerPath: string,
  ruleName: string,
): Promise<ValidatorViolation[]> {
  const linter = createSpectralLinter(ruleName);
  // Read swagger and pass as string with documentUri so Spectral can resolve
  // relative $refs (e.g., to common-types files).
  const content = fs.readFileSync(swaggerPath, "utf-8");
  const documentUri = path.join(REPO_ROOT, "openapi.json");
  const results = await linter.run(content, { resolve: { documentUri } });

  return results
    .filter((r: any) => String(r.code) !== "invalid-ref")
    .map((r: any) => ({
      code: String(r.code),
      message: r.message,
      path: r.path.map(String),
      severity: r.severity,
    }));
}

// --- Run Native Validation ---

async function validateSwaggerNative(
  swaggerPath: string,
  ruleName: string,
): Promise<ValidatorViolation[]> {
  // Determine which native ruleset contains this rule
  const armRules = nativeRulesets.azArm?.rules ?? {};
  const commonRules = nativeRulesets.azCommon?.rules ?? {};

  let sourceRuleset: any;
  let sourceRule: any;
  if (ruleName in armRules) {
    sourceRuleset = nativeRulesets.azArm;
    sourceRule = armRules[ruleName];
  } else if (ruleName in commonRules) {
    sourceRuleset = nativeRulesets.azCommon;
    sourceRule = commonRules[ruleName];
  } else {
    return [];
  }

  // Clone and filter to just the target rule
  const ruleset = _.cloneDeep(sourceRuleset);
  for (const key of Object.keys(ruleset.rules)) {
    if (key !== ruleName) {
      delete ruleset.rules[key];
    }
  }

  const absPath = path.resolve(swaggerPath);
  const swaggerContent = fs.readFileSync(absPath, "utf-8");

  const customFS = {
    read: async (uri: string) => {
      const normalized = uri.replace(/^file:\/\//, "");
      if (normalized === absPath || normalized.endsWith(path.basename(absPath))) {
        return swaggerContent;
      }
      // Serve common-types from our bundled files
      if (normalized.includes("common-types")) {
        const match = normalized.match(/common-types\/(.*)/);
        if (match) {
          const localPath = path.join(COMMON_TYPES_DIR, match[1]);
          if (fs.existsSync(localPath)) {
            return fs.readFileSync(localPath, "utf-8");
          }
        }
      }
      // Fallback: empty swagger
      return JSON.stringify({ swagger: "2.0", definitions: {}, paths: {} });
    },
  };

  const results = await lint([absPath], {
    ruleSet: ruleset,
    openapiType: sourceRule?.openapiType ?? OpenApiTypes.arm,
    fileSystem: customFS,
  });

  return results.map((r: any) => ({
    code: r.code ?? r.id ?? ruleName,
    message: r.message,
    path: Array.isArray(r.jsonpath) ? r.jsonpath.map(String) : [],
    severity: r.type === "error" ? 0 : 1,
  }));
}

// --- Dispatch validation ---

async function validateSwagger(
  swaggerPath: string,
  ruleName: string,
  engine: "spectral" | "native",
): Promise<ValidatorViolation[]> {
  if (engine === "native") {
    return validateSwaggerNative(swaggerPath, ruleName);
  }
  return validateSwaggerSpectral(swaggerPath, ruleName);
}

// --- Discover Test Cases ---

function discoverTestCases(
  ruleFilter?: string,
  severityFilter?: RuleSeverity,
  applicabilityFilter?: RuleApplicabilityFilter,
): TestCase[] {
  const cases: TestCase[] = [];

  const ruleDirs = fs.readdirSync(TESTS_DIR, { withFileTypes: true });
  for (const ruleDir of ruleDirs) {
    if (!ruleDir.isDirectory()) continue;
    if (ruleDir.name === "lib") continue;
    if (ruleFilter && ruleDir.name !== ruleFilter) continue;

    const ruleTestsPath = path.join(TESTS_DIR, ruleDir.name);
    const ruleConfig = loadRuleConfig(TESTS_DIR, ruleDir.name);
    if (severityFilter && ruleConfig.severity !== severityFilter) continue;
    if (applicabilityFilter && !matchesApplicabilityFilter(ruleConfig.applicability, applicabilityFilter)) {
      continue;
    }
    const testCaseDirs = fs.readdirSync(ruleTestsPath, { withFileTypes: true });

    for (const testCaseDir of testCaseDirs) {
      if (!testCaseDir.isDirectory()) continue;

      const testCasePath = path.join(ruleTestsPath, testCaseDir.name);
      const mainTsp = path.join(testCasePath, "main.tsp");
      if (!fs.existsSync(mainTsp)) continue;
      const expectation = loadExpectation(testCasePath);

      cases.push({
        ruleDir: ruleDir.name,
        ruleConfig,
        testCaseId: testCaseDir.name,
        mainTspPath: mainTsp,
        expectViolation: expectation.violation,
        reviewedAmbientDiagnostics: expectation.ambientDiagnostics,
        reviewedValidatorDiagnostics: expectation.validatorDiagnostics,
        suppressedDiagnosticCodes: getSuppressedDiagnosticCodes(mainTsp),
      });
    }
  }

  return cases;
}

function enforceMetadataIntegrityForFilteredRuns(
  severityFilter?: RuleSeverity,
  applicabilityFilter?: RuleApplicabilityFilter,
): void {
  if (!severityFilter && !applicabilityFilter) {
    return;
  }

  const audit = auditRuleMetadata(TESTS_DIR);
  const blockingIssues = audit.issues.filter((issue) =>
    [
      "missing-rule-md",
      "missing-explicit-severity",
      "missing-explicit-applicability",
      "mismatched-severity",
      "mismatched-applicability",
      "no-case-dirs",
    ].includes(issue.kind),
  );

  if (blockingIssues.length === 0) {
    return;
  }

  console.error(
    ANSI.red(
      `Filtered validation is blocked by ${blockingIssues.length} rule metadata issue(s).`,
    ),
  );
  console.error(
    ANSI.dim(
      `Run 'npm run audit:metadata' and 'npm run metadata:sync' to reconcile tests/<Rule>/rule.md with the canonical validator-source metadata.`,
    ),
  );

  const preview = blockingIssues.slice(0, 20);
  for (const issue of preview) {
    console.error(`- ${issue.ruleId}: ${issue.kind}`);
  }
  if (blockingIssues.length > preview.length) {
    console.error(`- ... ${blockingIssues.length - preview.length} more`);
  }

  process.exit(1);
}

// --- Run a Single Test ---

async function runTestCase(
  testCase: TestCase,
  updateSnapshots: boolean,
): Promise<TestResult> {
  const outputDir = path.join(
    REPO_ROOT,
    ".test-output",
    testCase.ruleDir,
    testCase.testCaseId,
  );
  fs.mkdirSync(outputDir, { recursive: true });

  // 1. Compile TypeSpec (with linter + emitter)
  const { diagnostics, success, ruleset, rulesetSource } = await compileTypeSpec(
    testCase.mainTspPath,
    outputDir,
    testCase.ruleConfig,
  );

  // 2. Find emitted swagger
  const swaggerPath = findSwaggerFile(outputDir);

  // 3. Snapshot handling
  const snapshotPath = path.join(
    path.dirname(testCase.mainTspPath),
    "output.json",
  );
  const tspDiagnosticsSnapshotPath = path.join(
    path.dirname(testCase.mainTspPath),
    "tsp-diagnostics.json",
  );
  const validatorDiagnosticsSnapshotPath = path.join(
    path.dirname(testCase.mainTspPath),
    "validator-diagnostics.json",
  );
  let openApiSnapshotStatus: TestResult["openApiSnapshotStatus"] = "skipped";
  let tspDiagnosticsSnapshotStatus: TestResult["tspDiagnosticsSnapshotStatus"] = "skipped";
  let validatorDiagnosticsSnapshotStatus: TestResult["validatorDiagnosticsSnapshotStatus"] = "skipped";

  tspDiagnosticsSnapshotStatus = syncJsonSnapshot(
    tspDiagnosticsSnapshotPath,
    diagnostics,
    updateSnapshots,
  );

  // 4. Run azure-openapi-validator on the swagger
  let violations: ValidatorViolation[] = [];
  let validatorRan = false;
  if (swaggerPath) {
    const generated = fs.readFileSync(swaggerPath, "utf-8");
    openApiSnapshotStatus = syncTextSnapshot(
      snapshotPath,
      generated,
      updateSnapshots,
    );
    violations = await validateSwagger(
      swaggerPath,
      testCase.ruleConfig.validatorRuleId,
      testCase.ruleConfig.engine,
    );
    validatorRan = true;
    validatorDiagnosticsSnapshotStatus = syncJsonSnapshot(
      validatorDiagnosticsSnapshotPath,
      violations,
      updateSnapshots,
    );
  }

  // 5. Check for matching TSP linter diagnostic
  const expectedCodes = getVerifiedDiagnosticCodes(testCase.ruleConfig);
  const directCodes = getDirectDiagnosticCodes(testCase.ruleConfig);
  const templateCodes = getTemplateDiagnosticCodes(testCase.ruleConfig);
  const testIntent: TestIntent = testCase.expectViolation ? "violation" : "compliance";
  const validatorResult: ValidatorResult = violations.length > 0
    ? "violation"
    : "no-violation";
  const mappingStatus = getMappingStatus(testCase.ruleConfig);
  const tspDiagnosticStatus = getTspDiagnosticStatus(
    testCase.ruleConfig,
    diagnostics,
  );
  const trustStatus: TrustStatus = rulesetSource === "explicit"
    ? "explicit-ruleset"
    : rulesetSource === "project-default"
    ? "project-default-ruleset"
    : "inferred-ruleset";
  const tspHasRelatedWarning = diagnostics.some((d) =>
    expectedCodes.includes(d.code),
  );
  const tspHasDirectWarning = diagnostics.some((d) =>
    directCodes.includes(d.code),
  );
  const tspHasTemplateWarning = diagnostics.some((d) =>
    templateCodes.includes(d.code),
  );

  return {
    testCase,
    testIntent,
    validatorResult,
    mappingStatus,
    tspDiagnosticStatus,
    tspRuleset: ruleset,
    tspRulesetSource: rulesetSource,
    trustStatus,
    tspCompiled: success,
    tspDiagnostics: diagnostics,
    swaggerGenerated: swaggerPath !== null,
    swaggerPath,
    validatorViolations: violations,
    validatorRan,
    swaggerViolatesRule: violations.length > 0,
    tspHasRelatedWarning,
    tspHasDirectWarning,
    tspHasTemplateWarning,
    openApiSnapshotStatus,
    tspDiagnosticsSnapshotStatus,
    validatorDiagnosticsSnapshotStatus,
  };
}

// --- Reporting ---

function reportResult(result: TestResult): void {
  const id = `${result.testCase.ruleDir}/${result.testCase.testCaseId}`;
  const expects = result.testCase.expectViolation;
  const category = classifyResult(result);
  const verifiedCodes = getVerifiedDiagnosticCodes(result.testCase.ruleConfig);
  const directCodes = getDirectDiagnosticCodes(result.testCase.ruleConfig);
  const unmappedDiags = getUnmappedDiagnostics(result);
  const observedAmbientDiagnostics = countDiagnosticCodes(unmappedDiags);
  const complianceAmbientStatus = getComplianceAmbientStatus(result);
  const observedValidatorDiagnostics = countDiagnosticCodes(result.validatorViolations);
  const complianceValidatorStatus = getComplianceValidatorStatus(result);
  const suppressedCodes = result.testCase.suppressedDiagnosticCodes;

  let status: string;
  if (expects) {
    // Violation test case
    if (result.swaggerViolatesRule && result.tspHasRelatedWarning) {
      status = result.testCase.ruleConfig.coverageKind === "partial"
        ? ANSI.magenta("~ PARTIAL")
        : category === "settled-template-enforced"
          ? ANSI.cyan("≈ TEMPLATE")
          : ANSI.green("✓ COVERED");
    } else if (category === "settled-prerequisite-blocked") {
      status = ANSI.cyan("≈ BLOCKED");
    } else if (category === "gap-suppressed-diagnostics") {
      status = ANSI.yellow("? BLOCKED GAP");
    } else if (result.swaggerViolatesRule && !result.tspHasRelatedWarning) {
      status = ANSI.red("✗ GAP");
    } else if (!result.swaggerViolatesRule) {
      status = ANSI.yellow("? NO SWAGGER VIOLATION");
    } else {
      status = ANSI.yellow("? UNKNOWN");
    }
  } else {
    // Compliance test case — expects NO violation
    if (!result.swaggerViolatesRule) {
      status = ANSI.green("✓ COMPLIANT");
    } else if (category === "compliant-reviewed-validator-discrepancy") {
      status = ANSI.cyan("≈ VALIDATOR DISCREPANCY");
    } else {
      status = ANSI.red("✗ UNEXPECTED VIOLATION");
    }
  }

  console.log(`  ${status}  ${ANSI.bold(id)}`);
  console.log(
    `    ${ANSI.dim(`Coverage kind: ${result.testCase.ruleConfig.coverageKind}`)}`,
  );
  console.log(
    `    ${ANSI.dim(`Intent: ${result.testIntent} | Validator: ${result.validatorResult} | Mapping: ${result.mappingStatus} | TSP: ${result.tspDiagnosticStatus} | Trust: ${result.trustStatus}`)}`,
  );
  console.log(
    `    ${ANSI.dim(`TSP ruleset: ${result.tspRuleset} (${result.tspRulesetSource})`)}`,
  );
  if (suppressedCodes.length > 0) {
    console.log(
      `    ${ANSI.dim(`Suppressed TSP diagnostics in fixture: ${suppressedCodes.join(", ")}`)}`,
    );
  }

  if (!result.tspCompiled && !result.swaggerGenerated) {
    console.log(
      `    ${ANSI.red("TypeSpec compilation failed (no swagger emitted)")}`,
    );
    for (const d of result.tspDiagnostics.filter(
      (d) => d.severity === "error",
    )) {
      console.log(`      ${ANSI.red(`[${d.code}]`)} ${d.message}`);
    }
    return;
  }

  // Snapshot status
  switch (result.openApiSnapshotStatus) {
    case "updated":
      console.log(`    ${ANSI.cyan("Snapshot:")} updated output.json`);
      break;
    case "mismatch":
      console.log(
        `    ${ANSI.red("Snapshot:")} output.json differs from generated OpenAPI. Run with --update-snapshots to update.`,
      );
      break;
    case "missing":
      console.log(
        `    ${ANSI.yellow("Snapshot:")} output.json not found. Run with --update-snapshots to create.`,
      );
      break;
  }
  switch (result.tspDiagnosticsSnapshotStatus) {
    case "updated":
      console.log(`    ${ANSI.cyan("Snapshot:")} updated tsp-diagnostics.json`);
      break;
    case "mismatch":
      console.log(
        `    ${ANSI.red("Snapshot:")} tsp-diagnostics.json differs from emitted TypeSpec diagnostics. Run with --update-snapshots to update.`,
      );
      break;
    case "missing":
      console.log(
        `    ${ANSI.yellow("Snapshot:")} tsp-diagnostics.json not found. Run with --update-snapshots to create.`,
      );
      break;
  }
  switch (result.validatorDiagnosticsSnapshotStatus) {
    case "updated":
      console.log(`    ${ANSI.cyan("Snapshot:")} updated validator-diagnostics.json`);
      break;
    case "mismatch":
      console.log(
        `    ${ANSI.red("Snapshot:")} validator-diagnostics.json differs from emitted validator diagnostics. Run with --update-snapshots to update.`,
      );
      break;
    case "missing":
      console.log(
        `    ${ANSI.yellow("Snapshot:")} validator-diagnostics.json not found. Run with --update-snapshots to create.`,
      );
      break;
  }

  // Swagger violations
  if (result.swaggerViolatesRule) {
    console.log(
      `    ${ANSI.cyan("Swagger violations:")} ${result.validatorViolations.length}`,
    );
    for (const v of result.validatorViolations) {
      console.log(`      ${ANSI.dim(v.code)}: ${v.message.substring(0, 120)}`);
    }
  } else {
    console.log(
      `    ${ANSI.yellow("No swagger violations found for rule " + result.testCase.ruleConfig.validatorRuleId)}`,
    );
  }

  // TSP diagnostics
  const directDiags = getDirectDiagnostics(result);
  const templateDiags = getTemplateDiagnostics(result);

  if (directDiags.length > 0 || templateDiags.length > 0) {
    console.log(`    ${ANSI.green("TypeSpec lint diagnostics:")}`);
    for (const d of directDiags) {
      console.log(`      ${ANSI.green(`[${d.code}]`)} ${d.message}`);
    }
    for (const d of templateDiags) {
      console.log(
        `      ${ANSI.cyan(`[${d.code}]`)} ${d.message} ${ANSI.dim("(template-related)")}`,
      );
    }
    if (
      expects &&
      result.swaggerViolatesRule &&
      result.tspHasTemplateWarning &&
      !result.tspHasDirectWarning
    ) {
      console.log(
        `    ${ANSI.yellow("Ignoring template-related lints, this case is still a GAP.")}`,
      );
    } else if (
      expects &&
      result.swaggerViolatesRule &&
      result.tspHasDirectWarning
    ) {
      console.log(
        `    ${ANSI.dim("Still covered when template-related lints are ignored.")}`,
      );
    }
  } else if (verifiedCodes.length > 0) {
    console.log(
      `    ${ANSI.red("No TypeSpec lint diagnostic found")} ${ANSI.dim(`(expected: ${verifiedCodes.join(", ")})`)}`,
    );
    if (result.testCase.ruleConfig.officialTspLints.length > 0) {
      console.log(
        `    ${ANSI.yellow("Official docs suggest:")} ${ANSI.dim(result.testCase.ruleConfig.officialTspLints.join(", "))}`,
      );
    }
  } else {
    if (result.testCase.ruleConfig.coverageKind === "template") {
      console.log(
        `    ${ANSI.yellow("Rule is intentionally treated as template-enforced")}`,
      );
      if (expects && directCodes.length === 0) {
        console.log(
          `    ${ANSI.yellow("Standard templates are the main control here; this is not counted as an unresolved native-lint gap.")}`,
        );
      }
    } else if (result.testCase.ruleConfig.coverageKind === "blocked") {
      console.log(
        `    ${ANSI.yellow("Rule is intentionally treated as prerequisite-blocked")}`,
      );
      console.log(
        `    ${ANSI.yellow("The remaining violating shape depends on suppressed prerequisite diagnostics rather than on a clean authorable native-lint target.")}`,
      );
    } else if (result.mappingStatus === "official-only") {
      console.log(
        `    ${ANSI.yellow("No verified TypeSpec diagnostic mapping configured")} ${ANSI.dim(`(official docs suggest: ${result.testCase.ruleConfig.officialTspLints.join(", ")})`)}`,
      );
    } else {
      console.log(
        `    ${ANSI.yellow("No TypeSpec diagnostic mapping configured for this rule")}`,
      );
    }
  }

  if (
    expects &&
    result.swaggerViolatesRule &&
    !result.tspHasRelatedWarning &&
    unmappedDiags.length > 0
  ) {
    console.log(`    ${ANSI.yellow("Observed TypeSpec diagnostics not mapped to this rule:")}`);
    for (const d of unmappedDiags) {
      console.log(`      ${ANSI.yellow(`[${d.code}]`)} ${d.message}`);
    }
  } else if (
    expects &&
    result.swaggerViolatesRule &&
    !result.tspHasRelatedWarning &&
    result.tspDiagnostics.length === 0
  ) {
    if (suppressedCodes.length > 0) {
      if (result.testCase.ruleConfig.coverageKind === "blocked") {
        console.log(
          `    ${ANSI.yellow("TypeSpec emitted no diagnostics, and the required suppressions are part of this rule's settled prerequisite-blocked classification.")}`,
        );
      } else {
        console.log(
          `    ${ANSI.yellow("TypeSpec emitted no diagnostics, but the fixture suppresses unrelated TypeSpec lints.")}`,
        );
        console.log(
          `    ${ANSI.yellow("Treat this as a blocked or ambiguous migration case until the prerequisite diagnostics are accounted for.")}`,
        );
      }
    } else {
      console.log(`    ${ANSI.yellow("TypeSpec emitted no diagnostics.")}`);
    }
  }

  if (!expects) {
    switch (complianceValidatorStatus) {
      case "reviewed-match":
        console.log(
          `    ${ANSI.cyan("Reviewed validator discrepancy:")} matched ${formatDiagnosticCodeCounts(observedValidatorDiagnostics)}.`,
        );
        break;
      case "reviewed-mismatch":
        console.log(
          `    ${ANSI.red("Validator discrepancy mismatch:")} expected ${formatDiagnosticCodeCounts(result.testCase.reviewedValidatorDiagnostics ?? [])}, observed ${formatDiagnosticCodeCounts(observedValidatorDiagnostics)}.`,
        );
        break;
      case "unreviewed":
        if (result.swaggerViolatesRule) {
          console.log(
            `    ${ANSI.yellow("Validator discrepancy pending:")} review validator diagnostics (${formatDiagnosticCodeCounts(observedValidatorDiagnostics)}).`,
          );
        }
        break;
      case "not-applicable":
        break;
    }

    switch (complianceAmbientStatus) {
      case "clean":
        console.log(
          `    ${ANSI.green("Compliance proof:")} no TypeSpec ambient diagnostics observed.`,
        );
        break;
      case "reviewed-match":
        console.log(
          `    ${ANSI.green("Compliance proof:")} reviewed ambient diagnostics matched (${formatDiagnosticCodeCounts(observedAmbientDiagnostics)}).`,
        );
        break;
      case "reviewed-mismatch":
        console.log(
          `    ${ANSI.red("Compliance proof mismatch:")} expected ${formatDiagnosticCodeCounts(result.testCase.reviewedAmbientDiagnostics ?? [])}, observed ${formatDiagnosticCodeCounts(observedAmbientDiagnostics)}.`,
        );
        break;
      case "unreviewed":
        if (observedAmbientDiagnostics.length > 0) {
          console.log(
            `    ${ANSI.yellow("Compliance proof pending:")} review ambient diagnostics (${formatDiagnosticCodeCounts(observedAmbientDiagnostics)}).`,
          );
        }
        break;
      case "not-applicable":
        if (!result.swaggerViolatesRule && result.tspHasRelatedWarning) {
          console.log(
            `    ${ANSI.yellow("Compliance review:")} mapped TypeSpec diagnostics fired in a validator-clean case; check for overbroad mapping.`,
          );
        }
        break;
    }
  }
}

function reportSummary(results: TestResult[], updateSnapshots: boolean): void {
  const total = results.length;

  // Violation test cases
  const violationTests = results.filter((r) => r.testCase.expectViolation);
  const partial = violationTests.filter(
    (r) => classifyResult(r) === "partial-coverage",
  ).length;
  const covered = violationTests.filter(
    (r) =>
      classifyResult(r) === "covered-direct" ||
      classifyResult(r) === "covered-direct-and-template",
  ).length;
  const settledBlocked = violationTests.filter(
    (r) => classifyResult(r) === "settled-prerequisite-blocked",
  ).length;
  const settledTemplate = violationTests.filter(
    (r) => classifyResult(r) === "settled-template-enforced",
  ).length;
  const gaps = violationTests.filter(
    (r) =>
      classifyResult(r) === "gap-suppressed-diagnostics" ||
      classifyResult(r) === "gap-no-diagnostics" ||
      classifyResult(r) === "gap-unmapped-diagnostics",
  ).length;
  const gapsWithNoTspDiagnostics = violationTests.filter(
    (r) => classifyResult(r) === "gap-no-diagnostics",
  ).length;
  const gapsWithSuppressedDiagnostics = violationTests.filter(
    (r) => classifyResult(r) === "gap-suppressed-diagnostics",
  ).length;
  const gapsWithUnexpectedTspDiagnostics = violationTests.filter(
    (r) => classifyResult(r) === "gap-unmapped-diagnostics",
  ).length;
  const noViolation = violationTests.filter(
    (r) => classifyResult(r) === "no-swagger-violation",
  ).length;

  // Compliance test cases
  const complianceTests = results.filter((r) => !r.testCase.expectViolation);
  const compliant = complianceTests.filter(
    (r) => !r.swaggerViolatesRule,
  ).length;
  const provablyCleanCompliance = complianceTests.filter(
    (r) => classifyResult(r) === "compliant-clean",
  ).length;
  const reviewedAmbientCompliance = complianceTests.filter(
    (r) => classifyResult(r) === "compliant-reviewed-ambient-diagnostics",
  ).length;
  const unreviewedAmbientCompliance = complianceTests.filter(
    (r) => classifyResult(r) === "compliant-unreviewed-ambient-diagnostics",
  ).length;
  const unexpectedAmbientCompliance = complianceTests.filter(
    (r) => classifyResult(r) === "compliant-unexpected-ambient-diagnostics",
  ).length;
  const mappedComplianceDiagnostics = complianceTests.filter(
    (r) => classifyResult(r) === "compliant-mapped-diagnostics",
  ).length;
  const reviewedValidatorDiscrepancies = complianceTests.filter(
    (r) => classifyResult(r) === "compliant-reviewed-validator-discrepancy",
  ).length;
  const unexpectedViolations = complianceTests.filter(
    (r) => classifyResult(r) === "unexpected-violation",
  ).length;

  const snapshotStatuses = results.flatMap((r) => [
    r.openApiSnapshotStatus,
    r.tspDiagnosticsSnapshotStatus,
    r.validatorDiagnosticsSnapshotStatus,
  ]);
  const snapshotMismatches = snapshotStatuses.filter(
    (s) => s === "mismatch",
  ).length;
  const snapshotMissing = snapshotStatuses.filter(
    (s) => s === "missing",
  ).length;
  const snapshotUpdated = snapshotStatuses.filter(
    (s) => s === "updated",
  ).length;

  console.log("");
  console.log(ANSI.bold("═══ Summary ═══"));
  console.log(`  Total test cases:     ${total}`);
  if (violationTests.length > 0) {
    console.log(ANSI.bold("  Violation tests:"));
    console.log(`    ${ANSI.green("Covered (TSP lint):")}  ${covered}`);
    console.log(`    ${ANSI.magenta("Partial coverage:")} ${partial}`);
    console.log(`    ${ANSI.cyan("Settled prerequisite-blocked:")} ${settledBlocked}`);
    console.log(`    ${ANSI.cyan("Settled template-enforced:")} ${settledTemplate}`);
    console.log(`    ${ANSI.red("Remaining unresolved gaps:")} ${gaps}`);
    if (gaps > 0) {
      console.log(`      ${ANSI.dim(`- no TypeSpec diagnostics: ${gapsWithNoTspDiagnostics}`)}`);
      console.log(`      ${ANSI.dim(`- suppressed TypeSpec diagnostics in fixture: ${gapsWithSuppressedDiagnostics}`)}`);
      console.log(`      ${ANSI.dim(`- unexpected TypeSpec diagnostics: ${gapsWithUnexpectedTspDiagnostics}`)}`);
    }
    if (noViolation > 0) {
      console.log(`    ${ANSI.yellow("No swagger violation:")} ${noViolation}`);
    }
  }
  if (complianceTests.length > 0) {
    console.log(ANSI.bold("  Compliance tests:"));
    console.log(`    ${ANSI.green("Validator-clean total:")} ${compliant}`);
    console.log(`      ${ANSI.dim(`- provably clean: ${provablyCleanCompliance}`)}`);
    console.log(
      `      ${ANSI.dim(`- reviewed ambient diagnostics: ${reviewedAmbientCompliance}`)}`,
    );
    console.log(
      `      ${ANSI.dim(`- unreviewed ambient diagnostics: ${unreviewedAmbientCompliance}`)}`,
    );
    if (unexpectedAmbientCompliance > 0) {
      console.log(
        `      ${ANSI.dim(`- reviewed ambient mismatches: ${unexpectedAmbientCompliance}`)}`,
      );
    }
    if (mappedComplianceDiagnostics > 0) {
      console.log(
        `      ${ANSI.dim(`- mapped diagnostics in validator-clean cases: ${mappedComplianceDiagnostics}`)}`,
      );
    }
    if (reviewedValidatorDiscrepancies > 0) {
      console.log(
        `    ${ANSI.cyan("Reviewed validator discrepancies:")} ${reviewedValidatorDiscrepancies}`,
      );
    }
    if (unexpectedViolations > 0) {
      console.log(
        `    ${ANSI.red("Unexpected violations:")} ${unexpectedViolations}`,
      );
    }
  }
  if (updateSnapshots) {
    console.log(`  ${ANSI.cyan("Snapshots updated:")}    ${snapshotUpdated}`);
  } else {
    if (snapshotMismatches > 0) {
      console.log(
        `  ${ANSI.red("Snapshot mismatches:")}  ${snapshotMismatches}`,
      );
    }
    if (snapshotMissing > 0) {
      console.log(
        `  ${ANSI.yellow("Snapshots missing:")}   ${snapshotMissing}`,
      );
    }
  }
  console.log("");

  if (gaps > 0) {
    console.log(
      ANSI.red(
        "Gaps indicate swagger violations with no mapped TypeSpec lint warning.",
      ),
    );
    if (gapsWithSuppressedDiagnostics > 0) {
      console.log(
        ANSI.yellow(
          "Some of those gaps depend on fixtures that suppress unrelated TypeSpec diagnostics, so they need prerequisite analysis before being treated as new-rule candidates.",
        ),
      );
    }
    if (gapsWithNoTspDiagnostics > 0 || gapsWithUnexpectedTspDiagnostics > 0) {
      console.log(
        ANSI.red(
          "Only clean gaps without prerequisite blocking evidence should be treated as direct candidates for new TypeSpec linter rules.",
        ),
      );
    }
  } else if (covered === total) {
    console.log(
      ANSI.green(
        "All swagger violations are covered by TypeSpec lint diagnostics!",
      ),
    );
  }

  if (!updateSnapshots && (snapshotMismatches > 0 || snapshotMissing > 0)) {
    console.log(
      ANSI.red(
        "Some snapshots are missing or out of date. Run with --update-snapshots to fix.",
      ),
    );
  }
  if (
    unreviewedAmbientCompliance > 0 ||
    unexpectedAmbientCompliance > 0 ||
    mappedComplianceDiagnostics > 0
  ) {
    console.log(
      ANSI.yellow(
        "Some validator-clean compliance cases still need proof cleanup, ambient review, or mapping review.",
      ),
    );
  }
}

// --- Concurrency pool ---

async function runPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
  onProgress?: (completed: number, total: number, result: R) => void,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i]);
      completed++;
      onProgress?.(completed, items.length, results[i]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

// --- Progress display ---

function statusIcon(result: TestResult): string {
  const expects = result.testCase.expectViolation;
  if (expects) {
    if (result.swaggerViolatesRule && result.tspHasRelatedWarning)
      return ANSI.green("✓");
    if (result.swaggerViolatesRule && !result.tspHasRelatedWarning)
      return ANSI.red("✗");
    return ANSI.yellow("?");
  } else {
    if (!result.swaggerViolatesRule) return ANSI.green("✓");
    return ANSI.red("✗");
  }
}

function renderProgress(
  completed: number,
  total: number,
  result: TestResult,
): void {
  const pct = Math.round((completed / total) * 100);
  const barWidth = 30;
  const filled = Math.round((completed / total) * barWidth);
  const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);
  const id = `${result.testCase.ruleDir}/${result.testCase.testCaseId}`;
  const icon = statusIcon(result);

  // Clear line and write progress
  process.stderr.write(
    `\r\x1b[K  ${ANSI.dim(`[${bar}]`)} ${pct}% (${completed}/${total})  ${icon} ${id}`,
  );
}

function parseSeverityFilter(raw: string | undefined): RuleSeverity | undefined {
  switch (raw?.trim().toLowerCase()) {
    case "error":
      return "error";
    case "warn":
    case "warning":
      return "warning";
    default:
      return undefined;
  }
}

function parseApplicabilityFilter(
  raw: string | undefined,
): RuleApplicabilityFilter | undefined {
  switch (raw?.trim().toLowerCase()) {
    case "arm":
    case "arm-only":
    case "resource-manager":
    case "resource manager":
      return "arm";
    case "data-plane":
    case "data-plane-only":
    case "data plane":
    case "dataplane":
      return "data-plane";
    case "sdk":
    case "sdk-only":
      return "sdk";
    default:
      return undefined;
  }
}

function matchesApplicabilityFilter(
  applicability: RuleApplicability,
  filter: RuleApplicabilityFilter,
): boolean {
  switch (filter) {
    case "arm":
      return applicability === "arm" || applicability === "common";
    case "data-plane":
      return applicability === "data-plane" || applicability === "common";
    case "sdk":
      return applicability === "sdk";
  }
}

function formatApplicabilityFilter(filter: RuleApplicabilityFilter): string {
  switch (filter) {
    case "arm":
      return "arm (ARM-only + common)";
    case "data-plane":
      return "data-plane (DataPlane-only + common)";
    case "sdk":
      return "sdk (SDK-only)";
  }
}

function getHelpText(defaultParallelism: number): string {
  return [
    "Usage:",
    "  node --import tsx/esm scripts/validate.ts [RuleName] [options]",
    "",
    "Options:",
    "  --update-snapshots            Rewrite stored snapshots for the selected tests.",
    "  --report-md[=path]           Write the markdown report (default: validate-report.md).",
    `  --parallelism=N              Number of test cases to run concurrently (default: ${defaultParallelism}).`,
    "  --severity=error|warning     Run only rules with the selected severity.",
    "  --error-only                 Alias for --severity=error.",
    "  --applicability=arm|data-plane|sdk",
    "                               Filter by rule applicability.",
    "                               arm runs ARM-only and common rules.",
    "                               data-plane runs DataPlane-only and common rules.",
    "                               sdk runs only SDK-only rules currently tagged as such.",
    "  --help                       Show this help text.",
    "",
    "Examples:",
    "  node --import tsx/esm scripts/validate.ts XmsExamplesRequired --update-snapshots",
    "  node --import tsx/esm scripts/validate.ts --severity=error --applicability=arm",
  ].join("\n");
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const os = await import("os");
  const defaultParallelism = Math.max(1, os.cpus().length / 2 - 1);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(getHelpText(defaultParallelism));
    return;
  }
  const updateSnapshots = args.includes("--update-snapshots");
  const severityArgIndex = args.findIndex(
    (a) => a === "--error-only" || a === "--severity" || a.startsWith("--severity="),
  );
  const severityArg = severityArgIndex >= 0 ? args[severityArgIndex] : undefined;
  const severityValue =
    severityArg === "--severity" ? args[severityArgIndex + 1] : undefined;
  let severityFilter: RuleSeverity | undefined;
  if (severityArg === "--error-only") {
    severityFilter = "error";
  } else if (severityArg?.startsWith("--severity=")) {
    severityFilter = parseSeverityFilter(severityArg.slice("--severity=".length));
  } else if (severityArg === "--severity") {
    severityFilter = parseSeverityFilter(severityValue);
  }
  if (severityArg && !severityFilter) {
    console.error(
      ANSI.red(
        `Invalid severity filter. Use --severity=error, --severity=warning, or --error-only.`,
      ),
    );
    process.exit(1);
  }
  const applicabilityArgIndex = args.findIndex(
    (a) => a === "--applicability" || a.startsWith("--applicability="),
  );
  const applicabilityArg =
    applicabilityArgIndex >= 0 ? args[applicabilityArgIndex] : undefined;
  const applicabilityValue =
    applicabilityArg === "--applicability"
      ? args[applicabilityArgIndex + 1]
      : undefined;
  let applicabilityFilter: RuleApplicabilityFilter | undefined;
  if (applicabilityArg?.startsWith("--applicability=")) {
    applicabilityFilter = parseApplicabilityFilter(
      applicabilityArg.slice("--applicability=".length),
    );
  } else if (applicabilityArg === "--applicability") {
    applicabilityFilter = parseApplicabilityFilter(applicabilityValue);
  }
  if (applicabilityArg && !applicabilityFilter) {
    console.error(
      ANSI.red(
        `Invalid applicability filter. Use --applicability=arm, --applicability=data-plane, or --applicability=sdk.`,
      ),
    );
    process.exit(1);
  }
  const reportMarkdownArgIndex = args.findIndex(
    (a) => a === "--report-md" || a.startsWith("--report-md="),
  );
  const reportMarkdownArg =
    reportMarkdownArgIndex >= 0 ? args[reportMarkdownArgIndex] : undefined;
  const reportMarkdownPath = reportMarkdownArg
    ? (() => {
        const rawPath =
          reportMarkdownArg === "--report-md"
            ? args[reportMarkdownArgIndex + 1] ?? "validate-report.md"
            : reportMarkdownArg.split("=")[1];
        return path.isAbsolute(rawPath)
          ? rawPath
          : path.join(REPO_ROOT, rawPath);
      })()
    : undefined;
  const consumedValueIndexes = new Set<number>();
  if (severityArg === "--severity") {
    consumedValueIndexes.add(severityArgIndex + 1);
  }
  if (applicabilityArg === "--applicability") {
    consumedValueIndexes.add(applicabilityArgIndex + 1);
  }
  if (reportMarkdownArg === "--report-md") {
    consumedValueIndexes.add(reportMarkdownArgIndex + 1);
  }
  const ruleFilter = args.find(
    (a, index) => !a.startsWith("--") && !consumedValueIndexes.has(index),
  );
  const parallelismArg = args.find((a) => a.startsWith("--parallelism="));
  const parallelism = parallelismArg
    ? parseInt(parallelismArg.split("=")[1], 10)
    : defaultParallelism;

  console.log(ANSI.bold("TypeSpec ↔ Azure OpenAPI Validator Coverage Check"));
  console.log(ANSI.dim("─".repeat(50)));

  if (updateSnapshots) {
    console.log(ANSI.cyan("Mode: updating snapshots"));
  }
  if (ruleFilter) {
    console.log(`Filtering to rule: ${ANSI.cyan(ruleFilter)}`);
  }
  if (severityFilter) {
    console.log(`Filtering to severity: ${ANSI.cyan(severityFilter)}`);
  }
  if (applicabilityFilter) {
    console.log(
      `Filtering to applicability: ${ANSI.cyan(formatApplicabilityFilter(applicabilityFilter))}`,
    );
  }
  console.log(`Parallelism: ${ANSI.cyan(String(parallelism))}`);
  if (reportMarkdownPath) {
    console.log(`Markdown report: ${ANSI.cyan(reportMarkdownPath)}`);
  }

  enforceMetadataIntegrityForFilteredRuns(severityFilter, applicabilityFilter);

  const testCases = discoverTestCases(ruleFilter, severityFilter, applicabilityFilter);

  if (testCases.length === 0) {
    const filterSummary = [
      ruleFilter ? `rule "${ruleFilter}"` : undefined,
      severityFilter ? `severity "${severityFilter}"` : undefined,
      applicabilityFilter
        ? `applicability "${formatApplicabilityFilter(applicabilityFilter)}"`
        : undefined,
    ]
      .filter(Boolean)
      .join(" and ");
    console.error(
      ANSI.red(
        `No test cases found${filterSummary ? ` for ${filterSummary}` : ""}`,
      ),
    );
    process.exit(1);
  }

  console.log(`Found ${testCases.length} test case(s)\n`);

  // Run all test cases in parallel with progress
  const allResults = await runPool(
    testCases,
    parallelism,
    (tc) => runTestCase(tc, updateSnapshots),
    (completed, total, result) => renderProgress(completed, total, result),
  );

  // Clear progress line
  process.stderr.write("\r\x1b[K");

  // Report results grouped by rule (in order)
  const byRule = new Map<string, TestResult[]>();
  for (const result of allResults) {
    const list = byRule.get(result.testCase.ruleDir) ?? [];
    list.push(result);
    byRule.set(result.testCase.ruleDir, list);
  }

  for (const [ruleDir, results] of byRule) {
    console.log(ANSI.bold(`\n▸ ${ruleDir}`));
    for (const result of results) {
      reportResult(result);
    }
  }

  reportSummary(allResults, updateSnapshots);
  if (reportMarkdownPath) {
    const markdown = buildMarkdownReport(allResults, {
      updateSnapshots,
      ruleFilter,
      reportPath: reportMarkdownPath,
    });
    fs.writeFileSync(reportMarkdownPath, markdown);
    console.log(`\nMarkdown report written to ${ANSI.cyan(reportMarkdownPath)}`);
  }

  // Clean up
  const testOutputDir = path.join(REPO_ROOT, ".test-output");
  fs.rmSync(testOutputDir, { recursive: true, force: true });

  const gaps = allResults.filter(
    (r) =>
      classifyResult(r) === "gap-suppressed-diagnostics" ||
      classifyResult(r) === "gap-no-diagnostics" ||
      classifyResult(r) === "gap-unmapped-diagnostics",
  ).length;
  const unexpectedViolations = allResults.filter(
    (r) => classifyResult(r) === "unexpected-violation",
  ).length;
  const complianceProofMismatches = allResults.filter(
    (r) => classifyResult(r) === "compliant-unexpected-ambient-diagnostics",
  ).length;
  const snapshotFailures = updateSnapshots
    ? 0
    : allResults.filter(
        (r) =>
          r.openApiSnapshotStatus === "mismatch" ||
          r.openApiSnapshotStatus === "missing" ||
          r.tspDiagnosticsSnapshotStatus === "mismatch" ||
          r.tspDiagnosticsSnapshotStatus === "missing" ||
          r.validatorDiagnosticsSnapshotStatus === "mismatch" ||
          r.validatorDiagnosticsSnapshotStatus === "missing",
      ).length;
  process.exit(
    gaps > 0 || unexpectedViolations > 0 || complianceProofMismatches > 0 ||
        snapshotFailures > 0
      ? 1
      : 0,
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(2);
});
