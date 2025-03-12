import { Operation } from "@typespec/compiler";
import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { shouldGenerateConvenient, shouldGenerateProtocol } from "../../src/decorators.js";
import { SdkTestRunner, createSdkContextTestHelper, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

async function convenientAPITestHelper(
  runner: SdkTestRunner,
  convenientValue: boolean,
  globalValue: boolean,
): Promise<void> {
  const testCode = `
            @convenientAPI(${convenientValue})
            @test
            op test(): void;
          `;
  const { test } = await runner.compileWithBuiltInService(testCode);

  const actual = shouldGenerateConvenient(
    await createSdkContextTestHelper(runner.program, {
      generateProtocolMethods: false,
      generateConvenienceMethods: globalValue,
    }),
    test as Operation,
  );
  strictEqual(actual, convenientValue);

  const method = runner.context.sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "test");
  strictEqual(method.kind, "basic");
  strictEqual(method.generateConvenient, convenientValue);
}

describe("@convenientAPI", () => {
  it("generateConvenienceMethodsTrue, operation marked convenientAPI true", async () => {
    await convenientAPITestHelper(runner, true, true);
  });
  it("generateConvenienceMethodsTrue, operation marked convenientAPI false", async () => {
    await convenientAPITestHelper(runner, false, true);
  });
  it("generateConvenienceMethodsFalse, operation marked convenientAPI true", async () => {
    await convenientAPITestHelper(runner, true, false);
  });
  it("generateConvenienceMethodsFalse, operation marked convenientAPI false", async () => {
    await convenientAPITestHelper(runner, false, false);
  });

  it("mark an operation as convenientAPI default, pass in sdkContext with generateConvenienceMethods false", async () => {
    const { test } = await runner.compileWithBuiltInService(`
          @convenientAPI
          @test
          op test(): void;
        `);

    const actual = shouldGenerateConvenient(
      await createSdkContextTestHelper(runner.program, {
        generateProtocolMethods: false,
        generateConvenienceMethods: false,
      }),
      test as Operation,
    );
    strictEqual(actual, true);
    const method = runner.context.sdkPackage.clients[0].methods[0];
    strictEqual(method.name, "test");
    strictEqual(method.kind, "basic");
    strictEqual(method.generateConvenient, true);
  });
});

describe("@protocolAPI and @convenientAPI with scope", () => {
  it("mark an operation as protocolAPI false for csharp and convenientAPI false for java, pass in default sdkContext", async () => {
    const testCode = `
          @protocolAPI(false, "csharp")
          @convenientAPI(false, "java")
          @test
          op test(): void;
        `;

    // java should get protocolAPI=true and convenientAPI=false
    {
      const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });

      const { test } = (await runner.compileWithBuiltInService(testCode)) as { test: Operation };

      const method = runner.context.sdkPackage.clients[0].methods[0];
      strictEqual(method.name, "test");
      strictEqual(method.kind, "basic");

      strictEqual(shouldGenerateProtocol(runner.context, test), true);
      strictEqual(method.generateProtocol, true);

      strictEqual(
        shouldGenerateConvenient(runner.context, test),
        false,
        "convenientAPI should be false for java",
      );
      strictEqual(method.generateConvenient, false, "convenientAPI should be false for java");
    }

    // csharp should get protocolAPI=false and convenientAPI=true
    {
      const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
      const { test } = (await runner.compileWithBuiltInService(testCode)) as { test: Operation };
      const method = runner.context.sdkPackage.clients[0].methods[0];
      strictEqual(method.name, "test");
      strictEqual(method.kind, "basic");

      strictEqual(
        shouldGenerateProtocol(runner.context, test),
        false,
        "protocolAPI should be false for csharp",
      );
      strictEqual(method.generateProtocol, false, "protocolAPI should be false for csharp");

      strictEqual(shouldGenerateConvenient(runner.context, test), true);
      strictEqual(method.generateConvenient, true);
    }
  });
});
