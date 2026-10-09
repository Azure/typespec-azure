import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { repoRoot } from "../helpers.js";
import { renderMarkdown } from "./compare.ts";
import type { SizeReport } from "./measure.ts";
import type { WorkspacePackage } from "./utils.ts";
import { changeIndicator, isNotableSizeChange, isRepoPackage, LEGEND } from "./utils.ts";

const pkg = (size: number, unpackedSize: number) => ({ version: "1.0.0", size, unpackedSize });

describe("renderMarkdown", () => {
  it("marks a notable increase with 🔴 and a notable decrease with 🟢", () => {
    const base: SizeReport = { grew: pkg(10000, 40000), shrank: pkg(10000, 40000) };
    const head: SizeReport = { grew: pkg(11000, 44000), shrank: pkg(9000, 36000) };

    const markdown = renderMarkdown(base, head);

    expect(markdown).toContain("+1000 B (+10.0%) 🔴");
    expect(markdown).toContain("-1000 B (-10.0%) 🟢");
  });

  it("leaves sub-threshold noise unmarked and out of the top table", () => {
    // 100 B on a ~1 MB package: under the byte floor and only 0.0% - not worth flagging.
    const markdown = renderMarkdown(
      { a: pkg(1_000_000, 4_000_000) },
      { a: pkg(1_000_100, 4_000_000) },
    );

    expect(markdown).toContain("✅ No notable package size changes compared to the base branch.");
    expect(markdown).toContain("1 package(s) with no notable change");
    // The trailing pipe proves the cell ends right after the percentage, with no marker.
    expect(markdown).toContain("+100 B (+0.0%) |");
  });

  it("groups away a jar-timestamp style wobble (packed moves, unpacked identical)", () => {
    // What `@azure-tools/typespec-java` does on every run: its Maven jar carries wall-clock
    // build timestamps, so the bytes differ but the length does not.
    const markdown = renderMarkdown(
      { "@azure-tools/typespec-java": pkg(14_166_651, 15_760_257) },
      { "@azure-tools/typespec-java": pkg(14_166_605, 15_760_257) },
    );

    expect(markdown).toContain("✅ No notable package size changes compared to the base branch.");
    expect(markdown).toContain("-46 B (-0.0%) |");
  });

  it("leaves a large percentage of a tiny package unmarked when the byte delta is trivial", () => {
    // 10 B on a 300 B package is 3.3%, but 10 B is noise in absolute terms.
    const markdown = renderMarkdown({ a: pkg(300, 900) }, { a: pkg(310, 900) });

    expect(markdown).toContain("+10 B (+3.3%) |");
    expect(markdown).toContain("✅ No notable package size changes compared to the base branch.");
  });

  it("reports the overall packed delta in the summary line", () => {
    const base: SizeReport = { a: pkg(10000, 40000), b: pkg(10000, 40000) };
    const head: SizeReport = { a: pkg(11000, 40000), b: pkg(10000, 40000) };

    expect(renderMarkdown(base, head)).toContain(
      "1 package changed size, +1000 B (+5.0%) 🔴 packed overall.",
    );
  });

  it("renders an unchanged package without any marker", () => {
    const markdown = renderMarkdown({ a: pkg(1000, 4000) }, { a: pkg(1000, 4000) });
    expect(markdown).toContain("✅ No notable package size changes compared to the base branch.");
    expect(markdown).toContain("| `a` | 1000 B → 1000 B | — | 3.91 KB → 3.91 KB | — |");
  });

  it("flags added and removed packages with a status label instead of a marker", () => {
    const markdown = renderMarkdown({ gone: pkg(1000, 4000) }, { added: pkg(500, 2000) });
    expect(markdown).toContain("`added` 🆕");
    expect(markdown).toContain("`gone` 🗑️");
    expect(markdown).toContain("+500 B (new) |");
    expect(markdown).toContain("-1000 B (-100.0%) |");
  });

  it("always explains the markers in the legend", () => {
    const markdown = renderMarkdown({ a: pkg(1000, 4000) }, { a: pkg(1000, 4000) });
    expect(markdown).toContain(LEGEND);
  });
});

describe("isNotableSizeChange", () => {
  it("requires both the byte and the percentage threshold to be crossed", () => {
    expect(isNotableSizeChange(1000, 10000)).toBe(true); // 1000 B, 10%
    expect(isNotableSizeChange(100, 10000)).toBe(false); // under the byte floor
    expect(isNotableSizeChange(1000, 10_000_000)).toBe(false); // under the percentage floor
  });

  it("always treats a brand new package as notable", () => {
    expect(isNotableSizeChange(1, 0)).toBe(true);
    expect(isNotableSizeChange(0, 0)).toBe(false);
  });
});

describe("changeIndicator", () => {
  it("returns an empty string rather than a neutral marker for noise", () => {
    expect(changeIndicator(10, 10000)).toBe("");
    expect(changeIndicator(0, 10000)).toBe("");
  });
});

describe("isRepoPackage", () => {
  const makePackage = (path: string): WorkspacePackage => ({
    name: "pkg",
    version: "1.0.0",
    path: resolve(repoRoot, path),
    private: false,
  });

  it.each(["packages/typespec-azure-core", "packages/typespec-ts"])("includes %s", (path) => {
    expect(isRepoPackage(makePackage(path))).toBe(true);
  });

  it.each(["core/packages/compiler", "core", "packages", "website"])("excludes %s", (path) => {
    expect(isRepoPackage(makePackage(path))).toBe(false);
  });
});
