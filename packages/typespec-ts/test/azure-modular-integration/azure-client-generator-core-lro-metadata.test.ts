import { assert, beforeEach, describe, it } from "vitest";
import {
  MetadataClient,
  restorePoller,
} from "./generated/azure/client-generator-core/lro/metadata/src/index.js";

describe("Azure ClientGenerator Core LRO status metadata", () => {
  let client: MetadataClient;

  beforeEach(() => {
    client = new MetadataClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    });
  });

  it("should expose usage from the latest status-monitor response", async () => {
    const poller = client.analyzeWithUsage("analyzer-1", { updateIntervalInMs: 0 });
    await poller.submitted();
    assert.isUndefined(poller.operationState?.usage);

    await poller.poll();
    assert.deepEqual(poller.operationState?.usage, {
      documentPagesBasic: 1,
      tokens: { input: 10 },
    });

    const result = await poller.pollUntilDone();
    assert.strictEqual(result.contents, "The document contains three sections.");
    assert.deepEqual(poller.operationState?.usage, {
      documentPagesBasic: 1,
      tokens: { input: 10, output: 4 },
    });
  });

  it("should expose job metadata from the initial response and refresh it after each poll", async () => {
    const poller = client.analyzeJob({ updateIntervalInMs: 0 });
    await poller.submitted();
    let state = poller.operationState!;
    assert.strictEqual(state.jobId, "job-success");
    assert.strictEqual(state.displayName, "Analyze documents");
    assert.deepEqual(state.createdDateTime, new Date("2025-01-01T10:00:00Z"));
    assert.deepEqual(state.lastUpdatedDateTime, new Date("2025-01-01T10:00:00Z"));
    assert.deepEqual(state.expirationDateTime, new Date("2025-01-02T10:00:00Z"));
    assert.isUndefined(state.statistics);
    assert.isUndefined(state.errors);

    const progress: (number | undefined)[] = [];
    poller.onProgress((s) => progress.push(s.statistics?.succeeded));
    const result = await poller.pollUntilDone();
    assert.deepEqual(result.documents, ["document-1", "document-2", "document-3"]);
    assert.deepEqual(progress, [1, 3]);

    state = poller.operationState!;
    assert.strictEqual(state.status, "succeeded");
    assert.deepEqual(state.statistics, { total: 3, succeeded: 3, failed: 0 });
    assert.deepEqual(state.errors, []);
    assert.deepEqual(state.lastUpdatedDateTime, new Date("2025-01-01T10:02:00Z"));
  });

  it("should keep job metadata available after the operation fails", async () => {
    const poller = client.analyzeJobWithFailure({ updateIntervalInMs: 0 });
    let error: unknown;
    try {
      await poller.pollUntilDone();
    } catch (e) {
      error = e;
    }
    assert.isDefined(error);

    const state = poller.operationState!;
    assert.strictEqual(state.status, "failed");
    assert.strictEqual(state.jobId, "job-failure");
    assert.deepEqual(state.statistics, { total: 3, succeeded: 1, failed: 2 });
    assert.deepEqual(state.errors, [
      { code: "InvalidDocument", message: "Document is empty.", target: "document-2" },
      { code: "InvalidDocument", message: "Document is unreadable.", target: "document-3" },
    ]);
    assert.deepEqual(state.lastUpdatedDateTime, new Date("2025-01-01T10:02:00Z"));
  });

  it("should not persist metadata in the continuation token and refresh it after rehydration", async () => {
    const poller = client.analyzeJob({ updateIntervalInMs: 0 });
    await poller.submitted();
    assert.strictEqual(poller.operationState?.jobId, "job-success");
    const serialized = await poller.serialize();
    assert.notInclude(serialized, "Analyze documents");

    const restored = restorePoller(client, serialized, client.analyzeJob, {
      updateIntervalInMs: 0,
    });
    assert.isUndefined(restored.operationState?.jobId);

    await restored.poll();
    assert.strictEqual(restored.operationState?.jobId, "job-success");
    assert.deepEqual(restored.operationState?.statistics, { total: 3, succeeded: 1, failed: 0 });

    const result = await restored.pollUntilDone();
    assert.deepEqual(result.documents, ["document-1", "document-2", "document-3"]);
    assert.deepEqual(restored.operationState?.statistics, { total: 3, succeeded: 3, failed: 0 });
  });
});
