import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import {
  Model,
  ModelProperty,
  Namespace,
  Operation,
  ignoreDiagnostics,
  listServices,
} from "@typespec/compiler";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { getHttpOperation, getServers } from "@typespec/http";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkEmitterOptions, UsageFlags } from "../src/interfaces.js";
import {
  getClientNamespaceString,
  getCrossLanguageDefinitionId,
  getDefaultApiVersion,
  getGeneratedName,
  getHttpOperationWithCache,
  getLibraryName,
  getPropertyNames,
  isApiVersion,
  isAzureCoreModel,
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

    it("get with all", async () => {
      const runnerWithVersion = await createSdkTestRunner({
        "api-version": "all",
        emitterName: "@azure-tools/typespec-python",
      });

      const { MyService } = await runnerWithVersion.compile(`
        enum Versions {
          v1_0_0: "1.0",
          v1_0_1: "1.0.1",
          v1_1_0: "1.1.0",
        }

        @versioned(Versions)
        @service({})
        @test namespace MyService {};
      `);
      const defaultApiVersion = getDefaultApiVersion(
        runnerWithVersion.context,
        MyService as Namespace,
      );
      ok(defaultApiVersion);
      strictEqual(defaultApiVersion.value, "1.1.0");
    });

    it("get with latest", async () => {
      const runnerWithVersion = await createSdkTestRunner({
        "api-version": "latest",
        emitterName: "@azure-tools/typespec-python",
      });

      const { MyService } = await runnerWithVersion.compile(`
        enum Versions {
          v1_0_0: "1.0",
          v1_0_1: "1.0.1",
          v1_1_0: "1.1.0",
        }

        @versioned(Versions)
        @service({})
        @test namespace MyService {};
      `);
      const defaultApiVersion = getDefaultApiVersion(
        runnerWithVersion.context,
        MyService as Namespace,
      );
      ok(defaultApiVersion);
      strictEqual(defaultApiVersion.value, "1.1.0");
    });

    it("get with specific version", async () => {
      const runnerWithVersion = await createSdkTestRunner({
        "api-version": "1.0.1",
        emitterName: "@azure-tools/typespec-python",
      });

      const { MyService } = await runnerWithVersion.compile(`
        enum Versions {
          v1_0_0: "1.0",
          v1_0_1: "1.0.1",
          v1_1_0: "1.1.0",
        }

        @versioned(Versions)
        @service({})
        @test namespace MyService {};
      `);
      const defaultApiVersion = getDefaultApiVersion(
        runnerWithVersion.context,
        MyService as Namespace,
      );
      ok(defaultApiVersion);
      strictEqual(defaultApiVersion.value, "1.0.1");
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
        @test op func(@path foo: string): void;
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

      ok(hostParam && isApiVersion(runner.context, hostParam));
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
          await createSdkContextTestHelper<SdkEmitterOptions>(runner.context.program, {
            "generate-convenience-methods": true,
            "generate-protocol-methods": true,
          }),
        ),
        "Azure.Pick.Me",
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
          await createSdkContextTestHelper<SdkEmitterOptions>(runner.context.program, {
            "generate-convenience-methods": true,
            "generate-protocol-methods": true,
          }),
        ),
        "Azure.Pick.Me",
      );
    });
    it("package-name override kebab case", async () => {
      await runner.compile(`
        namespace Azure.NotMe {};
      `);
      strictEqual(
        getClientNamespaceString(
          await createSdkContextTestHelper<SdkEmitterOptions>(runner.context.program, {
            "generate-convenience-methods": true,
            "generate-protocol-methods": true,
            "package-name": "azure-pick-me",
          }),
        ),
        "Azure.Pick.Me",
      );
    });
    it("package-name override pascal case", async () => {
      await runner.compile(`
        namespace Azure.NotMe {};
      `);
      strictEqual(
        getClientNamespaceString(
          await createSdkContextTestHelper<SdkEmitterOptions>(runner.context.program, {
            "generate-convenience-methods": true,
            "generate-protocol-methods": true,
            "package-name": "Azure.Pick.Me",
          }),
        ),
        "Azure.Pick.Me",
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
          await createSdkContextTestHelper<SdkEmitterOptions>(runner.context.program, {
            "generate-convenience-methods": true,
            "generate-protocol-methods": true,
            "package-name": "azure.pick.me",
          }),
        ),
        "Azure.Pick.Me",
      );
    });
    it("no namespace or package name", async () => {
      await runner.compile(`
      namespace Not.A.Service.Namespace;
      `);
      strictEqual(
        getClientNamespaceString(
          await createSdkContextTestHelper<SdkEmitterOptions>(runner.context.program, {
            "generate-convenience-methods": true,
            "generate-protocol-methods": true,
          }),
        ),
        undefined,
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
        const wasMadeFor = MyModel.properties.get("wasMadeFor");
        ok(wasMadeFor);
        deepStrictEqual(getPropertyNames(runner.context, wasMadeFor), [
          expectedLibraryName,
          "wasMadeFor",
        ]);
        strictEqual(getCrossLanguageDefinitionId(runner.context, wasMadeFor), "MyModel.wasMadeFor");
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
        const wasMadeFor = MyModel.properties.get("wasMadeFor");
        ok(wasMadeFor);
        deepStrictEqual(getPropertyNames(runner.context, wasMadeFor), [
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
        const wasMadeFor = MyModel.properties.get("wasMadeFor");
        ok(wasMadeFor);
        deepStrictEqual(getPropertyNames(runner.context, wasMadeFor), [
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
        const wasMadeFor = MyModel.properties.get("wasMadeFor");
        ok(wasMadeFor);
        deepStrictEqual(getPropertyNames(runner.context, wasMadeFor), ["wasMadeFor", "madeFor"]);
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
        const wasMadeFor = MyModel.properties.get("wasMadeFor");
        ok(wasMadeFor);
        deepStrictEqual(getPropertyNames(runner.context, wasMadeFor), [
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
        const wasMadeFor = MyModel.properties.get("wasMadeFor");
        ok(wasMadeFor);
        deepStrictEqual(getPropertyNames(runner.context, wasMadeFor), ["propName", "madeFor"]);
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
    it("template without @friendlyName renaming", async () => {
      await runner.compileWithBuiltInService(`
      op GetResourceOperationStatus<
        Resource extends TypeSpec.Reflection.Model
      >(): ResourceOperationStatus<Resource>;
      
      model ResourceOperationStatus<Resource extends TypeSpec.Reflection.Model> {
        status: string;
        resource: Resource;
      }

      model User {
        id: string;
      }

      op getStatus is GetResourceOperationStatus<User>;
      `);
      const models = runner.context.sdkPackage.models;
      strictEqual(models.length, 2);
      const model = models.filter((x) => x.name === "ResourceOperationStatusUser")[0];
      ok(model);
    });

    it("template without @friendlyName renaming for union as enum", async () => {
      await runner.compileWithBuiltInService(`
      union DependencyOfOrigins {
        serviceExplicitlyCreated: "ServiceExplicitlyCreated",
        userExplicitlyCreated: "UserExplicitlyCreated",
        string,
      }

      model DependencyOfRelationshipProperties
        is BaseRelationshipProperties<DependencyOfOrigins>;

      model BaseRelationshipProperties<TOrigin> {
        originInformation: RelationshipOriginInformation<TOrigin>;
      }

      model RelationshipOriginInformation<TOrigin = string> {
        relationshipOriginType: TOrigin;
      }

      op test(): DependencyOfRelationshipProperties;
      `);
      const models = runner.context.sdkPackage.models;
      strictEqual(models.length, 2);
      const model = models.filter(
        (x) => x.name === "RelationshipOriginInformationDependencyOfOrigins",
      )[0];
      ok(model);
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
        strictEqual(models[0].name, "TestRequest");
        strictEqual(models[0].crossLanguageDefinitionId, "TestService.test.Request.anonymous");
        ok(models[0].isGeneratedName);
      });

      it("should handle anonymous model used by operation response", async () => {
        await runner.compileWithBuiltInService(`
          op test(): {name: string};
        `);
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 1);
        strictEqual(models[0].name, "TestResponse");
        strictEqual(models[0].crossLanguageDefinitionId, "TestService.test.Response.anonymous");
        ok(models[0].isGeneratedName);
      });

      it("should handle anonymous model in both body and response", async () => {
        await runner.compileWithBuiltInService(`
          op test(@body body: {name: string}): {name: string};
        `);
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 2);
        ok(
          models.find(
            (x) =>
              x.name === "TestRequest" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.test.Request.anonymous",
          ),
        );
        ok(
          models.find(
            (x) =>
              x.name === "TestResponse" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.test.Response.anonymous",
          ),
        );
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
        ok(
          models.find(
            (x) =>
              x.name === "APForA" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.A.pForA.anonymous",
          ),
        );
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
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 2);
        ok(
          models.find(
            (x) =>
              x.name === "APForA" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.A.pForA.anonymous",
          ),
        );
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
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 2);
        ok(
          models.find(
            (x) =>
              x.name === "APForA" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.A.pForA.anonymous",
          ),
        );
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
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 2);
        ok(
          models.find(
            (x) =>
              x.name === "AMember" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.A.member.anonymous",
          ),
        );
      });

      it("should handle anonymous model array used by operation body", async () => {
        await runner.compileWithBuiltInService(
          `
          op test(@body body: {name: string}[]): void;
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 1);
        strictEqual(models[0].name, "TestRequest");
        strictEqual(models[0].crossLanguageDefinitionId, "TestService.test.Request.anonymous");
        ok(models[0].isGeneratedName);
      });

      it("should handle anonymous model dictionary used by operation body", async () => {
        await runner.compileWithBuiltInService(
          `
          op test(@body body: Record<{name: string}>): void;
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 1);
        strictEqual(models[0].name, "TestRequest");
        strictEqual(models[0].crossLanguageDefinitionId, "TestService.test.Request.anonymous");
        ok(models[0].isGeneratedName);
      });

      it("should handle anonymous model dictionary used by model", async () => {
        await runner.compileWithBuiltInService(
          `
          model A {
            members: Record<{name: {value: string}}>;
          }
          op test(@body body: A): void;
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 3);
        ok(
          models.find(
            (x) =>
              x.name === "AMember" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.A.member.anonymous",
          ),
        );
        ok(
          models.find(
            (x) =>
              x.name === "AMemberName" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.A.member.name.anonymous",
          ),
        );
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
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 3);
        ok(
          models.find(
            (x) =>
              x.name === "BPForB" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.B.pForB.anonymous",
          ),
        );
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
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 5);
        ok(
          models.find(
            (x) =>
              x.name === "SharkPForShark" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.Shark.pForShark.anonymous",
          ),
        );
        ok(
          models.find(
            (x) =>
              x.name === "SalmonPForSalmon" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.Salmon.pForSalmon.anonymous",
          ),
        );
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
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 3);
        ok(
          models.find(
            (x) =>
              x.name === "BPForB" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.B.pForB.anonymous",
          ),
        );
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
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 4);
        ok(
          models.find(
            (x) =>
              x.name === "CP1ForC" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.C.p1ForC.anonymous",
          ),
        );
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
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 3);
        ok(
          models.find(
            (x) =>
              x.name === "BP2ForB" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.B.p2ForB.anonymous",
          ),
        );
      });

      it("should handle additional properties type", async () => {
        await runner.compileWithBuiltInService(
          `
          model A {
            ...Record<{name: string}>;
          }

          op test(@body body: A): void;
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 2);
        ok(
          models.find(
            (x) =>
              x.name === "AAdditionalProperty" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.A.AdditionalProperty.anonymous",
          ),
        );
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
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 3);
        ok(
          models.find(
            (x) =>
              x.name === "APForA" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.A.pForA.anonymous",
          ),
        );
        ok(
          models.find(
            (x) =>
              x.name === "APForAPForAnonymousModel" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.A.pForA.pForAnonymousModel.anonymous",
          ),
        );
      });

      it("should recursively handle dict of anonymous model", async () => {
        await runner.compileWithBuiltInService(
          `
          model A {
            pForA: Record<{name: {value: string}}>;
          }
          op test(@body body: A): void;
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 3);
        ok(
          models.find(
            (x) =>
              x.name === "APForA" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.A.pForA.anonymous",
          ),
        );
        ok(
          models.find(
            (x) =>
              x.name === "APForAName" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.A.pForA.name.anonymous",
          ),
        );
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
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 2);
        ok(
          models.find(
            (x) =>
              x.name === "AB" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.A.b.anonymous",
          ),
        );
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
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 1);
        const unionEnum = models[0].properties[0].type;
        strictEqual(unionEnum.kind, "enum");
        strictEqual(unionEnum.name, "AStatus");
        ok(unionEnum.isGeneratedName);
        strictEqual(unionEnum.crossLanguageDefinitionId, "A.status.anonymous");
        strictEqual(models[0].kind, "model");
        const statusProp = models[0].properties[0];
        strictEqual(statusProp.kind, "property");
        strictEqual(statusProp.type.kind, "enum");
        strictEqual(statusProp.type.values.length, 2);
        const startVal = statusProp.type.values.find((x) => x.name === "start");
        ok(startVal);
        strictEqual(startVal.kind, "enumvalue");
        strictEqual(startVal.valueType.kind, "string");

        const stopVal = statusProp.type.values.find((x) => x.name === "stop");
        ok(stopVal);
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
        `,
        );
        const models = runner.context.sdkPackage.models;
        const diagnostics = runner.context.diagnostics;
        ok(diagnostics);
        strictEqual(models.length, 4);
        const union = models[0].properties[0].type;
        strictEqual(union.kind, "union");
        strictEqual(union.name, "AItems");
        ok(union.isGeneratedName);
        const model1 = union.variantTypes[0];
        strictEqual(model1.kind, "model");
        strictEqual(model1.name, "AItems1");
        ok(model1.isGeneratedName);
        const model2 = union.variantTypes[1];
        strictEqual(model2.kind, "model");
        strictEqual(model2.name, "AItems2");
        ok(model2.isGeneratedName);
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
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 2);
        const test1 = models.find(
          (x) =>
            x.name === "AChoice" &&
            x.isGeneratedName &&
            x.crossLanguageDefinitionId === "TestService.A.choice.anonymous",
        );
        ok(test1);
        strictEqual(test1.properties[0].type.kind, "enum");
        const unionEnum = test1.properties[0].type;
        strictEqual(unionEnum.name, "AChoiceStatus");
        ok(unionEnum.isGeneratedName);
        strictEqual(unionEnum.crossLanguageDefinitionId, "A.choice.status.anonymous");
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
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 3);
        ok(
          models.find(
            (x) =>
              x.name === "BPForB" &&
              x.isGeneratedName &&
              x.crossLanguageDefinitionId === "TestService.B.pForB.anonymous",
          ),
        );
      });
    });

    describe("orphan model with anonymous model", () => {
      it("model", async () => {
        await runner.compileWithBuiltInService(
          `
          @usage(Usage.input | Usage.output)
          model A {
            pForA: {
              name: string;
            };
          }
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 2);
        strictEqual(models[0].properties[0].crossLanguageDefinitionId, "TestService.A.pForA");
        const propType = models[0].properties[0].type;
        strictEqual(propType.kind, "model");
        strictEqual(propType.name, "APForA");
        ok(propType.isGeneratedName);
        // not a defined type in tsp, so no crossLanguageDefinitionId
        strictEqual(propType.crossLanguageDefinitionId, "TestService.A.pForA.anonymous");
        const nameProp = propType.properties[0];
        strictEqual(nameProp.kind, "property");
        strictEqual(nameProp.name, "name");
        strictEqual(nameProp.type.kind, "string");
        strictEqual(nameProp.crossLanguageDefinitionId, "TestService.A.pForA.anonymous.name");
      });

      it("union", async () => {
        await runner.compileWithBuiltInService(
          `
          @usage(Usage.input | Usage.output)
          model A {
            status: "start" | "stop";
          }
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 1);
        const unionEnum = models[0].properties[0].type;
        strictEqual(unionEnum.kind, "enum");
        strictEqual(unionEnum.name, "AStatus");
        ok(unionEnum.isGeneratedName);
        // not a defined type in tsp, so no crossLanguageDefinitionId
        strictEqual(unionEnum.crossLanguageDefinitionId, "A.status.anonymous");
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
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 1);
        strictEqual(models[0].name, "TestRequest");
        strictEqual(models[0].usage, UsageFlags.Spread | UsageFlags.Json);
      });

      it("anonymous model for body parameter", async () => {
        await runner.compileWithBuiltInService(
          `
          op test(foo: string, bar: string): void;
        `,
        );
        const models = runner.context.sdkPackage.models;
        strictEqual(models.length, 1);
        strictEqual(models[0].name, "TestRequest");
        strictEqual(models[0].usage, UsageFlags.Spread | UsageFlags.Json);
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

        strictEqual(repeatabilityResult.type.kind, "Union");
        const unionEnum = getSdkUnion(runner.context, repeatabilityResult.type);
        strictEqual(unionEnum.kind, "enum");
        strictEqual(unionEnum.name, "TestResponseRepeatabilityResult");
        // not a defined type in tsp, so no crossLanguageDefinitionId
        strictEqual(
          unionEnum.crossLanguageDefinitionId,
          "test.ResponseRepeatabilityResult.anonymous",
        );
        ok(unionEnum.isGeneratedName);
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

        strictEqual(repeatabilityResult.type.kind, "Union");
        const unionEnum = getSdkUnion(runner.context, repeatabilityResult.type);
        strictEqual(unionEnum.kind, "enum");
        strictEqual(unionEnum.name, "TestRequestRepeatabilityResult");
        // not a defined type in tsp, so no crossLanguageDefinitionId
        strictEqual(
          unionEnum.crossLanguageDefinitionId,
          "test.RequestRepeatabilityResult.anonymous",
        );
        ok(unionEnum.isGeneratedName);
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

        strictEqual(repeatabilityResult.type.kind, "Union");
        const stringType = getSdkUnion(runner.context, repeatabilityResult.type);
        strictEqual(stringType.kind, "enum");
        strictEqual(stringType.values.length, 2);
        strictEqual(stringType.values[0].kind, "enumvalue");
        strictEqual(stringType.values[0].value, "accepted");
        strictEqual(stringType.values[1].kind, "enumvalue");
        strictEqual(stringType.values[1].value, "rejected");
        strictEqual(stringType.valueType.kind, "string");
        strictEqual(stringType.name, "TestRequestRepeatabilityResult");
        strictEqual(stringType.isGeneratedName, true);
        strictEqual(
          stringType.crossLanguageDefinitionId,
          "test.RequestRepeatabilityResult.anonymous",
        );
      });

      it("anonymous model naming in multi layer operation group", async () => {
        const { TestModel } = (await runner.compile(`
        @service({})
        namespace MyService {
          namespace Test {
            namespace InnerTest {
              @test
              model TestModel {
                anonymousProp: {prop: string}
              }
              op test(): TestModel;
            }
          }
        }
        `)) as { TestModel: Model };

        runner.context.generatedNames?.clear();
        const name = getGeneratedName(
          runner.context,
          [...TestModel.properties.values()][0].type as Model,
        );
        strictEqual(name, "TestModelAnonymousProp");
      });

      it("anonymous model in response", async () => {
        const { test } = (await runner.compile(`
        @service({})
        namespace MyService {
          @test
          op test(): {@header header: string, prop: string};
        }
        `)) as { test: Operation };

        const httpOperation = getHttpOperationWithCache(runner.context, test);
        const name = getGeneratedName(
          runner.context,
          httpOperation.responses[0].responses[0].body?.type as Model,
        );
        strictEqual(name, "TestResponse");
      });
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
      const models = runnerWithCore.context.sdkPackage.models.filter((x) => !isAzureCoreModel(x));
      strictEqual(models.length, 1);
      deepStrictEqual(models[0].name, "ExportedUser");
    });
    it("filter-out-core-models false", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core", "Azure.Core.Traits"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithCore.compile(lroCode);
      const models = getAllModels(runnerWithCore.context);
      strictEqual(models.length, 8);
      // there should only be one non-core model
      deepStrictEqual(
        models.map((x) => x.name).sort(),
        [
          "ResourceOperationStatusUserExportedUserError",
          "OperationState",
          "Error",
          "InnerError",
          "ExportedUser",
          "ErrorResponse",
          "OperationStatusExportedUserError",
          "Versions",
        ].sort(),
      );
    });
  });
});
