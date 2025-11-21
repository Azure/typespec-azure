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

describe("@protocolAPI on interface", () => {
  it("applies protocolAPI false to all operations in interface", async () => {
    const testCode = `
      @service
      namespace MyService {
        @protocolAPI(false)
        @operationGroup
        interface MyOperations {
          @test("test1")
          @route("/test1")
          op test1(): void;
          @test("test2")
          @route("/test2")
          op test2(): void;
        }
      }
    `;
    const { test1, test2 } = (await runner.compile(testCode)) as {
      test1: Operation;
      test2: Operation;
    };

    // Test the core functionality - shouldGenerateProtocol should return false
    strictEqual(shouldGenerateProtocol(runner.context, test1), false);
    strictEqual(shouldGenerateProtocol(runner.context, test2), false);
  });
});

describe("@protocolAPI on namespace", () => {
  it("applies protocolAPI false to all operations in namespace", async () => {
    const testCode = `
      @service
      @protocolAPI(false)
      namespace TestService2 {
        @test("test1")
        @route("/test1")
        op test1(): void;
        @test("test2")
        @route("/test2")
        op test2(): void;
      }
    `;
    const { test1, test2 } = (await runner.compile(testCode)) as {
      test1: Operation;
      test2: Operation;
    };

    strictEqual(shouldGenerateProtocol(runner.context, test1), false);
    strictEqual(shouldGenerateProtocol(runner.context, test2), false);

    const methods = runner.context.sdkPackage.clients[0].methods;
    strictEqual(methods.length, 2);
    strictEqual(methods[0].generateProtocol, false);
    strictEqual(methods[1].generateProtocol, false);
  });
});
