import { expectDiagnostics } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("@moveTo along with @client", async () => {
  const diagnostics = (
    await runner.compileAndDiagnoseWithCustomization(
      `
    @service
    namespace MyService;

    op test(): string;
  `,
      `
    @client({service: MyService})
    namespace MyServiceClient;

    @moveTo("Inner")
    op test is MyService.test;
  `,
    )
  )[1];

  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/no-move-to-with-client-or-operation-group",
  });
});

it("@moveTo along with @operationGroup", async () => {
  const diagnostics = (
    await runner.compileAndDiagnoseWithCustomization(
      `
    @service
    namespace MyService;

    op test(): string;
  `,
      `
    namespace Customization;

    @operationGroup
    interface MyOperationGroup {
      @moveTo("Inner")
      op test is MyService.test;
    }
  `,
    )
  )[1];

  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/no-move-to-with-client-or-operation-group",
  });
});
