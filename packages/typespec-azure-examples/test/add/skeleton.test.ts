import { describe, expect, it } from "vitest";
import type { OperationSignature } from "../../src/add/index.js";
import { skeletonForOperation } from "../../src/add/index.js";

function signature(responses: Record<string, unknown>): OperationSignature {
  return { operationId: "X_Do", parameters: {}, responses };
}

describe("skeletonForOperation", () => {
  it("emits a concrete success response body", () => {
    const skeleton = skeletonForOperation(
      signature({ "200": { body: { type: "object", properties: { name: { type: "string" } } } } }),
    );
    expect(skeleton.responses).toEqual({ "200": { body: { name: "" } } });
  });

  it("never scaffolds a `default` (non-status) response key", () => {
    // The validator rejects a `default` response key, so an operation whose only response is
    // `default` must produce no response skeleton rather than an invalid one.
    const skeleton = skeletonForOperation(
      signature({
        default: { body: { type: "object", properties: { code: { type: "string" } } } },
      }),
    );
    expect(skeleton.responses).toEqual({});
  });

  it("prefers success codes over other concrete codes", () => {
    const skeleton = skeletonForOperation(
      signature({ "404": { body: null }, "200": { body: { type: "string" } } }),
    );
    expect(Object.keys(skeleton.responses)).toEqual(["200"]);
  });
});
