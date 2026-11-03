import { compile, NodeHost } from "@typespec/compiler";
import fs from "node:fs";
import path from "node:path";
import { computeDiffs } from "../dist/src/diff/diff-engine.js";
import { analyzeBaseAndHead, analyzeProgram } from "../dist/src/pipeline/orchestrator.js";
import { resolveFindingLocation } from "../dist/src/pipeline/resolve-location.js";
import {
  buildPhaseBPairs,
  createVersionedView,
  enumerateVersions,
} from "../dist/src/pipeline/versions.js";

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
  "ancestor",
  "origin",
  "base",
  "parentModel",
  "operation",
  "namespace",
  "unresolved",
];

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
  const stageCounts = {};
  const analysis = analyzeProgram(program, {
    phase: "cross-version",
    onStage: (stage, findings) => {
      stageCounts[stage] = findings.length;
    },
  });
  const pairStats = analysis.summary.versionComparisons.map((pair) => ({
    serviceName: pair.serviceName,
    baseVersion: pair.baseVersion,
    headVersion: pair.headVersion,
    rawFindings: pair.rawFindingCount ?? pair.findingCount,
  }));
  const finalFindings = analysis.findings;

  const traceCounts = Object.fromEntries(TRACE_LEVELS.map((level) => [level, 0]));
  const lowTraceFindings = [];
  let originCount = 0;
  let resolvedCount = 0;
  const fallbackCategories = {};

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
      const lowTraceFinding = {
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
      };
      lowTraceFindings.push(lowTraceFinding);
      const category = (fallbackCategories[reason.category] ??= { count: 0, examples: [] });
      category.count++;
      if (category.examples.length < 3) {
        category.examples.push({
          diffKind: lowTraceFinding.diffKind,
          elementPath: lowTraceFinding.elementPath,
          versionPair: lowTraceFinding.versionPair,
          operation: lowTraceFinding.operation,
          sourceTraceLevel,
        });
      }
    }
  }

  return {
    pairStats,
    rawCount: stageCounts.classified,
    dedupedCount: stageCounts.deduplicated,
    mergedCount: stageCounts["resource-merged"],
    finalCount: finalFindings.length,
    originCount,
    resolvedCount,
    traceCounts,
    lowTraceFindings,
    fallbackCategories,
  };
}

function inferFallbackReason(finding, sourceTraceLevel) {
  if (sourceTraceLevel === "operation") {
    if (!finding.diff.baseType && !finding.diff.headType) {
      return {
        category: "operation-lifecycle",
        why: "No base/head type or origin was available, so the resolver used operationSourceLocation.",
      };
    }

    if (
      finding.diff.identity.element.startsWith("query.") ||
      finding.diff.identity.element.startsWith("path.") ||
      finding.diff.identity.element.startsWith("headers.")
    ) {
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
