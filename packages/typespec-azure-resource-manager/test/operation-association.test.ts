import type { DecoratorContext, Model, Operation } from "@typespec/compiler";
import { unsafe_MutatorFlow as MutatorFlow } from "@typespec/compiler/experimental";
import { mockFile } from "@typespec/compiler/testing";
import { getAllVersions } from "@typespec/versioning";
import { describe, expect, it } from "vitest";
import { projectArmResourceNamespace } from "../src/operation-association.js";
import {
  $armResourceAction,
  $armResourceCheckExistence,
  $armResourceCreateOrUpdate,
  $armResourceDelete,
  $armResourceList,
  $armResourceRead,
  $armResourceUpdate,
  getArmResourceOperationData,
  getArmResourceOperationList,
  getArmResourceOperations,
  getProviderOperation,
  isResourceOperation,
} from "../src/operations.js";
import { $decorators, getArmResource } from "../src/private.decorators.js";
import { setResourceNameExpression } from "../src/resource-name.js";
import { resolveArmResources } from "../src/resource.js";
import { Tester } from "./tester.js";

const decorators = {
  read: $armResourceRead,
  createOrUpdate: $armResourceCreateOrUpdate,
  update: $armResourceUpdate,
  delete: $armResourceDelete,
  list: $armResourceList,
  action: $armResourceAction,
  checkExistence: $armResourceCheckExistence,
};
const privateDecorators = $decorators["Azure.ResourceManager.Private"];

const spec = `
  extern dec capture(target: TypeSpec.Reflection.Operation, resource: TypeSpec.Reflection.Model);
  @armProviderNamespace @versioned(Versions) namespace Microsoft.Test {
    enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
    model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
    @armResourceOperations interface Widgets {
      good is ArmResourceRead<Widget>;
      @capture(Widget) @route("/custom") @get custom(): void;
    }
  }
`;

describe("selected operation resource associations", () => {
  it("preserves every public and private operation kind across selected versions", async () => {
    const kinds = Object.keys(decorators);
    const operations = kinds.map(
      (kind) =>
        `@route("/public/${kind}") @get @armResource${kind[0].toUpperCase()}${kind.slice(1)}(Widget) public_${kind}(): void;`,
    );
    for (const family of [
      "extensionResourceOperation",
      "builtInResourceOperation",
      "legacyResourceOperation",
      "legacyExtensionResourceOperation",
    ]) {
      for (const kind of kinds) {
        const args = family.startsWith("legacy") ? "Widget" : "Extension.Subscription, Widget";
        operations.push(
          `@route("/${family}/${kind}") @get @Azure.ResourceManager.Private.${family}(${args}, "${kind}") ${family}_${kind}(): void;`,
        );
      }
    }
    const { program } = await Tester.compile(`
      @armProviderNamespace @versioned(Versions) namespace Microsoft.Test {
        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
        @renamedFrom(Versions.v2, "OldWidget")
        model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
        @armResourceOperations interface Widgets { get is ArmResourceRead<Widget>; }
        interface Matrix { ${operations.join("\n")} }
        interface Provider { @route("/provider") @providerOperation @get status(): void; }
      }
    `);
    for (const version of ["2024-01-01", "2025-01-01"]) {
      const selected = resolveArmResources(program, { version });
      expect(selected.resources).toBeDefined();
      const model = selected.resources!.find(
        (resource) => resource.type.name === (version === "2024-01-01" ? "OldWidget" : "Widget"),
      )!.type;
      const matrix = model.namespace!.interfaces.get("Matrix")!;
      expect(matrix.operations.size).toBe(35);
      for (const operation of matrix.operations.values()) {
        expect(getArmResourceOperationData(program, operation)?.resourceModel).toBe(model);
        expect(isResourceOperation(program, operation)).toBe(true);
      }
      const provider = model.namespace!.interfaces.get("Provider")!.operations.get("status")!;
      expect(getProviderOperation(program, provider)).toBe(provider);
    }
  });

  it("projects generic, proxy, extension and virtual registrar associations", async () => {
    const { program } = await Tester.compile(`
      @armProviderNamespace @versioned(Versions) namespace Microsoft.Test {
        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
        model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
        model Proxy is ProxyResource<{}> { ...ResourceNameParameter<Proxy>; }
        model Extra is ExtensionResource<{}> { ...ResourceNameParameter<Extra>; }
        model GenericResource is Azure.ResourceManager.Legacy.GenericResource<{}>;
        @armVirtualResource model Virtual { ...ResourceNameParameter<Virtual>; }
        @Azure.ResourceManager.Private.genericResourceInternal model Generic<T> { value: T; }
        @armResourceOperations interface Widgets { get is ArmResourceRead<Widget>; }
        interface Matrix {
          @route("/proxy") @get @armResourceRead(Proxy) proxy(): void;
          @route("/extra") @get @armResourceRead(Extra) extra(): void;
          @route("/generic") @get @armResourceRead(GenericResource) generic(): void;
          @route("/virtual") @get @armResourceRead(Virtual) virtual(): void;
          @route("/text") @get @armResourceRead(Generic<string>) text(): void;
          @route("/integer") @get @armResourceRead(Generic<int32>) integer(): void;
        }
      }
    `);
    for (const version of ["2024-01-01", "2025-01-01"]) {
      const provider = resolveArmResources(program, { version });
      const namespace = provider.resources!.find((resource) => resource.type.name === "Widget")!
        .type.namespace!;
      const matrix = namespace.interfaces.get("Matrix")!;
      for (const [operationName, modelName] of [
        ["proxy", "Proxy"],
        ["extra", "Extra"],
        ["generic", "GenericResource"],
        ["virtual", "Virtual"],
      ]) {
        const operation = matrix.operations.get(operationName)!;
        const model = namespace.models.get(modelName)!;
        expect(getArmResourceOperationData(program, operation)?.resourceModel).toBe(model);
        expect(getArmResource(program, model)?.typespecType).toBe(model);
        expect(isResourceOperation(program, operation)).toBe(true);
      }
      const text = getArmResourceOperationData(
        program,
        matrix.operations.get("text")!,
      )!.resourceModel!;
      const integer = getArmResourceOperationData(
        program,
        matrix.operations.get("integer")!,
      )!.resourceModel!;
      expect(text === integer).toBe(false);
      expect(getArmResource(program, text)?.kind).toBe("Generic");
      expect(getArmResource(program, integer)?.kind).toBe("Generic");
    }
  });

  for (const [kind, decorator] of Object.entries(decorators)) {
    it(`blocks stale secondary ${kind} registration before original state is changed`, async () => {
      const { program } = await Tester.files({
        "capture.js": mockFile.js({
          $capture(context: DecoratorContext, target: Operation, model: Model) {
            context.call(decorator, target, model);
            const [original] = context.program.resolveTypeReference("Microsoft.Test.Widget");
            context.call(decorator, target, original);
          },
        }),
      })
        .import("./capture.js")
        .compile(spec);
      const namespace = program
        .getGlobalNamespaceType()
        .namespaces.get("Microsoft")!
        .namespaces.get("Test")!;
      const model = namespace.models.get("Widget")!;
      const operation = namespace.interfaces.get("Widgets")!.operations.get("custom")!;
      const identifiers = [...getArmResourceOperationList(program, model)];
      const grouped = getArmResourceOperations(program, model);
      const before = {
        lifecycle: { ...grouped.lifecycle },
        lists: { ...grouped.lists },
        actions: { ...grouped.actions },
      };
      const metadata = getArmResourceOperationData(program, operation);
      expect(resolveArmResources(program, { version: "2024-01-01" })).toEqual({});
      expect(
        program.diagnostics.some(
          (diagnostic) =>
            diagnostic.code ===
            "@azure-tools/typespec-azure-resource-manager/arm-resource-version-operation-association",
        ),
      ).toBe(true);
      expect([...getArmResourceOperationList(program, model)]).toEqual(identifiers);
      expect(grouped).toEqual(before);
      expect(getArmResourceOperationData(program, operation)).toBe(metadata);
      const diagnosticCount = program.diagnostics.length;
      expect(resolveArmResources(program, { version: "2024-01-01" })).toEqual({});
      expect(program.diagnostics).toHaveLength(diagnosticCount);
      expect([...getArmResourceOperationList(program, model)]).toEqual(identifiers);
    });
  }

  it.each(["metadata", "identifier", "name expression"])(
    "rejects a stale %s reference introduced after registration",
    async (field) => {
      const { program } = await Tester.files({
        "capture.js": mockFile.js({
          $capture(context: DecoratorContext, target: Operation, model: Model) {
            context.call($armResourceRead, target, model);
            const [original] = context.program.resolveTypeReference("Microsoft.Test.Widget");
            if (original?.kind !== "Model") throw new Error("Missing resource");
            if (field === "metadata") {
              getArmResourceOperationData(context.program, target)!.resourceModel = original;
            } else if (field === "identifier") {
              const identifier = [...getArmResourceOperationList(context.program, model)].find(
                (identifier) => identifier.operation === target,
              )!;
              identifier.resource = original;
            } else {
              setResourceNameExpression(context.program, target, {
                kind: "model",
                model: original,
              });
            }
          },
        }),
      })
        .import("./capture.js")
        .compile(spec);
      expect(resolveArmResources(program, { version: "2024-01-01" })).toEqual({});
      expect(
        program.diagnostics.some(
          (diagnostic) =>
            diagnostic.code ===
            "@azure-tools/typespec-azure-resource-manager/arm-resource-version-operation-association",
        ),
      ).toBe(true);
    },
  );

  for (const family of [
    "legacyResourceOperation",
    "legacyExtensionResourceOperation",
    "extensionResourceOperation",
    "builtInResourceOperation",
  ] as const) {
    it(`blocks original-key writes through ${family}`, async () => {
      const { program } = await Tester.files({
        "capture.js": mockFile.js({
          $capture(context: DecoratorContext, target: Operation, model: Model) {
            const [original] = context.program.resolveTypeReference("Microsoft.Test.Widget");
            if (original?.kind !== "Model") throw new Error("Missing resource");
            if (
              family === "legacyResourceOperation" ||
              family === "legacyExtensionResourceOperation"
            ) {
              context.call(privateDecorators[family], target, original, "read");
            } else {
              context.call(privateDecorators[family], target, original, model, "read");
            }
          },
        }),
      })
        .import("./capture.js")
        .compile(spec);
      const [model] = program.resolveTypeReference("Microsoft.Test.Widget");
      if (model?.kind !== "Model") throw new Error("Missing resource");
      const identifiers = [...getArmResourceOperationList(program, model)];
      const lifecycle = { ...getArmResourceOperations(program, model).lifecycle };
      expect(resolveArmResources(program, { version: "2024-01-01" })).toEqual({});
      expect(
        program.diagnostics.some(
          (diagnostic) =>
            diagnostic.code ===
            "@azure-tools/typespec-azure-resource-manager/arm-resource-version-operation-association",
        ),
      ).toBe(true);
      expect([...getArmResourceOperationList(program, model)]).toEqual(identifiers);
      expect(getArmResourceOperations(program, model).lifecycle).toEqual(lifecycle);
    });
  }

  it("rejects a registered same-name resource from another snapshot in design-time mode", async () => {
    const injected: { model?: Model } = {};
    const { program } = await Tester.files({
      "capture.js": mockFile.js({
        $capture(context: DecoratorContext, target: Operation, model: Model) {
          context.call($armResourceRead, target, injected.model ?? model);
        },
      }),
    })
      .import("./capture.js")
      .compile(spec, { compilerOptions: { designTimeBuild: true } });
    const v2 = resolveArmResources(program, { version: "2025-01-01" });
    expect(v2.resources).toBeDefined();
    injected.model = v2.resources![0].type;
    expect(resolveArmResources(program, { version: "2024-01-01" })).toEqual({});
    expect(
      program.diagnostics.some(
        (diagnostic) =>
          diagnostic.code ===
          "@azure-tools/typespec-azure-resource-manager/arm-resource-version-operation-association",
      ),
    ).toBe(true);
    expect(program.diagnostics.some((diagnostic) => diagnostic.code === "decorator-fail")).toBe(
      false,
    );
  });

  it("does not reject or revive operations unavailable in the selected version", async () => {
    const { program } = await Tester.files({
      "capture.js": mockFile.js({
        $capture(context: DecoratorContext, target: Operation) {
          const [original] = context.program.resolveTypeReference("Microsoft.Test.Widget");
          context.call($armResourceRead, target, original);
        },
      }),
    })
      .import("./capture.js")
      .compile(spec.replace("@capture(Widget)", "@added(Versions.v2) @capture(Widget)"));
    const v1 = resolveArmResources(program, { version: "2024-01-01" });
    expect(v1.resources).toBeDefined();
    const namespace = v1.resources![0].type.namespace!;
    expect(namespace.interfaces.get("Widgets")!.operations.has("custom")).toBe(false);
    expect(resolveArmResources(program, { version: "2025-01-01" })).toEqual({});
    expect(resolveArmResources(program, { version: "2024-01-01" }).resources![0].type).toBe(
      v1.resources![0].type,
    );
  });

  it("uses the service-selected dependency version for resource arguments", async () => {
    const { program } = await Tester.compile(`
      @armLibraryNamespace @versioned(Versions) namespace Shared {
        enum Versions { old: "2020-01-01", current: "2021-01-01" }
        @renamedFrom(Versions.current, "OldExternal")
        @Azure.ResourceManager.Private.genericResourceInternal
        model External { value: string; }
      }
      @armProviderNamespace @versioned(Versions) namespace Microsoft.Test {
        enum Versions {
          @useDependency(Shared.Versions.old) v1: "2024-01-01",
          @useDependency(Shared.Versions.current) v2: "2025-01-01",
        }
        model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
        @armResourceOperations interface Widgets {
          good is ArmResourceRead<Widget>;
          @armResourceRead(Shared.External) @route("/external") @get external(): void;
        }
      }
    `);
    for (const [version, name] of [
      ["2024-01-01", "OldExternal"],
      ["2025-01-01", "External"],
    ]) {
      const selected = resolveArmResources(program, { version });
      const namespace = selected.resources![0].type.namespace!;
      const operation = namespace.interfaces.get("Widgets")!.operations.get("external")!;
      const model = getArmResourceOperationData(program, operation)!.resourceModel!;
      expect(model.name).toBe(name);
      expect(getArmResource(program, model)?.typespecType).toBe(model);
      expect(
        operation.decorators.some((application) => application.args[0]?.jsValue === model),
      ).toBe(true);
    }
  });

  it("accepts a model explicitly shared by the compiler's mutation recipe", async () => {
    const { program } = await Tester.compile(`
      @armProviderNamespace namespace Microsoft.Test {
        model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
        @armResourceOperations interface Widgets { good is ArmResourceRead<Widget>; }
      }
    `);
    const [namespace] = program.resolveTypeReference("Microsoft.Test");
    if (namespace?.kind !== "Namespace") throw new Error("Missing namespace");
    const model = namespace.models.get("Widget")!;
    const projection = projectArmResourceNamespace(
      program,
      namespace,
      {
        name: "shared-model",
        Namespace() {},
        Interface() {},
        Model: {
          filter: () => MutatorFlow.DoNotMutate | MutatorFlow.DoNotRecur,
          mutate() {
            throw new Error("Shared models must not be mutated");
          },
        },
        Operation(_source, selected) {
          selected.name = "selectedRead";
        },
      },
      "test",
    );
    expect(program.diagnostics.map(({ code, message }) => ({ code, message }))).toEqual([]);
    expect(projection).toBeDefined();
    const operation = projection!.providerNamespace.interfaces
      .get("Widgets")!
      .operations.values()
      .next().value!;
    expect(operation === namespace.interfaces.get("Widgets")!.operations.get("good")).toBe(false);
    expect(getArmResourceOperationData(program, operation)?.resourceModel).toBe(model);
  });

  it("rejects an opaque generic association without changing the original identifiers", async () => {
    const { program } = await Tester.files({
      "capture.js": mockFile.js({
        $capture(context: DecoratorContext, target: Operation) {
          const [model] = context.program.resolveTypeReference("Microsoft.Test.Hidden");
          context.call($armResourceRead, target, model);
        },
      }),
    }).import("./capture.js").compile(`
      extern dec capture(target: TypeSpec.Reflection.Operation);
      @armProviderNamespace @versioned(Versions) namespace Microsoft.Test {
        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
        @Azure.ResourceManager.Private.genericResourceInternal model Generic<T> { value: T; }
        alias Hidden = Generic<int32>;
        interface Widgets { @capture @route("/hidden") @get hidden(): void; }
      }
    `);
    const [model] = program.resolveTypeReference("Microsoft.Test.Hidden");
    if (model?.kind !== "Model") throw new Error("Missing resource");
    const before = [...getArmResourceOperationList(program, model)];
    expect(resolveArmResources(program, { version: "2024-01-01" })).toEqual({});
    const after = [...getArmResourceOperationList(program, model)];
    expect(after.length).toBe(before.length);
    after.forEach((identifier, index) => expect(identifier).toBe(before[index]));
    expect(getArmResource(program, model)?.typespecType).toBe(model);
  });

  it("accepts selected resource identities and reuses a validated snapshot", async () => {
    const { program } = await Tester.compile(`
      @armProviderNamespace @versioned(Versions) namespace Microsoft.Test {
        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
        @renamedFrom(Versions.v2, "OldWidget")
        model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
        @armResourceOperations interface Widgets { get is ArmResourceRead<Widget>; }
      }
    `);
    const v1 = resolveArmResources(program, { version: "2024-01-01" });
    const resource = v1.resources![0];
    expect(resource.type.name).toBe("OldWidget");
    const operation = resource.operations.lifecycle.read![0].operation;
    expect(getArmResourceOperationData(program, operation)?.resourceModel === resource.type).toBe(
      true,
    );
    expect(
      resolveArmResources(program, { version: "2024-01-01" }).resources![0].type === resource.type,
    ).toBe(true);
    const v2 = resolveArmResources(program, { version: "2025-01-01" });
    expect(v2.resources![0].type === resource.type).toBe(false);
    const original = resolveArmResources(program);
    expect(original.resources![0].type === resource.type).toBe(false);
    expect(resource.type.name).toBe("OldWidget");
  });

  it("isolates sibling services and rejects failed multi-service selections atomically", async () => {
    const { program } = await Tester.files({
      "capture.js": mockFile.js({
        $capture(context: DecoratorContext, target: Operation) {
          const [original] = context.program.resolveTypeReference("Microsoft.Test.Widget");
          context.call($armResourceRead, target, original);
        },
      }),
    })
      .import("./capture.js")
      .compile(
        spec +
          `
      @armProviderNamespace @versioned(Versions) namespace Microsoft.Healthy {
        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
        model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
        @armResourceOperations interface Widgets { good is ArmResourceRead<Widget>; }
      }
    `,
      );
    const selections = ["Microsoft.Healthy", "Microsoft.Test"].map((name) => {
      const [namespace] = program.resolveTypeReference(name);
      if (namespace?.kind !== "Namespace") throw new Error("Missing namespace");
      return { namespace, version: getAllVersions(program, namespace)![0] };
    });
    const healthy = resolveArmResources(program, { serviceVersions: selections.slice(0, 1) });
    expect(healthy.resources).toHaveLength(1);
    let namingCalls = 0;
    expect(
      resolveArmResources(program, {
        serviceVersions: selections,
        nameResolver() {
          namingCalls++;
          return undefined;
        },
      }),
    ).toEqual({});
    expect(namingCalls).toBe(0);
    const diagnosticCount = program.diagnostics.length;
    expect(resolveArmResources(program, { serviceVersions: selections })).toEqual({});
    expect(program.diagnostics).toHaveLength(diagnosticCount);
    expect(
      resolveArmResources(program, {
        serviceVersions: selections.slice(0, 1),
      }).resources![0].type === healthy.resources![0].type,
    ).toBe(true);
  });
});
