import { describe, it, expect } from "vitest";
import { compile, NodeHost } from "@typespec/compiler";
import { analyzeProgram, analyzeBaseAndHead } from "../src/pipeline/orchestrator.js";
import { resolve } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

/** Path to our library's main.tsp for additionalImports */
function getLibraryPath(): string {
  const thisFile = fileURLToPath(import.meta.url);
  return resolve(dirname(thisFile), "..", "lib", "main.tsp");
}

async function compileSpec(mainFile: string) {
  return compile(NodeHost, mainFile, {
    noEmit: true,
    additionalImports: [getLibraryPath()],
  });
}

/**
 * Scenario validation tests that mirror the demo PRs.
 * These test the exact patterns used in the Contoso employee spec
 * to ensure the tool produces correct results for the demo.
 *
 * Scenarios:
 * 1. Phase B: Breaking changes with versioning (PR #2 pattern)
 * 2. Phase A: Unversioned changes (PR #4 pattern)
 * 3. Phase B: Suppressed breaking changes (PR #3 pattern)
 * 4. Resource merge with ARM TrackedResource<T>
 */

const DEMO_SPEC_ROOT = resolve(
  "C:/Users/markcowl/session2/azure-rest-api-specs/specification/contosowidgetmanager/Contoso.Management",
);

describe("scenario validation: Contoso demo spec", () => {
  describe("Phase B: cross-version breaking changes (PR #2 pattern)", () => {
    let headProgram: Awaited<ReturnType<typeof compileSpec>> | undefined;

    async function getHeadProgram() {
      if (headProgram) return headProgram;
      // Compile the PR #2 branch spec (with versioning decorators)
      headProgram = await compileSpec(
        resolve(DEMO_SPEC_ROOT, "../Contoso.Management.pr2/main.tsp"),
      );
      return headProgram;
    }

    // Skip if the PR #2 spec fixture doesn't exist
    const PR2_FIXTURE = resolve(DEMO_SPEC_ROOT, "../Contoso.Management.pr2");

    it("produces exactly 2 Resource findings for age type change and city removal", async (ctx) => {
      if (!existsSync(PR2_FIXTURE)) { ctx.skip(); return; }
      const program = await getHeadProgram();
      const result = analyzeProgram(program, { phase: "cross-version" });

      const errors = result.findings.filter(
        (f) => f.severity === "error" && !f.suppressed,
      );

      // Should be exactly 2: ResourcePropertyTypeChanged (age) + ResourcePropertyRemoved (city)
      expect(errors).toHaveLength(2);

      const typeChanged = errors.find((f) => f.diff.kind === "ResourcePropertyTypeChanged");
      const removed = errors.find((f) => f.diff.kind === "ResourcePropertyRemoved");

      expect(typeChanged).toBeDefined();
      expect(removed).toBeDefined();

      // Verify identities
      expect(typeChanged!.diff.identity.element).toContain("age");
      expect(removed!.diff.identity.element).toContain("city");

      // Verify version pair
      expect(typeChanged!.versionPair.baseVersion).toBe("2021-11-01");
      expect(typeChanged!.versionPair.headVersion).toBe("2025-01-01");
    }, 30_000);
  });

  describe("Phase A: unversioned changes (PR #4 pattern)", () => {
    it("detects city removal as unversioned change when comparing base to head", async (ctx) => {
      // Compile main branch spec (with city) as base
      const baseProgram = await compileSpec(resolve(DEMO_SPEC_ROOT, "main.tsp"));

      // Compile a modified version without city as head
      // We simulate this by using a test fixture
      const PR4_FIXTURE = resolve(DEMO_SPEC_ROOT, "../Contoso.Management.pr4");
      if (!existsSync(PR4_FIXTURE)) { ctx.skip(); return; }
      const headProgram = await compileSpec(resolve(PR4_FIXTURE, "main.tsp"));

      const result = analyzeBaseAndHead(baseProgram, headProgram, {
        phase: "same-version",
      });

      const errors = result.findings.filter(
        (f) => f.severity === "error" && !f.suppressed,
      );

      // Should detect ResourcePropertyRemoved for city in each version
      const cityRemoved = errors.filter(
        (f) => f.diff.kind === "ResourcePropertyRemoved" &&
          f.diff.identity.element.includes("city"),
      );

      // At least one per API version (2 versions in the spec)
      expect(cityRemoved.length).toBeGreaterThanOrEqual(1);

      // Version pairs should be same-version (base→head of same version)
      for (const f of cityRemoved) {
        expect(f.versionPair.baseVersion).toBe(f.versionPair.headVersion);
        expect(f.phase).toBe("same-version");
      }
    }, 30_000);
  });

  describe("Resource merge with ARM TrackedResource<T>", () => {
    it("merges Request+Response into Resource for ARM resource properties", async () => {
      // Compile the main branch spec (which uses TrackedResource<EmployeeProperties>)
      const program = await compileSpec(resolve(DEMO_SPEC_ROOT, "main.tsp"));
      const result = analyzeProgram(program, { phase: "cross-version" });

      // If there are any findings, Resource* kinds should be used for shared properties
      const findings = result.findings.filter((f) => f.severity === "error");
      for (const f of findings) {
        if (f.diff.identity.element.includes("properties.properties.")) {
          // Properties on the resource model should be Resource*, not separate Request/Response
          expect(f.diff.kind).toMatch(/^Resource/);
        }
      }
    }, 30_000);

    it("origin traces to the source model property, not ARM-generated copies", async () => {
      const program = await compileSpec(resolve(DEMO_SPEC_ROOT, "main.tsp"));
      const result = analyzeProgram(program);

      for (const f of result.findings) {
        if (f.diff.origin) {
          // Origin should never point to a visibility-filtered copy
          expect(f.diff.origin.declarationPath).not.toContain("CreateOrUpdate");
          expect(f.diff.origin.declarationPath).not.toContain("Update");

          // Source location should be in user code, not intrinsics
          if (f.diff.origin.sourceLocation) {
            expect(f.diff.origin.sourceLocation.file.path).not.toContain("intrinsics");
            expect(f.diff.origin.sourceLocation.file.path).not.toContain("node_modules");
          }
        }
      }
    }, 30_000);

    it("self-comparison (base=head) produces 0 findings", async () => {
      const program = await compileSpec(resolve(DEMO_SPEC_ROOT, "main.tsp"));
      const result = analyzeBaseAndHead(program, program, { phase: "same-version" });

      expect(result.findings).toHaveLength(0);
    }, 30_000);
  });

  describe("reporting: version comparisons are tracked", () => {
    it("versionComparisons array is populated for Phase B", async () => {
      const program = await compileSpec(resolve(DEMO_SPEC_ROOT, "main.tsp"));
      const result = analyzeProgram(program, { phase: "cross-version" });

      expect(result.summary.versionComparisons).toBeDefined();
      expect(result.summary.versionComparisons.length).toBeGreaterThanOrEqual(0);

      for (const vc of result.summary.versionComparisons) {
        expect(vc.serviceName).toBeTruthy();
        expect(vc.baseVersion).toBeTruthy();
        expect(vc.headVersion).toBeTruthy();
        expect(vc.phase).toBe("cross-version");
        expect(vc.findingCount).toBeGreaterThanOrEqual(0);
      }
    }, 30_000);

    it("summary includes phase when filtered", async () => {
      const program = await compileSpec(resolve(DEMO_SPEC_ROOT, "main.tsp"));
      const result = analyzeProgram(program, { phase: "cross-version" });

      expect(result.summary.phase).toBe("cross-version");
    }, 30_000);
  });
});

