import { expect, it } from "vitest";
import { $linter } from "../src/index.js";

it("registers only the combined verb rule without enabling it for C#", () => {
  const names = $linter.rules.map((rule) => rule.name);
  expect(names.filter((name) => name === "use-correct-verb")).toHaveLength(1);
  for (const oldName of ["use-create-for-put", "use-update-for-patch", "use-delete-for-delete"]) {
    expect(names).not.toContain(oldName);
    expect(
      $linter.ruleSets?.["best-practices:csharp"].enable?.[
        `@azure-tools/typespec-client-generator-core/${oldName}`
      ],
    ).toBeUndefined();
  }
  expect(
    $linter.ruleSets?.["best-practices:csharp"].enable?.[
      "@azure-tools/typespec-client-generator-core/use-correct-verb"
    ],
  ).toBeUndefined();
});
