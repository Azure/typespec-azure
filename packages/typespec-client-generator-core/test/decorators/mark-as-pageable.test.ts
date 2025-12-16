import { ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let basicRunner: SdkTestRunner;

beforeEach(async () => {
  basicRunner = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-csharp",
  });
});

it("should mark regular operation as pageable when decorated with @markAsPageable", async () => {
  await basicRunner.compile(`
      @service
      namespace TestService {
        model ItemListResult {
          items: Item[];
          nextLink?: string;
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

  const methods = basicRunner.context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "listItems");

  // Check that the response type is properly set
  const responseType = method.response.type;
  ok(responseType);
  strictEqual(responseType.kind, "array");
});

it("should apply @markAsPageable with language scope", async () => {
  await basicRunner.compile(`
      @service
      namespace TestService {
        model ItemListResult {
          items: Item[];
          nextLink?: string;
        }

        model Item {
          id: string;
          name: string;
        }

        @Azure.ClientGenerator.Core.Legacy.markAsPageable("csharp")
        @route("/items")
        @get
        op listItems(): ItemListResult;
      }
    `);

  const methods = basicRunner.context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "listItems");
});

it("should warn when @markAsPageable is applied to operation not returning model", async () => {
  const diagnostics = await basicRunner.diagnose(`
      @service
      namespace TestService {
        @Azure.ClientGenerator.Core.Legacy.markAsPageable
        @route("/simple")
        @get
        op simpleOperation(): string;
      }
    `);

  strictEqual(diagnostics.length, 1);
  strictEqual(
    diagnostics[0].code,
    "@azure-tools/typespec-client-generator-core/invalid-mark-as-pageable-target",
  );
});

it("should work with complex model return types", async () => {
  await basicRunner.compile(`
      @service
      namespace TestService {
        model PagedResult<T> {
          value: T[];
          nextLink?: string;
        }

        model Product {
          id: string;
          name: string;
          price: float32;
        }

        @Azure.ClientGenerator.Core.Legacy.markAsPageable
        @route("/products")
        @get
        op listProducts(): PagedResult<Product>;
      }
    `);

  const methods = basicRunner.context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "listProducts");

  const responseType = method.response.type;
  ok(responseType);
  strictEqual(responseType.kind, "array");
});

it("should work with operations returning list in different response structures", async () => {
  await basicRunner.compile(`
      @service
      namespace TestService {
        model ItemPage {
          data: Item[];
          continuationToken?: string;
        }

        model Item {
          id: string;
          value: string;
        }

        @Azure.ClientGenerator.Core.Legacy.markAsPageable
        @route("/items")
        @get
        op getItems(): ItemPage;
      }
    `);

  const methods = basicRunner.context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "getItems");
});

it("should handle nested model responses", async () => {
  await basicRunner.compile(`
      @service
      namespace TestService {
        model ResultWrapper {
          result: ItemCollection;
        }

        model ItemCollection {
          items: Item[];
          nextPageToken?: string;
        }

        model Item {
          id: string;
        }

        @Azure.ClientGenerator.Core.Legacy.markAsPageable
        @route("/items")
        @get
        op listItems(): ResultWrapper;
      }
    `);

  const methods = basicRunner.context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "listItems");
});

it("should not apply when scope does not match", async () => {
  const pythonRunner = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-python",
  });

  await pythonRunner.compile(`
      @service
      namespace TestService {
        model ItemListResult {
          items: Item[];
          nextLink?: string;
        }

        model Item {
          id: string;
          name: string;
        }

        @Azure.ClientGenerator.Core.Legacy.markAsPageable("csharp")
        @route("/items")
        @get
        op listItems(): ItemListResult;
      }
    `);

  const methods = pythonRunner.context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  // Should be basic method since scope is csharp but emitter is python
  strictEqual(method.kind, "basic");
});
