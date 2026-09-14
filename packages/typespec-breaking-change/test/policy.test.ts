import { describe, expect, it } from "vitest";
import {
  classifyDiffs,
  computeDiffs,
  createVersionedView,
  enumerateVersions,
  type ApiDiff,
  type VersionPair,
  type VersionedView,
} from "../src/index.js";
import { Tester } from "./test-host.js";

function createDiff(kind: ApiDiff["kind"]): ApiDiff {
  return {
    kind,
    identity: {
      operation: { method: "POST", path: "/widgets" },
      component: "request",
      element: "body",
    },
    message: `Diff for ${kind}`,
  };
}

describe("classifyDiffs", () => {
  const sameVersionPair: VersionPair = {
    baseVersion: "2025-01-01",
    headVersion: "2025-01-01",
    phase: "same-version",
  };

  const crossVersionPair: VersionPair = {
    baseVersion: "2024-01-01",
    headVersion: "2025-01-01",
    phase: "cross-version",
  };

  it("marks all same-version diffs as errors", () => {
    const findings = classifyDiffs(
      [createDiff("OperationAdded"), createDiff("ResponsePropertyAdded")],
      "same-version",
      sameVersionPair,
    );

    expect(findings).toEqual([
      expect.objectContaining({
        severity: "error",
        rule: "phase-a-any-change",
        phase: "same-version",
        suppressed: false,
        versionPair: sameVersionPair,
      }),
      expect.objectContaining({
        severity: "error",
        rule: "phase-a-any-change",
        phase: "same-version",
        suppressed: false,
        versionPair: sameVersionPair,
      }),
    ]);
  });

  it("classifies representative cross-version breaking changes as errors", () => {
    const findings = classifyDiffs(
      [
        createDiff("RequestParameterMadeRequired"),
        createDiff("ResponseTypeWidened"),
        createDiff("RequestEncodingChanged"),
      ],
      "cross-version",
      crossVersionPair,
    );

    expect(findings).toEqual([
      expect.objectContaining({ severity: "error", rule: "request-narrowing" }),
      expect.objectContaining({ severity: "error", rule: "response-widening" }),
      expect.objectContaining({ severity: "error", rule: "encoding-change" }),
    ]);
  });

  it("classifies representative cross-version compatible changes as ignored", () => {
    const findings = classifyDiffs(
      [
        createDiff("OperationAdded"),
        createDiff("RequestTypeWidened"),
        createDiff("ResponsePropertyAdded"),
        createDiff("DefaultValueChanged"),
      ],
      "cross-version",
      crossVersionPair,
    );

    expect(findings).toEqual([
      expect.objectContaining({ severity: "ignore", rule: "operation-lifecycle" }),
      expect.objectContaining({ severity: "ignore", rule: "request-widening" }),
      expect.objectContaining({ severity: "ignore", rule: "response-narrowing" }),
      expect.objectContaining({ severity: "ignore", rule: "default-value-change" }),
    ]);
  });

  it("preserves diff metadata on findings", () => {
    const diff = createDiff("AuthSchemeRemoved");
    const [finding] = classifyDiffs([diff], "cross-version", crossVersionPair);

    expect(finding.diff).toBe(diff);
    expect(finding.phase).toBe("cross-version");
    expect(finding.versionPair).toBe(crossVersionPair);
    expect(finding.suppressed).toBe(false);
  });

  describe("integration", () => {
    it("Phase A classifies any diff as error", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget {
          name: string;
          @added(Versions.v2) age?: int32;
        }

        @route("/widgets/{id}")
        @get
        op getWidget(@path id: string): Widget;
      `);

      const { diffs } = computeDiffs(baseView, headView);
      const findings = classifyDiffs(diffs, "same-version", sameVersionPair);

      expect(diffs.length).toBeGreaterThan(0);
      expect(findings).toHaveLength(diffs.length);
      expect(findings.every((finding) => finding.severity === "error")).toBe(true);
    });

    it("Phase B classifies added optional response property as ignore", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget {
          name: string;
          @added(Versions.v2) age?: int32;
        }

        @route("/widgets/{id}")
        @get
        op getWidget(@path id: string): Widget;
      `);

      const { diffs } = computeDiffs(baseView, headView);
      const findings = classifyDiffs(diffs, "cross-version", crossVersionPair);
      const responsePropertyAdded = findings.find(
        (finding) => finding.diff.kind === "ResponsePropertyAdded",
      );

      expect(responsePropertyAdded).toBeDefined();
      expect(responsePropertyAdded).toEqual(
        expect.objectContaining({
          severity: "ignore",
          rule: "response-narrowing",
          phase: "cross-version",
        }),
      );
    });

    it("Phase B classifies added request property as error", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget {
          name: string;
          @added(Versions.v2) age: int32;
        }

        @route("/widgets")
        @post
        op createWidget(@body widget: Widget): Widget;
      `);

      const { diffs } = computeDiffs(baseView, headView);
      const findings = classifyDiffs(diffs, "cross-version", crossVersionPair);
      const requestPropertyAdded = findings.find(
        (finding) => finding.diff.kind === "RequestPropertyAdded",
      );

      expect(requestPropertyAdded).toBeDefined();
      expect(requestPropertyAdded).toEqual(
        expect.objectContaining({
          severity: "error",
          rule: "request-narrowing",
          phase: "cross-version",
        }),
      );
    });

    it("Phase B classifies encoding change as error", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget {
          name: string;

          @removed(Versions.v2)
          @renamedFrom(Versions.v2, "createdAt")
          createdAtV1: utcDateTime;

          @added(Versions.v2)
          @encode("unixTimestamp", int32)
          createdAt: utcDateTime;
        }

        @route("/widgets/{id}")
        @get
        op getWidget(@path id: string): Widget;
      `);

      const { diffs } = computeDiffs(baseView, headView);
      const findings = classifyDiffs(diffs, "cross-version", crossVersionPair);
      const typeChangeFindings = findings.filter((finding) =>
        /TypeChanged|EncodingChanged|TypeKindChanged/.test(finding.diff.kind),
      );

      expect(typeChangeFindings.length).toBeGreaterThan(0);
      expect(typeChangeFindings.every((finding) => finding.severity === "error")).toBe(true);
    });

    it("Phase B classifies added optional request property as ignore", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget {
          name: string;
          @added(Versions.v2) nickname?: string;
        }

        @route("/widgets")
        @post
        op createWidget(@body widget: Widget): Widget;
      `);

      const { diffs } = computeDiffs(baseView, headView);
      const findings = classifyDiffs(diffs, "cross-version", crossVersionPair);
      const requestPropertyAdded = findings.find(
        (finding) => finding.diff.kind === "RequestPropertyAdded",
      );

      expect(requestPropertyAdded).toBeDefined();
      expect(requestPropertyAdded).toEqual(
        expect.objectContaining({
          severity: "ignore",
          rule: "request-widening",
          phase: "cross-version",
        }),
      );
    });
  });
});

async function compileViews(spec: string): Promise<{
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
