import { Enum, Operation } from "@typespec/compiler";
import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { shouldGenerateConvenient, shouldGenerateProtocol } from "../../src/decorators.js";
import { UsageFlags } from "../../src/interfaces.js";
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

describe("@convenientAPI on interface", () => {
  it("applies convenientAPI false to all operations in interface", async () => {
    const testCode = `
      @service
      namespace MyService {
        @convenientAPI(false)
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

    // Test the core functionality - shouldGenerateConvenient should return false
    strictEqual(shouldGenerateConvenient(runner.context, test1), false);
    strictEqual(shouldGenerateConvenient(runner.context, test2), false);
  });

  it("operation level convenientAPI overrides interface level", async () => {
    const testCode = `
      @service
      namespace MyService {
        @convenientAPI(false)
        @operationGroup
        interface MyOperations {
          @convenientAPI(true)
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

    // Test the override behavior
    strictEqual(shouldGenerateConvenient(runner.context, test1), true);
    strictEqual(shouldGenerateConvenient(runner.context, test2), false);
  });
});

describe("@convenientAPI on namespace", () => {
  it("applies convenientAPI false to all operations in namespace", async () => {
    // Test by applying decorator in an augmentation style within TestService
    const testCode = `
      @service
      @convenientAPI(false)
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

    strictEqual(shouldGenerateConvenient(runner.context, test1), false);
    strictEqual(shouldGenerateConvenient(runner.context, test2), false);

    const methods = runner.context.sdkPackage.clients[0].methods;
    strictEqual(methods.length, 2);
    strictEqual(methods[0].generateConvenient, false);
    strictEqual(methods[1].generateConvenient, false);
  });

  it("operation level convenientAPI overrides namespace level", async () => {
    const testCode = `
      @service
      @convenientAPI(false)
      namespace TestService2 {
        @convenientAPI(true)
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

    strictEqual(shouldGenerateConvenient(runner.context, test1), true);
    strictEqual(shouldGenerateConvenient(runner.context, test2), false);

    const methods = runner.context.sdkPackage.clients[0].methods;
    strictEqual(methods.length, 2);
    strictEqual(methods[0].generateConvenient, true);
    strictEqual(methods[1].generateConvenient, false);
  });

  it("propagates convenientAPI from parent namespace to child namespace", async () => {
    const testCode = `
      @service
      @convenientAPI(false)
      namespace TestService2 {
        @test("test1")
        @route("/test1")
        op test1(): void;
      }
    `;
    const { test1 } = (await runner.compile(testCode)) as { test1: Operation };

    strictEqual(shouldGenerateConvenient(runner.context, test1), false);

    const methods = runner.context.sdkPackage.clients[0].methods;
    strictEqual(methods.length, 1);
    strictEqual(methods[0].generateConvenient, false);
  });
});

describe("@convenientAPI with interface in namespace", () => {
  it("operation inherits from interface when namespace has no decorator", async () => {
    const testCode = `
      namespace MyService {
        @convenientAPI(false)
        interface MyOperations {
          @test("test1")
          op test1(): void;
        }
      }
    `;
    const { test1 } = await runner.compileWithBuiltInService(testCode);

    strictEqual(shouldGenerateConvenient(runner.context, test1 as Operation), false);
  });

  it("interface decorator takes precedence over namespace decorator", async () => {
    const testCode = `
      @convenientAPI(true)
      namespace MyService {
        @convenientAPI(false)
        interface MyOperations {
          @test("test1")
          op test1(): void;
        }
      }
    `;
    const { test1 } = await runner.compileWithBuiltInService(testCode);

    strictEqual(shouldGenerateConvenient(runner.context, test1 as Operation), false);
  });

  it("operation decorator takes precedence over interface and namespace", async () => {
    const testCode = `
      @convenientAPI(false)
      namespace MyService {
        @convenientAPI(false)
        interface MyOperations {
          @convenientAPI(true)
          @test("test1")
          op test1(): void;
        }
      }
    `;
    const { test1 } = await runner.compileWithBuiltInService(testCode);

    strictEqual(shouldGenerateConvenient(runner.context, test1 as Operation), true);
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

  it("namespace level decorator with scope applies to all operations", async () => {
    const testCode = `
      @service
      @convenientAPI(false, "python")
      namespace TestService3 {
        @test("test1")
        @route("/test1")
        op test1(): void;
        @test("test2")
        @route("/test2")
        op test2(): void;
      }
    `;

    // python should get convenientAPI=false
    {
      const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
      const { test1, test2 } = (await runner.compile(testCode)) as {
        test1: Operation;
        test2: Operation;
      };

      strictEqual(shouldGenerateConvenient(runner.context, test1), false);
      strictEqual(shouldGenerateConvenient(runner.context, test2), false);
    }

    // java should use default behavior
    {
      const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
      const { test1, test2 } = (await runner.compile(testCode)) as {
        test1: Operation;
        test2: Operation;
      };

      // Should fall back to context default which is true
      strictEqual(shouldGenerateConvenient(runner.context, test1), true);
      strictEqual(shouldGenerateConvenient(runner.context, test2), true);
    }
  });
});

describe("@convenientAPI(false) with enum parameters", () => {
  it("enum in query parameter should have Input usage even with convenientAPI(false)", async () => {
    const { IncludeEnum } = (await runner.compile(`
      @service
      namespace TestService {
        enum IncludeEnum {
          file_search_call_results: "file_search_call.results",
          web_search_call_results: "web_search_call.results",
        }

        model ItemResult {
          id: string;
          content: string;
        }

        @route("/conversations/{conversation_id}/items/{item_id}")
        @convenientAPI(false)
        op getConversationItem(
          @path conversation_id: string,
          @path item_id: string,
          @query(#{explode: true}) include?: IncludeEnum[],
        ): ItemResult;
      }
    `)) as { IncludeEnum: Enum };

    const sdkPackage = runner.context.sdkPackage;
    ok(sdkPackage.enums);
    const includeEnum = sdkPackage.enums.find((e) => e.name === "IncludeEnum");
    ok(includeEnum, "IncludeEnum should be in the enums list");
    ok(
      includeEnum.usage & UsageFlags.Input,
      "IncludeEnum should have Input usage even with convenientAPI(false)",
    );
  });

  it("enum in header parameter should have Input usage even with convenientAPI(false)", async () => {
    const { StatusEnum } = (await runner.compile(`
      @service
      namespace TestService {
        enum StatusEnum {
          active: "active",
          inactive: "inactive",
        }

        model Response {
          data: string;
        }

        @route("/data")
        @convenientAPI(false)
        op getData(
          @header status: StatusEnum,
        ): Response;
      }
    `)) as { StatusEnum: Enum };

    const sdkPackage = runner.context.sdkPackage;
    ok(sdkPackage.enums);
    const statusEnum = sdkPackage.enums.find((e) => e.name === "StatusEnum");
    ok(statusEnum, "StatusEnum should be in the enums list");
    ok(
      statusEnum.usage & UsageFlags.Input,
      "StatusEnum should have Input usage even with convenientAPI(false)",
    );
  });

  it("enum in path parameter should have Input usage even with convenientAPI(false)", async () => {
    const { ResourceType } = (await runner.compile(`
      @service
      namespace TestService {
        enum ResourceType {
          users: "users",
          groups: "groups",
        }

        model Resource {
          id: string;
        }

        @route("/resources/{type}/{id}")
        @convenientAPI(false)
        op getResource(
          @path type: ResourceType,
          @path id: string,
        ): Resource;
      }
    `)) as { ResourceType: Enum };

    const sdkPackage = runner.context.sdkPackage;
    ok(sdkPackage.enums);
    const resourceType = sdkPackage.enums.find((e) => e.name === "ResourceType");
    ok(resourceType, "ResourceType should be in the enums list");
    ok(
      resourceType.usage & UsageFlags.Input,
      "ResourceType should have Input usage even with convenientAPI(false)",
    );
  });
});
