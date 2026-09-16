import { resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { describe, it, vi } from "vitest";
import { putInOperationNameRule } from "../../src/rules/put-in-operation-name.js";

vi.mock("@azure-tools/typespec-autorest", () => {
  throw new Error("Native lint must not load the AutoRest emitter.");
});
vi.mock("@azure-tools/typespec-client-generator-core", () => {
  throw new Error("ARM lint must not load TCGC.");
});

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    // Required transitively by ARM, not used by the rule or authored snippets.
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
}).importLibraries();

const header = `
  using TypeSpec.Http;
  using TypeSpec.Rest;
  using Azure.ResourceManager;
  @armProviderNamespace @service
  @armCommonTypesVersion(CommonTypes.Versions.v5)
  namespace Arm;
`;

async function tester() {
  return createLinterRuleTester(
    await Tester.createInstance(),
    putInOperationNameRule,
    "tsp-lintdiff-local-linter",
  );
}

function diagnostic(operationName: string) {
  return {
    code: "tsp-lintdiff-local-linter/put-in-operation-name",
    message: `'PUT' operation '${operationName}' should use method name 'create'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
  };
}

describe("put-in-operation-name", () => {
  it.each(["set", "put", "recreate", "replace"])("rejects PUT name %s", async (name) => {
    await (
      await tester()
    )
      .expect(`${header} @put @route("/item") op ${name}(): string;`)
      .toEmitDiagnostics([diagnostic(name)]);
  });

  it.each(["create", "createOrUpdate", "createOrReplace", "createWidget", "CreateWidget"])(
    "accepts native create prefix %s",
    async (name) => {
      await (
        await tester()
      )
        .expect(`${header} @put @route("/item") op ${name}(): string;`)
        .toBeValid();
    },
  );

  it("ignores other HTTP verbs", async () => {
    await (await tester()).expect(`${header} @get @route("/item") op set(): string;`).toBeValid();
  });

  it("does not diagnose generic operation declarations or instantiations", async () => {
    await (
      await tester()
    )
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
    await (
      await tester()
    )
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

  it("checks endpoints inside nested namespaces", async () => {
    await (
      await tester()
    )
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
    await (
      await tester()
    )
      .expect(
        `${header}
        @route("/item") interface CreateWidgets { @put op set(): string; }
        @route("/other") interface Widgets { @put op set_Create(): string; }
      `,
      )
      .toEmitDiagnostics([diagnostic("set"), diagnostic("set_Create")]);
  });

  it("retains historical operations but does not simulate historical names", async () => {
    await (
      await tester()
    )
      .expect(
        `
        using TypeSpec.Http;
        using TypeSpec.Versioning;
        using Azure.ResourceManager;
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

  it("leaves data-plane services and declarations outside the ARM service alone", async () => {
    await (
      await tester()
    )
      .expect(
        `
        using TypeSpec.Http;
        using Azure.ResourceManager;
        @put @route("/outside") op set(): string;
        @service namespace DataPlane {
          @put @route("/data") op replace(): string;
        }
        @service @armProviderNamespace
        @armCommonTypesVersion(CommonTypes.Versions.v5)
        namespace Arm {
          @put @route("/arm") op create(): string;
        }
      `,
      )
      .toBeValid();
  });

  it("checks a standard ARM template alias without OpenAPI overrides", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget is TrackedResource<Properties> {
          @key("widgetName") @segment("widgets") name: string;
        }
        model Properties { provisioningState?: ResourceProvisioningState; }
        @armResourceOperations interface Widgets {
          set is ArmResourceCreateOrReplaceAsync<Widget>;
        }
      `,
      )
      .toEmitDiagnostics([diagnostic("set")]);
  });
});
