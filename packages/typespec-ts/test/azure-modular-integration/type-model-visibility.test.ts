import { assert, beforeEach, describe, it } from "vitest";

import { VisibilityClient } from "./generated/type/model/visibility/src/index.js";

describe("Type Model Visibility", () => {
  let client: VisibilityClient;

  beforeEach(() => {
    client = new VisibilityClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: {
        maxRetries: 0,
      },
    });
  });

  it("gets a model with read visibility", async () => {
    const result = await client.getModel({ queryProp: 123 });

    assert.deepEqual(result, { readProp: "abc" });
  });

  it("sends a HEAD request with query visibility", async () => {
    const result = await client.headModel({ queryProp: 123 });

    assert.strictEqual(result, undefined);
  });

  it("puts a model with create and update visibility", async () => {
    const result = await client.putModel({
      createProp: ["foo", "bar"],
      updateProp: [1, 2],
    });

    assert.strictEqual(result, undefined);
  });

  it("patches a model with update visibility", async () => {
    const result = await client.patchModel({ updateProp: [1, 2] });

    assert.strictEqual(result, undefined);
  });

  it("posts a model with create visibility", async () => {
    const result = await client.postModel({ createProp: ["foo", "bar"] });

    assert.strictEqual(result, undefined);
  });

  it("deletes a model with delete visibility", async () => {
    const result = await client.deleteModel({ deleteProp: true });

    assert.strictEqual(result, undefined);
  });

  it("round trips a model with read-only properties", async () => {
    const result = await client.putReadOnlyModel({});

    assert.deepEqual(result, {
      optionalNullableIntList: [1, 2, 3],
      optionalStringRecord: { k1: "value1", k2: "value2" },
    });
  });
});
