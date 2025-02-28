import { ok, strictEqual } from "assert";
import { afterEach, beforeEach, describe, it } from "vitest";
import { SdkBasicServiceMethod, SdkBuiltInType, SdkHttpOperation } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: bytes types", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });
  afterEach(async () => {
    for (const modelsOrEnums of [
      runner.context.sdkPackage.models,
      runner.context.sdkPackage.enums,
    ]) {
      for (const item of modelsOrEnums) {
        ok(item.name !== "");
      }
    }
  });

  describe("bytes SdkMethodParameter", () => {
    it("should use service operation parameter encoding", async () => {
      await runner.compile(`
        @service({})
        namespace TestClient {
          op send(@body body: bytes, @header contentType: "application/octet-stream"): void;
        }
      `);
      const client = runner.context.sdkPackage.clients[0];
      ok(client);
      const method = client.methods[0];
      ok(method);
      strictEqual(method.name, "send");
      const param = method.parameters[0];
      strictEqual(param.name, "body");
      strictEqual(param.type.kind, "bytes");
      strictEqual(param.type.name, "bytes");
      // this is from SdkHttpServiceOperationParameter
      strictEqual(param.type.encode, "bytes");
      strictEqual(method.kind, "basic");
      const serviceBodyParam = (method as SdkBasicServiceMethod<SdkHttpOperation>).operation
        .bodyParam;
      ok(serviceBodyParam);
      strictEqual(serviceBodyParam.type.kind, "bytes");
      strictEqual(param.type.encode, (serviceBodyParam.type as SdkBuiltInType).encode);
    });
  });
});
