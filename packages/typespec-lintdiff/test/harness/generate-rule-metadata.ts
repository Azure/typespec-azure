import * as fs from "fs";
import * as path from "path";
import { getCanonicalRuleMetadata } from "./lib/validator-rule-metadata.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const outputPath = path.join(REPO_ROOT, "..", "catalog", "validator-rule-metadata.json");

const metadata = getCanonicalRuleMetadata();
fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2) + "\n");

console.log(`Canonical validator metadata written to ${outputPath}`);
console.log(`Total rules: ${metadata.length}`);
