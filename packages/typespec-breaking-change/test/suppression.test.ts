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
import { BreakingChangeStateKeys } from "../src/lib.js";
import { Tester, TesterWithSuppressions } from "./test-host.js";

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

describe("applySuppressions", () => {
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

  it("leaves findings unchanged when there is no target type", async () => {
    const { program } = await Tester.compile(`
      namespace Test;

      model Widget {}
    `);

    const [finding] = applySuppressions(
      [
        {
          diff: {
            kind: "ResponsePropertyRemoved",
            identity: {
              operation: { method: "GET", path: "/widgets/{}" },
              component: "response",
              statusCode: "200",
              element: "body.properties.name",
            },
            message: "missing target type",
          },
          severity: "error",
          rule: "test",
          phase: "cross-version",
          suppressed: false,
          versionPair: crossVersionPair,
        },
      ],
      program,
    );

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

  it("does not suppress when the collected suppression kind filter does not match", async () => {
    const { program } = await Tester.compile(`
      namespace Test;

      model Widget {
        name: string;
      }
    `);

    const widget = getModel(program, "Widget");
    program
      .stateMap(BreakingChangeStateKeys.approvedBreakingChange)
      .set(widget, [{ kind: "RequestPropertyRemoved", reason: "request only" }]);

    const [finding] = applySuppressions(
      [createFinding("ResponsePropertyRemoved", widget, "body.properties.name")],
      program,
    );

    expect(finding.suppressed).toBe(false);
    expect(finding.suppressionReason).toBeUndefined();
  });

  it("does not suppress when the suppression version is newer than the finding", async () => {
    const { program } = await Tester.compile(`
      namespace Test;

      model Widget {
        name: string;
      }
    `);

    const widget = getModel(program, "Widget");
    program
      .stateMap(BreakingChangeStateKeys.approvedBreakingChange)
      .set(widget, [{ reason: "future approval", version: "2026-01-01" } as any]);

    const [finding] = applySuppressions(
      [createFinding("ResponsePropertyRemoved", widget, "body.properties.name")],
      program,
    );

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

  it("suppresses via origin type when origin differs from the target type", async () => {
    const { program } = await Tester.compile(`
      namespace Test;

      model Widget {
        name: string;
      }
    `);

    const widget = getModel(program, "Widget");
    const name = widget.properties.get("name")!;
    program
      .stateMap(BreakingChangeStateKeys.approvedBreakingChange)
      .set(widget, [{ reason: "origin model approval" }]);

    const [finding] = applySuppressions(
      [
        createFinding("ResponsePropertyRemoved", name.type, "body.properties.name", {
          declarationPath: "Test.Widget",
          type: widget,
          sourceLocation: undefined as any,
        }),
      ],
      program,
    );

    expect(finding.suppressed).toBe(true);
    expect(finding.suppressionReason).toBe("origin model approval");
  });

  it("suppresses when a path-based suppression matches the element suffix", async () => {
    const { program } = await Tester.compile(`
      namespace Test;

      model Widget {
        name: string;
      }
    `);

    const widget = getModel(program, "Widget");
    program
      .stateMap(BreakingChangeStateKeys.approvedBreakingChange)
      .set(widget, [{ reason: "property path approval", path: "properties.name" } as any]);

    const [finding] = applySuppressions(
      [createFinding("ResponsePropertyRemoved", widget, "body.properties.name")],
      program,
    );

    expect(finding.suppressed).toBe(true);
    expect(finding.suppressionReason).toBe("property path approval");
  });

  it("does not suppress when a path-based suppression does not match", async () => {
    const { program } = await Tester.compile(`
      namespace Test;

      model Widget {
        name: string;
      }
    `);

    const widget = getModel(program, "Widget");
    program
      .stateMap(BreakingChangeStateKeys.approvedBreakingChange)
      .set(widget, [{ reason: "other path approval", path: "properties.id" } as any]);

    const [finding] = applySuppressions(
      [createFinding("ResponsePropertyRemoved", widget, "body.properties.name")],
      program,
    );

    expect(finding.suppressed).toBe(false);
    expect(finding.suppressionReason).toBeUndefined();
  });

  it("does not suppress a service-level finding when a path-based suppression requires an element", async () => {
    const { program } = await Tester.compile(`
      namespace Test;

      model Widget {}
    `);

    const widget = getModel(program, "Widget");
    program
      .stateMap(BreakingChangeStateKeys.approvedBreakingChange)
      .set(widget, [{ reason: "path constrained", path: "properties.name" } as any]);

    const [finding] = applySuppressions(
      [
        {
          diff: {
            kind: "ApiVersionAdded",
            identity: { element: "versions.2025-01-01" },
            headType: widget,
            message: "service-level diff",
          },
          severity: "error",
          rule: "test",
          phase: "cross-version",
          suppressed: false,
          versionPair: crossVersionPair,
        },
      ],
      program,
    );

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

function getModel(
  program: Awaited<ReturnType<typeof Tester.compile>>["program"],
  modelName: string,
) {
  const namespace = program.getGlobalNamespaceType().namespaces.get("Test");
  expect(namespace).toBeDefined();
  const model = namespace!.models.get(modelName);
  expect(model).toBeDefined();
  return model!;
}

function createFinding(
  kind: Finding["diff"]["kind"],
  type: NonNullable<Finding["diff"]["headType"] | Finding["diff"]["baseType"]>,
  element: string,
  origin?: Finding["diff"]["origin"],
): Finding {
  return {
    diff: {
      kind,
      identity: {
        operation: { method: "GET", path: "/widgets/{}" },
        component: "response",
        statusCode: "200",
        element,
      },
      baseType: type,
      origin,
      message: kind,
    },
    severity: "error",
    rule: "test",
    phase: "cross-version",
    suppressed: false,
    versionPair: {
      baseVersion: "2024-01-01",
      headVersion: "2025-01-01",
      phase: "cross-version",
    },
  };
}
