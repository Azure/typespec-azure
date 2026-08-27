import { afterAll, describe, expect, it } from "vitest";
import { normalizeModelName } from "../../src/modular/emit-models.js";
import {
  generateAssertionsForValue,
  serializeExampleValue,
} from "../../src/modular/helpers/example-value-helpers.js";
import { getClientHierarchyMap } from "../../src/utils/client-utils.js";
import { getMethodHierarchiesMap } from "../../src/utils/operation-util.js";
import {
  emitModularClientFromTypeSpec,
  emitModularModelsFromTypeSpec,
  emitModularOperationsFromTypeSpec,
} from "../util/emit-util.js";
import {
  clearCompileCache,
  compileTypeSpecFor,
  createDpgContextTestHelper,
} from "../util/test-util.js";

const spec = `
  union OriginalEnum {
    string,
    #suppress "experimental-feature" "exact name test"
    @clientName(exact("enum_value"))
    originalValue: "original",
    #suppress "experimental-feature" "exact name test"
    @clientName(exact("enum-value"))
    punctuatedValue: "punctuated",
  }

  model OriginalModel {
    #suppress "experimental-feature" "exact name test"
    @clientName(exact("_my_name"))
    originalProperty: string;
    #suppress "experimental-feature" "exact name test"
    @clientName(exact("property-name"))
    punctuatedProperty: string;
    #suppress "experimental-feature" "exact name test"
    @clientName(exact("123"))
    numericProperty: string;
    #suppress "experimental-feature" "exact name test"
    @clientName(exact("property\\"name"))
    quotedProperty: string;
    originalEnum: OriginalEnum;
  }

  model StopParameters {
    value: string;
  }

  model OriginalDate {
    value: string;
  }

  #suppress "experimental-feature" "exact name test"
  @clientName(exact("my_operation"))
  @route("/test")
  @post
  op originalOperation(
    #suppress "experimental-feature" "exact name test"
    @clientName(exact("my_parameter"))
    @query originalParameter: string,
    #suppress "experimental-feature" "exact name test"
    @clientName(exact("optional_parameter"))
    @query optionalParameter?: string,
    #suppress "experimental-feature" "exact name test"
    @clientName(exact("endpoint"))
    @query originalEndpoint: string,
    #suppress "experimental-feature" "exact name test"
    @clientName(exact("my_operation"))
    @query matchingParameter: string,
    @body body: OriginalModel,
  ): OriginalModel;

  @route("/nested")
  @post
  op nestedOperation(
    body: {
      #suppress "experimental-feature" "exact name test"
      @clientName(exact("stop-parameters"))
      @bodyRoot stopParameters: StopParameters;
    },
  ): void;

  @route("/date")
  @post
  op useDate(@body body: OriginalDate): OriginalDate;

  #suppress "experimental-feature" "exact name test"
  @@clientName(OriginalModel, exact("my_model"));
  #suppress "experimental-feature" "exact name test"
  @@clientName(OriginalDate, exact("Date"));
`;

const groupedOperationSpec = `
  namespace Operations {
    #suppress "experimental-feature" "exact name test"
    @clientName(exact("my_operation"))
    @route("/test")
    @get
    op originalOperation(): void;

    #suppress "experimental-feature" "exact name test"
    @clientName(exact("class"))
    @route("/contextual")
    @get
    op contextualOperation(): void;
  }

  #suppress "experimental-feature" "exact name test"
  @@clientName(Operations, exact("my_group"));
`;

const exactClientSpec = `
  @route("/test")
  @get
  op test(): void;

  #suppress "experimental-feature" "exact name test"
  @@clientName(Azure.TypeScript.Testing, exact("my_client"));
`;

describe("TCGC exact names", () => {
  afterAll(clearCompileCache);

  it("preserves exact model, property, and enum value names", async () => {
    const models = await emitModularModelsFromTypeSpec(spec, {
      needTCGC: true,
      "experimental-extensible-enums": true,
    });
    const output = models!.getFullText();

    expect(output).toContain("export interface my_model");
    expect(output).toContain("export interface Date");
    expect(output).not.toContain("export interface DateModel");
    expect(output).toContain('"_my_name": string;');
    expect(output).toContain('"property-name": string;');
    expect(output).toContain('"123": string;');
    const quotedPropertyName = JSON.stringify('property"name');
    expect(output).toContain(`${quotedPropertyName}: string;`);
    expect(output).toContain('item["property-name"]');
    expect(output).toContain('item["123"]');
    expect(output).toContain(`item[${quotedPropertyName}]`);
    expect(output).toContain('enum_value = "original"');
    expect(output).toContain('"enum-value" = "punctuated"');
  });

  it("preserves exact operation and parameter names", async () => {
    const operations = await emitModularOperationsFromTypeSpec(spec, {
      needTCGC: true,
    });
    const output = operations![0]!.getFullText();

    expect(output).toContain("export async function my_operation(");
    expect(output).toContain("my_parameter: string");
    expect(output).toContain("endpoint: string");
    expect(output).toContain("my_operation: string");
    expect(output).not.toContain("my_operationParameter");
    expect(output).toContain("options?.optional_parameter");
    expect(output).toContain('body["stop-parameters"]');
  });

  it("preserves exact names in operation options", async () => {
    const options = await emitModularModelsFromTypeSpec(spec, {
      needTCGC: true,
      needOptions: true,
    });
    const output = options!.getFullText();

    expect(output).toContain("export interface my_operationOptionalParams");
    expect(output).toContain("optional_parameter?: string");
  });

  it("preserves an exact operation name on the classic client", async () => {
    const client = await emitModularClientFromTypeSpec(spec, { needTCGC: true });

    expect(client!.getFullText()).toContain("my_operation(");
  });

  it("preserves an exact operation name in a classic operation group", async () => {
    const client = await emitModularClientFromTypeSpec(groupedOperationSpec, { needTCGC: true });
    const classicOperations = client!
      .getProject()
      .getSourceFiles()
      .filter((file) => file.getFilePath().includes("/classic/"))
      .map((file) => file.getFullText())
      .join("\n");
    const apiOperations = client!
      .getProject()
      .getSourceFiles()
      .filter((file) => file.getFilePath().includes("/api/"))
      .map((file) => file.getFullText())
      .join("\n");

    expect(classicOperations).toContain("my_operation:");
    expect(classicOperations).toContain("class:");
    expect(apiOperations).toContain("export async function $class(");
    expect(client!.getFullText()).toContain("readonly my_group:");
  });

  it("preserves an exact client name", async () => {
    const client = await emitModularClientFromTypeSpec(exactClientSpec, { needTCGC: true });

    expect(client!.getFullText()).toContain("export class my_client");
  });

  it("maps wire example keys to escaped exact client property names", () => {
    const propertyName = 'property"name';
    const value = {
      kind: "model",
      type: {
        kind: "model",
        properties: [
          {
            kind: "property",
            name: propertyName,
            isExactName: true,
            visibility: [],
            serializationOptions: { json: { name: "wireName" } },
          },
        ],
      },
      value: {
        wireName: { kind: "string", type: { kind: "string" }, value: "test" },
      },
    } as any;

    expect(serializeExampleValue(value)).toContain(`${JSON.stringify(propertyName)}: "test"`);
    expect(generateAssertionsForValue(value, "result")).toContain(
      `assert.strictEqual(result[${JSON.stringify(propertyName)}], "test");`,
    );
  });

  it("warns when an invalid exact declaration name is emitted", async () => {
    const { program } = await compileTypeSpecFor(`
      #suppress "experimental-feature" "exact name test"
      @clientName(exact("invalid-name"))
      @route("/test")
      @get
      op test(
        #suppress "experimental-feature" "exact name test"
        @clientName(exact("invalid-param"))
        @query param: string,
      ): void;

      #suppress "experimental-feature" "exact name test"
      @clientName(exact("123operation"))
      @route("/numeric")
      @get
      op numericOperation(): void;

      #suppress "experimental-feature" "exact name test"
      @clientName(exact("class"))
      model InvalidModel {}

      @route("/model")
      @post
      op useInvalidModel(@body body: InvalidModel): void;

      #suppress "experimental-feature" "exact name test"
      @@clientName(Azure.TypeScript.Testing, exact("invalid-client"));
    `);

    const context = await createDpgContextTestHelper(program);

    expect(
      program.diagnostics.filter((x) => x.code === "@azure-tools/typespec-ts/invalid-exact-name"),
    ).toHaveLength(0);

    for (const [, client] of getClientHierarchyMap(context)) {
      getMethodHierarchiesMap(context, client);
      getMethodHierarchiesMap(context, client);
    }
    for (const model of context.sdkPackage.models) {
      normalizeModelName(context, model);
      normalizeModelName(context, model);
    }

    const warnings = program.diagnostics.filter(
      (x) => x.code === "@azure-tools/typespec-ts/invalid-exact-name",
    );
    expect(warnings).toHaveLength(5);
    expect(warnings.every((diagnostic) => diagnostic.severity === "warning")).toBe(true);
  });
});
