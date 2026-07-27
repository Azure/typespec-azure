import * as fs from "fs";
import * as path from "path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const VALIDATOR_ROOT =
  process.env.LINTDIFF_VALIDATOR_ROOT ?? path.join(REPO_ROOT, "azure-openapi-validator");
const SPECTRAL_DIR = path.join(VALIDATOR_ROOT, "packages/rulesets/src/spectral");
const NATIVE_DIR = path.join(VALIDATOR_ROOT, "packages/rulesets/src/native");

type RawRuleSource = "arm" | "common" | "dataplane";
type RuleEngine = "spectral" | "native";

interface RawRule {
  id: string;
  source: RawRuleSource;
  engine: RuleEngine;
  description: string;
  severity: string;
  rpcGuidelineCode: string;
  disableForTypeSpec: boolean;
  disableForTypeSpecReason: string;
  disableForTypeSpecDataPlane: boolean;
  disableForTypeSpecDataPlaneReason: string;
}

export type CanonicalApplicability = "ARM" | "DataPlane" | "Both";
export type CanonicalSeverity = "error" | "warning";

export interface CanonicalRuleMetadata {
  id: string;
  engine: RuleEngine;
  applicability: CanonicalApplicability;
  severity: CanonicalSeverity;
  description: string;
  rpcCode: string;
  sources: RawRuleSource[];
  disableForTypeSpec: boolean;
  disableForTypeSpecReason: string;
  disableForTypeSpecDataPlane: boolean;
  disableForTypeSpecDataPlaneReason: string;
}

let cachedCanonicalMetadata: CanonicalRuleMetadata[] | undefined;
let cachedCanonicalMetadataMap: Map<string, CanonicalRuleMetadata> | undefined;

function getQuotedField(block: string, name: string): string {
  const re = new RegExp(`${name}:\\s*\\n?\\s*"([^"]*)"`, "m");
  return block.match(re)?.[1] ?? "";
}

function getMultilineQuotedField(block: string, name: string): string {
  const re = new RegExp(`${name}:\\s*\\n?\\s*"([\\s\\S]*?)"`, "m");
  const match = block.match(re);
  return match ? match[1].replace(/\n\s*/g, " ").trim() : "";
}

function getBooleanField(block: string, name: string): boolean {
  const re = new RegExp(`\\b${name}\\s*:\\s*true\\b`);
  return re.test(block);
}

function parseRulesetFile(filePath: string, source: RawRuleSource): RawRule[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const rules: RawRule[] = [];

  const ruleStartRe = /^(\s{4})(\w+):\s*\{/gm;
  let match: RegExpExecArray | null;

  while ((match = ruleStartRe.exec(content)) !== null) {
    const id = match[2];

    if (["rules", "extends", "then", "functionOptions", "overrides"].includes(id)) {
      continue;
    }

    const blockStart = match.index + match[0].length - 1;
    let depth = 1;
    let pos = blockStart + 1;
    while (pos < content.length && depth > 0) {
      if (content[pos] === "{") depth++;
      if (content[pos] === "}") depth--;
      pos++;
    }
    const block = content.slice(blockStart, pos);

    rules.push({
      id,
      source,
      engine: "spectral",
      description:
        getQuotedField(block, "description") || getMultilineQuotedField(block, "description"),
      severity: getQuotedField(block, "severity") || "warn",
      rpcGuidelineCode: getQuotedField(block, "rpcGuidelineCode"),
      disableForTypeSpec: getBooleanField(block, "disableForTypeSpec"),
      disableForTypeSpecReason: getMultilineQuotedField(block, "disableForTypeSpecReason"),
      disableForTypeSpecDataPlane: getBooleanField(block, "disableForTypeSpecDataPlane"),
      disableForTypeSpecDataPlaneReason: getMultilineQuotedField(
        block,
        "disableForTypeSpecDataPlaneReason",
      ),
    });
  }

  return rules;
}

function parseNativeArmRules(): RawRule[] {
  const filePath = path.join(NATIVE_DIR, "rulesets", "arm.ts");
  const content = fs.readFileSync(filePath, "utf-8");
  const rules: RawRule[] = [];

  const ruleStartRe = /^\s{4}(\w+):\s*\{/gm;
  let match: RegExpExecArray | null;

  while ((match = ruleStartRe.exec(content)) !== null) {
    const id = match[1];
    const blockStart = content.indexOf("{", match.index + match[0].length - 1);
    let depth = 1;
    let pos = blockStart + 1;
    while (pos < content.length && depth > 0) {
      if (content[pos] === "{") depth++;
      if (content[pos] === "}") depth--;
      pos++;
    }
    const block = content.slice(blockStart, pos);

    let rpcCode = "";
    const beforeBlock = content.slice(Math.max(0, match.index - 200), match.index);
    const rpcMatch = beforeBlock.match(/RPC[- ]Code:\s*(RPC-[\w-]+(?:,\s*RPC-[\w-]+)*)/i);
    if (rpcMatch) {
      rpcCode = rpcMatch[1];
    }

    rules.push({
      id,
      source: "arm",
      engine: "native",
      description: getQuotedField(block, "description"),
      severity: getQuotedField(block, "severity") || "error",
      rpcGuidelineCode: rpcCode,
      disableForTypeSpec: false,
      disableForTypeSpecReason: "",
      disableForTypeSpecDataPlane: false,
      disableForTypeSpecDataPlaneReason: "",
    });
  }

  return rules;
}

function parseLegacyRules(): RawRule[] {
  const legacyDir = path.join(NATIVE_DIR, "legacyRules");
  const rules: RawRule[] = [];

  for (const file of fs.readdirSync(legacyDir)) {
    if (!file.endsWith(".ts")) continue;

    const id = file.replace(".ts", "");
    const content = fs.readFileSync(path.join(legacyDir, file), "utf-8");

    const severityMatch = content.match(/severity:\s*"(\w+)"/);
    const descMatch = content.match(/description:\s*"([^"]+)"/);
    const categoryMatch = content.match(/category:\s*"(\w+)"/);
    const rpcMatch = content.match(/RPC[- ]Code:\s*(RPC-[\w-]+)/i);

    let source: RawRuleSource = "common";
    const typeMatch = content.match(/openapiType:\s*OpenApiTypes\.(\w+)/);
    if (typeMatch) {
      if (typeMatch[1] === "arm") source = "arm";
      else if (typeMatch[1] === "dataplane") source = "dataplane";
    }
    if (categoryMatch?.[1] === "ARMViolation") {
      source = "arm";
    }

    rules.push({
      id,
      source,
      engine: "native",
      description: descMatch?.[1] ?? "",
      severity: severityMatch?.[1] ?? "warn",
      rpcGuidelineCode: rpcMatch?.[1] ?? "",
      disableForTypeSpec: false,
      disableForTypeSpecReason: "",
      disableForTypeSpecDataPlane: false,
      disableForTypeSpecDataPlaneReason: "",
    });
  }

  return rules;
}

function getApplicability(
  rule: RawRule,
  allRules: RawRule[],
): CanonicalApplicability {
  const sources = new Set(allRules.filter((candidate) => candidate.id === rule.id).map((r) => r.source));

  if (sources.has("common")) return "Both";
  if (sources.has("arm") && sources.has("dataplane")) return "Both";
  if (sources.has("arm")) return "ARM";
  if (sources.has("dataplane")) return "DataPlane";
  return "Both";
}

function normalizeSeverity(raw: string): CanonicalSeverity {
  return raw.trim().toLowerCase() === "error" ? "error" : "warning";
}

function computeCanonicalRuleMetadata(): CanonicalRuleMetadata[] {
  const armRules = parseRulesetFile(path.join(SPECTRAL_DIR, "az-arm.ts"), "arm");
  const commonRules = parseRulesetFile(path.join(SPECTRAL_DIR, "az-common.ts"), "common");
  const dataplaneRules = parseRulesetFile(path.join(SPECTRAL_DIR, "az-dataplane.ts"), "dataplane");
  const nativeArmRules = parseNativeArmRules();
  const legacyRules = parseLegacyRules();

  const allRules = [...armRules, ...commonRules, ...dataplaneRules, ...nativeArmRules, ...legacyRules];

  const seen = new Map<string, RawRule>();
  for (const rule of allRules) {
    const existing = seen.get(rule.id);
    if (!existing) {
      seen.set(rule.id, rule);
    } else if (rule.source !== "common" && existing.source === "common") {
      seen.set(rule.id, rule);
    }
  }

  const metadata: CanonicalRuleMetadata[] = [];
  for (const [id, rule] of seen) {
    const relatedRules = allRules.filter((candidate) => candidate.id === id);
    metadata.push({
      id,
      engine: rule.engine,
      applicability: getApplicability(rule, allRules),
      severity: normalizeSeverity(rule.severity),
      description: rule.description,
      rpcCode: rule.rpcGuidelineCode,
      sources: [...new Set(relatedRules.map((candidate) => candidate.source))],
      disableForTypeSpec: rule.disableForTypeSpec,
      disableForTypeSpecReason: rule.disableForTypeSpecReason,
      disableForTypeSpecDataPlane: rule.disableForTypeSpecDataPlane,
      disableForTypeSpecDataPlaneReason: rule.disableForTypeSpecDataPlaneReason,
    });
  }

  metadata.sort((a, b) => a.id.localeCompare(b.id));
  return metadata;
}

export function getCanonicalRuleMetadata(): CanonicalRuleMetadata[] {
  if (cachedCanonicalMetadata === undefined) {
    cachedCanonicalMetadata = computeCanonicalRuleMetadata();
  }
  return cachedCanonicalMetadata;
}

export function getCanonicalRuleMetadataMap(): Map<string, CanonicalRuleMetadata> {
  if (cachedCanonicalMetadataMap === undefined) {
    cachedCanonicalMetadataMap = new Map(
      getCanonicalRuleMetadata().map((rule) => [rule.id, rule]),
    );
  }
  return cachedCanonicalMetadataMap;
}

export function canonicalApplicabilityToRuleApplicability(
  applicability: CanonicalApplicability,
): "arm" | "data-plane" | "common" {
  switch (applicability) {
    case "ARM":
      return "arm";
    case "DataPlane":
      return "data-plane";
    case "Both":
      return "common";
  }
}

export function canonicalApplicabilityToDisplay(applicability: CanonicalApplicability): string {
  switch (applicability) {
    case "ARM":
      return "Resource Manager (ARM)";
    case "DataPlane":
      return "Data Plane";
    case "Both":
      return "Both ARM and DataPlane";
  }
}
