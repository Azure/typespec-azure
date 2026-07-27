import * as fs from "fs";
import * as path from "path";
import {
  getDirectDiagnosticCodes,
  getVerifiedDiagnosticCodes,
  loadRuleConfig,
} from "./lib/rule-config.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const TESTS_DIR = path.join(REPO_ROOT, "fixtures");

interface AuditRow {
  rule: string;
  coverageKind: string;
  direct: string[];
  verified: string[];
  official: string[];
  templateSignals: string[];
}

const rows: AuditRow[] = [];
for (const dirent of fs.readdirSync(TESTS_DIR, { withFileTypes: true })) {
  if (!dirent.isDirectory() || dirent.name === "lib") continue;
  const ruleConfig = loadRuleConfig(TESTS_DIR, dirent.name);
  rows.push({
    rule: dirent.name,
    coverageKind: ruleConfig.coverageKind,
    direct: getDirectDiagnosticCodes(ruleConfig),
    verified: getVerifiedDiagnosticCodes(ruleConfig),
    official: ruleConfig.officialTspLints,
    templateSignals: ruleConfig.tspTemplateLints,
  });
}

rows.sort((a, b) => a.rule.localeCompare(b.rule));

const officialButUnverified = rows.filter(
  (row) => row.official.length > 0 && row.verified.length === 0,
);
const templateWithoutSignals = rows.filter(
  (row) => row.coverageKind === "template" && row.templateSignals.length === 0,
);
const templateWithoutDirectBackstop = rows.filter(
  (row) => row.coverageKind === "template" && row.direct.length === 0,
);
const verifiedNotInOfficial = rows.filter((row) =>
  row.verified.some((code) => !row.official.includes(code)),
);

console.log(`Rules audited: ${rows.length}`);
console.log(`Official but unverified: ${officialButUnverified.length}`);
console.log(`Template coverage without verified template signals: ${templateWithoutSignals.length}`);
console.log(`Template coverage without non-template backstop: ${templateWithoutDirectBackstop.length}`);
console.log(`Verified mappings not listed as official: ${verifiedNotInOfficial.length}`);
console.log();

if (officialButUnverified.length > 0) {
  console.log("=== Official but unverified ===");
  for (const row of officialButUnverified) {
    console.log(`${row.rule}: ${row.official.join(", ")}`);
  }
  console.log();
}

if (templateWithoutSignals.length > 0) {
  console.log("=== Template coverage without verified template signals ===");
  for (const row of templateWithoutSignals) {
    console.log(row.rule);
  }
  console.log();
}

if (templateWithoutDirectBackstop.length > 0) {
  console.log("=== Template coverage without non-template backstop ===");
  for (const row of templateWithoutDirectBackstop) {
    console.log(row.rule);
  }
  console.log();
}

if (verifiedNotInOfficial.length > 0) {
  console.log("=== Verified mappings not listed as official ===");
  for (const row of verifiedNotInOfficial) {
    const extra = row.verified.filter((code) => !row.official.includes(code));
    console.log(`${row.rule}: ${extra.join(", ")}`);
  }
}
