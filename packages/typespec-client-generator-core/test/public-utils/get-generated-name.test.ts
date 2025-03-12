import { Model, ModelProperty, Operation } from "@typespec/compiler";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { UsageFlags } from "../../src/interfaces.js";
import { getGeneratedName, getHttpOperationWithCache } from "../../src/public-utils.js";
import { getSdkUnion } from "../../src/types.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

describe("getGeneratedName", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

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
            x.name === "AB1" &&
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
      strictEqual(unionEnum.crossLanguageDefinitionId, "TestService.A.status.anonymous");
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
      strictEqual(unionEnum.crossLanguageDefinitionId, "TestService.A.choice.status.anonymous");
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
      strictEqual(unionEnum.crossLanguageDefinitionId, "TestService.A.status.anonymous");
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
      @service
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
        "MyService.test.ResponseRepeatabilityResult.anonymous",
      );
      ok(unionEnum.isGeneratedName);
    });

    it("anonymous union in request header", async () => {
      const { repeatabilityResult } = (await runner.compile(`
      @service
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
        "MyService.test.RequestRepeatabilityResult.anonymous",
      );
      ok(unionEnum.isGeneratedName);
    });

    it("anonymous union with base type", async () => {
      const { repeatabilityResult } = (await runner.compile(`
      @service
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
        "MyService.test.RequestRepeatabilityResult.anonymous",
      );
    });

    it("anonymous model naming in multi layer operation group", async () => {
      const { TestModel } = (await runner.compile(`
      @service
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

      runner.context.__generatedNames?.clear();
      const name = getGeneratedName(
        runner.context,
        [...TestModel.properties.values()][0].type as Model,
      );
      strictEqual(name, "TestModelAnonymousProp");
    });

    it("anonymous model in response", async () => {
      const { test } = (await runner.compile(`
      @service
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
