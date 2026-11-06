import { getSourceLocation, setTypeSpecNamespace } from "@typespec/compiler";
import {
  createLinterRuleTester,
  mockFile,
  t,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noUnsupportedScopeRule } from "../../src/rules/no-unsupported-scope.js";
import { ArmTester, SimpleTester } from "../tester.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noUnsupportedScopeRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

describe("no-unsupported-scope", () => {
  const diagnostic = (scope: string) => ({
    code: "@azure-tools/typespec-client-generator-core/no-unsupported-scope",
    severity: "warning" as const,
    message: `Unsupported TCGC language scope '${scope}'. Supported Azure SDK scopes are 'csharp', 'java', 'python', 'javascript', and 'go'. Use 'javascript' for TypeScript SDKs.`,
  });

  it.each([
    "csharp",
    "java",
    "python",
    "javascript",
    "go",
    "java, python",
    "!javascript",
    "!(csharp, java)",
    "!python, javascript",
  ])("accepts supported scope %s in both argument forms", async (scope) => {
    await tester
      .expect(
        `
        @clientName("Legacy", "${scope}") model LegacyModel {}
        @clientName("Options", #{scope: "${scope}"}) model OptionsModel {}
      `,
      )
      .toBeValid();
  });

  it("accepts omitted scopes and empty options bags", async () => {
    await tester
      .expect(
        `
        @clientName("Unscoped") model UnscopedModel {}
        @clientName("Options", #{}) model OptionsModel {}
      `,
      )
      .toBeValid();
  });

  it.each(["typescript", "dotnet", "JavaScript", "custom"])(
    "rejects unsupported scope %s",
    async (scope) => {
      await tester
        .expect(`@alternateType(string, "${scope}") scalar CustomDate extends utcDateTime;`)
        .toEmitDiagnostics([diagnostic(scope)]);
    },
  );

  it.each(["java, typescript", "!typescript", "!(java, typescript)", "!typescript, python"])(
    "checks every parsed scope in %s",
    async (scope) => {
      await tester
        .expect(`@clientName("Renamed", "${scope}") model Test {}`)
        .toEmitDiagnostics([diagnostic("typescript")]);
    },
  );

  it("reports all unsupported scopes without repeating the same scope", async () => {
    await tester
      .expect(`@clientName("Renamed", "typescript, ruby, typescript") model Test {}`)
      .toEmitDiagnostics([diagnostic("typescript"), diagnostic("ruby")]);
  });

  it("checks value options bags", async () => {
    await tester
      .expect(`@clientName("Renamed", #{scope: "typescript"}) model Test {}`)
      .toEmitDiagnostics([diagnostic("typescript")]);
  });

  it("points to the unsupported scope argument", async () => {
    await tester
      .expect(t.code`@clientName("Renamed", "typescript") model ${t.model("Test")} {}`)
      .toEmitDiagnostics(({ Test }) => {
        const { file } = getSourceLocation(Test);
        const pos = file.text.indexOf('"typescript"');
        return { ...diagnostic("typescript"), pos, end: pos + '"typescript"'.length };
      });
  });

  it.each(["client", "clientInitialization"])("checks @%s model options", async (decorator) => {
    await tester
      .expect(`@${decorator}({scope: "typescript"}) namespace Test;`)
      .toEmitDiagnostics([diagnostic("typescript")]);
  });

  it("checks inherited scope options", async () => {
    await tester
      .expect(
        `
        model BaseOptions { scope: "typescript"; }
        model Options extends BaseOptions {}
        @client(Options) namespace Test {}
      `,
      )
      .toEmitDiagnostics([diagnostic("typescript")]);
  });

  it.each([
    `@clientName("Renamed", "typescript") namespace Test;`,
    `@clientName("Renamed", "typescript") interface Test {}`,
    `@clientName("Renamed", "typescript") op test(): void;`,
    `model Test { @clientName("renamed", "typescript") value: string; }`,
    `@clientName("Renamed", "typescript") enum Test { value }`,
    `enum Test { @clientName("renamed", "typescript") value }`,
    `@clientName("Renamed", "typescript") union Test { string, int32 }`,
    `union Test { @clientName("renamed", "typescript") value: string }`,
    `op test(@clientName("renamed", "typescript") value: string): void;`,
    `@scope("typescript") op test(): void;`,
    `model Test {} @@clientName(Test, "Renamed", "typescript");`,
  ])("checks decorated declarations: %s", async (code) => {
    await tester.expect(code).toEmitDiagnostics([diagnostic("typescript")]);
  });

  it("checks copied decorators only once", async () => {
    await tester
      .expect(
        `
        model Base { @clientName("renamed", "typescript") value: string; }
        model Spread { ...Base; }
        model Copy is Base;
        model Derived extends Base {}
      `,
      )
      .toEmitDiagnostics([diagnostic("typescript")]);
  });

  it("checks uninstantiated templates", async () => {
    await tester
      .expect(`@clientName("Renamed", "typescript") model Test<T> { value: T; }`)
      .toEmitDiagnostics([diagnostic("typescript")]);
  });

  it("checks instantiated templates only once", async () => {
    await tester
      .expect(
        `
        @clientName("Renamed", "typescript") model Test<T> { value: T; }
        model First is Test<string>;
        model Second is Test<int32>;
      `,
      )
      .toEmitDiagnostics([diagnostic("typescript")]);
  });

  it("checks scope values supplied as template arguments", async () => {
    await tester
      .expect(
        `
        @clientName("Renamed", S) model Test<S extends valueof string> {}
        model Valid is Test<"javascript">;
        model Invalid is Test<"typescript">;
      `,
      )
      .toEmitDiagnostics([diagnostic("typescript")]);
  });

  it("does not interpret other decorator arguments as scopes", async () => {
    await tester.expect(`@clientName("typescript") @doc("typescript") model Test {}`).toBeValid();
  });

  it("does not interpret another library's scopes as TCGC scopes", async () => {
    function $custom() {}
    setTypeSpecNamespace("Other", $custom);
    const runner = await SimpleTester.files({
      "custom.js": mockFile.js({ $custom }),
    })
      .import("./custom.js")
      .createInstance();
    await createLinterRuleTester(
      runner,
      noUnsupportedScopeRule,
      "@azure-tools/typespec-client-generator-core",
    )
      .expect(
        `
        namespace Other { extern dec custom(target: unknown, scope: valueof string); }
        @Other.custom("typescript") model Test {}
      `,
      )
      .toBeValid();
  });

  it("supports suppression for already-shipped APIs", async () => {
    await SimpleTester.compile(
      `
      #suppress "@azure-tools/typespec-client-generator-core/no-unsupported-scope" "Preserve the shipped API."
      @alternateType(string, "typescript")
      scalar CustomDate extends utcDateTime;
    `,
      {
        compilerOptions: {
          linterRuleSet: {
            enable: { "@azure-tools/typespec-client-generator-core/no-unsupported-scope": true },
          },
        },
      },
    );
  });

  it("can remain disabled for custom emitters", async () => {
    await SimpleTester.compile(`
      @alternateType(string, "custom")
      scalar CustomDate extends utcDateTime;
    `);
  });

  it("accepts client options without a scope", async () => {
    await tester.expect(`@client({name: "TestClient"}) namespace Test;`).toBeValid();
  });

  it("does not report diagnostics on Azure library types", async () => {
    const runner = await ArmTester.createInstance();
    await createLinterRuleTester(
      runner,
      noUnsupportedScopeRule,
      "@azure-tools/typespec-client-generator-core",
    )
      .expect("model Test {}")
      .toBeValid();
  });
});
