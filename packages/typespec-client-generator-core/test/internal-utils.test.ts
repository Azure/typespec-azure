import { t } from "@typespec/compiler/testing";
import { deepStrictEqual, strictEqual } from "assert";
import { describe, it } from "vitest";
import { compareModelProperties, getValueTypeValue } from "../src/internal-utils.js";
import { createSdkContextForTester, SimpleTesterWithBuiltInService } from "./tester.js";

describe("parseEmitterName", () => {
  it("@azure-tools/typespec-{language}", async () => {
    const { program } = await SimpleTesterWithBuiltInService.compile(``);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    strictEqual(context.emitterName, "csharp");
  });

  it("@typespec/{protocol}-{client|server}-{language}-generator", async () => {
    const { program } = await SimpleTesterWithBuiltInService.compile(``);
    const context = await createSdkContextForTester(program, {
      emitterName: "@typespec/http-client-csharp",
    });
    strictEqual(context.emitterName, "csharp");
  });
});

describe("getValueTypeValue", () => {
  it("string default value", async () => {
    const { program, Test } = await SimpleTesterWithBuiltInService.compile(t.code`
      model ${t.model("Test")} {
        prop: string = "default";
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    strictEqual(getValueTypeValue(Test.properties.get("prop")?.defaultValue!), "default");
  });

  it("boolean default value", async () => {
    const { program, Test } = await SimpleTesterWithBuiltInService.compile(t.code`
      model ${t.model("Test")} {
        prop: boolean = false;
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    strictEqual(getValueTypeValue(Test.properties.get("prop")?.defaultValue!), false);
  });

  it("null default value", async () => {
    const { program, Test } = await SimpleTesterWithBuiltInService.compile(t.code`
      model ${t.model("Test")} {
        prop: boolean | null = null;
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    strictEqual(getValueTypeValue(Test.properties.get("prop")?.defaultValue!), null);
  });

  it("numeric int default value", async () => {
    const { program, Test } = await SimpleTesterWithBuiltInService.compile(t.code`
      model ${t.model("Test")} {
        prop: int32 = 1;
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    strictEqual(getValueTypeValue(Test.properties.get("prop")?.defaultValue!), 1);
  });

  it("numeric float default value", async () => {
    const { program, Test } = await SimpleTesterWithBuiltInService.compile(t.code`
      model ${t.model("Test")} {
        prop: float32 = 1.234;
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    strictEqual(getValueTypeValue(Test.properties.get("prop")?.defaultValue!), 1.234);
  });

  it("enum member default value", async () => {
    const { program, Test } = await SimpleTesterWithBuiltInService.compile(t.code`
      model ${t.model("Test")} {
        prop: MyEnum = MyEnum.A;
      }

      enum MyEnum {
        A: "A",
        B: "B",
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    strictEqual(getValueTypeValue(Test.properties.get("prop")?.defaultValue!), "A");
  });

  it("enum member without value default value", async () => {
    const { program, Test } = await SimpleTesterWithBuiltInService.compile(t.code`
      model ${t.model("Test")} {
        prop: MyEnum = MyEnum.A;
      }

      enum MyEnum {
        A,
        B,
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    strictEqual(getValueTypeValue(Test.properties.get("prop")?.defaultValue!), "A");
  });

  it("array default value", async () => {
    const { program, Test } = await SimpleTesterWithBuiltInService.compile(t.code`
      model ${t.model("Test")} {
        prop: string[] = #["a", "b"];
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    deepStrictEqual(getValueTypeValue(Test.properties.get("prop")?.defaultValue!), ["a", "b"]);
  });

  it("object default value", async () => {
    const { program, Test } = await SimpleTesterWithBuiltInService.compile(t.code`
      model ${t.model("Test")} {
        prop: Point = #{ x: 0, y: 0 };
      }

      model Point {
        x: int32;
        y: int32;
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    deepStrictEqual(getValueTypeValue(Test.properties.get("prop")?.defaultValue!), {
      x: 0,
      y: 0,
    });
  });
});

describe("compareModelProperties", () => {
  it("should return true for equal properties", async () => {
    const { program, A, B } = await SimpleTesterWithBuiltInService.compile(t.code`
      model ${t.model("A")} {
        prop: string;
      }

      model ${t.model("B")} {
        prop: string;
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    strictEqual(
      compareModelProperties(context, A.properties.get("prop"), B.properties.get("prop")),
      true,
    );
  });

  it("should return false for different names", async () => {
    const { program, A, B } = await SimpleTesterWithBuiltInService.compile(t.code`
      model ${t.model("A")} {
        propA: string;
      }

      model ${t.model("B")} {
        propB: string;
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    strictEqual(
      compareModelProperties(context, A.properties.get("propA"), B.properties.get("propB")),
      false,
    );
  });

  it("should return false for different types", async () => {
    const { program, A, B } = await SimpleTesterWithBuiltInService.compile(t.code`
      model ${t.model("A")} {
        prop: string;
      }

      model ${t.model("B")} {
        prop: int32;
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    strictEqual(
      compareModelProperties(context, A.properties.get("prop"), B.properties.get("prop")),
      false,
    );
  });

  it("should return false for different query names", async () => {
    const { program, A, B } = await SimpleTesterWithBuiltInService.compile(t.code`
      model ${t.model("A")} {
        @query("aa") a: string;
      }

      model ${t.model("B")} {
        @query("bb") a: string;
      }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    strictEqual(
      compareModelProperties(context, A.properties.get("a"), B.properties.get("a")),
      false,
    );
  });
});
