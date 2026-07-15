import { describe, it, expect } from "vitest";
import { compile, NodeHost } from "@typespec/compiler";
import type { Program } from "@typespec/compiler";
import { analyzeProgram, analyzeBaseAndHead } from "../src/orchestrator.js";
import { enumerateVersions, createVersionedView } from "../src/versions.js";
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
