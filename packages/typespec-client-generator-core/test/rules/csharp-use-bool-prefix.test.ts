import { applyCodeFix } from "@typespec/compiler";
import {
  createLinterRuleTester,
  expectDiagnosticEmpty,
  expectDiagnostics,
  resolveVirtualPath,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { csharpUseBoolPrefixRule } from "../../src/rules/csharp-use-bool-prefix.js";
import { ArmTester, AzureCoreTester, d, SimpleBaseTester, SimpleTester } from "../tester.js";

const libraryName = "@azure-tools/typespec-client-generator-core";
const ruleCode = `${libraryName}/csharp-use-bool-prefix`;
let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await SimpleTester.createInstance(),
    csharpUseBoolPrefixRule,
    libraryName,
  );
});

it.each(["is", "has", "can", "should", "are", "was", "will", "do", "does"])(
  "accepts the %s prefix for properties and parameters",
  async (prefix) => {
    await tester
      .expect(
        `model Widget { ${prefix}Enabled: boolean; }
        op check(${prefix}Enabled: boolean): void;`,
      )
      .toBeValid();
  },
);

it.each([
  "supportsHttps",
  "AllowsDeletion",
  "containsSecrets",
  "requiresAuthentication",
  "includeDetails",
  "hasHTTPHeaders",
  "supports_https",
])("accepts a verb recognized by compromise in %s", async (name) => {
  await tester
    .expect(
      `model Widget { ${name}: boolean; }
      op check(${name}: boolean): void;`,
    )
    .toBeValid();
});

it.each(["statusEnabled", "islandEnabled", "activeConnections"])(
  "does not accept a non-verb first word in %s",
  async (name) => {
    await tester.expect(`model Widget { ${name}: boolean; }`).toEmitDiagnostics({ code: ruleCode });
  },
);

it.each(["enabled", "island", "hashtable", "cannot", "is", "Is", "statusEnabled"])(
  "provides naming guidance for invalid property %s",
  async (name) => {
    await tester.expect(`model Widget { \`${name}\`: boolean; }`).toEmitDiagnostics({
      code: ruleCode,
      severity: "warning",
      message: `Boolean property or parameter '${name}' should start with a verb followed by another word. Choose a prefix appropriate to its meaning, such as 'Is', 'Has', 'Can', or 'Should'. Use a C#-scoped @clientName override to rename it for C#.`,
    });
  },
);

it.each(["boolean", "boolean | null", "true", "false", "true | false", "Flag", "NullableFlag"])(
  "checks bool-like type %s",
  async (type) => {
    await tester
      .expect(
        `scalar Flag extends boolean;
      union NullableFlag { Flag, null }
      model Widget { enabled?: ${type}; }`,
      )
      .toEmitDiagnostics({ code: ruleCode });
  },
);

it("checks operation parameters", async () => {
  await tester.expect(`op list(detailed?: boolean): void;`).toEmitDiagnostics({
    code: ruleCode,
  });
});

describe("affirmative names", () => {
  it.each([
    "IsNotEnabled",
    "HasNoChildren",
    "ShouldNeverRetry",
    "IsNotDisabled",
    "notEnabled",
    "is_not_enabled",
  ])("flags explicit negation in %s without unsafe rename fixes", async (name) => {
    const runner = await SimpleBaseTester.createInstance();
    const [, diagnostics] = await runner.compileAndDiagnose(
      {
        "main.tsp": `import "@azure-tools/typespec-client-generator-core";
            model Widget { ${name}: boolean; }
            op check(${name}: boolean): void;`,
      },
      { compilerOptions: { linterRuleSet: { enable: { [ruleCode]: true } } } },
    );
    expectDiagnostics(
      diagnostics,
      [0, 1].map(() => ({
        code: ruleCode,
        severity: "warning",
        message: `Boolean property or parameter '${name}' should read affirmatively. Review its name and boolean value semantics before renaming; a C#-scoped @clientName override does not invert values.`,
      })),
    );
    for (const diagnostic of diagnostics) {
      expect(
        diagnostic.codefixes?.filter((fix) => fix.id.startsWith("add-clientName-")) ?? [],
      ).toEqual([]);
    }
  });

  it.each([
    "IsNotable",
    "HasNotifications",
    "CanNotify",
    "IsNormallyEnabled",
    "IsDisabled",
    "IsUnavailable",
  ])("does not infer negation from substrings or semantic prefixes in %s", async (name) => {
    await tester.expect(`model Widget { ${name}: boolean; }`).toBeValid();
  });

  it("checks effective C# names rather than wire names or other language overrides", async () => {
    await tester
      .expect(
        `model Widget {
      @clientName("HasChildren", "csharp") hasNoChildren: boolean;
      @clientName("IsNotEnabled", "python") isEnabled: boolean;
    }`,
      )
      .toBeValid();
    await tester
      .expect(
        `model Widget {
      @clientName("IsNotEnabled", "csharp") isEnabled: boolean;
    }`,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message:
          "Boolean property or parameter 'IsNotEnabled' should read affirmatively. Review its name and boolean value semantics before renaming; a C#-scoped @clientName override does not invert values.",
      });
  });

  it("ignores non-booleans and mixed unions", async () => {
    await tester
      .expect(
        `model Widget {
      isNotEnabled: string;
      hasNoChildren: boolean | string;
    }`,
      )
      .toBeValid();
  });

  it("checks nullable booleans and deduplicates spread properties", async () => {
    await tester
      .expect(
        `model Base { isNotEnabled?: boolean | null; }
      model Copy { ...Base; }`,
      )
      .toEmitDiagnostics({ code: ruleCode });
  });
});

it("does not check non-boolean types, arrays, or mixed unions", async () => {
  await tester
    .expect(
      `model Widget {
      name: string;
      count: int32;
      flags: boolean[];
      value: boolean | string;
      empty: null;
    }`,
    )
    .toBeValid();
});

it("does not recurse forever on recursive unions", async () => {
  await tester
    .expect(
      `union Value { boolean, Value }
    model Widget { value: Value; }`,
    )
    .toBeValid();
});

it("respects a C# client name", async () => {
  await tester
    .expect(`model Widget { @clientName("HasDetails", "csharp") details: boolean; }`)
    .toBeValid();
});

it("keeps valid C# names valid when another language overrides them", async () => {
  await tester
    .expect(`model Widget { @clientName("enabled", "python") isEnabled: boolean; }`)
    .toBeValid();
});

it("gives C# overrides precedence over unscoped names", async () => {
  await tester
    .expect(
      `model Widget {
      @clientName("enabled")
      @clientName("IsEnabled", "csharp")
      active: boolean;
    }`,
    )
    .toBeValid();
});

it("checks an invalid C# override even when the TypeSpec name is valid", async () => {
  await tester
    .expect(`model Widget { @clientName("Active", "csharp") isEnabled: boolean; }`)
    .toEmitDiagnostics({ code: ruleCode });
});

it("ignores overrides for other languages", async () => {
  await tester
    .expect(`model Widget { @clientName("isEnabled", "python") enabled: boolean; }`)
    .toEmitDiagnostics({ code: ruleCode });
});

it("respects an unscoped client name", async () => {
  await tester.expect(`model Widget { @clientName("CanUpdate") update: boolean; }`).toBeValid();
});

it("checks inherited, spread, and model-is properties at their source", async () => {
  await tester
    .expect(
      `model Base { enabled: boolean; }
      model Inherited extends Base {}
      model Spread { ...Base; }
      model Copy is Base;`,
    )
    .toEmitDiagnostics({ code: ruleCode });
});

it("checks concrete properties of generic models once", async () => {
  await tester
    .expect(
      `model Envelope<T> { enabled: boolean; value: T; }
      model StringEnvelope is Envelope<string>;
      model IntegerEnvelope is Envelope<int32>;`,
    )
    .toEmitDiagnostics({ code: ruleCode });
});

it("checks properties that resolve to boolean after generic instantiation", async () => {
  await tester
    .expect(
      `model Envelope<T> { value: T; }
      model StringEnvelope is Envelope<string>;
      model FlagEnvelope is Envelope<boolean>;`,
    )
    .toEmitDiagnostics({ code: ruleCode });
});

it("checks distinct C# overrides on spread properties sharing a source node", async () => {
  await tester
    .expect(
      `model Base { isEnabled: boolean; }
      model First { ...Base; }
      model Second { ...Base; }
      @@clientName(First.isEnabled, "enabled", "csharp");
      @@clientName(Second.isEnabled, "active", "csharp");`,
    )
    .toEmitDiagnostics([{ code: ruleCode }, { code: ruleCode }]);
});

it.each([AzureCoreTester, ArmTester])(
  "does not flag imported Azure library types",
  async (base) => {
    const libraryTester = createLinterRuleTester(
      await base.createInstance(),
      csharpUseBoolPrefixRule,
      libraryName,
    );
    await libraryTester.expect(`model Widget { isEnabled: boolean; }`).toBeValid();
  },
);

describe("codefix", () => {
  it.each(
    [
      ["model Widget { children: boolean; }", "Widget.children", "IsChildren"],
      ["model Widget { enabled: boolean; }", "Widget.enabled", "IsEnabled"],
      ["op list(detailed: boolean): void;", "list::parameters.detailed", "IsDetailed"],
      ["namespace Demo; model Widget { enabled: boolean; }", "Widget.enabled", "IsEnabled"],
      [
        "namespace Demo; interface Widgets { list(detailed: boolean): void; }",
        "Widgets.list::parameters.detailed",
        "IsDetailed",
      ],
      [
        `model Widget { @Azure.ClientGenerator.Core.clientName("active", "csharp") enabled: boolean; }`,
        "Widget.enabled",
        "IsActive",
      ],
    ].flatMap(([source, target, isName]) =>
      ["Is", "Has", "Can", "Should"].map((prefix) => ({
        source,
        target,
        prefix,
        suggestion: prefix + isName.slice(2),
      })),
    ),
  )("writes a $prefix override for $source", async ({ source, target, prefix, suggestion }) => {
    const runner = await SimpleBaseTester.createInstance();
    const [result, diagnostics] = await runner.compileAndDiagnose(
      {
        "main.tsp": `import "@azure-tools/typespec-client-generator-core";\n${source}`,
        "client.tsp": "",
      },
      { compilerOptions: { linterRuleSet: { enable: { [ruleCode]: true } } } },
    );
    expectDiagnostics(diagnostics, [{ code: ruleCode }]);
    const fixes = diagnostics[0].codefixes!.filter((fix) => fix.id.startsWith("add-clientName-"));
    expect(fixes.map((fix) => fix.id)).toEqual([
      "add-clientName-in-client-tsp-is",
      "add-clientName-in-client-tsp-has",
      "add-clientName-in-client-tsp-can",
      "add-clientName-in-client-tsp-should",
    ]);
    const fix = fixes.find(
      (fix) => fix.id === `add-clientName-in-client-tsp-${prefix.toLowerCase()}`,
    );
    expect(fix).toBeDefined();
    expect(fix!.label).toContain(`"${suggestion}", "csharp"`);
    const written = new Map<string, string>();
    await applyCodeFix(
      {
        ...result.program.host,
        async writeFile(path, content) {
          written.set(path, content);
        },
      },
      fix!,
    );
    const clientSource = written.get(resolveVirtualPath("client.tsp"));
    expect(clientSource).toBe(
      d`
      import "@azure-tools/typespec-client-generator-core";

      using Azure.ClientGenerator.Core;
      ${source.includes("namespace Demo;") ? "using Demo;\n" : ""}
      @@clientName(${target}, "${suggestion}", "csharp");
    ` + "\n",
    );

    const [, fixedDiagnostics] = await runner.compileAndDiagnose(
      {
        "main.tsp": `import "./client.tsp";\n${source}`,
        "client.tsp": clientSource!,
      },
      { compilerOptions: { linterRuleSet: { enable: { [ruleCode]: true } } } },
    );
    expectDiagnosticEmpty(fixedDiagnostics);
  });
});
