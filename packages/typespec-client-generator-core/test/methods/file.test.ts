import { expectDiagnostics } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("file body is not supported", async () => {
  await runner.compileAndDiagnose(
    `
      @service
      namespace TestService {
        op uploadFile(@body file: File): void;
      }
    `,
  );
  expectDiagnostics(runner.context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/unsupported-http-file-body",
  });
});
