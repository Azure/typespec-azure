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

describe("external types", () => {
  it("should support external type for union (DFE case)", async () => {
    const csharpRunner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
    await csharpRunner.compile(`
      @service
      namespace MyService {
        @alternateType({
          fullyQualifiedName: "Azure.Core.Expressions.DataFactoryExpression",
        }, "csharp")
        union Dfe<T> {
          T,
          DfeExpression
        }

        model DfeExpression {
          kind: "expression";
          value: string;
        }

        model Pipeline {
          description: string,
          runDimensions: Dimension,
        }

        model Dimension {
           ...Record<Dfe<string>>;
        }

        @route("/test")
        op test(@body body: Pipeline): void;
      };
    `);

    const models = getAllModels(csharpRunner.context);
    const pipeline = models.find((m) => m.name === "Pipeline");
    strictEqual(pipeline?.kind, "model");

    const runDimensionsProperty = pipeline.properties.find((p) => p.name === "runDimensions");
    strictEqual(runDimensionsProperty?.type.kind, "model");

    const dimension = runDimensionsProperty.type;
    strictEqual(dimension.additionalProperties?.kind, "union");
    strictEqual(
      dimension.additionalProperties.external?.fullyQualifiedName,
      "Azure.Core.Expressions.DataFactoryExpression",
    );
  });

  it("should support external type with package information (PySTAC case)", async () => {
    await runner.compile(`
      @service
      namespace MyService {
        @alternateType({
          fullyQualifiedName: "pystac.Collection",
          package: "pystac",
          version: "1.13.0",
        }, "python")
        model ItemCollection {
          /**
           * GeoJSON FeatureCollection type.
           */
          type: ItemCollectionType;

          /**
           * Array of STAC Items in the collection.
           */
          features: StacItem[];

          /**
           * Bounding box of all items in format [west, south, east, north].
           */
          boundingBox?: float64[];

          /**
           * Stac Version
           */
          @minLength(1)
          @encodedName("application/json", "stac_version")
          stacVersion?: string = "1.0.0";

          /**
           * Links to related resources and endpoints.
           */
          links?: Link[];

          /**
           * Context information for the search response.
           */
          context?: ContextExtension;
        }

        model ItemCollectionType {
          value: string;
        }

        model StacItem {
          id: string;
        }

        model Link {
          href: string;
        }

        model ContextExtension {
          page: int32;
        }

        @route("/test")
        op test(@body body: ItemCollection): void;
      };
    `);

    const models = getAllModels(runner.context);
    const itemCollection = models.find((m) => m.name === "ItemCollection");
    strictEqual(itemCollection?.kind, "model");
    strictEqual(itemCollection.external?.fullyQualifiedName, "pystac.Collection");
    strictEqual(itemCollection.external?.package, "pystac");
    strictEqual(itemCollection.external?.version, "1.13.0");
  });

  it("should support external type for scalar", async () => {
    const runnerWithJava = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
    await runnerWithJava.compile(`
      @service
      namespace MyService {
        @alternateType({
          fullyQualifiedName: "System.DateOnly",
          package: "System.Runtime",
        }, "java")
        scalar CustomDate extends string;

        model TestModel {
          date: CustomDate;
        }

        @route("/test")
        op test(@body body: TestModel): void;
      };
    `);

    const models = getAllModels(runnerWithJava.context);
    const testModel = models.find((m) => m.name === "TestModel");
    strictEqual(testModel?.kind, "model");

    const dateProperty = testModel.properties.find((p) => p.name === "date");
    strictEqual(dateProperty?.type.external?.fullyQualifiedName, "System.DateOnly");
    strictEqual(dateProperty?.type.external?.package, "System.Runtime");
    strictEqual(dateProperty?.type.external?.version, undefined);
  });

  it("should support external type for enum", async () => {
    await runner.compile(`
      @service
      namespace MyService {
        @alternateType({
          fullyQualifiedName: "MyLibrary.Status",
          package: "my-enum-lib",
          version: "1.5.0",
        }, "python")
        enum StatusEnum {
          Active,
          Inactive,
          Pending,
        }

        model TestModel {
          status: StatusEnum;
        }

        @route("/test")
        op test(@body body: TestModel): void;
      };
    `);

    const models = getAllModels(runner.context);
    const testModel = models.find((m) => m.name === "TestModel");
    strictEqual(testModel?.kind, "model");

    const statusProperty = testModel.properties.find((p) => p.name === "status");
    strictEqual(statusProperty?.type.kind, "enum");
    strictEqual(statusProperty?.type.external?.fullyQualifiedName, "MyLibrary.Status");
    strictEqual(statusProperty?.type.external?.package, "my-enum-lib");
    strictEqual(statusProperty?.type.external?.version, "1.5.0");
  });

  it("should support external type with minimal information", async () => {
    await runner.compile(`
      @service
      namespace MyService {
        @alternateType({
          fullyQualifiedName: "ExternalType",
        }, "python")
        model SimpleModel {
          value: string;
        }

        @route("/test")
        op test(@body body: SimpleModel): void;
      };
    `);

    const models = getAllModels(runner.context);
    const simpleModel = models.find((m) => m.name === "SimpleModel");
    strictEqual(simpleModel?.kind, "model");
    strictEqual(simpleModel.external?.fullyQualifiedName, "ExternalType");
    strictEqual(simpleModel.external?.package, undefined);
    strictEqual(simpleModel.external?.version, undefined);
  });

  it("should support scoped external types", async () => {
    const pythonRunner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
    const csharpRunner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });

    const spec = `
      @service
      namespace MyService {
        @alternateType({
          fullyQualifiedName: "python_module.PythonType",
          package: "python-package",
        }, "python")
        @alternateType({
          fullyQualifiedName: "CSharp.Namespace.CSharpType",
          package: "CSharp.Package",
        }, "csharp")
        model CrossLanguageModel {
          value: string;
        }

        @route("/test")
        op test(@body body: CrossLanguageModel): void;
      };
    `;

    await pythonRunner.compile(spec);
    await csharpRunner.compile(spec);

    const pythonModels = getAllModels(pythonRunner.context);
    const pythonModel = pythonModels.find((m) => m.name === "CrossLanguageModel");
    strictEqual(pythonModel?.external?.fullyQualifiedName, "python_module.PythonType");
    strictEqual(pythonModel?.external?.package, "python-package");

    const csharpModels = getAllModels(csharpRunner.context);
    const csharpModel = csharpModels.find((m) => m.name === "CrossLanguageModel");
    strictEqual(csharpModel?.external?.fullyQualifiedName, "CSharp.Namespace.CSharpType");
    strictEqual(csharpModel?.external?.package, "CSharp.Package");
  });

  it("should support array type with external elements", async () => {
    await runner.compile(`
      @service
      namespace MyService {
        @alternateType({
          fullyQualifiedName: "CustomList",
          package: "collections-lib",
        }, "python")
        model StringArray {
          items: string[];
        }

        model TestModel {
          arrays: StringArray[];
        }

        @route("/test")
        op test(@body body: TestModel): void;
      };
    `);

    const models = getAllModels(runner.context);
    const testModel = models.find((m) => m.name === "TestModel");
    strictEqual(testModel?.kind, "model");

    const arraysProperty = testModel.properties.find((p) => p.name === "arrays");
    strictEqual(arraysProperty?.type.kind, "array");

    const arrayElementType = (arraysProperty?.type as SdkArrayType).valueType;
    strictEqual(arrayElementType.kind, "model");
    strictEqual(arrayElementType.external?.fullyQualifiedName, "CustomList");
    strictEqual(arrayElementType.external?.package, "collections-lib");
  });

  it("using without scope should raise warning", async () => {
    const diagnostics = (
      await runner.compileAndDiagnose(`
      @service
      namespace MyService {
        @alternateType({
          fullyQualifiedName: "CustomList",
          package: "collections-lib",
        })
        model StringArray {
          items: string[];
        }

        model TestModel {
          arrays: StringArray[];
        }

        @route("/test")
        op test(@body body: TestModel): void;
      };
    `)
    )[1];
    strictEqual(diagnostics.length, 1);
    strictEqual(diagnostics[0].code, "@azure-tools/typespec-client-generator-core/missing-scope");
  });

  it("mismatching external versions", async () => {
    const diagnostics = (
      await runner.compileAndDiagnose(`
      @service
      namespace MyService {
        @alternateType({
          fullyQualifiedName: "collections.StringList",
          package: "collections-lib",
          version: "1.0.0"
        }, "python")
        model StringArray {
          items: string[];
        }

        @alternateType({
          fullyQualifiedName: "collections.BytesList",
          package: "collections-lib",
          version: "1.0.1"
        }, "python")
        model BytesArray {
          items: bytes[];
        }

        model TestModel {
          arrays: (StringArray | BytesArray)[];
        }

        @route("/test")
        op test(@body body: TestModel): void;
      };
    `)
    )[1];
    strictEqual(diagnostics.length, 1);
    strictEqual(
      diagnostics[0].code,
      "@azure-tools/typespec-client-generator-core/external-library-version-mismatch",
    );
    strictEqual(
      diagnostics[0].message,
      "External library version mismatch. There are multiple versions of collections-lib: 1.0.0 and 1.0.1. Please unify the versions.",
    );
  });
});
