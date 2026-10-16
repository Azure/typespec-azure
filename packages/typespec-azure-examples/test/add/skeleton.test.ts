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

  it("keeps read-only fields in response bodies but drops them from request bodies", () => {
    const resource = {
      type: "object",
      properties: {
        name: { type: "string" },
        id: { type: "string", readOnly: true },
        provisioningState: { type: "string", readOnly: true },
      },
    };
    const sig: OperationSignature = {
      operationId: "R_Put",
      parameters: {},
      body: resource,
      responses: { "200": { body: resource } },
    };
    const skeleton = skeletonForOperation(sig);
    // Request body omits server-populated read-only fields...
    expect(skeleton.request.body).toEqual({ name: "" });
    // ...but the response body includes them (that's the data a real example must show).
    expect(skeleton.responses["200"].body).toEqual({ name: "", id: "", provisioningState: "" });
  });
});
