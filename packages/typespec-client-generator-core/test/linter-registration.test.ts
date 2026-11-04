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

it("registers redundant group-name guidance without enabling it for C#", () => {
  const name = "no-redundant-operation-group-name";
  expect($linter.rules.filter((rule) => rule.name === name)).toHaveLength(1);
  expect(
    $linter.ruleSets?.["best-practices:csharp"].enable?.[
      `@azure-tools/typespec-client-generator-core/${name}`
    ],
  ).toBeUndefined();
});

it("includes redundant group-name guidance in the library all ruleset", async () => {
  const [, diagnostics] = await SimpleTester.compileAndDiagnose(
    `@service namespace Test;
     interface Widgets { @get op getWidget(): string; }`,
    {
      compilerOptions: {
        linterRuleSet: { extends: ["@azure-tools/typespec-client-generator-core/all"] },
      },
    },
  );
  expect(diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
  expect(
    diagnostics.filter(
      (diagnostic) =>
        diagnostic.code ===
        "@azure-tools/typespec-client-generator-core/no-redundant-operation-group-name",
    ),
  ).toHaveLength(1);
});
