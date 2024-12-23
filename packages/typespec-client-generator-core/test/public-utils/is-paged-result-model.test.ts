import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { ok } from "assert";
import { beforeEach, describe, it } from "vitest";
import { isPagedResultModel } from "../../src/public-utils.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: public-utils", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  it("normal paged model", async () => {
    runner = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core"],
      emitterName: "@azure-tools/typespec-java",
    });
    await runner.compileWithBuiltInAzureCoreService(`
      @pagedResult
      model TestResult {
        @items
        value: Test[];

        @nextLink
        nextLink?: url;
      }

      model Test {
        prop: string;
      }

      op test(): TestResult;
    `);

    const sdkPackage = runner.context.sdkPackage;
    ok(
      isPagedResultModel(
        runner.context,
        sdkPackage.models.filter((m) => m.name === "TestResult")[0],
      ),
    );
  });

  it("template paged model", async () => {
    runner = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core"],
      emitterName: "@azure-tools/typespec-java",
    });
    await runner.compileWithBuiltInAzureCoreService(`
      model TestResult is Page<Test>;

      model Test {
        prop: string;
      }

      op test(): TestResult;
    `);

    const sdkPackage = runner.context.sdkPackage;
    ok(
      isPagedResultModel(
        runner.context,
        sdkPackage.models.filter((m) => m.name === "TestResult")[0],
      ),
    );
  });

  it("another usage of template paged model", async () => {
    runner = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core"],
      emitterName: "@azure-tools/typespec-java",
    });
    await runner.compileWithBuiltInAzureCoreService(`
      model Test {
        prop: string;
      }

      op test(): Page<Test>;
    `);

    const sdkPackage = runner.context.sdkPackage;
    ok(
      isPagedResultModel(
        runner.context,
        sdkPackage.models.filter((m) => m.name === "PagedTest")[0],
      ),
    );
  });

  it("paged model use template list", async () => {
    runner = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core"],
      emitterName: "@azure-tools/typespec-java",
    });
    await runner.compileWithBuiltInAzureCoreService(`
      model Test {
        prop: string;
      }

      op testTemplate<T extends {}>(): Page<T>;

      op test is testTemplate<Test>;
    `);

    const sdkPackage = runner.context.sdkPackage;
    ok(
      isPagedResultModel(
        runner.context,
        sdkPackage.models.filter((m) => m.name === "PagedTest")[0],
      ),
    );
  });
});
