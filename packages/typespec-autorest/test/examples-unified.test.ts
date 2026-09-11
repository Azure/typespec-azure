import {
  expectDiagnosticEmpty,
  resolveVirtualPath,
  type EmitterTesterInstance,
  type TestEmitterCompileResult,
} from "@typespec/compiler/testing";
import { beforeEach, describe, expect, it } from "vitest";
import type { OpenAPI2Document } from "../src/openapi2-document.js";
import { ignoreDiagnostics, Tester } from "./test-host.js";

let tester: EmitterTesterInstance<TestEmitterCompileResult>;

beforeEach(async () => {
  tester = await Tester.createInstance();
});

const versionedSpec = `
@versioned(Versions)
@service(#{title: "Widget Service"})
namespace WidgetService;

enum Versions {
  v1: "2023-01-01",
  v2: "2023-06-01",
}

model Widget {
  name: string;
}

@route("/widgets/{id}")
interface Widgets {
  @operationId("Widgets_Get")
  @get
  get(@path id: string, @query expand?: boolean): Widget;

  @operationId("Widgets_Create")
  @put
  create(@path id: string, @bodyRoot body: Widget): Widget;
}
`;

const versionedExamplesYaml = `
$namespace: WidgetService
Widgets.get:
  - request:
      path:
        id: "1"
      query:
        expand: true
    responses:
      200:
        body:
          name: base
  - since: "2023-06-01"
    request:
      path:
        id: "1"
    responses:
      200:
        body:
          name: v2
Widgets.create:
  - request:
      path:
        id: "1"
      body:
        name: created
    responses:
      200:
        body:
          name: created
`;

async function compileVersioned(
  examplesYaml: string | undefined,
  options: Record<string, unknown> = {},
): Promise<Record<string, OpenAPI2Document>> {
  if (examplesYaml !== undefined) {
    tester.fs.add(resolveVirtualPath("./examples.yaml"), examplesYaml);
  }
  const [{ outputs }, diagnostics] = await tester.compileAndDiagnose(versionedSpec, {
    compilerOptions: {
      options: {
        "@azure-tools/typespec-autorest": {
          "emitter-output-dir": resolveVirtualPath("./tsp-output"),
          ...options,
        },
      },
    },
  });
  expectDiagnosticEmpty(ignoreDiagnostics(diagnostics, ["@typespec/http/no-service-found"]));
  return {
    v1: JSON.parse(outputs["stable/2023-01-01/openapi.json"]),
    v2: JSON.parse(outputs["stable/2023-06-01/openapi.json"]),
  };
}

describe("unified examples format", () => {
  it("materializes legacy x-ms-examples from examples.yaml (auto-detected)", async () => {
    const { v1 } = await compileVersioned(versionedExamplesYaml);

    expect(v1.paths["/widgets/{id}"]?.get?.["x-ms-examples"]).toEqual({
      Widgets_Get: { $ref: "./examples/Widgets_Get.json" },
    });

    const file = JSON.parse(
      tester.fs.fs.get(
        resolveVirtualPath("./tsp-output/stable/2023-01-01/examples/Widgets_Get.json"),
      )!,
    );
    expect(file).toEqual({
      operationId: "Widgets_Get",
      title: "Widgets_Get",
      parameters: { "api-version": "2023-01-01", id: "1", expand: true },
      responses: { "200": { body: { name: "base" } } },
    });
  });

  it("preserves the original legacy file name and derives the key from it", async () => {
    const withFileName = `
$namespace: WidgetService
Widgets.get:
  - legacyFilename: Get_Widget_Original.json
    request:
      path:
        id: "1"
    responses:
      200:
        body:
          name: base
`;
    const { v1 } = await compileVersioned(withFileName);

    // With no explicit title, the x-ms-examples key defaults to the legacy file name (no ext).
    expect(v1.paths["/widgets/{id}"]?.get?.["x-ms-examples"]).toEqual({
      Get_Widget_Original: { $ref: "./examples/Get_Widget_Original.json" },
    });
    expect(
      tester.fs.fs.has(
        resolveVirtualPath("./tsp-output/stable/2023-01-01/examples/Get_Widget_Original.json"),
      ),
    ).toBe(true);
  });

  it("keeps an explicit title as the x-ms-examples key alongside the legacy file name", async () => {
    const withTitle = `
$namespace: WidgetService
Widgets.get:
  - title: Get a widget
    legacyFilename: Widgets_Get.json
    request:
      path:
        id: "1"
    responses:
      200:
        body:
          name: base
`;
    const { v1 } = await compileVersioned(withTitle);

    expect(v1.paths["/widgets/{id}"]?.get?.["x-ms-examples"]).toEqual({
      "Get a widget": { $ref: "./examples/Widgets_Get.json" },
    });
    const file = JSON.parse(
      tester.fs.fs.get(
        resolveVirtualPath("./tsp-output/stable/2023-01-01/examples/Widgets_Get.json"),
      )!,
    );
    expect(file.title).toBe("Get a widget");
  });

  it("disambiguates x-ms-examples keys when two variants derive the same title", async () => {
    const collidingYaml = `
$namespace: WidgetService
Widgets.get:
  - request:
      path:
        id: "1"
    responses:
      200:
        body:
          name: base
  - title: Widgets_Get
    request:
      path:
        id: "2"
    responses:
      200:
        body:
          name: explicit
`;
    const { v1 } = await compileVersioned(collidingYaml);

    // Both variants derive the title `Widgets_Get`; neither may be silently dropped.
    const examples = v1.paths["/widgets/{id}"]?.get?.["x-ms-examples"];
    expect(Object.keys(examples ?? {}).sort()).toEqual(["Widgets_Get", "Widgets_Get_2"]);
    for (const entry of Object.values(examples ?? {})) {
      expect(
        tester.fs.fs.has(resolveVirtualPath(`./tsp-output/stable/2023-01-01/${entry.$ref}`)),
      ).toBe(true);
    }
  });

  it("flattens the request body under the operation's body parameter name", async () => {
    await compileVersioned(versionedExamplesYaml);

    const file = JSON.parse(
      tester.fs.fs.get(
        resolveVirtualPath("./tsp-output/stable/2023-01-01/examples/Widgets_Create.json"),
      )!,
    );
    expect(file.parameters).toEqual({
      "api-version": "2023-01-01",
      id: "1",
      body: { name: "created" },
    });
    expect(file.responses).toEqual({ "200": { body: { name: "created" } } });
  });

  it("selects the applicable variant per API version using `since`", async () => {
    const { v2 } = await compileVersioned(versionedExamplesYaml);

    const v1File = JSON.parse(
      tester.fs.fs.get(
        resolveVirtualPath("./tsp-output/stable/2023-01-01/examples/Widgets_Get.json"),
      )!,
    );
    const v2File = JSON.parse(
      tester.fs.fs.get(
        resolveVirtualPath("./tsp-output/stable/2023-06-01/examples/Widgets_Get.json"),
      )!,
    );

    expect(v1File.parameters).toEqual({ "api-version": "2023-01-01", id: "1", expand: true });
    expect(v1File.responses).toEqual({ "200": { body: { name: "base" } } });

    // The v2 variant restates the shape without the query parameter and returns a new body.
    expect(v2File.parameters).toEqual({ "api-version": "2023-06-01", id: "1" });
    expect(v2File.responses).toEqual({ "200": { body: { name: "v2" } } });
    expect(v2.paths["/widgets/{id}"]?.get?.["x-ms-examples"]).toEqual({
      Widgets_Get: { $ref: "./examples/Widgets_Get.json" },
    });
  });

  it("writes materialized files even with skip-example-copying", async () => {
    await compileVersioned(versionedExamplesYaml, { "skip-example-copying": true });
    expect(
      tester.fs.fs.has(
        resolveVirtualPath("./tsp-output/stable/2023-01-01/examples/Widgets_Get.json"),
      ),
    ).toBe(true);
  });

  it("ignores examples.yaml when examples-format is `legacy`", async () => {
    const { v1 } = await compileVersioned(versionedExamplesYaml, { "examples-format": "legacy" });
    expect(v1.paths["/widgets/{id}"]?.get?.["x-ms-examples"]).toBeUndefined();
  });

  it("does not use the unified format when no examples.yaml is present", async () => {
    const { v1 } = await compileVersioned(undefined);
    expect(v1.paths["/widgets/{id}"]?.get?.["x-ms-examples"]).toBeUndefined();
  });
});
