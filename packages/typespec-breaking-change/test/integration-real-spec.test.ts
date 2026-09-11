import { compile, NodeHost } from "@typespec/compiler";
import { describe, expect, it } from "vitest";
import { computeDiffs } from "../src/diff/diff-engine.js";
import { analyzeBaseAndHead, analyzeProgram } from "../src/pipeline/orchestrator.js";
import { createVersionedView, enumerateVersions } from "../src/pipeline/versions.js";
import {
  getRealSpecEntryPoint,
  realSpecBaseRepository,
  realSpecRepository,
} from "./real-spec-repository.js";
import { realSpecCases, type RealSpecCase } from "./real-specs-manifest.js";

const describeExternal = realSpecRepository ? describe : describe.skip;
const programCache = new Map<string, Awaited<ReturnType<typeof compile>>>();

describeExternal("integration: azure-rest-api-specs", () => {
  for (const specCase of realSpecCases) {
    describe(`${specCase.plane}: ${specCase.name}`, () => {
      it(
        "compiles and runs the cross-version analysis pipeline",
        { timeout: specCase.timeoutMs },
        async () => {
          const validation = validateCrossVersionCase(specCase);
          if (specCase.expectedCanonicalizationError) {
            await expect(validation).rejects.toThrow(specCase.expectedCanonicalizationError);
          } else {
            await validation;
          }
        },
      );

      // Lightweight Phase A sanity check: comparing a real spec's compiled
      // program to itself must always yield zero findings. Unlike the
      // dual-checkout "azure-rest-api-specs base/head" suite below, this
      // requires only the single checkout already used for Phase B, so it
      // runs unconditionally for every case (no AZURE_REST_API_SPECS_BASE
      // needed) and catches any Phase A regression on real spec shapes.
      it(
        "Phase A same-version comparison against itself yields no findings",
        { timeout: specCase.timeoutMs },
        async () => {
          if (specCase.expectedCanonicalizationError) {
            return;
          }
          const program = await compileCase(realSpecRepository!, specCase);
          const result = analyzeBaseAndHead(program, program, {
            phase: "same-version",
            serviceName: specCase.serviceName,
          });
          expect(result.findings).toHaveLength(0);
        },
      );
    });
  }
});

describe.skipIf(!realSpecRepository || !realSpecBaseRepository)(
  "integration: azure-rest-api-specs base/head",
  () => {
    const phaseACase = realSpecCases.find((specCase) => specCase.phaseABaseline);

    it(
      "compares separate real-spec compilations for the same API versions",
      { timeout: phaseACase?.timeoutMs ?? 120_000 },
      async () => {
        expect(phaseACase).toBeDefined();

        const [baseProgram, headProgram] = await Promise.all([
          compileCase(realSpecBaseRepository!, phaseACase!),
          compileCase(realSpecRepository!, phaseACase!),
        ]);
        const baseErrors = baseProgram.diagnostics.filter(
          (diagnostic) => diagnostic.severity === "error",
        );
        const headErrors = headProgram.diagnostics.filter(
          (diagnostic) => diagnostic.severity === "error",
        );
        expect(formatDiagnostics(baseErrors)).toBe("");
        expect(formatDiagnostics(headErrors)).toBe("");

        const result = analyzeBaseAndHead(baseProgram, headProgram, {
          phase: "same-version",
          serviceName: phaseACase!.serviceName,
        });

        expect(result.summary.phase).toBe("same-version");
        expect(result.findings.every((finding) => finding.phase === "same-version")).toBe(true);
        expect(result.findings.every((finding) => finding.severity === "error")).toBe(true);
        expectFindingsAreDeduplicated(result.findings);
      },
    );
  },
);

async function compileCase(repository: string, specCase: RealSpecCase) {
  const entryPoint = getRealSpecEntryPoint(repository, specCase);
  const cached = programCache.get(entryPoint);
  if (cached) {
    return cached;
  }

  const program = await compile(NodeHost, entryPoint, { noEmit: true });
  programCache.set(entryPoint, program);
  return program;
}

async function validateCrossVersionCase(specCase: RealSpecCase): Promise<void> {
  const program = await compileCase(realSpecRepository!, specCase);
  const errors = program.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  expect(formatDiagnostics(errors)).toBe("");

  const services = enumerateVersions(program);
  const service = services.find((candidate) => candidate.service.name === specCase.serviceName);

  expect(service).toBeDefined();
  expect(service!.versions.length).toBeGreaterThanOrEqual(specCase.minimumVersions);

  const firstView = createVersionedView(program, service!.service, service!.versions[0]);
  const firstOperations = computeDiffs(firstView, firstView).baseCanonicalization.operations.size;
  expect(firstOperations).toBeGreaterThanOrEqual(specCase.minimumOperations);

  if (specCase.minimumLatestOperations !== undefined) {
    const lastView = createVersionedView(
      program,
      service!.service,
      service!.versions[service!.versions.length - 1],
    );
    const lastOperations = computeDiffs(lastView, lastView).baseCanonicalization.operations.size;
    expect(lastOperations).toBeGreaterThanOrEqual(specCase.minimumLatestOperations);
    expect(lastOperations).toBeGreaterThanOrEqual(firstOperations);
  }

  const result = analyzeProgram(program, {
    phase: "cross-version",
    serviceName: specCase.serviceName,
  });

  expect(result.summary.servicesAnalyzed).toBe(1);
  expect(result.summary.comparisonsPerformed).toBeGreaterThanOrEqual(specCase.minimumComparisons);
  expect(result.findings.every((finding) => finding.phase === "cross-version")).toBe(true);
  expectFindingsAreDeduplicated(result.findings);

  if (specCase.minimumOriginCoveragePercent !== undefined) {
    expectMinimumOriginCoverage(result.findings, specCase.minimumOriginCoveragePercent);
  }

  if (specCase.maxAnalysisMs !== undefined) {
    expect(
      result.timing.totalMs,
      `Analysis took ${result.timing.totalMs}ms, exceeding budget of ${specCase.maxAnalysisMs}ms`,
    ).toBeLessThan(specCase.maxAnalysisMs);
  }
}

function expectFindingsAreDeduplicated(
  findings: ReturnType<typeof analyzeProgram>["findings"],
): void {
  const seen = new Set<string>();

  for (const finding of findings) {
    const origin = finding.diff.origin?.declarationPath;
    if (!origin) {
      continue;
    }

    const key = [
      origin,
      finding.diff.kind,
      finding.versionPair.baseVersion,
      finding.versionPair.headVersion,
    ].join("::");
    expect(seen.has(key), `Duplicate finding: ${key}`).toBe(false);
    seen.add(key);
  }
}

function expectMinimumOriginCoverage(
  findings: ReturnType<typeof analyzeProgram>["findings"],
  minimumPercent: number,
): void {
  const total = findings.length;
  if (total === 0) {
    // No findings means there's nothing to trace an origin for; coverage is
    // vacuously satisfied rather than a division-by-zero failure.
    return;
  }

  const withOrigin = findings.filter((finding) => finding.diff.origin).length;
  const percent = (withOrigin / total) * 100;

  expect(
    percent,
    `Origin coverage ${withOrigin}/${total} (${Math.round(percent)}%) is below the required ${minimumPercent}%`,
  ).toBeGreaterThanOrEqual(minimumPercent);
}

function formatDiagnostics(
  diagnostics: Awaited<ReturnType<typeof compile>>["diagnostics"],
): string {
  return diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join("\n");
}
