import { SyntaxKind } from "ts-morph";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { afterEach, expect, it } from "vitest";
import {
  emitModularModelsFromTypeSpec,
  emitSamplesFromTypeSpec,
} from "../../../test/util/emit-util.js";
import { clearCompileCache } from "../../../test/util/test-util.js";

afterEach(() => clearCompileCache());

it.each([
  ["circle", "round"],
  [0, "round"],
  ["circle", ""],
  ["circle", 'quo"ted'],
  ["circle", "back\\slash"],
])(
  "round-trips enum discriminator %j encoded as %j without losing subtype fields",
  async (value, wireValue) => {
    const models = await emitModularModelsFromTypeSpec(`
      enum ShapeKind {
        @encodedName("application/json", ${JSON.stringify(wireValue)})
        circle: ${JSON.stringify(value)},
      }
      @discriminator("kind")
      model Shape { kind: ShapeKind; }
      model Circle extends Shape { kind: ShapeKind.circle; radius: int32; }
      op send(@body body: Shape): Shape;
    `);
    expect(models).toBeDefined();
    const { outputText } = transpileModule(
      models!
        .getFunctions()
        .map((fn) => fn.getText())
        .join("\n"),
      { compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 } },
    );
    const serializers: Record<string, (item: unknown) => unknown> = {};
    new Function("exports", outputText)(serializers);
    expect(serializers.shapeUnionSerializer!({ kind: value, radius: 5 })).toEqual({
      kind: wireValue,
      radius: 5,
    });
    expect(serializers.shapeUnionDeserializer!({ kind: wireValue, radius: 5 })).toEqual({
      kind: value,
      radius: 5,
    });
  },
);

it.each(["circle", 0])("uses client enum values in request samples for %j", async (value) => {
  const [sample] = await emitSamplesFromTypeSpec(
    `
          enum ShapeKind {
            @encodedName("application/json", "round")
            circle: ${JSON.stringify(value)},
          }
          enum Color { @encodedName("application/json", "wire-blue") blue: "blue" }
          @discriminator("kind")
          model Shape { kind: ShapeKind; }
          model Circle extends Shape { kind: ShapeKind.circle; color: Color; radius: int32; }
          op send(@body body: Shape): void;
        `,
    [
      {
        filename: "send.json",
        rawContent: JSON.stringify({
          operationId: "send",
          title: "send",
          parameters: { body: { kind: "round", color: "wire-blue", radius: 5 } },
          responses: { "204": {} },
        }),
      },
    ],
  );
  expect(sample).toBeDefined();
  const properties = sample!.getDescendantsOfKind(SyntaxKind.PropertyAssignment);
  const kind = properties.find((property) => property.getName() === '"kind"');
  const color = properties.find((property) => property.getName() === '"color"');
  expect(kind).toBeDefined();
  expect(color).toBeDefined();
  expect(JSON.parse(kind!.getInitializerOrThrow().getText())).toBe(value);
  expect(JSON.parse(color!.getInitializerOrThrow().getText())).toBe("blue");
});

it.each([
  ["pet", "dog"],
  [0, 1],
])("keeps client discriminator types after hierarchy building with %j and %j", async (pet, dog) => {
  const models = await emitModularModelsFromTypeSpec(
    `
          enum Kind {
            @encodedName("application/json", "wire-pet") pet: ${JSON.stringify(pet)},
            @encodedName("application/json", "wire-dog") dog: ${JSON.stringify(dog)},
          }
          @discriminator("kind")
          model Animal { kind: Kind; }
          model Pet extends Animal { kind: Kind.pet; name: string; }
          @Azure.ClientGenerator.Core.Legacy.hierarchyBuilding(Pet)
          model Dog extends Animal { kind: Kind.dog; name: string; barks: boolean; }
          op send(@body body: Animal): Animal;
        `,
    { needTCGC: true },
  );
  expect(
    models!.getInterfaceOrThrow("Pet").getPropertyOrThrow('"kind"').getTypeNodeOrThrow().getText(),
  ).toBe(`${JSON.stringify(pet)} | ${JSON.stringify(dog)}`);
});
