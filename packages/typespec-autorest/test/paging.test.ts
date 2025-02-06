import { deepStrictEqual, ok } from "assert";
import { describe, it } from "vitest";
import { openApiFor } from "./test-host.js";

it("use Azure.Core.Page as the response", async () => {
  const res = await openApiFor(
    `
    @service
    @useDependency(Azure.Core.Versions.v1_0_Preview_2)
    namespace Test {
      op list(): Azure.Core.Page<{}>;
    }
    `,
  );

  const listThings = res.paths["/"].get;
  ok(listThings);
  deepStrictEqual(listThings["x-ms-pageable"], { nextLinkName: "nextLink" });
});

it("define a custom paged operation with custom next link", async () => {
  const res = await openApiFor(
    `
    model CustomPageModel<T> {
      @pageItems myItems: T[];
      @TypeSpec.nextLink
      \`@odata.nextLink\`?: string;
    }
    @list op list(): CustomPageModel<{}>;
    `,
  );

  const listThings = res.paths["/"].get;
  ok(listThings);
  deepStrictEqual(listThings["x-ms-pageable"], {
    nextLinkName: "@odata.nextLink",
    itemName: "myItems",
  });
});

describe("Legacy define paging operation using Azure.Core decorators", () => {
  it("define a custom paged operation with custom next link", async () => {
    const res = await openApiFor(
      `
      @pagedResult
      model CustomPageModel<T> {
        items: T[];

        @nextLink
        \`@odata.nextLink\`?: string;
      }
      op list(): CustomPageModel<{}>;
      `,
    );

    const listThings = res.paths["/"].get;
    ok(listThings);
    deepStrictEqual(listThings["x-ms-pageable"], { nextLinkName: "@odata.nextLink" });
  });

  it("define a custom paged operation with custom item name", async () => {
    const res = await openApiFor(
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
    );

    const listThings = res.paths["/"].get;
    ok(listThings);
    deepStrictEqual(listThings["x-ms-pageable"], {
      itemName: "itemList",
      nextLinkName: "nextLink",
    });
  });
});
