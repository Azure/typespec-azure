import { ok } from "assert";
import { it } from "vitest";
import { isPagedResultModel } from "../../src/public-utils.js";
import { AzureCoreTesterWithService, createSdkContextForTester } from "../tester.js";

it("template paged model", async () => {
  const { program } = await AzureCoreTesterWithService.compile(`
    model TestResult is Page<Test>;

    model Test {
      prop: string;
    }

    @list
    op test(): TestResult;
  `);
  const context = await createSdkContextForTester(program);

  const sdkPackage = context.sdkPackage;
  ok(isPagedResultModel(context, sdkPackage.models.filter((m) => m.name === "TestResult")[0]));
});

it("another usage of template paged model", async () => {
  const { program } = await AzureCoreTesterWithService.compile(`
    model Test {
      prop: string;
    }

    @list
    op test(): Page<Test>;
  `);
  const context = await createSdkContextForTester(program);

  const sdkPackage = context.sdkPackage;
  ok(isPagedResultModel(context, sdkPackage.models.filter((m) => m.name === "PagedTest")[0]));
});

it("paged model use template list", async () => {
  const { program } = await AzureCoreTesterWithService.compile(`
    model Test {
      prop: string;
    }

    @list
    op testTemplate<T extends {}>(): Page<T>;

    op test is testTemplate<Test>;
  `);
  const context = await createSdkContextForTester(program);

  const sdkPackage = context.sdkPackage;
  ok(isPagedResultModel(context, sdkPackage.models.filter((m) => m.name === "PagedTest")[0]));
});

it("paged model with @markAsPageable decorator", async () => {
  const { program } = await AzureCoreTesterWithService.compile(`
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
  `);
  const context = await createSdkContextForTester(program);

  const sdkPackage = context.sdkPackage;
  ok(isPagedResultModel(context, sdkPackage.models.filter((m) => m.name === "ItemListResult")[0]));
});
