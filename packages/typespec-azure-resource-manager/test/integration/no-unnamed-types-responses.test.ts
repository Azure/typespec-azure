import { resolvePath } from "@typespec/compiler";
import { createTester, expectDiagnostics } from "@typespec/compiler/testing";
import { ok } from "node:assert";
import { readFile } from "node:fs/promises";
import { it } from "vitest";

const tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
});

it.each(["Incorrect", "Correct"])(
  "checks the published %s implicit-response example without injected imports",
  async (heading) => {
    const guidance = await readFile(
      new URL("../../../typespec-azure-core/src/rules/no-unnamed-types.md", import.meta.url),
      "utf8",
    );
    const section = guidance.split("## Implicit response bodies\n")[1];
    ok(section);
    const example = new RegExp(`### ${heading}\\n[\\s\\S]*?\`\`\`tsp\\n([\\s\\S]*?)\`\`\``).exec(
      section,
    );
    ok(example);
    const [, diagnostics] = await tester.compileAndDiagnose(example[1], {
      compilerOptions: {
        linterRuleSet: {
          enable: { "@azure-tools/typespec-azure-core/no-unnamed-types": true },
        },
      },
    });
    expectDiagnostics(
      diagnostics,
      heading === "Incorrect"
        ? {
            code: "@azure-tools/typespec-azure-core/no-unnamed-types",
            message: "Anonymous model should be defined as a named model declaration.",
          }
        : [],
    );
  },
);
