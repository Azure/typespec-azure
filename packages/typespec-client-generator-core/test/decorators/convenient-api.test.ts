import { t } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { shouldGenerateConvenient, shouldGenerateProtocol } from "../../src/decorators.js";
import { UsageFlags } from "../../src/interfaces.js";
import {
  createSdkContextForTester,
  SimpleTester,
  SimpleTesterWithBuiltInService,
} from "../tester.js";

async function convenientAPITestHelper(
  convenientValue: boolean,
  globalValue: boolean,
): Promise<void> {
  const { program, test } = await SimpleTesterWithBuiltInService.compile(t.code`
    @convenientAPI(${String(convenientValue)})
    op ${t.op("test")}(): void;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });

  const actual = shouldGenerateConvenient(
    await createSdkContextForTester(program, {
      "generate-protocol-methods": false,
      "generate-convenience-methods": globalValue,
    }),
    test,
  );
  strictEqual(actual, convenientValue);

  const method = context.sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "test");
  strictEqual(method.kind, "basic");
  strictEqual(method.generateConvenient, convenientValue);
}

describe("@convenientAPI", () => {
  it("generateConvenienceMethodsTrue, operation marked convenientAPI true", async () => {
    await convenientAPITestHelper(true, true);
  });
  it("generateConvenienceMethodsTrue, operation marked convenientAPI false", async () => {
    await convenientAPITestHelper(false, true);
  });
  it("generateConvenienceMethodsFalse, operation marked convenientAPI true", async () => {
    await convenientAPITestHelper(true, false);
  });
  it("generateConvenienceMethodsFalse, operation marked convenientAPI false", async () => {
    await convenientAPITestHelper(false, false);
  });

  it("mark an operation as convenientAPI default, pass in sdkContext with generateConvenienceMethods false", async () => {
    const { program, test } = await SimpleTesterWithBuiltInService.compile(t.code`
      @convenientAPI
      op ${t.op("test")}(): void;
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    const actual = shouldGenerateConvenient(
      await createSdkContextForTester(program, {
        "generate-protocol-methods": false,
        "generate-convenience-methods": false,
      }),
      test,
    );
    strictEqual(actual, true);
    const method = context.sdkPackage.clients[0].methods[0];
    strictEqual(method.name, "test");
    strictEqual(method.kind, "basic");
    strictEqual(method.generateConvenient, true);
  });
});

describe("@convenientAPI on interface", () => {
  it("applies convenientAPI false to all operations in interface", async () => {
    const { program, test1, test2 } = await SimpleTester.compile(t.code`
      @service
      namespace MyService {
        @convenientAPI(false)
        @operationGroup
        interface MyOperations {
          @route("/test1")
          op ${t.op("test1")}(): void;
          @route("/test2")
          op ${t.op("test2")}(): void;
        }
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    // Test the core functionality - shouldGenerateConvenient should return false
    strictEqual(shouldGenerateConvenient(context, test1), false);
    strictEqual(shouldGenerateConvenient(context, test2), false);
  });

  it("operation level convenientAPI overrides interface level", async () => {
    const { program, test1, test2 } = await SimpleTester.compile(t.code`
      @service
      namespace MyService {
        @convenientAPI(false)
        @operationGroup
        interface MyOperations {
          @convenientAPI(true)
          @route("/test1")
          op ${t.op("test1")}(): void;
          @route("/test2")
          op ${t.op("test2")}(): void;
        }
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    // Test the override behavior
    strictEqual(shouldGenerateConvenient(context, test1), true);
    strictEqual(shouldGenerateConvenient(context, test2), false);
  });
});

describe("@convenientAPI on namespace", () => {
  it("applies convenientAPI false to all operations in namespace", async () => {
    // Test by applying decorator in an augmentation style within TestService
    const { program, test1, test2 } = await SimpleTester.compile(t.code`
      @service
      @convenientAPI(false)
      namespace TestService2 {
        @route("/test1")
        op ${t.op("test1")}(): void;
        @route("/test2")
        op ${t.op("test2")}(): void;
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    strictEqual(shouldGenerateConvenient(context, test1), false);
    strictEqual(shouldGenerateConvenient(context, test2), false);

    const methods = context.sdkPackage.clients[0].methods;
    strictEqual(methods.length, 2);
    strictEqual(methods[0].generateConvenient, false);
    strictEqual(methods[1].generateConvenient, false);
  });

  it("operation level convenientAPI overrides namespace level", async () => {
    const { program, test1, test2 } = await SimpleTester.compile(t.code`
      @service
      @convenientAPI(false)
      namespace TestService2 {
        @convenientAPI(true)
        @route("/test1")
        op ${t.op("test1")}(): void;
        @route("/test2")
        op ${t.op("test2")}(): void;
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    strictEqual(shouldGenerateConvenient(context, test1), true);
    strictEqual(shouldGenerateConvenient(context, test2), false);

    const methods = context.sdkPackage.clients[0].methods;
    strictEqual(methods.length, 2);
    strictEqual(methods[0].generateConvenient, true);
    strictEqual(methods[1].generateConvenient, false);
  });

  it("propagates convenientAPI from parent namespace to child namespace", async () => {
    const { program, test1 } = await SimpleTester.compile(t.code`
      @service
      @convenientAPI(false)
      namespace TestService2 {
        @route("/test1")
        op ${t.op("test1")}(): void;
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    strictEqual(shouldGenerateConvenient(context, test1), false);

    const methods = context.sdkPackage.clients[0].methods;
    strictEqual(methods.length, 1);
    strictEqual(methods[0].generateConvenient, false);
  });
});

describe("@convenientAPI with interface in namespace", () => {
  it("operation inherits from interface when namespace has no decorator", async () => {
    const { program, test1 } = await SimpleTesterWithBuiltInService.compile(t.code`
      namespace MyService {
        @convenientAPI(false)
        interface MyOperations {
          op ${t.op("test1")}(): void;
        }
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    strictEqual(shouldGenerateConvenient(context, test1), false);
  });

  it("interface decorator takes precedence over namespace decorator", async () => {
    const { program, test1 } = await SimpleTesterWithBuiltInService.compile(t.code`
      @convenientAPI(true)
      namespace MyService {
        @convenientAPI(false)
        interface MyOperations {
          op ${t.op("test1")}(): void;
        }
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    strictEqual(shouldGenerateConvenient(context, test1), false);
  });

  it("operation decorator takes precedence over interface and namespace", async () => {
    const { program, test1 } = await SimpleTesterWithBuiltInService.compile(t.code`
      @convenientAPI(false)
      namespace MyService {
        @convenientAPI(false)
        interface MyOperations {
          @convenientAPI(true)
          op ${t.op("test1")}(): void;
        }
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    strictEqual(shouldGenerateConvenient(context, test1), true);
  });
});

describe("@protocolAPI and @convenientAPI with scope", () => {
  it("mark an operation as protocolAPI false for csharp and convenientAPI false for java, pass in default sdkContext", async () => {
    const testCode = t.code`
      @protocolAPI(false, "csharp")
      @convenientAPI(false, "java")
      op ${t.op("test")}(): void;
    `;

    // java should get protocolAPI=true and convenientAPI=false
    {
      const { program, test } = await SimpleTesterWithBuiltInService.compile(testCode);
      const context = await createSdkContextForTester(program, {
        emitterName: "@azure-tools/typespec-java",
      });

      const method = context.sdkPackage.clients[0].methods[0];
      strictEqual(method.name, "test");
      strictEqual(method.kind, "basic");

      strictEqual(shouldGenerateProtocol(context, test), true);
      strictEqual(method.generateProtocol, true);

      strictEqual(
        shouldGenerateConvenient(context, test),
        false,
        "convenientAPI should be false for java",
      );
      strictEqual(method.generateConvenient, false, "convenientAPI should be false for java");
    }

    // csharp should get protocolAPI=false and convenientAPI=true
    {
      const { program, test } = await SimpleTesterWithBuiltInService.compile(testCode);
      const context = await createSdkContextForTester(program, {
        emitterName: "@azure-tools/typespec-csharp",
      });
      const method = context.sdkPackage.clients[0].methods[0];
      strictEqual(method.name, "test");
      strictEqual(method.kind, "basic");

      strictEqual(
        shouldGenerateProtocol(context, test),
        false,
        "protocolAPI should be false for csharp",
      );
      strictEqual(method.generateProtocol, false, "protocolAPI should be false for csharp");

      strictEqual(shouldGenerateConvenient(context, test), true);
      strictEqual(method.generateConvenient, true);
    }
  });

  it("namespace level decorator with scope applies to all operations", async () => {
    const testCode = t.code`
      @service
      @convenientAPI(false, "python")
      namespace TestService3 {
        @route("/test1")
        op ${t.op("test1")}(): void;
        @route("/test2")
        op ${t.op("test2")}(): void;
      }
    `;

    // python should get convenientAPI=false
    {
      const { program, test1, test2 } = await SimpleTester.compile(testCode);
      const context = await createSdkContextForTester(program, {
        emitterName: "@azure-tools/typespec-python",
      });

      strictEqual(shouldGenerateConvenient(context, test1), false);
      strictEqual(shouldGenerateConvenient(context, test2), false);
    }

    // java should use default behavior
    {
      const { program, test1, test2 } = await SimpleTester.compile(testCode);
      const context = await createSdkContextForTester(program, {
        emitterName: "@azure-tools/typespec-java",
      });

      // Should fall back to context default which is true
      strictEqual(shouldGenerateConvenient(context, test1), true);
      strictEqual(shouldGenerateConvenient(context, test2), true);
    }
  });
});

describe("@convenientAPI(false) with enum parameters", () => {
  it("enum in query parameter should have Input usage even with convenientAPI(false)", async () => {
    const { program } = await SimpleTester.compile(`
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
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    const sdkPackage = context.sdkPackage;
    ok(sdkPackage.enums);
    const includeEnum = sdkPackage.enums.find((e) => e.name === "IncludeEnum");
    ok(includeEnum, "IncludeEnum should be in the enums list");
    ok(
      includeEnum.usage & UsageFlags.Input,
      "IncludeEnum should have Input usage even with convenientAPI(false)",
    );
  });

  it("enum in header parameter should have Input usage even with convenientAPI(false)", async () => {
    const { program } = await SimpleTester.compile(`
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
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    const sdkPackage = context.sdkPackage;
    ok(sdkPackage.enums);
    const statusEnum = sdkPackage.enums.find((e) => e.name === "StatusEnum");
    ok(statusEnum, "StatusEnum should be in the enums list");
    ok(
      statusEnum.usage & UsageFlags.Input,
      "StatusEnum should have Input usage even with convenientAPI(false)",
    );
  });

  it("enum in path parameter should have Input usage even with convenientAPI(false)", async () => {
    const { program } = await SimpleTester.compile(`
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
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    const sdkPackage = context.sdkPackage;
    ok(sdkPackage.enums);
    const resourceType = sdkPackage.enums.find((e) => e.name === "ResourceType");
    ok(resourceType, "ResourceType should be in the enums list");
    ok(
      resourceType.usage & UsageFlags.Input,
      "ResourceType should have Input usage even with convenientAPI(false)",
    );
  });
});
