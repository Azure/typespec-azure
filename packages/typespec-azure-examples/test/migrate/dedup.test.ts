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
    expect(result).toEqual([
      {
        id: "Widgets_Get",
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

  it("stores an extension-free ID when the key is recoverable from the file name", () => {
    // Key differs from operationId but equals the file name (minus extension) => file name only.
    const result = build(
      [
        collected("2023-01-01", "Custom_Name", { name: "a" }, "Custom_Name.json"),
        collected("2024-06-01", "Custom_Name", { name: "b" }, "Custom_Name.json"),
      ],
      "Widgets_Get",
    );
    expect(result.map((v) => v.title)).toEqual([undefined, undefined]);
    expect(result.map((v) => v.id)).toEqual(["Custom_Name", "Custom_Name"]);
    expect(result.every((v) => v.legacyFilename === undefined)).toBe(true);
  });

  it("stores a title when the key cannot be recovered from the file name", () => {
    const result = build(
      [collected("2023-01-01", "Get a widget", { name: "a" }, "Widgets_Get.json")],
      "Widgets_Get",
    );
    expect(result[0].title).toBe("Get a widget");
    expect(result[0].id).toBe("Widgets_Get");
  });

  it("preserves the filename independently of the display title", () => {
    const result = build(
      [collected("2023-01-01", "With Filter", { name: "a" }, "Widgets_Get_With_Filter.json")],
      "Widgets_Get",
    );
    expect(result[0].title).toBe("With Filter");
    expect(result[0].id).toBe("Widgets_Get_With_Filter");
    expect(result[0].legacyFilename).toBeUndefined();
  });

  it("preserves historical filename changes even when the payload is unchanged", () => {
    const result = build(
      [
        collected("2023-01-01", "Get a widget", { name: "a" }, "First.json"),
        collected("2024-06-01", "Get a widget", { name: "a" }, "Later.json"),
      ],
      "Widgets_Get",
    );
    expect(
      result.map((entry) => [entry.id, entry.title, entry.since, entry.legacyFilename]),
    ).toEqual([
      [undefined, "Get a widget", undefined, "First.json"],
      [undefined, "Get a widget", "2024-06-01", "Later.json"],
    ]);
  });

  it("keeps a filename-based ID when only the legacy display title changes", () => {
    const result = build(
      [
        collected("2023-01-01", "Original title", { name: "a" }, "Get_Widget.json"),
        collected("2024-06-01", "Updated title", { name: "a" }, "Get_Widget.json"),
      ],
      "Widgets_Get",
    );
    expect(result.map((entry) => [entry.id, entry.title, entry.since])).toEqual([
      ["Get_Widget", "Original title", undefined],
      ["Get_Widget", "Updated title", "2024-06-01"],
    ]);
  });

  it("assigns unique IDs when operations share an original filename", () => {
    const usedIds = new Set<string>();
    const first = buildLineages([collected("2023-01-01", "Shared", {}, "Shared.json")], {
      operationId: "First_Get",
      compareVersions,
      usedIds,
    });
    const second = buildLineages([collected("2023-01-01", "Shared", {}, "Shared.json")], {
      operationId: "Second_Get",
      compareVersions,
      usedIds,
    });
    expect(first[0].id).toBe("Shared");
    expect(second[0].id).toBe("Shared_2");
    expect(second[0].title).toBe("Shared");
  });
});
