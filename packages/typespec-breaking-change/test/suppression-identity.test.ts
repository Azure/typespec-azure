import { describe, expect, it } from "vitest";
import { analyzeProgram } from "../src/orchestrator.js";
import { TesterWithSuppressions } from "./test-host.js";
import type { Finding } from "../src/types.js";
import { isOperationIdentity } from "../src/types.js";

async function analyze(code: string): Promise<Finding[]> {
  const { program } = await TesterWithSuppressions.compile(code);
  return analyzeProgram(program).findings;
}

function errors(findings: Finding[]): Finding[] {
  return findings.filter((f) => f.severity === "error" && !f.suppressed);
}

function suppressed(findings: Finding[]): Finding[] {
  return findings.filter((f) => f.suppressed);
}

/**
 * Get the full identity path for a finding, composed from the OperationDiffIdentity fields.
 * This is what the suppression path should match against.
 */
function getFullIdentityPath(finding: Finding): string | undefined {
  const id = finding.diff.identity;
  if (!isOperationIdentity(id)) return undefined;
  if (id.component === "request") {
    return `request.${id.element}`;
  }
  if (id.component === "response") {
    const statusPrefix = id.statusCode ? `responses.${id.statusCode}` : "response";
    return `${statusPrefix}.${id.element}`;
  }
  return id.element;
}

const baseSpec = `
  @versioned(Versions)
  @service
  namespace TestService;

  enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
`;

// ═══════════════════════════════════════════════════════════════════════
// Part 1: Verify full identity path composition for each HTTP element
// ═══════════════════════════════════════════════════════════════════════

describe("identity path composition", () => {
  it("response body property → responses.{statusCode}.body.properties.{name}", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model Widget { name: string; @removed(Versions.v2) legacy?: string; }
      @route("/widgets") @get op getWidget(): Widget;
    `);
    const f = findings.find((f) => f.diff.kind === "ResponsePropertyRemoved");
    expect(f).toBeDefined();
    expect(getFullIdentityPath(f!)).toBe("responses.200.body.properties.legacy");
  });

  it("request body property → request.body.properties.{name}", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model WidgetCreate { name: string; @removed(Versions.v2) legacy?: string; }
      @route("/widgets") @post op createWidget(@body body: WidgetCreate): void;
    `);
    const f = findings.find((f) => f.diff.kind === "RequestPropertyRemoved");
    expect(f).toBeDefined();
    expect(getFullIdentityPath(f!)).toBe("request.body.properties.legacy");
  });

  it("query parameter → request.query.{name}", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model Widget { name: string; }
      @route("/widgets") @get
      op listWidgets(@removed(Versions.v2) @query filter?: string): Widget[];
    `);
    const f = findings.find((f) => f.diff.kind === "RequestQueryParameterRemoved");
    expect(f).toBeDefined();
    expect(getFullIdentityPath(f!)).toBe("request.query.filter");
  });

  it("request header → request.headers.{name}", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model Widget { name: string; }
      @route("/widgets") @get
      op getWidget(@removed(Versions.v2) @header xCustom?: string): Widget;
    `);
    const f = findings.find((f) => f.diff.kind === "RequestHeaderRemoved");
    expect(f).toBeDefined();
    expect(getFullIdentityPath(f!)).toBe("request.headers.x-custom");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Part 2: Suppression mechanics — direct vs ancestor, path required
// Uses response body properties as the representative finding type
// ═══════════════════════════════════════════════════════════════════════

describe("suppression mechanics", () => {
  // ── Direct target (no path needed) ──

  it("direct: suppression on property itself — no path needed", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model Widget {
        name: string;
        @approvedBreakingChange("approved")
        @removed(Versions.v2)
        legacy?: string;
      }
      @route("/widgets") @get op getWidget(): Widget;
    `);
    expect(errors(findings)).toHaveLength(0);
    expect(suppressed(findings).length).toBeGreaterThan(0);
  });

  it("direct: kind filter matches — suppresses", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model Widget {
        name: string;
        @approvedBreakingChange("approved", #{ kind: "ResponsePropertyRemoved" })
        @removed(Versions.v2)
        legacy?: string;
      }
      @route("/widgets") @get op getWidget(): Widget;
    `);
    expect(errors(findings)).toHaveLength(0);
  });

  it("direct: wrong kind — does NOT suppress", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model Widget {
        name: string;
        @approvedBreakingChange("approved", #{ kind: "RequestPropertyRemoved" })
        @removed(Versions.v2)
        legacy?: string;
      }
      @route("/widgets") @get op getWidget(): Widget;
    `);
    expect(errors(findings).length).toBeGreaterThan(0);
  });

  // ── Model-level ancestor ──

  it("model: WITHOUT path — does NOT suppress property finding", async () => {
    const findings = await analyze(`
      ${baseSpec}
      @approvedBreakingChange("approved")
      model Widget {
        name: string;
        @removed(Versions.v2)
        legacy?: string;
      }
      @route("/widgets") @get op getWidget(): Widget;
    `);
    expect(errors(findings).length).toBeGreaterThan(0);
  });

  it("model: WITH relative path — suppresses matching property", async () => {
    const findings = await analyze(`
      ${baseSpec}
      @approvedBreakingChange("approved", #{ path: "properties.legacy" })
      model Widget {
        name: string;
        @removed(Versions.v2)
        legacy?: string;
      }
      @route("/widgets") @get op getWidget(): Widget;
    `);
    expect(errors(findings)).toHaveLength(0);
    expect(suppressed(findings).length).toBeGreaterThan(0);
  });

  it("model: path targets one property — other NOT suppressed", async () => {
    const findings = await analyze(`
      ${baseSpec}
      @approvedBreakingChange("approved", #{ path: "properties.legacy" })
      model Widget {
        name: string;
        @removed(Versions.v2) legacy?: string;
        @removed(Versions.v2) alsoRemoved?: string;
      }
      @route("/widgets") @get op getWidget(): Widget;
    `);
    expect(suppressed(findings).length).toBeGreaterThan(0);
    expect(errors(findings).length).toBeGreaterThan(0);
  });

  it("model: wrong path — does NOT suppress", async () => {
    const findings = await analyze(`
      ${baseSpec}
      @approvedBreakingChange("approved", #{ path: "properties.nonexistent" })
      model Widget {
        name: string;
        @removed(Versions.v2)
        legacy?: string;
      }
      @route("/widgets") @get op getWidget(): Widget;
    `);
    expect(errors(findings).length).toBeGreaterThan(0);
  });

  // ── Operation-level ancestor ──

  it("operation: WITHOUT path — does NOT suppress component finding", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model Widget {
        name: string;
        @removed(Versions.v2) legacy?: string;
      }
      @route("/widgets") @get
      @approvedBreakingChange("approved")
      op getWidget(): Widget;
    `);
    expect(errors(findings).length).toBeGreaterThan(0);
  });

  it("operation: WITH absolute path — suppresses response property", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model Widget {
        name: string;
        @removed(Versions.v2) legacy?: string;
      }
      @route("/widgets") @get
      @approvedBreakingChange("approved", #{ path: "responses.200.body.properties.legacy" })
      op getWidget(): Widget;
    `);
    expect(errors(findings)).toHaveLength(0);
    expect(suppressed(findings).length).toBeGreaterThan(0);
  });

  it("operation: WITH absolute path — suppresses request body property", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model WidgetCreate {
        name: string;
        @removed(Versions.v2) legacy?: string;
      }
      @route("/widgets") @post
      @approvedBreakingChange("approved", #{ path: "request.body.properties.legacy" })
      op createWidget(@body body: WidgetCreate): void;
    `);
    expect(errors(findings)).toHaveLength(0);
  });

  it("operation: WITH absolute path — suppresses query parameter", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model Widget { name: string; }
      @route("/widgets") @get
      @approvedBreakingChange("approved", #{ path: "request.query.filter" })
      op listWidgets(@removed(Versions.v2) @query filter?: string): Widget[];
    `);
    const errs = errors(findings).filter(
      (f) => f.diff.kind === "RequestQueryParameterRemoved",
    );
    expect(errs).toHaveLength(0);
  });

  it("operation: WITH absolute path — suppresses request header", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model Widget { name: string; }
      @route("/widgets") @get
      @approvedBreakingChange("approved", #{ path: "request.headers.x-custom" })
      op getWidget(@removed(Versions.v2) @header xCustom?: string): Widget;
    `);
    const errs = errors(findings).filter(
      (f) => f.diff.kind === "RequestHeaderRemoved",
    );
    expect(errs).toHaveLength(0);
  });

  it("operation: wrong path — does NOT suppress", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model Widget {
        name: string;
        @removed(Versions.v2) legacy?: string;
      }
      @route("/widgets") @get
      @approvedBreakingChange("approved", #{ path: "responses.200.body.properties.wrong" })
      op getWidget(): Widget;
    `);
    expect(errors(findings).length).toBeGreaterThan(0);
  });

  it("operation: suppression scoped to one operation — other not suppressed", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model Widget {
        name: string;
        @removed(Versions.v2) legacy?: string;
      }
      @route("/widgets/{id}") @get
      @approvedBreakingChange("approved", #{ path: "responses.200.body.properties.legacy" })
      op getWidget(@path id: string): Widget;

      @route("/widgets") @get
      op listWidgets(): Widget[];
    `);
    expect(suppressed(findings).length).toBeGreaterThan(0);
    expect(errors(findings).length).toBeGreaterThan(0);
  });

  it("operation: inline response model — suppresses with path", async () => {
    const findings = await analyze(`
      ${baseSpec}
      @route("/widgets") @get
      @approvedBreakingChange("approved", #{ path: "responses.200.body.properties.legacy" })
      op getWidget(): { name: string; @removed(Versions.v2) legacy?: string; };
    `);
    expect(errors(findings)).toHaveLength(0);
  });

  it("operation: inline request body — suppresses with path", async () => {
    const findings = await analyze(`
      ${baseSpec}
      @route("/widgets") @post
      @approvedBreakingChange("approved", #{ path: "request.body.properties.legacy" })
      op createWidget(@body body: { name: string; @removed(Versions.v2) legacy?: string; }): void;
    `);
    expect(errors(findings)).toHaveLength(0);
  });

  // ── Namespace-level ancestor ──

  it("namespace: WITH path — suppresses matching property", async () => {
    const findings = await analyze(`
      @versioned(Versions)
      @service
      @approvedBreakingChange("approved", #{ path: "properties.legacy" })
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;
        @removed(Versions.v2) legacy?: string;
      }
      @route("/widgets") @get op getWidget(): Widget;
    `);
    expect(errors(findings)).toHaveLength(0);
    expect(suppressed(findings).length).toBeGreaterThan(0);
  });

  it("namespace: WITHOUT path — does NOT suppress property finding", async () => {
    const findings = await analyze(`
      @versioned(Versions)
      @service
      @approvedBreakingChange("approved")
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;
        @removed(Versions.v2) legacy?: string;
      }
      @route("/widgets") @get op getWidget(): Widget;
    `);
    expect(errors(findings).length).toBeGreaterThan(0);
  });

  // ── Nested property paths ──

  it("nested: absolute path from operation", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model Address { @removed(Versions.v2) city?: string; street: string; }
      model Widget { name: string; address: Address; }
      @route("/widgets") @get
      @approvedBreakingChange("approved", #{ path: "responses.200.body.properties.address.properties.city" })
      op getWidget(): Widget;
    `);
    expect(errors(findings)).toHaveLength(0);
  });

  it("nested: relative path from model", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model Address { @removed(Versions.v2) city?: string; street: string; }
      @approvedBreakingChange("approved", #{ path: "properties.city" })
      model Widget { name: string; address: Address; }
      @route("/widgets") @get op getWidget(): Widget;
    `);
    // This should work because properties.city is a suffix of the element path
    expect(errors(findings)).toHaveLength(0);
  });

  // ── Combined options ──

  it("path + wrong kind — does NOT suppress", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model Widget {
        name: string;
        @removed(Versions.v2) legacy?: string;
      }
      @route("/widgets") @get
      @approvedBreakingChange("approved", #{
        kind: "RequestPropertyRemoved",
        path: "responses.200.body.properties.legacy"
      })
      op getWidget(): Widget;
    `);
    expect(errors(findings).length).toBeGreaterThan(0);
  });

  it("path + since — version-scoped suppression", async () => {
    const findings = await analyze(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01", v3: "2026-01-01" }

      model Widget {
        name: string;
        @removed(Versions.v2) legacy?: string;
      }
      @route("/widgets") @get
      @approvedBreakingChange("approved", #{
        path: "responses.200.body.properties.legacy",
        since: "2026-01-01"
      })
      op getWidget(): Widget;
    `);
    // v1→v2 headVersion="2025-01-01" < since="2026-01-01" → NOT suppressed
    const v1v2 = findings.filter(
      (f) =>
        f.diff.kind === "ResponsePropertyRemoved" &&
        f.versionPair.headVersion === "2025-01-01",
    );
    expect(v1v2.length).toBeGreaterThan(0);
    expect(v1v2.every((f) => !f.suppressed)).toBe(true);
  });

  // ── Reporting ──

  it("unsuppressed violations are errors", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model Widget {
        name: string;
        @removed(Versions.v2) legacy?: string;
      }
      @route("/widgets") @get op getWidget(): Widget;
    `);
    const errs = errors(findings);
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0].severity).toBe("error");
    expect(errs[0].suppressed).toBeFalsy();
  });

  it("suppressed findings carry reason for review", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model Widget {
        name: string;
        @approvedBreakingChange("field no longer needed")
        @removed(Versions.v2)
        legacy?: string;
      }
      @route("/widgets") @get op getWidget(): Widget;
    `);
    const supp = suppressed(findings);
    expect(supp.length).toBeGreaterThan(0);
    expect(supp[0].suppressed).toBe(true);
    expect(supp[0].suppressionReason).toBe("field no longer needed");
  });

  it("suppressed findings not listed as unsuppressed errors", async () => {
    const findings = await analyze(`
      ${baseSpec}
      model Widget {
        name: string;
        @approvedBreakingChange("approved removal")
        @removed(Versions.v2)
        legacy?: string;
      }
      @route("/widgets") @get op getWidget(): Widget;
    `);
    const unsuppressedRemoved = findings.filter(
      (f) => f.diff.kind === "ResponsePropertyRemoved" && f.severity === "error" && !f.suppressed,
    );
    expect(unsuppressedRemoved).toHaveLength(0);
    const suppressedRemoved = findings.filter(
      (f) => f.diff.kind === "ResponsePropertyRemoved" && f.suppressed,
    );
    expect(suppressedRemoved.length).toBeGreaterThan(0);
  });
});
