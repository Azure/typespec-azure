import { getSourceLocation, resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { describe, it, vi } from "vitest";
import { lroExtensionRule } from "../../src/rules/lro-extension.js";

vi.mock("@azure-tools/typespec-autorest", () => {
  throw new Error("Native lint must not load the AutoRest emitter.");
});
vi.mock("@azure-tools/typespec-client-generator-core", () => {
  throw new Error("ARM lint must not load TCGC.");
});

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
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
using TypeSpec.Versioning;
using Azure.ResourceManager;
@armProviderNamespace
@service
@versioned(Versions)
namespace Microsoft.TestService;
enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
  v2024_01_01: "2024-01-01",
}
model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName") @segment("widgets")
  @pattern("^[a-zA-Z0-9-]{3,24}$") @path
  name: string;
}
model WidgetProperties {
  description?: string;
  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}
union ProvisioningState { string, ResourceProvisioningState }
model PlainLocationHeaders {
  ...Azure.Core.Foundations.RetryAfterHeader;
  @header("Location") location?: string;
}
interface Operations extends Azure.ResourceManager.Operations {}
`;
const diagnostic = {
  code: "tsp-lintdiff-local-linter/lro-extension",
  message: lroExtensionRule.messages.default,
};

async function tester() {
  return createLinterRuleTester(
    await Tester.createInstance(),
    lroExtensionRule,
    "tsp-lintdiff-local-linter",
  );
}

describe("lro-extension", () => {
  it.each([
    [
      "sync PATCH with a customized accepted response",
      "update is ArmCustomPatchSync<Widget, Widget, Response = ArmResponse<Widget> | ArmAcceptedResponse<ExtraHeaders = PlainLocationHeaders>>;",
    ],
    [
      "async PATCH with plain Location headers",
      "update is ArmCustomPatchAsync<Widget, Widget, LroHeaders = PlainLocationHeaders>;",
    ],
  ])("reports %s on the authored operation", async (_, operation) => {
    await (
      await tester()
    )
      .expect(
        `${header}
        @armResourceOperations
        interface Widgets { /*target*/${operation} }
      `,
      )
      .toEmitDiagnostics(({ target }) => ({
        ...diagnostic,
        pos: getSourceLocation(target).pos,
        end: getSourceLocation(target).end,
      }));
  });

  it.each([
    [
      "sync provider POST with a customized accepted response",
      "startProvider is ArmProviderActionSync<Request = void, Response = ArmAcceptedResponse<ExtraHeaders = PlainLocationHeaders>>;",
    ],
    [
      "async provider POST with plain Location headers",
      "startProvider is ArmProviderActionAsync<Request = void, Response = void, LroHeaders = PlainLocationHeaders>;",
    ],
  ])("reports %s outside registered resource operations", async (_, operation) => {
    await (
      await tester()
    )
      .expect(
        `${header}
        @armResourceOperations
        interface ProviderOperations { /*target*/${operation} }
      `,
      )
      .toEmitDiagnostics(({ target }) => ({
        ...diagnostic,
        pos: getSourceLocation(target).pos,
        end: getSourceLocation(target).end,
      }));
  });

  it.each([
    "update is ArmResourcePatchAsync<Widget, WidgetProperties>;",
    "update is ArmCustomPatchAsync<Widget, Widget>;",
    "update is ArmCustomPatchAsync<Widget, Widget, LroHeaders = ArmLroLocationHeader<FinalResult = Widget> & Azure.Core.Foundations.RetryAfterHeader>;",
    "update is ArmCustomPatchSync<Widget, Widget>;",
    "update is ArmCustomPatchSync<Widget, Widget, Response = ArmResponse<Widget> | ArmAcceptedResponse<ExtraHeaders = ArmLroLocationHeader<FinalResult = Widget>>>;",
  ])("accepts PATCH with native polling metadata or no 202: %s", async (operation) => {
    await (
      await tester()
    )
      .expect(`${header} @armResourceOperations interface Widgets { ${operation} }`)
      .toBeValid();
  });

  it.each([
    "startProvider is ArmProviderActionAsync<Request = void, Response = void>;",
    "startProvider is ArmProviderActionSync<Request = void, Response = void>;",
    "startProvider is ArmProviderActionSync<Request = void, Response = ArmAcceptedResponse<ExtraHeaders = ArmLroLocationHeader>>;",
  ])("accepts provider actions with native polling metadata or no 202: %s", async (operation) => {
    await (
      await tester()
    )
      .expect(`${header} @armResourceOperations interface ProviderOperations { ${operation} }`)
      .toBeValid();
  });

  it("reaches provider actions in nested namespaces", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        namespace Nested {
          @armResourceOperations
          interface ProviderOperations {
            /*target*/startProvider is ArmProviderActionAsync<
              Request = void, Response = void, LroHeaders = PlainLocationHeaders
            >;
          }
        }
      `,
      )
      .toEmitDiagnostics(({ target }) => ({
        ...diagnostic,
        pos: getSourceLocation(target).pos,
        end: getSourceLocation(target).end,
      }));
  });

  it("reports a nested service operation only once across recursive service traversals", async () => {
    await (
      await tester()
    )
      .expect(
        `${header.replace(
          "interface Operations extends",
          '@route("/parent") interface Operations extends',
        )}
        @armProviderNamespace("Microsoft.Nested")
        @service
        @versioned(Versions)
        namespace Nested {
          @route("/child")
          interface Operations extends Azure.ResourceManager.Operations {}

          @armResourceOperations
          interface ProviderOperations {
            /*target*/startProvider is ArmProviderActionAsync<
              Request = void, Response = void, LroHeaders = PlainLocationHeaders
            >;
          }
        }
      `,
      )
      .toEmitDiagnostics(({ target }) => ({
        ...diagnostic,
        pos: getSourceLocation(target).pos,
        end: getSourceLocation(target).end,
      }));
  });

  it("targets each provider operation once when they share response headers", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        @armResourceOperations
        interface ProviderOperations {
          /*start*/startProvider is ArmProviderActionAsync<
            Request = void, Response = void, LroHeaders = PlainLocationHeaders
          >;
          /*stop*/stopProvider is ArmProviderActionAsync<
            Request = void, Response = void, LroHeaders = PlainLocationHeaders
          >;
        }
      `,
      )
      .toEmitDiagnostics(({ start, stop }) =>
        [start, stop].map((operation) => ({
          ...diagnostic,
          pos: getSourceLocation(operation).pos,
          end: getSourceLocation(operation).end,
        })),
      );
  });

  it("keeps the lintdiff ARM service isolation separate from PATCH semantics", async () => {
    await (
      await tester()
    )
      .expect(
        `
        using TypeSpec.Http;
        @service namespace DataPlane;
        model Accepted { @statusCode statusCode: 202; }
        @patch @route("/widgets") op update(): Accepted;
      `,
      )
      .toBeValid();
  });
});
