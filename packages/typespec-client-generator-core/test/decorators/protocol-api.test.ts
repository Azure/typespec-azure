import { Operation } from "@typespec/compiler";
import { strictEqual } from "assert";
import { describe, it } from "vitest";
import { shouldGenerateProtocol } from "../../src/decorators.js";
import {
  createSdkContextForTester,
  SimpleTester,
  SimpleTesterWithBuiltInService,
} from "../tester.js";

async function protocolAPITestHelper(protocolValue: boolean, globalValue: boolean): Promise<void> {
  const testCode = `
    @protocolAPI(${protocolValue})
    @test
    op test(): void;
  `;
  const result = await SimpleTesterWithBuiltInService.compile(testCode);
  const program = result.program;
  const test = (result as unknown as { test: Operation }).test;

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
    "generate-protocol-methods": globalValue,
    "generate-convenience-methods": false,
  });

  const actual = shouldGenerateProtocol(context, test);

  const method = context.sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "test");
  strictEqual(method.kind, "basic");
  strictEqual(actual, protocolValue);
  strictEqual(method.generateProtocol, protocolValue);
}
describe("@protocolAPI", () => {
  it("generateProtocolMethodsTrue, operation marked protocolAPI true", async () => {
    await protocolAPITestHelper(true, true);
  });
  it("generateProtocolMethodsTrue, operation marked protocolAPI false", async () => {
    await protocolAPITestHelper(false, true);
  });
  it("generateProtocolMethodsFalse, operation marked protocolAPI true", async () => {
    await protocolAPITestHelper(true, false);
  });
  it("generateProtocolMethodsFalse, operation marked protocolAPI false", async () => {
    await protocolAPITestHelper(false, false);
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
    const result = await SimpleTester.compile(testCode);
    const program = result.program;
    const test1 = (result as unknown as { test1: Operation }).test1;
    const test2 = (result as unknown as { test2: Operation }).test2;

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    // Test the core functionality - shouldGenerateProtocol should return false
    strictEqual(shouldGenerateProtocol(context, test1), false);
    strictEqual(shouldGenerateProtocol(context, test2), false);
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
    const result = await SimpleTester.compile(testCode);
    const program = result.program;
    const test1 = (result as unknown as { test1: Operation }).test1;
    const test2 = (result as unknown as { test2: Operation }).test2;

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    strictEqual(shouldGenerateProtocol(context, test1), false);
    strictEqual(shouldGenerateProtocol(context, test2), false);

    const methods = context.sdkPackage.clients[0].methods;
    strictEqual(methods.length, 2);
    strictEqual(methods[0].generateProtocol, false);
    strictEqual(methods[1].generateProtocol, false);
  });
});
