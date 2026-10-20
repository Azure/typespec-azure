import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it } from "vitest";
import { $linter } from "../../src/linter.js";
import { useCorrectVerbRule } from "../../src/rules/use-correct-verb.js";
import { ArmBaseTester, ArmTester, SimpleTester } from "../tester.js";

const header = "@service namespace Test;";
const cases = [
  {
    verb: "put",
    prefix: "create",
    invalid: "replace",
    template: "ArmResourceCreateOrReplaceAsync<Widget>",
  },
  {
    verb: "patch",
    prefix: "update",
    invalid: "modify",
    template: "ArmResourcePatchSync<Widget, Properties = WidgetProperties>",
  },
  {
    verb: "delete",
    prefix: "delete",
    invalid: "remove",
    template: "ArmResourceDeleteSync<Widget>",
  },
] as const;

function diagnostic(verb: string, prefix: string, operationName: string, target = operationName) {
  return {
    code: "@azure-tools/typespec-client-generator-core/use-correct-verb",
    severity: "warning" as const,
    message: `${verb.toUpperCase()} SDK method name '${operationName}' should start with '${prefix}'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
    target,
  };
}

describe.each(cases)("$verb SDK names", ({ verb, prefix, invalid }) => {
  let tester: LinterRuleTester;
  beforeEach(async () => {
    const runner = await SimpleTester.import("@typespec/openapi").createInstance();
    tester = createLinterRuleTester(
      runner,
      useCorrectVerbRule,
      "@azure-tools/typespec-client-generator-core",
    );
  });
  const endpoint = (name: string) => `@${verb} @route("/widgets") op ${name}(): void;`;
  const finding = (name: string, target = name) => diagnostic(verb, prefix, name, target);

  it.each(["", "Widget", "OrUpdate"])("accepts the prefix with suffix %s", async (suffix) => {
    await tester.expect(`${header} ${endpoint(prefix + suffix)}`).toBeValid();
  });
  it("accepts prefixes case-insensitively", async () => {
    await tester.expect(`${header} ${endpoint(prefix.toUpperCase() + "Widget")}`).toBeValid();
  });
  it.each(["invalid", "prefix-inside", "truncated"])("rejects a %s name", async (kind) => {
    const name =
      kind === "invalid"
        ? invalid
        : kind === "prefix-inside"
          ? `soft${prefix}`
          : prefix.slice(0, -1);
    await tester.expect(`${header} ${endpoint(name)}`).toEmitDiagnostics([finding(name)]);
  });
  it("honors an unscoped common name", async () => {
    await tester
      .expect(`${header} @clientName("${prefix}Widget") ${endpoint(invalid)}`)
      .toBeValid();
  });
  it("targets the authored operation for invalid common names", async () => {
    await tester
      .expect(`${header} @clientName("${invalid}") ${endpoint(prefix)}`)
      .toEmitDiagnostics([finding(invalid, prefix)]);
  });
  it("ignores a scoped override of a compliant common name", async () => {
    await tester
      .expect(`${header} @clientName("${invalid}", "csharp") ${endpoint(prefix)}`)
      .toBeValid();
  });
  it("does not let a scoped override mask an invalid common name", async () => {
    await tester
      .expect(`${header} @clientName("${prefix}", "python") ${endpoint(invalid)}`)
      .toEmitDiagnostics([finding(invalid)]);
  });
  it("uses common names when scoped overrides coexist", async () => {
    await tester
      .expect(
        `${header} @clientName("${prefix}") @clientName("${invalid}", "csharp") ${endpoint(invalid)}`,
      )
      .toBeValid();
    await tester
      .expect(
        `${header} @clientName("${invalid}") @clientName("${prefix}", "python") ${endpoint(prefix)}`,
      )
      .toEmitDiagnostics([finding(invalid, prefix)]);
  });
  it("normalizes exact common names", async () => {
    await tester
      .expect(`${header} @clientName(exact("${prefix.toUpperCase()}Widget")) ${endpoint(invalid)}`)
      .toBeValid();
    await tester
      .expect(`${header} @clientName(exact("${invalid}Widget")) ${endpoint(prefix)}`)
      .toEmitDiagnostics([finding(invalid + "Widget", prefix)]);
  });
  it("uses friendly names as a fallback, not instead of common names", async () => {
    await tester.expect(`${header} @friendlyName("${prefix}") ${endpoint(invalid)}`).toBeValid();
    await tester
      .expect(`${header} @friendlyName("${invalid}") ${endpoint(prefix)}`)
      .toEmitDiagnostics([finding(invalid, prefix)]);
    await tester
      .expect(`${header} @friendlyName("${invalid}") @clientName("${prefix}") ${endpoint(invalid)}`)
      .toBeValid();
  });
  it("ignores OpenAPI operation IDs in both directions", async () => {
    await tester
      .expect(`${header} @TypeSpec.OpenAPI.operationId("Widgets_${prefix}") ${endpoint(invalid)}`)
      .toEmitDiagnostics([finding(invalid)]);
    await tester
      .expect(`${header} @TypeSpec.OpenAPI.operationId("Widgets_${invalid}") ${endpoint(prefix)}`)
      .toBeValid();
  });
  it("does not let group names or underscores mask an invalid method", async () => {
    await tester
      .expect(
        `${header} interface ${prefix}Widgets { @${verb} @route("/widgets") ${invalid}_${prefix}(): void; }`,
      )
      .toEmitDiagnostics([finding(`${invalid}_${prefix}`)]);
  });
  it.each([200, 201, 202, 204])("checks names independently of response code %s", async (code) => {
    await tester
      .expect(
        `${header} @${verb} @route("/widgets") op ${invalid}(): { @statusCode code: ${code} };`,
      )
      .toEmitDiagnostics([finding(invalid)]);
  });
  it("reports each concrete endpoint once", async () => {
    await tester
      .expect(
        `${header}
      @${verb} @route("/one") op ${invalid}One(): void;
      @${verb} @route("/two") op ${invalid}Two(): void;
      @${verb} @route("/valid") op ${prefix}(): void;
    `,
      )
      .toEmitDiagnostics([finding(invalid + "One"), finding(invalid + "Two")]);
  });
  it("does not check client-only declarations outside the service", async () => {
    await tester
      .expect(
        `
      @service namespace Test { ${endpoint(invalid)} }
      namespace Customizations { @${verb} @route("/other") op helper(): void; }
    `,
      )
      .toEmitDiagnostics([finding(invalid)]);
  });
});

describe("combined endpoint selection", () => {
  let tester: LinterRuleTester;
  beforeEach(async () => {
    tester = createLinterRuleTester(
      await SimpleTester.createInstance(),
      useCorrectVerbRule,
      "@azure-tools/typespec-client-generator-core",
    );
  });
  it("reports PUT, PATCH, and DELETE together without duplicate findings", async () => {
    await tester
      .expect(
        `${header}
      @put @route("/put") op replace(): void;
      @patch @route("/patch") op modify(): void;
      @delete @route("/delete") op remove(): void;
      @get @route("/get") op read(): void;
      @post @route("/post") op submit(): void;
      @head @route("/head") op inspect(): void;
    `,
      )
      .toEmitDiagnostics(
        cases.map(({ verb, prefix, invalid }) => diagnostic(verb, prefix, invalid)),
      );
  });
  it("registers only the combined rule, without enabling it for C#", () => {
    const names = $linter.rules.map((rule) => rule.name);
    expect(names).toContain("use-correct-verb");
    for (const oldName of ["use-create-for-put", "use-update-for-patch", "use-delete-for-delete"]) {
      expect(names).not.toContain(oldName);
    }
    expect(
      $linter.ruleSets?.["best-practices:csharp"].enable?.[
        "@azure-tools/typespec-client-generator-core/use-correct-verb"
      ],
    ).toBeUndefined();
  });
});

describe("standard ARM operations", () => {
  let tester: LinterRuleTester;
  const resource = `
    @armProviderNamespace @service @armCommonTypesVersion(CommonTypes.Versions.v5) namespace Arm;
    model Widget is TrackedResource<WidgetProperties> {
      @key("widgetName") @segment("widgets") name: string;
    }
    model WidgetProperties { provisioningState?: ResourceProvisioningState; }
  `;
  beforeEach(async () => {
    tester = createLinterRuleTester(
      await ArmTester.createInstance(),
      useCorrectVerbRule,
      "@azure-tools/typespec-client-generator-core",
    );
  });
  it.each(cases)(
    "checks $verb aliases and common overrides",
    async ({ verb, prefix, invalid, template }) => {
      await tester
        .expect(
          `${resource} @armResourceOperations interface Widgets { ${invalid} is ${template}; }`,
        )
        .toEmitDiagnostics([diagnostic(verb, prefix, invalid)]);
      await tester
        .expect(
          `${resource} @armResourceOperations interface Widgets { ${prefix} is ${template}; }`,
        )
        .toBeValid();
      await tester
        .expect(
          `${resource} @armResourceOperations interface Widgets { @clientName("${prefix}Widget") ${invalid} is ${template}; }`,
        )
        .toBeValid();
      await tester
        .expect(
          `${resource} @armResourceOperations interface Widgets { @clientName("${invalid}") ${prefix} is ${template}; }`,
        )
        .toEmitDiagnostics([diagnostic(verb, prefix, invalid, prefix)]);
    },
  );
});

describe("published ARM examples", () => {
  it("compiles the incorrect, correct, and common-name examples", async () => {
    const docs = await readFile(
      new URL("../../src/rules/use-correct-verb.md", import.meta.url),
      "utf8",
    );
    const snippets = [...docs.matchAll(/```typespec\r?\n([\s\S]*?)```/g)].map((match) => match[1]);
    expect(snippets).toHaveLength(5);
    const tester = createLinterRuleTester(
      await ArmBaseTester.createInstance(),
      useCorrectVerbRule,
      "@azure-tools/typespec-client-generator-core",
    );
    await tester
      .expect(`${snippets[0]}\n${snippets[1]}`)
      .toEmitDiagnostics(
        cases.map(({ verb, prefix, invalid }) => diagnostic(verb, prefix, invalid)),
      );
    await tester.expect(`${snippets[0]}\n${snippets[2]}`).toBeValid();
    await tester.expect(`${snippets[0]}\n${snippets[3]}`).toBeValid();
    const runner = await ArmBaseTester.createInstance();
    const [, diagnostics] = await runner.compileAndDiagnose(`${snippets[0]}\n${snippets[4]}`, {
      linterRuleSet: {
        enable: { "@azure-tools/typespec-client-generator-core/use-correct-verb": true },
      },
    });
    expect(diagnostics).toEqual([]);
  });
});
