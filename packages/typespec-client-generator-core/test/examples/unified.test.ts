import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, it, vi } from "vitest";
import type {
  SdkHttpOperation,
  SdkMethod,
  SdkServiceMethod,
  SdkServiceOperation,
} from "../../src/interfaces.js";
import {
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
  SimpleTester,
} from "../tester.js";

const spec = `
  @service
  @versioned(Versions)
  namespace Test;
  enum Versions { v1, v2, v3 }
  model Widget { name: string; }
  interface Widgets {
    @post @route("/widgets/{id}")
    op create(
      @path id: string,
      @query("api-version") apiVersion: Versions,
      @header("x-region") region: string,
      @body payload: Widget,
    ): {
      @statusCode code: 200;
      @header etag: string;
      @body body: Widget;
    };
  }
`;

const example = `
Widgets.create:
  - title: Create widget
    request:
      path:
        id: example
      headers:
        x-region: west
      body:
        name: widget-{api-version}
    responses:
      200:
        headers:
          etag: tag
        body:
          name: result-{api-version}
`;

const simpleSpec = `
  @service namespace Test;
  interface Widgets { @get op get(): string; }
`;

const simpleExample = `
Widgets.get:
  - request: {}
    responses:
      200:
        body: result
`;

function httpMethod(method: SdkMethod<SdkServiceOperation>): SdkServiceMethod<SdkHttpOperation> {
  strictEqual(method.operation.kind, "http");
  return method;
}

describe("unified examples", () => {
  it("does not load examples when no clients are generated", async () => {
    const { program } = await SimpleTester.compile("model Unused {}");
    const context = await createSdkContextForTester(program, { "examples-dir": "./missing" });
    strictEqual(context.sdkPackage.clients.length, 0);
    expectDiagnostics(context.diagnostics, []);
  });

  it("maps resolved request and response values through the existing example pipeline", async () => {
    const instance = await SimpleTester.createInstance();
    instance.fs.addTypeSpecFile("examples.yaml", example);
    const { program } = await instance.compile(spec);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const method = httpMethod(context.sdkPackage.clients[0].children![0].methods[0]);
    const examples = method.operation.examples;
    ok(examples);
    strictEqual(examples.length, 1);
    const loaded = examples[0];
    strictEqual(loaded.name, "Create widget");
    strictEqual(loaded.doc, "Create widget");
    strictEqual(loaded.filePath, "examples.yaml");
    deepStrictEqual(loaded.rawExample, {
      title: "Create widget",
      operationId: "Widgets_create",
      parameters: {
        "api-version": "v3",
        id: "example",
        "x-region": "west",
        payload: { name: "widget-v3" },
      },
      responses: { "200": { headers: { etag: "tag" }, body: { name: "result-v3" } } },
    });
    strictEqual(loaded.parameters.length, 4);
    strictEqual(loaded.parameters.find((p) => p.parameter.kind === "body")?.value.kind, "model");
    strictEqual(loaded.responses[0].statusCode, 200);
    strictEqual(loaded.responses[0].headers[0].value.value, "tag");
    strictEqual(loaded.responses[0].bodyValue?.kind, "model");
    strictEqual(context.__httpOperationExamples.get(method.operation.__raw), examples);
  });

  it.each(["examples/Widgets.yaml", "examples/Widgets.yml"])(
    "loads unversioned examples from %s without inventing an api-version parameter",
    async (path) => {
      const instance = await SimpleTester.createInstance();
      instance.fs.addTypeSpecFile(path, simpleExample);
      const { program } = await instance.compile(simpleSpec);
      const context = await createSdkContextForTester(program);
      expectDiagnostics(context.diagnostics, []);
      const loaded = httpMethod(context.sdkPackage.clients[0].children![0].methods[0]).operation
        .examples![0];
      strictEqual(loaded.filePath, path);
      strictEqual(loaded.name, "Widgets_get");
      deepStrictEqual(loaded.rawExample.parameters, {});
      strictEqual(loaded.responses[0].bodyValue?.value, "result");
    },
  );

  it("produces the same typed values as equivalent legacy JSON", async () => {
    const instance = await SimpleTester.createInstance();
    instance.fs.addTypeSpecFile("examples.yaml", example);
    instance.fs.addTypeSpecFile(
      "examples/v3/create.json",
      JSON.stringify({
        title: "Create widget",
        operationId: "Widgets_create",
        parameters: {
          "api-version": "v3",
          id: "example",
          "x-region": "west",
          payload: { name: "widget-v3" },
        },
        responses: { "200": { headers: { etag: "tag" }, body: { name: "result-v3" } } },
      }),
    );
    const { program } = await instance.compile(spec);
    const unified = await createSdkContextForTester(program);
    const legacy = await createSdkContextForTester(program, { "examples-dir": "./examples" });
    expectDiagnostics(unified.diagnostics, []);
    expectDiagnostics(legacy.diagnostics, []);
    const unifiedExample = httpMethod(unified.sdkPackage.clients[0].children![0].methods[0])
      .operation.examples![0];
    const legacyExample = httpMethod(legacy.sdkPackage.clients[0].children![0].methods[0]).operation
      .examples![0];
    deepStrictEqual(unifiedExample.rawExample, legacyExample.rawExample);
    deepStrictEqual(
      unifiedExample.parameters.map((p) => [
        p.parameter.serializedName,
        p.value.kind,
        p.value.value,
      ]),
      legacyExample.parameters.map((p) => [
        p.parameter.serializedName,
        p.value.kind,
        p.value.value,
      ]),
    );
    deepStrictEqual(
      unifiedExample.responses.map((r) => [r.statusCode, r.bodyValue?.value]),
      legacyExample.responses.map((r) => [r.statusCode, r.bodyValue?.value]),
    );
  });

  it("uses the actual API-version wire parameter name", async () => {
    const instance = await SimpleTester.createInstance();
    instance.fs.addTypeSpecFile("examples.yaml", example);
    const { program } = await instance.compile(
      spec.replace('@query("api-version")', '@query("version")'),
    );
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const loaded = httpMethod(context.sdkPackage.clients[0].children![0].methods[0]).operation
      .examples![0];
    strictEqual(loaded.rawExample.parameters.version, "v3");
    strictEqual(loaded.rawExample.parameters["api-version"], undefined);
  });

  it.each([
    ["v1", "base"],
    ["v2", "second"],
    ["latest", "third"],
    ["all", "third"],
  ])("selects the correct lineage variant for %s", async (version, expected) => {
    const instance = await SimpleTester.createInstance();
    instance.fs.addTypeSpecFile(
      "examples.yaml",
      `
Widgets.get:
  - request: {}
    responses: {200: {body: base}}
  - since: "v2"
    request: {}
    responses: {200: {body: second}}
  - since: "v3"
    request: {}
    responses: {200: {body: third}}
`,
    );
    const { program } = await instance.compile(`
      @service @versioned(Versions) namespace Test;
      enum Versions { v1, v2, v3 }
      interface Widgets { @get op get(): string; }
    `);
    const context = await createSdkContextForTester(program, { "api-version": version });
    expectDiagnostics(context.diagnostics, []);
    const loaded = httpMethod(context.sdkPackage.clients[0].children![0].methods[0]).operation
      .examples![0];
    strictEqual(loaded.responses[0].bodyValue?.value, expected);
  });

  it("keeps independent title lineages and omits future examples", async () => {
    const instance = await SimpleTester.createInstance();
    instance.fs.addTypeSpecFile(
      "examples.yaml",
      `
Widgets.get:
  - title: First
    request: {}
    responses: {200: {body: first}}
  - title: Second
    request: {}
    responses: {200: {body: second}}
  - title: Future
    since: "v3"
    request: {}
    responses: {200: {body: future}}
`,
    );
    const { program } = await instance.compile(`
      @service @versioned(Versions) namespace Test;
      enum Versions { v1, v2, v3 }
      interface Widgets { @get op get(): string; }
    `);
    const context = await createSdkContextForTester(program, { "api-version": "v2" });
    expectDiagnostics(context.diagnostics, []);
    const loaded = httpMethod(context.sdkPackage.clients[0].children![0].methods[0]).operation
      .examples!;
    deepStrictEqual(
      loaded.map((item) => item.name),
      ["First", "Second"],
    );
  });

  it("prefers YAML for a service but preserves an explicit examples-dir override", async () => {
    const instance = await SimpleTester.createInstance();
    instance.fs.addTypeSpecFile("examples.yaml", simpleExample);
    instance.fs.addTypeSpecFile(
      "examples/get.json",
      JSON.stringify({
        operationId: "Widgets_get",
        title: "Legacy",
        responses: { "200": { body: "legacy" } },
      }),
    );
    const { program } = await instance.compile(simpleSpec);
    const automatic = await createSdkContextForTester(program);
    strictEqual(
      httpMethod(automatic.sdkPackage.clients[0].children![0].methods[0]).operation.examples![0]
        .name,
      "Widgets_get",
    );
    const legacy = await createSdkContextForTester(program, { "examples-dir": "./examples" });
    expectDiagnostics(legacy.diagnostics, []);
    strictEqual(
      httpMethod(legacy.sdkPackage.clients[0].children![0].methods[0]).operation.examples![0].name,
      "Legacy",
    );
  });

  it("falls back to legacy JSON when unified examples are absent", async () => {
    const instance = await SimpleTester.createInstance();
    instance.fs.addTypeSpecFile(
      "examples/get.json",
      JSON.stringify({
        operationId: "Widgets_get",
        title: "Legacy",
        responses: { "200": { body: "legacy" } },
      }),
    );
    const { program } = await instance.compile(simpleSpec);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const loaded = httpMethod(context.sdkPackage.clients[0].children![0].methods[0]).operation
      .examples![0];
    strictEqual(loaded.name, "Legacy");
    strictEqual(loaded.filePath, "get.json");
    strictEqual(loaded.responses[0].bodyValue?.value, "legacy");
  });

  it("honors operationId and language-independent client customization", async () => {
    const instance = await SimpleBaseTester.createInstance();
    instance.fs.addTypeSpecFile(
      "examples.yaml",
      simpleExample.replace("Widgets.get", "Custom.fetch"),
    );
    const { program } = await instance.compile(`
      import "@typespec/http";
      import "@typespec/openapi";
      import "@azure-tools/typespec-client-generator-core";
      using Http;
      using Azure.ClientGenerator.Core;
      @service namespace Test;
      interface Widgets {
        @TypeSpec.OpenAPI.operationId("Custom_Fetch")
        @clientName("renamed", "python")
        @get op get(): string;
      }
    `);
    const context = await createSdkContextForTester(program, { emitterName: "python" });
    expectDiagnostics(context.diagnostics, []);
    const loaded = httpMethod(context.sdkPackage.clients[0].children![0].methods[0]).operation
      .examples![0];
    strictEqual(loaded.rawExample.operationId, "Custom_Fetch");
    strictEqual(loaded.responses[0].bodyValue?.value, "result");
  });

  it("follows customized source operations", async () => {
    const instance = await SimpleBaseTester.createInstance();
    instance.fs.addTypeSpecFile("examples.yaml", simpleExample);
    const { program } = await instance.compile(
      createClientCustomizationInput(
        simpleSpec,
        `@client({name: "CustomClient", service: Test})
       namespace Customizations { op renamed is Test.Widgets.get; }`,
      ),
    );
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    strictEqual(
      httpMethod(context.sdkPackage.clients[0].methods[0]).operation.examples![0].rawExample
        .operationId,
      "Widgets_get",
    );
  });

  it("isolates the same operation key in multiple services with different target versions", async () => {
    const instance = await SimpleBaseTester.createInstance();
    for (const service of ["A", "B"]) {
      instance.fs.addTypeSpecFile(
        `${service}/examples.yaml`,
        `
$namespace: Test.${service}
Widgets.get:
  - request: {}
    responses: {200: {body: "${service}-base"}}
  - since: "v2"
    request: {}
    responses: {200: {body: "${service}-v2"}}
`,
      );
    }
    const { program } = await instance.compile(
      createClientCustomizationInput(
        `
      @service @versioned(Versions) namespace Test.A {
        enum Versions { v1, v2 }
        interface Widgets { @route("/a") @get op get(): string; }
      }
      @service @versioned(Versions) namespace Test.B {
        enum Versions { v1, v2 }
        interface Widgets { @route("/b") @get op get(): string; }
      }
    `,
        `
      @client({name: "Combined", service: [Test.A, Test.B], autoMergeService: true})
      namespace Combined {}
    `,
      ),
    );
    const context = await createSdkContextForTester(program, {
      "api-version": { Test: { A: "v1", B: "v2" } },
    });
    const methods = context.sdkPackage.clients[0]
      .children!.flatMap((client) => client.methods)
      .map(httpMethod);
    const byPath = new Map(
      methods.map((method) => [method.operation.path, method.operation.examples![0]]),
    );
    strictEqual(byPath.get("/a")?.responses[0].bodyValue?.value, "A-base");
    strictEqual(byPath.get("/b")?.responses[0].bodyValue?.value, "B-v2");
    strictEqual(byPath.get("/a")?.filePath, "A/examples.yaml");
    strictEqual(byPath.get("/b")?.filePath, "B/examples.yaml");
  });

  it("loads unified and legacy examples independently for different services", async () => {
    const instance = await SimpleBaseTester.createInstance();
    instance.fs.addTypeSpecFile(
      "A/examples.yaml",
      `
$namespace: Test.A
Widgets.get:
  - request: {}
    responses: {200: {body: "A-base"}}
  - since: "v2"
    request: {}
    responses: {200: {body: "A-v2"}}
`,
    );
    instance.fs.addTypeSpecFile(
      "B/examples/v2/get.json",
      JSON.stringify({
        operationId: "Widgets_get",
        title: "B-v2",
        responses: { "200": { body: "B-v2" } },
      }),
    );
    const { program } = await instance.compile(
      createClientCustomizationInput(
        `
      @service @versioned(Versions) namespace Test.A {
        enum Versions { v1, v2 }
        @clientName("AWidgets", "python")
        interface Widgets { @route("/a") @get op get(): string; }
      }
      @service @versioned(Versions) namespace Test.B {
        enum Versions { v1, v2 }
        @clientName("BWidgets", "python")
        interface Widgets { @route("/b") @get op get(): string; }
      }
    `,
        `
      @client({name: "Combined", service: [Test.A, Test.B], autoMergeService: true})
      namespace Combined {}
    `,
      ),
    );
    const context = await createSdkContextForTester(program, {
      "api-version": { Test: { A: "v1", B: "v2" } },
    });
    expectDiagnostics(context.diagnostics, []);
    const methods = context.sdkPackage.clients[0]
      .children!.flatMap((client) => client.methods)
      .map(httpMethod);
    const byPath = new Map(
      methods.map((method) => [method.operation.path, method.operation.examples![0]]),
    );
    strictEqual(byPath.get("/a")?.name, "Widgets_get");
    strictEqual(byPath.get("/a")?.responses[0].bodyValue?.value, "A-base");
    strictEqual(byPath.get("/a")?.filePath, "A/examples.yaml");
    strictEqual(byPath.get("/b")?.name, "B-v2");
    strictEqual(byPath.get("/b")?.responses[0].bodyValue?.value, "B-v2");
    strictEqual(byPath.get("/b")?.filePath, "v2/get.json");
  });

  it.each(["Widgets.get", "Renamed.fetch"])(
    "matches %s across language-specific client names and locations",
    async (key) => {
      const instance = await SimpleTester.createInstance();
      instance.fs.addTypeSpecFile("examples.yaml", simpleExample.replace("Widgets.get", key));
      const { program } = await instance.compile(`
      @service namespace Test;
      @clientName("Renamed")
      interface Widgets {
        @clientName("fetch")
        @clientLocation("PythonWidgets", "python")
        @get op get(): string;
      }
    `);
      const context = await createSdkContextForTester(program, { emitterName: "python" });
      expectDiagnostics(context.diagnostics, []);
      const loaded = context.sdkPackage.clients[0]
        .children!.flatMap((client) => client.methods)
        .map(httpMethod)
        .flatMap((method) => method.operation.examples ?? []);
      strictEqual(loaded.length, 1);
      strictEqual(loaded[0].responses[0].bodyValue?.value, "result");
    },
  );

  it("preserves a migrated legacy filename as the default title", async () => {
    const instance = await SimpleTester.createInstance();
    instance.fs.addTypeSpecFile(
      "examples.yaml",
      simpleExample.replace("- request:", "- legacyFilename: GetWidgetExample.json\n    request:"),
    );
    const { program } = await instance.compile(simpleSpec);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const loaded = httpMethod(context.sdkPackage.clients[0].children![0].methods[0]).operation
      .examples![0];
    strictEqual(loaded.name, "GetWidgetExample");
    strictEqual(loaded.filePath, "examples.yaml");
  });

  it("preserves title collisions after legacy normalization like AutoRest", async () => {
    const instance = await SimpleTester.createInstance();
    instance.fs.addTypeSpecFile(
      "examples.yaml",
      `${simpleExample}
  - title: Widgets_get
    request: {}
    responses: {200: {body: other}}
`,
    );
    const { program } = await instance.compile(simpleSpec);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const loaded = httpMethod(context.sdkPackage.clients[0].children![0].methods[0]).operation
      .examples!;
    deepStrictEqual(
      loaded.map((item) => item.name),
      ["Widgets_get", "Widgets_get_2"],
    );
    deepStrictEqual(
      loaded.map((item) => item.rawExample.title),
      ["Widgets_get", "Widgets_get"],
    );
  });

  it("matches unified operation keys with the same casing as AutoRest", async () => {
    const instance = await SimpleTester.createInstance();
    instance.fs.addTypeSpecFile(
      "examples.yaml",
      simpleExample.replace("Widgets.get", "widgets.get"),
    );
    const { program } = await instance.compile(simpleSpec);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    strictEqual(
      httpMethod(context.sdkPackage.clients[0].children![0].methods[0]).operation.examples,
      undefined,
    );
  });

  it("rejects operations split across files using shared placement validation", async () => {
    const instance = await SimpleTester.createInstance();
    instance.fs.addTypeSpecFile("examples.yaml", simpleExample);
    instance.fs.addTypeSpecFile("examples/Widgets.yaml", simpleExample);
    const { program } = await instance.compile(simpleSpec);
    const context = await createSdkContextForTester(program);
    ok(
      context.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "@azure-tools/typespec-client-generator-core/example-loading",
      ),
    );
    strictEqual(
      httpMethod(context.sdkPackage.clients[0].children![0].methods[0]).operation.examples,
      undefined,
    );
  });

  it.each([
    ["invalid YAML", "Widgets.get: ["],
    ["invalid structure", "Widgets.get: [{request: false, responses: {}}]"],
    ["unknown version", simpleExample.replace("- request:", '- since: "v4"\n    request:')],
    ["wrong namespace", `$namespace: Other\n${simpleExample}`],
    ["unversioned placeholder", simpleExample.replace("body: result", 'body: "{api-version}"')],
  ])("reports %s without falling back to legacy files", async (_, yaml) => {
    const instance = await SimpleTester.createInstance();
    instance.fs.addTypeSpecFile("examples.yaml", yaml);
    instance.fs.addTypeSpecFile(
      "examples/get.json",
      JSON.stringify({
        operationId: "Widgets_get",
        title: "Legacy",
        responses: {},
      }),
    );
    const { program } = await instance.compile(simpleSpec);
    const context = await createSdkContextForTester(program);
    ok(
      context.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "@azure-tools/typespec-client-generator-core/example-loading",
      ),
    );
    strictEqual(
      httpMethod(context.sdkPackage.clients[0].children![0].methods[0]).operation.examples,
      undefined,
    );
  });

  it("retains typed-value diagnostics after shared resolution", async () => {
    const instance = await SimpleTester.createInstance();
    instance.fs.addTypeSpecFile(
      "examples.yaml",
      simpleExample.replace("body: result", "body: 123"),
    );
    const { program } = await instance.compile(simpleSpec);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
    });
  });

  it("reports unreadable YAML instead of failing SDK generation", async () => {
    const instance = await SimpleTester.createInstance();
    instance.fs.addTypeSpecFile("examples.yaml", simpleExample);
    const { program } = await instance.compile(simpleSpec);
    const readFile = program.host.readFile.bind(program.host);
    const mock = vi.spyOn(program.host, "readFile").mockImplementation((path) => {
      if (path.endsWith("/examples.yaml")) {
        return Promise.reject(new Error("Cannot read examples"));
      }
      return readFile(path);
    });
    const context = await createSdkContextForTester(program);
    mock.mockRestore();
    expectDiagnostics(context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/example-loading",
      message: /Cannot read examples/,
    });
  });
});
