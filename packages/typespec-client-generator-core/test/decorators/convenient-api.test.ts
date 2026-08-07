import { expectDiagnostics, t } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { shouldGenerateConvenient, shouldGenerateProtocol } from "../../src/decorators.js";
import { UsageFlags } from "../../src/interfaces.js";
import { createSdkContextForTester, SimpleTester, SimpleTesterWithService } from "../tester.js";

async function convenientAPITestHelper(
  convenientValue: boolean,
  globalValue: boolean,
): Promise<void> {
  const { program, test } = await SimpleTesterWithService.compile(t.code`
    @convenientAPI(${String(convenientValue)}, "java")
    op ${t.op("test")}(): void;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-java",
  });

  const actual = shouldGenerateConvenient(
    await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
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
    const { program, test } = await SimpleTesterWithService.compile(
      t.code`
      @convenientAPI(true, "java")
      op ${t.op("test")}(): void;
    `,
      {
        compilerOptions: {
          options: {
            "@azure-tools/typespec-java": {
              "generate-protocol-methods": false,
              "generate-convenience-methods": false,
            },
          },
        },
      },
    );
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
    });

    const actual = shouldGenerateConvenient(context, test);
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
        @convenientAPI(false, "java")
        interface MyOperations {
          @route("/test1")
          op ${t.op("test1")}(): void;
          @route("/test2")
          op ${t.op("test2")}(): void;
        }
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
    });

    // Test the core functionality - shouldGenerateConvenient should return false
    strictEqual(shouldGenerateConvenient(context, test1), false);
    strictEqual(shouldGenerateConvenient(context, test2), false);
  });

  it("operation level convenientAPI overrides interface level", async () => {
    const { program, test1, test2 } = await SimpleTester.compile(t.code`
      @service
      namespace MyService {
        @convenientAPI(false, "java")
        interface MyOperations {
          @convenientAPI(true, "java")
          @route("/test1")
          op ${t.op("test1")}(): void;
          @route("/test2")
          op ${t.op("test2")}(): void;
        }
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
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
      @convenientAPI(false, "java")
      namespace TestService2 {
        @route("/test1")
        op ${t.op("test1")}(): void;
        @route("/test2")
        op ${t.op("test2")}(): void;
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
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
      @convenientAPI(false, "java")
      namespace TestService2 {
        @convenientAPI(true, "java")
        @route("/test1")
        op ${t.op("test1")}(): void;
        @route("/test2")
        op ${t.op("test2")}(): void;
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
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
      @convenientAPI(false, "java")
      namespace TestService2 {
        @route("/test1")
        op ${t.op("test1")}(): void;
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
    });

    strictEqual(shouldGenerateConvenient(context, test1), false);

    const methods = context.sdkPackage.clients[0].methods;
    strictEqual(methods.length, 1);
    strictEqual(methods[0].generateConvenient, false);
  });
});

describe("@convenientAPI with interface in namespace", () => {
  it("operation inherits from interface when namespace has no decorator", async () => {
    const { program, test1 } = await SimpleTesterWithService.compile(t.code`
      namespace MyService {
        @convenientAPI(false, "java")
        interface MyOperations {
          op ${t.op("test1")}(): void;
        }
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
    });

    strictEqual(shouldGenerateConvenient(context, test1), false);
  });

  it("interface decorator takes precedence over namespace decorator", async () => {
    const { program, test1 } = await SimpleTesterWithService.compile(t.code`
      @convenientAPI(true, "java")
      namespace MyService {
        @convenientAPI(false, "java")
        interface MyOperations {
          op ${t.op("test1")}(): void;
        }
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
    });

    strictEqual(shouldGenerateConvenient(context, test1), false);
  });

  it("operation decorator takes precedence over interface and namespace", async () => {
    const { program, test1 } = await SimpleTesterWithService.compile(t.code`
      @convenientAPI(false, "java")
      namespace MyService {
        @convenientAPI(false, "java")
        interface MyOperations {
          @convenientAPI(true, "java")
          op ${t.op("test1")}(): void;
        }
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
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
      const { program, test } = await SimpleTesterWithService.compile(testCode);
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
      const { program, test } = await SimpleTesterWithService.compile(testCode);
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
      @convenientAPI(false, "java")
      namespace TestService3 {
        @route("/test1")
        op ${t.op("test1")}(): void;
        @route("/test2")
        op ${t.op("test2")}(): void;
      }
    `;

    // java should get convenientAPI=false (since decorator is scoped to java)
    {
      const { program, test1, test2 } = await SimpleTester.compile(testCode);
      const context = await createSdkContextForTester(program, {
        emitterName: "@azure-tools/typespec-java",
      });

      strictEqual(shouldGenerateConvenient(context, test1), false);
      strictEqual(shouldGenerateConvenient(context, test2), false);
    }

    // python should use default behavior (since decorator is scoped to java, not python)
    {
      const { program, test1, test2 } = await SimpleTester.compile(testCode);
      const context = await createSdkContextForTester(program, {
        emitterName: "@azure-tools/typespec-python",
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
        @convenientAPI(false, "java")
        op getConversationItem(
          @path conversation_id: string,
          @path item_id: string,
          @query(#{explode: true}) include?: IncludeEnum[],
        ): ItemResult;
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
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
        @convenientAPI(false, "java")
        op getData(
          @header status: StatusEnum,
        ): Response;
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
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
        @convenientAPI(false, "java")
        op getResource(
          @path type: ResourceType,
          @path id: string,
        ): Resource;
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
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

describe("@convenientAPI requires scope diagnostic", () => {
  it("emits warning when @convenientAPI is used without scope on operation", async () => {
    const diagnostics = (
      await SimpleTester.diagnose(`
      @service
      namespace MyService {
        @convenientAPI(true)
        op test(): void;
      }
    `)
    ).filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/decorator-requires-scope",
    );

    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/decorator-requires-scope",
        severity: "warning",
        message: `@convenientAPI should be applied with a language scope of "java" or "csharp".`,
      },
    ]);
  });

  it("does not emit warning when @convenientAPI(false) is scoped to java", async () => {
    const diagnostics = (
      await SimpleTester.diagnose(`
      @service
      namespace MyService {
        @convenientAPI(false, "java")
        interface MyOps {
          op test(): void;
        }
      }
    `)
    ).filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/decorator-requires-scope",
    );

    strictEqual(diagnostics.length, 0);
  });

  it("emits warning when @convenientAPI(false) is used without scope", async () => {
    const diagnostics = (
      await SimpleTester.diagnose(`
      @service
      namespace MyService {
        @convenientAPI(false)
        op test(): void;
      }
    `)
    ).filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/decorator-requires-scope",
    );

    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/decorator-requires-scope",
        severity: "warning",
        message: `@convenientAPI should be applied with a language scope of "java" or "csharp".`,
      },
    ]);
  });

  it("emits warning when @convenientAPI is scoped to a non-java/csharp language", async () => {
    const diagnostics = (
      await SimpleTester.diagnose(`
      @service
      namespace MyService {
        @convenientAPI(true, "python")
        op test(): void;
      }
    `)
    ).filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/decorator-requires-scope",
    );

    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/decorator-requires-scope",
        severity: "warning",
        message: `@convenientAPI should be applied with a language scope of "java" or "csharp".`,
      },
    ]);
  });

  it("does not emit warning when @convenientAPI is scoped to java", async () => {
    const diagnostics = (
      await SimpleTester.diagnose(`
      @service
      namespace MyService {
        @convenientAPI(true, "java")
        op test(): void;
      }
    `)
    ).filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/decorator-requires-scope",
    );

    strictEqual(diagnostics.length, 0);
  });

  it("does not emit warning when @convenientAPI is scoped to csharp", async () => {
    const diagnostics = (
      await SimpleTester.diagnose(`
      @service
      namespace MyService {
        @convenientAPI(false, "csharp")
        op test(): void;
      }
    `)
    ).filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/decorator-requires-scope",
    );

    strictEqual(diagnostics.length, 0);
  });

  it("does not emit warning when @convenientAPI is scoped to java and csharp", async () => {
    const diagnostics = (
      await SimpleTester.diagnose(`
      @service
      namespace MyService {
        @convenientAPI(true, "java, csharp")
        op test(): void;
      }
    `)
    ).filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/decorator-requires-scope",
    );

    strictEqual(diagnostics.length, 0);
  });

  it("should warn when scoped to 'javascript' (not a valid scope)", async () => {
    const diagnostics = (
      await SimpleTester.diagnose(`
      @service
      namespace MyService {
        @convenientAPI(true, "javascript")
        op test(): void;
      }
    `)
    ).filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/decorator-requires-scope",
    );

    strictEqual(diagnostics.length, 1);
  });

  it("should warn javascript emitter when using generate-convenience-methods option", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      op test(): void;
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-ts",
      "generate-convenience-methods": true,
    });
    const diagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/unnecessary-emitter-option",
    );
    strictEqual(diagnostics.length, 1);
  });

  it("should not warn java emitter when using generate-convenience-methods option", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      op test(): void;
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
      "generate-convenience-methods": true,
    });
    const diagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/unnecessary-emitter-option",
    );
    strictEqual(diagnostics.length, 0);
  });
});
