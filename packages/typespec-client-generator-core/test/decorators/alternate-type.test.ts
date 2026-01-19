import { Enum, Model } from "@typespec/compiler";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { describe, it } from "vitest";
import { SdkArrayType, SdkBuiltInType, UsageFlags } from "../../src/interfaces.js";
import { getAllModels } from "../../src/types.js";
import {
  createSdkContextForTester,
  SimpleTester,
  SimpleTesterWithBuiltInService,
} from "../tester.js";

describe.each([
  ["utcDateTime", "string"],
  ["utcDateTime", "int64"],
  ["duration", "string"],
])("supports replacing scalar types with scalar types", (source: string, alternate: string) => {
  it("in global", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const models = getAllModels(context);
    const model1 = models[0];
    strictEqual(model1.kind, "model");
    const childProperty = model1.properties[0];
    strictEqual(childProperty.type.kind, alternate);
  });

  it("of model property", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const models = getAllModels(context);
    const model1 = models[0];
    strictEqual(model1.kind, "model");
    const childProperty = model1.properties[0];
    strictEqual(childProperty.type.kind, alternate);
  });

  it("of operation parameters", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService {
        @route("/func1")
        op func1(@alternateType(${alternate}) param: ${source}): void;
      };
      `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const method = context.sdkPackage.clients[0].methods[0];
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
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const models = getAllModels(context);
    const model1 = models[0];
    strictEqual(model1.kind, "model");
    const childProperty = model1.properties[0].type as SdkBuiltInType;
    strictEqual(
      childProperty.encode,
      alternateEncode ?? "rfc3339" /* utcDateTime default encoding */,
    );

    const method = context.sdkPackage.clients[0].methods[1];
    const paramType = method.parameters[0].type as SdkBuiltInType;
    strictEqual(paramType.encode, alternateEncode ?? "rfc3339");
  });

  it("if @alternateType is declared inline", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const models = getAllModels(context);
    const model1 = models[0];
    strictEqual(model1.kind, "model");
    const childProperty = model1.properties[0].type as SdkBuiltInType;
    strictEqual(
      childProperty.encode,
      alternateEncode ?? "rfc3339" /* utcDateTime default encoding */,
    );

    const method = context.sdkPackage.clients[0].methods[1];
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
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const models = getAllModels(context);
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
  const diagnostics = await SimpleTester.diagnose(`
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
  const diagnostics = await SimpleTester.diagnose(`
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
  const { program } = await SimpleTester.compile(`
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

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const models = getAllModels(context);
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
  const { program } = await SimpleTester.compile(`
    @service
    namespace MyService {
      scalar ${alternate} extends ${base};

      @route("/func1")
      op func1(@alternateType(${alternate}) param: utcDateTime): void;
    };
    `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const method = context.sdkPackage.clients[0].methods[0];
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
  const { program } = await SimpleTester.compile(`
    @service
    namespace MyService {
      @route("/func1")
      op func1(@alternateType(string, "${scope}") param: utcDateTime): void;
    };
    `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const method = context.sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "func1");
  const param = method.parameters[0];
  strictEqual(param.type.kind, shouldReplace ? "string" : "utcDateTime");
});

it("@alternateType along with @override", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    namespace Test;

    @route("/bar")
    op bar(@query prop: string): void;

    // This alternate type should also apply for the operation level
    op baz(@alternateType(int32) @query prop: string): void;

    @@override(bar, baz);
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const method = context.sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "bar");
  const param = method.parameters[0];
  strictEqual(param.type.kind, "int32");
  const operationParam = method.operation.parameters[0];
  strictEqual(operationParam.type.kind, "int32");
});

it("@alternateType along with @override with scope", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    namespace Test;

    @route("/bar")
    op bar(@query prop: string): void;

    // This alternate type should also apply for the operation level
    op baz(@alternateType(int32, "python") @query prop: string): void;

    @@override(bar, baz, "python");
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const method = context.sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "bar");
  const param = method.parameters[0];
  strictEqual(param.type.kind, "int32");
  const operationParam = method.operation.parameters[0];
  strictEqual(operationParam.type.kind, "int32");
});

describe("external types", () => {
  it("should support external type for union (DFE case)", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService {
        @alternateType({
          identity: "Azure.Core.Expressions.DataFactoryExpression",
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const models = getAllModels(context);
    const pipeline = models.find((m) => m.name === "Pipeline");
    strictEqual(pipeline?.kind, "model");

    const runDimensionsProperty = pipeline.properties.find((p) => p.name === "runDimensions");
    strictEqual(runDimensionsProperty?.type.kind, "model");

    const dimension = runDimensionsProperty.type;
    strictEqual(dimension.additionalProperties?.kind, "union");
    strictEqual(
      dimension.additionalProperties.external?.identity,
      "Azure.Core.Expressions.DataFactoryExpression",
    );
  });

  it("should support external type with package information (PySTAC case)", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService {
        @alternateType({
          identity: "pystac.Collection",
          package: "pystac",
          minVersion: "1.13.0",
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const models = getAllModels(context);
    const itemCollection = models.find((m) => m.name === "ItemCollection");
    strictEqual(itemCollection?.kind, "model");
    strictEqual(itemCollection.external?.identity, "pystac.Collection");
    strictEqual(itemCollection.external?.package, "pystac");
    strictEqual(itemCollection.external?.minVersion, "1.13.0");
  });

  it("should support external type for scalar", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService {
        @alternateType({
          identity: "System.DateOnly",
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
    });
    const models = getAllModels(context);
    const testModel = models.find((m) => m.name === "TestModel");
    strictEqual(testModel?.kind, "model");

    const dateProperty = testModel.properties.find((p) => p.name === "date");
    strictEqual(dateProperty?.type.external?.identity, "System.DateOnly");
    strictEqual(dateProperty?.type.external?.package, "System.Runtime");
    strictEqual(dateProperty?.type.external?.minVersion, undefined);
  });

  it("should support external type for enum", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService {
        @alternateType({
          identity: "MyLibrary.Status",
          package: "my-enum-lib",
          minVersion: "1.5.0",
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const models = getAllModels(context);
    const testModel = models.find((m) => m.name === "TestModel");
    strictEqual(testModel?.kind, "model");

    const statusProperty = testModel.properties.find((p) => p.name === "status");
    strictEqual(statusProperty?.type.kind, "enum");
    strictEqual(statusProperty?.type.external?.identity, "MyLibrary.Status");
    strictEqual(statusProperty?.type.external?.package, "my-enum-lib");
    strictEqual(statusProperty?.type.external?.minVersion, "1.5.0");
  });

  it("should support external type with minimal information", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService {
        @alternateType({
          identity: "ExternalType",
        }, "python")
        model SimpleModel {
          value: string;
        }

        @route("/test")
        op test(@body body: SimpleModel): void;
      };
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const models = getAllModels(context);
    const simpleModel = models.find((m) => m.name === "SimpleModel");
    strictEqual(simpleModel?.kind, "model");
    strictEqual(simpleModel.external?.identity, "ExternalType");
    strictEqual(simpleModel.external?.package, undefined);
    strictEqual(simpleModel.external?.minVersion, undefined);
  });

  it("should support scoped external types", async () => {
    const spec = `
      @service
      namespace MyService {
        @alternateType({
          identity: "python_module.PythonType",
          package: "python-package",
        }, "python")
        @alternateType({
          identity: "CSharp.Namespace.CSharpType",
          package: "CSharp.Package",
        }, "csharp")
        model CrossLanguageModel {
          value: string;
        }

        @route("/test")
        op test(@body body: CrossLanguageModel): void;
      };
    `;

    const { program: pythonProgram } = await SimpleTester.compile(spec);
    const { program: csharpProgram } = await SimpleTester.compile(spec);

    const pythonContext = await createSdkContextForTester(pythonProgram, {
      emitterName: "@azure-tools/typespec-python",
    });
    const csharpContext = await createSdkContextForTester(csharpProgram, {
      emitterName: "@azure-tools/typespec-csharp",
    });

    const pythonModels = getAllModels(pythonContext);
    const pythonModel = pythonModels.find((m) => m.name === "CrossLanguageModel");
    strictEqual(pythonModel?.external?.identity, "python_module.PythonType");
    strictEqual(pythonModel?.external?.package, "python-package");

    const csharpModels = getAllModels(csharpContext);
    const csharpModel = csharpModels.find((m) => m.name === "CrossLanguageModel");
    strictEqual(csharpModel?.external?.identity, "CSharp.Namespace.CSharpType");
    strictEqual(csharpModel?.external?.package, "CSharp.Package");
  });

  it("should support array type with external elements", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService {
        @alternateType({
          identity: "CustomList",
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const models = getAllModels(context);
    const testModel = models.find((m) => m.name === "TestModel");
    strictEqual(testModel?.kind, "model");

    const arraysProperty = testModel.properties.find((p) => p.name === "arrays");
    strictEqual(arraysProperty?.type.kind, "array");

    const arrayElementType = (arraysProperty?.type as SdkArrayType).valueType;
    strictEqual(arrayElementType.kind, "model");
    strictEqual(arrayElementType.external?.identity, "CustomList");
    strictEqual(arrayElementType.external?.package, "collections-lib");
  });

  it("using without scope should raise warning", async () => {
    const diagnostics = await SimpleTester.diagnose(`
      @service
      namespace MyService {
        @alternateType({
          identity: "CustomList",
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
    `);
    strictEqual(diagnostics.length, 1);
    strictEqual(diagnostics[0].code, "@azure-tools/typespec-client-generator-core/missing-scope");
  });

  it("mismatching external versions", async () => {
    const diagnostics = await SimpleTester.diagnose(
      `
      @service
      namespace MyService {
        @alternateType({
          identity: "collections.StringList",
          package: "collections-lib",
          minVersion: "1.0.0"
        }, "python")
        model StringArray {
          items: string[];
        }

        @alternateType({
          identity: "collections.BytesList",
          package: "collections-lib",
          minVersion: "1.0.1"
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
    `,
      { emitterName: "@azure-tools/typespec-python" },
    );
    strictEqual(diagnostics.length, 3);
    strictEqual(
      diagnostics[0].code,
      "@azure-tools/typespec-client-generator-core/external-library-version-mismatch",
    );
    strictEqual(
      diagnostics[0].message,
      "External library version mismatch. There are multiple versions of collections-lib: 1.0.0 and 1.0.1. Please unify the versions.",
    );
  });

  it("should set External usage flag for types referenced by external types", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService {
        @alternateType({
          identity: "pystac.Collection",
          package: "pystac",
          minVersion: "1.13.0",
        }, "python")
        model ItemCollection {
          type: ItemCollectionType;
          features: StacItem[];
          links?: Link[];
          context?: ContextExtension;
          shared?: SharedModel;
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

        // This model is used both in external type and in another operation
        model SharedModel {
          name: string;
        }

        model ItemCollection2 {
          shared: SharedModel;
        }

        @route("/test1")
        op test1(@body body: ItemCollection): void;

        @route("/test2")
        op test2(@body body: ItemCollection2): void;
      };
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const models = getAllModels(context);
    const itemCollection = models.find((m) => m.name === "ItemCollection");
    const itemCollectionType = models.find((m) => m.name === "ItemCollectionType");
    const stacItem = models.find((m) => m.name === "StacItem");
    const link = models.find((m) => m.name === "Link");
    const contextExtension = models.find((m) => m.name === "ContextExtension");
    const sharedModel = models.find((m) => m.name === "SharedModel");
    const itemCollection2 = models.find((m) => m.name === "ItemCollection2");

    // ItemCollection has external info and should have External usage flag
    strictEqual(itemCollection?.kind, "model");
    strictEqual(itemCollection.external?.identity, "pystac.Collection");
    strictEqual((itemCollection.usage & UsageFlags.External) > 0, true);

    // Types only referenced by ItemCollection should have External usage flag
    strictEqual(itemCollectionType?.kind, "model");
    strictEqual((itemCollectionType.usage & UsageFlags.External) > 0, true);

    strictEqual(stacItem?.kind, "model");
    strictEqual((stacItem.usage & UsageFlags.External) > 0, true);

    strictEqual(link?.kind, "model");
    strictEqual((link.usage & UsageFlags.External) > 0, true);

    strictEqual(contextExtension?.kind, "model");
    strictEqual((contextExtension.usage & UsageFlags.External) > 0, true);

    // SharedModel is used by both external and non-external types
    // It will have External flag (from ItemCollection) AND Input flag (from ItemCollection2)
    // NOTE: for shared model, TCGC actually shall not set External flag, because it's not fully external.
    // But for simplicity we just keep it this way since we may not meet this scenario in the future.
    strictEqual(sharedModel?.kind, "model");
    strictEqual((sharedModel.usage & UsageFlags.External) > 0, true);
    strictEqual((sharedModel.usage & UsageFlags.Input) > 0, true);

    // ItemCollection2 is not external, should NOT have External flag
    strictEqual(itemCollection2?.kind, "model");
    strictEqual((itemCollection2.usage & UsageFlags.External) === 0, true);
  });

  it("should set External usage flag for transitively referenced types", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService {
        @alternateType({
          identity: "external.Collection",
          package: "external-lib",
        }, "python")
        model ExternalModel {
          nested: NestedModel;
        }

        model NestedModel {
          deepNested: DeepNestedModel;
          value: string;
        }

        model DeepNestedModel {
          id: int32;
        }

        @route("/test")
        op test(@body body: ExternalModel): void;
      };
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const models = getAllModels(context);
    const externalModel = models.find((m) => m.name === "ExternalModel");
    const nestedModel = models.find((m) => m.name === "NestedModel");
    const deepNestedModel = models.find((m) => m.name === "DeepNestedModel");

    // ExternalModel has external info and should have External usage flag
    strictEqual(externalModel?.kind, "model");
    strictEqual(externalModel.external?.identity, "external.Collection");
    strictEqual((externalModel.usage & UsageFlags.External) > 0, true);

    // NestedModel is only referenced by ExternalModel, should have External usage flag
    strictEqual(nestedModel?.kind, "model");
    strictEqual((nestedModel.usage & UsageFlags.External) > 0, true);

    // DeepNestedModel is only referenced by NestedModel (which has External flag)
    // So it should also have External flag (recursive propagation)
    strictEqual(deepNestedModel?.kind, "model");
    strictEqual((deepNestedModel.usage & UsageFlags.External) > 0, true);
  });

  it("should not treat regular TypeSpec models as external types", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService {
        // Regular TypeSpec model that should NOT be treated as external
        model ManagedServiceIdentity {
          principalId?: string;
          tenantId?: string;
          type: string;
        }

        model Employee {
          name: string;
          identity: ManagedServiceIdentity;
        }

        @route("/test")
        op test(@body body: Employee): void;

        // Apply alternateType to change the identity property type
        @@alternateType(Employee.identity, ManagedServiceIdentity, "csharp");
      };
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const models = getAllModels(context);
    const employee = models.find((m) => m.name === "Employee");
    strictEqual(employee?.kind, "model");

    const identityProperty = employee.properties.find((p) => p.name === "identity");
    strictEqual(identityProperty?.type.kind, "model");
    strictEqual(identityProperty?.type.name, "ManagedServiceIdentity");

    // The key check: it should NOT have external property set
    strictEqual(identityProperty?.type.external, undefined);
  });
});

it("should not set usage on original enum when parameter has alternateType", async () => {
  const { program, Test } = (await SimpleTester.compile(`
    @service
    @test namespace TestService {
      @test
      enum Test {
        default,
      }
      
      op test(@alternateType(string) @path p: Test): void;
    }
  `)) as {
    program: typeof SimpleTester extends { compile: (...args: any) => Promise<infer R> }
      ? R
      : never;
    Test: Enum;
  } & { program: any; Test: Enum };

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const models = context.sdkPackage.clients[0];
  const method = models.methods[0];
  strictEqual(method.name, "test");

  // The parameter should have string type, not Test enum
  const param = method.parameters[0];
  strictEqual(param.type.kind, "string");

  // The original Test enum should have None usage (0) since it's replaced
  const sdkEnum = context.__referencedTypeCache.get(Test);
  strictEqual(sdkEnum?.kind, "enum");
  strictEqual(sdkEnum.usage, UsageFlags.None, "Test enum should have None usage");
});

it("should not set usage on original model when parameter has alternateType", async () => {
  const { program, TestModel } = (await SimpleTester.compile(`
    @service
    @test namespace TestService {
      @test
      model TestModel {
        value: string;
      }
      
      op test(@alternateType(string) @body body: TestModel): void;
    }
  `)) as { program: any; TestModel: Model };

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const models = context.sdkPackage.clients[0];
  const method = models.methods[0];
  strictEqual(method.name, "test");

  // The parameter should have string type, not TestModel
  const param = method.parameters[0];
  strictEqual(param.type.kind, "string");

  // The original TestModel should have None usage (0) since it's replaced
  const sdkModel = context.__referencedTypeCache.get(TestModel);
  strictEqual(sdkModel?.kind, "model");
  strictEqual(sdkModel.usage, UsageFlags.None, "TestModel should have None usage");
});

it("should not set usage on original enum when inline alternateType is used", async () => {
  const { program, Status } = (await SimpleTester.compile(`
    @service
    @test namespace TestService {
      @test
      enum Status {
        Active,
        Inactive,
      }
      
      op test(@alternateType(string) @path status: Status): void;
    }
  `)) as { program: any; Status: Enum };

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const models = context.sdkPackage.clients[0];
  const method = models.methods[0];
  strictEqual(method.name, "test");

  // The parameter should have string type, not Status enum
  const param = method.parameters[0];
  strictEqual(param.type.kind, "string");

  // The original Status enum should have None usage (0) since it's replaced
  const sdkEnum = context.__referencedTypeCache.get(Status);
  strictEqual(sdkEnum?.kind, "enum");
  strictEqual(sdkEnum.usage, UsageFlags.None, "Status enum should have None usage");
});

it("applied to union", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    @alternateType(unknown)
    union Dfe<T> {
      T,
      int32,
    }

    @usage(Usage.input)
    /** Employee move response */
    model MoveResponse {
      /** The status of the move */
      movingStatus: Dfe<string>;
    }
    `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const models = getAllModels(context);
  const moveResponse = models.find((m) => m.name === "MoveResponse");
  strictEqual(moveResponse?.kind, "model");

  const movingStatusProperty = moveResponse?.properties.find((p) => p.name === "movingStatus");
  strictEqual(movingStatusProperty?.type.kind, "unknown");
});

it("applied to enum", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    @alternateType(unknown)
    enum StatusEnum {
      Active,
      Inactive,
      Pending,
    }

    @usage(Usage.input)
    /** Employee status model */
    model EmployeeStatus {
      /** The status of the employee */
      status: StatusEnum;
    }
    `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const models = getAllModels(context);
  const employeeStatus = models.find((m) => m.name === "EmployeeStatus");
  strictEqual(employeeStatus?.kind, "model");

  const statusProperty = employeeStatus?.properties.find((p) => p.name === "status");
  strictEqual(statusProperty?.type.kind, "unknown");
});

it("applied to model", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    @alternateType(unknown)
    model Address {
      street: string;
      city: string;
    }

    @usage(Usage.input)
    /** Employee info model */
    model EmployeeInfo {
      /** The address of the employee */
      address: Address;
    }
    `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const models = getAllModels(context);
  const employeeInfo = models.find((m) => m.name === "EmployeeInfo");
  strictEqual(employeeInfo?.kind, "model");

  const addressProperty = employeeInfo?.properties.find((p) => p.name === "address");
  strictEqual(addressProperty?.type.kind, "unknown");
});
