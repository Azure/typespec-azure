import { describe, it, expect } from "vitest";
import { compile, NodeHost } from "@typespec/compiler";
import type { Program } from "@typespec/compiler";
import { analyzeProgram, analyzeBaseAndHead } from "../src/orchestrator.js";
import { enumerateVersions, createVersionedView, buildPhaseBPairs } from "../src/versions.js";
import { computeDiffs } from "../src/diff-engine.js";
import { resolve } from "path";

/**
 * Integration test against a REAL Azure ARM TypeSpec spec (Microsoft.AppConfiguration).
 * This validates:
 * - N1: Origin resolution on TrackedResource<T>, ResourceOperations, extends/is patterns
 * - N2: Dedup grouping on real ARM spec with many operations
 * - N4: End-to-end CLI/orchestrator pipeline with real spec
 * - Q8: Performance (should complete in <60s)
 */
const APP_CONFIG_ROOT = resolve(
  "C:/Users/markcowl/session2/azure-rest-api-specs/specification/appconfiguration/resource-manager/Microsoft.AppConfiguration/AppConfiguration",
);

const NETWORK_ROOT = resolve(
  "C:/Users/markcowl/session2/azure-rest-api-specs/specification/network/resource-manager/Microsoft.Network/Network/Network",
);

describe("integration: real ARM spec (AppConfiguration)", () => {
  let program: Awaited<ReturnType<typeof compile>> | undefined;

  async function getProgram() {
    if (program) return program;
    program = await compile(NodeHost, resolve(APP_CONFIG_ROOT, "main.tsp"), {
      noEmit: true,
    });
    return program;
  }

  it("compiles the real spec without errors", async () => {
    const prog = await getProgram();
    const errors = prog.diagnostics.filter((d) => d.severity === "error");
    expect(errors).toHaveLength(0);
  }, 60_000);

  it("enumerates multiple versions from the spec", async () => {
    const prog = await getProgram();
    const services = enumerateVersions(prog);

    expect(services.length).toBeGreaterThanOrEqual(1);
    const appConfig = services.find((s) => s.service.name === "AppConfiguration");
    expect(appConfig).toBeDefined();
    expect(appConfig!.versions.length).toBeGreaterThanOrEqual(2);
  }, 60_000);

  it("discovers HTTP operations through ARM resource patterns", async () => {
    const prog = await getProgram();
    const services = enumerateVersions(prog);
    const appConfig = services.find((s) => s.service.name === "AppConfiguration")!;

    const view = createVersionedView(prog, appConfig.service, appConfig.versions[0]);
    const diffResult = computeDiffs(view, view); // diff against self to just count ops

    // ARM patterns (is ArmResourceRead<T>, etc.) should expand into many HTTP operations
    expect(diffResult.baseCanonicalization.operations.size).toBeGreaterThanOrEqual(10);
  }, 60_000);

  it("analyzeProgram runs Phase B (cross-version) without crashing", async () => {
    const prog = await getProgram();
    const result = analyzeProgram(prog, { phase: "cross-version" });

    // Should produce at least some findings or zero findings — either is valid.
    // The important thing is it completes without throwing.
    expect(result).toBeDefined();
    expect(result.findings).toBeDefined();
    expect(Array.isArray(result.findings)).toBe(true);
    expect(result.timing.totalMs).toBeLessThan(60_000);
  }, 60_000);

  it("analyzeBaseAndHead runs Phase A (same-version) against itself", async () => {
    const prog = await getProgram();
    // Using the same program as both base and head should yield 0 findings
    const result = analyzeBaseAndHead(prog, prog, { phase: "same-version" });

    expect(result).toBeDefined();
    expect(result.findings).toHaveLength(0); // no changes when comparing to self
    expect(result.timing.totalMs).toBeLessThan(60_000);
  }, 60_000);

  it("findings have valid origin declarations when present", async () => {
    const prog = await getProgram();
    const result = analyzeProgram(prog, { phase: "cross-version" });

    for (const finding of result.findings) {
      if (finding.diff.origin) {
        expect(finding.diff.origin.declarationPath).toBeTruthy();
        expect(finding.diff.origin.declarationPath.length).toBeGreaterThan(0);
      }
    }
  }, 60_000);

  it("findings are properly deduplicated (no duplicate declaration+kind combos)", async () => {
    const prog = await getProgram();
    const result = analyzeProgram(prog, { phase: "cross-version" });

    // Check that dedup is working: no two findings share the same origin+kind
    const seen = new Set<string>();
    for (const finding of result.findings) {
      if (finding.diff.origin) {
        const key = `${finding.diff.origin.declarationPath}::${finding.diff.kind}::${finding.versionPair.baseVersion}->${finding.versionPair.headVersion}`;
        // Same key can appear for different version pairs, but NOT for the same pair
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  }, 60_000);

  it("performance: full analysis completes in under 30 seconds", async () => {
    const prog = await getProgram();
    const start = Date.now();
    const result = analyzeProgram(prog);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(30_000);
    // Log timing for visibility
    console.log(
      `AppConfiguration full analysis: ${elapsed}ms, ${result.findings.length} findings`,
    );
    console.log(`  Timing breakdown:`, result.timing);
  }, 60_000);
});

describe("integration: large ARM spec (Network, 739 operations)", () => {
  let program: Awaited<ReturnType<typeof compile>> | undefined;

  async function getProgram() {
    if (program) return program;
    program = await compile(NodeHost, resolve(NETWORK_ROOT, "main.tsp"), {
      noEmit: true,
    });
    return program;
  }

  it("compiles the large network spec without errors", async () => {
    const prog = await getProgram();
    const errors = prog.diagnostics.filter((d) => d.severity === "error");
    expect(errors).toHaveLength(0);
  }, 120_000);

  it("discovers 700+ operations through ARM resource patterns", async () => {
    const prog = await getProgram();
    const services = enumerateVersions(prog);
    expect(services.length).toBeGreaterThanOrEqual(1);

    const network = services[0];
    const view = createVersionedView(prog, network.service, network.versions[0]);
    const diffResult = computeDiffs(view, view);

    expect(diffResult.baseCanonicalization.operations.size).toBeGreaterThanOrEqual(700);
  }, 120_000);

  it("full analysis completes in under 30 seconds", async () => {
    const prog = await getProgram();
    const start = Date.now();
    const result = analyzeProgram(prog);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(30_000);
    console.log(
      `Network full analysis: ${elapsed}ms, ${result.findings.length} findings`,
    );
    console.log(`  Timing breakdown:`, result.timing);
    console.log(`  Findings by severity:`, {
      error: result.findings.filter((f) => f.severity === "error").length,
      ignore: result.findings.filter((f) => f.severity === "ignore").length,
    });
  }, 120_000);

  it("origin resolution achieves >50% coverage on large spec", async () => {
    const prog = await getProgram();
    const result = analyzeProgram(prog);

    const withOrigin = result.findings.filter((f) => f.diff.origin).length;
    const total = result.findings.length;
    const pct = total > 0 ? (withOrigin / total) * 100 : 100;

    console.log(`  Origin coverage: ${withOrigin}/${total} (${Math.round(pct)}%)`);
    expect(pct).toBeGreaterThanOrEqual(50);
  }, 120_000);

  it("deduplication reduces finding count", async () => {
    const prog = await getProgram();
    const result = analyzeProgram(prog);

    // With 739 operations and shared models, dedup should significantly reduce findings
    // Without dedup, we'd see hundreds of duplicates for shared model changes
    expect(result.findings.length).toBeLessThan(200);
  }, 120_000);
});

/**
 * Integration test against ContainerService/fleet — a spec with MANY versions (13).
 * Tests version-count scaling: 3 stable + 10 preview → 8 Phase B pairs.
 * Performance target: <30s for full analysis.
 */
const FLEET_ROOT = resolve(
  "C:/Users/markcowl/session2/azure-rest-api-specs/specification/containerservice/resource-manager/Microsoft.ContainerService/fleet",
);

describe("integration: many-version spec (ContainerService/fleet, 13 versions)", () => {
  let program: Awaited<ReturnType<typeof compile>> | undefined;

  async function getProgram() {
    if (program) return program;
    program = await compile(NodeHost, resolve(FLEET_ROOT, "main.tsp"), {
      noEmit: true,
    });
    return program;
  }

  it("compiles the fleet spec without errors", async () => {
    const prog = await getProgram();
    const errors = prog.diagnostics.filter((d) => d.severity === "error");
    expect(errors).toHaveLength(0);
  }, 60_000);

  it("discovers 13 versions across stable and preview", async () => {
    const prog = await getProgram();
    const services = enumerateVersions(prog);
    expect(services.length).toBe(1);

    const fleet = services[0];
    expect(fleet.service.name).toBe("ContainerService");
    expect(fleet.versions.length).toBe(13);

    // Verify version ordering: 3 stable interspersed with preview
    const stableVersions = fleet.versions.filter((v) => !v.endsWith("-preview"));
    expect(stableVersions).toEqual(["2023-10-15", "2024-04-01", "2025-03-01"]);
  }, 60_000);

  it("generates correct Phase B pairs (each candidate vs previous stable)", async () => {
    const prog = await getProgram();
    const services = enumerateVersions(prog);
    const fleet = services[0];

    const pairs = buildPhaseBPairs(fleet.versions, fleet.versions);

    // Preview versions before first stable have no stable baseline → skipped
    // After 2023-10-15: 2024-02-02-preview compared to 2023-10-15
    // After 2024-04-01: 2024-05-02-preview compared to 2024-04-01
    // After 2025-03-01: 2025-04-01-preview, 2025-08-01-preview, etc. compared to 2025-03-01
    expect(pairs.length).toBe(8);

    // First four versions are preview with no prior stable → no pairs
    // Verify specific pair structure
    expect(pairs[0]).toMatchObject({
      baseVersion: "2023-10-15",
      headVersion: "2024-02-02-preview",
    });
    expect(pairs[1]).toMatchObject({
      baseVersion: "2023-10-15",
      headVersion: "2024-04-01",
    });
  }, 60_000);

  it("operation count grows across versions (12 → 42)", async () => {
    const prog = await getProgram();
    const services = enumerateVersions(prog);
    const fleet = services[0];

    const firstView = createVersionedView(prog, fleet.service, fleet.versions[0]);
    const lastView = createVersionedView(prog, fleet.service, fleet.versions[fleet.versions.length - 1]);

    const firstOps = computeDiffs(firstView, firstView).baseCanonicalization.operations.size;
    const lastOps = computeDiffs(lastView, lastView).baseCanonicalization.operations.size;

    expect(firstOps).toBeGreaterThanOrEqual(10);
    expect(lastOps).toBeGreaterThanOrEqual(35);
    expect(lastOps).toBeGreaterThan(firstOps);

    console.log(`  Fleet operations: ${firstOps} (first) → ${lastOps} (last)`);
  }, 60_000);

  it("full Phase B analysis completes in under 30 seconds", async () => {
    const prog = await getProgram();
    const start = Date.now();
    const result = analyzeProgram(prog, { phase: "cross-version" });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(30_000);
    expect(result.summary.comparisonsPerformed).toBe(8);
    expect(result.findings.length).toBeGreaterThan(0);

    console.log(`  Fleet analysis: ${elapsed}ms, ${result.findings.length} findings, ${result.summary.comparisonsPerformed} pairs`);
    console.log(`  Timing:`, result.timing);
  }, 60_000);

  it("version mutator time scales linearly with pair count", async () => {
    const prog = await getProgram();
    const result = analyzeProgram(prog, { phase: "cross-version" });

    // 8 pairs × 2 views each = 16 versioned views at ~170ms each ≈ ~2.7s
    // Allow up to 1s per view (generous for CI variability)
    const msPerView = result.timing.versionMutatorsMs / (result.summary.comparisonsPerformed * 2);
    expect(msPerView).toBeLessThan(1000);

    console.log(`  Per-view mutator time: ${Math.round(msPerView)}ms`);
  }, 60_000);

  it("findings have proper version pair references", async () => {
    const prog = await getProgram();
    const result = analyzeProgram(prog, { phase: "cross-version" });

    const versionPairs = new Set(
      result.findings.map((f) => `${f.versionPair.baseVersion}->${f.versionPair.headVersion}`),
    );

    // All findings should reference valid Phase B pairs (stable → candidate)
    for (const finding of result.findings) {
      expect(finding.versionPair.baseVersion).not.toContain("-preview");
      expect(finding.phase).toBe("cross-version");
    }

    console.log(`  Active version pairs with findings: ${versionPairs.size}`);
    for (const pair of versionPairs) {
      const count = result.findings.filter(
        (f) => `${f.versionPair.baseVersion}->${f.versionPair.headVersion}` === pair,
      ).length;
      console.log(`    ${pair}: ${count} findings`);
    }
  }, 60_000);

  it("deduplication works across many version pairs", async () => {
    const prog = await getProgram();
    const result = analyzeProgram(prog, { phase: "cross-version" });

    // With 8 pairs sharing many of the same model changes, dedup should help
    const withOrigin = result.findings.filter((f) => f.diff.origin).length;
    const total = result.findings.length;
    const originPct = total > 0 ? (withOrigin / total) * 100 : 100;

    console.log(`  Origin coverage: ${withOrigin}/${total} (${Math.round(originPct)}%)`);
    // At least some findings should have origin (shared models)
    expect(withOrigin).toBeGreaterThan(0);
  }, 60_000);
});
