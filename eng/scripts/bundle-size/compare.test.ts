import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { repoRoot } from "../helpers.js";
import { renderMarkdown } from "./compare.ts";
import type { SizeReport } from "./measure.ts";
import { colored, isRepoPackage, type WorkspacePackage } from "./utils.ts";

const pkg = (size: number, unpackedSize: number) => ({ version: "1.0.0", size, unpackedSize });

describe("renderMarkdown", () => {
  it("colors a size increase in red and a decrease in green", () => {
    const base: SizeReport = { grew: pkg(1000, 4000), shrank: pkg(2000, 8000) };
    const head: SizeReport = { grew: pkg(1100, 4400), shrank: pkg(1800, 7200) };

    const markdown = renderMarkdown(base, head);

    expect(markdown).toContain(colored("+100 B (+10.0%)", "increase"));
    expect(markdown).toContain(colored("-200 B (-10.0%)", "decrease"));
  });

  it("reports the overall packed delta in the summary line", () => {
    const base: SizeReport = { a: pkg(1000, 4000), b: pkg(1000, 4000) };
    const head: SizeReport = { a: pkg(1200, 4000), b: pkg(1000, 4000) };

    expect(renderMarkdown(base, head)).toContain(
      `1 package changed size, ${colored("+200 B (+10.0%)", "increase")} packed overall.`,
    );
  });

  it("double-escapes the percent sign so it survives GitHub's markdown pass", () => {
    const markdown = renderMarkdown({ a: pkg(1000, 4000) }, { a: pkg(1100, 4400) });
    expect(markdown).toContain("(+10.0\\\\%)");
    expect(markdown).not.toMatch(/[^\\]%/);
  });

  it("renders an unchanged package without any color markup", () => {
    const markdown = renderMarkdown({ a: pkg(1000, 4000) }, { a: pkg(1000, 4000) });
    expect(markdown).toContain("✅ No package size changes compared to the base branch.");
    expect(markdown).not.toContain("\\textcolor");
  });

  it("flags added and removed packages", () => {
    const markdown = renderMarkdown({ gone: pkg(1000, 4000) }, { added: pkg(500, 2000) });
    expect(markdown).toContain("`added` 🆕");
    expect(markdown).toContain("`gone` 🗑️");
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
