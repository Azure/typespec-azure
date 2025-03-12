import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkClientType, SdkServiceOperation } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: @clientNamespace", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  describe("normal namespace", () => {
    it("namespace on model", async () => {
      await runner.compileWithBuiltInService(
        `
      model Test {
        prop: string;
      }

      op test(): Test;
      `,
      );
      strictEqual(runner.context.sdkPackage.models[0].namespace, "TestService");
    });

    it("namespace on anonymous model", async () => {
      await runner.compileWithBuiltInService(`
        model Test {
          prop: {
            p1: string;
            p2: int32;
          }
        }
        
        op test(): Test;
        `);

      const models = runner.context.sdkPackage.models;
      const testModel = models.find((m) => m.name === "Test");
      ok(testModel);
      const anonymousModel = testModel?.properties[0].type;
      ok(anonymousModel);
      strictEqual(anonymousModel.kind, "model");
      strictEqual(anonymousModel.clientNamespace, "TestService");
    });

    it("namespace on alias", async () => {
      await runner.compileWithBuiltInService(
        `
      alias Test = {
        prop: string;
      };

      op test(): Test;
      `,
      );
      strictEqual(runner.context.sdkPackage.models[0].clientNamespace, "TestService");
    });

    it("namespace on enum", async () => {
      await runner.compileWithBuiltInService(
        `
      enum Test {
        A
      }

      op test(): Test;
      `,
      );
      strictEqual(runner.context.sdkPackage.enums[0].namespace, "TestService");
    });

    it("namespace on anonymous response in a template", async () => {
      runner = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core", "Azure.Core.Traits"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runner.compileWithBuiltInAzureCoreService(`
          alias ServiceTraits = SupportsRepeatableRequests &
          SupportsConditionalRequests &
          SupportsClientRequestId;
          
          @route("service-status")
          op getServiceStatus is RpcOperation<
            {},
            {
              statusString: string;
            },
            ServiceTraits
          >;
        `);

      const method = runner.context.sdkPackage.clients[0].methods[0];
      strictEqual(method.kind, "basic");
      const responseType = method.response.type;
      ok(responseType);
      strictEqual(responseType.kind, "model");
      // TODO -- this is currently empty which might be an issue, tracking in @typespec/http library issue https://github.com/microsoft/typespec/issues/5664
      strictEqual(responseType.clientNamespace, "");
    });

    it("namespace on concrete response in a template", async () => {
      runner = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core", "Azure.Core.Traits"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runner.compileWithBuiltInAzureCoreService(`
          alias ServiceTraits = SupportsRepeatableRequests &
          SupportsConditionalRequests &
          SupportsClientRequestId;

          model ServiceStatus {
            statusString: string;
          }
          
          @route("service-status")
          op getServiceStatus is RpcOperation<
            {},
            ServiceStatus,
            ServiceTraits
          >;
        `);

      const method = runner.context.sdkPackage.clients[0].methods[0];
      strictEqual(method.kind, "basic");
      const responseType = method.response.type;
      ok(responseType);
      strictEqual(responseType.kind, "model");
      strictEqual(responseType.clientNamespace, "My.Service");
    });

    it("namespace on union", async () => {
      await runner.compileWithBuiltInService(
        `
      union Test {
        string, int32
      }

      op test(param: Test): void;
      `,
      );
      strictEqual(runner.context.sdkPackage.unions[0].namespace, "TestService");
    });

    it("namespace on union as enum", async () => {
      await runner.compileWithBuiltInService(
        `
      union Test {
        "A", "B"
      }

      op test(param: Test): void;
      `,
      );
      strictEqual(runner.context.sdkPackage.enums[0].namespace, "TestService");
    });

    it("namespace on union with null", async () => {
      await runner.compileWithBuiltInService(
        `
      union Test {
        string, null
      }

      op test(param: Test): void;
      `,
      );
      strictEqual(runner.context.sdkPackage.unions[0].namespace, "TestService");
    });

    it("namespace on namespace", async () => {
      await runner.compileWithBuiltInService(
        `
      namespace Inner {
      }
      `,
      );
      strictEqual(
        (
          runner.context.sdkPackage.clients[0].methods[0]
            .response as SdkClientType<SdkServiceOperation>
        ).namespace,
        "TestService.Inner",
      );
    });

    it("namespace on interface", async () => {
      await runner.compileWithBuiltInService(
        `
      interface Inner {
      }
      `,
      );
      strictEqual(
        (
          runner.context.sdkPackage.clients[0].methods[0]
            .response as SdkClientType<SdkServiceOperation>
        ).namespace,
        "TestService",
      );
    });
  });

  describe("namespace override", () => {
    it("namespace override on model", async () => {
      await runner.compileWithBuiltInService(
        `
      @clientNamespace("MyNamespace")
      model Test {
        prop: string;
      }

      op test(): Test;
      `,
      );
      strictEqual(runner.context.sdkPackage.models[0].namespace, "MyNamespace");
    });

    it("namespace override on enum", async () => {
      await runner.compileWithBuiltInService(
        `
      @clientNamespace("MyNamespace")
      enum Test {
        A
      }

      op test(): Test;
      `,
      );
      strictEqual(runner.context.sdkPackage.enums[0].namespace, "MyNamespace");
    });

    it("namespace override on union", async () => {
      await runner.compileWithBuiltInService(
        `
      @clientNamespace("MyNamespace")
      union Test {
        string, int32
      }

      op test(param: Test): void;
      `,
      );
      strictEqual(runner.context.sdkPackage.unions[0].namespace, "MyNamespace");
    });

    it("namespace override on union as enum", async () => {
      await runner.compileWithBuiltInService(
        `
      @clientNamespace("MyNamespace")
      union Test {
        "A", "B"
      }

      op test(param: Test): void;
      `,
      );
      strictEqual(runner.context.sdkPackage.enums[0].namespace, "MyNamespace");
    });

    it("namespace override on union with null", async () => {
      await runner.compileWithBuiltInService(
        `
      @clientNamespace("MyNamespace")
      union Test {
        string, null
      }

      op test(param: Test): void;
      `,
      );
      strictEqual(runner.context.sdkPackage.unions[0].namespace, "MyNamespace");
    });

    it("namespace override on namespace", async () => {
      await runner.compileWithBuiltInService(
        `
      namespace Inner {
      }

      @@clientNamespace(Inner, "MyNamespace");
      `,
      );
      strictEqual(
        (
          runner.context.sdkPackage.clients[0].methods[0]
            .response as SdkClientType<SdkServiceOperation>
        ).namespace,
        "MyNamespace",
      );
    });

    it("namespace override on interface", async () => {
      await runner.compileWithBuiltInService(
        `
      interface Inner {
      }

      @@clientNamespace(Inner, "MyNamespace");
      `,
      );
      strictEqual(
        (
          runner.context.sdkPackage.clients[0].methods[0]
            .response as SdkClientType<SdkServiceOperation>
        ).namespace,
        "MyNamespace",
      );
    });

    it("namespace override propagation", async () => {
      await runner.compileWithBuiltInService(
        `
      namespace Inner {
        model Baz {
          prop: string;
        }
        
        namespace Test {
          model Foo {
            prop: string;
          }

          op bar(@body body: Baz): Foo;
        }
      }

      @@clientNamespace(Inner, "MyNamespace");
      `,
      );
      strictEqual(runner.context.sdkPackage.clients[0].namespace, "TestService"); // root namespace
      strictEqual(
        (
          runner.context.sdkPackage.clients[0].methods[0]
            .response as SdkClientType<SdkServiceOperation>
        ).namespace,
        "MyNamespace",
      ); // Inner namespace with override
      strictEqual(
        (
          (
            runner.context.sdkPackage.clients[0].methods[0]
              .response as SdkClientType<SdkServiceOperation>
          ).methods[0].response as SdkClientType<SdkServiceOperation>
        ).namespace,
        "MyNamespace.Test",
      ); // Test namespace affected by Inner namespace override
      strictEqual(runner.context.sdkPackage.models[0].namespace, "MyNamespace");
      strictEqual(runner.context.sdkPackage.models[1].namespace, "MyNamespace.Test");
    });
  });
});
