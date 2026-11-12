import { Tester } from "#test/tester.js";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { providerOrResourceOperationRule } from "../../src/rules/provider-or-resource-operation.js";

let tester: LinterRuleTester;

const service = `
  @armProviderNamespace
  namespace Microsoft.Test;
`;
const resource = `
  model Widget is TrackedResource<{}> {
    ...ResourceNameParameter<Widget>;
  }
`;
const message =
  "ARM operations must be registered as provider or resource operations. Use standard templates such as ArmProviderActionSync, ArmResourceRead, or Extension.Read, or apply @providerOperation to a custom provider operation.";
const mixedMessage =
  "An operation cannot be marked as both a provider operation and a resource operation. Remove @providerOperation from resource operations and register the resource using a standard resource template.";

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    providerOrResourceOperationRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

describe("provider-or-resource-operation", () => {
  for (const decorator of [
    "armResourceRead",
    "armResourceCreateOrUpdate",
    "armResourceUpdate",
    "armResourceDelete",
    "armResourceList",
    "armResourceAction",
    "armResourceCheckExistence",
  ]) {
    for (const model of ["Widget", "NotAResource"]) {
      it(`diagnoses mixed @${decorator} with ${model}`, async () => {
        await tester
          .expect(
            `${service}${resource}
          model NotAResource {}
          interface Custom { @providerOperation @${decorator}(${model}) @get custom(): void; }
        `,
          )
          .toEmitDiagnostics([
            {
              code: "@azure-tools/typespec-azure-resource-manager/provider-or-resource-operation",
              severity: "warning",
              message: mixedMessage,
            },
          ]);
      });
    }
  }
  for (const decorator of [
    'extensionResourceOperation(Extension.Subscription, Widget, "read")',
    'builtInResourceOperation(Extension.Subscription, Widget, "read")',
    'legacyResourceOperation(Widget, "read")',
    'legacyExtensionResourceOperation(Widget, "read")',
  ]) {
    it(`diagnoses mixed private ${decorator}`, async () => {
      await tester
        .expect(
          `${service}${resource}
        interface Custom { @Azure.ResourceManager.Private.${decorator} @providerOperation @get custom(): void; }
      `,
        )
        .toEmitDiagnostics([
          {
            code: "@azure-tools/typespec-azure-resource-manager/provider-or-resource-operation",
            severity: "warning",
            message: mixedMessage,
          },
        ]);
    });
  }
  it("accepts a provider operation with only a collection marker", async () => {
    await tester
      .expect(
        `${service}
      @providerOperation @armResourceCollectionAction @post op custom(): void;
    `,
      )
      .toBeValid();
  });
  it("suppresses the mixed warning through the compiler", async () => {
    await Tester.compile(
      `${service}${resource}
      interface Custom {
        #suppress "@azure-tools/typespec-azure-resource-manager/provider-or-resource-operation" "Approved exception."
        @providerOperation @armResourceRead(Widget) @get custom(): void;
      }
    `,
      {
        compilerOptions: {
          linterRuleSet: {
            enable: {
              "@azure-tools/typespec-azure-resource-manager/provider-or-resource-operation": true,
            },
          },
        },
      },
    );
  });
  it("ignores library operations in Azure.Core and Azure.ResourceManager", async () => {
    await tester.expect("").toBeValid();
  });

  it("accepts standard resource operations and inherited operations", async () => {
    await tester
      .expect(
        `${service}${resource}
        @armResourceOperations
        interface Widgets extends TrackedResourceOperations<Widget, {}> {}
      `,
      )
      .toBeValid();
  });

  it("accepts provider actions and the standard and legacy operations lists", async () => {
    await tester
      .expect(
        `${service}
        interface Operations extends Azure.ResourceManager.Operations {}
        @route("/legacy")
        interface LegacyOperations extends Azure.ResourceManager.Legacy.Operations {}
        @autoRoute
        interface Actions {
          sync is ArmProviderActionSync;
          refreshAsync is ArmProviderActionAsync;
        }
      `,
      )
      .toBeValid();
  });

  it("accepts explicitly registered custom provider operations", async () => {
    await tester.expect(`${service} @providerOperation @get op information(): string;`).toBeValid();
  });

  it("accepts extension and legacy resource operation registrations", async () => {
    await tester
      .expect(
        `${service}${resource}
        model Extra is ExtensionResource<{}> { ...ResourceNameParameter<Extra>; }
        @armResourceOperations
        interface Extras {
          get is Extension.Read<Extension.Subscription, Extra>;
        }
        interface Routed extends Azure.ResourceManager.Legacy.RoutedOperations<{}, {}> {}
        @armResourceOperations(#{allowStaticRoutes: true})
        interface Widgets {
          @route("/widgets/{name}")
          get is Routed.Read<Widget, Parameters = { @path name: string }>;
        }
      `,
      )
      .toBeValid();
  });

  it.each(["@get custom(): string;", "@get @armResourceRead(NotAResource) custom(): string;"])(
    "supports an explicitly justified suppression for %s",
    async (declaration) => {
      await Tester.compile(
        `${service}
        model NotAResource {}
        interface Custom {
          #suppress "@azure-tools/typespec-azure-resource-manager/provider-or-resource-operation" "Approved exception."
          ${declaration}
        }
      `,
        {
          compilerOptions: {
            linterRuleSet: {
              enable: {
                "@azure-tools/typespec-azure-resource-manager/provider-or-resource-operation": true,
              },
            },
          },
        },
      );
    },
  );

  it("accepts name availability and operation status templates", async () => {
    await tester
      .expect(
        `${service}
        interface Provider {
          global is checkGlobalNameAvailability;
          localAvailability is checkLocalNameAvailability;
          status is GetResourceOperationStatus;
        }
      `,
      )
      .toBeValid();
  });

  it("ignores operation and interface template declarations", async () => {
    await tester
      .expect(
        `${service}
        op custom<T>(@body body: T): void;
        interface Custom<T> {
          custom(@body body: T): void;
        }
      `,
      )
      .toBeValid();
  });

  for (const declaration of [
    "interface Custom { @get custom(): string; }",
    "interface Custom<T> { @get custom(): T; } interface Concrete extends Custom<string> {}",
    "interface Custom { @post @armResourceCollectionAction custom(): void; }",
    "@post @armResourceCollectionAction op custom(): void;",
  ]) {
    it(`warns on unregistered concrete operations: ${declaration}`, async () => {
      await tester.expect(`${service}${declaration}`).toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-resource-manager/provider-or-resource-operation",
          severity: "warning",
          message,
        },
      ]);
    });
  }

  it.each([
    "@get op custom(): string;",
    "op Custom<T>(): T; op custom is Custom<string>;",
    "@get @armResourceRead(Widget) op custom(): Widget;",
    "op custom is ArmResourceRead<Widget>;",
    '@action("custom") op custom is ArmResourceActionSync<Widget, void, Widget>;',
    '@action("custom") op custom is ArmResourceActionAsync<Widget, void, Widget>;',
  ])("requires an enclosing interface for %s", async (declaration) => {
    await tester.expect(`${service}${resource}${declaration}`).toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/provider-or-resource-operation",
        severity: "warning",
        message: "Resource operations must be defined inside an interface",
      },
    ]);
  });

  it.each(["ArmResourceActionSync", "ArmResourceActionAsync"])(
    "accepts %s after enclosing it in an interface",
    async (template) => {
      await tester
        .expect(
          `${service}${resource}
          @armResourceOperations
          interface Widgets {
            custom is ${template}<Widget, void, Widget>;
          }
        `,
        )
        .toBeValid();
    },
  );

  it("accepts a namespace-scoped standard provider action", async () => {
    await tester.expect(`${service} op refresh is ArmProviderActionSync;`).toBeValid();
  });

  it("supports suppression of the interface diagnostic", async () => {
    await Tester.compile(
      `${service}${resource}
      #suppress "@azure-tools/typespec-azure-resource-manager/provider-or-resource-operation" "Approved exception."
      op custom is ArmResourceRead<Widget>;
    `,
      {
        compilerOptions: {
          linterRuleSet: {
            enable: {
              "@azure-tools/typespec-azure-resource-manager/provider-or-resource-operation": true,
            },
          },
        },
      },
    );
  });

  for (const decorator of [
    "armResourceRead(NotAResource)",
    "armResourceCreateOrUpdate(NotAResource)",
    "armResourceUpdate(NotAResource)",
    "armResourceDelete(NotAResource)",
    "armResourceList(NotAResource)",
    "armResourceAction(NotAResource)",
    "armResourceCheckExistence(NotAResource)",
    'armResourceRead(NotAResource, "CustomResourceName")',
    'Azure.ResourceManager.Private.extensionResourceOperation(Extension.Subscription, NotAResource, "read")',
    'Azure.ResourceManager.Private.builtInResourceOperation(Extension.Subscription, NotAResource, "read")',
    'Azure.ResourceManager.Private.legacyResourceOperation(NotAResource, "read")',
    'Azure.ResourceManager.Private.legacyExtensionResourceOperation(NotAResource, "read")',
  ]) {
    it(`identifies the unregistered resource for @${decorator}`, async () => {
      await tester
        .expect(
          `${service}
          model NotAResource {}
          interface Custom {
            @get
            @${decorator}
            custom(): string;
          }
        `,
        )
        .toEmitDiagnostics([
          {
            code: "@azure-tools/typespec-azure-resource-manager/provider-or-resource-operation",
            severity: "warning",
            message:
              'The resource "NotAResource" for this operation is not a registered ARM resource. Use standard resource templates to create resources.',
          },
        ]);
    });
  }

  it("names the resource from an inherited operation registration", async () => {
    await tester
      .expect(
        `${service}
        model UnregisteredWidget {}
        interface Custom<T extends {}> {
          @get
          @armResourceRead(T)
          custom(): string;
        }
        interface Concrete extends Custom<UnregisteredWidget> {}
      `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-resource-manager/provider-or-resource-operation",
          severity: "warning",
          message:
            'The resource "UnregisteredWidget" for this operation is not a registered ARM resource. Use standard resource templates to create resources.',
        },
      ]);
  });
});
