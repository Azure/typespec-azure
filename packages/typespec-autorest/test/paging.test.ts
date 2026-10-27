import { deepStrictEqual, ok } from "assert";
import { describe, it } from "vitest";
import { compileOpenAPI } from "./test-host.js";

it("use Azure.Core.Page as the response", async () => {
  const res = await compileOpenAPI(
    `
    @service
      namespace Test {
      @list
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

  deepStrictEqual(res.paths["/"].get!["x-ms-pageable"], {
    nextLinkName: "next",
  });
});

it.each([
  ["application/json", "items", "@odata.nextLink"],
  ["application/xml", "xmlItems", "xmlNextLink"],
])(
  "uses the serialized paging property names for %s schemas",
  async (contentType, itemName, nextLinkName) => {
    const res = await compileOpenAPI(`
      model Page {
        @pageItems
        @encodedName("application/json", "items")
        @encodedName("application/xml", "xmlItems")
        value: string[];
        @nextLink
        @encodedName("application/json", "@odata.nextLink")
        @encodedName("application/xml", "xmlNextLink")
        nextLink?: string;
      }

      @list @post op list(
        @header contentType: "${contentType}",
        @body request: {}
      ): {
        @header contentType: "${contentType}";
        @body body: Page;
      };
    `);

    deepStrictEqual(res.paths["/"].post!["x-ms-pageable"], { nextLinkName, itemName });
    ok(res.definitions?.Page.properties?.[nextLinkName]);
    ok(res.definitions?.Page.properties?.[itemName]);
  },
);

it("omits itemName when the serialized item property is value", async () => {
  const res = await compileOpenAPI(`
    model Page {
      @pageItems
      @encodedName("application/json", "value")
      items: string[];
      @nextLink nextLink?: string;
    }

    @list op list(): Page;
  `);

  deepStrictEqual(res.paths["/"].get!["x-ms-pageable"], { nextLinkName: "nextLink" });
  ok(res.definitions?.Page.properties?.value);
});

describe("Legacy define paging operation using Azure.Core decorators", () => {
  it("define a custom paged operation with custom next link", async () => {
    const res = await compileOpenAPI(
      `
      model CustomPageModel<T> {
        @pageItems
        value: T[];

        @nextLink
        \`@odata.nextLink\`?: string;
      }
      @list
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
    model List {
      @pageItems
      itemList?: string[];

      @nextLink
      nextLink?: string;
    }
    
    @list
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
