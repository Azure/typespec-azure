import { expect, it } from "vitest";
import { $linter } from "../src/linter.js";

it("registers only the combined incoming rule and retains existing PATCH rules", () => {
  const names = $linter.rules.map((r) => r.name);
  expect(names).toContain("no-unsafe-patch-body-properties");
  expect(names).toContain("arm-resource-patch");
  expect(names).toContain("patch-envelope");
  expect(names).not.toContain("patch-body-parameters-schema");
  expect(names).not.toContain("consistent-patch-properties");
  expect(names).not.toContain("unsupported-patch-properties");
  expect(names).not.toContain("no-unsupported-patch-properties");
});
