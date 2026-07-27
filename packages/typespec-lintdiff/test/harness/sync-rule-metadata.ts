import * as fs from "fs";
import * as path from "path";
import {
  canonicalApplicabilityToDisplay,
  getCanonicalRuleMetadata,
} from "./lib/validator-rule-metadata.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const TESTS_DIR = path.join(REPO_ROOT, "fixtures");

const write = process.argv.includes("--write");

function ensureRuleMetadata(content: string, severity: string, applicability: string): string {
  const normalized = content.replace(/\r\n/g, "\n");
  const frontmatterMatch = normalized.match(/^(---\n[\s\S]*?\n---\n?)/);
  const frontmatter = frontmatterMatch?.[1] ?? "";
  let body = frontmatter ? normalized.slice(frontmatter.length) : normalized;

  const severityLine = `**Severity:** ${severity}`;
  const applicabilityLine = `**Applies to:** ${applicability}`;

  if (/^\*\*Severity:\*\*/im.test(body)) {
    body = body.replace(/^\*\*Severity:\*\*.*$/im, severityLine);
  }
  if (/^\*\*Applies to:\*\*/im.test(body)) {
    body = body.replace(/^\*\*Applies to:\*\*.*$/im, applicabilityLine);
  }

  const hasSeverity = /^\*\*Severity:\*\*/im.test(body);
  const hasApplicability = /^\*\*Applies to:\*\*/im.test(body);

  if (!hasSeverity || !hasApplicability) {
    const headingMatch = body.match(/^# .+$/m);
    if (!headingMatch || headingMatch.index === undefined) {
      return frontmatter + body;
    }

    const missingLines = [
      !hasSeverity ? severityLine : undefined,
      !hasApplicability ? applicabilityLine : undefined,
    ].filter(Boolean);
    const insertion = `\n\n${missingLines.join("\n\n")}`;
    const headingEnd = headingMatch.index + headingMatch[0].length;
    body = `${body.slice(0, headingEnd)}${insertion}${body.slice(headingEnd)}`;
  }

  return `${frontmatter}${body}`.replace(/\n{3,}/g, "\n\n");
}

let changed = 0;
for (const rule of getCanonicalRuleMetadata()) {
  const mdPath = path.join(TESTS_DIR, rule.id, "rule.md");
  if (!fs.existsSync(mdPath)) {
    continue;
  }

  const before = fs.readFileSync(mdPath, "utf-8");
  const after = ensureRuleMetadata(
    before,
    rule.severity,
    canonicalApplicabilityToDisplay(rule.applicability),
  );

  if (after !== before) {
    changed++;
    if (write) {
      fs.writeFileSync(mdPath, after);
    } else {
      console.log(mdPath);
    }
  }
}

console.log(write ? `Updated ${changed} rule metadata files.` : `Would update ${changed} rule metadata files.`);
