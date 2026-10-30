import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
  mockFile,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";

import { useOperationDecoratorRule } from "../../src/rules/use-operation-decorator.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  // The providerOperation API is tracked separately in #5816 and is not on main yet.
  runner = await Tester.files({
    "provider-operation.js": mockFile.js({
      $decorators: {
        "Azure.ResourceManager": { providerOperation: function $providerOperation() {} },
      },
    }),
    "provider-operation.tsp": `
      import "./provider-operation.js";
      namespace Azure.ResourceManager;
      extern dec providerOperation(target: TypeSpec.Reflection.Operation);
    `,
  })
    .import("./provider-operation.tsp")
    .createInstance();
  tester = createLinterRuleTester(
    runner,
    useOperationDecoratorRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("emits diagnostics if missing armResourceOperation decorators.", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace
        namespace Microsoft.Foo;
        
        model FooResource is TrackedResource<{}> {
          ...ResourceNameParameter<FooResource>;
        }

        @armResourceOperations
        interface FooResources extends ResourceCollectionOperations<FooResource> {
          @put createOrUpdate( ...ResourceInstanceParameters<FooResource>, @bodyRoot resource: FooResource): ArmResponse<FooResource> | ArmCreatedResponse<FooResource> | ErrorResponse;
          @get get(...ResourceInstanceParameters<FooResource>): ArmResponse<FooResource> | ErrorResponse;
        #suppress "@typespec/http/deprecated-implicit-optionality" "For test"
          @patch(#{implicitOptionality: true}) update(...ResourceInstanceParameters<FooResource>, @bodyRoot properties: Foundations.ResourceUpdateModel<FooResource, {}>): ArmResponse<FooResource> | ErrorResponse;
          @delete delete(...ResourceInstanceParameters<FooResource>): | ArmDeletedResponse | ArmDeleteAcceptedResponse | ArmDeletedNoContentResponse | ErrorResponse;
          @post action(...ResourceInstanceParameters<FooResource>) : ArmResponse<FooResource> | ErrorResponse;
          @head exists(...ResourceInstanceParameters<FooResource>): ArmResourceExistsResponse | ArmResourceNotFoundResponse;
        }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
        message:
          'Resource PUT operation must be decorated with @armResourceCreateOrUpdate or @extensionResourceOperation or @legacyResourceOperation or @builtInResourceOperation or @legacyExtensionResourceOperation. Generic ARM resource operation decorators must use operationType "createOrUpdate".',
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
        message:
          'Resource GET operation must be decorated with @armResourceRead or @armResourceList or @armResourceAction or @extensionResourceOperation or @legacyResourceOperation or @builtInResourceOperation or @legacyExtensionResourceOperation. Generic ARM resource operation decorators must use operationType "read" or "list" or "action".',
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
        message:
          'Resource PATCH operation must be decorated with @armResourceUpdate or @extensionResourceOperation or @legacyResourceOperation or @builtInResourceOperation or @legacyExtensionResourceOperation. Generic ARM resource operation decorators must use operationType "update".',
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
        message:
          'Resource DELETE operation must be decorated with @armResourceDelete or @extensionResourceOperation or @legacyResourceOperation or @builtInResourceOperation or @legacyExtensionResourceOperation. Generic ARM resource operation decorators must use operationType "delete".',
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
        message:
          'Resource POST operation must be decorated with @armResourceAction or @extensionResourceOperation or @legacyResourceOperation or @builtInResourceOperation or @legacyExtensionResourceOperation. Generic ARM resource operation decorators must use operationType "action".',
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
        message:
          'Resource HEAD operation must be decorated with @armResourceCheckExistence or @extensionResourceOperation or @legacyResourceOperation or @builtInResourceOperation or @legacyExtensionResourceOperation. Generic ARM resource operation decorators must use operationType "checkExistence".',
      },
    ]);
});

it("doesn't emit diagnostic for provider action templates using GET", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace
    namespace Microsoft.Foo;

    model VmSize {
      cpus: int32;
    }

    @armResourceOperations
    interface ProviderOperations {
      @get
      getVmsSizes is ArmProviderActionSync<void, VmSize, SubscriptionActionScope>;
    }
    `,
    )
    .toBeValid();
});

describe("Resource operation verbs", () => {
  function resourceOperationSetup(operation: string): string {
    return `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model FooResource is TrackedResource<{}> {
        ...ResourceNameParameter<FooResource>;
      }

      @armResourceOperations
      interface FooResources {
        ${operation}
      }
    `;
  }

  it("accepts explicitly decorated HEAD operations", async () => {
    await tester
      .expect(
        resourceOperationSetup(`
        @armResourceCheckExistence(FooResource)
        @head
        exists(...ResourceInstanceParameters<FooResource>): ArmResourceExistsResponse | ArmResourceNotFoundResponse;
      `),
      )
      .toBeValid();
  });

  it("accepts the standard HEAD template", async () => {
    await tester
      .expect(resourceOperationSetup(`exists is ArmResourceCheckExistence<FooResource>;`))
      .toBeValid();
  });

  it("accepts GET resource actions", async () => {
    await tester
      .expect(
        resourceOperationSetup(`
          @armResourceAction(FooResource)
          @get
          action(...ResourceInstanceParameters<FooResource>): ArmResponse<FooResource>;
        `),
      )
      .toBeValid();
  });

  it.each([
    ["providerOperation", "get"],
    ["providerOperation", "post"],
    ["armResourceCollectionAction", "get"],
    ["armResourceCollectionAction", "post"],
  ])("does not accept provider-only @%s on a resource %s operation", async (decorator, verb) => {
    await tester
      .expect(
        resourceOperationSetup(`
          @${decorator}
          @${verb}
          action(...ResourceInstanceParameters<FooResource>): ArmResponse<FooResource>;
        `),
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
        message: new RegExp(`Resource ${verb.toUpperCase()} operation must be decorated with`),
      });
  });

  it.each([
    ["armResourceRead(FooResource)", "head", "HEAD", "@armResourceCheckExistence"],
    ["armResourceCheckExistence(FooResource)", "get", "GET", "@armResourceRead"],
  ])("rejects @%s on %s", async (decorator, verb, upperVerb, requiredDecorator) => {
    await tester
      .expect(
        resourceOperationSetup(`
        @${decorator}
        @${verb}
        operation(...ResourceInstanceParameters<FooResource>): ArmResponse<FooResource>;
      `),
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
        message: new RegExp(
          `Resource ${upperVerb} operation must be decorated with ${requiredDecorator}`,
        ),
      });
  });

  it.each([
    ["ArmResourceCreateOrReplaceAsync<FooResource>", "get", "GET", "@armResourceRead"],
    ["ArmResourceRead<FooResource>", "post", "POST", "@armResourceAction"],
    ["ArmResourceListByParent<FooResource>", "post", "POST", "@armResourceAction"],
    ["ArmResourcePatchSync<FooResource, {}>", "get", "GET", "@armResourceRead"],
    ["ArmResourceDeleteSync<FooResource>", "get", "GET", "@armResourceRead"],
    ["ArmResourceCheckExistence<FooResource>", "get", "GET", "@armResourceRead"],
  ])(
    "rejects an invalid verb override on %s",
    async (template, verb, upperVerb, requiredDecorator) => {
      await tester
        .expect(
          resourceOperationSetup(`
        @${verb}
        operation is ${template};
      `),
        )
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
          message: new RegExp(
            `Resource ${upperVerb} operation must be decorated with ${requiredDecorator}`,
          ),
        });
    },
  );

  it("does not mistake an undecorated operation without provider parameters for a provider operation", async () => {
    await tester
      .expect(resourceOperationSetup(`@get operation(query: string): string;`))
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
        message: /Resource GET operation must be decorated with @armResourceRead/,
      });
  });
});

it("doesn't emit diagnostic for operation templates", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.ContosoProviderHub;

      @armResourceOperations
      interface Employees {
        getData is ArmBodyProviderActionSync<string>;
      }

      op ArmBodyProviderActionSync<T>(t: T, ...Azure.ResourceManager.Foundations.DefaultBaseParameters<TenantActionScope>): void;
    `,
    )
    .toBeValid();
});

describe("Private ARM resource decorators", () => {
  function buildPrivateDecoratorTestSpec(operation: string = ""): string {
    return `
      @armProviderNamespace
      namespace Microsoft.Foo;
      using Azure.ResourceManager.Private;

      model FooResource is TrackedResource<{}> {
        ...ResourceNameParameter<FooResource>;
      }

      model BarResource is ExtensionResource<{}> {
        ...ResourceNameParameter<BarResource>;
      }

      @armResourceOperations
      interface FooResources {
        ${operation}
      }
    `;
  }

  const privateDecorators = [
    "extensionResourceOperation(FooResource, BarResource,",
    "legacyResourceOperation(FooResource,",
    "builtInResourceOperation(FooResource, BarResource,",
    "legacyExtensionResourceOperation(FooResource,",
  ];

  it.each(privateDecorators)("accepts HEAD with @%s checkExistence", async (decorator) => {
    await tester
      .expect(
        buildPrivateDecoratorTestSpec(`
        @${decorator} "checkExistence")
        @head
        exists(...ResourceInstanceParameters<FooResource>): ArmResourceExistsResponse | ArmResourceNotFoundResponse;
      `),
      )
      .toBeValid();
  });

  it.each(privateDecorators)("rejects HEAD with @%s read", async (decorator) => {
    await tester
      .expect(
        buildPrivateDecoratorTestSpec(`
        @${decorator} "read")
        @head
        exists(...ResourceInstanceParameters<FooResource>): ArmResourceExistsResponse | ArmResourceNotFoundResponse;
      `),
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
        message: `Resource HEAD operation decorator @${decorator.split("(")[0]} must use operationType "checkExistence".`,
      });
  });

  it.each(privateDecorators)(
    "validates @%s operationType even with a public HEAD decorator",
    async (decorator) => {
      for (const decorators of [
        `@${decorator} "read") @armResourceCheckExistence(FooResource)`,
        `@armResourceCheckExistence(FooResource) @${decorator} "read")`,
      ]) {
        await tester
          .expect(
            buildPrivateDecoratorTestSpec(`
            ${decorators}
            @head
            exists(...ResourceInstanceParameters<FooResource>): ArmResourceExistsResponse | ArmResourceNotFoundResponse;
          `),
          )
          .toEmitDiagnostics({
            code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
            message: `Resource HEAD operation decorator @${decorator.split("(")[0]} must use operationType "checkExistence".`,
          });
      }
    },
  );

  it.each(privateDecorators)("accepts GET with @%s action", async (decorator) => {
    await tester
      .expect(
        buildPrivateDecoratorTestSpec(`
        @${decorator} "action")
        @get
        action(...ResourceInstanceParameters<FooResource>): ArmResponse<FooResource>;
      `),
      )
      .toBeValid();
  });

  it("doesn't emit a diagnostic for operations with @extensionResourceOperation", async () => {
    const content = buildPrivateDecoratorTestSpec(`
      @extensionResourceOperation(FooResource, BarResource, "read")
      @get
      getExtension(...ResourceInstanceParameters<FooResource>): ArmResponse<BarResource> | ErrorResponse;
    `);
    await tester.expect(content).toBeValid();
  });

  it("doesn't emit a diagnostic for operations with @legacyResourceOperation", async () => {
    const content = buildPrivateDecoratorTestSpec(`
      @legacyResourceOperation(FooResource, "read")
      @get
      getLegacy(...ResourceInstanceParameters<FooResource>): ArmResponse<FooResource> | ErrorResponse;
    `);
    await tester.expect(content).toBeValid();
  });

  it("doesn't emit a diagnostic for operations with @builtInResourceOperation", async () => {
    const content = buildPrivateDecoratorTestSpec(`
      @builtInResourceOperation(FooResource, BarResource, "list")
      @get
      listBuiltIn(...ResourceInstanceParameters<FooResource>): ArmResponse<BarResource> | ErrorResponse;
    `);
    await tester.expect(content).toBeValid();
  });

  it("doesn't emit a diagnostic for operations with @legacyExtensionResourceOperation", async () => {
    const content = buildPrivateDecoratorTestSpec(`
      @legacyExtensionResourceOperation(FooResource, "read")
      @get
      getLegacyExtension(...ResourceInstanceParameters<FooResource>): ArmResponse<FooResource> | ErrorResponse;
    `);
    await tester.expect(content).toBeValid();
  });

  it("emits diagnostic when @extensionResourceOperation operationType doesn't match the HTTP verb", async () => {
    const content = buildPrivateDecoratorTestSpec(`
      @extensionResourceOperation(FooResource, BarResource, "createOrUpdate")
      @post
      doAction(...ResourceInstanceParameters<FooResource>): ArmResponse<BarResource> | ErrorResponse;
    `);
    await tester.expect(content).toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
      message:
        'Resource POST operation decorator @extensionResourceOperation must use operationType "action".',
    });
  });

  it("emits diagnostic when @legacyResourceOperation operationType doesn't match the HTTP verb", async () => {
    const content = buildPrivateDecoratorTestSpec(`
      @legacyResourceOperation(FooResource, "createOrUpdate")
      @post
      doAction(...ResourceInstanceParameters<FooResource>): ArmResponse<FooResource> | ErrorResponse;
    `);
    await tester.expect(content).toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
      message:
        'Resource POST operation decorator @legacyResourceOperation must use operationType "action".',
    });
  });

  it("emits diagnostic when @builtInResourceOperation operationType doesn't match the HTTP verb", async () => {
    const content = buildPrivateDecoratorTestSpec(`
      @builtInResourceOperation(FooResource, BarResource, "createOrUpdate")
      @post
      doAction(...ResourceInstanceParameters<FooResource>): ArmResponse<BarResource> | ErrorResponse;
    `);
    await tester.expect(content).toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
      message:
        'Resource POST operation decorator @builtInResourceOperation must use operationType "action".',
    });
  });

  it("emits diagnostic when @legacyExtensionResourceOperation operationType doesn't match the HTTP verb", async () => {
    const content = buildPrivateDecoratorTestSpec(`
      @legacyExtensionResourceOperation(FooResource, "createOrUpdate")
      @post
      doAction(...ResourceInstanceParameters<FooResource>): ArmResponse<FooResource> | ErrorResponse;
    `);
    await tester.expect(content).toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
      message:
        'Resource POST operation decorator @legacyExtensionResourceOperation must use operationType "action".',
    });
  });
});

describe("Provider operations", () => {
  function providerOperationSetup(operation: string = "", content: string = ""): string {
    return `
      @armProviderNamespace
      namespace Microsoft.Foo;
  
      model Employee is TrackedResource<{}> {
        ...ResourceNameParameter<Employee>;
      }

      op ComputeProviderActionAsync<
        Request extends {} | void = void,
        Response extends {} | void = void,
        Parameters extends {} = {},
      > is ArmProviderActionAsync<Request, Response, TenantActionScope, Parameters>;
       
      ${content}

      interface VirtualMachinesOperations {
        ${operation}
      }
    `;
  }

  it("requires a provider decorator on the standard provider operations list", async () => {
    await tester
      .expect(
        providerOperationSetup(
          ``,
          `
        interface Operations {
          list is Azure.ResourceManager.Operations.list;
        }
      `,
        ),
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
        message:
          "Provider operations must be decorated with @providerOperation or @armResourceCollectionAction.",
      });
  });

  it("accepts a provider decorator on the standard provider operations list", async () => {
    await tester
      .expect(
        providerOperationSetup(
          ``,
          `
        interface Operations {
          @armResourceCollectionAction
          list is Azure.ResourceManager.Operations.list;
        }
      `,
        ),
      )
      .toBeValid();
  });

  it("doesn't emit a diagnostic for provider operations", async () => {
    const content = providerOperationSetup(
      `
        @autoRoute
        @get
        @action("virtualMachines")
        listByLocation is ComputeProviderActionAsync<Response = ResourceListResult<Employee>>;
        `,
    );
    await tester.expect(content).toBeValid();
  });

  it("doesn't emit a diagnostic for provider operations with location", async () => {
    const content = providerOperationSetup(
      `
        @autoRoute
        @get
        @action("virtualMachinesGet")
        get is ComputeProviderActionAsync<Response = ResourceListResult<Employee>, Parameters = LocationParameter>;
        `,
    );
    await tester.expect(content).toBeValid();
  });

  it("accepts provider GET actions with dynamic segments", async () => {
    const content = providerOperationSetup(
      `
        @autoRoute
        @get
        @action("virtualMachines")
        listByLocation is ComputeProviderActionAsync<
          Response = ResourceListResult<Employee>,
          Parameters = LocationParameter & MoveResponseParameter
        >; 
        `,
      ` 
        model MoveResponseParameter {
          @path
          @minLength(1)
          @segment("moves")
          move: string;
        }
        `,
    );

    await tester.expect(content).toBeValid();
  });

  it.each(["get", "post"])(
    "requires decorators on custom provider operations using %s",
    async (verb) => {
      await tester
        .expect(
          providerOperationSetup(`
        @${verb}
        operation(
          ...Azure.ResourceManager.Foundations.DefaultBaseParameters<TenantActionScope>,
          ...Azure.ResourceManager.Foundations.DefaultProviderNamespace
        ): string;
      `),
        )
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
          message:
            "Provider operations must be decorated with @providerOperation or @armResourceCollectionAction.",
        });
    },
  );

  it.each([
    ["get", "providerOperation"],
    ["post", "providerOperation"],
    ["get", "armResourceCollectionAction"],
    ["post", "armResourceCollectionAction"],
  ])("accepts provider %s operations with @%s", async (verb, decorator) => {
    await tester
      .expect(
        providerOperationSetup(`
        @${decorator}
        @${verb}
        operation(
          ...Azure.ResourceManager.Foundations.DefaultBaseParameters<TenantActionScope>,
          ...Azure.ResourceManager.Foundations.DefaultProviderNamespace
        ): string;
      `),
      )
      .toBeValid();
  });

  it.each(["put", "patch", "delete", "head"])(
    "rejects @providerOperation using %s",
    async (verb) => {
      await tester
        .expect(
          providerOperationSetup(`
          @providerOperation
          @${verb}
          operation(): string;
        `),
        )
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
          message: `Provider ${verb.toUpperCase()} operation must use GET or POST.`,
        });
    },
  );

  it("requires a resource decorator after a dynamic provider path segment", async () => {
    await tester
      .expect(
        providerOperationSetup(`
        @get
        operation(
          ...Azure.ResourceManager.Foundations.DefaultBaseParameters<TenantActionScope>,
          ...Azure.ResourceManager.Foundations.DefaultProviderNamespace,
          @path @segment("employees") employeeName: string,
          @query filter: string
        ): string;
      `),
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
        message: /Resource GET operation must be decorated with @armResourceRead/,
      });
  });

  it.each(["put", "patch", "delete", "head"])(
    "rejects custom provider operations using %s",
    async (verb) => {
      await tester
        .expect(
          providerOperationSetup(`
          @${verb}
          operation(
            ...Azure.ResourceManager.Foundations.DefaultBaseParameters<TenantActionScope>,
            ...Azure.ResourceManager.Foundations.DefaultProviderNamespace,
            @query filter: string
          ): string;
        `),
        )
        .toEmitDiagnostics([
          {
            code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
            message:
              "Provider operations must be decorated with @providerOperation or @armResourceCollectionAction.",
          },
          {
            code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
            message: `Provider ${verb.toUpperCase()} operation must use GET or POST.`,
          },
        ]);
    },
  );

  it.each(["put", "patch", "delete", "head"])(
    "rejects provider action templates overridden to %s",
    async (verb) => {
      await tester
        .expect(
          providerOperationSetup(`
          @${verb}
          operation is ArmProviderActionSync;
        `),
        )
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-resource-manager/use-operation-decorator",
          message: `Provider ${verb.toUpperCase()} operation must use GET or POST.`,
        });
    },
  );
});
