import { resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { describe, it } from "vitest";
import { armResourceOperationsRule } from "../../../typespec-azure-resource-manager/src/rules/arm-resource-operation-response.js";
import { coreOperationsRule } from "../../../typespec-azure-resource-manager/src/rules/core-operations.js";
import { xmsResourceInPutResponseRule } from "../../src/rules/xms-resource-in-put-response.js";

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
})
  .importLibraries()
  .using("TypeSpec.Http", "TypeSpec.Rest", "Azure.ResourceManager");

function service(
  model: string,
  response = "ArmResponse<Response>",
  verb = "put",
  resource = "Widget",
) {
  return `
    @armProviderNamespace @service namespace Microsoft.Contoso;
    model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
    ${model}
    @armResourceOperations interface Widgets {
      @${verb} @armResourceCreateOrUpdate(${resource})
      create(...ResourceInstanceParameters<${resource}>, @bodyRoot resource: ${resource}):
        ${response} | ErrorResponse;
    }
  `;
}

async function expectLint(code: string, violation: boolean) {
  const runner = await Tester.createInstance();
  const tester = createLinterRuleTester(
    runner,
    xmsResourceInPutResponseRule,
    "tsp-lintdiff-local-linter",
  );
  if (violation) {
    await tester.expect(code).toEmitDiagnostics({
      code: "tsp-lintdiff-local-linter/xms-resource-in-put-response",
      message:
        "PUT 200/201 response models should be Azure resources and must carry x-ms-azure-resource semantics.",
    });
  } else {
    await tester.expect(code).toBeValid();
  }
}

describe("xms-resource-in-put-response native semantics", () => {
  const manual = "model Response { name: string; type: string; }";

  it("covers a decorated manual response not checked by existing operation rules", async () => {
    const code = service(manual);
    for (const rule of [coreOperationsRule, armResourceOperationsRule]) {
      const runner = await Tester.createInstance();
      await createLinterRuleTester(runner, rule, "@azure-tools/typespec-azure-resource-manager")
        .expect(code)
        .toBeValid();
    }
    await expectLint(code, true);
  });

  it("accepts a registered ARM resource", async () => {
    await expectLint(
      service(
        "model Response is TrackedResource<{}> { ...ResourceNameParameter<Response>; }",
        "ArmResponse<Response>",
        "put",
        "Response",
      ),
      false,
    );
  });

  it("checks inherited resource envelope properties", async () => {
    await expectLint(
      service("model Base { name: string; type: string; } model Response extends Base {}"),
      true,
    );
  });

  it("checks a 201 response when no 200 response exists", async () => {
    await expectLint(service(manual, "ArmCreatedResponse<Response>"), true);
  });

  it("prefers a 200 model over a 201 model", async () => {
    await expectLint(service(manual, "ArmResponse<Widget> | ArmCreatedResponse<Response>"), false);
  });

  it("does not inspect an unrelated response status", async () => {
    await expectLint(
      service(manual, "{ @statusCode statusCode: 202; @body body: Response; }"),
      false,
    );
  });

  it("ignores non-resource-shaped model bodies", async () => {
    await expectLint(service("model Response { result: string; }"), false);
  });

  it("ignores scalar bodies", async () => {
    await expectLint(service("", "string"), false);
  });

  it("ignores non-PUT operations", async () => {
    await expectLint(service(manual, "ArmResponse<Response>", "patch"), false);
  });

  it("checks operations in nested provider namespaces", async () => {
    await expectLint(
      service(manual).replace(
        "@armResourceOperations interface Widgets {",
        "namespace Nested { @armResourceOperations interface Widgets {",
      ) + "}",
      true,
    );
  });

  it("ignores services without ARM provider ownership", async () => {
    await expectLint(
      `
      @service namespace Example;
      model Response { name: string; type: string; }
      @put op create(): Response;
    `,
      false,
    );
  });
});
