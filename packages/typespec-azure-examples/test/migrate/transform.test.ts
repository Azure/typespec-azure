import { describe, expect, it } from "vitest";
import type { ParameterLocation, XmsExampleDoc } from "../../src/migrate/swagger-types.js";
import { transformExample } from "../../src/migrate/transform.js";

const locations = new Map<string, ParameterLocation>([
  ["subscriptionId", "path"],
  ["resourceGroupName", "path"],
  ["$filter", "query"],
  ["If-Match", "header"],
  ["resource", "body"],
]);

describe("transformExample", () => {
  it("buckets parameters by location and drops api-version", () => {
    const doc: XmsExampleDoc = {
      parameters: {
        "api-version": "2024-06-01",
        subscriptionId: "sub",
        $filter: "name eq 'x'",
        "If-Match": "*",
        resource: { name: "cert" },
      },
      responses: { 200: { headers: { Location: "/op/1" }, body: { name: "cert" } } },
    };
    const variant = transformExample(doc, locations);
    expect(variant.request).toEqual({
      path: { subscriptionId: "sub" },
      query: { $filter: "name eq 'x'" },
      headers: { "If-Match": "*" },
      body: { name: "cert" },
    });
    expect(variant.responses).toEqual({
      "200": { headers: { Location: "/op/1" }, body: { name: "cert" } },
    });
  });

  it("defaults unknown parameter locations to query", () => {
    const doc: XmsExampleDoc = { parameters: { mystery: "value" }, responses: {} };
    expect(transformExample(doc, locations).request).toEqual({ query: { mystery: "value" } });
  });

  it("produces an empty request when there are no parameters", () => {
    const doc: XmsExampleDoc = { responses: { 204: {} } };
    const variant = transformExample(doc, locations);
    expect(variant.request).toEqual({});
    expect(variant.responses).toEqual({ "204": {} });
  });
});
