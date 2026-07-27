// Analyze diagnostic coverage for each violation test case.
// Separates cases with no TypeSpec diagnostics from cases with unmapped diagnostics.

import * as fs from "fs";
import * as path from "path";
import { execFile } from "child_process";
import {
  getMappingStatus,
  getTspDiagnosticStatus,
  getVerifiedDiagnosticCodes,
  loadRuleConfig,
  resolveTspRuleset,
  type MappingStatus,
  type RuleConfig,
  type RuleRuleset,
  type TspDiagnosticStatus,
  type TspRulesetSource,
} from "./lib/rule-config.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const TESTS_DIR = path.join(REPO_ROOT, "fixtures");
const COMPILE_WORKER = path.join(import.meta.dirname, "compile-worker.ts");

interface DiagInfo {
  code: string;
  severity: string;
  message: string;
}

async function compileTsp(
  mainTspPath: string,
  ruleConfig: RuleConfig,
): Promise<{
  diagnostics: DiagInfo[];
  ruleset: RuleRuleset;
  rulesetSource: TspRulesetSource;
}> {
  const { ruleset, source } = resolveTspRuleset(ruleConfig, mainTspPath);

  const outputDir = path.join(REPO_ROOT, ".noise-check", Math.random().toString(36).slice(2));
  fs.mkdirSync(outputDir, { recursive: true });

  return new Promise((resolve) => {
    execFile(
      "node",
      ["--import", "tsx/esm", COMPILE_WORKER, mainTspPath, outputDir, ruleset],
      { maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        fs.rmSync(outputDir, { recursive: true, force: true });
        try {
          const result = JSON.parse(stdout);
          resolve({
            diagnostics: result.diagnostics,
            ruleset,
            rulesetSource: source,
          });
        } catch {
          resolve({
            diagnostics: [],
            ruleset,
            rulesetSource: source,
          });
        }
      },
    );
  });
}

// Collect all violation test cases
const cases: {
  rule: string;
  caseId: string;
  path: string;
  ruleConfig: RuleConfig;
  verifiedCodes: string[];
}[] = [];
for (const ruleDir of fs.readdirSync(TESTS_DIR, { withFileTypes: true })) {
  if (!ruleDir.isDirectory() || ruleDir.name === "lib") continue;
  const ruleConfig = loadRuleConfig(TESTS_DIR, ruleDir.name);
  const verifiedCodes = getVerifiedDiagnosticCodes(ruleConfig);

  for (const caseDir of fs.readdirSync(path.join(TESTS_DIR, ruleDir.name), { withFileTypes: true })) {
    if (!caseDir.isDirectory()) continue;
    const expectPath = path.join(TESTS_DIR, ruleDir.name, caseDir.name, "expect.json");
    const mainPath = path.join(TESTS_DIR, ruleDir.name, caseDir.name, "main.tsp");
    if (!fs.existsSync(expectPath) || !fs.existsSync(mainPath)) continue;
    const expect = JSON.parse(fs.readFileSync(expectPath, "utf-8"));
    if (expect.violation) {
      cases.push({
        rule: ruleDir.name,
        caseId: caseDir.name,
        path: mainPath,
        ruleConfig,
        verifiedCodes,
      });
    }
  }
}

console.log(`Analyzing ${cases.length} violation test cases...\n`);

// Process in parallel with limited concurrency
const concurrency = 8;
let nextIdx = 0;

interface NoiseResult {
  rule: string;
  caseId: string;
  mappingStatus: MappingStatus;
  tspDiagnosticStatus: TspDiagnosticStatus;
  ruleset: RuleRuleset;
  rulesetSource: TspRulesetSource;
  totalDiags: number;
  mappedDiags: number;
  unmappedDiags: DiagInfo[];
  hasMappedLint: boolean;
  category:
    | "covered_clean"
    | "covered_noisy"
    | "gap_no_tsp_diagnostics"
    | "gap_unmapped_tsp_diagnostics";
}

const results: NoiseResult[] = [];

async function worker() {
  while (nextIdx < cases.length) {
    const i = nextIdx++;
    const c = cases[i];
    const compiled = await compileTsp(c.path, c.ruleConfig);
    const diags = compiled.diagnostics;

    const mapped = diags.filter((d) => c.verifiedCodes.includes(d.code));
    const unmapped = diags.filter((d) => !c.verifiedCodes.includes(d.code));
    const mappingStatus = getMappingStatus(c.ruleConfig);
    const tspDiagnosticStatus = getTspDiagnosticStatus(c.ruleConfig, diags);

    const category = mapped.length > 0
      ? unmapped.length > 0
        ? "covered_noisy"
        : "covered_clean"
      : diags.length > 0
        ? "gap_unmapped_tsp_diagnostics"
        : "gap_no_tsp_diagnostics";

    results.push({
      rule: c.rule,
      caseId: c.caseId,
      mappingStatus,
      tspDiagnosticStatus,
      ruleset: compiled.ruleset,
      rulesetSource: compiled.rulesetSource,
      totalDiags: diags.length,
      mappedDiags: mapped.length,
      unmappedDiags: unmapped,
      hasMappedLint: mapped.length > 0,
      category,
    });

    process.stderr.write(`\r  ${results.length}/${cases.length}`);
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, cases.length) }, () => worker()));
process.stderr.write("\r\n");

// Sort by severity of review need, then noise level
results.sort((a, b) => {
  const rank = {
    gap_unmapped_tsp_diagnostics: 0,
    gap_no_tsp_diagnostics: 1,
    covered_noisy: 2,
    covered_clean: 3,
  } as const;
  return rank[a.category] - rank[b.category] || b.unmappedDiags.length - a.unmappedDiags.length;
});

// Summary
const coveredClean = results.filter((r) => r.category === "covered_clean");
const coveredNoisy = results.filter((r) => r.category === "covered_noisy");
const gapNoDiagnostics = results.filter(
  (r) => r.category === "gap_no_tsp_diagnostics",
);
const gapUnexpectedDiagnostics = results.filter(
  (r) => r.category === "gap_unmapped_tsp_diagnostics",
);

console.log(`Covered clean: ${coveredClean.length}`);
console.log(`Covered noisy: ${coveredNoisy.length}`);
console.log(`Gap with no TypeSpec diagnostics: ${gapNoDiagnostics.length}`);
console.log(`Gap with unexpected TypeSpec diagnostics: ${gapUnexpectedDiagnostics.length}`);
console.log();

if (gapNoDiagnostics.length > 0) {
  console.log("=== Gaps with no TypeSpec diagnostics ===");
  for (const r of gapNoDiagnostics) {
    console.log(`${r.rule}/${r.caseId}`);
  }
  console.log();
}

if (gapUnexpectedDiagnostics.length > 0) {
  console.log("=== Gaps with unexpected TypeSpec diagnostics ===");
  for (const r of gapUnexpectedDiagnostics) {
    console.log(`${r.rule}/${r.caseId}: ${r.totalDiags} unexpected diagnostic(s)`);
    for (const d of r.unmappedDiags) {
      console.log(`  ${d.code}: ${d.message.slice(0, 100)}`);
    }
  }
  console.log();
}

if (coveredNoisy.length > 0) {
  console.log("=== Covered but noisy cases ===");
  for (const r of coveredNoisy) {
    console.log(`${r.rule}/${r.caseId}: ${r.totalDiags} diags (${r.mappedDiags} mapped, ${r.unmappedDiags.length} extra)`);
    for (const d of r.unmappedDiags) {
      console.log(`  ${d.code}: ${d.message.slice(0, 100)}`);
    }
  }
}

// Write JSON for programmatic use
fs.writeFileSync(
  path.join(REPO_ROOT, "noise-analysis.json"),
  JSON.stringify(results, null, 2) + "\n",
);
console.log("\nFull results written to noise-analysis.json");

// Cleanup
fs.rmSync(path.join(REPO_ROOT, ".noise-check"), { recursive: true, force: true });
