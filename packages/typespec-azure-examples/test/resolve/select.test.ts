import { describe, expect, it } from "vitest";
import { selectApplicable } from "../../src/resolve/select.js";

const order = ["2023-01-01", "2024-06-01", "2025-01-01"];

describe("selectApplicable", () => {
  it("picks the base entry when the target predates every since", () => {
    const entries = [{ id: "base" }, { id: "v2", since: "2024-06-01" }];
    expect(selectApplicable(entries, "2023-01-01", order)?.id).toBe("base");
  });

  it("picks the greatest since that is <= the target", () => {
    const entries = [
      { id: "base" },
      { id: "v2", since: "2024-06-01" },
      { id: "v3", since: "2025-01-01" },
    ];
    expect(selectApplicable(entries, "2024-06-01", order)?.id).toBe("v2");
    expect(selectApplicable(entries, "2025-01-01", order)?.id).toBe("v3");
  });

  it("prefers a since equal to the target over the base", () => {
    const entries = [{ id: "base" }, { id: "exact", since: "2024-06-01" }];
    expect(selectApplicable(entries, "2024-06-01", order)?.id).toBe("exact");
  });

  it("returns undefined when nothing applies (no base, all since newer)", () => {
    const entries = [{ id: "v3", since: "2025-01-01" }];
    expect(selectApplicable(entries, "2023-01-01", order)).toBeUndefined();
  });

  it("ignores entries whose since is not in the order", () => {
    const entries = [{ id: "base" }, { id: "bogus", since: "1999-01-01" }];
    expect(selectApplicable(entries, "2025-01-01", order)?.id).toBe("base");
  });

  it("returns undefined when the target is not in the order", () => {
    expect(selectApplicable([{ id: "base" }], "2099-01-01", order)).toBeUndefined();
  });
});
