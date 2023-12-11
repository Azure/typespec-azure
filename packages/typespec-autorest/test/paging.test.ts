import { ok, strictEqual } from "assert";
import { openApiFor } from "./test-host.js";

describe("autorest: paging", () => {
  it("define a standard paged operation", async () => {
    const res = await openApiFor(
      `
      @service
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      namespace Test {
        @get
        op list(): Azure.Core.Page<{}>;
      }
      `
    );

    const listThings = res.paths["/"].get;
    ok(listThings);
    strictEqual(listThings["x-ms-pageable"].nextLinkName, "nextLink");
  });

  it("define a custom paged operation with custom next link", async () => {
    const res = await openApiFor(
      `
      @service
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      namespace Test {
        @friendlyName("{name}CustomPage", T)
        @pagedResult
        model CustomPageModel<T> {
          @items
          @doc("List of items.")
          items: T[];

          @nextLink
          @doc("Link to fetch more items.")
          \`@odata.nextLink\`?: string;
        }
        op list(): CustomPageModel<{}>;
      }
      `
    );

    const listThings = res.paths["/"].get;
    ok(listThings);
    strictEqual(listThings["x-ms-pageable"].nextLinkName, "@odata.nextLink");
  });
});
