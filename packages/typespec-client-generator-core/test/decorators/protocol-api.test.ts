import { t } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { describe, it } from "vitest";
import { shouldGenerateProtocol } from "../../src/decorators.js";
import { createSdkContextForTester, SimpleTester, SimpleTesterWithService } from "../tester.js";

async function protocolAPITestHelper(protocolValue: boolean, globalValue: boolean): Promise<void> {
  const { program, test } = await SimpleTesterWithService.compile(t.code`
    @protocolAPI(${protocolValue.toString()})
    @test
    op ${t.op("test")}(): void;
  `);

  const context = await createSdkContextForTester(program, {
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
    const { program, test1, test2 } = await SimpleTester.compile(t.code`
      @service
      namespace MyService {
        @protocolAPI(false)
        @operationGroup
        interface MyOperations {
          @route("/test1")
          op ${t.op("test1")}(): void;
          @route("/test2")
          op ${t.op("test2")}(): void;
        }
      }
    `);
    const context = await createSdkContextForTester(program);

    // Test the core functionality - shouldGenerateProtocol should return false
    strictEqual(shouldGenerateProtocol(context, test1), false);
    strictEqual(shouldGenerateProtocol(context, test2), false);
  });
});

describe("@protocolAPI on namespace", () => {
  it("applies protocolAPI false to all operations in namespace", async () => {
    const { program, test1, test2 } = await SimpleTester.compile(t.code`
      @service
      @protocolAPI(false)
      namespace TestService2 {
        @test("test1")
        @route("/test1")
        op ${t.op("test1")}(): void;
        @test("test2")
        @route("/test2")
        op ${t.op("test2")}(): void;
      }
    `);

    const context = await createSdkContextForTester(program);

    strictEqual(shouldGenerateProtocol(context, test1), false);
    strictEqual(shouldGenerateProtocol(context, test2), false);

    const methods = context.sdkPackage.clients[0].methods;
    strictEqual(methods.length, 2);
    strictEqual(methods[0].generateProtocol, false);
    strictEqual(methods[1].generateProtocol, false);
  });
});
