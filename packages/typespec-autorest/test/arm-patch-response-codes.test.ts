import { resolvePath } from "@typespec/compiler";
import { resolveVirtualPath } from "@typespec/compiler/testing";
import { deepStrictEqual, strictEqual } from "node:assert";
import { beforeAll, it } from "vitest";
import { AzureTester } from "./test-host.js";

const rule = "@azure-tools/typespec-azure-resource-manager/arm-patch-operation-response-codes";

interface EmittedOperation {
  responses: Record<string, { schema?: unknown }>;
  [key: string]: unknown;
}

interface EmittedDocument {
  paths: Record<string, { patch: EmittedOperation }>;
}

let runner: Awaited<ReturnType<typeof AzureTester.createInstance>>;

beforeAll(async () => {
  runner = await AzureTester.createInstance();
}, 60_000);

async function emit(source: string) {
  return runner.compileAndDiagnose(source, {
    compilerOptions: {
      linterRuleSet: { enable: { [rule]: true } },
      options: {
        "@azure-tools/typespec-autorest": {
          "emitter-output-dir": resolveVirtualPath("./tsp-output"),
        },
      },
    },
  });
}

it("classifies native polling metadata as an LRO", async () => {
  const [{ outputs }, diagnostics] = await emit(`
    @armProviderNamespace namespace Microsoft.Contoso;
    model Status { @Azure.Core.lroStatus status: "Succeeded" | "Failed" | "Canceled" | "Running"; }
    model Started {
      @statusCode code: 200;
      @Azure.Core.pollingLocation @header("Operation-Location")
      location: ResourceLocation<Status>;
      @body value: string;
    }
    model Accepted { @statusCode code: 202; }
    @route("/valid") @patch op valid(): Started | Accepted | ErrorResponse;
    @route("/missing") @patch op missing(): Started | ErrorResponse;
  `);
  const document = JSON.parse(outputs["openapi.json"]) as EmittedDocument;
  strictEqual(document.paths["/valid"].patch["x-ms-long-running-operation"], true);
  deepStrictEqual(Object.keys(document.paths["/valid"].patch.responses).sort(), [
    "200",
    "202",
    "default",
  ]);
  deepStrictEqual(
    diagnostics.filter((diagnostic) => diagnostic.code === rule).map((d) => d.message),
    ["Long-running PATCH operations must have only 200, 202, and default responses."],
  );
}, 60_000);

it.each([
  ["legacy marker", '@Azure.ClientGenerator.Core.Legacy.markAsLro("autorest")'],
  ["explicit extension", '@extension("x-ms-long-running-operation", true)'],
])(
  "treats a %s without polling metadata as synchronous",
  async (_, marker) => {
    const [{ outputs }, diagnostics] = await emit(`
    @armProviderNamespace namespace Microsoft.Contoso;
    model Ok { @statusCode code: 200; @body value: string; }
    model Accepted { @statusCode code: 202; }
    ${marker}
    @route("/legacy") @patch op update(): Ok | Accepted | ErrorResponse;
  `);
    const document = JSON.parse(outputs["openapi.json"]) as EmittedDocument;
    strictEqual(document.paths["/legacy"].patch["x-ms-long-running-operation"], true);
    deepStrictEqual(
      diagnostics.filter((diagnostic) => diagnostic.code === rule).map((d) => d.message),
      ["Synchronous PATCH operations must have only 200 and default responses."],
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
    model Status { @Azure.Core.lroStatus status: "Succeeded" | "Failed" | "Canceled" | "Running"; }
    model Started {
      @statusCode code: 200;
      @Azure.Core.pollingLocation @header("Operation-Location")
      location: ResourceLocation<Status>;
      @body value: string;
    }
    model Accepted { @statusCode code: 202; }
    union Responses {
      ok: Started,
      @removed(Versions.v2) accepted: Accepted,
      error: ErrorResponse,
    }
    @route("/versioned") @patch op update(): Responses;
  `);
  const first = JSON.parse(
    outputs[resolvePath("stable", "2024-01-01", "openapi.json")],
  ) as EmittedDocument;
  const second = JSON.parse(
    outputs[resolvePath("stable", "2025-01-01", "openapi.json")],
  ) as EmittedDocument;
  deepStrictEqual(Object.keys(first.paths["/versioned"].patch.responses).sort(), [
    "200",
    "202",
    "default",
  ]);
  deepStrictEqual(Object.keys(second.paths["/versioned"].patch.responses).sort(), [
    "200",
    "default",
  ]);
  deepStrictEqual(
    diagnostics.filter((diagnostic) => diagnostic.code === rule),
    [],
  );
}, 60_000);
