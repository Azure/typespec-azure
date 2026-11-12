import { assert, beforeEach, describe, it } from "vitest";
import {
  OperationIdClient,
  restorePoller,
} from "./generated/azure/client-generator-core/lro/operation-id/src/index.js";

describe("Azure ClientGenerator Core LRO operation ID", () => {
  let client: OperationIdClient;

  beforeEach(() => {
    client = new OperationIdClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    });
  });

  it("should expose the operation ID from the polling URI path", async () => {
    const poller = client.analyze("document-1", { updateIntervalInMs: 0 });
    await poller.submitted();
    assert.strictEqual(poller.operationState?.operationId, "analysis-123");

    const result = await poller.pollUntilDone();
    assert.strictEqual(result.summary, "The document contains three sections.");
    assert.strictEqual(poller.operationState?.operationId, "analysis-123");
  });

  it("should keep the operation ID from the polling URI after rehydration", async () => {
    const poller = client.analyze("document-1", { updateIntervalInMs: 0 });
    await poller.submitted();
    const restored = restorePoller(client, await poller.serialize(), client.analyze, {
      updateIntervalInMs: 0,
    });
    assert.strictEqual(restored.operationState?.operationId, "analysis-123");

    const result = await restored.pollUntilDone();
    assert.strictEqual(result.summary, "The document contains three sections.");
  });

  it("should expose the operation ID from the status-monitor body after a poll", async () => {
    const poller = client.startTranslation({ updateIntervalInMs: 0 });
    await poller.submitted();
    assert.isUndefined(poller.operationState?.operationId);

    await poller.poll();
    assert.strictEqual(poller.operationState?.operationId, "translation-123");

    const result = await poller.pollUntilDone();
    assert.strictEqual(result.translatedCharacters, 42);
    assert.strictEqual(poller.operationState?.operationId, "translation-123");
  });

  it("should expose the operation ID from the polling URI before the first poll and from the body afterwards", async () => {
    const poller = client.startTranslationWithPath({ updateIntervalInMs: 0 });
    await poller.submitted();
    assert.strictEqual(poller.operationState?.operationId, "translation-456");

    const result = await poller.pollUntilDone();
    assert.strictEqual(result.translatedCharacters, 84);
    assert.strictEqual(poller.operationState?.operationId, "translation-456");
  });
});
