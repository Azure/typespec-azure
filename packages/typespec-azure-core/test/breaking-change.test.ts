import type {
  DecoratorContext,
  Interface,
  Model,
  ModelProperty,
  Namespace,
  Operation,
  Program,
} from "@typespec/compiler";
import { describe, expect, it } from "vitest";
import {
  $approvedBreakingChange,
  $approvedUnversionedChange,
  $lib,
  findSuppressions,
  findUnversionedSuppressions,
  getSuppressions,
  getUnversionedSuppressions,
  scanAllUnversionedSuppressions,
} from "../src/index.js";
import { Tester } from "./test-host.js";

describe("suppression decorators", () => {
  it(
    "compiles approval decorators with only the Azure.Core library imported",
    { timeout: 30_000 },
    async () => {
      const { program } = await Tester.compile(`
      namespace Test;
      @approvedBreakingChange("Reviewed.", #{ kind: "OperationRemoved", since: "2025-01-01", path: "operations.read" })
      @approvedUnversionedChange("Migration.", #{ kind: "OperationRemoved", path: "operations.read" })
      model Widget {}
    `);
      const widget = getModel(program, "Widget");
      expect(getSuppressions(program, widget)).toEqual([
        {
          kind: "OperationRemoved",
          reason: "Reviewed.",
          version: "2025-01-01",
          path: "operations.read",
        },
      ]);
      expect(getUnversionedSuppressions(program, widget)).toEqual([
        { kind: "OperationRemoved", reason: "Migration.", path: "operations.read" },
      ]);
    },
  );

  it("creates breaking-change diagnostics without the prototype library", async () => {
    const { program } = await Tester.compile(`
      namespace Test;
      model Widget {}
    `);
    const widget = getModel(program, "Widget");
    const diagnostic = $lib.createDiagnostic({
      code: "breaking-change",
      target: widget,
      format: { message: "Property 'legacy' was removed." },
    });
    expect(diagnostic).toMatchObject({
      code: "@azure-tools/typespec-azure-core/breaking-change",
      severity: "error",
      message: "Breaking change detected: Property 'legacy' was removed.",
    });
    expect(diagnostic.target).toBe(widget);
  });

  it.each(["approvedBreakingChange", "approvedUnversionedChange"])(
    "diagnoses invalid kinds passed through @%s without storing approval metadata",
    async (decorator) => {
      const [{ program }, diagnostics] = await Tester.compileAndDiagnose(`
        namespace Test;
        @${decorator}("Reviewed.", #{ kind: "NotAKind" })
        model Widget {}
      `);
      const widget = getModel(program, "Widget");
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]).toMatchObject({
        code: "@azure-tools/typespec-azure-core/invalid-suppression-kind",
        severity: "warning",
        message: "Invalid DiffKind 'NotAKind' specified in suppression decorator.",
      });
      expect(diagnostics[0].target).toBe(widget);
      expect(getSuppressions(program, widget)).toEqual([]);
      expect(getUnversionedSuppressions(program, widget)).toEqual([]);
    },
  );

  it("enumerates unversioned approvals without including cross-version approvals", async () => {
    const { program } = await Tester.compile(`
      namespace Test;
      @approvedBreakingChange("Versioned.")
      @approvedUnversionedChange("Model migration.")
      model Widget {
        @approvedUnversionedChange("Property migration.", #{ kind: "ResponsePropertyRemoved" })
        legacy: string;
      }
    `);
    const widget = getModel(program, "Widget");
    const approvals = scanAllUnversionedSuppressions(program);
    expect(approvals).toHaveLength(2);
    expect(approvals.find((approval) => approval.target === widget)?.suppression).toEqual({
      kind: undefined,
      reason: "Model migration.",
    });
    const legacy = getProperty(widget, "legacy");
    expect(approvals.find((approval) => approval.target === legacy)?.suppression).toEqual({
      kind: "ResponsePropertyRemoved",
      reason: "Property migration.",
    });
  });
  it("stores approved breaking change suppressions", async () => {
    const { program } = await Tester.compile(`
      namespace Test;
      model Widget {}
    `);

    const widget = getModel(program, "Widget");

    $approvedBreakingChange({ program } as DecoratorContext, widget, "Reviewed and approved.", {
      kind: "RequestPropertyRemoved",
    });

    expect(getSuppressions(program, widget)).toEqual([
      { kind: "RequestPropertyRemoved", reason: "Reviewed and approved." },
    ]);
  });

  it("appends multiple suppressions to the same type", async () => {
    const { program } = await Tester.compile(`
      namespace Test;
      model Widget {}
    `);

    const widget = getModel(program, "Widget");

    $approvedBreakingChange({ program } as DecoratorContext, widget, "First approval.");
    $approvedBreakingChange({ program } as DecoratorContext, widget, "Second approval.", {
      kind: "ResponsePropertyRemoved",
    });

    expect(getSuppressions(program, widget)).toEqual([
      { kind: undefined, reason: "First approval." },
      { kind: "ResponsePropertyRemoved", reason: "Second approval." },
    ]);
  });

  it("stores unversioned suppressions separately", async () => {
    const { program } = await Tester.compile(`
      namespace Test;
      model Widget {}
    `);

    const widget = getModel(program, "Widget");

    $approvedBreakingChange({ program } as DecoratorContext, widget, "Versioned approval.", {
      kind: "RequestPropertyRemoved",
    });
    $approvedUnversionedChange({ program } as DecoratorContext, widget, "Phase A approval.", {
      kind: "RequestPropertyRemoved",
    });

    expect(getSuppressions(program, widget)).toEqual([
      { kind: "RequestPropertyRemoved", reason: "Versioned approval." },
    ]);
    expect(getUnversionedSuppressions(program, widget)).toEqual([
      { kind: "RequestPropertyRemoved", reason: "Phase A approval." },
    ]);
  });

  it("finds suppressions up the property hierarchy", async () => {
    const { program } = await Tester.compile(`
      namespace Test;
      model Widget {
        name: string;
      }
    `);

    const namespace = getNamespace(program);
    const widget = getModel(program, "Widget");
    const name = getProperty(widget, "name");

    $approvedBreakingChange(
      { program } as DecoratorContext,
      namespace,
      "Namespace-level approval.",
      { kind: "RequestPropertyRemoved" },
    );
    $approvedBreakingChange({ program } as DecoratorContext, widget, "Model-level approval.");
    $approvedBreakingChange({ program } as DecoratorContext, name, "Property-level approval.", {
      kind: "ResponsePropertyRemoved",
    });

    expect(findSuppressions(program, name)).toEqual([
      {
        suppression: { kind: "ResponsePropertyRemoved", reason: "Property-level approval." },
        target: name,
      },
      {
        suppression: { kind: undefined, reason: "Model-level approval." },
        target: widget,
      },
      {
        suppression: { kind: "RequestPropertyRemoved", reason: "Namespace-level approval." },
        target: namespace,
      },
    ]);
  });

  it("finds suppressions through operation interface and namespace", async () => {
    const { program } = await Tester.compile(`
      namespace Test;

      interface Widgets {
        get(): string;
      }
    `);

    const namespace = getNamespace(program);
    const widgets = getInterface(namespace, "Widgets");
    const operation = getOperation(widgets, "get");

    $approvedBreakingChange(
      { program } as DecoratorContext,
      namespace,
      "Namespace-level approval.",
    );
    $approvedBreakingChange({ program } as DecoratorContext, widgets, "Interface-level approval.", {
      kind: "OperationRemoved",
    });
    $approvedBreakingChange(
      { program } as DecoratorContext,
      operation,
      "Operation-level approval.",
      { kind: "OperationRouteChanged" },
    );

    expect(findSuppressions(program, operation)).toEqual([
      {
        suppression: { kind: "OperationRouteChanged", reason: "Operation-level approval." },
        target: operation,
      },
      {
        suppression: { kind: "OperationRemoved", reason: "Interface-level approval." },
        target: widgets,
      },
      {
        suppression: { kind: undefined, reason: "Namespace-level approval." },
        target: namespace,
      },
    ]);
  });

  it("finds unversioned suppressions with the same hierarchy walker", async () => {
    const { program } = await Tester.compile(`
      namespace Test;
      model Widget {
        name: string;
      }
    `);

    const namespace = getNamespace(program);
    const widget = getModel(program, "Widget");
    const name = getProperty(widget, "name");

    $approvedUnversionedChange({ program } as DecoratorContext, namespace, "Namespace scope.");
    $approvedUnversionedChange({ program } as DecoratorContext, widget, "Model scope.");
    $approvedUnversionedChange({ program } as DecoratorContext, name, "Property scope.");

    expect(findUnversionedSuppressions(program, name)).toEqual([
      { suppression: { kind: undefined, reason: "Property scope." }, target: name },
      { suppression: { kind: undefined, reason: "Model scope." }, target: widget },
      { suppression: { kind: undefined, reason: "Namespace scope." }, target: namespace },
    ]);
  });

  it("reports a warning for an invalid suppression kind", async () => {
    const { program } = await Tester.compile(`
      namespace Test;
      model Widget {}
    `);

    const widget = getModel(program, "Widget");

    $approvedBreakingChange({ program } as DecoratorContext, widget, "Reviewed and approved.", {
      kind: "NotAKind",
    });

    expect(getSuppressions(program, widget)).toEqual([]);
    expect(program.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "@azure-tools/typespec-azure-core/invalid-suppression-kind",
          severity: "warning",
          message: "Invalid DiffKind 'NotAKind' specified in suppression decorator.",
        }),
      ]),
    );
  });

  it("reports a warning for invalid unversioned suppression kind", async () => {
    const { program } = await Tester.compile(`
      namespace Test;
      model Widget {}
    `);

    const widget = getModel(program, "Widget");

    $approvedUnversionedChange({ program } as DecoratorContext, widget, "Approved.", {
      kind: "NotAValidKind",
    });

    expect(getUnversionedSuppressions(program, widget)).toEqual([]);
    expect(program.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "@azure-tools/typespec-azure-core/invalid-suppression-kind",
          message: "Invalid DiffKind 'NotAValidKind' specified in suppression decorator.",
        }),
      ]),
    );
  });

  it("finds suppressions through operation to namespace (no interface)", async () => {
    const { program } = await Tester.compile(`
      namespace Test {
        op standalone(): string;
      }
    `);

    const namespace = getNamespace(program);
    const operation = getOperation(namespace, "standalone");

    $approvedBreakingChange({ program } as DecoratorContext, namespace, "Namespace approval.");

    const suppressions = findSuppressions(program, operation);
    expect(suppressions).toEqual([
      {
        suppression: { kind: undefined, reason: "Namespace approval." },
        target: namespace,
      },
    ]);
  });
});

function getNamespace(program: Program): Namespace {
  const namespace = program.getGlobalNamespaceType().namespaces.get("Test");
  expect(namespace).toBeDefined();
  return namespace!;
}

function getModel(program: Program, modelName: string): Model {
  const model = getNamespace(program).models.get(modelName);
  expect(model).toBeDefined();
  return model!;
}

function getProperty(model: Model, propertyName: string): ModelProperty {
  const property = model.properties.get(propertyName);
  expect(property).toBeDefined();
  return property!;
}

function getInterface(namespace: Namespace, interfaceName: string): Interface {
  const iface = namespace.interfaces.get(interfaceName);
  expect(iface).toBeDefined();
  return iface!;
}

function getOperation(container: Interface | Namespace, operationName: string): Operation {
  const operation = container.operations.get(operationName);
  expect(operation).toBeDefined();
  return operation!;
}
