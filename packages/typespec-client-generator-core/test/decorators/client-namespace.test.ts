import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkClientType, SdkServiceOperation } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

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
        op test(): void;
      }
      `,
    );
    strictEqual(
      (runner.context.sdkPackage.clients[0].children![0] as SdkClientType<SdkServiceOperation>)
        .namespace,
      "TestService.Inner",
    );
  });

  it("namespace on interface", async () => {
    await runner.compileWithBuiltInService(
      `
      interface Inner {
        op test(): void;
      }
      `,
    );
    strictEqual(
      (runner.context.sdkPackage.clients[0].children![0] as SdkClientType<SdkServiceOperation>)
        .namespace,
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
        op test(): void;
      }

      @@clientNamespace(Inner, "MyNamespace");
      `,
    );
    strictEqual(
      (runner.context.sdkPackage.clients[0].children![0] as SdkClientType<SdkServiceOperation>)
        .namespace,
      "MyNamespace",
    );
  });

  it("namespace override on interface", async () => {
    await runner.compileWithBuiltInService(
      `
      interface Inner {
        op test(): void;
      }

      @@clientNamespace(Inner, "MyNamespace");
      `,
    );
    strictEqual(
      (runner.context.sdkPackage.clients[0].children![0] as SdkClientType<SdkServiceOperation>)
        .namespace,
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
      (runner.context.sdkPackage.clients[0].children![0] as SdkClientType<SdkServiceOperation>)
        .namespace,
      "MyNamespace",
    ); // Inner namespace with override
    strictEqual(
      (
        (runner.context.sdkPackage.clients[0].children![0] as SdkClientType<SdkServiceOperation>)
          .children![0] as SdkClientType<SdkServiceOperation>
      ).namespace,
      "MyNamespace.Test",
    ); // Test namespace affected by Inner namespace override
    strictEqual(runner.context.sdkPackage.models[0].namespace, "MyNamespace");
    strictEqual(runner.context.sdkPackage.models[1].namespace, "MyNamespace.Test");
  });
});
