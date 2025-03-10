import { Model } from "@typespec/compiler";
import { deepStrictEqual, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { getValueTypeValue } from "../src/internal-utils.js";
import { SdkTestRunner, createSdkTestRunner } from "./test-host.js";

describe("typespec-client-generator-core: internal-utils", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  describe("parseEmitterName", () => {
    it("@azure-tools/typespec-{language}", async () => {
      const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
      await runner.compile("");
      strictEqual(runner.context.emitterName, "csharp");
    });

    it("@typespec/{protocol}-{client|server}-{language}-generator", async () => {
      const runner = await createSdkTestRunner({ emitterName: "@typespec/http-client-csharp" });
      await runner.compile("");
      strictEqual(runner.context.emitterName, "csharp");
    });
  });

  describe("getValueTypeValue", () => {
    it("string default value", async () => {
      const { Test } = (await runner.compile(`
        @service
        namespace My.Service;

        @test
        model Test {
          prop: string = "default";
        }
      `)) as { Test: Model };

      strictEqual(getValueTypeValue(Test.properties.get("prop")?.defaultValue!), "default");
    });

    it("boolean default value", async () => {
      const { Test } = (await runner.compile(`
        @service
        namespace My.Service;

        @test
        model Test {
          prop: boolean = false;
        }
      `)) as { Test: Model };

      strictEqual(getValueTypeValue(Test.properties.get("prop")?.defaultValue!), false);
    });

    it("null default value", async () => {
      const { Test } = (await runner.compile(`
        @service
        namespace My.Service;

        @test
        model Test {
          prop: boolean | null = null;
        }
      `)) as { Test: Model };

      strictEqual(getValueTypeValue(Test.properties.get("prop")?.defaultValue!), null);
    });

    it("numeric int default value", async () => {
      const { Test } = (await runner.compile(`
        @service
        namespace My.Service;

        @test
        model Test {
          prop: int32 = 1;
        }
      `)) as { Test: Model };

      strictEqual(getValueTypeValue(Test.properties.get("prop")?.defaultValue!), 1);
    });

    it("numeric float default value", async () => {
      const { Test } = (await runner.compile(`
        @service
        namespace My.Service;

        @test
        model Test {
          prop: float32 = 1.234;
        }
      `)) as { Test: Model };

      strictEqual(getValueTypeValue(Test.properties.get("prop")?.defaultValue!), 1.234);
    });

    it("enum member default value", async () => {
      const { Test } = (await runner.compile(`
        @service
        namespace My.Service;

        @test
        model Test {
          prop: MyEnum = MyEnum.A;
        }

        enum MyEnum {
          A: "A",
          B: "B",
        }
      `)) as { Test: Model };

      strictEqual(getValueTypeValue(Test.properties.get("prop")?.defaultValue!), "A");
    });

    it("enum member without value default value", async () => {
      const { Test } = (await runner.compile(`
        @service
        namespace My.Service;

        @test
        model Test {
          prop: MyEnum = MyEnum.A;
        }

        enum MyEnum {
          A,
          B,
        }
      `)) as { Test: Model };

      strictEqual(getValueTypeValue(Test.properties.get("prop")?.defaultValue!), "A");
    });

    it("array default value", async () => {
      const { Test } = (await runner.compile(`
        @service
        namespace My.Service;

        @test
        model Test {
          prop: string[] = #["a", "b"];
        }
      `)) as { Test: Model };

      deepStrictEqual(getValueTypeValue(Test.properties.get("prop")?.defaultValue!), ["a", "b"]);
    });

    it("object default value", async () => {
      const { Test } = (await runner.compile(`
        @service
        namespace My.Service;

        @test
        model Test {
          prop: Point = #{ x: 0, y: 0 };
        }

        model Point {
          x: int32;
          y: int32;
        }
      `)) as { Test: Model };

      deepStrictEqual(getValueTypeValue(Test.properties.get("prop")?.defaultValue!), {
        x: 0,
        y: 0,
      });
    });
  });
});
