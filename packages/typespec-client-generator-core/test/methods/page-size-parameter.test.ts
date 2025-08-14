import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getServiceMethodOfClient } from "../utils.js";

describe("Page size parameter detection", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-java",
    });
  });

  it("detect @pageSize parameter in paging operation", async () => {
    await runner.compileWithBuiltInService(`
      @list
      op test(@pageSize @query maxPageSize?: int32): ListTestResult;
      model ListTestResult {
        @pageItems
        tests: Test[];
        @TypeSpec.nextLink
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
    
    // Check if pageSizeParameter is correctly identified
    strictEqual(method.pagingMetadata.pageSizeParameter?.name, "maxPageSize");
    strictEqual(method.pagingMetadata.pageSizeParameter, method.parameters[0]);
  });

  it("no page size parameter when @pageSize not present", async () => {
    await runner.compileWithBuiltInService(`
      @list
      op test(@query limit?: int32): ListTestResult;
      model ListTestResult {
        @pageItems
        tests: Test[];
        @TypeSpec.nextLink
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
    
    // Check that pageSizeParameter is undefined when @pageSize is not present
    strictEqual(method.pagingMetadata.pageSizeParameter, undefined);
  });

  it("detect @pageSize parameter in Azure Core paged result", async () => {
    await runner.compileWithBuiltInService(`
      op test(@pageSize @query maxPageSize?: int32): ListTestResult;
      #suppress "deprecated" "Keep for validation purposes."
      @pagedResult
      model ListTestResult {
        #suppress "deprecated" "Keep for validation purposes."
        @items
        values: Test[];
        @nextLink
        nextLink: string;
      }
      model Test {
        id: string;
      }
    `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "test");
    strictEqual(method.kind, "paging");
    
    // Check if pageSizeParameter is correctly identified
    strictEqual(method.pagingMetadata.pageSizeParameter?.name, "maxPageSize");
    strictEqual(method.pagingMetadata.pageSizeParameter, method.parameters[0]);
  });
});