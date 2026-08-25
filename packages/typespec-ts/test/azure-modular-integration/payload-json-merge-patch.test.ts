import { assert, beforeEach, describe, it } from "vitest";

import {
  JsonMergePatchClient,
  type Resource,
  type ResourcePatch,
} from "./generated/payload/json-merge-patch/src/index.js";

describe("JsonMergePatchClient", () => {
  let client: JsonMergePatchClient;

  beforeEach(() => {
    client = new JsonMergePatchClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: { maxRetries: 0 },
    });
  });

  it("creates a resource", async () => {
    const resource: Resource = {
      name: "Madge",
      description: "desc",
      map: { key: { name: "InnerMadge", description: "innerDesc" } },
      array: [{ name: "InnerMadge", description: "innerDesc" }],
      intValue: 1,
      floatValue: 1.25,
      innerModel: { name: "InnerMadge", description: "innerDesc" },
      intArray: [1, 2, 3],
    };

    assert.deepEqual(await client.createResource(resource), resource);
  });

  it("updates a resource with null merge-patch values", async () => {
    const patch = {
      description: null,
      map: { key: { description: null }, key2: null },
      array: null,
      intValue: null,
      floatValue: null,
      innerModel: null,
      intArray: null,
    } as unknown as ResourcePatch;

    assert.deepEqual(await client.updateResource(patch), {
      name: "Madge",
      description: undefined,
      map: { key: { name: "InnerMadge", description: undefined } },
      array: undefined,
      intValue: undefined,
      floatValue: undefined,
      innerModel: undefined,
      intArray: undefined,
    });
  });

  it("updates a resource with an optional body", async () => {
    const patch = {
      description: null,
      map: { key: { description: null }, key2: null },
      array: null,
      intValue: null,
      floatValue: null,
      innerModel: null,
      intArray: null,
    } as unknown as ResourcePatch;

    assert.deepEqual(await client.updateOptionalResource({ body: patch }), {
      name: "Madge",
      description: undefined,
      map: { key: { name: "InnerMadge", description: undefined } },
      array: undefined,
      intValue: undefined,
      floatValue: undefined,
      innerModel: undefined,
      intArray: undefined,
    });
  });
});
