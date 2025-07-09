import { deepStrictEqual, ok } from "assert";
import { describe, it } from "vitest";
import { compileOpenAPI } from "./test-host.js";

it("use Azure.Core.Page as the response", async () => {
  const res = await compileOpenAPI(
    `
    @service
    @useDependency(Azure.Core.Versions.v1_0_Preview_2)
    namespace Test {
      op list(): Azure.Core.Page<{}>;
    }
    `,
    { preset: "azure" },
  );

  const listThings = res.paths["/"].get;
  ok(listThings);
  deepStrictEqual(listThings["x-ms-pageable"], { nextLinkName: "nextLink" });
});

it("define a custom paged operation with custom next link", async () => {
  const res = await compileOpenAPI(
    `
    model CustomPageModel<T> {
      @pageItems myItems: T[];
      @TypeSpec.nextLink
      \`@odata.nextLink\`?: string;
    }
    @list op list(): CustomPageModel<{}>;
    `,
    { preset: "azure" },
  );

  const listThings = res.paths["/"].get;
  ok(listThings);
  deepStrictEqual(listThings["x-ms-pageable"], {
    nextLinkName: "@odata.nextLink",
    itemName: "myItems",
  });
});

it("value is default item name for x-ms-pageable", async () => {
  const res = await compileOpenAPI(
    `
    @list
    op test(): {
      @pageItems value: string[];
      @nextLink next: string;
    };
    `,
  );

  deepStrictEqual(res.paths["/t"].get!.["x-ms-pageable"], {
    nextLinkName: "next",
  });
});

describe("Legacy define paging operation using Azure.Core decorators", () => {
  it("define a custom paged operation with custom next link", async () => {
    const res = await compileOpenAPI(
      `
      @pagedResult
      model CustomPageModel<T> {
        items: T[];

        @nextLink
        \`@odata.nextLink\`?: string;
      }
      op list(): CustomPageModel<{}>;
      `,
      { preset: "azure" },
    );

    const listThings = res.paths["/"].get;
    ok(listThings);
    deepStrictEqual(listThings["x-ms-pageable"], { nextLinkName: "@odata.nextLink" });
  });

  it("define a custom paged operation with custom item name", async () => {
    const res = await compileOpenAPI(
      `
    @pagedResult
    model List {
      @Azure.Core.items
      itemList?: string[];

      @nextLink
      nextLink?: string;
    }
      
    op list(): List;
    `,
      { preset: "azure" },
    );

    const listThings = res.paths["/"].get;
    ok(listThings);
    deepStrictEqual(listThings["x-ms-pageable"], {
      itemName: "itemList",
      nextLinkName: "nextLink",
    });
  });
});
