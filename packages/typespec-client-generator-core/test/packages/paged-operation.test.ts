import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getServiceMethodOfClient } from "./utils.js";

describe("typespec-client-generator-core: paged operation", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core", "Azure.Core.Traits"],
      emitterName: "@azure-tools/typespec-java",
    });
  });

  it("paged result with encoded name", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
        op test(): ListTestResult;
        @pagedResult
        model ListTestResult {
            @items
            @clientName("values")
            tests: Test[];
            @nextLink
            @clientName("nextLink")
            next: string;
        }
        model Test {
            id: string;
        }
      `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "test");
    strictEqual(method.kind, "paging");
    strictEqual(method.crossLanguageDefintionId, "My.Service.test");
    strictEqual(method.nextLinkPath, "nextLink");

    const response = method.response;
    strictEqual(response.kind, "method");
    strictEqual(response.resultPath, "values");
  });
});
