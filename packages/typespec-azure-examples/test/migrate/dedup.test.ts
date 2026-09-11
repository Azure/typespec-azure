import { describe, expect, it } from "vitest";
import { buildLineages, type CollectedExample } from "../../src/migrate/dedup.js";
import type { MigratedVariant } from "../../src/migrate/model.js";

const order = ["2023-01-01", "2024-06-01", "2025-01-01"];
const compareVersions = (a: string, b: string) => order.indexOf(a) - order.indexOf(b);

function variant(body: unknown): MigratedVariant {
  return { request: { path: { id: "1" } }, responses: { "200": { body } } };
}

function collected(
  version: string,
  exampleName: string,
  body: unknown,
  fileName = `${exampleName}.json`,
): CollectedExample {
  return { version, exampleName, fileName, variant: variant(body) };
}

function build(
  examples: readonly CollectedExample[],
  operationId: string,
  extra: { baselineVersion?: string } = {},
): MigratedVariant[] {
  return buildLineages(examples, { operationId, compareVersions, ...extra });
}

describe("buildLineages", () => {
  it("collapses identical content across versions into a single base entry", () => {
    const result = build(
      [
        collected("2023-01-01", "Widgets_Get", { name: "a" }),
        collected("2024-06-01", "Widgets_Get", { name: "a" }),
      ],
      "Widgets_Get",
    );
    // Key and file name both follow the default convention => neither title nor legacyFilename.
    expect(result).toEqual([
      {
        request: { path: { id: "1" } },
        responses: { "200": { body: { name: "a" } } },
      },
    ]);
  });

  it("emits a since variant when content changes", () => {
    const result = build(
      [
        collected("2023-01-01", "Widgets_Get", { name: "a" }),
        collected("2024-06-01", "Widgets_Get", { name: "b" }),
      ],
      "Widgets_Get",
    );
    expect(result).toHaveLength(2);
    expect(result[0].since).toBeUndefined();
    expect(result[1].since).toBe("2024-06-01");
    expect(result[1].responses["200"].body).toEqual({ name: "b" });
  });

  it("omits titles for a single lineage but keeps them for multiple", () => {
    const single = build([collected("2023-01-01", "Widgets_Get", { name: "a" })], "Widgets_Get");
    expect(single[0].title).toBeUndefined();

    const multi = build(
      [
        collected("2023-01-01", "With WebHook", { kind: "webhook" }),
        collected("2023-01-01", "With Queue", { kind: "queue" }),
      ],
      "Notifications_Create",
    );
    expect(multi.map((v) => v.title).sort()).toEqual(["With Queue", "With WebHook"]);
  });

  it("puts a since on the base entry when it first appears after the baseline", () => {
    const result = build([collected("2024-06-01", "Widgets_Get", { name: "a" })], "Widgets_Get", {
      baselineVersion: "2023-01-01",
    });
    expect(result[0].since).toBe("2024-06-01");
  });

  it("orders keys as title, since, legacyFilename, request, responses", () => {
    const result = build(
      [
        collected("2023-01-01", "A", { v: 1 }),
        collected("2024-06-01", "A", { v: 2 }),
        collected("2023-01-01", "B", { v: 9 }),
      ],
      "Ops_List",
    );
    const sinceVariant = result.find((v) => v.since !== undefined);
    expect(sinceVariant && Object.keys(sinceVariant)).toEqual([
      "title",
      "since",
      "legacyFilename",
      "request",
      "responses",
    ]);
  });

  it("omits both title and legacyFilename when they follow the default convention", () => {
    const result = build([collected("2023-01-01", "Widgets_Get", { name: "a" })], "Widgets_Get");
    expect(result[0].title).toBeUndefined();
    expect(result[0].legacyFilename).toBeUndefined();
  });

  it("stores only legacyFilename when the key is recoverable from the file name", () => {
    // Key differs from operationId but equals the file name (minus extension) => file name only.
    const result = build(
      [
        collected("2023-01-01", "Custom_Name", { name: "a" }, "Custom_Name.json"),
        collected("2024-06-01", "Custom_Name", { name: "b" }, "Custom_Name.json"),
      ],
      "Widgets_Get",
    );
    expect(result.map((v) => v.title)).toEqual([undefined, undefined]);
    expect(result.map((v) => v.legacyFilename)).toEqual(["Custom_Name.json", "Custom_Name.json"]);
  });

  it("stores a title when the key cannot be recovered from the file name", () => {
    const result = build(
      [collected("2023-01-01", "Get a widget", { name: "a" }, "Widgets_Get.json")],
      "Widgets_Get",
    );
    expect(result[0].title).toBe("Get a widget");
    expect(result[0].legacyFilename).toBe("Widgets_Get.json");
  });

  it("omits legacyFilename when the file follows the operationId + title default", () => {
    const result = build(
      [collected("2023-01-01", "With Filter", { name: "a" }, "Widgets_Get_With_Filter.json")],
      "Widgets_Get",
    );
    expect(result[0].title).toBe("With Filter");
    expect(result[0].legacyFilename).toBeUndefined();
  });
});
