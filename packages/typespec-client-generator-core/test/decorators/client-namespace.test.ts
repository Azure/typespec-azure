import { strictEqual } from "assert";
import { describe, it } from "vitest";
import { SdkClientType, SdkServiceOperation } from "../../src/interfaces.js";
import { createSdkContextForTester, SimpleTesterWithService } from "../tester.js";

describe("normal namespace", () => {
  it("namespace on model", async () => {
    const { program } = await SimpleTesterWithService.compile(
      `
      model Test {
        prop: string;
      }

      op test(): Test;
      `,
    );
    const context = await createSdkContextForTester(program);
    strictEqual(context.sdkPackage.models[0].namespace, "TestService");
  });

  it("namespace on enum", async () => {
    const { program } = await SimpleTesterWithService.compile(
      `
      enum Test {
        A
      }

      op test(): Test;
      `,
    );
    const context = await createSdkContextForTester(program);
    strictEqual(context.sdkPackage.enums[0].namespace, "TestService");
  });

  it("namespace on union", async () => {
    const { program } = await SimpleTesterWithService.compile(
      `
      union Test {
        string, int32
      }

      op test(param: Test): void;
      `,
    );
    const context = await createSdkContextForTester(program);
    strictEqual(context.sdkPackage.unions[0].namespace, "TestService");
  });

  it("namespace on union as enum", async () => {
    const { program } = await SimpleTesterWithService.compile(
      `
      union Test {
        "A", "B"
      }

      op test(param: Test): void;
      `,
    );
    const context = await createSdkContextForTester(program);
    strictEqual(context.sdkPackage.enums[0].namespace, "TestService");
  });

  it("namespace on union with null", async () => {
    const { program } = await SimpleTesterWithService.compile(
      `
      union Test {
        string, null
      }

      op test(param: Test): void;
      `,
    );
    const context = await createSdkContextForTester(program);
    strictEqual(context.sdkPackage.unions[0].namespace, "TestService");
  });

  it("namespace on namespace", async () => {
    const { program } = await SimpleTesterWithService.compile(
      `
      namespace Inner {
        op test(): void;
      }
      `,
    );
    const context = await createSdkContextForTester(program);
    strictEqual(
      (context.sdkPackage.clients[0].children![0] as SdkClientType<SdkServiceOperation>).namespace,
      "TestService.Inner",
    );
  });

  it("namespace on interface", async () => {
    const { program } = await SimpleTesterWithService.compile(
      `
      interface Inner {
        op test(): void;
      }
      `,
    );
    const context = await createSdkContextForTester(program);
    strictEqual(
      (context.sdkPackage.clients[0].children![0] as SdkClientType<SdkServiceOperation>).namespace,
      "TestService",
    );
  });
});

describe("namespace override", () => {
  it("namespace override on model", async () => {
    const { program } = await SimpleTesterWithService.compile(
      `
      @clientNamespace("MyNamespace")
      model Test {
        prop: string;
      }

      op test(): Test;
      `,
    );
    const context = await createSdkContextForTester(program);
    strictEqual(context.sdkPackage.models[0].namespace, "MyNamespace");
  });

  it("namespace override on enum", async () => {
    const { program } = await SimpleTesterWithService.compile(
      `
      @clientNamespace("MyNamespace")
      enum Test {
        A
      }

      op test(): Test;
      `,
    );
    const context = await createSdkContextForTester(program);
    strictEqual(context.sdkPackage.enums[0].namespace, "MyNamespace");
  });

  it("namespace override on union", async () => {
    const { program } = await SimpleTesterWithService.compile(
      `
      @clientNamespace("MyNamespace")
      union Test {
        string, int32
      }

      op test(param: Test): void;
      `,
    );
    const context = await createSdkContextForTester(program);
    strictEqual(context.sdkPackage.unions[0].namespace, "MyNamespace");
  });

  it("namespace override on union as enum", async () => {
    const { program } = await SimpleTesterWithService.compile(
      `
      @clientNamespace("MyNamespace")
      union Test {
        "A", "B"
      }

      op test(param: Test): void;
      `,
    );
    const context = await createSdkContextForTester(program);
    strictEqual(context.sdkPackage.enums[0].namespace, "MyNamespace");
  });

  it("namespace override on union with null", async () => {
    const { program } = await SimpleTesterWithService.compile(
      `
      @clientNamespace("MyNamespace")
      union Test {
        string, null
      }

      op test(param: Test): void;
      `,
    );
    const context = await createSdkContextForTester(program);
    strictEqual(context.sdkPackage.unions[0].namespace, "MyNamespace");
  });

  it("namespace override on namespace", async () => {
    const { program } = await SimpleTesterWithService.compile(
      `
      namespace Inner {
        op test(): void;
      }

      @@clientNamespace(Inner, "MyNamespace");
      `,
    );
    const context = await createSdkContextForTester(program);
    strictEqual(
      (context.sdkPackage.clients[0].children![0] as SdkClientType<SdkServiceOperation>).namespace,
      "MyNamespace",
    );
  });

  it("namespace override on interface", async () => {
    const { program } = await SimpleTesterWithService.compile(
      `
      interface Inner {
        op test(): void;
      }

      @@clientNamespace(Inner, "MyNamespace");
      `,
    );
    const context = await createSdkContextForTester(program);
    strictEqual(
      (context.sdkPackage.clients[0].children![0] as SdkClientType<SdkServiceOperation>).namespace,
      "MyNamespace",
    );
  });

  it("namespace override propagation", async () => {
    const { program } = await SimpleTesterWithService.compile(
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
    const context = await createSdkContextForTester(program);
    strictEqual(context.sdkPackage.clients[0].namespace, "TestService"); // root namespace
    strictEqual(
      (context.sdkPackage.clients[0].children![0] as SdkClientType<SdkServiceOperation>).namespace,
      "MyNamespace",
    ); // Inner namespace with override
    strictEqual(
      (
        (context.sdkPackage.clients[0].children![0] as SdkClientType<SdkServiceOperation>)
          .children![0] as SdkClientType<SdkServiceOperation>
      ).namespace,
      "MyNamespace.Test",
    ); // Test namespace affected by Inner namespace override
    strictEqual(context.sdkPackage.models[0].namespace, "MyNamespace");
    strictEqual(context.sdkPackage.models[1].namespace, "MyNamespace.Test");
  });
});
