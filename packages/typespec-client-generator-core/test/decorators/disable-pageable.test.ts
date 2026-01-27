import { ok, strictEqual } from "assert";
import { it } from "vitest";
import { createSdkContextForTester, SimpleTester } from "../tester.js";

it("should disable paging when @disablePageable is applied to a @list operation", async () => {
  const { program } = await SimpleTester.compile(`
      @service
      namespace TestService {
        model ItemListResult {
          @pageItems
          items: Item[];
          nextLink?: string;
        }

        model Item {
          id: string;
          name: string;
        }

        @Azure.ClientGenerator.Core.Legacy.disablePageable
        @list
        @route("/items")
        @get
        op listItems(): ItemListResult;
      }
    `);

  const context = await createSdkContextForTester(program);
  const methods = context.sdkPackage.clients[0].methods;

  const method = methods[0];
  // Should be basic method since @disablePageable disables paging
  strictEqual(method.kind, "basic");
  strictEqual(method.name, "listItems");

  // Response should be the paged model itself, not the list of items
  const responseType = method.response.type;
  ok(responseType);
  strictEqual(responseType.kind, "model");
  strictEqual(responseType.name, "ItemListResult");

  // Check that resultSegments is not populated (not a paging method)
  strictEqual(method.response.resultSegments, undefined);
});

it("should disable paging with language scope when @disablePageable(scope) is applied", async () => {
  const { program } = await SimpleTester.compile(`
      @service
      namespace TestService {
        model ItemListResult {
          @pageItems
          items: Item[];
          nextLink?: string;
        }

        model Item {
          id: string;
          name: string;
        }

        @Azure.ClientGenerator.Core.Legacy.disablePageable("csharp")
        @list
        @route("/items")
        @get
        op listItems(): ItemListResult;
      }
    `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  const methods = context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  // Should be basic method since @disablePageable disables paging for csharp
  strictEqual(method.kind, "basic");
  strictEqual(method.name, "listItems");

  // Response should be the paged model itself
  const responseType = method.response.type;
  ok(responseType);
  strictEqual(responseType.kind, "model");
  strictEqual(responseType.name, "ItemListResult");
});

it("should NOT disable paging when scope does not match for @disablePageable", async () => {
  const { program } = await SimpleTester.compile(`
      @service
      namespace TestService {
        model ItemListResult {
          @pageItems
          items: Item[];
          nextLink?: string;
        }

        model Item {
          id: string;
          name: string;
        }

        @Azure.ClientGenerator.Core.Legacy.disablePageable("python")
        @list
        @route("/items")
        @get
        op listItems(): ItemListResult;
      }
    `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  const methods = context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  // Should still be paging method since scope is python but emitter is csharp
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "listItems");

  // Response should be the list of items (paging behavior)
  const responseType = method.response.type;
  ok(responseType);
  strictEqual(responseType.kind, "array");
});

it("should not mark paged model as paged result when @disablePageable is applied", async () => {
  const { isPagedResultModel } = await import("../../src/public-utils.js");

  const { program } = await SimpleTester.compile(`
      @service
      namespace TestService {
        model ItemListResult {
          @pageItems
          items: Item[];
          nextLink?: string;
        }

        model Item {
          id: string;
          name: string;
        }

        @Azure.ClientGenerator.Core.Legacy.disablePageable
        @list
        @route("/items")
        @get
        op listItems(): ItemListResult;
      }
    `);

  const context = await createSdkContextForTester(program);
  const methods = context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  strictEqual(method.kind, "basic");

  // The response type should NOT be marked as a paged result model
  const responseType = method.response.type;
  ok(responseType);
  strictEqual(responseType.kind, "model");
  strictEqual(isPagedResultModel(context, responseType), false);
});
