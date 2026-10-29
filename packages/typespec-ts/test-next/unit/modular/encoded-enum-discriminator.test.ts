import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { afterEach, expect, it } from "vitest";
import { emitModularModelsFromTypeSpec } from "../../../test/util/emit-util.js";
import { clearCompileCache } from "../../../test/util/test-util.js";

afterEach(() => clearCompileCache());

it.each([
  ["circle", "round"],
  [0, "round"],
  ["circle", ""],
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
