import { Operation } from "@typespec/compiler";
import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { shouldGenerateProtocol } from "../../src/decorators.js";
import { SdkTestRunner, createSdkContextTestHelper, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});
async function protocolAPITestHelper(
  runner: SdkTestRunner,
  protocolValue: boolean,
  globalValue: boolean,
): Promise<void> {
  const testCode = `
    @protocolAPI(${protocolValue})
    @test
    op test(): void;
  `;
  const { test } = await runner.compileWithBuiltInService(testCode);

  const actual = shouldGenerateProtocol(
    await createSdkContextTestHelper(runner.context.program, {
      generateProtocolMethods: globalValue,
      generateConvenienceMethods: false,
    }),
    test as Operation,
  );

  const method = runner.context.sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "test");
  strictEqual(method.kind, "basic");
  strictEqual(actual, protocolValue);
  strictEqual(method.generateProtocol, protocolValue);
}
describe("@protocolAPI", () => {
  it("generateProtocolMethodsTrue, operation marked protocolAPI true", async () => {
    await protocolAPITestHelper(runner, true, true);
  });
  it("generateProtocolMethodsTrue, operation marked protocolAPI false", async () => {
    await protocolAPITestHelper(runner, false, true);
  });
  it("generateProtocolMethodsFalse, operation marked protocolAPI true", async () => {
    await protocolAPITestHelper(runner, true, false);
  });
  it("generateProtocolMethodsFalse, operation marked protocolAPI false", async () => {
    await protocolAPITestHelper(runner, false, false);
  });
});
