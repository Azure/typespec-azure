import { getSourceLocation, resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { describe, it, vi } from "vitest";
import { xmsLongRunningOperationPropertyRule } from "../../src/rules/xms-long-running-operation-property.js";

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
interface Operations extends Azure.ResourceManager.Operations {}
`;
const diagnostic = {
  code: "tsp-lintdiff-local-linter/xms-long-running-operation-property",
  message: xmsLongRunningOperationPropertyRule.messages.default,
};

async function tester() {
  return createLinterRuleTester(
    await Tester.createInstance(),
    xmsLongRunningOperationPropertyRule,
    "tsp-lintdiff-local-linter",
  );
}

describe("xms-long-running-operation-property", () => {
  it.each([
    ["put", 201, "Azure-AsyncOperation"],
    ["patch", 202, "lOcAtIoN"],
    ["post", 200, "Location"],
    ["delete", 204, "azure-asyncoperation"],
  ])("reports %s %s with %s on the header property", async (verb, status, name) => {
    await (
      await tester()
    )
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
    await (
      await tester()
    )
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
    await (
      await tester()
    )
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
    await (
      await tester()
    )
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

  it("reaches an ARM service's nested namespace through service isolation", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        namespace Nested {
          model Response {
            @statusCode statusCode: 200;
            @header("Location") /*target*/pollingUrl?: string;
          }
          @post @route("/test") op test(): Response;
        }
      `,
      )
      .toEmitDiagnostics(({ target }) => ({
        ...diagnostic,
        pos: getSourceLocation(target).pos,
        end: getSourceLocation(target).end,
      }));
  });

  it("keeps the lintdiff mixed-runner ARM service boundary", async () => {
    await (
      await tester()
    )
      .expect(
        `
        using TypeSpec.Http;
        @service namespace DataPlane;
        model Response {
          @statusCode statusCode: 200;
          @header("Location") pollingUrl?: string;
        }
        @post @route("/test") op test(): Response;
      `,
      )
      .toBeValid();
  });

  it("reports a supported synchronous template response customization", async () => {
    await (
      await tester()
    )
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

  it("accepts an asynchronous template with native polling metadata", async () => {
    await (
      await tester()
    )
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
    await (
      await tester()
    )
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
    await (
      await tester()
    )
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

  it("reports overlapping ARM services only once per operation", async () => {
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
});
