import * as fs from "fs";
import * as path from "path";
import {
  canonicalApplicabilityToRuleApplicability,
  getCanonicalRuleMetadata,
} from "./validator-rule-metadata.js";
import { parseRuleApplicability, parseRuleSeverity, type RuleApplicability, type RuleSeverity } from "./rule-config.js";

export type RuleMetadataIssueKind =
  | "missing-test-dir"
  | "orphan-test-dir"
  | "missing-rule-md"
  | "no-case-dirs"
  | "missing-explicit-severity"
  | "missing-explicit-applicability"
  | "mismatched-severity"
  | "mismatched-applicability";

export interface RuleMetadataIssue {
  kind: RuleMetadataIssueKind;
  ruleId: string;
  expectedSeverity?: RuleSeverity;
  actualSeverity?: RuleSeverity;
  expectedApplicability?: RuleApplicability;
  actualApplicability?: RuleApplicability;
}

export interface RuleMetadataAuditResult {
  issues: RuleMetadataIssue[];
  issueCounts: Record<RuleMetadataIssueKind, number>;
}

function listCaseDirectories(ruleTestsPath: string): string[] {
  return fs.readdirSync(ruleTestsPath).filter((entry) => {
    const fullPath = path.join(ruleTestsPath, entry);
    return fs.statSync(fullPath).isDirectory();
  });
}

export function auditRuleMetadata(testsDir: string): RuleMetadataAuditResult {
  const issues: RuleMetadataIssue[] = [];
  const canonicalRules = getCanonicalRuleMetadata();
  const canonicalRuleIds = new Set(canonicalRules.map((rule) => rule.id));

  const testRuleDirs = fs.readdirSync(testsDir).filter((entry) => {
    const fullPath = path.join(testsDir, entry);
    return fs.statSync(fullPath).isDirectory() && entry !== "lib";
  });

  for (const testRuleDir of testRuleDirs) {
    if (!canonicalRuleIds.has(testRuleDir)) {
      issues.push({ kind: "orphan-test-dir", ruleId: testRuleDir });
    }
  }

  for (const canonicalRule of canonicalRules) {
    const ruleTestsPath = path.join(testsDir, canonicalRule.id);
    if (!fs.existsSync(ruleTestsPath) || !fs.statSync(ruleTestsPath).isDirectory()) {
      issues.push({ kind: "missing-test-dir", ruleId: canonicalRule.id });
      continue;
    }

    const mdPath = path.join(ruleTestsPath, "rule.md");
    if (!fs.existsSync(mdPath)) {
      issues.push({ kind: "missing-rule-md", ruleId: canonicalRule.id });
    } else {
      const content = fs.readFileSync(mdPath, "utf-8");
      const explicitSeverity = parseRuleSeverity(content);
      const explicitApplicability = parseRuleApplicability(content);
      const canonicalSeverity = canonicalRule.severity;
      const canonicalApplicability = canonicalApplicabilityToRuleApplicability(
        canonicalRule.applicability,
      );

      if (explicitSeverity === undefined) {
        issues.push({
          kind: "missing-explicit-severity",
          ruleId: canonicalRule.id,
          expectedSeverity: canonicalSeverity,
        });
      } else if (explicitSeverity !== canonicalSeverity) {
        issues.push({
          kind: "mismatched-severity",
          ruleId: canonicalRule.id,
          expectedSeverity: canonicalSeverity,
          actualSeverity: explicitSeverity,
        });
      }

      if (explicitApplicability === undefined) {
        issues.push({
          kind: "missing-explicit-applicability",
          ruleId: canonicalRule.id,
          expectedApplicability: canonicalApplicability,
        });
      } else if (explicitApplicability !== canonicalApplicability) {
        issues.push({
          kind: "mismatched-applicability",
          ruleId: canonicalRule.id,
          expectedApplicability: canonicalApplicability,
          actualApplicability: explicitApplicability,
        });
      }
    }

    if (listCaseDirectories(ruleTestsPath).length === 0) {
      issues.push({ kind: "no-case-dirs", ruleId: canonicalRule.id });
    }
  }

  const issueKinds: RuleMetadataIssueKind[] = [
    "missing-test-dir",
    "orphan-test-dir",
    "missing-rule-md",
    "no-case-dirs",
    "missing-explicit-severity",
    "missing-explicit-applicability",
    "mismatched-severity",
    "mismatched-applicability",
  ];

  return {
    issues,
    issueCounts: Object.fromEntries(
      issueKinds.map((kind) => [kind, issues.filter((issue) => issue.kind === kind).length]),
    ) as Record<RuleMetadataIssueKind, number>,
  };
}
