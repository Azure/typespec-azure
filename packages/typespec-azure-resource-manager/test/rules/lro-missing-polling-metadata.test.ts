import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { lroMissingPollingMetadataRule } from "../../src/rules/lro-missing-polling-metadata.js";

const header = `
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
  code: "@azure-tools/typespec-azure-resource-manager/lro-missing-polling-metadata",
  message: lroMissingPollingMetadataRule.messages.default,
};
let tester: LinterRuleTester;

beforeEach(async () => {
  const rawTester = await Tester.createInstance();
  tester = createLinterRuleTester(
    rawTester,
    lroMissingPollingMetadataRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

async function expectViolation(operation: string, interfaceName: string) {
  await tester
    .expect(
      `${header}
      @armResourceOperations
      interface ${interfaceName} { /*target*/${operation} }
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      ...diagnostic,
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
}

async function expectCompliant(operation: string, interfaceName: string) {
  await tester
    .expect(`${header} @armResourceOperations interface ${interfaceName} { ${operation} }`)
    .toBeValid();
}

it("reports a synchronous custom PATCH returning 202 without polling metadata", async () => {
  await expectViolation(
    "update is ArmCustomPatchSync<Widget, Widget, Response = ArmResponse<Widget> | ArmAcceptedResponse<ExtraHeaders = PlainLocationHeaders>>;",
    "Widgets",
  );
});

it("reports an async PATCH customization without polling metadata", async () => {
  await expectViolation(
    "update is ArmCustomPatchAsync<Widget, Widget, LroHeaders = PlainLocationHeaders>;",
    "Widgets",
  );
});

it("reports a synchronous provider POST returning 202 without polling metadata", async () => {
  await expectViolation(
    "startProvider is ArmProviderActionSync<Request = void, Response = ArmAcceptedResponse<ExtraHeaders = PlainLocationHeaders>>;",
    "ProviderOperations",
  );
});

it("reports an async provider POST with plain Location headers", async () => {
  await expectViolation(
    "startProvider is ArmProviderActionAsync<Request = void, Response = void, LroHeaders = PlainLocationHeaders>;",
    "ProviderOperations",
  );
});

it("accepts standard async resource PATCH polling metadata", async () => {
  await expectCompliant("update is ArmResourcePatchAsync<Widget, WidgetProperties>;", "Widgets");
});

it("accepts default async custom PATCH polling metadata", async () => {
  await expectCompliant("update is ArmCustomPatchAsync<Widget, Widget>;", "Widgets");
});

it("accepts an async PATCH with semantic LRO headers", async () => {
  await expectCompliant(
    "update is ArmCustomPatchAsync<Widget, Widget, LroHeaders = ArmLroLocationHeader<FinalResult = Widget> & Azure.Core.Foundations.RetryAfterHeader>;",
    "Widgets",
  );
});

it("accepts synchronous custom PATCH without a 202 response", async () => {
  await expectCompliant("update is ArmCustomPatchSync<Widget, Widget>;", "Widgets");
});

it("accepts synchronous custom PATCH with semantic accepted-response headers", async () => {
  await expectCompliant(
    "update is ArmCustomPatchSync<Widget, Widget, Response = ArmResponse<Widget> | ArmAcceptedResponse<ExtraHeaders = ArmLroLocationHeader<FinalResult = Widget>>>;",
    "Widgets",
  );
});

it("accepts default async provider polling metadata", async () => {
  await expectCompliant(
    "startProvider is ArmProviderActionAsync<Request = void, Response = void>;",
    "ProviderOperations",
  );
});

it("accepts synchronous provider actions without a 202 response", async () => {
  await expectCompliant(
    "startProvider is ArmProviderActionSync<Request = void, Response = void>;",
    "ProviderOperations",
  );
});

it("accepts synchronous provider actions with semantic accepted-response headers", async () => {
  await expectCompliant(
    "startProvider is ArmProviderActionSync<Request = void, Response = ArmAcceptedResponse<ExtraHeaders = ArmLroLocationHeader>>;",
    "ProviderOperations",
  );
});

it("reports a nested service operation once across overlapping HTTP service traversals", async () => {
  await tester
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

it("reports each distinct provider operation once when response headers are shared", async () => {
  await tester
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

it("checks PATCH without provider metadata when the ARM rule is selected", async () => {
  await tester
    .expect(
      `
      @service namespace SelectedArmProgram;
      model Accepted { @statusCode statusCode: 202; @header("Location") location?: string; }
      @patch @route("/widgets") op /*target*/update(): Accepted;
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      ...diagnostic,
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
});

it("leaves registered resource-instance POST response-code ownership to the existing rule", async () => {
  await expectCompliant(
    "startWidget is ArmResourceActionSync<Widget, Request = void, Response = ArmAcceptedResponse<ExtraHeaders = PlainLocationHeaders>>;",
    "Widgets",
  );
});

it("ignores GET PUT and DELETE accepted responses", async () => {
  await tester
    .expect(
      `
      @service namespace SelectedArmProgram;
      model Accepted { @statusCode statusCode: 202; @header("Location") location?: string; }
      @get @route("/get") op read(): Accepted;
      @put @route("/put") op create(): Accepted;
      @delete @route("/delete") op remove(): Accepted;
    `,
    )
    .toBeValid();
});

it("ignores unmarked POST accepted responses", async () => {
  await tester
    .expect(
      `
      @service namespace SelectedArmProgram;
      model Accepted { @statusCode statusCode: 202; @header("Location") location?: string; }
      @post @route("/action") op act(): Accepted;
    `,
    )
    .toBeValid();
});
