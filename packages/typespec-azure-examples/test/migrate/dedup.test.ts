import { describe, expect, it } from "vitest";
import { buildLineages, type CollectedExample } from "../../src/migrate/dedup.js";
import type { MigratedVariant } from "../../src/migrate/model.js";

const order = ["2023-01-01", "2024-06-01", "2025-01-01"];
const compareVersions = (a: string, b: string) => order.indexOf(a) - order.indexOf(b);

function variant(body: unknown): MigratedVariant {
  return { request: { path: { id: "1" } }, responses: { "200": { body } } };
}

function collected(version: string, exampleName: string, body: unknown): CollectedExample {
  return { version, exampleName, variant: variant(body) };
}

describe("buildLineages", () => {
  it("collapses identical content across versions into a single base entry", () => {
    const result = buildLineages(
      [
        collected("2023-01-01", "Get", { name: "a" }),
        collected("2024-06-01", "Get", { name: "a" }),
      ],
      { compareVersions },
    );
    expect(result).toEqual([
      { request: { path: { id: "1" } }, responses: { "200": { body: { name: "a" } } } },
    ]);
  });

  it("emits a since variant when content changes", () => {
    const result = buildLineages(
      [
        collected("2023-01-01", "Get", { name: "a" }),
        collected("2024-06-01", "Get", { name: "b" }),
      ],
      { compareVersions },
    );
    expect(result).toHaveLength(2);
    expect(result[0].since).toBeUndefined();
    expect(result[1].since).toBe("2024-06-01");
    expect(result[1].responses["200"].body).toEqual({ name: "b" });
  });

  it("omits titles for a single lineage but keeps them for multiple", () => {
    const single = buildLineages([collected("2023-01-01", "Get", { name: "a" })], {
      compareVersions,
    });
    expect(single[0].title).toBeUndefined();

    const multi = buildLineages(
      [
        collected("2023-01-01", "With WebHook", { kind: "webhook" }),
        collected("2023-01-01", "With Queue", { kind: "queue" }),
      ],
      { compareVersions },
    );
    expect(multi.map((v) => v.title).sort()).toEqual(["With Queue", "With WebHook"]);
  });

  it("puts a since on the base entry when it first appears after the baseline", () => {
    const result = buildLineages([collected("2024-06-01", "Get", { name: "a" })], {
      compareVersions,
      baselineVersion: "2023-01-01",
    });
    expect(result[0].since).toBe("2024-06-01");
  });

  it("orders keys as title, since, request, responses", () => {
    const result = buildLineages(
      [
        collected("2023-01-01", "A", { v: 1 }),
        collected("2024-06-01", "A", { v: 2 }),
        collected("2023-01-01", "B", { v: 9 }),
      ],
      { compareVersions },
    );
    const sinceVariant = result.find((v) => v.since !== undefined);
    expect(sinceVariant && Object.keys(sinceVariant)).toEqual([
      "title",
      "since",
      "request",
      "responses",
    ]);
  });
});
