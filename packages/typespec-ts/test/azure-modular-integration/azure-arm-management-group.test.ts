import { assert, beforeEach, describe, it } from "vitest";

import { ManagementGroupClient } from "./generated/azure/resource-manager/management-group/src/index.js";

describe("ManagementGroupClient", () => {
  let client: ManagementGroupClient;

  beforeEach(() => {
    client = new ManagementGroupClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: { maxRetries: 0 },
    });
  });

  it("gets a resource at management group scope", async () => {
    const result = await client.get("test-mg", "resource");

    assert.equal(result.name, "resource");
    assert.deepEqual(result.properties, {
      description: "valid",
      provisioningState: "Succeeded",
    });
  });

  it("creates a resource at management group scope", async () => {
    const poller = client.createOrUpdate("test-mg", "resource", {
      properties: { description: "valid" },
    });
    const result = await poller.pollUntilDone();

    assert.equal(result.name, "resource");
    assert.deepEqual(result.properties, {
      description: "valid",
      provisioningState: "Succeeded",
    });
  });

  it("updates a resource at management group scope", async () => {
    const result = await client.update("test-mg", "resource", {
      properties: { description: "valid2" },
    });

    assert.deepEqual(result.properties, {
      description: "valid2",
      provisioningState: "Succeeded",
    });
  });

  it("deletes a resource at management group scope", async () => {
    assert.isUndefined(await client.delete("test-mg", "resource"));
  });

  it("lists resources at management group scope", async () => {
    const resources = [];
    for await (const resource of client.listByManagementGroup("test-mg")) {
      resources.push(resource);
    }

    assert.lengthOf(resources, 1);
    assert.equal(resources[0].name, "resource");
    assert.equal(resources[0].properties?.description, "valid");
  });
});
