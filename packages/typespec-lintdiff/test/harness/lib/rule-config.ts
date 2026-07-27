import * as fs from "fs";
import * as path from "path";
import YAML from "yaml";
import {
  canonicalApplicabilityToRuleApplicability,
  getCanonicalRuleMetadataMap,
} from "./validator-rule-metadata.js";

export type RuleEngine = "spectral" | "native";
export type RuleRuleset = "resource-manager" | "data-plane" | "none";
export type CoverageKind = "none" | "lint" | "template" | "partial" | "blocked";
export type RuleSeverity = "error" | "warning";
export type RuleApplicability = "arm" | "data-plane" | "common" | "sdk" | "unknown";
export type MappingStatus =
  | "unconfigured"
  | "direct"
  | "template"
  | "direct+template"
  | "official-only";
export type TspRulesetSource =
  | "explicit"
  | "inferred-resource-manager"
  | "inferred-data-plane"
  | "project-default";
export type TspDiagnosticStatus =
  | "none"
  | "direct-only"
  | "template-only"
  | "direct+template-only"
  | "unmapped-only"
  | "mixed";

export interface RuleConfig {
  validatorRuleId: string;
  engine: RuleEngine;
  coverageKind: CoverageKind;
  severity?: RuleSeverity;
  applicability: RuleApplicability;
  tspLints: string[];
  tspTemplateLints: string[];
  officialTspLints: string[];
  tspRuleset?: RuleRuleset;
}

function normalizeRuleSeverity(raw: unknown): RuleSeverity | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }

  switch (raw.trim().toLowerCase()) {
    case "error":
      return "error";
    case "warn":
    case "warning":
      return "warning";
    default:
      return undefined;
  }
}

export function parseRuleSeverity(content: string): RuleSeverity | undefined {
  const severityMatch = content.match(/^\*\*Severity:\*\*\s*(error|warn(?:ing)?)\s*$/im);
  return normalizeRuleSeverity(severityMatch?.[1]);
}

function normalizeRuleApplicability(raw: unknown): RuleApplicability | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }

  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  const hasArm = /\barm\b|resource manager/.test(normalized);
  const hasDataPlane = /data(?:\s|-)?plane|dataplane/.test(normalized);
  const hasSdk = /\bsdk\b/.test(normalized);

  if (hasArm && hasDataPlane) {
    return "common";
  }
  if (hasArm) {
    return "arm";
  }
  if (hasDataPlane) {
    return "data-plane";
  }
  if (hasSdk) {
    return "sdk";
  }

  return "unknown";
}

export function parseRuleApplicability(content: string): RuleApplicability | undefined {
  const applicabilityMatch = content.match(/^\*\*Applies to:\*\*\s*(.+?)\s*$/im);
  return normalizeRuleApplicability(applicabilityMatch?.[1]);
}

function inferCoverageKind(parsed: any): CoverageKind {
  if (parsed.coverageKind) {
    return parsed.coverageKind;
  }

  const direct = (parsed.tspLints ?? []).length > 0;
  const template = (parsed.tspTemplateLints ?? []).length > 0;

  if (direct && template) {
    return "partial";
  }
  if (direct) {
    return "lint";
  }
  if (template) {
    return "template";
  }
  return "none";
}

export function loadRuleConfig(testsDir: string, ruleDir: string): RuleConfig {
  const canonicalMetadata = getCanonicalRuleMetadataMap().get(ruleDir);
  const mdPath = path.join(testsDir, ruleDir, "rule.md");
  if (fs.existsSync(mdPath)) {
    const content = fs.readFileSync(mdPath, "utf-8");
    const severity = parseRuleSeverity(content);
    const applicability = parseRuleApplicability(content);
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (match) {
      const parsed = YAML.parse(match[1]) ?? {};
      return {
        validatorRuleId: parsed.validatorRuleId ?? ruleDir,
        engine: parsed.engine ?? "spectral",
        coverageKind: inferCoverageKind(parsed),
        severity:
          normalizeRuleSeverity(parsed.severity) ??
          severity ??
          canonicalMetadata?.severity,
        applicability:
          normalizeRuleApplicability(parsed.applicability ?? parsed.appliesTo) ??
          applicability ??
          (canonicalMetadata
            ? canonicalApplicabilityToRuleApplicability(canonicalMetadata.applicability)
            : undefined) ??
          "unknown",
        tspLints: parsed.tspLints ?? [],
        tspTemplateLints: parsed.tspTemplateLints ?? [],
        officialTspLints: parsed.officialTspLints ?? [],
        tspRuleset: parsed.tspRuleset,
      };
    }
  }

  return {
    validatorRuleId: ruleDir,
    engine: "spectral",
    coverageKind: "none",
    severity: canonicalMetadata?.severity,
    applicability: canonicalMetadata
      ? canonicalApplicabilityToRuleApplicability(canonicalMetadata.applicability)
      : "unknown",
    tspLints: [],
    tspTemplateLints: [],
    officialTspLints: [],
  };
}

export function getVerifiedDiagnosticCodes(ruleConfig: RuleConfig): string[] {
  return [...new Set([...ruleConfig.tspLints, ...ruleConfig.tspTemplateLints])];
}

export function getDirectDiagnosticCodes(ruleConfig: RuleConfig): string[] {
  return [...new Set(ruleConfig.tspLints)];
}

export function getTemplateDiagnosticCodes(ruleConfig: RuleConfig): string[] {
  return [...new Set(ruleConfig.tspTemplateLints)];
}

export function getMappingStatus(ruleConfig: RuleConfig): MappingStatus {
  const hasDirect = ruleConfig.tspLints.length > 0;
  const hasTemplate = ruleConfig.tspTemplateLints.length > 0;
  const hasOfficialOnly = ruleConfig.officialTspLints.length > 0;

  if (hasDirect && hasTemplate) return "direct+template";
  if (hasDirect) return "direct";
  if (hasTemplate) return "template";
  if (hasOfficialOnly) return "official-only";
  return "unconfigured";
}

export function resolveTspRuleset(
  ruleConfig: RuleConfig,
  mainTspPath: string,
): { ruleset: RuleRuleset; source: TspRulesetSource } {
  if (ruleConfig.tspRuleset) {
    return { ruleset: ruleConfig.tspRuleset, source: "explicit" };
  }

  const tspContent = fs.readFileSync(mainTspPath, "utf-8");
  if (
    tspContent.includes("typespec-azure-resource-manager") ||
    tspContent.includes("Azure.ResourceManager")
  ) {
    return {
      ruleset: "resource-manager",
      source: "inferred-resource-manager",
    };
  }
  if (
    tspContent.includes("typespec-azure-core") ||
    tspContent.includes("Azure.Core")
  ) {
    return {
      ruleset: "data-plane",
      source: "inferred-data-plane",
    };
  }

  return { ruleset: "none", source: "project-default" };
}

export function getTspDiagnosticStatus(
  ruleConfig: RuleConfig,
  diagnostics: { code: string }[],
): TspDiagnosticStatus {
  const directCodes = new Set(getDirectDiagnosticCodes(ruleConfig));
  const templateCodes = new Set(getTemplateDiagnosticCodes(ruleConfig));

  let directCount = 0;
  let templateCount = 0;
  let unmappedCount = 0;

  for (const diagnostic of diagnostics) {
    if (directCodes.has(diagnostic.code)) {
      directCount++;
    } else if (templateCodes.has(diagnostic.code)) {
      templateCount++;
    } else {
      unmappedCount++;
    }
  }

  if (diagnostics.length === 0) return "none";
  if (unmappedCount > 0 && directCount === 0 && templateCount === 0) {
    return "unmapped-only";
  }
  if (unmappedCount > 0) return "mixed";
  if (directCount > 0 && templateCount > 0) return "direct+template-only";
  if (directCount > 0) return "direct-only";
  if (templateCount > 0) return "template-only";
  return "none";
}
