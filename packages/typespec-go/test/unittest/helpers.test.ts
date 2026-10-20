import { describe, expect, it } from "vitest";
import { getUniqueVarName } from "../../src/codegen/core/helpers.js";

describe("getUniqueVarName", () => {
  it("uses the first available candidate", () => {
    expect(getUniqueVarName([], ["resp", "response"])).toBe("resp");
    expect(getUniqueVarName([{ name: "resp" }], ["resp", "response"])).toBe("response");
  });

  it("suffixes the last candidate when all candidates collide", () => {
    expect(getUniqueVarName([{ name: "resp" }, { name: "response" }], ["resp", "response"])).toBe(
      "response0",
    );
  });

  it("skips occupied suffixes", () => {
    expect(
      getUniqueVarName(
        [{ name: "resp" }, { name: "response" }, { name: "response0" }, { name: "response1" }],
        ["resp", "response"],
      ),
    ).toBe("response2");
  });

  it("supports a single candidate", () => {
    expect(getUniqueVarName([{ name: "resp" }], ["resp"])).toBe("resp0");
  });
});
