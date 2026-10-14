import { expect, it } from "vitest";
import { $linter } from "../src/linter.js";

it("keeps extension routing opt-in without disabling existing ARM all rules", () => {
  const all = $linter.ruleSets?.all.enable;
  const code = "@azure-tools/typespec-azure-resource-manager/use-scope-for-extension-routing";
  expect(all?.[code]).toBe(false);
  for (const rule of $linter.rules.filter(
    (item) => item.name !== "use-scope-for-extension-routing",
  )) {
    expect(all?.[`@azure-tools/typespec-azure-resource-manager/${rule.name}`]).toBe(true);
  }
});
