import { resolvePath } from "@typespec/compiler";
import { resolveVirtualPath } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { beforeAll, it } from "vitest";
import { AzureTester } from "./test-host.js";

const rule = "@azure-tools/typespec-azure-resource-manager/arm-patch-operation-response-codes";

interface EmittedOperation {
  responses: Record<string, { schema?: unknown }>;
  [key: string]: unknown;
}

interface EmittedDocument {
  paths: Record<string, { patch?: EmittedOperation }>;
  "x-ms-paths"?: Record<string, { patch?: EmittedOperation }>;
}

let runner: Awaited<ReturnType<typeof AzureTester.createInstance>>;

beforeAll(async () => {
  runner = await AzureTester.createInstance();
}, 60_000);

async function emit(source: string, emitterOptions: Record<string, unknown> = {}) {
  return runner.compileAndDiagnose(source, {
    compilerOptions: {
      linterRuleSet: { enable: { [rule]: true } },
      options: {
        "@azure-tools/typespec-autorest": {
          "emitter-output-dir": resolveVirtualPath("./tsp-output"),
          ...emitterOptions,
        },
      },
    },
  });
}

it("matches emitted custom responses, strict markers, and x-ms-paths", async () => {
  const [{ outputs }, diagnostics] = await emit(`
    @armProviderNamespace namespace Microsoft.Contoso;
    model Ok { @statusCode code: 200; @body value: string; }
    model Accepted { @statusCode code: 202; @header location?: string; }
    model AcceptedWithBody { @statusCode code: 202; @body value: string; }
    model NoContent { @statusCode code: 204; }

    @route("/sync") @patch op sync(): Ok | ErrorResponse;
    @extension("x-ms-long-running-operation", true)
    @route("/async") @patch op asyncOp(): Ok | Accepted | ErrorResponse;
    @extension("x-ms-long-running-operation", true)
    @route("/missing") @patch op missing(): Ok | ErrorResponse;
    @extension("x-ms-long-running-operation", true)
    @route("/body") @patch op body(): Ok | AcceptedWithBody | NoContent | ErrorResponse;
    @extension("x-ms-long-running-operation", "yes")
    @route("/truthy") @patch op truthy(): Ok | ErrorResponse;
    @extension("x-ms-long-running-operation", "yes")
    @route("/truthy-accepted") @patch op truthyAccepted(): Ok | Accepted | ErrorResponse;
    @extension("x-ms-long-running-operation", false)
    @extension("x-ms-long-running-operation-options", #{})
    @route("/options") @patch op options(): Ok | Accepted | ErrorResponse;
    @route("/xms?comp=one") @patch op extended(): Ok;
  `);
  const document = JSON.parse(outputs["openapi.json"]) as EmittedDocument;
  const sync = document.paths["/sync"].patch!;
  const asyncOp = document.paths["/async"].patch!;
  const body = document.paths["/body"].patch!;
  const truthy = document.paths["/truthy"].patch!;
  const options = document.paths["/options"].patch!;
  const extended = document["x-ms-paths"]?.["/xms?comp=one"].patch;
  ok(extended);
  deepStrictEqual(Object.keys(sync.responses).sort(), ["200", "default"]);
  deepStrictEqual(Object.keys(asyncOp.responses).sort(), ["200", "202", "default"]);
  strictEqual(asyncOp.responses["202"].schema, undefined);
  ok(body.responses["202"].schema);
  strictEqual(truthy["x-ms-long-running-operation"], "yes");
  strictEqual(options["x-ms-long-running-operation"], false);
  deepStrictEqual(options["x-ms-long-running-operation-options"], {});

  const warnings = diagnostics
    .filter((diagnostic) => diagnostic.code === rule)
    .map((diagnostic) => diagnostic.message)
    .sort();
  deepStrictEqual(warnings, [
    "Long-running PATCH operations must have only 200, 202, and default responses.",
    "Long-running PATCH operations must have only 200, 202, and default responses.",
    "PATCH operations with long-running options must set x-ms-long-running-operation to true.",
    "Synchronous PATCH operations must have only 200 and default responses.",
    "Synchronous PATCH operations must have only 200 and default responses.",
    "The 202 response of a long-running PATCH operation must not have a body.",
  ]);
}, 60_000);

it.each([
  [undefined, true],
  ["none", false],
])(
  "honors emitted options when a semantic LRO flag is overridden: %s",
  async (mode, hasOptions) => {
    const [{ outputs }, diagnostics] = await emit(
      `
      @armProviderNamespace namespace Microsoft.Contoso;
      model Employee is ProxyResource<{}> {
        ...ResourceNameParameter<Employee>;
      }
      @armResourceOperations interface Employees {
        @extension("x-ms-long-running-operation", false)
        update is ArmCustomPatchAsync<Employee>;
      }
    `,
      mode === undefined ? {} : { "emit-lro-options": mode },
    );
    const document = JSON.parse(outputs["openapi.json"]) as EmittedDocument;
    const operation = Object.values(document.paths).find((path) => path.patch)?.patch;
    ok(operation);
    strictEqual(operation["x-ms-long-running-operation"], false);
    strictEqual(operation["x-ms-long-running-operation-options"] !== undefined, hasOptions);
    deepStrictEqual(
      diagnostics
        .filter((diagnostic) => diagnostic.code === rule)
        .map((diagnostic) => diagnostic.message),
      [
        hasOptions
          ? "PATCH operations with long-running options must set x-ms-long-running-operation to true."
          : "Synchronous PATCH operations must have only 200 and default responses.",
      ],
    );
  },
  60_000,
);

it.each([
  ["all emitters", ""],
  ["AutoRest", '("autorest")'],
  ["all except Python", '("!python")'],
  ["AutoRest options", '(#{ scope: "autorest" })'],
])(
  "recognizes a legacy LRO marker scoped to %s",
  async (_, scope) => {
    const [{ outputs }, diagnostics] = await emit(`
    @armProviderNamespace namespace Microsoft.Contoso;
    model Ok { @statusCode code: 200; @body value: string; }
    model Accepted { @statusCode code: 202; }
    @Azure.ClientGenerator.Core.Legacy.markAsLro${scope}
    @route("/legacy") @patch op update(): Ok | Accepted | ErrorResponse;
  `);
    const document = JSON.parse(outputs["openapi.json"]) as EmittedDocument;
    const operation = document.paths["/legacy"].patch!;
    strictEqual(operation["x-ms-long-running-operation"], true);
    deepStrictEqual(Object.keys(operation.responses).sort(), ["200", "202", "default"]);
    strictEqual(diagnostics.filter((diagnostic) => diagnostic.code === rule).length, 0);
  },
  60_000,
);

it.each([
  ["Python", '("python")'],
  ["all except AutoRest", '("!autorest")'],
])(
  "does not apply a legacy LRO marker scoped to %s",
  async (_, scope) => {
    const [{ outputs }, diagnostics] = await emit(`
    @armProviderNamespace namespace Microsoft.Contoso;
    model Ok { @statusCode code: 200; @body value: string; }
    @Azure.ClientGenerator.Core.Legacy.markAsLro${scope}
    @route("/legacy") @patch op update(): Ok | ErrorResponse;
  `);
    const document = JSON.parse(outputs["openapi.json"]) as EmittedDocument;
    const operation = document.paths["/legacy"].patch!;
    strictEqual(operation["x-ms-long-running-operation"], undefined);
    deepStrictEqual(Object.keys(operation.responses).sort(), ["200", "default"]);
    strictEqual(diagnostics.filter((diagnostic) => diagnostic.code === rule).length, 0);
  },
  60_000,
);

it("honors an explicit false LRO flag over a legacy marker", async () => {
  const [{ outputs }, diagnostics] = await emit(`
    @armProviderNamespace namespace Microsoft.Contoso;
    model Ok { @statusCode code: 200; @body value: string; }
    @Azure.ClientGenerator.Core.Legacy.markAsLro
    @extension("x-ms-long-running-operation", false)
    @route("/legacy") @patch op update(): Ok | ErrorResponse;
  `);
  const document = JSON.parse(outputs["openapi.json"]) as EmittedDocument;
  const operation = document.paths["/legacy"].patch!;
  strictEqual(operation["x-ms-long-running-operation"], false);
  deepStrictEqual(Object.keys(operation.responses).sort(), ["200", "default"]);
  strictEqual(diagnostics.filter((diagnostic) => diagnostic.code === rule).length, 0);
}, 60_000);

it.each([
  [
    "without a 202 response",
    "Ok | ErrorResponse",
    "Long-running PATCH operations must have only 200, 202, and default responses.",
  ],
  [
    "with a 202 body",
    "Ok | Accepted | ErrorResponse",
    "The 202 response of a long-running PATCH operation must not have a body.",
  ],
])(
  "validates a legacy LRO %s",
  async (_, returnType, message) => {
    const [{ outputs }, diagnostics] = await emit(`
    @armProviderNamespace namespace Microsoft.Contoso;
    model Ok { @statusCode code: 200; @body value: string; }
    model Accepted { @statusCode code: 202; @body value: string; }
    @Azure.ClientGenerator.Core.Legacy.markAsLro("autorest")
    @route("/legacy") @patch op update(): ${returnType};
  `);
    const document = JSON.parse(outputs["openapi.json"]) as EmittedDocument;
    strictEqual(document.paths["/legacy"].patch!["x-ms-long-running-operation"], true);
    deepStrictEqual(
      diagnostics
        .filter((diagnostic) => diagnostic.code === rule)
        .map((diagnostic) => diagnostic.message),
      [message],
    );
  },
  60_000,
);

it("shows the documented unprojected response limitation for versioned output", async () => {
  const [{ outputs }, diagnostics] = await emit(`
    @armProviderNamespace
    @versioned(Versions)
    namespace Microsoft.Contoso;
    enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
    model Ok { @statusCode code: 200; @body value: string; }
    model Accepted { @statusCode code: 202; }
    union Responses {
      ok: Ok,
      @removed(Versions.v2) accepted: Accepted,
      error: ErrorResponse,
    }
    @extension("x-ms-long-running-operation", true)
    @route("/versioned") @patch op update(): Responses;
  `);
  const first = JSON.parse(
    outputs[resolvePath("stable", "2024-01-01", "openapi.json")],
  ) as EmittedDocument;
  const second = JSON.parse(
    outputs[resolvePath("stable", "2025-01-01", "openapi.json")],
  ) as EmittedDocument;
  deepStrictEqual(Object.keys(first.paths["/versioned"].patch!.responses).sort(), [
    "200",
    "202",
    "default",
  ]);
  deepStrictEqual(Object.keys(second.paths["/versioned"].patch!.responses).sort(), [
    "200",
    "default",
  ]);
  deepStrictEqual(
    diagnostics.filter((diagnostic) => diagnostic.code === rule),
    [],
  );
}, 60_000);
