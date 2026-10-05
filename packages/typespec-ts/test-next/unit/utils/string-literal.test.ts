import { describe, expect, it } from "vitest";
import { toTypeScriptStringLiteral } from "../../../src/utils/string-literal.js";

describe("toTypeScriptStringLiteral", () => {
  it.each([
    'quote " and backslash \\',
    "</script>",
    "line\ncontrol\u0001",
    "line separator \u2028 paragraph separator \u2029",
  ])("round-trips %j without unsafe source characters", (value) => {
    const literal = toTypeScriptStringLiteral(value);

    expect(Function(`return ${literal}`)()).toBe(value);
    expect(literal).not.toMatch(/[<>]/);
    expect(literal).not.toContain("\u2028");
    expect(literal).not.toContain("\u2029");
  });

  it("uses Unicode escapes for script-breaking characters", () => {
    expect(toTypeScriptStringLiteral("</script>\u2028\u2029")).toBe(
      '"\\u003c/script\\u003e\\u2028\\u2029"',
    );
  });
});
