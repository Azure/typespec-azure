import { deepStrictEqual, strictEqual } from "assert";
import { describe, it } from "vitest";
import { openApiFor } from "./test-host.js";

interface ProducesConsumes {
  globalProduces: string[];
  globalConsumes: string[];
  operations: Map<string, OperationResult>;
}

interface ProducesConsumesOperation {
  path: string;
  namespace: string;
  type: "produces" | "consumes";
  modelDef: string;
  modelName: string;
}

interface OperationResult {
  path: string;
  produces?: string[];
  consumes?: string[];
}

describe("typespec-autorestcanonical: produces/consumes", () => {
  it("produces global produces for simple json", async () => {
    const result = await openApiForProducesConsumes([
      {
        path: "/",
        namespace: "root",
        type: "produces",
        modelDef: `
        model simple {
          name: string;
        }
        `,
        modelName: "simple",
      },
    ]);

    strictEqual(result.globalProduces[0], "application/json");
    deepStrictEqual(result.operations.get("/")?.produces, undefined);
    deepStrictEqual(result.operations.get("/")?.consumes, undefined);
  });
  it("produces global consumes for simple json", async () => {
    const result = await openApiForProducesConsumes([
      {
        path: "/",
        namespace: "root",
        type: "consumes",
        modelDef: `
        model simple {
          name: string;
        }
        `,
        modelName: "simple",
      },
    ]);

    strictEqual(result.globalConsumes[0], "application/json");
    deepStrictEqual(result.operations.get("/")?.produces, undefined);
    deepStrictEqual(result.operations.get("/")?.consumes, undefined);
  });
  it("produces individual produces/consumes if differences in methods", async () => {
    const result = await openApiForProducesConsumes([
      {
        path: "/in",
        namespace: "input",
        type: "consumes",
        modelDef: `
        model simpleParam {
          @header "content-type": "application/json";
          name: string;
        }
        `,
        modelName: "simpleParam",
      },
      {
        path: "/out",
        namespace: "output",
        type: "produces",
        modelDef: `
        model simpleOutput {
          @header "content-type": "text/json";
          name: string;
        }
        `,
        modelName: "simpleOutput",
      },
    ]);

    strictEqual(result.globalConsumes[0], "application/json");
    deepStrictEqual(result.operations.get("/in")?.produces, undefined);
    deepStrictEqual(result.operations.get("/in")?.consumes, undefined);
    strictEqual(result.operations.get("/out")!.produces![0], "text/json");
    strictEqual(result.operations.get("/out")?.consumes, undefined);
  });
});

async function openApiForProducesConsumes(
  configuration: ProducesConsumesOperation[]
): Promise<ProducesConsumes> {
  const apiDoc: string[] = createAdlFromConfig(configuration);

  const input = apiDoc.join("\n");
  const openApi = await openApiFor(`@service({title: "Test"}) namespace Test; ${input}`);
  const output = {
    globalProduces: openApi.produces as string[],
    globalConsumes: openApi.consumes,
    operations: new Map<string, OperationResult>(),
  };

  configuration.forEach((config) => {
    const opName = config.type === "consumes" ? "delete" : "get";
    const opPath = openApi.paths[config.path];
    output.operations.set(config.path, {
      path: config.path,
      produces: opPath[opName].produces,
      consumes: opPath[opName].consumes,
    });
  });

  return output;
}

function createAdlFromConfig(configuration: ProducesConsumesOperation[]): string[] {
  const apiDoc: string[] = [];
  configuration.forEach((config) => {
    const opString =
      config.type === "consumes"
        ? `@delete op remove(@body payload : ${config.modelName}) : NoContentResponse;`
        : `@get op read() : ${config.modelName};`;
    const doc = `
    ${config.modelDef}
    @route("${config.path}")
    namespace ${config.namespace} {
      ${opString}
    }
  `;
    apiDoc.push(doc);
  });

  return apiDoc;
}
