import { expectDiagnostics } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkArrayType, SdkBuiltInType } from "../../src/interfaces.js";
import { getAllModels } from "../../src/types.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

describe.each([
  ["utcDateTime", "string"],
  ["utcDateTime", "int64"],
  ["duration", "string"],
])("supports replacing scalar types with scalar types", (source: string, alternate: string) => {
  it("in global", async () => {
    await runner.compile(`
      @service
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
      @service
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
      @service
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
])("always honors @encode of alternate type", (sourceEncode?: string, alternateEncode?: string) => {
  it("if @alternateType is declared in global", async () => {
    await runner.compile(`
      @service
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
      @service
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
});

it.each([
  ["string[]", "utcDateTime[]"],
  ["int64[]", "utcDateTime[]"],
  ["duration[]", "string[]"],
])(
  "supports both source type and alternate type are scalar array",
  async (source: string, alternate: string) => {
    await runner.compile(`
      @service
      namespace MyService {
        model Model1 {
          prop: ${source};
          prop2: ${alternate};
        };

        @route("/func1")
        op func1(@body body: Model1): void;

        @@alternateType(Model1.prop, ${alternate});
      };
    `);

    const models = getAllModels(runner.context);
    const model1 = models[0];
    strictEqual(model1.kind, "model");
    const childProperty1 = model1.properties[0];
    const childProperty2 = model1.properties[1];
    const type1 = childProperty1.type as SdkArrayType;
    const type2 = childProperty2.type as SdkArrayType;
    strictEqual(type1.kind, type2.kind);
    strictEqual(type1.valueType.kind, type2.valueType.kind);
  },
);

it("should not support source type is scalar but alternate type is string[]", async () => {
  const diagnostics = await runner.diagnose(`
    @service
    namespace MyService {
      scalar source extends string;
      model Model1 {
        prop: string;
      }
      
      @route("/func1")
      op func1(@body body: Model1): void;

      @@alternateType(source, string[]);
    };
  `);
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/invalid-alternate-type",
  });
});

it("should not support source type is scalar but alternate type is unknown", async () => {
  const diagnostics = await runner.diagnose(`
    @service
    namespace MyService {
      scalar source extends string;
      model Model1 {
        prop: string;
      }
      
      @route("/func1")
      op func1(@body body: Model1): void;

      @@alternateType(source, unknown);
    };
  `);
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/invalid-alternate-type",
  });
});

it("should support alternate type unknown on model property", async () => {
  await runner.compile(`
    @service
    namespace MyService {
      model Model1 {
        prop: string;
      }
      
      @route("/func1")
      op func1(@body body: Model1): void;

      @@alternateType(Model1.prop, unknown);
    };
  `);

  const models = getAllModels(runner.context);
  const model1 = models[0];
  strictEqual(model1.kind, "model");
  const prop = model1.properties[0];
  strictEqual(prop.type.kind, "unknown");
});

it.each([
  ["ipV4", "string"],
  ["utc8", "utcDateTime"],
  ["timemillis", "int64"],
])("supports custom scalar types", async (alternate: string, base: string) => {
  await runner.compile(`
    @service
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
    @service
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

it("@alternateType along with @override", async () => {
  await runner.compile(`
    @service
    namespace Test;

    @route("/bar")
    op bar(@query prop: string): void;

    // This alternate type should also apply for the operation level
    op baz(@alternateType(int32) @query prop: string): void;

    @@override(bar, baz);
  `);

  const method = runner.context.sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "bar");
  const param = method.parameters[0];
  strictEqual(param.type.kind, "int32");
  const operationParam = method.operation.parameters[0];
  strictEqual(operationParam.type.kind, "int32");
});

it("@alternateType along with @override with scope", async () => {
  await runner.compile(`
    @service
    namespace Test;

    @route("/bar")
    op bar(@query prop: string): void;

    // This alternate type should also apply for the operation level
    op baz(@alternateType(int32, "python") @query prop: string): void;

    @@override(bar, baz, "python");
  `);

  const method = runner.context.sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "bar");
  const param = method.parameters[0];
  strictEqual(param.type.kind, "int32");
  const operationParam = method.operation.parameters[0];
  strictEqual(operationParam.type.kind, "int32");
});
