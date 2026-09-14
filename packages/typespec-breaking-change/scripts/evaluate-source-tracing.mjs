import fs from "node:fs";
import path from "node:path";
import { compile, NodeHost } from "@typespec/compiler";
import { computeDiffs } from "../dist/src/diff/diff-engine.js";
import { analyzeBaseAndHead, analyzeProgram } from "../dist/src/pipeline/orchestrator.js";
import { classifyDiffs } from "../dist/src/pipeline/policy.js";
import {
  resolveFindingLocation,
  resolveHeadSourceLocations,
} from "../dist/src/pipeline/resolve-location.js";
import {
  buildPhaseBPairs,
  createVersionedView,
  enumerateVersions,
} from "../dist/src/pipeline/versions.js";
import { applySuppressions } from "../dist/src/suppression/suppression.js";

const SPEC_ROOTS = [
  {
    name: "Network",
    root: "C:\\Users\\markcowl\\session2\\azure-rest-api-specs\\specification\\network\\resource-manager\\Microsoft.Network\\Network\\Network",
  },
  {
    name: "AppConfiguration",
    root: "C:\\Users\\markcowl\\session2\\azure-rest-api-specs\\specification\\appconfiguration\\resource-manager\\Microsoft.AppConfiguration\\AppConfiguration",
  },
  {
    name: "ContainerService/fleet",
    root: "C:\\Users\\markcowl\\session2\\azure-rest-api-specs\\specification\\containerservice\\resource-manager\\Microsoft.ContainerService\\fleet",
    note: "The task text listed Contoso.Management, but the stated 13-version / 8-pair profile matches fleet.",
  },
];

const TRACE_LEVELS = [
  "direct",
  "origin",
  "base",
  "parentModel",
  "operation",
  "namespace",
  "unresolved",
];

const REQUEST_RESPONSE_PAIRS = {
  PropertyAdded: "ResourcePropertyAdded",
  PropertyRemoved: "ResourcePropertyRemoved",
  PropertyRenamed: "ResourcePropertyRenamed",
  PropertyTypeChanged: "ResourcePropertyTypeChanged",
  PropertyTypeNarrowed: "ResourcePropertyTypeNarrowed",
  PropertyTypeWidened: "ResourcePropertyTypeWidened",
  PropertyMadeRequired: "ResourcePropertyMadeRequired",
  PropertyMadeOptional: "ResourcePropertyMadeOptional",
};

const mergeIdentityIds = new WeakMap();
let nextMergeIdentityId = 0;

async function main() {
  const outIndex = process.argv.indexOf("--out");
  const outPath = outIndex >= 0 ? process.argv[outIndex + 1] : undefined;

  const specs = [];
  for (const spec of SPEC_ROOTS) {
    specs.push(await evaluateSpec(spec));
  }

  const result = {
    generatedAt: new Date().toISOString(),
    specs,
  };

  if (outPath) {
    const resolvedOutPath = path.resolve(outPath);
    fs.mkdirSync(path.dirname(resolvedOutPath), { recursive: true });
    fs.writeFileSync(resolvedOutPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function evaluateSpec(spec) {
  const entrypoint = path.join(spec.root, "main.tsp");
  const program = await compile(NodeHost, entrypoint, { noEmit: true });
  const diagnostics = {
    errors: program.diagnostics.filter((d) => d.severity === "error").length,
    warnings: program.diagnostics.filter((d) => d.severity === "warning").length,
  };

  const services = enumerateVersions(program).map((service) => {
    const operationCounts = service.versions.map((version) => {
      const view = createVersionedView(program, service.service, version);
      const { baseCanonicalization } = computeDiffs(view, view);
      return {
        version,
        operations: baseCanonicalization.operations.size,
      };
    });

    return {
      serviceName: service.service.name,
      versions: service.versions,
      stableVersions: service.versions.filter((version) => !version.endsWith("-preview")),
      comparisonPairs: buildPhaseBPairs(service.versions, service.versions).map((pair) => ({
        baseVersion: pair.baseVersion,
        headVersion: pair.headVersion,
      })),
      operationCounts,
    };
  });

  const phaseA = analyzeBaseAndHead(program, program, { phase: "same-version" });
  const phaseB = await evaluatePhaseB(program);
  const orchestratedPhaseB = analyzeProgram(program, { phase: "cross-version" });
  if (phaseB.finalCount !== orchestratedPhaseB.findings.length) {
    throw new Error(
      `${spec.name}: replicated Phase B pipeline returned ${phaseB.finalCount} findings, ` +
        `but analyzeProgram() returned ${orchestratedPhaseB.findings.length}.`,
    );
  }

  return {
    name: spec.name,
    root: spec.root,
    note: spec.note,
    diagnostics,
    services,
    phaseA: {
      comparisons: phaseA.summary.comparisonsPerformed,
      findings: phaseA.findings.length,
      totalMs: phaseA.timing.totalMs,
    },
    phaseB,
  };
}

async function evaluatePhaseB(program) {
  const rawFindings = [];
  const pairStats = [];

  for (const service of enumerateVersions(program)) {
    const pairs = buildPhaseBPairs(service.versions, service.versions);
    for (const pair of pairs) {
      const baseView = createVersionedView(program, service.service, pair.baseVersion);
      const headView = createVersionedView(program, service.service, pair.headVersion);
      const { diffs } = computeDiffs(baseView, headView);
      const findings = classifyDiffs(diffs, pair.phase, pair).map((finding) => ({
        ...finding,
        serviceNamespace: headView.versionedNamespace ?? baseView.versionedNamespace,
      }));
      rawFindings.push(...findings);
      pairStats.push({
        baseVersion: pair.baseVersion,
        headVersion: pair.headVersion,
        rawFindings: findings.length,
      });
    }
  }

  const deduped = deduplicateBySourceType(rawFindings);
  const merged = mergeRequestResponseToResource(deduped);
  const collapsed = collapsePhaseADuplicates(merged);
  const finalFindings = applySuppressions(collapsed, program);
  resolveHeadSourceLocations(finalFindings, program);

  const traceCounts = Object.fromEntries(TRACE_LEVELS.map((level) => [level, 0]));
  const lowTraceFindings = [];
  let originCount = 0;
  let resolvedCount = 0;

  for (const finding of finalFindings) {
    if (finding.diff.origin) {
      originCount++;
    }

    const resolved = resolveFindingLocation(finding);
    const sourceTraceLevel = resolved?.sourceTraceLevel ?? "unresolved";
    traceCounts[sourceTraceLevel]++;
    if (resolved) {
      resolvedCount++;
    }

    if (sourceTraceLevel === "operation" || sourceTraceLevel === "namespace" || !resolved) {
      const reason = inferFallbackReason(finding, sourceTraceLevel);
      lowTraceFindings.push({
        diffKind: finding.diff.kind,
        elementPath: finding.diff.identity.element,
        versionPair: `${finding.versionPair.baseVersion}->${finding.versionPair.headVersion}`,
        sourceTraceLevel,
        category: reason.category,
        why: reason.why,
        operation:
          "operation" in finding.diff.identity
            ? `${finding.diff.identity.operation.method} ${finding.diff.identity.operation.path}`
            : undefined,
        baseType: describeType(finding.diff.baseType),
        headType: describeType(finding.diff.headType),
        origin: finding.diff.origin?.declarationPath,
      });
    }
  }

  const fallbackCategories = summarizeFallbackCategories(lowTraceFindings);

  return {
    pairStats,
    rawCount: rawFindings.length,
    dedupedCount: deduped.length,
    mergedCount: merged.length,
    finalCount: finalFindings.length,
    originCount,
    resolvedCount,
    traceCounts,
    lowTraceFindings,
    fallbackCategories,
  };
}

function deduplicateBySourceType(findings) {
  const seenByNode = new Map();
  const seenByString = new Set();
  const result = [];

  for (const finding of findings) {
    const versionKey = `${finding.versionPair.baseVersion}|${finding.versionPair.headVersion}`;
    const kindVersionKey = `${finding.diff.kind}|${versionKey}`;
    const sourceType = finding.diff.headType ?? finding.diff.baseType;
    const dedupKey = sourceType?.node ?? sourceType;

    if (dedupKey) {
      let kindSet = seenByNode.get(dedupKey);
      if (!kindSet) {
        kindSet = new Set();
        seenByNode.set(dedupKey, kindSet);
      }
      if (kindSet.has(kindVersionKey)) {
        continue;
      }
      kindSet.add(kindVersionKey);
    } else {
      const stringKey = `${finding.diff.kind}|${finding.diff.identity.element}|${versionKey}`;
      if (seenByString.has(stringKey)) {
        continue;
      }
      seenByString.add(stringKey);
    }

    result.push(finding);
  }

  return result;
}

function mergeRequestResponseToResource(findings) {
  const result = [];
  const consumed = new Set();
  const responseIndex = new Map();

  for (const finding of findings) {
    if (!finding.diff.kind.startsWith("Response")) {
      continue;
    }

    const suffix = getPropertySuffix(finding.diff.kind, "Response");
    if (!suffix || !REQUEST_RESPONSE_PAIRS[suffix]) {
      continue;
    }

    responseIndex.set(buildMergeKey(finding, suffix), finding);
  }

  for (const finding of findings) {
    if (!finding.diff.kind.startsWith("Request")) {
      continue;
    }

    const suffix = getPropertySuffix(finding.diff.kind, "Request");
    if (!suffix || !REQUEST_RESPONSE_PAIRS[suffix]) {
      continue;
    }

    const match = responseIndex.get(buildMergeKey(finding, suffix));
    if (match && match.suppressed === finding.suppressed) {
      consumed.add(finding);
      consumed.add(match);
      result.push({
        ...finding,
        diff: {
          ...finding.diff,
          kind: REQUEST_RESPONSE_PAIRS[suffix],
        },
        severity: "error",
        rule: "resource-contract-change",
      });
    }
  }

  for (const finding of findings) {
    if (!consumed.has(finding)) {
      result.push(finding);
    }
  }

  return result;
}

function collapsePhaseADuplicates(findings) {
  const seen = new Set();
  const result = [];

  for (const finding of findings) {
    if (finding.phase !== "same-version") {
      result.push(finding);
      continue;
    }

    const key = `${finding.diff.kind}|${finding.diff.identity.element}|${finding.suppressed}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(finding);
  }

  return result;
}

function getPropertySuffix(kind, prefix) {
  return kind.startsWith(prefix) ? kind.substring(prefix.length) : undefined;
}

function buildMergeKey(finding, suffix) {
  const versionKey = `${finding.versionPair.baseVersion}|${finding.versionPair.headVersion}`;
  const suppressedKey = finding.suppressed ? "s" : "u";
  return `${getMergeIdentityKey(finding)}|${versionKey}|${suffix}|${suppressedKey}`;
}

function getMergeIdentityKey(finding) {
  const sourceType = finding.diff.headType ?? finding.diff.baseType;
  const mergeIdentity = sourceType?.node ?? sourceType;

  if (mergeIdentity && typeof mergeIdentity === "object") {
    let id = mergeIdentityIds.get(mergeIdentity);
    if (id === undefined) {
      id = nextMergeIdentityId++;
      mergeIdentityIds.set(mergeIdentity, id);
    }
    return `node:${id}`;
  }

  return `path:${finding.diff.identity.element}`;
}

function inferFallbackReason(finding, sourceTraceLevel) {
  if (sourceTraceLevel === "operation") {
    if (!finding.diff.baseType && !finding.diff.headType) {
      return {
        category: "operation-lifecycle",
        why: "No base/head type or origin was available, so the resolver used operationSourceLocation.",
      };
    }

    if (finding.diff.identity.element.startsWith("query.") || finding.diff.identity.element.startsWith("path.") || finding.diff.identity.element.startsWith("headers.")) {
      return {
        category: "parameter-without-declaration-anchor",
        why: "The diff is attached to a wire-level parameter rather than a ModelProperty with a declaration/sourceProperty chain.",
      };
    }

    return {
      category: "missing-type-location",
      why: "A type existed, but it had no valid direct/origin/base/parent-model location, so resolution fell back to the operation.",
    };
  }

  if (sourceTraceLevel === "namespace") {
    return {
      category: "service-level-diff",
      why: "The diff had no operation-specific source anchor, so the resolver fell back to the service namespace.",
    };
  }

  return {
    category: "unresolved",
    why: "No direct, origin, base, parent-model, operation, or namespace source location could be resolved.",
  };
}

function summarizeFallbackCategories(lowTraceFindings) {
  const categories = new Map();

  for (const finding of lowTraceFindings) {
    const category = categories.get(finding.category) ?? {
      count: 0,
      examples: [],
    };
    category.count++;
    if (category.examples.length < 3) {
      category.examples.push({
        diffKind: finding.diffKind,
        elementPath: finding.elementPath,
        versionPair: finding.versionPair,
        operation: finding.operation,
        sourceTraceLevel: finding.sourceTraceLevel,
      });
    }
    categories.set(finding.category, category);
  }

  return Object.fromEntries(categories);
}

function describeType(type) {
  if (!type) {
    return undefined;
  }

  return `${type.kind}${type.name ? `:${type.name}` : ""}`;
}

main().catch((error) => {
  process.stderr.write(`${error?.stack ?? error}\n`);
  process.exitCode = 1;
});
