import { describe, it, expect } from "vitest";
import { analyzeProgram, analyzeBaseAndHead } from "../src/pipeline/orchestrator.js";
import { TesterWithArm } from "./test-host.js";

/**
 * End-to-end scenario validation tests using real Azure ARM libraries.
 * These test the exact patterns used in Azure Resource Manager specs
 * (TrackedResource<T>, @armProviderNamespace, versioning, etc.)
 *
 * Scenarios:
 * 1. Phase B: Breaking changes with versioning (PR #2 pattern)
 * 2. Phase A: Unversioned changes (PR #4 pattern)
 * 3. Resource merge with ARM TrackedResource<T>
 * 4. Reporting: version comparisons tracked
 */

/** Contoso ARM spec — base (2 versions, no breaking changes) */
const CONTOSO_BASE = `
  @armProviderNamespace
  @service(#{ title: "Microsoft.Contoso management service" })
  @versioned(Microsoft.Contoso.Versions)
  namespace Microsoft.Contoso;

  enum Versions {
    @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
    v2021_11_01: "2021-11-01",
  }

  interface Operations extends Azure.ResourceManager.Operations {}

  model Employee is TrackedResource<EmployeeProperties> {
    ...ResourceNameParameter<Employee>;
  }

  model EmployeeProperties {
    age?: int32;
    city?: string;
    @visibility(Lifecycle.Read)
    provisioningState?: ProvisioningState;
  }

  @lroStatus
  union ProvisioningState {
    ResourceProvisioningState,
    Provisioning: "Provisioning",
    string,
  }

  @armResourceOperations
  interface Employees {
    get is ArmResourceRead<Employee>;
    createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
    update is ArmResourcePatchSync<Employee, EmployeeProperties>;
    delete is ArmResourceDeleteWithoutOkAsync<Employee>;
    listByResourceGroup is ArmResourceListByParent<Employee>;
    listBySubscription is ArmListBySubscription<Employee>;
  }
`;

/** Contoso ARM spec — PR #2 pattern (adds version with type change + removal) */
const CONTOSO_PR2 = `
  @armProviderNamespace
  @service(#{ title: "Microsoft.Contoso management service" })
  @versioned(Microsoft.Contoso.Versions)
  namespace Microsoft.Contoso;

  enum Versions {
    @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
    v2021_11_01: "2021-11-01",

    @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
    v2025_01_01: "2025-01-01",
  }

  interface Operations extends Azure.ResourceManager.Operations {}

  model Employee is TrackedResource<EmployeeProperties> {
    ...ResourceNameParameter<Employee>;
  }

  model EmployeeProperties {
    @typeChangedFrom(Versions.v2025_01_01, int32)
    age?: int64;

    @removed(Versions.v2025_01_01)
    city?: string;

    @visibility(Lifecycle.Read)
    provisioningState?: ProvisioningState;
  }

  @lroStatus
  union ProvisioningState {
    ResourceProvisioningState,
    Provisioning: "Provisioning",
    string,
  }

  @armResourceOperations
  interface Employees {
    get is ArmResourceRead<Employee>;
    createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
    update is ArmResourcePatchSync<Employee, EmployeeProperties>;
    delete is ArmResourceDeleteWithoutOkAsync<Employee>;
    listByResourceGroup is ArmResourceListByParent<Employee>;
    listBySubscription is ArmListBySubscription<Employee>;
  }
`;

/** Contoso ARM spec — PR #4 pattern (city removed without versioning) */
const CONTOSO_PR4 = `
  @armProviderNamespace
  @service(#{ title: "Microsoft.Contoso management service" })
  @versioned(Microsoft.Contoso.Versions)
  namespace Microsoft.Contoso;

  enum Versions {
    @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
    v2021_11_01: "2021-11-01",
  }

  interface Operations extends Azure.ResourceManager.Operations {}

  model Employee is TrackedResource<EmployeeProperties> {
    ...ResourceNameParameter<Employee>;
  }

  model EmployeeProperties {
    age?: int32;
    @visibility(Lifecycle.Read)
    provisioningState?: ProvisioningState;
  }

  @lroStatus
  union ProvisioningState {
    ResourceProvisioningState,
    Provisioning: "Provisioning",
    string,
  }

  @armResourceOperations
  interface Employees {
    get is ArmResourceRead<Employee>;
    createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
    update is ArmResourcePatchSync<Employee, EmployeeProperties>;
    delete is ArmResourceDeleteWithoutOkAsync<Employee>;
    listByResourceGroup is ArmResourceListByParent<Employee>;
    listBySubscription is ArmListBySubscription<Employee>;
  }
`;

describe("scenario validation: ARM end-to-end", () => {
  describe("Phase B: cross-version breaking changes (PR #2 pattern)", () => {
    it("detects type change and property removal across versions", async () => {
      const { program } = await TesterWithArm.compile(CONTOSO_PR2);
      const result = analyzeProgram(program, { phase: "cross-version" });

      const errors = result.findings.filter(
        (f) => f.severity === "error" && !f.suppressed,
      );

      const typeChanged = errors.find((f) => f.diff.kind === "ResourcePropertyTypeChanged");
      const removed = errors.find((f) => f.diff.kind === "ResourcePropertyRemoved");

      expect(typeChanged).toBeDefined();
      expect(removed).toBeDefined();

      expect(typeChanged!.diff.identity.element).toContain("age");
      expect(removed!.diff.identity.element).toContain("city");

      expect(typeChanged!.versionPair.baseVersion).toBe("2021-11-01");
      expect(typeChanged!.versionPair.headVersion).toBe("2025-01-01");
    }, 30_000);
  });
  describe("Phase A: unversioned changes (PR #4 pattern)", () => {
    it("detects city removal when comparing base to head", async () => {
      const { program: baseProgram } = await TesterWithArm.compile(CONTOSO_BASE);
      const { program: headProgram } = await TesterWithArm.compile(CONTOSO_PR4);

      const result = analyzeBaseAndHead(baseProgram, headProgram, {
        phase: "same-version",
      });

      const errors = result.findings.filter(
        (f) => f.severity === "error" && !f.suppressed,
      );

      const cityRemoved = errors.filter(
        (f) => f.diff.kind === "ResourcePropertyRemoved" &&
          f.diff.identity.element.includes("city"),
      );

      expect(cityRemoved.length).toBeGreaterThanOrEqual(1);

      for (const f of cityRemoved) {
        expect(f.versionPair.baseVersion).toBe(f.versionPair.headVersion);
        expect(f.phase).toBe("same-version");
      }
    }, 30_000);
  });

  describe("Resource merge with ARM TrackedResource<T>", () => {
    it("findings use Resource* kinds for shared properties", async () => {
      const { program } = await TesterWithArm.compile(CONTOSO_PR2);
      const result = analyzeProgram(program, { phase: "cross-version" });

      const findings = result.findings.filter((f) => f.severity === "error");
      for (const f of findings) {
        if (f.diff.identity.element.includes("properties.properties.")) {
          expect(f.diff.kind).toMatch(/^Resource/);
        }
      }
    }, 30_000);

    it("origin traces to user-declared model property, not ARM-generated copies", async () => {
      const { program } = await TesterWithArm.compile(CONTOSO_PR2);
      const result = analyzeProgram(program);

      for (const f of result.findings) {
        if (f.diff.origin) {
          // Origin should never point to visibility-filtered copies
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
      const { program } = await TesterWithArm.compile(CONTOSO_BASE);
      const result = analyzeBaseAndHead(program, program, { phase: "same-version" });

      expect(result.findings).toHaveLength(0);
    }, 30_000);
  });

  describe("reporting: version comparisons are tracked", () => {
    it("versionComparisons array is populated for Phase B", async () => {
      const { program } = await TesterWithArm.compile(CONTOSO_PR2);
      const result = analyzeProgram(program, { phase: "cross-version" });

      expect(result.summary.versionComparisons).toBeDefined();
      expect(result.summary.versionComparisons.length).toBeGreaterThanOrEqual(1);

      for (const vc of result.summary.versionComparisons) {
        expect(vc.serviceName).toBeTruthy();
        expect(vc.baseVersion).toBeTruthy();
        expect(vc.headVersion).toBeTruthy();
        expect(vc.phase).toBe("cross-version");
        expect(vc.findingCount).toBeGreaterThanOrEqual(0);
      }
    }, 30_000);

    it("summary includes phase when filtered", async () => {
      const { program } = await TesterWithArm.compile(CONTOSO_PR2);
      const result = analyzeProgram(program, { phase: "cross-version" });

      expect(result.summary.phase).toBe("cross-version");
    }, 30_000);
  });
});
