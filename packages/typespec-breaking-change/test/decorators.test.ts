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
  findSuppressions,
  findUnversionedSuppressions,
  getSuppressions,
  getUnversionedSuppressions,
} from "../src/decorators.js";
import { Tester } from "./test-host.js";

describe("suppression decorators", () => {
  it("stores approved breaking change suppressions", async () => {
    const { program } = await Tester.compile(`
      namespace Test;
      model Widget {}
    `);

    const widget = getModel(program, "Widget");

    $approvedBreakingChange(
      { program } as DecoratorContext,
      widget,
      "Reviewed and approved.",
      "RequestPropertyRemoved",
    );

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
    $approvedBreakingChange(
      { program } as DecoratorContext,
      widget,
      "Second approval.",
      "ResponsePropertyRemoved",
    );

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

    $approvedBreakingChange(
      { program } as DecoratorContext,
      widget,
      "Versioned approval.",
      "RequestPropertyRemoved",
    );
    $approvedUnversionedChange(
      { program } as DecoratorContext,
      widget,
      "Phase A approval.",
      "RequestPropertyRemoved",
    );

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
      "RequestPropertyRemoved",
    );
    $approvedBreakingChange({ program } as DecoratorContext, widget, "Model-level approval.");
    $approvedBreakingChange(
      { program } as DecoratorContext,
      name,
      "Property-level approval.",
      "ResponsePropertyRemoved",
    );

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
    $approvedBreakingChange(
      { program } as DecoratorContext,
      widgets,
      "Interface-level approval.",
      "OperationRemoved",
    );
    $approvedBreakingChange(
      { program } as DecoratorContext,
      operation,
      "Operation-level approval.",
      "OperationRouteChanged",
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

    $approvedBreakingChange(
      { program } as DecoratorContext,
      widget,
      "Reviewed and approved.",
      "NotAKind",
    );

    expect(getSuppressions(program, widget)).toEqual([]);
    expect(program.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "@azure-tools/typespec-breaking-change/invalid-suppression-kind",
          severity: "warning",
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

    $approvedUnversionedChange(
      { program } as DecoratorContext,
      widget,
      "Approved.",
      "NotAValidKind",
    );

    expect(getUnversionedSuppressions(program, widget)).toEqual([]);
    expect(program.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "@azure-tools/typespec-breaking-change/invalid-suppression-kind",
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

    $approvedBreakingChange(
      { program } as DecoratorContext,
      namespace,
      "Namespace approval.",
    );

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
