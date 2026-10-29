import { Tester } from "#test/tester.js";
import { setLroDeclaration } from "@azure-tools/typespec-azure-core";
import type { DecoratorContext, Operation } from "@typespec/compiler";
import {
  createLinterRuleTester,
  mockFile,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noGetLroRule } from "../../src/rules/no-get-lro.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.files({
      "declaration.tsp": `
        import "./declaration.js";
        namespace Fixtures;
        extern dec declareLro(target: TypeSpec.Reflection.Operation);
      `,
      "declaration.js": mockFile.js({
        $decorators: {
          Fixtures: {
            declareLro(context: DecoratorContext, target: Operation) {
              setLroDeclaration(context.program, target, () => true);
            },
          },
        },
      }),
    })
      .import("./declaration.tsp")
      .createInstance(),
    noGetLroRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const resource = `
  @armProviderNamespace namespace Microsoft.Test;
  model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
`;

const diagnostic = {
  code: "@azure-tools/typespec-azure-resource-manager/no-get-lro",
  message:
    "GET operations must not be explicitly declared long-running. Remove the LRO declaration; polling responses do not need an LRO declaration.",
};

it("allows an ARM polling read customized with an accepted response", async () => {
  await tester
    .expect(
      `
      ${resource}
      @armResourceOperations interface Widgets {
        read is ArmResourceRead<Widget, Response = ArmAcceptedLroResponse>;
      }
    `,
    )
    .toBeValid();
});

it("allows GET continuation metadata without an explicit LRO declaration", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace Microsoft.Test;
      model Status { @Azure.Core.lroStatus status: "Succeeded" | "Failed" | "Canceled"; }
      @route("/status") @get op poll(): Status;
      @Azure.Core.pollingOperation(poll, {})
      @route("/start") @get op start(): { @statusCode statusCode: 202; };
    `,
    )
    .toBeValid();
});

it("allows a synchronous read and ARM and Core polling templates", async () => {
  await tester
    .expect(
      `
      ${resource}
      @armResourceOperations interface Widgets { read is ArmResourceRead<Widget>; }
      op armPoll is GetResourceOperationStatus;
      @resource("items") model Item { @key name: string; }
      op corePoll is Azure.Core.GetResourceOperationStatus<Item>;
    `,
    )
    .toBeValid();
});

it("does not mistake a status-bearing GET for an initiating LRO", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace Microsoft.Test;
      @route("/status") @get op poll(): ArmOperationStatus;
    `,
    )
    .toBeValid();
});

it("allows an inferred GET with polling response metadata alone", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace Microsoft.Test;
      @route("/start") op start(): ArmAcceptedLroResponse;
    `,
    )
    .toBeValid();
});

it("allows an inferred POST with a long-running response", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace Microsoft.Test;
      @route("/start") op start(@body input: { value: string; }): ArmAcceptedLroResponse;
    `,
    )
    .toBeValid();
});

it.each(["post", "put", "patch", "delete"])("allows a long-running %s", async (verb) => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace Microsoft.Test;
      @route("/start") @${verb} op start(): ArmAcceptedLroResponse;
    `,
    )
    .toBeValid();
});

it("reports an accepted declaration on an inferred GET", async () => {
  await tester
    .expect(
      `
    @service namespace Test;
    @Fixtures.declareLro @route("/read") op read(): { value: string; };
  `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("excludes a declared helper outside the HTTP service", async () => {
  await tester
    .expect(
      `
    @service namespace Test { @get @route("/read") op read(): { value: string; }; }
    namespace Helpers { @Fixtures.declareLro @get @route("/helper") op helper(): { value: string; }; }
  `,
    )
    .toBeValid();
});

it("includes global HTTP operations when no service is declared", async () => {
  await tester
    .expect(
      `
    @Fixtures.declareLro @get @route("/read") op read(): { value: string; };
  `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("allows a202 continuation with location, retry and completion responses", async () => {
  await tester
    .expect(
      `
    @service namespace Test;
    @get @route("/status") op status():
      { @statusCode code: 202; @header location: string; @header retryAfter: int32; }
      | { @statusCode code: 200; @bodyRoot result: { value: string; }; }
      | { @statusCode code: 204; };
  `,
    )
    .toBeValid();
});

it.each([
  ['"x-ms-long-running-operation", true', true],
  ['"x-ms-long-running-operation", false', false],
  ['"x-ms-long-running-operation", "true"', false],
  ['"x-ms-long-running-operation-options", #{}', true],
  ['"x-ms-long-running-operation-options", #[]', true],
  ['"x-ms-long-running-operation-options", null', false],
] as const)("checks raw semantic extension %s", async (extension, violates) => {
  const result = tester.expect(`
    @service namespace Test;
    @OpenAPI.extension(${extension}) @get @route("/read") op read(): { value: string; };
  `);
  if (violates) await result.toEmitDiagnostics(diagnostic);
  else await result.toBeValid();
});

it("lets an explicit false flag override an accepted declaration", async () => {
  await tester
    .expect(
      `
    @service namespace Test;
    @Fixtures.declareLro @OpenAPI.extension("x-ms-long-running-operation", false)
    @get @route("/read") op read(): { value: string; };
  `,
    )
    .toBeValid();
});

it("reports options independently of a false flag, once per operation", async () => {
  await tester
    .expect(
      `
    @service namespace Test;
    @Fixtures.declareLro @OpenAPI.extension("x-ms-long-running-operation", false)
    @OpenAPI.extension("x-ms-long-running-operation-options", #{})
    @get @route("/read") op read(): { value: string; };
  `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("reports one operation when both forbidden extension branches apply", async () => {
  await tester
    .expect(
      `
    @service namespace Test;
    @OpenAPI.extension("x-ms-long-running-operation", true)
    @OpenAPI.extension("x-ms-long-running-operation-options", #{})
    @get @route("/read") op read(): { value: string; };
  `,
    )
    .toEmitDiagnostics(diagnostic);
});
