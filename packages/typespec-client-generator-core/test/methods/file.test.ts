import { expectDiagnostics } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { ok, strictEqual } from "assert";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("basic file input", async () => {
  await runner.compile(
    `
      @service
      namespace TestService {
        op uploadFile(@body file: File): void;
      }
    `,
  );
  const sdkPackage = runner.context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "uploadFile");
  const fileMethodParam = method.parameters.find((p) => p.name === "file");
  ok(fileMethodParam);
  strictEqual(fileMethodParam.type.kind, "model");
  const httpOperation = method.operation;
  const bodyParam = httpOperation.bodyParam;
  ok(bodyParam);
  strictEqual(bodyParam.type.kind, "model");
  strictEqual(bodyParam.serializationOptions.binary?.isFile, true);
});
