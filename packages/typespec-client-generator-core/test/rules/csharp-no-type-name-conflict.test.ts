import {
  createLinterRuleTester,
  LinterRuleTester,
  TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { csharpNoTypeNameConflictRule } from "../../src/rules/csharp-no-type-name-conflict.js";
import { SimpleBaseTester, SimpleTester } from "../tester.js";

const libraryName = "@azure-tools/typespec-client-generator-core";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(runner, csharpNoTypeNameConflictRule, libraryName);
});

// --- Invalid cases ---

it("emits warning when a model name conflicts with an Azure.Core type", async () => {
  await tester.expect(`namespace Billing; model Operation {}`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/csharp-no-type-name-conflict",
    severity: "warning",
    message:
      "Type name 'Operation' conflicts with 'Azure.Operation' from 'Azure.Core'. Use @clientName(\"BillingOperation\", \"csharp\") to rename it for C#.",
  });
});

it("emits warning when an enum name conflicts with an Azure.Core type", async () => {
  await tester.expect(`namespace Billing; enum Response { ok }`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/csharp-no-type-name-conflict",
    message:
      "Type name 'Response' conflicts with 'Azure.Response' from 'Azure.Core'. Use @clientName(\"BillingResponse\", \"csharp\") to rename it for C#.",
  });
});

it("emits warning when a union name conflicts with another Azure SDK type", async () => {
  await tester.expect(`namespace Billing; union BlobClient { string }`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/csharp-no-type-name-conflict",
    message:
      "Type name 'BlobClient' conflicts with 'Azure.Storage.Blobs.BlobClient' from 'Azure.Storage.Blobs'. Use @clientName(\"BillingBlobClient\", \"csharp\") to rename it for C#.",
  });
});

it("emits warning when @clientName for another language does not resolve the C# conflict", async () => {
  await tester
    .expect(
      `namespace Billing;
      model Operation {}
      @@clientName(Operation, "BillingOperation", "python");`,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/csharp-no-type-name-conflict",
      message:
        "Type name 'Operation' conflicts with 'Azure.Operation' from 'Azure.Core'. Use @clientName(\"BillingOperation\", \"csharp\") to rename it for C#.",
    });
});

// --- Valid cases ---

it("is valid when model name is not reserved", async () => {
  await tester.expect(`model Widget {}`).toBeValid();
});

it("is valid when @clientName resolves the C# conflict", async () => {
  await tester
    .expect(
      `namespace Billing;
      model Operation {}
      @@clientName(Operation, "BillingOperation", "csharp");`,
    )
    .toBeValid();
});

it("is valid when unscoped @clientName resolves the C# conflict", async () => {
  await tester
    .expect(
      `namespace Billing;
      model Operation {}
      @@clientName(Operation, "BillingOperation");`,
    )
    .toBeValid();
});

it("does not flag Azure.Core library types", async () => {
  await tester
    .expect(
      `namespace Azure.Core;
      model Operation {}`,
    )
    .toBeValid();
});

it("does not flag Azure.ResourceManager library types", async () => {
  await tester
    .expect(
      `namespace Azure.ResourceManager;
      model ResourceType {}`,
    )
    .toBeValid();
});

// --- Codefix ---

describe("codefix", () => {
  async function createBaseTester() {
    const baseRunner = await SimpleBaseTester.createInstance();
    return createLinterRuleTester(baseRunner, csharpNoTypeNameConflictRule, libraryName);
  }

  it("writes @@clientName to client.tsp with a namespace-derived prefix", async () => {
    const baseTester = await createBaseTester();
    await baseTester
      .expect({
        "main.tsp": `import "@azure-tools/typespec-client-generator-core";
import "./client.tsp";
using Azure.ClientGenerator.Core;

namespace Billing;
model Operation {}`,
        "client.tsp": ``,
      })
      .applyCodeFix("add-clientName-in-client-tsp")
      .toEqual({
        "client.tsp": `import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;
using Billing;

@@clientName(Operation, "BillingOperation", "csharp");
`,
      });
  });

  it("after applying the codefix, the diagnostic disappears", async () => {
    await tester
      .expect(
        `namespace Billing;
        model Operation {}
        @@clientName(Operation, "BillingOperation", "csharp");`,
      )
      .toBeValid();
  });
});
