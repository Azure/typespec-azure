import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { Model, ModelProperty } from "@typespec/compiler";
import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { getPropertyPathFromModel } from "../../src/package.js";
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

  it("azure paged result with encoded name", async () => {
    await runner.compileWithBuiltInService(`
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
    strictEqual(method.nextLinkPath, "nextLink");

    const response = method.response;
    strictEqual(response.kind, "method");
    strictEqual(response.resultPath, "values");
  });

  it("normal paged result", async () => {
    await runner.compileWithBuiltInService(`
      @list
      op test(): ListTestResult;
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
    strictEqual(method.nextLinkPath, "next");

    const response = method.response;
    strictEqual(response.kind, "method");
    strictEqual(response.resultPath, "tests");
  });

  it("normal paged result with encoded name", async () => {
    await runner.compileWithBuiltInService(`
      @list
      op test(): ListTestResult;
      model ListTestResult {
        @pageItems
        @clientName("values")
        tests: Test[];
        @TypeSpec.nextLink
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
    strictEqual(method.nextLinkPath, "nextLink");

    const response = method.response;
    strictEqual(response.kind, "method");
    strictEqual(response.resultPath, "values");
  });

  // skip for current paging implementation does not support nested paging value
  it.skip("normal paged result with nested paging value", async () => {
    await runner.compileWithBuiltInService(`
      @list
      op test(): ListTestResult;
      model ListTestResult {
        results: {
          @pageItems
          values: Test[];
        };
        pagination: {
          @TypeSpec.nextLink
          nextLink: string;
        };
      }
      model Test {
        id: string;
      }
    `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "test");
    strictEqual(method.kind, "paging");
    strictEqual(method.nextLinkPath, "pagination.nextLink");

    const response = method.response;
    strictEqual(response.kind, "method");
    strictEqual(response.resultPath, "results.values");
  });

  it("getPropertyPathFromModel test for nested case", async () => {
    const { Test, a, d } = (await runner.compileWithBuiltInService(`
      op test(): Test;
      @test
      model Test {
        a: {
          b: {
            @test
            a: string;
          };
        };
        b: {
          @test
          d: string;
        };
      }
    `)) as { Test: Model; a: ModelProperty; d: ModelProperty };
    strictEqual(
      getPropertyPathFromModel(runner.context, Test, (x: any) => x === a),
      "a.b.a",
    );
    strictEqual(
      getPropertyPathFromModel(runner.context, Test, (x: any) => x === d),
      "b.d",
    );
  });
});
