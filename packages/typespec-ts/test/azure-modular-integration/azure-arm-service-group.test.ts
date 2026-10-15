import { assert, beforeEach, describe, it } from "vitest";

import { ServiceGroupExtensionClient } from "./generated/azure/resource-manager/service-group/src/index.js";

describe("ServiceGroupExtensionClient", () => {
  let client: ServiceGroupExtensionClient;

  beforeEach(() => {
    client = new ServiceGroupExtensionClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: { maxRetries: 0 },
    });
  });

  it("gets a resource at service group scope", async () => {
    const result = await client.get("test-sg", "resource");

    assert.equal(result.name, "resource");
    assert.deepEqual(result.properties, {
      description: "valid",
      provisioningState: "Succeeded",
    });
  });

  it("creates a resource at service group scope", async () => {
    const poller = client.createOrUpdate("test-sg", "resource", {
      properties: { description: "valid" },
    });
    const result = await poller.pollUntilDone();

    assert.equal(result.name, "resource");
    assert.deepEqual(result.properties, {
      description: "valid",
      provisioningState: "Succeeded",
    });
  });

  it("updates a resource at service group scope", async () => {
    const result = await client.update("test-sg", "resource", {
      properties: { description: "valid2" },
    });

    assert.deepEqual(result.properties, {
      description: "valid2",
      provisioningState: "Succeeded",
    });
  });

  it("deletes a resource at service group scope", async () => {
    assert.isUndefined(await client.delete("test-sg", "resource"));
  });

  it("lists resources at service group scope", async () => {
    const resources = [];
    for await (const resource of client.listByServiceGroup("test-sg")) {
      resources.push(resource);
    }

    assert.lengthOf(resources, 1);
    assert.equal(resources[0].name, "resource");
    assert.equal(resources[0].properties?.description, "valid");
  });
});
