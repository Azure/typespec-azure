import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { it } from "vitest";
import { SdkHttpOperation, SdkServiceMethod } from "../../src/interfaces.js";
import {
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
  SimpleTester,
} from "../tester.js";

it("example config", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile("./examples/get.json", `${__dirname}/load/get.json`);
  const { program } = await instance.compile(`
    @service
    namespace TestClient {
      op get(): string;
    }
  `);
  const context = await createSdkContextForTester(program);

  const operation = (context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>)
    .operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  strictEqual(operation.examples![0].filePath, "get.json");
});

it("example default config", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile("./examples/get.json", `${__dirname}/load/get.json`);
  const { program } = await instance.compile(`
    @service
    namespace TestClient {
      op get(): string;
    }
  `);
  const context = await createSdkContextForTester(program);

  const operation = (context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>)
    .operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  strictEqual(operation.examples![0].filePath, "get.json");
});

it("no example folder found", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    namespace TestClient {
      op get(): string;
    }
  `);
  const context = await createSdkContextForTester(program, {
    "examples-dir": "./examples",
  });

  expectDiagnostics(context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/example-loading",
  });
});

it("load example without version", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile("./examples/get.json", `${__dirname}/load/get.json`);
  const { program } = await instance.compile(`
    @service
    namespace TestClient {
      op get(): string;
    }
  `);
  const context = await createSdkContextForTester(program);

  const operation = (context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>)
    .operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  strictEqual(operation.examples![0].filePath, "get.json");
});

it("load example with version", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile("./examples/v3/get.json", `${__dirname}/load/get.json`);
  const { program } = await instance.compile(`
    @service
    @versioned(Versions)
    namespace TestClient {
      op get(): string;
    }

    enum Versions {
      v1,
      v2,
      v3,
    }
  `);
  const context = await createSdkContextForTester(program);

  const operation = (context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>)
    .operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  strictEqual(operation.examples![0].filePath, "v3/get.json");
});

it("load multiple example for one operation", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile("./examples/get.json", `${__dirname}/load/get.json`);
  await instance.fs.addRealTypeSpecFile(
    "./examples/getAnother.json",
    `${__dirname}/load/getAnother.json`,
  );
  const { program } = await instance.compile(`
    @service
    namespace TestClient {
      op get(): string;
    }
  `);
  const context = await createSdkContextForTester(program);

  const operation = (context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>)
    .operation;
  ok(operation);
  strictEqual(operation.examples?.length, 2);
  strictEqual(operation.examples![0].filePath, "get.json");
  strictEqual(operation.examples![1].filePath, "getAnother.json");
});

it("load example with client customization", async () => {
  const instance = await SimpleBaseTester.createInstance();
  await instance.fs.addRealTypeSpecFile("./examples/get.json", `${__dirname}/load/get.json`);
  const { program } = await instance.compile(
    createClientCustomizationInput(
      `
      @service
      namespace TestClient {
        op get(): string;
      }
    `,
      `
      @client({
        name: "FooClient",
        service: TestClient
      })
      namespace Customizations {
        op test is TestClient.get;
      }
    `,
    ),
  );
  const context = await createSdkContextForTester(program);

  const client = context.sdkPackage.clients[0];
  strictEqual(client.name, "FooClient");
  const method = client.methods[0] as SdkServiceMethod<SdkHttpOperation>;
  ok(method);
  strictEqual(method.name, "test");
  const operation = method.operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
});

it("load multiple example with @clientName", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile(
    "./examples/clientName.json",
    `${__dirname}/load/clientName.json`,
  );
  await instance.fs.addRealTypeSpecFile(
    "./examples/clientNameAnother.json",
    `${__dirname}/load/clientNameAnother.json`,
  );
  const { program } = await instance.compile(`
    @service
    namespace TestClient {
      @clientName("renamedNS")
      namespace NS {
        @route("/ns")
        @clientName("renamedOP")
        op get(): string;
      }

      @clientName("renamedIF")
      namespace IF {
        @route("/if")
        @clientName("renamedOP")
        op get(): string;
      }
    }
  `);
  const context = await createSdkContextForTester(program);

  const mainClient = context.sdkPackage.clients[0];

  const nsClient = mainClient.children?.find((client) => client.name === "renamedNS");
  ok(nsClient);
  const operation1 = (nsClient.methods[0] as SdkServiceMethod<SdkHttpOperation>).operation;
  ok(operation1);
  strictEqual(operation1.examples?.length, 1);

  const ifClient = mainClient.children?.find((client) => client.name === "renamedIF");
  ok(ifClient);
  const operation2 = (ifClient.methods[0] as SdkServiceMethod<SdkHttpOperation>).operation;
  ok(operation2);
  strictEqual(operation2.examples?.length, 1);
});

it("load multiple example of original operation id with @clientName", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile(
    "./examples/clientNameOriginal.json",
    `${__dirname}/load/clientNameOriginal.json`,
  );
  await instance.fs.addRealTypeSpecFile(
    "./examples/clientNameAnotherOriginal.json",
    `${__dirname}/load/clientNameAnotherOriginal.json`,
  );
  const { program } = await instance.compile(`
    @service
    namespace TestClient {
      @clientName("renamedNS")
      namespace NS {
        @route("/ns")
        @clientName("renamedOP")
        op get(): string;
      }

      @clientName("renamedIF")
      namespace IF {
        @route("/if")
        @clientName("renamedOP")
        op get(): string;
      }
    }
  `);
  const context = await createSdkContextForTester(program);

  const mainClient = context.sdkPackage.clients[0];

  const nsClient = mainClient.children?.find((client) => client.name === "renamedNS");
  ok(nsClient);
  const operation1 = (nsClient.methods[0] as SdkServiceMethod<SdkHttpOperation>).operation;
  ok(operation1);
  strictEqual(operation1.examples?.length, 1);

  const ifClient = mainClient.children?.find((client) => client.name === "renamedIF");
  ok(ifClient);
  const operation2 = (ifClient.methods[0] as SdkServiceMethod<SdkHttpOperation>).operation;
  ok(operation2);
  strictEqual(operation2.examples?.length, 1);
});

it("ensure ordering for multiple examples", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile("./examples/a_b_c.json", `${__dirname}/load/a_b_c.json`);
  await instance.fs.addRealTypeSpecFile("./examples/a_b.json", `${__dirname}/load/a_b.json`);
  await instance.fs.addRealTypeSpecFile("./examples/a.json", `${__dirname}/load/a.json`);
  const { program } = await instance.compile(`
    @service
    namespace TestClient {
      op get(): string;
    }
  `);
  const context = await createSdkContextForTester(program);

  const operation = (context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>)
    .operation;
  ok(operation);
  strictEqual(operation.examples?.length, 3);
  strictEqual(operation.examples![0].filePath, "a.json");
  strictEqual(operation.examples![1].filePath, "a_b.json");
  strictEqual(operation.examples![2].filePath, "a_b_c.json");
});

it("load example with @clientLocation existed interface", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile(
    "./examples/clientLocationAnotherInterface.json",
    `${__dirname}/load/clientLocationAnotherInterface.json`,
  );
  const { program } = await instance.compile(`
    @service
    namespace TestClient {
      interface OriginalInterface {
        @clientLocation(AnotherInterface)
        op clientLocation(): string;
      }

      interface AnotherInterface {
      }
    }
  `);
  const context = await createSdkContextForTester(program);

  const mainClient = context.sdkPackage.clients[0];

  const client = mainClient.children?.find((client) => client.name === "AnotherInterface");
  ok(client);
  const operation = (client.methods[0] as SdkServiceMethod<SdkHttpOperation>).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
});

it("load example with @clientLocation new operation group", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile(
    "./examples/clientLocationNewOperationGroup.json",
    `${__dirname}/load/clientLocationNewOperationGroup.json`,
  );
  const { program } = await instance.compile(`
    @service
    namespace TestClient {
      interface OriginalInterface {
        @clientLocation("NewOperationGroup")
        op clientLocation(): string;
      }
    }
  `);
  const context = await createSdkContextForTester(program);

  const mainClient = context.sdkPackage.clients[0];

  const client = mainClient.children?.find((client) => client.name === "NewOperationGroup");
  ok(client);
  const operation = (client.methods[0] as SdkServiceMethod<SdkHttpOperation>).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
});

it("load example with @clientLocation root client", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile(
    "./examples/clientLocationRootClient.json",
    `${__dirname}/load/clientLocationRootClient.json`,
  );
  const { program } = await instance.compile(`
    @service
    namespace TestClient {
      interface OriginalInterface {
        @clientLocation(TestClient)
        op clientLocation(): string;
      }
    }
  `);
  const context = await createSdkContextForTester(program);

  const mainClient = context.sdkPackage.clients[0];
  const operation = (mainClient.methods[0] as SdkServiceMethod<SdkHttpOperation>).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
});

it("nested examples", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile("./examples/nested/get.json", `${__dirname}/load/get.json`);
  const { program } = await instance.compile(`
    @service
    namespace TestClient {
      op get(): string;
    }
  `);
  const context = await createSdkContextForTester(program);

  const operation = (context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>)
    .operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  strictEqual(operation.examples![0].filePath, "nested/get.json");
});

it("teamplate case", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile(
    "./examples/template.json",
    `${__dirname}/load/template.json`,
  );
  const { program } = await instance.compile(`
    @service
    namespace TestClient {
      interface CommonOps<ReturnType extends TypeSpec.Reflection.Model> {
        get(): ReturnType;
      }
      
      model TestModel {
        prop: string;
      }

      interface TestGroup extends CommonOps<TestModel> {}
    }
  `);
  const context = await createSdkContextForTester(program);

  const operation = (
    context.sdkPackage.clients[0].children?.[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  strictEqual(operation.examples![0].filePath, "template.json");
});

it("multiple services without versioning", async () => {
  const instance = await SimpleBaseTester.createInstance();
  await instance.fs.addRealTypeSpecFile(
    "./ServiceA/examples/AI_aTest.json",
    `${__dirname}/multi-service/ServiceA_AI_aTest.json`,
  );
  await instance.fs.addRealTypeSpecFile(
    "./ServiceB/examples/BI_bTest.json",
    `${__dirname}/multi-service/ServiceB_BI_bTest.json`,
  );

  const { program } = await instance.compile(
    createClientCustomizationInput(
      `
      @service
      namespace ServiceA {
        interface AI {
          @route("/aTest")
          aTest(): string;
        }
      }
      @service
      namespace ServiceB {
        interface BI {
          @route("/bTest")
          bTest(): string;
        }
      }
    `,
      `
      @client({
        name: "CombineClient",
        service: [ServiceA, ServiceB],
      })
      namespace CombineClient {}
    `,
    ),
  );
  const context = await createSdkContextForTester(program);

  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "CombineClient");
  strictEqual(client.children?.length, 2);

  // Check AI operation group examples
  const aiClient = client.children?.find((c) => c.name === "AI");
  ok(aiClient);
  const aiMethod = aiClient.methods[0] as SdkServiceMethod<SdkHttpOperation>;
  ok(aiMethod.operation.examples);
  strictEqual(aiMethod.operation.examples.length, 1);
  strictEqual(aiMethod.operation.examples[0].filePath, "AI_aTest.json");
  strictEqual(aiMethod.operation.examples[0].name, "Test operation from ServiceA");

  // Check BI operation group examples
  const biClient = client.children?.find((c) => c.name === "BI");
  ok(biClient);
  const biMethod = biClient.methods[0] as SdkServiceMethod<SdkHttpOperation>;
  ok(biMethod.operation.examples);
  strictEqual(biMethod.operation.examples.length, 1);
  strictEqual(biMethod.operation.examples[0].filePath, "BI_bTest.json");
  strictEqual(biMethod.operation.examples[0].name, "Test operation from ServiceB");
});

it("multiple services without examples", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      `
      @service
      namespace ServiceA {
        interface AI {
          @route("/aTest")
          aTest(): string;
        }
      }
      @service
      namespace ServiceB {
        interface BI {
          @route("/bTest")
          bTest(): string;
        }
      }
    `,
      `
      @client({
        name: "CombineClient",
        service: [ServiceA, ServiceB],
      })
      namespace CombineClient {}
    `,
    ),
  );
  const context = await createSdkContextForTester(program);

  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "CombineClient");
  strictEqual(client.children?.length, 2);

  // Check AI operation group examples
  const aiClient = client.children?.find((c) => c.name === "AI");
  ok(aiClient);
  const aiMethod = aiClient.methods[0] as SdkServiceMethod<SdkHttpOperation>;
  strictEqual(aiMethod.operation.examples, undefined);

  // Check BI operation group examples
  const biClient = client.children?.find((c) => c.name === "BI");
  ok(biClient);
  const biMethod = biClient.methods[0] as SdkServiceMethod<SdkHttpOperation>;
  strictEqual(biMethod.operation.examples, undefined);
});
