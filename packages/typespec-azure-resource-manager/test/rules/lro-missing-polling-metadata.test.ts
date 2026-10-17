import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import {
  createLinterRuleTester,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { lroMissingPollingMetadataRule } from "../../src/rules/lro-missing-polling-metadata.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    lroMissingPollingMetadataRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

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
interface Operations extends Azure.ResourceManager.Operations {}
`;

const resource = `
model Widget is ProxyResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}
model WidgetProperties {
  description?: string;
}
`;

const diagnostic = {
  code: "@azure-tools/typespec-azure-resource-manager/lro-missing-polling-metadata",
  message: lroMissingPollingMetadataRule.messages.default,
};

it.each([
  ["put", 201, "Azure-AsyncOperation"],
  ["patch", 202, "lOcAtIoN"],
  ["post", 200, "Location"],
  ["delete", 204, "azure-asyncoperation"],
])("reports %s %s with %s on the header property", async (verb, status, name) => {
  await tester
    .expect(
      `${header}
      model Response {
        @statusCode statusCode: ${status};
        @header("${name}") /*target*/pollingUrl?: string;
      }
      @${verb} @route("/test") op test(): Response;
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      ...diagnostic,
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
});

it.each([
  ["get", 200, "Location"],
  ["head", 200, "Azure-AsyncOperation"],
  ["post", 203, "Location"],
  ["post", 400, "Azure-AsyncOperation"],
  ["post", 200, "Operation-Location"],
  ["post", 200, "Retry-After"],
])("ignores %s %s with %s", async (verb, status, name) => {
  await tester
    .expect(
      `${header}
      model Response {
        @statusCode statusCode: ${status};
        @header("${name}") pollingUrl?: string;
      }
      @${verb} @route("/test") op test(): Response;
    `,
    )
    .toBeValid();
});

it("reports only the first qualifying header in success-code order", async () => {
  await tester
    .expect(
      `${header}
      model Created {
        @statusCode statusCode: 201;
        @header("Location") createdUrl?: string;
      }
      model Ok {
        @statusCode statusCode: 200;
        @header("Azure-AsyncOperation") /*target*/pollingUrl?: string;
        @header("Location") location?: string;
      }
      @post @route("/test") op test(): Created | Ok;
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      ...diagnostic,
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
});

it("reports each operation sharing a header declaration", async () => {
  await tester
    .expect(
      `${header}
      model Response {
        @statusCode statusCode: 200;
        @header("Location") /*target*/pollingUrl?: string;
      }
      @post @route("/start") op start(): Response;
      @post @route("/stop") op stop(): Response;
    `,
    )
    .toEmitDiagnostics(({ target }) =>
      [1, 2].map(() => ({
        ...diagnostic,
        pos: getSourceLocation(target).pos,
        end: getSourceLocation(target).end,
      })),
    );
});

it("reports qualifying headers without provider metadata", async () => {
  await tester
    .expect(
      `
      @service namespace TestService;
      model Response {
        @statusCode statusCode: 202;
        @header("Location") /*target*/location?: string;
      }
      @post @route("/test") op test(): Response;
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      ...diagnostic,
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
});

it("reports a synchronous provider action with a plain polling URL", async () => {
  await tester
    .expect(
      `${header}
      model Response {
        @statusCode statusCode: 202;
        @header("Location") /*target*/location?: string;
      }
      @armResourceOperations
      interface ProviderActions {
        start is ArmProviderActionSync<Request = void, Response = Response>;
      }
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      ...diagnostic,
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
});

it("accepts an asynchronous provider action with semantic polling headers", async () => {
  await tester
    .expect(
      `${header}
      @armResourceOperations
      interface ProviderActions {
        start is ArmProviderActionAsync<Request = void, Response = void>;
      }
    `,
    )
    .toBeValid();
});

it("rejects an async template whose semantic headers were replaced with plain headers", async () => {
  await tester
    .expect(
      `${header}
      model PlainHeaders {
        ...Azure.Core.Foundations.RetryAfterHeader;
        @header("Location") /*target*/location?: string;
      }
      @armResourceOperations
      interface ProviderActions {
        start is ArmProviderActionAsync<Request = void, Response = void, LroHeaders = PlainHeaders>;
      }
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      ...diagnostic,
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
});

it("accepts a sync template customization that supplies native polling headers", async () => {
  await tester
    .expect(
      `${header}
      @armResourceOperations
      interface ProviderActions {
        start is ArmProviderActionSync<
          Request = void, Response = ArmAcceptedResponse<ExtraHeaders = ArmLroLocationHeader>
        >;
      }
    `,
    )
    .toBeValid();
});

it("reports overlapping services only once per operation", async () => {
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
        model Response {
          @statusCode statusCode: 202;
          @header("Location") /*target*/location?: string;
        }
        @armResourceOperations
        interface ProviderActions {
          start is ArmProviderActionSync<Request = void, Response = Response>;
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

it("reports a synchronous resource action with a Location header", async () => {
  await tester
    .expect(
      `${header}${resource}
      model Response {
        @statusCode statusCode: 200;
        @header("Location") /*target*/location?: string;
        @body body: Widget;
      }
      @armResourceOperations
      interface Widgets {
        start is ArmResourceActionSync<Widget, Request = void, Response = Response>;
      }
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      ...diagnostic,
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
});

it("reports a synchronous resource action with an Azure-AsyncOperation header", async () => {
  await tester
    .expect(
      `${header}${resource}
      model Response {
        @statusCode statusCode: 204;
        @header("Azure-AsyncOperation") /*target*/pollingUrl?: string;
      }
      @armResourceOperations
      interface Widgets {
        start is ArmResourceActionSync<Widget, Request = void, Response = Response>;
      }
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      ...diagnostic,
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
});

it("accepts a synchronous ARM action without polling headers", async () => {
  await tester
    .expect(
      `${header}${resource}
      @armResourceOperations
      interface Widgets {
        start is ArmResourceActionSync<Widget, Request = void, Response = NoContentResponse>;
      }
    `,
    )
    .toBeValid();
});

it("accepts standard asynchronous resource operations", async () => {
  await tester
    .expect(
      `${header}${resource}
      @armResourceOperations
      interface Widgets {
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        update is ArmResourcePatchAsync<Widget, WidgetProperties>;
        delete is ArmResourceDeleteWithoutOkAsync<Widget>;
      }
    `,
    )
    .toBeValid();
});
