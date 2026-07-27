import * as fs from "fs";
import * as path from "path";
import { auditRuleMetadata } from "./lib/rule-metadata-audit.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const TESTS_DIR = path.join(REPO_ROOT, "fixtures");
const outputPath = path.join(REPO_ROOT, "..", "catalog", "rule-metadata-audit.json");

const result = auditRuleMetadata(TESTS_DIR);
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");

console.log(`Rule metadata audit written to ${outputPath}`);
for (const [kind, count] of Object.entries(result.issueCounts)) {
  if (count > 0) {
    console.log(`${kind}: ${count}`);
  }
}

if (result.issues.length > 0) {
  process.exitCode = 1;
}
