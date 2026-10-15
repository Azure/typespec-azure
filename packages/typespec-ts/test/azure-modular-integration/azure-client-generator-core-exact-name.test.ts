import { assert, beforeEach, describe, it } from "vitest";
import {
  ExactNameClient,
  KnownAgentEndpointProtocol,
  type my_model,
} from "./generated/azure/client-generator-core/exact-name/src/index.js";

describe("Azure ClientGeneratorCore ExactName Client", () => {
  let client: ExactNameClient;

  beforeEach(() => {
    client = new ExactNameClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: {
        maxRetries: 0,
      },
    });
  });

  it("preserves an exact model name", async () => {
    const body: my_model = { name: "test" };
    assert.deepEqual(await client.model.send(body), body);
  });

  it("preserves an exact property name", async () => {
    const body = { _myName: "test" };
    assert.deepEqual(await client.property.send(body), body);
  });

  it("preserves an exact enum value name", async () => {
    const body = { protocol: KnownAgentEndpointProtocol.A2A };
    assert.deepEqual(await client.enumValue.send(body), body);
  });

  it("preserves an exact operation name", async () => {
    await client.operation.myOp();
  });

  it("preserves an exact parameter name", async () => {
    await client.parameter.send("hello");
  });
});
