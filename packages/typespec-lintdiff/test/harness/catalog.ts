import * as fs from "fs";
import * as path from "path";
import { spectralTriage, nativeTriage } from "./triage-data.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
// azure-openapi-validator checkout (source of truth for validator rule docs/metadata).
// Not vendored here; provide via env (LINTDIFF_VALIDATOR_ROOT) or `npm run compare:setup`.
const VALIDATOR_ROOT =
  process.env.LINTDIFF_VALIDATOR_ROOT ?? path.join(REPO_ROOT, "azure-openapi-validator");
const SPECTRAL_DIR = path.join(VALIDATOR_ROOT, "packages/rulesets/src/spectral");
const NATIVE_DIR = path.join(VALIDATOR_ROOT, "packages/rulesets/src/native");
const DOCS_DIR = path.join(VALIDATOR_ROOT, "docs");

// --- Parse ruleset files ---

interface RawRule {
  id: string;
  source: "arm" | "common" | "dataplane";
  description: string;
  severity: string;
  given: string;
  rpcGuidelineCode: string;
  disableForTypeSpec: boolean;
  disableForTypeSpecReason: string;
  disableForTypeSpecDataPlane: boolean;
  disableForTypeSpecDataPlaneReason: string;
}

function parseRulesetFile(filePath: string, source: RawRule["source"]): RawRule[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const rules: RawRule[] = [];

  // Match rule blocks: RuleName: { ... }
  // We use a brace-depth tracker to extract each rule block
  const ruleStartRe = /^(\s{4})(\w+):\s*\{/gm;
  let match;

  while ((match = ruleStartRe.exec(content)) !== null) {
    const indent = match[1];
    const id = match[2];

    // Skip non-rule keys
    if (["rules", "extends", "then", "functionOptions", "overrides"].includes(id)) continue;

    // Extract the block by counting braces
    const blockStart = match.index + match[0].length - 1;
    let depth = 1;
    let pos = blockStart + 1;
    while (pos < content.length && depth > 0) {
      if (content[pos] === "{") depth++;
      if (content[pos] === "}") depth--;
      pos++;
    }
    const block = content.slice(blockStart, pos);

    const getField = (name: string): string => {
      // Match: fieldName: "value" — uses the same quote character to close
      const re = new RegExp(`${name}:\\s*\\n?\\s*"([^"]*)"`, "m");
      const m = block.match(re);
      return m ? m[1] : "";
    };

    const getBoolField = (name: string): boolean => {
      const re = new RegExp(`\\b${name}\\s*:\\s*true`);
      return re.test(block);
    };

    const getMultilineField = (name: string): string => {
      // Match double-quoted value (may contain single quotes), possibly across lines
      const re = new RegExp(`${name}:\\s*\\n?\\s*"([\\s\\S]*?)"`, "m");
      const m = block.match(re);
      return m ? m[1].replace(/\n\s*/g, " ").trim() : "";
    };

    // Extract given (can be string or array)
    let given = "";
    const givenMatch = block.match(/given:\s*(\[[\s\S]*?\]|"[^"]*")/);
    if (givenMatch) {
      given = givenMatch[1].replace(/\s+/g, " ").trim();
    }

    rules.push({
      id,
      source,
      description: getField("description") || getMultilineField("description"),
      severity: getField("severity") || "warn",
      given,
      rpcGuidelineCode: getField("rpcGuidelineCode"),
      disableForTypeSpec: getBoolField("disableForTypeSpec:"),
      disableForTypeSpecReason: getMultilineField("disableForTypeSpecReason"),
      disableForTypeSpecDataPlane: getBoolField("disableForTypeSpecDataPlane"),
      disableForTypeSpecDataPlaneReason: getMultilineField("disableForTypeSpecDataPlaneReason"),
    });
  }

  return rules;
}

// --- Get TSP linter rules ---

async function getTspLinterRules(): Promise<Map<string, string>> {
  const rules = new Map<string, string>();

  try {
    const arm = await import("@azure-tools/typespec-azure-resource-manager");
    if (arm.$linter?.rules) {
      for (const r of arm.$linter.rules as any[]) {
        rules.set(
          r.name,
          `@azure-tools/typespec-azure-resource-manager/${r.name}`,
        );
      }
    }
  } catch {}

  try {
    const core = await import("@azure-tools/typespec-azure-core");
    if (core.$linter?.rules) {
      for (const r of core.$linter.rules as any[]) {
        rules.set(r.name, `@azure-tools/typespec-azure-core/${r.name}`);
      }
    }
  } catch {}

  return rules;
}

// --- Parse native ARM ruleset ---

function parseNativeArmRules(): RawRule[] {
  const filePath = path.join(NATIVE_DIR, "rulesets", "arm.ts");
  const content = fs.readFileSync(filePath, "utf-8");
  const rules: RawRule[] = [];

  // Match rule entries: RuleName: { ... }
  const ruleStartRe = /^\s{4}(\w+):\s*\{/gm;
  let match;

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

    const getField = (name: string): string => {
      const re = new RegExp(`${name}:\\s*\\n?\\s*"([^"]*)"`, "m");
      const m = block.match(re);
      return m ? m[1] : "";
    };

    // Extract RPC code from comments above the rule
    let rpcCode = "";
    const beforeBlock = content.slice(Math.max(0, match.index - 200), match.index);
    const rpcMatch = beforeBlock.match(/RPC[- ]Code:\s*(RPC-[\w-]+(?:,\s*RPC-[\w-]+)*)/i);
    if (rpcMatch) rpcCode = rpcMatch[1];

    rules.push({
      id,
      source: "arm",
      description: getField("description"),
      severity: getField("severity") || "error",
      given: "",
      rpcGuidelineCode: rpcCode,
      disableForTypeSpec: false,
      disableForTypeSpecReason: "",
      disableForTypeSpecDataPlane: false,
      disableForTypeSpecDataPlaneReason: "",
    });
  }

  return rules;
}

// --- Parse legacy rules ---

function parseLegacyRules(): RawRule[] {
  const legacyDir = path.join(NATIVE_DIR, "legacyRules");
  const rules: RawRule[] = [];

  for (const file of fs.readdirSync(legacyDir)) {
    if (!file.endsWith(".ts")) continue;
    const id = file.replace(".ts", "");
    const content = fs.readFileSync(path.join(legacyDir, file), "utf-8");

    // Try to extract metadata
    const severityMatch = content.match(/severity:\s*"(\w+)"/);
    const descMatch = content.match(/description:\s*"([^"]+)"/);
    const categoryMatch = content.match(/category:\s*"(\w+)"/);
    const rpcMatch = content.match(/RPC[- ]Code:\s*(RPC-[\w-]+)/i);

    // Determine applicability from openapiType or category
    let source: RawRule["source"] = "common";
    const typeMatch = content.match(/openapiType:\s*OpenApiTypes\.(\w+)/);
    if (typeMatch) {
      if (typeMatch[1] === "arm") source = "arm";
      else if (typeMatch[1] === "dataplane") source = "dataplane";
    }
    if (categoryMatch && categoryMatch[1] === "ARMViolation") source = "arm";

    rules.push({
      id,
      source,
      description: descMatch?.[1] ?? "",
      severity: severityMatch?.[1] ?? "warn",
      given: "",
      rpcGuidelineCode: rpcMatch?.[1] ?? "",
      disableForTypeSpec: false,
      disableForTypeSpecReason: "",
      disableForTypeSpecDataPlane: false,
      disableForTypeSpecDataPlaneReason: "",
    });
  }

  return rules;
}

// --- Check for docs ---

function getDocFile(ruleId: string): string | null {
  // Try various naming conventions
  const candidates = [
    `${ruleId}.md`,
    `${ruleId.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "")}.md`,
  ];

  for (const candidate of candidates) {
    const fullPath = path.join(DOCS_DIR, candidate);
    if (fs.existsSync(fullPath)) return fullPath;
  }

  // Brute force: search docs dir
  if (fs.existsSync(DOCS_DIR)) {
    const files = fs.readdirSync(DOCS_DIR);
    const kebab = ruleId
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .replace(/^-/, "");
    for (const f of files) {
      if (f.toLowerCase() === kebab + ".md" || f.toLowerCase() === ruleId.toLowerCase() + ".md") {
        return path.join(DOCS_DIR, f);
      }
    }
  }

  return null;
}

// --- Determine applicability ---

function getApplicability(
  rule: RawRule,
  allRules: RawRule[],
): "ARM" | "DataPlane" | "Both" {
  // If it appears in arm-only, it's ARM
  // If it appears in dataplane-only, it's DataPlane
  // If it appears in common, or in both arm and dataplane, it's Both
  const sources = new Set(
    allRules.filter((r) => r.id === rule.id).map((r) => r.source),
  );

  if (sources.has("common")) return "Both";
  if (sources.has("arm") && sources.has("dataplane")) return "Both";
  if (sources.has("arm")) return "ARM";
  if (sources.has("dataplane")) return "DataPlane";
  return "Both";
}

// --- Main ---

async function main() {
  // Parse all rulesets
  const armRules = parseRulesetFile(
    path.join(SPECTRAL_DIR, "az-arm.ts"),
    "arm",
  );
  const commonRules = parseRulesetFile(
    path.join(SPECTRAL_DIR, "az-common.ts"),
    "common",
  );
  const dataplaneRules = parseRulesetFile(
    path.join(SPECTRAL_DIR, "az-dataplane.ts"),
    "dataplane",
  );
  const nativeArmRules = parseNativeArmRules();
  const legacyRules = parseLegacyRules();

  const allRules = [...armRules, ...commonRules, ...dataplaneRules, ...nativeArmRules, ...legacyRules];

  // Deduplicate by ID (keep the most specific source)
  const seen = new Map<string, RawRule>();
  for (const rule of allRules) {
    const existing = seen.get(rule.id);
    if (!existing) {
      seen.set(rule.id, rule);
    } else if (rule.source !== "common" && existing.source === "common") {
      // Prefer arm/dataplane-specific over common
      seen.set(rule.id, rule);
    }
  }

  // Get TSP linter rules
  const tspRules = await getTspLinterRules();

  // Build catalog entries
  interface CatalogEntry {
    id: string;
    applicability: string;
    severity: string;
    rpcCode: string;
    description: string;
    hasDoc: boolean;
    docPath: string | null;
    tspEquivalent: string;
    disableForTsp: boolean;
    disableReason: string;
    sources: string[];
    tier: string;
    tierRationale: string;
  }

  const catalog: CatalogEntry[] = [];

  for (const [id, rule] of seen) {
    const applicability = getApplicability(rule, allRules);
    const docPath = getDocFile(id);

    // Try to find TSP equivalent from the disable reason
    let tspEquivalent = "";
    const reason =
      rule.disableForTypeSpecReason || rule.disableForTypeSpecDataPlaneReason;
    if (reason) {
      const tspMatch = reason.match(/'(@[^']+)'/);
      if (tspMatch) tspEquivalent = tspMatch[1];
    }

    const sources = allRules
      .filter((r) => r.id === id)
      .map((r) => r.source);

    // Look up triage classification
    const triage = spectralTriage[id] ?? nativeTriage[id];

    catalog.push({
      id,
      applicability,
      severity: rule.severity,
      rpcCode: rule.rpcGuidelineCode,
      description: rule.description,
      hasDoc: docPath !== null,
      docPath,
      tspEquivalent,
      disableForTsp: rule.disableForTypeSpec || rule.disableForTypeSpecDataPlane,
      disableReason: reason,
      sources: [...new Set(sources)],
      tier: triage?.tier ?? "",
      tierRationale: triage?.rationale ?? "",
    });
  }

  // Sort: ARM first, then Both, then DataPlane; within each group alphabetical
  const order = { ARM: 0, Both: 1, DataPlane: 2 };
  catalog.sort((a, b) => {
    const ao = order[a.applicability as keyof typeof order] ?? 1;
    const bo = order[b.applicability as keyof typeof order] ?? 1;
    if (ao !== bo) return ao - bo;
    return a.id.localeCompare(b.id);
  });

  // --- Output as Markdown ---

  const lines: string[] = [];
  lines.push("# Azure OpenAPI Validator → TypeSpec Lint Coverage Catalog");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString().split("T")[0]}`);
  lines.push("");

  const infallible = catalog.filter((c) => c.tier === "Infallible").length;
  const templateEnforced = catalog.filter((c) => c.tier === "Template-enforced").length;
  const prerequisiteBlocked = catalog.filter(
    (c) => c.tier === "Prerequisite-blocked",
  ).length;
  const unconstrained = catalog.filter((c) => c.tier === "Unconstrained").length;
  const unclassified = catalog.filter((c) => !c.tier).length;

  lines.push(`Total rules: ${catalog.length}`);
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("|--------|-------|");
  lines.push(`| ARM-only | ${catalog.filter((c) => c.applicability === "ARM").length} |`);
  lines.push(`| DataPlane-only | ${catalog.filter((c) => c.applicability === "DataPlane").length} |`);
  lines.push(`| Both (common) | ${catalog.filter((c) => c.applicability === "Both").length} |`);
  lines.push(`| Known TSP equivalent | ${catalog.filter((c) => c.tspEquivalent).length} |`);
  lines.push(`| **Infallible** (no action needed) | ${infallible} |`);
  lines.push(`| **Template-enforced** (low priority) | ${templateEnforced} |`);
  lines.push(
    `| **Prerequisite-blocked** (investigate existing TypeSpec diagnostics first) | ${prerequisiteBlocked} |`,
  );
  lines.push(`| **Unconstrained** (high priority) | ${unconstrained} |`);
  if (unclassified > 0) {
    lines.push(`| Unclassified | ${unclassified} |`);
  }
  lines.push("");
  lines.push("## Classification Key");
  lines.push("");
  lines.push(
    "- **Infallible**: TypeSpec cannot generate swagger that violates this rule.",
  );
  lines.push(
    "- **Template-enforced**: Standard ARM/Core templates prevent violation; only custom operations can violate.",
  );
  lines.push(
    "- **Prerequisite-blocked**: The violating shape depends on constructs that TypeSpec already rejects, or only becomes authorable after suppressing an existing diagnostic.",
  );
  lines.push(
    "- **Unconstrained**: Can be violated even when using standard templates. Highest priority for TSP linter coverage.",
  );
  lines.push("");
  lines.push("## Catalog");
  lines.push("");

  // Group by applicability
  for (const group of ["ARM", "Both", "DataPlane"] as const) {
    const groupRules = catalog.filter((c) => c.applicability === group);
    if (groupRules.length === 0) continue;

    lines.push(`### ${group === "Both" ? "Common (ARM + DataPlane)" : `${group} Only`} (${groupRules.length} rules)`);
    lines.push("");
    lines.push(
      "| Rule | Severity | RPC Code | TSP Equivalent | Tier | Doc |",
    );
    lines.push(
      "|------|----------|----------|----------------|------|-----|",
    );

    for (const rule of groupRules) {
      const tsp = rule.tspEquivalent
        ? `\`${rule.tspEquivalent}\``
        : "—";
      const doc = rule.hasDoc ? "✓" : "—";
      const tier = rule.tier || "—";

      lines.push(
        `| ${rule.id} | ${rule.severity} | ${rule.rpcCode || "—"} | ${tsp} | ${tier} | ${doc} |`,
      );
    }

    lines.push("");
  }

  // Write output
  const outputPath = path.join(REPO_ROOT, "..", "catalog", "CATALOG.md");
  fs.writeFileSync(outputPath, lines.join("\n") + "\n");

  console.log(`Catalog written to ${outputPath}`);
  console.log(`Total rules: ${catalog.length}`);
  console.log(`  ARM-only: ${catalog.filter((c) => c.applicability === "ARM").length}`);
  console.log(`  DataPlane-only: ${catalog.filter((c) => c.applicability === "DataPlane").length}`);
  console.log(`  Both: ${catalog.filter((c) => c.applicability === "Both").length}`);
  console.log(`  Known TSP equivalent: ${catalog.filter((c) => c.tspEquivalent).length}`);
  console.log(`  Infallible: ${infallible}`);
  console.log(`  Template-enforced: ${templateEnforced}`);
  console.log(`  Prerequisite-blocked: ${prerequisiteBlocked}`);
  console.log(`  Unconstrained: ${unconstrained}`);
  if (unclassified > 0) {
    console.log(`  Unclassified: ${unclassified}`);
  }

  // Also write as JSON for programmatic use
  const jsonPath = path.join(REPO_ROOT, "..", "catalog", "catalog.json");
  fs.writeFileSync(jsonPath, JSON.stringify(catalog, null, 2) + "\n");
  console.log(`JSON catalog written to ${jsonPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
