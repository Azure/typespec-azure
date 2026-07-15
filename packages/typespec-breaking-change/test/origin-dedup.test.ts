import { describe, expect, it } from "vitest";
import { computeDiffs } from "../src/diff-engine.js";
import { resolveOrigin } from "../src/origin.js";
import { applySuppressions } from "../src/suppression.js";
import { classifyDiffs } from "../src/policy.js";
import type { VersionedView } from "../src/types.js";
import { createVersionedView, enumerateVersions } from "../src/versions.js";
import { Tester, TesterWithSuppressions } from "./test-host.js";

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Two-spec comparison: compile base and head as separate programs,
 * then compare the same version across them. This is the real Phase A scenario.
 */
async function compileTwoSpecs(
  baseSpec: string,
  headSpec: string,
  version: string = "2024-01-01",
): Promise<{ baseView: VersionedView; headView: VersionedView }> {
  const strip = (s: string) => s.replace(/^\s*using TypeSpec\.(Http|Versioning);\s*$/gm, "");

  const { program: baseProgram } = await Tester.compile(strip(baseSpec));
  const { program: headProgram } = await Tester.compile(strip(headSpec));

  const [baseService] = enumerateVersions(baseProgram);
  const [headService] = enumerateVersions(headProgram);

  expect(baseService).toBeDefined();
  expect(headService).toBeDefined();

  return {
    baseView: createVersionedView(baseProgram, baseService.service, version),
    headView: createVersionedView(headProgram, headService.service, version),
  };
}

/** Single-spec helper: two versions within one compilation. */
async function compileVersionedViews(spec: string): Promise<{
  baseView: VersionedView;
  headView: VersionedView;
}> {
  const normalizedSpec = spec.replace(/^\s*using TypeSpec\.(Http|Versioning);\s*$/gm, "");
  const { program } = await Tester.compile(normalizedSpec);
  const [service] = enumerateVersions(program);

  expect(service).toBeDefined();
  expect(service.versions).toHaveLength(2);

  return {
    baseView: createVersionedView(program, service.service, service.versions[0]),
    headView: createVersionedView(program, service.service, service.versions[1]),
  };
}

const VERSION = "2024-01-01";
const preamble = `
  @versioned(Versions)
  @service
  namespace TestService;
  enum Versions { v1: "${VERSION}" }
`;

// ────────────────────────────────────────────────────────────────────────────
// Origin Resolution — Direct Coverage
// ────────────────────────────────────────────────────────────────────────────

describe("origin resolution (direct coverage)", () => {
  it("returns undefined when no type is provided", () => {
    expect(resolveOrigin()).toBeUndefined();
  });

  it("resolves enum and union-variant origins in nested namespaces", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace Outer.Inner;
      enum Versions { v1: "${VERSION}" }

      enum Color { Red }
      union Direction { North: "north", South: "south" }
    `);

    const outer = program.getGlobalNamespaceType().namespaces.get("Outer");
    const inner = outer?.namespaces.get("Inner");

    expect(inner).toBeDefined();
    expect(resolveOrigin(inner!.enums.get("Color")!)?.declarationPath).toBe("Outer.Inner.Color");
    expect(resolveOrigin(inner!.unions.get("Direction")!.variants.get("North")!)?.declarationPath).toBe(
      "Outer.Inner.Direction",
    );
  });

  it("returns undefined for unnamed scalar, enum-member, and union-variant declarations", () => {
    expect(resolveOrigin({ kind: "Scalar", name: "" } as any)).toBeUndefined();
    expect(resolveOrigin({ kind: "EnumMember", enum: { name: "", namespace: undefined } } as any)).toBeUndefined();
    expect(resolveOrigin({ kind: "UnionVariant", union: { name: "", namespace: undefined } } as any)).toBeUndefined();
  });

  it("climbs anonymous property types when a parent property is discoverable", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace Outer.Inner;
      enum Versions { v1: "${VERSION}" }

      model Widget { config: string; }
    `);

    const outer = program.getGlobalNamespaceType().namespaces.get("Outer");
    const inner = outer?.namespaces.get("Inner");
    const widget = inner?.models.get("Widget");
    const config = widget?.properties.get("config");

    expect(config).toBeDefined();

    const anonymousModel = {
      kind: "Model",
      name: "(anonymous model)",
      namespace: inner,
      node: {
        parent: {
          parent: {
            symbol: { type: config },
          },
        },
      },
    } as any;

    const extra = {
      kind: "ModelProperty",
      name: "extra",
      model: anonymousModel,
    } as any;

    expect(resolveOrigin(extra)?.declarationPath).toBe("Outer.Inner.Widget.config");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Origin Resolution — Two-Spec Comparison
// ────────────────────────────────────────────────────────────────────────────

describe("origin resolution (two-spec comparison)", () => {
  it("named model type change resolves origin to the model", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        model Envelope { value: string; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Envelope;
      `,
      `
        ${preamble}
        model Widget { name: string; }
        model Envelope { value: Widget; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Envelope;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const typeChange = diffs.find(
      (d) =>
        d.kind === "ResponsePropertyTypeChanged" &&
        d.identity.element === "body.properties.value",
    );

    expect(typeChange).toBeDefined();
    expect(typeChange!.origin).toBeDefined();
    expect(typeChange!.origin!.declarationPath).toBe("TestService.Widget");
  });

  it("anonymous inline model type change has no origin", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        model Envelope { value: string; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Envelope;
      `,
      `
        ${preamble}
        model Envelope { value: { name: string; }; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Envelope;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const typeChange = diffs.find(
      (d) =>
        d.kind === "ResponsePropertyTypeChanged" &&
        d.identity.element === "body.properties.value",
    );

    expect(typeChange).toBeDefined();
    expect(typeChange!.origin).toBeUndefined();
  });

  it("resolves origin for named model property removal", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        model Widget { name: string; legacyField?: string; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      `
        ${preamble}
        model Widget { name: string; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const removal = diffs.find((d) => d.kind === "ResponsePropertyRemoved");

    expect(removal).toBeDefined();
    expect(removal!.origin).toBeDefined();
    expect(removal!.origin!.declarationPath).toContain("Widget");
    expect(removal!.origin!.declarationPath).toContain("legacyField");
    expect(removal!.origin!.sourceLocation).toBeDefined();
  });

  it("resolves origin for named model property addition", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        model Widget { name: string; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      `
        ${preamble}
        model Widget { name: string; extra?: string; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const addition = diffs.find((d) => d.kind === "ResponsePropertyAdded");

    expect(addition).toBeDefined();
    expect(addition!.origin).toBeDefined();
    expect(addition!.origin!.declarationPath).toContain("Widget");
    expect(addition!.origin!.declarationPath).toContain("extra");
  });

  it("resolves spread properties back to source declaration", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        model Base { sharedField?: string; }
        model Widget { ...Base; name: string; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      `
        ${preamble}
        model Base { }
        model Widget { ...Base; name: string; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const removal = diffs.find((d) => d.kind === "ResponsePropertyRemoved");

    expect(removal).toBeDefined();
    expect(removal!.origin).toBeDefined();
    // Origin should trace back to Base, not Widget
    expect(removal!.origin!.declarationPath).toContain("Base");
  });

  it("resolves enum member removal origin to parent enum", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        enum Status { Active, Inactive }
        model Widget { name: string; status: Status; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      `
        ${preamble}
        enum Status { Active }
        model Widget { name: string; status: Status; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const enumRemoval = diffs.find((d) => d.kind === "EnumerationMemberRemoved");

    expect(enumRemoval).toBeDefined();
    expect(enumRemoval!.origin).toBeDefined();
    expect(enumRemoval!.origin!.declarationPath).toContain("Status");
  });

  it("anonymous inline property removal has no resolved origin", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        model Widget {
          config: {
            extra?: string;
          };
        }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      `
        ${preamble}
        model Widget {
          config: {};
        }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const removal = diffs.find(
      (d) =>
        d.kind === "ResponsePropertyRemoved" &&
        d.identity.element === "body.properties.config.properties.extra",
    );

    expect(removal).toBeDefined();
    expect(removal!.origin).toBeUndefined();
  });

  it("named union type change resolves origin to the union", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        @route("/widgets/{id}") @get op getWidget(@path id: string): string;
      `,
      `
        ${preamble}
        union Direction { North: "north", South: "south", East: "east" }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Direction;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const typeChange = diffs.find((d) => d.kind === "ResponseTypeKindChanged");

    expect(typeChange).toBeDefined();
    expect(typeChange!.origin).toBeDefined();
    expect(typeChange!.origin!.declarationPath).toContain("Direction");
  });

  it("named scalar type change resolves origin to the scalar", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        scalar WidgetId extends string;
        model Widget { id: string; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      `
        ${preamble}
        scalar WidgetId extends string;
        model Widget { id: WidgetId; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const scalarChange = diffs.find(
      (d) =>
        d.kind === "ResponsePropertyTypeChanged" && d.identity.element === "body.properties.id",
    );

    expect(scalarChange).toBeDefined();
    expect(scalarChange!.origin).toBeDefined();
    expect(scalarChange!.origin!.declarationPath).toContain("WidgetId");
  });

  it("literal union variant removal resolves to parent union origin", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        union Direction { "north", "south", "east" }
        model Widget { dir: Direction; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      `
        ${preamble}
        union Direction { "north", "south" }
        model Widget { dir: Direction; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const variantRemoval = diffs.find(
      (d) =>
        d.kind === "ResponsePropertyTypeNarrowed" &&
        d.identity.element === 'body.properties.dir.variants."east"',
    );

    expect(variantRemoval).toBeDefined();
    // Literal variant in a named union resolves to the parent union
    expect(variantRemoval!.origin).toBeDefined();
    expect(variantRemoval!.origin!.declarationPath).toContain("Direction");
  });

  it("operation added has no origin", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        model Widget { name: string; }
        @route("/widgets") @get op listWidgets(): Widget[];
      `,
      `
        ${preamble}
        model Widget { name: string; }
        @route("/widgets") @get op listWidgets(): Widget[];
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const opAdded = diffs.find((d) => d.kind === "OperationAdded");

    expect(opAdded).toBeDefined();
    expect(opAdded!.origin).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Origin Resolution — Single-Spec Versioning
// ────────────────────────────────────────────────────────────────────────────

describe("origin resolution (single-spec versioning)", () => {
  it("resolves origin for versioned property removal", async () => {
    const { baseView, headView } = await compileVersionedViews(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;
        @removed(Versions.v2) legacyField?: string;
      }

      @route("/widgets/{id}") @get
      op getWidget(@path id: string): Widget;
    `);

    const { diffs } = computeDiffs(baseView, headView);
    const removal = diffs.find((d) => d.kind === "ResponsePropertyRemoved");

    expect(removal).toBeDefined();
    expect(removal!.origin).toBeDefined();
    expect(removal!.origin!.declarationPath).toContain("Widget");
  });

  it("resolves enum member origin in versioned spec", async () => {
    const { baseView, headView } = await compileVersionedViews(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      enum Status {
        Active,
        @removed(Versions.v2) Inactive,
      }

      model Widget { name: string; status: Status; }
      @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
    `);

    const { diffs } = computeDiffs(baseView, headView);
    const enumRemoval = diffs.find((d) => d.kind === "EnumerationMemberRemoved");

    expect(enumRemoval).toBeDefined();
    expect(enumRemoval!.origin).toBeDefined();
    expect(enumRemoval!.origin!.declarationPath).toContain("Status");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Deduplication — Two-Spec Comparison
// ────────────────────────────────────────────────────────────────────────────

describe("deduplication (two-spec comparison)", () => {
  it("deduplicates shared model diffs across operations", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        model Widget { name: string; }
        @route("/widgets") @get op listWidgets(): Widget[];
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      `
        ${preamble}
        model Widget { name: string; tags?: string[]; }
        @route("/widgets") @get op listWidgets(): Widget[];
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const responseAdded = diffs.filter(
      (d) => d.kind === "ResponsePropertyAdded" && "operation" in d.identity,
    );

    // Deduplicated to 1 finding with 2 affected operations
    expect(responseAdded).toHaveLength(1);
    expect(responseAdded[0].details?.affectedOperations).toBeDefined();
    expect((responseAdded[0].details?.affectedOperations as any[]).length).toBe(2);
  });

  it("does NOT deduplicate same model in request vs response", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        model Widget { name: string; }
        @route("/widgets") @post op createWidget(@body body: Widget): Widget;
      `,
      `
        ${preamble}
        model Widget { name: string; extra?: string; }
        @route("/widgets") @post op createWidget(@body body: Widget): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const requestAdded = diffs.filter((d) => d.kind === "RequestPropertyAdded");
    const responseAdded = diffs.filter((d) => d.kind === "ResponsePropertyAdded");

    // Different DiffKinds → not deduplicated
    expect(requestAdded.length).toBeGreaterThanOrEqual(1);
    expect(responseAdded.length).toBeGreaterThanOrEqual(1);
  });

  it("keeps separate findings for different properties on same model", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        model Widget { name: string; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      `
        ${preamble}
        model Widget { name: string; tags?: string[]; color?: string; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const responseAdded = diffs.filter((d) => d.kind === "ResponsePropertyAdded");

    expect(responseAdded).toHaveLength(2);
  });

  it("does not deduplicate operation-level diffs (no origin)", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        model Widget { name: string; }
        @route("/widgets") @get op listWidgets(): Widget[];
      `,
      `
        ${preamble}
        model Widget { name: string; }
        @route("/widgets") @get op listWidgets(): Widget[];
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
        @route("/widgets") @post op createWidget(@body body: Widget): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const opAdded = diffs.filter((d) => d.kind === "OperationAdded");

    expect(opAdded).toHaveLength(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Deduplication — Single-Spec Versioning
// ────────────────────────────────────────────────────────────────────────────

describe("deduplication (single-spec versioning)", () => {
  it("deduplicates shared model across operations", async () => {
    const { baseView, headView } = await compileVersionedViews(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;
        @added(Versions.v2) tags?: string[];
      }

      @route("/widgets") @get op listWidgets(): Widget[];
      @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
    `);

    const { diffs } = computeDiffs(baseView, headView);
    const responseAdded = diffs.filter(
      (d) =>
        d.kind === "ResponsePropertyAdded" &&
        "operation" in d.identity &&
        d.identity.element === "body.properties.tags",
    );

    expect(responseAdded).toHaveLength(1);
    expect(responseAdded[0].details?.affectedOperations).toBeDefined();
    expect((responseAdded[0].details?.affectedOperations as any[]).length).toBe(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Suppression with Origin
// ────────────────────────────────────────────────────────────────────────────

describe("suppression with origin", () => {
  it("suppression on declaring model applies via origin lookup", async () => {
    const spec = `
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      @approvedBreakingChange("removing legacy field")
      model Widget {
        name: string;
        @removed(Versions.v2) legacyField?: string;
      }

      @route("/widgets") @get op listWidgets(): Widget[];
      @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
    `.replace(/^\s*using TypeSpec\.(Http|Versioning);\s*$/gm, "");

    const { program } = await TesterWithSuppressions.compile(spec);
    const [service] = enumerateVersions(program);
    const baseView = createVersionedView(program, service.service, service.versions[0]);
    const headView = createVersionedView(program, service.service, service.versions[1]);

    const { diffs } = computeDiffs(baseView, headView);
    const findings = classifyDiffs(diffs, "cross-version", {
      baseVersion: service.versions[0],
      headVersion: service.versions[1],
      phase: "cross-version",
    });

    const suppressed = applySuppressions(findings, program);
    const errorFindings = suppressed.filter((f) => f.severity === "error");

    const unsuppressedRemovals = errorFindings.filter(
      (f) => f.diff.kind === "ResponsePropertyRemoved" && !f.suppressed,
    );
    expect(unsuppressedRemovals).toHaveLength(0);

    const suppressedRemovals = errorFindings.filter(
      (f) => f.diff.kind === "ResponsePropertyRemoved" && f.suppressed,
    );
    expect(suppressedRemovals.length).toBeGreaterThanOrEqual(1);
  });
});
