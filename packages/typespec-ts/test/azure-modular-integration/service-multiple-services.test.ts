import { assert, beforeEach, describe, it } from "vitest";

import { ServiceAClient, ServiceBClient } from "./generated/service/multiple-services/src/index.js";

const options = {
  endpoint: "http://localhost:3002",
  allowInsecureConnection: true,
  retryOptions: { maxRetries: 0 },
};

describe("Service MultipleServices clients", () => {
  describe("ServiceAClient", () => {
    let client: ServiceAClient;

    beforeEach(() => {
      client = new ServiceAClient(options);
    });

    it("calls the Service A operation group", async () => {
      assert.isUndefined(await client.operations.opA());
    });

    it("calls the Service A subnamespace", async () => {
      assert.isUndefined(await client.subNamespace.subOpA());
    });
  });

  describe("ServiceBClient", () => {
    let client: ServiceBClient;

    beforeEach(() => {
      client = new ServiceBClient(options);
    });

    it("calls the Service B operation group", async () => {
      assert.isUndefined(await client.operations.opB());
    });

    it("calls the Service B subnamespace", async () => {
      assert.isUndefined(await client.subNamespace.subOpB());
    });
  });
});
