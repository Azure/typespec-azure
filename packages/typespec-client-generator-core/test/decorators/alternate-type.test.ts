import { expectDiagnostics } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkBuiltInType } from "../../src/interfaces.js";
import { getAllModels } from "../../src/types.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: @alternateType", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  describe.each([
    ["utcDateTime", "string"],
    ["utcDateTime", "int64"],
    ["duration", "string"],
  ])("supports replacing scalar types", (source: string, alternate: string) => {
    it("in global", async () => {
      await runner.compile(`
          @service({})
          namespace MyService {
            scalar source extends ${source};
          
            model Model1 {
              prop: source;
            };

            @route("/func1")
            op func1(@body body: Model1): void;

            @@alternateType(source, ${alternate});
          };
          `);

      const models = getAllModels(runner.context);
      const model1 = models[0];
      strictEqual(model1.kind, "model");
      const childProperty = model1.properties[0];
      strictEqual(childProperty.type.kind, alternate);
    });

    it("of model property", async () => {
      await runner.compile(`
          @service({})
          namespace MyService {
            model Model1 {
              prop: ${source};
            };

            @route("/func1")
            op func1(@body body: Model1): void;

            @@alternateType(Model1.prop, ${alternate});
          };
          `);

      const models = getAllModels(runner.context);
      const model1 = models[0];
      strictEqual(model1.kind, "model");
      const childProperty = model1.properties[0];
      strictEqual(childProperty.type.kind, alternate);
    });

    it("of operation parameters", async () => {
      await runner.compile(`
          @service({})
          namespace MyService {
            @route("/func1")
            op func1(@alternateType(${alternate}) param: ${source}): void;
          };
          `);

      const method = runner.context.sdkPackage.clients[0].methods[0];
      strictEqual(method.name, "func1");
      const param = method.parameters[0];
      strictEqual(param.type.kind, alternate);
    });
  });

  describe.each([
    ["bytes", "rfc7231"],
    ["bytes", undefined],
    [undefined, "rfc7231"],
    [undefined, undefined],
  ])(
    "always honors @encode of alternate type",
    (sourceEncode?: string, alternateEncode?: string) => {
      it("if @alternateType is declared in global", async () => {
        await runner.compile(`
          @service({})
          namespace MyService {
            ${sourceEncode ? `@encode("${sourceEncode}")` : ""}
            scalar source extends string;

            ${alternateEncode ? `@encode("${alternateEncode}")` : ""}
            scalar alternate extends utcDateTime;
          
            model Model1 {
              prop: source;
            };

            @route("/func1")
            op func1(@body body: Model1): void;

            @route("/func2")
            op func2(param: source): void;

            @@alternateType(source, alternate);
          };
          `);

        const models = getAllModels(runner.context);
        const model1 = models[0];
        strictEqual(model1.kind, "model");
        const childProperty = model1.properties[0].type as SdkBuiltInType;
        strictEqual(
          childProperty.encode,
          alternateEncode ?? "rfc3339" /* utcDateTime default encoding */,
        );

        const method = runner.context.sdkPackage.clients[0].methods[1];
        const paramType = method.parameters[0].type as SdkBuiltInType;
        strictEqual(paramType.encode, alternateEncode ?? "rfc3339");
      });

      it("if @alternateType is declared inline", async () => {
        await runner.compile(`
          @service({})
          namespace MyService {
            ${sourceEncode ? `@encode("${sourceEncode}")` : ""}
            scalar source extends string;

            ${alternateEncode ? `@encode("${alternateEncode}")` : ""}
            scalar alternate extends utcDateTime;
          
            model Model1 {
              @alternateType(alternate)
              prop: source;
            };

            @route("/func1")
            op func1(@body body: Model1): void;

            @route("/func2")
            op func2(@alternateType(alternate) param: source): void;
          };
          `);

        const models = getAllModels(runner.context);
        const model1 = models[0];
        strictEqual(model1.kind, "model");
        const childProperty = model1.properties[0].type as SdkBuiltInType;
        strictEqual(
          childProperty.encode,
          alternateEncode ?? "rfc3339" /* utcDateTime default encoding */,
        );

        const method = runner.context.sdkPackage.clients[0].methods[1];
        const paramType = method.parameters[0].type as SdkBuiltInType;
        strictEqual(paramType.encode, alternateEncode ?? "rfc3339");
      });
    },
  );

  it.each([
    ["ipV4", "string"],
    ["utc8", "utcDateTime"],
    ["timemillis", "int64"],
  ])("supports custom scalar types", async (alternate: string, base: string) => {
    await runner.compile(`
          @service({})
          namespace MyService {
            scalar ${alternate} extends ${base};

            @route("/func1")
            op func1(@alternateType(${alternate}) param: utcDateTime): void;
          };
          `);

    const method = runner.context.sdkPackage.clients[0].methods[0];
    strictEqual(method.name, "func1");
    const param = method.parameters[0];
    const alternateType = param.type as SdkBuiltInType;
    strictEqual(alternateType.kind, base);
    strictEqual(alternateType.name, alternate);
    strictEqual(alternateType.baseType?.kind, base);
  });

  it.each([
    ["python", true],
    ["python,csharp", true],
    ["", true],
    ["!python", false],
    ["java", false],
    ["java,go", false],
  ])("supports scope", async (scope: string, shouldReplace: boolean) => {
    await runner.compile(`
          @service({})
          namespace MyService {
            @route("/func1")
            op func1(@alternateType(string, "${scope}") param: utcDateTime): void;
          };
          `);

    const method = runner.context.sdkPackage.clients[0].methods[0];
    strictEqual(method.name, "func1");
    const param = method.parameters[0];
    strictEqual(param.type.kind, shouldReplace ? "string" : "utcDateTime");
  });

  describe.each(["null", "Array<string>", "Record<string>", "Model1", "Union1"])(
    "doesn't support non-scalar source types",
    (source: string) => {
      it("of model properties", async () => {
        const diagnostics = await runner.diagnose(`
          @service({})
          namespace MyService {
            model Model1{};
            alias Union1 = string | int32;

            model Model2 {
              @alternateType(string)
              prop: ${source};
            };

            @route("/func1")
            op func1(@body param: Model2): void;
          };
          `);

        expectDiagnostics(diagnostics, {
          code: "@azure-tools/typespec-client-generator-core/invalid-alternate-source-type",
        });
      });

      it("of operation parameters", async () => {
        const diagnostics = await runner.diagnose(`
          @service({})
          namespace MyService {
            model Model1{};
            alias Union1 = string | int32;

            @route("/func1")
            op func1(@alternateType(string) param: ${source}): void;
          };
          `);

        expectDiagnostics(diagnostics, {
          code: "@azure-tools/typespec-client-generator-core/invalid-alternate-source-type",
        });
      });
    },
  );
});
