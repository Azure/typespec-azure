import { expectDiagnostics } from "@typespec/compiler/testing";
import { expect, it } from "vitest";
import { $linter } from "../src/index.js";
import { SimpleTester } from "./tester.js";

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

it("registers repeated client-name guidance without enabling it for C#", () => {
  const name = "no-repeated-client-name";
  expect($linter.rules.filter((rule) => rule.name === name)).toHaveLength(1);
  expect(
    $linter.ruleSets?.["best-practices:csharp"].enable?.[
      `@azure-tools/typespec-client-generator-core/${name}`
    ],
  ).toBeUndefined();
});

it("includes redundant client-name guidance in all but not the C# preset", async () => {
  const name = "no-redundant-client-name";
  const fullName = `@azure-tools/typespec-client-generator-core/${name}` as const;
  expect($linter.rules.filter((rule) => rule.name === name)).toHaveLength(1);
  expect($linter.ruleSets?.["best-practices:csharp"].enable?.[fullName]).toBeUndefined();
  const diagnostics = await SimpleTester.diagnose(
    `model Widget { @clientName("name") name: string; }`,
    {
      compilerOptions: {
        linterRuleSet: { extends: ["@azure-tools/typespec-client-generator-core/all"] },
      },
    },
  );
  expectDiagnostics(diagnostics, {
    code: fullName,
    severity: "warning",
    message: "This @clientName override does not change SDK naming. Remove the override.",
  });
});
