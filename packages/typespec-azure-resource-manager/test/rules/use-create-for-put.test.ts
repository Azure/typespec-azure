import { Tester } from "#test/tester.js";
import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it, vi } from "vitest";
import { useCreateForPutRule } from "../../src/rules/use-create-for-put.js";

vi.mock("@azure-tools/typespec-autorest", () => {
  throw new Error("Native lint must not load the AutoRest emitter.");
});
vi.mock("@azure-tools/typespec-client-generator-core", () => {
  throw new Error("ARM lint must not load TCGC.");
});

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    useCreateForPutRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const header = `
  @armProviderNamespace @service
  @armCommonTypesVersion(CommonTypes.Versions.v5)
  namespace Arm;
`;

const widget = `
  model Widget is TrackedResource<Properties> {
    @key("widgetName") @segment("widgets") name: string;
  }
  model Properties { provisioningState?: ResourceProvisioningState; }
`;

function diagnostic(operationName: string) {
  return {
    code: "@azure-tools/typespec-azure-resource-manager/use-create-for-put",
    severity: "warning" as const,
    message: `'PUT' operation '${operationName}' should use method name 'create'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
    target: operationName,
  };
}

describe("use-create-for-put", () => {
  // cspell:ignore creat
  it.each(["set", "put", "recreate", "replace", "c", "creat"])(
    "rejects PUT name %s",
    async (name) => {
      await tester
        .expect(`${header} @put @route("/item") op ${name}(): string;`)
        .toEmitDiagnostics([diagnostic(name)]);
    },
  );

  it.each(["create", "createOrUpdate", "createOrReplace", "createWidget", "CreateWidget"])(
    "accepts native create prefix %s",
    async (name) => {
      await tester.expect(`${header} @put @route("/item") op ${name}(): string;`).toBeValid();
    },
  );

  it.each(["get", "post", "patch", "delete", "head"])("ignores HTTP verb %s", async (verb) => {
    await tester
      .expect(`${header} @${verb} @route("/item") op set(): { @statusCode code: 204 };`)
      .toBeValid();
  });

  it.each([200, 201, 202, 204])(
    "checks PUT names independently of response code %s",
    async (code) => {
      await tester
        .expect(`${header} @put @route("/item") op replace(): { @statusCode code: ${code} };`)
        .toEmitDiagnostics([diagnostic("replace")]);
    },
  );

  it("does not diagnose generic operation declarations or instantiations", async () => {
    await tester
      .expect(
        `${header}
        @put op PutTemplate<T>(@body body: T): T;
        @route("/item") op create is PutTemplate<string>;
        interface Templates<T> {
          @put op put(@body body: T): T;
        }
      `,
      )
      .toBeValid();
  });

  it("checks concrete template aliases and inherited interface endpoints once each", async () => {
    await tester
      .expect(
        `${header}
        @put op PutTemplate<T>(@body body: T): T;
        interface Templates<T> { @put op set(@body body: T): T; }
        @route("/alias") op replace is PutTemplate<string>;
        @route("/inherited") interface Items extends Templates<string> {}
      `,
      )
      .toEmitDiagnostics([diagnostic("replace"), diagnostic("set")]);
  });

  it("checks endpoints inside nested ARM namespaces", async () => {
    await tester
      .expect(
        `${header}
        namespace Nested {
          @route("/item") interface Items { @put op set(): string; }
        }
      `,
      )
      .toEmitDiagnostics([diagnostic("set")]);
  });

  it("does not let the interface name or underscores mask a non-create operation", async () => {
    await tester
      .expect(
        `${header}
        @route("/item") interface CreateWidgets { @put op set(): string; }
        @route("/other") interface Widgets { @put op set_Create(): string; }
      `,
      )
      .toEmitDiagnostics([diagnostic("set"), diagnostic("set_Create")]);
  });

  it("retains historical operations but does not simulate historical names", async () => {
    await tester
      .expect(
        `
        @service @armProviderNamespace @versioned(Versions)
        @armCommonTypesVersion(CommonTypes.Versions.v5)
        namespace Arm;
        enum Versions { v1, v2 }
        @removed(Versions.v2) @route("/old") @put op set(): string;
        @renamedFrom(Versions.v2, "replace") @route("/renamed") @put op create(): string;
      `,
      )
      .toEmitDiagnostics([diagnostic("set")]);
  });

  it("checks ordinary service namespaces without provider metadata", async () => {
    await tester
      .expect(
        `
        @service namespace Contoso {
          @put @route("/item") op set(): string;
        }
      `,
      )
      .toEmitDiagnostics([diagnostic("set")]);
  });

  it("checks nested service namespaces without provider metadata", async () => {
    await tester
      .expect(
        `
        namespace Contoso {
          @service namespace Management {
            namespace Nested {
              @route("/item") interface Items { @put op replace(): string; }
            }
          }
        }
      `,
      )
      .toEmitDiagnostics([diagnostic("replace")]);
  });

  it("ignores non-service helpers and Azure library declarations", async () => {
    await tester
      .expect(
        `
        @put @route("/outside") op set(): string;
        namespace Customizations { @put op replace(): string; }
        namespace Azure.Core { @put op PutTemplate<T>(@body body: T): T; }
        namespace Azure.ResourceManager { @put op SetTemplate<T>(@body body: T): T; }
        @service namespace Contoso {
          @put @route("/item") op create(): string;
        }
      `,
      )
      .toBeValid();
  });

  it("reports the authored setWidgetConfig name despite an explicit operationId", async () => {
    await tester
      .expect(
        `
        ${header}
        @TypeSpec.OpenAPI.operationId("Widgets_Set")
        @route("/config") @put
        op setWidgetConfig(@body body: { config: string }): {
          @statusCode statusCode: 200;
          @body result: { config: string };
        };
      `,
      )
      .toEmitDiagnostics([diagnostic("setWidgetConfig")]);
  });

  it("reports a standard ARM create template aliased as set", async () => {
    await tester
      .expect(
        `${header}
        ${widget}
        @armResourceOperations interface Widgets {
          set is ArmResourceCreateOrReplaceAsync<Widget>;
        }
      `,
      )
      .toEmitDiagnostics([diagnostic("set")]);
  });

  it("allows a standard ARM create template aliased as createOrUpdate", async () => {
    await tester
      .expect(
        `${header}
        ${widget}
        @armResourceOperations interface Widgets {
          createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        }
      `,
      )
      .toBeValid();
  });

  it("ignores explicit operationId overrides of a compliant authored name", async () => {
    await tester
      .expect(
        `
        ${header}
        @TypeSpec.OpenAPI.operationId("Widgets_Set")
        @put @route("/item") op create(): string;
      `,
      )
      .toBeValid();
  });
});
