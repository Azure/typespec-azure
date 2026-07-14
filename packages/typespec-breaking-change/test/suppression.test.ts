import { describe, expect, it } from "vitest";
import {
  applySuppressions,
  classifyDiffs,
  computeDiffs,
  createVersionedView,
  enumerateVersions,
  type Finding,
  type VersionPair,
  type VersionedView,
} from "../src/index.js";
import { Tester, TesterWithSuppressions } from "./test-host.js";

describe("applySuppressions", () => {
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

  it("marks a matching breaking-change suppression as suppressed", async () => {
    const { program, diffs } = await compileDiffsWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("migrating to new field")
        @removed(Versions.v2)
        legacy?: string;

        name: string;
      }

      @route("/widgets")
      @post
      op createWidget(@body widget: Widget): Widget;
    `);

    const findings = applySuppressions(
      classifyDiffs(diffs, "cross-version", crossVersionPair),
      program,
    );
    const finding = getFinding(findings, "RequestPropertyRemoved");

    expect(finding.suppressed).toBe(true);
    expect(finding.suppressionReason).toBe("migrating to new field");
  });

  it("leaves findings unsuppressed when no decorator matches", async () => {
    const { program, diffs } = await compileDiffs(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @removed(Versions.v2)
        legacy?: string;

        name: string;
      }

      @route("/widgets")
      @post
      op createWidget(@body widget: Widget): Widget;
    `);

    const findings = applySuppressions(
      classifyDiffs(diffs, "cross-version", crossVersionPair),
      program,
    );
    const finding = getFinding(findings, "RequestPropertyRemoved");

    expect(finding.suppressed).toBe(false);
    expect(finding.suppressionReason).toBeUndefined();
  });

  it("does not suppress mismatched DiffKinds", async () => {
    const { program, diffs } = await compileDiffsWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("reason", "RequestPropertyRemoved")
        @typeChangedFrom(Versions.v2, string)
        count: int32;
      }

      @route("/widgets")
      @post
      op createWidget(@body widget: Widget): Widget;
    `);

    const findings = applySuppressions(
      classifyDiffs(diffs, "cross-version", crossVersionPair),
      program,
    );
    const finding = getFinding(findings, "RequestPropertyTypeChanged");

    expect(finding.suppressed).toBe(false);
    expect(finding.suppressionReason).toBeUndefined();
  });

  it("applies parent model suppressions to child property diffs", async () => {
    const { program, diffs } = await compileDiffsWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      @approvedBreakingChange("refactoring model")
      model Widget {
        @removed(Versions.v2)
        legacy?: string;

        name: string;
      }

      @route("/widgets")
      @post
      op createWidget(@body widget: Widget): Widget;
    `);

    const findings = applySuppressions(
      classifyDiffs(diffs, "cross-version", crossVersionPair),
      program,
    );
    const finding = getFinding(findings, "RequestPropertyRemoved");

    expect(finding.suppressed).toBe(true);
    expect(finding.suppressionReason).toBe("refactoring model");
  });

  it("uses unversioned suppressions for same-version findings", async () => {
    const { program, diffs } = await compileDiffsWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2025-01-01", v2: "2026-01-01" }

      model Widget {
        @approvedUnversionedChange("hotfix")
        @added(Versions.v2)
        nickname?: string;

        name: string;
      }

      @route("/widgets")
      @post
      op createWidget(@body widget: Widget): Widget;
    `);

    const findings = applySuppressions(
      classifyDiffs(diffs, "same-version", sameVersionPair),
      program,
    );
    const finding = getFinding(findings, "RequestPropertyAdded");

    expect(finding.suppressed).toBe(true);
    expect(finding.suppressionReason).toBe("hotfix");
  });

  it("does not change ignore-severity findings even when a suppression exists", async () => {
    const { program, diffs } = await compileDiffsWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("optional expansion")
        @added(Versions.v2)
        nickname?: string;

        name: string;
      }

      @route("/widgets")
      @post
      op createWidget(@body widget: Widget): Widget;
    `);

    const findings = classifyDiffs(diffs, "cross-version", crossVersionPair);
    const finding = getFinding(findings, "RequestPropertyAdded");
    const suppressedFindings = applySuppressions(findings, program);

    expect(finding.severity).toBe("ignore");
    expect(getFinding(suppressedFindings, "RequestPropertyAdded")).toBe(finding);
    expect(finding.suppressed).toBe(false);
    expect(finding.suppressionReason).toBeUndefined();
  });
});

async function compileDiffs(specBody: string): Promise<{
  program: Awaited<ReturnType<typeof Tester.compile>>["program"];
  diffs: ReturnType<typeof computeDiffs>["diffs"];
}> {
  return compileDiffsWithTester(specBody, Tester);
}

async function compileDiffsWithSuppressions(specBody: string): Promise<{
  program: Awaited<ReturnType<typeof Tester.compile>>["program"];
  diffs: ReturnType<typeof computeDiffs>["diffs"];
}> {
  return compileDiffsWithTester(specBody, TesterWithSuppressions);
}

async function compileDiffsWithTester(
  specBody: string,
  tester: typeof Tester,
): Promise<{
  program: Awaited<ReturnType<typeof Tester.compile>>["program"];
  diffs: ReturnType<typeof computeDiffs>["diffs"];
}> {
  const { program } = await tester.compile(specBody);
  const [service] = enumerateVersions(program);

  expect(service).toBeDefined();
  expect(service.versions).toHaveLength(2);

  const views = getViews(program, service.service, service.versions[0], service.versions[1]);

  return {
    program,
    diffs: computeDiffs(views.baseView, views.headView).diffs,
  };
}

function getViews(
  program: Awaited<ReturnType<typeof Tester.compile>>["program"],
  service: Parameters<typeof createVersionedView>[1],
  baseVersion: string,
  headVersion: string,
): { baseView: VersionedView; headView: VersionedView } {
  return {
    baseView: createVersionedView(program, service, baseVersion),
    headView: createVersionedView(program, service, headVersion),
  };
}

function getFinding(findings: Finding[], kind: Finding["diff"]["kind"]): Finding {
  const finding = findings.find((candidate) => candidate.diff.kind === kind);
  expect(finding).toBeDefined();
  return finding!;
}
