import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import {
  createLinterRuleTester,
  expectDiagnostics,
  t,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { getHttpOperation } from "@typespec/http";
import { beforeEach, describe, expect, it } from "vitest";
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

it("accepts standard async resource operations with qualifying polling responses", async () => {
  await tester
    .expect(
      t.code`${header}
      @armResourceOperations
      interface Widgets {
        ${t.op("createOrUpdate")} is ArmResourceCreateOrReplaceAsync<Widget>;
        ${t.op("update")} is ArmResourcePatchAsync<Widget, WidgetProperties>;
        ${t.op("remove")} is ArmResourceDeleteWithoutOkAsync<Widget>;
      }
    `,
    )
    .toEmitDiagnostics(({ program, createOrUpdate, update, remove }) => {
      for (const operation of [createOrUpdate, update, remove]) {
        const [httpOperation] = getHttpOperation(program, operation);
        expect(
          httpOperation.responses.some(
            (response) =>
              typeof response.statusCodes === "number" &&
              [200, 201, 202, 204].includes(response.statusCodes) &&
              response.responses.some((content) =>
                Object.keys(content.headers ?? {}).some((name) =>
                  ["location", "azure-asyncoperation"].includes(name.toLowerCase()),
                ),
              ),
          ),
        ).toBe(true);
      }
      return [];
    });
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

it("reports polling headers on registered resource-instance POST operations", async () => {
  await expectViolation(
    "startWidget is ArmResourceActionSync<Widget, Request = void, Response = ArmAcceptedResponse<ExtraHeaders = PlainLocationHeaders>>;",
    "Widgets",
  );
});

it("ignores GET PUT and DELETE accepted responses without polling headers", async () => {
  await tester
    .expect(
      `
      @service namespace SelectedArmProgram;
      model Accepted { @statusCode statusCode: 202; }
      @get @route("/get") op read(): Accepted;
      @put @route("/put") op create(): Accepted;
      @delete @route("/delete") op remove(): Accepted;
    `,
    )
    .toBeValid();
});

it("ignores unmarked POST accepted responses without polling headers", async () => {
  await tester
    .expect(
      `
      @service namespace SelectedArmProgram;
      model Accepted { @statusCode statusCode: 202; }
      @post @route("/action") op act(): Accepted;
    `,
    )
    .toBeValid();
});

it("reports PATCH 202 even without a polling header", async () => {
  await tester
    .expect(
      `
      @service namespace SelectedArmProgram;
      @patch op /*target*/update(): { @statusCode statusCode: 202; };
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      ...diagnostic,
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
});

it("reports a marked provider POST 202 even without a polling header", async () => {
  await tester
    .expect(
      `${header}
      model Accepted { @statusCode statusCode: 202; }
      @armResourceOperations
      interface ProviderOperations {
        /*target*/start is ArmProviderActionSync<Request = void, Response = Accepted>;
      }
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      ...diagnostic,
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
});

it.each([
  ["put", 201, "Azure-AsyncOperation"],
  ["patch", 200, "lOcAtIoN"],
  ["post", 202, "Location"],
  ["delete", 204, "azure-asyncoperation"],
])("reports %s %s with %s on the operation", async (verb, status, name) => {
  await tester
    .expect(
      `
      @service namespace SelectedArmProgram;
      model Response {
        @statusCode statusCode: ${status};
        @header("${name}") pollingUrl?: string;
      }
      @${verb} op /*target*/test(): Response;
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      ...diagnostic,
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
});

it.each([
  ["get", 202, "Location"],
  ["head", 200, "Azure-AsyncOperation"],
  ["post", 203, "Location"],
  ["post", 400, "Azure-AsyncOperation"],
  ["post", 200, "Operation-Location"],
  ["post", 200, "Retry-After"],
])("ignores %s %s with %s", async (verb, status, name) => {
  await tester
    .expect(
      `
      @service namespace SelectedArmProgram;
      @${verb} op test(): {
        @statusCode statusCode: ${status};
        @header("${name}") pollingUrl?: string;
      };
    `,
    )
    .toBeValid();
});

it("reports a qualifying header after an unrelated header", async () => {
  await tester
    .expect(
      `
      @service namespace SelectedArmProgram;
      @post op /*target*/test(): {
        @statusCode statusCode: 200;
        @header("Retry-After") retryAfter?: int32;
        @header("Location") pollingUrl?: string;
      };
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      ...diagnostic,
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
});

it("does not accept an output-only LRO extension as polling metadata", async () => {
  const runner = await Tester.import("@typespec/openapi").createInstance();
  const extensionTester = createLinterRuleTester(
    runner,
    lroMissingPollingMetadataRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
  await extensionTester
    .expect(
      `
      @service namespace SelectedArmProgram;
      @OpenAPI.extension("x-ms-long-running-operation", true)
      @post op /*target*/test(): {
        @statusCode statusCode: 200;
        @header("Location") pollingUrl?: string;
      };
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      ...diagnostic,
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
});

it("reports once when several responses and headers require polling metadata", async () => {
  await tester
    .expect(
      `
      @service namespace SelectedArmProgram;
      model Created {
        @statusCode statusCode: 201;
        @header("Azure-AsyncOperation") pollingUrl?: string;
      }
      model Accepted {
        @statusCode statusCode: 202;
        @header("Location") location?: string;
        @header("Azure-AsyncOperation") pollingUrl?: string;
      }
      @patch op /*target*/update(): Created | Accepted;
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      ...diagnostic,
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
});

it("reports each header-triggered operation when response properties are shared", async () => {
  await tester
    .expect(
      `
      @service namespace SelectedArmProgram;
      model Response {
        @statusCode statusCode: 201;
        @header("Location") pollingUrl?: string;
      }
      @put @route("/one") op /*first*/first(): Response;
      @put @route("/two") op /*second*/second(): Response;
    `,
    )
    .toEmitDiagnostics(({ first, second }) =>
      [first, second].map((operation) => ({
        ...diagnostic,
        pos: getSourceLocation(operation).pos,
        end: getSourceLocation(operation).end,
      })),
    );
});

describe("registered resolver side effects", () => {
  it("resolves a compliant operation once before reporting Core diagnostics across overlapping services", async () => {
    const diagnostics = await Tester.diagnose(
      `
      @armProviderNamespace
      @service
      @versioned(Versions)
      namespace Microsoft.Parent;
      enum Versions {
        @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
        v2024_01_01: "2024-01-01",
      }
      @route("/parent")
      interface Operations extends Azure.ResourceManager.Operations {}

      @armProviderNamespace("Microsoft.Nested")
      @service
      @versioned(Versions)
      namespace Nested {
        @route("/child")
        interface Operations extends Azure.ResourceManager.Operations {}
        @armResourceOperations
        interface ProviderOperations {
          @Azure.Core.useFinalStateVia("original-uri")
          startProvider is ArmProviderActionAsync<Request = void, Response = void>;
        }
      }
    `,
      {
        compilerOptions: {
          linterRuleSet: {
            enable: {
              "@azure-tools/typespec-azure-resource-manager/lro-missing-polling-metadata": true,
            },
          },
        },
      },
    );
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-core/no-operation-at-original-uri",
    });
  });
});
