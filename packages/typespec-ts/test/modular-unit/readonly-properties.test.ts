import { Project } from "ts-morph";
import { afterAll, expect, it } from "vitest";
import { emitModularModelsFromTypeSpec } from "../util/emit-util.js";
import { clearCompileCache } from "../util/test-util.js";

afterAll(clearCompileCache);

const models = `
  model SomeNestedThing {
    nests: int32;
    @visibility(Lifecycle.Read)
    hiddenNests: string;
  }

  model FullModel {
    @visibility(Lifecycle.Read)
    id: string;
    name: string;
    nested: SomeNestedThing;
  }
`;

it("allows create bodies to omit read-only properties at every nesting level", async () => {
  const result = await emitModularModelsFromTypeSpec(`
    ${models}
    @parameterVisibility(Lifecycle.Create)
    @route("/save")
    op save(@body b: FullModel): FullModel;
  `);

  expect(
    result.getInterfaceOrThrow("FullModel").getPropertyOrThrow('"id"').hasQuestionToken(),
  ).toBe(true);
  expect(
    result
      .getInterfaceOrThrow("SomeNestedThing")
      .getPropertyOrThrow('"hiddenNests"')
      .hasQuestionToken(),
  ).toBe(true);
  expect(result.getFunctionOrThrow("someNestedThingSerializer").getText()).not.toContain(
    "hiddenNests",
  );
  expect(result.getFunctionOrThrow("someNestedThingDeserializer").getText()).toContain(
    '"hiddenNests": item["hiddenNests"]',
  );

  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { strict: true },
  });
  project.createSourceFile(
    "models.ts",
    `${result.getFullText()}
     const body: FullModel = { name: "example", nested: { nests: 1 } };
     const nested: SomeNestedThing = body.nested;`,
  );
  expect(project.getPreEmitDiagnostics()).toEqual([]);
});

it.each([
  ["array", "SomeNestedThing[]"],
  ["dictionary", "Record<SomeNestedThing>"],
  ["nullable", "SomeNestedThing | null"],
  ["union", "SomeNestedThing | string"],
])("makes read-only properties optional inside a request %s", async (_, propertyType) => {
  const result = await emitModularModelsFromTypeSpec(`
    ${models}
    model Envelope {
      value: ${propertyType};
    }
    @post op save(@body body: Envelope): Envelope;
  `);

  const nested = result.getInterfaceOrThrow("SomeNestedThing");
  expect(nested.getPropertyOrThrow('"hiddenNests"').hasQuestionToken()).toBe(true);
  expect(nested.getPropertyOrThrow('"hiddenNests"').isReadonly()).toBe(true);
  expect(nested.getPropertyOrThrow('"nests"').hasQuestionToken()).toBe(false);
});

it("handles inherited and recursive request models", async () => {
  const result = await emitModularModelsFromTypeSpec(`
    model Base {
      @visibility(Lifecycle.Read)
      id: string;
    }
    model Node extends Base {
      @visibility(Lifecycle.Read)
      revision: string;
      child?: Node;
      value: string;
    }
    @post op save(@body body: Node): Node;
  `);

  expect(result.getInterfaceOrThrow("Base").getPropertyOrThrow('"id"').hasQuestionToken()).toBe(
    true,
  );
  expect(
    result.getInterfaceOrThrow("Node").getPropertyOrThrow('"revision"').hasQuestionToken(),
  ).toBe(true);
  expect(result.getInterfaceOrThrow("Node").getPropertyOrThrow('"value"').hasQuestionToken()).toBe(
    false,
  );
});

it("preserves required read-only properties on response-only models", async () => {
  const result = await emitModularModelsFromTypeSpec(`
    ${models}
    @get op read(): FullModel;
  `);

  expect(
    result.getInterfaceOrThrow("FullModel").getPropertyOrThrow('"id"').hasQuestionToken(),
  ).toBe(false);
  expect(
    result
      .getInterfaceOrThrow("SomeNestedThing")
      .getPropertyOrThrow('"hiddenNests"')
      .hasQuestionToken(),
  ).toBe(false);
});

it("preserves required response properties when visibility splitting is enabled", async () => {
  const result = await emitModularModelsFromTypeSpec(
    `
      ${models}
      @post op save(@body body: FullModel): FullModel;
    `,
    { experimentalSplitModelsByVisibility: true },
  );

  expect(
    result.getInterfaceOrThrow("FullModel").getPropertyOrThrow('"id"').hasQuestionToken(),
  ).toBe(false);
  expect(
    result
      .getInterfaceOrThrow("SomeNestedThing")
      .getPropertyOrThrow('"hiddenNests"')
      .hasQuestionToken(),
  ).toBe(false);
  expect(result.getInterfaceOrThrow("FullModelCreate").getProperty('"id"')).toBeUndefined();
  expect(
    result.getInterfaceOrThrow("SomeNestedThingCreate").getProperty('"hiddenNests"'),
  ).toBeUndefined();
});

it("makes read-only properties optional in anonymous nested request models", async () => {
  const result = await emitModularModelsFromTypeSpec(`
    model Envelope {
      nested: {
        @visibility(Lifecycle.Read)
        id: string;
        value: string;
      };
    }
    @post op save(@body body: Envelope): Envelope;
  `);

  expect(
    result
      .getInterfaceOrThrow("Envelope")
      .getPropertyOrThrow('"nested"')
      .getTypeNodeOrThrow()
      .getText(),
  ).toContain('"id"?: string');
});

it("preserves nullable read-only values on shared models", async () => {
  const result = await emitModularModelsFromTypeSpec(`
    model Widget {
      @visibility(Lifecycle.Read)
      id: string | null;
      name: string;
    }
    @post op save(@body body: Widget): Widget;
  `);

  const id = result.getInterfaceOrThrow("Widget").getPropertyOrThrow('"id"');
  expect(id.hasQuestionToken()).toBe(true);
  expect(id.getTypeNodeOrThrow().getText()).toContain("null");
});
