import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { ok } from "assert";
import { beforeEach, it } from "vitest";
import { isPagedResultModel } from "../../src/public-utils.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
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

    @list
    op test(): TestResult;
  `);

  const sdkPackage = runner.context.sdkPackage;
  ok(
    isPagedResultModel(runner.context, sdkPackage.models.filter((m) => m.name === "TestResult")[0]),
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

    @list
    op test(): Page<Test>;
  `);

  const sdkPackage = runner.context.sdkPackage;
  ok(
    isPagedResultModel(runner.context, sdkPackage.models.filter((m) => m.name === "PagedTest")[0]),
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

    @list
    op testTemplate<T extends {}>(): Page<T>;

    op test is testTemplate<Test>;
  `);

  const sdkPackage = runner.context.sdkPackage;
  ok(
    isPagedResultModel(runner.context, sdkPackage.models.filter((m) => m.name === "PagedTest")[0]),
  );
});

it("paged model with @markAsPageable decorator", async () => {
  await runner.compile(`
    @service
    namespace TestService {
      model ItemListResult {
        @pageItems
        items: Item[];
      }

      model Item {
        id: string;
        name: string;
      }

      @Azure.ClientGenerator.Core.Legacy.markAsPageable
      @route("/items")
      @get
      op listItems(): ItemListResult;
    }
  `);

  const sdkPackage = runner.context.sdkPackage;
  ok(
    isPagedResultModel(
      runner.context,
      sdkPackage.models.filter((m) => m.name === "ItemListResult")[0],
    ),
  );
});

