import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import {
  Model,
  ModelProperty,
  Operation,
  Union,
  ignoreDiagnostics,
  listServices,
} from "@typespec/compiler";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { getHttpOperation, getServers } from "@typespec/http";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkEmitterOptions, SdkModelType, SdkUnionType } from "../src/interfaces.js";
import {
  getClientNamespaceString,
  getDefaultApiVersion,
  getLibraryName,
  getPropertyNames,
  isApiVersion,
} from "../src/public-utils.js";
import { getAllModels, getSdkUnion } from "../src/types.js";
import {
  SdkTestRunner,
  createSdkContextTestHelper,
  createSdkTestRunner,
  createTcgcTestRunnerForEmitter,
} from "./test-host.js";

describe("typespec-client-generator-core: public-utils", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  function getServiceNamespace() {
    return listServices(runner.context.program)[0].type;
  }
  describe("getDefaultApiVersion", () => {
    it("get single", async () => {
      await runner.compile(`
        enum Versions {
          v2022_01_01: "2022-01-01",
        }

        @versioned(Versions)
        @service({})
        namespace MyService {};
      `);
      const serviceNamespace = getServiceNamespace();
      const defaultApiVersion = getDefaultApiVersion(runner.context, serviceNamespace);
      ok(defaultApiVersion);
      strictEqual(defaultApiVersion.value, "2022-01-01");
    });

    it("get multiple date incorrect ordering", async () => {
      await runner.compile(`
        enum Versions {
          v2022_02_01: "2022-02-01",
          v2022_02_01_PREVIEW: "2022-02-01-preview",
          v2022_01_01: "2022-01-01",
        }

        @versioned(Versions)
        @service({})
        @test namespace MyService {};
      `);
      const serviceNamespace = getServiceNamespace();
      const defaultApiVersion = getDefaultApiVersion(runner.context, serviceNamespace);
      ok(defaultApiVersion);
      strictEqual(defaultApiVersion.value, "2022-01-01");
    });

    it("get multiple date correct ordering", async () => {
      await runner.compile(`
        enum Versions {
          v2022_01_01: "2022-01-01",
          v2022_02_01_PREVIEW: "2022-02-01-preview",
          v2022_02_01: "2022-02-01",
        }

        @versioned(Versions)
        @service({})
        @test namespace MyService {};
      `);
      const serviceNamespace = getServiceNamespace();
      const defaultApiVersion = getDefaultApiVersion(runner.context, serviceNamespace);
      ok(defaultApiVersion);
      strictEqual(defaultApiVersion.value, "2022-02-01");
    });

    it("get multiple semantic incorrect", async () => {
      await runner.compile(`
        enum Versions {
          v1_0_0: "1.0.0",
          v1_1_0: "1.1.0",
          v1_0_1: "1.0.1",
        }

        @versioned(Versions)
        @service({})
        @test namespace MyService {};
      `);
      const serviceNamespace = getServiceNamespace();
      const defaultApiVersion = getDefaultApiVersion(runner.context, serviceNamespace);
      ok(defaultApiVersion);
      strictEqual(defaultApiVersion.value, "1.0.1");
    });

    it("get multiple semantic correct", async () => {
      await runner.compile(`
        enum Versions {
          v1_0_0: "1.0",
          v1_0_1: "1.0.1",
          v1_1_0: "1.1.0",
        }

        @versioned(Versions)
        @service({})
        @test namespace MyService {};
      `);
      const serviceNamespace = getServiceNamespace();
      const defaultApiVersion = getDefaultApiVersion(runner.context, serviceNamespace);
      ok(defaultApiVersion);
      strictEqual(defaultApiVersion.value, "1.1.0");
    });

    it("get undefined", async () => {
      await runner.compile(`
        @service({})
        @test namespace MyService {};
      `);
      const serviceNamespace = getServiceNamespace();
      ok(!getDefaultApiVersion(runner.context, serviceNamespace));
    });

    it("get empty", async () => {
      await runner.compile(`
        enum Versions {
        }

        @versioned(Versions)
        @service({})
        @test namespace MyService {};
      `);
      const serviceNamespace = getServiceNamespace();
      ok(!getDefaultApiVersion(runner.context, serviceNamespace));
    });
  });
  describe("isApiVersion", () => {
    it("is api version query", async () => {
      const { func } = (await runner.compile(`
        @test op func(@query("api-version") myApiVersion: string): void;
      `)) as { func: Operation };

      const queryParam = ignoreDiagnostics(getHttpOperation(runner.context.program, func))
        .parameters.parameters[0];
      ok(isApiVersion(runner.context, queryParam));
    });

    it("is api version path", async () => {
      const { func } = (await runner.compile(`
        @test op func(@path apiVersion: string): void;
      `)) as { func: Operation };

      const pathParam = ignoreDiagnostics(getHttpOperation(runner.context.program, func)).parameters
        .parameters[0];
      ok(isApiVersion(runner.context, pathParam));
    });

    it("not api version param", async () => {
      const { func } = (await runner.compile(`
        @test op func(@path notApiVersion: string): void;
      `)) as { func: Operation };

      const pathParam = ignoreDiagnostics(getHttpOperation(runner.context.program, func)).parameters
        .parameters[0];
      ok(!isApiVersion(runner.context, pathParam));
    });

    it("api version in host param", async () => {
      await runner.compile(`
        @service({
          title: "ApiVersion",
        })
        @server(
          "{endpoint}/{ApiVersion}",
          "Api Version",
          {
            endpoint: string,

            @doc("Api Version")
            @path
            ApiVersion: APIVersions,
          }
        )
        namespace MyService;
        enum APIVersions {
          v1_0: "v1.0",
        }
      `);
      const serviceNamespace = getServiceNamespace();
      const server = getServers(runner.context.program, serviceNamespace)?.[0];
      const hostParam = server?.parameters.get("ApiVersion");

      ok(isApiVersion(runner.context, hostParam!));
    });
  });
  describe("getClientNamespaceString", () => {
    it("default to service namespace without client", async () => {
      await runner.compile(`
        @service({})
        namespace Azure.Pick.Me {};
      `);
      strictEqual(
        getClientNamespaceString(
          createSdkContextTestHelper<SdkEmitterOptions>(runner.context.program, {
            "generate-convenience-methods": true,
            "generate-protocol-methods": true,
          })
        ),
        "Azure.Pick.Me"
      );
    });
    it("default to service namespace with client", async () => {
      await runner.compile(`
        @client({name: "MeClient"})
        @service({})
        namespace Azure.Pick.Me {};
      `);
      strictEqual(
        getClientNamespaceString(
          createSdkContextTestHelper<SdkEmitterOptions>(runner.context.program, {
            "generate-convenience-methods": true,
            "generate-protocol-methods": true,
          })
        ),
        "Azure.Pick.Me"
      );
    });
    it("package-name override kebab case", async () => {
      await runner.compile(`
        namespace Azure.NotMe {};
      `);
      strictEqual(
        getClientNamespaceString(
          createSdkContextTestHelper<SdkEmitterOptions>(runner.context.program, {
            "generate-convenience-methods": true,
            "generate-protocol-methods": true,
            "package-name": "azure-pick-me",
          })
        ),
        "Azure.Pick.Me"
      );
    });
    it("package-name override pascal case", async () => {
      await runner.compile(`
        namespace Azure.NotMe {};
      `);
      strictEqual(
        getClientNamespaceString(
          createSdkContextTestHelper<SdkEmitterOptions>(runner.context.program, {
            "generate-convenience-methods": true,
            "generate-protocol-methods": true,
            "package-name": "Azure.Pick.Me",
          })
        ),
        "Azure.Pick.Me"
      );
    });

    it("package-name override lowercase with dots", async () => {
      await runner.compile(`
        @client({name: "MeClient"})
        @service({})
        namespace Azure.NotMe {};
      `);
      strictEqual(
        getClientNamespaceString(
          createSdkContextTestHelper<SdkEmitterOptions>(runner.context.program, {
            "generate-convenience-methods": true,
            "generate-protocol-methods": true,
            "package-name": "azure.pick.me",
          })
        ),
        "Azure.Pick.Me"
      );
    });
    it("no namespace or package name", async () => {
      await runner.compile(`
      namespace Not.A.Service.Namespace;
      `);
      strictEqual(
        getClientNamespaceString(
          createSdkContextTestHelper<SdkEmitterOptions>(runner.context.program, {
            "generate-convenience-methods": true,
            "generate-protocol-methods": true,
          })
        ),
        undefined
      );
    });
  });
  describe("getEffectivePayloadType", () => {
    it("get single", async () => {
      await runner.compile(`
        enum Versions {
          v2022_01_01: "2022-01-01",
        }

        @versioned(Versions)
        @service({})
        namespace MyService {};
      `);
      const serviceNamespace = getServiceNamespace();
      const defaultApiVersion = getDefaultApiVersion(runner.context, serviceNamespace);
      ok(defaultApiVersion);
      strictEqual(defaultApiVersion.value, "2022-01-01");
    });
  });

  describe("getPropertyNames", () => {
    it("property language projected name", async () => {
      async function helper(emitterName: string, expectedLibraryName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { MyModel } = (await runner.compile(`
        @test
        model MyModel {
          @clientName("MadeForCS", "csharp")
          @clientName("MadeForJava", "java")
          @clientName("MadeForTS", "javascript")
          @clientName("made_for_python", "python")
          wasMadeFor?: string;
        }
      `)) as { MyModel: Model };
        deepStrictEqual(getPropertyNames(runner.context, MyModel.properties.get("wasMadeFor")!), [
          expectedLibraryName,
          "wasMadeFor",
        ]);
      }
      await helper("@azure-tools/typespec-csharp", "MadeForCS");
      await helper("@azure-tools/typespec-java", "MadeForJava");
      await helper("@azure-tools/typespec-python", "made_for_python");
      await helper("@azure-tools/typespec-ts", "MadeForTS");
    });
    it("property language projected name augmented", async () => {
      async function helper(emitterName: string, expectedLibraryName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { MyModel } = (await runner.compile(`
        @test
        model MyModel {
          @clientName("MadeForCS", "csharp")
          @clientName("MadeForJava", "java")
          @clientName("MadeForTS", "javascript")
          @clientName("made_for_python", "python")
          wasMadeFor?: string;
        }
      `)) as { MyModel: Model };
        deepStrictEqual(getPropertyNames(runner.context, MyModel.properties.get("wasMadeFor")!), [
          expectedLibraryName,
          "wasMadeFor",
        ]);
      }
      await helper("@azure-tools/typespec-csharp", "MadeForCS");
      await helper("@azure-tools/typespec-java", "MadeForJava");
      await helper("@azure-tools/typespec-python", "made_for_python");
      await helper("@azure-tools/typespec-ts", "MadeForTS");
    });
    it("property client projected name", async () => {
      async function helper(emitterName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { MyModel } = (await runner.compile(`
        @test
        model MyModel {
          @clientName("NameForAllLanguage")
          wasMadeFor?: string;
        }
      `)) as { MyModel: Model };
        deepStrictEqual(getPropertyNames(runner.context, MyModel.properties.get("wasMadeFor")!), [
          "NameForAllLanguage",
          "wasMadeFor",
        ]);
      }
      await helper("@azure-tools/typespec-csharp");
      await helper("@azure-tools/typespec-java");
      await helper("@azure-tools/typespec-python");
      await helper("@azure-tools/typespec-ts");
    });
    it("property no projected name", async () => {
      async function helper(emitterName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { MyModel } = (await runner.compile(`
        @test
        model MyModel {
          @encodedName("application/json", "madeFor")
          wasMadeFor?: string;
        }
      `)) as { MyModel: Model };
        deepStrictEqual(getPropertyNames(runner.context, MyModel.properties.get("wasMadeFor")!), [
          "wasMadeFor",
          "madeFor",
        ]);
      }
      await helper("@azure-tools/typespec-csharp");
      await helper("@azure-tools/typespec-java");
      await helper("@azure-tools/typespec-ts");
      await helper("@azure-tools/typespec-python");
    });
    it("property with projected client and json name", async () => {
      async function helper(emitterName: string, expectedLibraryName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { MyModel } = (await runner.compile(`
        @test
        model MyModel {
          @clientName("MadeForCS", "csharp")
          @clientName("MadeForJava", "java")
          @clientName("MadeForTS", "javascript")
          @clientName("made_for_python", "python")
          @encodedName("application/json", "madeFor")
          wasMadeFor?: string;
        }
      `)) as { MyModel: Model };
        deepStrictEqual(getPropertyNames(runner.context, MyModel.properties.get("wasMadeFor")!), [
          expectedLibraryName,
          "madeFor",
        ]);
      }

      await helper("@azure-tools/typespec-csharp", "MadeForCS");
      await helper("@azure-tools/typespec-java", "MadeForJava");
      await helper("@azure-tools/typespec-python", "made_for_python");
      await helper("@azure-tools/typespec-ts", "MadeForTS");
    });
    it("property with projected language and json name", async () => {
      async function helper(emitterName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { MyModel } = (await runner.compile(`
        @test
        model MyModel {
          @clientName("propName")
          @encodedName("application/json", "madeFor")
          wasMadeFor?: string;
        }
      `)) as { MyModel: Model };
        deepStrictEqual(getPropertyNames(runner.context, MyModel.properties.get("wasMadeFor")!), [
          "propName",
          "madeFor",
        ]);
      }

      await helper("@azure-tools/typespec-csharp");
      await helper("@azure-tools/typespec-java");
      await helper("@azure-tools/typespec-ts");
      await helper("@azure-tools/typespec-python");
    });
  });
  describe("getLibraryName", () => {
    it("operation client projected name", async () => {
      async function helper(emitterName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { func } = (await runner.compile(`
        @test @clientName("rightName") op func(@query("api-version") myApiVersion: string): void;
      `)) as { func: Operation };
        strictEqual(getLibraryName(runner.context, func), "rightName");
      }
      await helper("@azure-tools/typespec-csharp");
      await helper("@azure-tools/typespec-java");
      await helper("@azure-tools/typespec-ts");
      await helper("@azure-tools/typespec-python");
    });
    it("operation language projected name", async () => {
      async function helper(emitterName: string, expected: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { func } = (await runner.compile(`
        @test
        @clientName("madeForCS", "csharp")
        @clientName("madeForJava", "java")
        @clientName("madeForTS", "javascript")
        @clientName("made_for_python", "python")
        op func(@query("api-version") myApiVersion: string): void;
      `)) as { func: Operation };
        strictEqual(getLibraryName(runner.context, func), expected);
      }
      await helper("@azure-tools/typespec-csharp", "madeForCS");
      await helper("@azure-tools/typespec-java", "madeForJava");
      await helper("@azure-tools/typespec-ts", "madeForTS");
      await helper("@azure-tools/typespec-python", "made_for_python");
    });
    it("operation language projected name augmented", async () => {
      async function helper(emitterName: string, expected: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { func } = (await runner.compile(`
        @test
        op func(@query("api-version") myApiVersion: string): void;

        @@clientName(func, "madeForCS", "csharp");
        @@clientName(func, "madeForJava", "java");
        @@clientName(func, "madeForTS", "javascript");
        @@clientName(func, "made_for_python", "python");
      `)) as { func: Operation };
        strictEqual(getLibraryName(runner.context, func), expected);
      }
      await helper("@azure-tools/typespec-csharp", "madeForCS");
      await helper("@azure-tools/typespec-java", "madeForJava");
      await helper("@azure-tools/typespec-ts", "madeForTS");
      await helper("@azure-tools/typespec-python", "made_for_python");
    });
    it("operation json projected name", async () => {
      async function helper(emitterName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { func } = (await runner.compile(`
        @test
        @encodedName("application/json", "NotToUseMeAsName") // Should be ignored
        op func(@query("api-version") myApiVersion: string): void;
      `)) as { func: Operation };
        strictEqual(getLibraryName(runner.context, func), "func");
      }
      await helper("@azure-tools/typespec-csharp");
      await helper("@azure-tools/typespec-java");
      await helper("@azure-tools/typespec-ts");
      await helper("@azure-tools/typespec-python");
    });
    it("operation no projected name", async () => {
      async function helper(emitterName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { func } = (await runner.compile(`
        @test
        op func(@query("api-version") myApiVersion: string): void;
      `)) as { func: Operation };
        strictEqual(getLibraryName(runner.context, func), "func");
      }
      await helper("@azure-tools/typespec-csharp");
      await helper("@azure-tools/typespec-java");
      await helper("@azure-tools/typespec-ts");
      await helper("@azure-tools/typespec-python");
    });
    it("model client projected name", async () => {
      async function helper(emitterName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { MyModel } = (await runner.compile(`
        @test
        @clientName("RightName")
        model MyModel {
          prop: string
        }
      `)) as { MyModel: Model };
        strictEqual(getLibraryName(runner.context, MyModel), "RightName");
      }
      await helper("@azure-tools/typespec-csharp");
      await helper("@azure-tools/typespec-java");
      await helper("@azure-tools/typespec-ts");
      await helper("@azure-tools/typespec-python");
    });
    it("model language projected name", async () => {
      async function helper(emitterName: string, expected: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { MyModel } = (await runner.compile(`
        @test
        @clientName("CsharpModel", "csharp")
        @clientName("JavaModel", "java")
        @clientName("JavascriptModel", "javascript")
        @clientName("PythonModel", "python")
        model MyModel {
          prop: string
        }
      `)) as { MyModel: Model };
        strictEqual(getLibraryName(runner.context, MyModel), expected);
      }
      await helper("@azure-tools/typespec-csharp", "CsharpModel");
      await helper("@azure-tools/typespec-java", "JavaModel");
      await helper("@azure-tools/typespec-ts", "JavascriptModel");
      await helper("@azure-tools/typespec-python", "PythonModel");
    });
    it("model language projected name augmented", async () => {
      async function helper(emitterName: string, expected: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { MyModel } = (await runner.compile(`
        @test
        model MyModel {
          prop: string
        }

        @@clientName(MyModel, "CsharpModel", "csharp");
        @@clientName(MyModel, "JavaModel", "java");
        @@clientName(MyModel, "JavascriptModel", "javascript");
        @@clientName(MyModel, "PythonModel", "python");
      `)) as { MyModel: Model };
        strictEqual(getLibraryName(runner.context, MyModel), expected);
      }
      await helper("@azure-tools/typespec-csharp", "CsharpModel");
      await helper("@azure-tools/typespec-java", "JavaModel");
      await helper("@azure-tools/typespec-ts", "JavascriptModel");
      await helper("@azure-tools/typespec-python", "PythonModel");
    });
    it("model json projected name", async () => {
      async function helper(emitterName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { MyModel } = (await runner.compile(`
        @test
        @encodedName("application/json", "NotToUseMeAsName") // Should be ignored
        model MyModel {
          prop: string
        }
      `)) as { MyModel: Model };
        strictEqual(getLibraryName(runner.context, MyModel), "MyModel");
      }
      await helper("@azure-tools/typespec-csharp");
      await helper("@azure-tools/typespec-java");
      await helper("@azure-tools/typespec-ts");
      await helper("@azure-tools/typespec-python");
    });
    it("model no projected name", async () => {
      async function helper(emitterName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { MyModel } = (await runner.compile(`
        @test
        model MyModel {
          prop: string
        }
      `)) as { MyModel: Model };
        strictEqual(getLibraryName(runner.context, MyModel), "MyModel");
      }
      await helper("@azure-tools/typespec-csharp");
      await helper("@azure-tools/typespec-java");
      await helper("@azure-tools/typespec-ts");
      await helper("@azure-tools/typespec-python");
    });
    it("model friendly name", async () => {
      async function helper(emitterName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { MyModel } = (await runner.compile(`
        @test
        @friendlyName("FriendlyName")
        model MyModel {
          prop: string
        }
      `)) as { MyModel: Model };
        strictEqual(getLibraryName(runner.context, MyModel), "FriendlyName");
      }
      await helper("@azure-tools/typespec-csharp");
      await helper("@azure-tools/typespec-java");
      await helper("@azure-tools/typespec-ts");
      await helper("@azure-tools/typespec-python");
    });
    it("model friendly name augmented", async () => {
      async function helper(emitterName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { MyModel } = (await runner.compile(`
        @test
        model MyModel {
          prop: string
        }
        @@friendlyName(MyModel, "FriendlyName");
      `)) as { MyModel: Model };
        strictEqual(getLibraryName(runner.context, MyModel), "FriendlyName");
      }
      await helper("@azure-tools/typespec-csharp");
      await helper("@azure-tools/typespec-java");
      await helper("@azure-tools/typespec-ts");
      await helper("@azure-tools/typespec-python");
    });

    it("should return language specific name when both language specific name and friendly name exist", async () => {
      async function helper(expected: string, emitterName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { MyModel } = (await runner.compile(`
        @test
        @friendlyName("FriendlyName")
        @clientName("CsharpModel", "csharp")
        @clientName("JavaModel", "java")
        @clientName("JavascriptModel", "javascript")
        @clientName("PythonModel", "python")
        model MyModel {
          prop: string
        }
      `)) as { MyModel: Model };
        strictEqual(getLibraryName(runner.context, MyModel), expected);
      }
      await helper("CsharpModel", "@azure-tools/typespec-csharp");
      await helper("JavaModel", "@azure-tools/typespec-java");
      await helper("JavascriptModel", "@azure-tools/typespec-ts");
      await helper("PythonModel", "@azure-tools/typespec-python");
    });

    it("should return client name when both client name and friendly name exist", async () => {
      async function helper(expected: string, emitterName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { MyModel } = (await runner.compile(`
        @test
        @friendlyName("FriendlyName")
        @clientName("clientName")
        model MyModel {
          prop: string
        }
      `)) as { MyModel: Model };
        strictEqual(getLibraryName(runner.context, MyModel), expected);
      }
      await helper("clientName", "@azure-tools/typespec-csharp");
      await helper("clientName", "@azure-tools/typespec-java");
      await helper("clientName", "@azure-tools/typespec-ts");
      await helper("clientName", "@azure-tools/typespec-python");
    });

    it("parameter client projected name", async () => {
      async function helper(emitterName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { param } = (await runner.compile(`
        op func(
          @test
          @clientName("rightName")
          @query("param")
          param: string
        ): void;
      `)) as { param: ModelProperty };
        strictEqual(getLibraryName(runner.context, param), "rightName");
      }
      await helper("@azure-tools/typespec-csharp");
      await helper("@azure-tools/typespec-java");
      await helper("@azure-tools/typespec-ts");
      await helper("@azure-tools/typespec-python");
    });
    it("parameter language projected name", async () => {
      async function helper(emitterName: string, expected: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { param } = (await runner.compile(`
        op func(
          @test
          @clientName("csharpParam", "csharp")
          @clientName("javaParam", "java")
          @clientName("javascriptParam", "javascript")
          @clientName("python_param", "python")
          @query("param")
          param: string
        ): void;
      `)) as { param: ModelProperty };
        strictEqual(getLibraryName(runner.context, param), expected);
      }
      await helper("@azure-tools/typespec-csharp", "csharpParam");
      await helper("@azure-tools/typespec-java", "javaParam");
      await helper("@azure-tools/typespec-ts", "javascriptParam");
      await helper("@azure-tools/typespec-python", "python_param");
    });

    it("parameter json projected name", async () => {
      async function helper(emitterName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { param } = (await runner.compile(`
        op func(
          @test
          @encodedName("application/json", "ShouldBeIgnored")
          @query("param")
          param: string
        ): void;
      `)) as { param: ModelProperty };
        strictEqual(getLibraryName(runner.context, param), "param");
      }
      await helper("@azure-tools/typespec-csharp");
      await helper("@azure-tools/typespec-java");
      await helper("@azure-tools/typespec-ts");
      await helper("@azure-tools/typespec-python");
    });
    it("parameter no projected name", async () => {
      async function helper(emitterName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { param } = (await runner.compile(`
        op func(
          @test
          @query("param")
          param: string
        ): void;
      `)) as { param: ModelProperty };
        strictEqual(getLibraryName(runner.context, param), "param");
      }
      await helper("@azure-tools/typespec-csharp");
      await helper("@azure-tools/typespec-java");
      await helper("@azure-tools/typespec-ts");
      await helper("@azure-tools/typespec-python");
    });
  });

  describe("getGeneratedName", () => {
    describe("simple anonymous model", () => {
      it("should handle anonymous model used by operation body", async () => {
        await runner.compileWithBuiltInService(`
        op test(@body body: {name: string}): void;
      `);
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 1);
        strictEqual((models[0] as SdkModelType).generatedName, "TestRequest");
      });

      it("should handle anonymous model used by operation response", async () => {
        await runner.compileWithBuiltInService(`
          op test(): {name: string};
        `);
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 1);
        strictEqual((models[0] as SdkModelType).generatedName, "TestResponse");
      });

      it("should handle anonymous model in both body and response", async () => {
        await runner.compileWithBuiltInService(`
          op test(@body body: {name: string}): {name: string};
        `);
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 2);
        ok(models.find((x) => (x as SdkModelType).generatedName === "TestRequest"));
        ok(models.find((x) => (x as SdkModelType).generatedName === "TestResponse"));
      });

      it("should handle anonymous model used by operation response's model", async () => {
        await runner.compileWithBuiltInService(`
          model A {
            pForA: {
              name: string;
            };
          }
          op test(): A;
        `);
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 2);
        ok(models.find((x) => (x as SdkModelType).generatedName === "APForA"));
      });

      it("should handle anonymous model used by operation body's model", async () => {
        await runner.compileWithBuiltInService(
          `
          model A {
            pForA: {
              name: string;
            };
          }

          op test(@body body: A): void;
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 2);
        ok(models.find((x) => (x as SdkModelType).generatedName === "APForA"));
      });

      it("should handle anonymous model used by both input and output", async () => {
        await runner.compileWithBuiltInService(
          `
          model A {
            pForA: {
              name: string;
            };
          }

          op test(@body body: A): A;
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 2);
        ok(models.find((x) => (x as SdkModelType).generatedName === "APForA"));
      });
    });

    describe("anonymous model with array or dict", () => {
      it("should handle anonymous model array used by model", async () => {
        await runner.compileWithBuiltInService(
          `
          model A {
            members: {name: string}[];
          }
          op test(@body body: A): void;
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 2);
        ok(models.find((x) => (x as SdkModelType).generatedName === "AMember"));
      });

      it("should handle anonymous model array used by operation body", async () => {
        await runner.compileWithBuiltInService(
          `
          op test(@body body: {name: string}[]): void;
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 1);
        strictEqual((models[0] as SdkModelType).generatedName, "TestRequest");
      });

      it("should handle anonymous model dictionary used by operation body", async () => {
        await runner.compileWithBuiltInService(
          `
          op test(@body body: Record<{name: string}>): void;
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 1);
        strictEqual((models[0] as SdkModelType).generatedName, "TestRequest");
      });

      it("should handle anonymous model dictionary used by model", async () => {
        await runner.compileWithBuiltInService(
          `
          model A {
            members: Record<{name: {value: string}}>;
          }
          op test(@body body: A): void;
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 3);
        ok(models.find((x) => (x as SdkModelType).generatedName === "AMember"));
        ok(models.find((x) => (x as SdkModelType).generatedName === "AMemberName"));
      });
    });
    describe("anonymous model in base or derived model", () => {
      it("should handle anonymous model used by base model", async () => {
        await runner.compileWithBuiltInService(
          `
          model A extends B {
            name: string;
          }
          model B {
            pForB: {
              name: string;
            };
          }
          op test(@body body: A): void;
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 3);
        ok(models.find((x) => (x as SdkModelType).generatedName === "BPForB"));
      });

      it("should handle anonymous model used by derived model", async () => {
        await runner.compileWithBuiltInService(
          `
          @discriminator("kind")
          model Fish {
            age: int32;
          }

          @discriminator("sharktype")
          model Shark extends Fish {
            kind: "shark";
            pForShark: {
              name: string;
            };
          }

          model Salmon extends Fish {
            kind: "salmon";
            pForSalmon: {
              name: string;
            };
          }
          op test(@body body: Fish): void;
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 5);
        ok(models.find((x) => (x as SdkModelType).generatedName === "SharkPForShark"));
        ok(models.find((x) => (x as SdkModelType).generatedName === "SalmonPForSalmon"));
      });
    });
    describe("recursively handle anonymous model", () => {
      it("should handle model A -> model B -> anonymous model case", async () => {
        await runner.compileWithBuiltInService(
          `
          model A {
            pForA: B;
          }

          model B {
            pForB: {
              name: string
            };
          }

          op test(@body body: A): void;
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 3);
        ok(models.find((x) => (x as SdkModelType).generatedName === "BPForB"));
      });

      it("should handle model A -> model B -> model C -> anonymous model case", async () => {
        await runner.compileWithBuiltInService(
          `
          model A {
            pForA: B;
          }

          model B {
            p1ForB: C;
          }

          model C {
            p1ForC: {
              name: string
            };
          }

          op test(@body body: A): void;
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 4);
        ok(models.find((x) => (x as SdkModelType).generatedName === "CP1ForC"));
      });

      it("should handle cyclic model reference", async () => {
        await runner.compileWithBuiltInService(
          `
          model A {
            pForA: B;
          }

          model B {
            p1ForB: A;
            p2ForB: {
              name: string;
            };
          }

          op test(@body body: A): void;
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 3);
        ok(models.find((x) => (x as SdkModelType).generatedName === "BP2ForB"));
      });

      it("should recursively handle array of anonymous model", async () => {
        await runner.compileWithBuiltInService(
          `
          model A {
            pForA: {
              pForAnonymousModel: {
                name: string;
              };
            }[];
          }

          op test(@body body: A): void;
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 3);
        ok(models.find((x) => (x as SdkModelType).generatedName === "APForA"));
        ok(models.find((x) => (x as SdkModelType).generatedName === "APForAPForAnonymousModel"));
      });

      it("should recursively handle dict of anonymous model", async () => {
        await runner.compileWithBuiltInService(
          `
          model A {
            pForA: Record<{name: {value: string}}>;
          }
          op test(@body body: A): void;
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 3);
        ok(models.find((x) => (x as SdkModelType).generatedName === "APForA"));
        ok(models.find((x) => (x as SdkModelType).generatedName === "APForAName"));
      });

      it("model property of union with anonymous model", async () => {
        await runner.compileWithBuiltInService(
          `
          model A {
            b: null | {
                tokens: string[];
            };
          };
          op test(@body body: A): void;
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 2);
        ok(models.find((x) => (x as SdkModelType).generatedName === "AB"));
      });
    });

    describe("union model's name", () => {
      it("should handle union model used in model property", async () => {
        await runner.compileWithBuiltInService(
          `
          model A {
            status: "start" | "stop";
          }
          op test(@body body: A): void;
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 1);
        const unionName = ((models[0] as SdkModelType).properties[0].type as SdkUnionType)
          .generatedName;
        strictEqual(unionName, "AStatus");
        strictEqual(models[0].kind, "model");
        const statusProp = models[0].properties[0];
        strictEqual(statusProp.kind, "property");
        strictEqual(statusProp.type.kind, "enum");
        strictEqual(statusProp.type.values.length, 2);
        const startVal = statusProp.type.values.find((x) => x.name === "start")!;
        strictEqual(startVal.kind, "enumvalue");
        strictEqual(startVal.valueType.kind, "string");

        const stopVal = statusProp.type.values.find((x) => x.name === "stop")!;
        strictEqual(stopVal.kind, "enumvalue");
        strictEqual(stopVal.valueType.kind, "string");
      });

      it("should handle union of anonymous model", async () => {
        await runner.compileWithBuiltInService(
          `
          model A {
            items: {name: string} | {test: string} | B;
          }

          model B {
            pForB: string;
          }
          op test(@body body: A): void;
        `
        );
        const models = runner.context.sdkPackage.models;
        const diagnostics = runner.context.sdkPackage.diagnostics;
        strictEqual(models.length, 4);
        const union = (models[0] as SdkModelType).properties[0].type as SdkUnionType;
        strictEqual(union.generatedName, "AItems");
        const model1 = union.values[0] as SdkModelType;
        strictEqual(model1.generatedName, "AItems1");
        const model2 = union.values[1] as SdkModelType;
        strictEqual(model2.generatedName, "AItems2");
        const diagnostic = { code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind" };
        expectDiagnostics(diagnostics, [diagnostic, diagnostic, diagnostic]);
      });

      it("should handle union together with anonymous model", async () => {
        await runner.compileWithBuiltInService(
          `
          model A {
            choices: {status: "start" | "stop"}[];
          }
          op test(@body body: A): void;
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 2);
        const test1 = models.find((x) => (x as SdkModelType).generatedName === "AChoice")!;
        ok(test1);
        const unionName = ((test1 as SdkModelType).properties[0].type as SdkUnionType)
          .generatedName;
        strictEqual(unionName, "AChoiceStatus");
      });
    });

    describe("anonymous model used in multiple operations", () => {
      it("should handle same anonymous model used in different operations", async () => {
        await runner.compileWithBuiltInService(
          `
          model A {
            pForA: B;
          }

          model B {
            pForB: {
              name: string;
            };
          }
          @post
          @route("/op1")
          op op1(@body body: A): void;

          @post
          @route("/op2")
          op op2(@body body: B): void;

          @post
          @route("/op3")
          op op3(@body body: B): boolean;
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 3);
        ok(models.find((x) => (x as SdkModelType).generatedName === "BPForB"));
      });
    });

    describe("orphan model with anonymous model", () => {
      it("model", async () => {
        await runner.compileWithBuiltInService(
          `
          @usage(Usage.input | Usage.output)
          @access(Access.public)
          model A {
            pForA: {
              name: string;
            };
          }
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 1);
        strictEqual(
          ((models[0] as SdkModelType).properties[0].type as SdkModelType).generatedName,
          "APForA"
        );
      });

      it("union", async () => {
        await runner.compileWithBuiltInService(
          `
          @usage(Usage.input | Usage.output)
          @access(Access.public)
          model A {
            status: "start" | "stop";
          }
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 1);
        const unionName = ((models[0] as SdkModelType).properties[0].type as SdkUnionType)
          .generatedName;
        strictEqual(unionName, "AStatus");
      });
    });

    describe("corner case", () => {
      it("anonymous model from spread alias", async () => {
        await runner.compileWithBuiltInService(
          `
          alias RequestParameter = {
            @path
            id: string;
        
            name: string;
          };
  
          op test(...RequestParameter): void;
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 1);
        // we could not identify the anonymous model from alias spread
        // bc each time we try to get body, we will get a new type from compiler
        // so we will keep the empty name
        ok(models.find((x) => (x as SdkModelType).generatedName === ""));
      });

      it("anonymous model for body parameter", async () => {
        await runner.compileWithBuiltInService(
          `
          op test(foo: string, bar: string): void;
        `
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 1);
        ok(models.find((x) => (x as SdkModelType).generatedName === "TestRequest"));
      });

      it("anonymous union in response header", async () => {
        const { repeatabilityResult } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          model ResponseWithAnonymousUnion {
            @header("Repeatability-Result")
            @test
            repeatabilityResult?: "accepted" | "rejected";

            test: string;
          }
  
          op test(): ResponseWithAnonymousUnion;
        }
        `)) as { repeatabilityResult: ModelProperty };

        const union = getSdkUnion(runner.context, repeatabilityResult.type as Union);
        strictEqual(
          (union as SdkUnionType).generatedName,
          "ResponseWithAnonymousUnionRepeatabilityResult"
        );
      });

      it("anonymous union in request header", async () => {
        const { repeatabilityResult } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          model RequestParameterWithAnonymousUnion {
            @header("Repeatability-Result")
            @test
            repeatabilityResult?: "accepted" | "rejected";

            test: string;
          }
  
          op test(...RequestParameterWithAnonymousUnion): void;
        }
        `)) as { repeatabilityResult: ModelProperty };

        const union = getSdkUnion(runner.context, repeatabilityResult.type as Union);
        strictEqual(
          (union as SdkUnionType).generatedName,
          "RequestParameterWithAnonymousUnionRepeatabilityResult"
        );
      });

      it("anonymous union with base type", async () => {
        const { repeatabilityResult } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          model RequestParameterWithAnonymousUnion {
            @header("Repeatability-Result")
            @test
            repeatabilityResult?: "accepted" | "rejected" | string;

            test: string;
          }
  
          op test(...RequestParameterWithAnonymousUnion): void;
        }
        `)) as { repeatabilityResult: ModelProperty };

        const stringType = getSdkUnion(runner.context, repeatabilityResult.type as Union)!;
        strictEqual(stringType.kind, "enum");
        strictEqual(stringType.values.length, 2);
        strictEqual(stringType.values[0].kind, "enumvalue");
        strictEqual(stringType.values[0].value, "accepted");
        strictEqual(stringType.values[1].kind, "enumvalue");
        strictEqual(stringType.values[1].value, "rejected");
        strictEqual(stringType.valueType.kind, "string");
      });
    });

    describe("getLroMetadata", () => {
      const lroCode = `
      @versioned(Versions)
      @service({title: "Test Service"})
      namespace TestService;
      alias ResourceOperations = Azure.Core.ResourceOperations<NoConditionalRequests &
      NoRepeatableRequests &
      NoClientRequestId>;

      @doc("The API version.")
      enum Versions {
        @doc("The 2022-12-01-preview version.")
        @useDependency(Azure.Core.Versions.v1_0_Preview_2)
        v2022_12_01_preview: "2022-12-01-preview",
      }

      @resource("users")
      @doc("Details about a user.")
      model User {
      @key
      @visibility("read")
      @doc("The name of user.")
      name: string;

      @doc("The role of user")
      role: string;
      }

      @doc("The parameters for exporting a user.")
      model UserExportParams {
      @query
      @doc("The format of the data.")
      format: string;
      }

      @doc("The exported user data.")
      model ExportedUser {
      @doc("The name of user.")
      name: string;

      @doc("The exported URI.")
      resourceUri: string;
      }

      op export is ResourceOperations.LongRunningResourceAction<User, UserExportParams, ExportedUser>;
    `;
      it("filter-out-core-models true", async () => {
        const runnerWithCore = await createSdkTestRunner({
          librariesToAdd: [AzureCoreTestLibrary],
          autoUsings: ["Azure.Core", "Azure.Core.Traits"],
          emitterName: "@azure-tools/typespec-java",
        });
        await runnerWithCore.compile(lroCode);
        const models = runnerWithCore.context.sdkPackage.models;
        strictEqual(models.length, 2);
        deepStrictEqual(models.map((x) => x.name).sort(), ["ExportedUser", "User"].sort());
      });
      it("filter-out-core-models false", async () => {
        const runnerWithCore = await createSdkTestRunner({
          librariesToAdd: [AzureCoreTestLibrary],
          autoUsings: ["Azure.Core", "Azure.Core.Traits"],
          emitterName: "@azure-tools/typespec-java",
        });
        await runnerWithCore.compile(lroCode);
        runnerWithCore.context.filterOutCoreModels = false;
        const models = getAllModels(runnerWithCore.context);
        strictEqual(models.length, 8);
        // there should only be one non-core model
        deepStrictEqual(
          models.map((x) => x.name).sort(),
          [
            "ResourceOperationStatus",
            "OperationState",
            "Error",
            "InnerError",
            "ExportedUser",
            "ErrorResponse",
            "OperationStatus",
            "User",
          ].sort()
        );
      });
    });
  });
});
