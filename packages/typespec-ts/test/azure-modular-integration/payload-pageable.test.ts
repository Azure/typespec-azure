import { assert, beforeEach, describe, it } from "vitest";

import { PageableClient, Pet, XmlPet } from "./generated/payload/pageable/src/index.js";

async function collectPets(iterable: AsyncIterable<Pet>): Promise<Pet[]> {
  const items: Pet[] = [];
  for await (const pet of iterable) {
    items.push(pet);
  }
  return items;
}

describe("PageableClient Classical Client", () => {
  let client: PageableClient;

  beforeEach(() => {
    client = new PageableClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    });
  });
  const pets = [
    { id: "1", name: "dog" },
    { id: "2", name: "cat" },
    { id: "3", name: "bird" },
    { id: "4", name: "fish" },
  ];
  it("Payload Pageable ServerDriven Pagination link", async () => {
    const items = await collectPets(client.serverDrivenPagination.link());
    assert.deepStrictEqual<Pet[]>(items, pets);
  });

  it("should follow a string next link", async () => {
    const items = await collectPets(client.serverDrivenPagination.linkString());
    assert.deepStrictEqual(items, pets);
  });

  // Skipped: paging metadata omits continuation-token extraction and request injection,
  // so JSON iteration stops after the first page.
  // Tracking: https://github.com/Azure/typespec-azure/issues/5298
  it.skip("should follow a continuation token from a JSON response body", async () => {
    const items = await collectPets(
      client.serverDrivenPagination.continuationToken.requestQueryResponseBody({
        foo: "foo",
        bar: "bar",
      }),
    );
    assert.deepStrictEqual(items, pets);
  });

  describe("PageSize", () => {
    it("should list without a continuation token", async () => {
      const items = await collectPets(client.pageSize.listWithoutContinuation());
      assert.deepStrictEqual(items, pets);
    });

    it("should honor the requested page size", async () => {
      const firstPage = await collectPets(client.pageSize.listWithPageSize({ pageSize: 2 }));
      assert.deepStrictEqual(firstPage, pets.slice(0, 2));

      const fullPage = await collectPets(client.pageSize.listWithPageSize({ pageSize: 4 }));
      assert.deepStrictEqual(fullPage, pets);
    });
  });

  describe("AlternateInitialVerb", () => {
    it("should list pets using post initial verb", async () => {
      const iter = client.serverDrivenPagination.alternateInitialVerb.post({
        filter: "foo eq bar",
      });
      const items: Array<Pet> = [];
      for await (const pet of iter) {
        items.push(pet);
      }
      assert.strictEqual(items.length, 4);
      assert.deepStrictEqual<Pet[]>(items, pets);
    });
  });

  describe("XmlPagination", () => {
    it("should list xml pagination with next link", async () => {
      const iter = client.xmlPagination.listWithNextLink();
      const items: Array<XmlPet> = [];
      for await (const pet of iter) {
        items.push(pet);
      }
      assert.strictEqual(items.length, 4);
      assert.strictEqual(items[0]?.id, "1");
      assert.strictEqual(items[0]?.name, "dog");
      assert.strictEqual(items[1]?.id, "2");
      assert.strictEqual(items[1]?.name, "cat");
      assert.strictEqual(items[2]?.id, "3");
      assert.strictEqual(items[2]?.name, "bird");
      assert.strictEqual(items[3]?.id, "4");
      assert.strictEqual(items[3]?.name, "fish");
    });

    // Skipped: paging metadata omits the XML continuation token and request injection,
    // so XML iteration stops after the first page.
    // Tracking: https://github.com/Azure/typespec-azure/issues/5298
    it.skip("should follow a continuation token from an XML response body", async () => {
      const items: XmlPet[] = [];
      for await (const pet of client.xmlPagination.listWithContinuation()) {
        items.push(pet);
      }
      assert.deepStrictEqual(items, pets);
    });
  });
});
