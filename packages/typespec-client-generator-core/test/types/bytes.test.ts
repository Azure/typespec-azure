import { ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { SdkBasicServiceMethod, SdkBuiltInType, SdkHttpOperation } from "../../src/interfaces.js";
import { createSdkContextForTester, SimpleTester } from "../tester.js";

describe("bytes SdkMethodParameter", () => {
  it("should use service operation parameter encoding", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace TestClient {
        op send(@body body: bytes, @header contentType: "application/octet-stream"): void;
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
    });
    const client = context.sdkPackage.clients[0];
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
