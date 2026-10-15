import { Tester } from "#test/test-host.js";
import { type LinterRuleSet, resolveCompilerOptions } from "@typespec/compiler";
import {
  expectDiagnosticEmpty,
  expectDiagnostics,
  mockFile,
  resolveVirtualPath,
} from "@typespec/compiler/testing";
import assert from "assert";
import { describe, expect, it } from "vitest";
import type { CasingStyleOptions } from "../../src/rules/casing-style.js";
import {
  isCamelCaseNoAcronyms,
  isPascalCaseNoAcronyms,
  isPascalCaseWithAcceptedAcronyms,
  isSnakeCase,
} from "../../src/rules/utils.js";

describe("utils", () => {
  it("isSnakeCase accepts lowercase words and digits separated by single underscores", () => {
    ["a", "name", "first_name", "utf8_value", "v2", "version_2", "v2_3_value"].forEach((name) =>
      assert.ok(isSnakeCase(name), `${name} should be snake_case`),
    );
    [
      "",
      "_",
      "_name",
      "name_",
      "first__name",
      "firstName",
      "FirstName",
      "HTTP",
      "2name",
      "123",
      "$name",
      "first-name",
      "first.name",
      "first name",
      "naïve",
    ].forEach((name) => assert.ok(!isSnakeCase(name), `${name} should not be snake_case`));
  });

  it("isPascalCaseNoAcronyms works as expected", () => {
    ["", "A", "PascalCase", "PascalCase123", "SignalR", "VmResource", "Rp"].forEach((name) =>
      assert.ok(isPascalCaseNoAcronyms(name), `${name} should be PascalCase`),
    );
    ["a", "foo", "fooBar", "foo_bar", "foo-bar", "VMResource", "RP"].forEach((name) => {
      assert.ok(!isPascalCaseNoAcronyms(name), `${name} should not be PascalCase`);
    });
  });
  it("isPascalCaseWithAcceptedAcronyms works as expected", () => {
    const acceptedTestAcronyms = ["AI"];
    ["", "A", "PascalCase", "PascalCase123", "OpenAI", "OpenAIAgent", "AI", "AIPolicy"].forEach(
      (name) =>
        assert.ok(
          isPascalCaseWithAcceptedAcronyms(name, acceptedTestAcronyms),
          `${name} should be PascalCase`,
        ),
    );
    ["a", "foo", "fooBar", "VMResource", "RP", "OpenAIAGent", "OpenAIAgentVM"].forEach((name) => {
      assert.ok(
        !isPascalCaseWithAcceptedAcronyms(name, acceptedTestAcronyms),
        `${name} should not be PascalCase`,
      );
    });
  });

  it("isCamelCaseNoAcronyms works as expected", () => {
    ["", "a", "foo", "fooBar", "office365", "signalR", "aRp", "$aRp", "_aRp"].forEach((name) =>
      assert.ok(isCamelCaseNoAcronyms(name), `${name} should be camelCase`),
    );
    ["Foo", "123", "foo.bar", "foo-bar", "foo_bar", "aRP", "$aRP", "_ARp"].forEach((name) =>
      assert.ok(!isCamelCaseNoAcronyms(name), `${name} should not be camelCase`),
    );
  });
});

describe("model name must be PascalCase", () => {
  it("is valid", async () => {
    expectDiagnosticEmpty(await diagnoseWithOptions(`model FooProperties {}`, true));
  });
  it("is valid for accepted acronyms", async () => {
    expectDiagnosticEmpty(await diagnoseWithOptions(`model ScaleSetVM {}`, true));
  });

  it("emit warnings if not PascalCase", async () => {
    expectDiagnostics(await diagnoseWithOptions(`model fooProperties {}`, true), {
      code: "@azure-tools/typespec-azure-core/casing-style",
      message: `The names of Model types must use PascalCase`,
    });
  });
});

describe("namespace name must be PascalCase", () => {
  it("is valid", async () => {
    expectDiagnosticEmpty(await diagnoseWithOptions(`namespace Models {}`, true));
  });

  it("is valid if contains .", async () => {
    expectDiagnosticEmpty(await diagnoseWithOptions(`namespace Microsoft.FooBar {}`, true));
  });

  it("emit warnings if not PascalCase", async () => {
    expectDiagnostics(await diagnoseWithOptions(`namespace models {}`, true), {
      code: "@azure-tools/typespec-azure-core/casing-style",
      message: `The names of Namespace types must use PascalCase`,
    });
  });
});

describe("interface name must be PascalCase", () => {
  it("is valid", async () => {
    expectDiagnosticEmpty(await diagnoseWithOptions(`interface StoreFront {}`, true));
  });

  it("emit warnings if not PascalCase", async () => {
    expectDiagnostics(await diagnoseWithOptions(`interface storeFront {}`, true), {
      code: "@azure-tools/typespec-azure-core/casing-style",
      message: `The names of Interface types must use PascalCase`,
    });
  });
});

describe("operation name must be camelCase", () => {
  it("is valid", async () => {
    expectDiagnosticEmpty(await diagnoseWithOptions(`op myOperation(): void;`, true));
  });

  it("emit warnings if not camelCase", async () => {
    expectDiagnostics(await diagnoseWithOptions(`op MyOperation(): void;`, true), {
      code: "@azure-tools/typespec-azure-core/casing-style",
      message: `The names of Operation types must use camelCase`,
    });
  });
});

describe("operation template must be PascalCase", () => {
  it("is valid", async () => {
    expectDiagnosticEmpty(
      await diagnoseWithOptions(`op MyOperation<T>(): T; op myOp is MyOperation<string>;`, true),
    );
  });

  it("emit warnings if not PascalCase", async () => {
    expectDiagnostics(
      await diagnoseWithOptions(`op myOperation<T>(): T; op myOp is myOperation<string>;`, true),
      {
        code: "@azure-tools/typespec-azure-core/casing-style",
        message: `The names of Operation Template types must use PascalCase`,
      },
    );
  });
});

describe("model property name must be camelCase", () => {
  it("is valid", async () => {
    expectDiagnosticEmpty(
      await diagnoseWithOptions(`model User {firstName: string, age: int32}`, true),
    );
  });

  it("emit warnings if not camelCase", async () => {
    expectDiagnostics(await diagnoseWithOptions(`model User {FirstName: string}`, true), {
      code: "@azure-tools/typespec-azure-core/casing-style",
      message: `The names of Property types must use camelCase`,
    });
  });
});

const ruleId = "@azure-tools/typespec-azure-core/casing-style";
const foundryOptions: CasingStyleOptions = {
  model: "PascalCase",
  modelProperty: "snake_case",
  operation: "camelCase",
  operationTemplate: "PascalCase",
  interface: "PascalCase",
  namespace: "PascalCase",
  union: "PascalCase",
  unionVariant: "snake_case",
  enum: "PascalCase",
  enumMember: "snake_case",
  scalar: "PascalCase",
};

const ConfigTester = Tester.files({
  "node_modules/casing-presets/package.json": JSON.stringify({
    name: "casing-presets",
    version: "1.0.0",
    main: "index.js",
  }),
  "node_modules/casing-presets/index.js": mockFile.js({
    $linter: {
      rules: [],
      ruleSets: {
        foundry: {
          extends: ["@azure-tools/typespec-azure-core/all"],
          enable: { [ruleId]: foundryOptions },
        },
      },
    },
  }),
});

// Exercise config resolution, schema validation, option defaults and the real linter.
async function diagnoseWithRuleSet(code: string, linter: LinterRuleSet) {
  const runner = await ConfigTester.files({
    "tspconfig.yaml": JSON.stringify({ linter }),
  }).createInstance();
  const [compilerOptions, diagnostics] = await resolveCompilerOptions(runner.fs.compilerHost, {
    cwd: resolveVirtualPath(""),
    entrypoint: resolveVirtualPath("main.tsp"),
    configPath: resolveVirtualPath("tspconfig.yaml"),
  });
  expectDiagnosticEmpty(diagnostics);
  return runner.diagnose(code, { compilerOptions });
}

async function diagnoseWithOptions(code: string, options: Record<string, unknown> | boolean) {
  return diagnoseWithRuleSet(code, { enable: { [ruleId]: options } });
}

const categories: {
  category: keyof CasingStyleOptions;
  label: string;
  code: (name: string) => string;
}[] = [
  { category: "model", label: "Model", code: (name) => `model ${name} {}` },
  {
    category: "modelProperty",
    label: "Property",
    code: (name) => `model Widget { ${name}: string; }`,
  },
  {
    category: "modelProperty",
    label: "Property",
    code: (name) => `op read(${name}: string): void;`,
  },
  { category: "operation", label: "Operation", code: (name) => `op ${name}(): void;` },
  {
    category: "operationTemplate",
    label: "Operation Template",
    code: (name) => `op ${name}<T>(): T; op read is ${name}<string>;`,
  },
  { category: "interface", label: "Interface", code: (name) => `interface ${name} {}` },
  { category: "namespace", label: "Namespace", code: (name) => `namespace ${name} {}` },
  { category: "union", label: "Union", code: (name) => `union ${name} { string, int32 }` },
  {
    category: "unionVariant",
    label: "Union Variant",
    code: (name) => `union Widget { ${name}: "wire-value" }`,
  },
  { category: "enum", label: "Enum", code: (name) => `enum ${name} { member }` },
  {
    category: "enumMember",
    label: "Enum Member",
    code: (name) => `enum Widget { ${name}: "wire-value" }`,
  },
  { category: "scalar", label: "Scalar", code: (name) => `scalar ${name} extends string;` },
];

describe("configured declaration categories", () => {
  describe.each(categories)("$category: $code", ({ category, label, code }) => {
    it.each([
      ["camelCase", "sampleName", "SampleName"],
      ["PascalCase", "SampleName", "sampleName"],
      ["snake_case", "sample_name", "sampleName"],
    ] as const)("supports %s", async (style, valid, invalid) => {
      expectDiagnosticEmpty(await diagnoseWithOptions(code(valid), { [category]: style }));
      expectDiagnostics(await diagnoseWithOptions(code(invalid), { [category]: style }), {
        code: ruleId,
        severity: "warning",
        message: `The names of ${label} types must use ${style}`,
      });
    });

    it("can be disabled independently", async () => {
      expectDiagnosticEmpty(await diagnoseWithOptions(code("bad_name"), { [category]: false }));
    });
  });
});

describe("configuration and compatibility", () => {
  it.each([true, {}])("preserves Azure defaults when enabled with %j", async (options) => {
    expectDiagnosticEmpty(
      await diagnoseWithOptions(
        `
          namespace Azure.OpenAI;
          model ScaleSetVM { _: string; _aRp: string; $aRp: string; signalR: string; }
          interface GPUOperations {}
          op ReadVM<T>(office365: string): T;
          op readVm is ReadVM<string>;
          union bad_union { BadVariant: "bad-wire-value" }
          enum bad_enum { BAD_MEMBER: "bad-wire-value" }
          scalar bad_scalar extends string;
          `,
        options,
      ),
    );
  });

  it("preserves all existing diagnostic messages and severity", async () => {
    expectDiagnostics(
      await diagnoseWithOptions(
        `
          namespace bad_namespace;
          model bad_model { BadProperty: string; }
          interface bad_interface {}
          op BadOperation(): void;
          op bad_template<T>(): T;
          op read is bad_template<string>;
          `,
        true,
      ),
      ["Namespace", "Model", "Property", "Operation", "Operation Template", "Interface"].map(
        (type) => ({
          code: ruleId,
          severity: "warning" as const,
          message: `The names of ${type} types must use ${
            type === "Property" || type === "Operation" ? "camelCase" : "PascalCase"
          }`,
        }),
      ),
    );
  });

  it("retains defaults for omitted options", async () => {
    expectDiagnostics(
      await diagnoseWithOptions(`model bad_model { first_name: string; }`, {
        modelProperty: "snake_case",
      }),
      { code: ruleId, message: "The names of Model types must use PascalCase" },
    );
  });

  it("checks each namespace segment", async () => {
    expectDiagnostics(
      await diagnoseWithOptions(`namespace badName.AlsoBad {}`, { namespace: "snake_case" }),
      [
        { code: ruleId, message: "The names of Namespace types must use snake_case" },
        { code: ruleId, message: "The names of Namespace types must use snake_case" },
      ],
    );
    expectDiagnosticEmpty(
      await diagnoseWithOptions(`namespace good_name.also_good {}`, {
        namespace: "snake_case",
      }),
    );
  });

  it("separates operation templates from concrete aliases and interface operations", async () => {
    expectDiagnosticEmpty(
      await diagnoseWithOptions(
        `
          op ReadWidget<T>(widget_id: string): T;
          op readWidget is ReadWidget<string>;
          @route("/widgets") interface Widgets { readWidget is ReadWidget<string>; }
          `,
        foundryOptions,
      ),
    );
    expectDiagnostics(
      await diagnoseWithOptions(
        `op ReadWidget<T>(): T; op Read is ReadWidget<string>;`,
        foundryOptions,
      ),
      { code: ruleId, message: "The names of Operation types must use camelCase" },
    );
  });

  it("uses strict snake_case rather than the default property exemptions", async () => {
    for (const name of ["_", "_name", "$name", "name_", "first__name", "firstName"]) {
      expectDiagnostics(
        await diagnoseWithOptions(`model Widget { ${name}: string; }`, foundryOptions),
        { code: ruleId, message: "The names of Property types must use snake_case" },
      );
    }
  });

  it("checks identifiers, not wire values, and skips anonymous declarations and variants", async () => {
    expectDiagnosticEmpty(
      await diagnoseWithOptions(
        `
          model Widget {
            @encodedName("application/json", "MixedCase-WireName")
            wire_name: { nested_name: "MixedCase-WireValue" };
            choice: string | int32;
          }
          union WidgetKind { named_variant: "MixedCase-WireValue", "Other-WireValue", int32, null }
          enum Status { named_member: "MixedCase-WireValue", code_2: 2 }
          op readWidget(widget_id: string): { nested_name: string };
          `,
        foundryOptions,
      ),
    );
  });

  it("does not diagnose anonymous model names with snake_case enabled", async () => {
    expectDiagnosticEmpty(
      await diagnoseWithOptions(
        `model widget_model { details: { name: string }; } op read(): { name: string };`,
        { model: "snake_case" },
      ),
    );
  });

  it.each([
    { unknownCategory: "snake_case" },
    { modelProperty: "kebab-case" },
    { model: true },
    { union: "disabled" },
    { scalar: null },
    { enumMember: 42 },
    { namespace: ["PascalCase"] },
    { operation: { style: "camelCase" } },
  ])("rejects invalid options %j without running the rule", async (options) => {
    const diagnostics = await diagnoseWithOptions("model bad_model {}", options);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(
      diagnostics.every((d) => d.code === "invalid-rule-options" && d.severity === "error"),
    ).toBe(true);
  });

  it("can disable the entire rule", async () => {
    expectDiagnosticEmpty(await diagnoseWithOptions("model bad_model {}", false));
  });

  it("keeps Azure all preset defaults unchanged", async () => {
    const diagnostics = await diagnoseWithRuleSet(
      `model Widget { first_name: string; } union bad_union { BadVariant: string }`,
      { extends: ["@azure-tools/typespec-azure-core/all"] },
    );
    expectDiagnosticEmpty(diagnostics.filter((d) => d.severity === "error"));
    expectDiagnostics(
      diagnostics.filter((d) => d.code === ruleId),
      {
        code: ruleId,
        message: "The names of Property types must use camelCase",
      },
    );
  });

  it("inherits configured options from a library preset extending Azure all", async () => {
    const diagnostics = await diagnoseWithRuleSet(
      `model Widget { firstName: string; } union bad_union { badVariant: string }`,
      { extends: ["casing-presets/foundry"] },
    );
    expectDiagnosticEmpty(diagnostics.filter((d) => d.severity === "error"));
    expectDiagnostics(
      diagnostics.filter((d) => d.code === ruleId),
      ["Property", "Union", "Union Variant"].map((type) => ({
        code: ruleId,
        message: `The names of ${type} types must use ${type === "Union" ? "PascalCase" : "snake_case"}`,
      })),
    );
  });

  it("uses explicit project options over an inherited preset", async () => {
    const diagnostics = await diagnoseWithRuleSet(
      `model Widget { firstName: string; } union bad_union { BadVariant: string }`,
      {
        extends: ["casing-presets/foundry"],
        enable: { [ruleId]: { modelProperty: "camelCase" } },
      },
    );
    expectDiagnosticEmpty(diagnostics.filter((d) => d.severity === "error" || d.code === ruleId));
  });

  it("restores defaults when explicitly enabled with true over a configured preset", async () => {
    const diagnostics = await diagnoseWithRuleSet(
      `model Widget { first_name: string; } union bad_union { BadVariant: string }`,
      {
        extends: ["casing-presets/foundry"],
        enable: { [ruleId]: true },
      },
    );
    expectDiagnosticEmpty(diagnostics.filter((d) => d.severity === "error"));
    expectDiagnostics(
      diagnostics.filter((d) => d.code === ruleId),
      {
        code: ruleId,
        message: "The names of Property types must use camelCase",
      },
    );
  });

  it("uses explicit options over the Azure all preset", async () => {
    const diagnostics = await diagnoseWithRuleSet(`model Widget { first_name: string; }`, {
      extends: ["@azure-tools/typespec-azure-core/all"],
      enable: { [ruleId]: foundryOptions },
    });
    expectDiagnosticEmpty(diagnostics.filter((d) => d.severity === "error" || d.code === ruleId));
  });
});
