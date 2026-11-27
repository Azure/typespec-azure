import {
  createLinterRuleTester,
  expectDiagnostics,
  t,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { strictEqual } from "node:assert";
import { beforeEach, it } from "vitest";
import { noGetLroRule } from "../../src/rules/no-get-lro.js";
import { ArmTester, createSdkContextForTester, SimpleTester } from "../tester.js";

const rule = "@azure-tools/typespec-client-generator-core/no-get-lro";
const diagnostic = {
  code: rule,
  message: "GET SDK operations must not be marked as long-running with Legacy.markAsLro.",
};
const get = `
  @Legacy.markAsLro
  @get @route("/result") op get(): { value: string; };
`;

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await SimpleTester.import("@typespec/openapi").createInstance(),
    noGetLroRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

it("reports an accepted Legacy GET at its authored operation", async () => {
  const [{ get }, diagnostics] = await SimpleTester.compileAndDiagnose(
    t.code`
      @service namespace Api;
      @Legacy.markAsLro
      @get @route("/result") op ${t.op("get")}(): { value: string; };
    `,
    { compilerOptions: { linterRuleSet: { enable: { [rule]: true } } } },
  );
  expectDiagnostics(diagnostics, diagnostic);
  strictEqual(diagnostics[0].target, get);
});

it.each(['("csharp")', '("!csharp")', '(#{scope: "javascript"})'])(
  "reports accepted Legacy GETs in any scope %s",
  async (scope) => {
    await tester
      .expect(
        `@service namespace Api; ${get.replace("@Legacy.markAsLro", `@Legacy.markAsLro${scope}`)}`,
      )
      .toEmitDiagnostics(diagnostic);
  },
);

it("reports once for overlapping accepted scopes", async () => {
  await tester
    .expect(
      `
      @service namespace Api;
      @Legacy.markAsLro("!csharp")
      @Legacy.markAsLro("csharp,javascript")
      ${get}
    `,
    )
    .toEmitDiagnostics(diagnostic);
});

it.each(["post", "put", "patch", "delete"])("allows an accepted Legacy %s LRO", async (verb) => {
  await tester.expect(`@service namespace Api; ${get.replace("@get", `@${verb}`)}`).toBeValid();
});

it("allows an unmarked GET", async () => {
  await tester
    .expect(
      `
      @service namespace Api;
      @get @route("/result") op get(): { value: string; };
    `,
    )
    .toBeValid();
});

it("ignores a marker with no effective language scope", async () => {
  await tester
    .expect(`@service namespace Api; ${get.replace("@Legacy.markAsLro", '@Legacy.markAsLro(",")')}`)
    .toBeValid();
});

it("does not add a warning for a rejected Legacy target", async () => {
  const diagnostics = await SimpleTester.diagnose(
    `@service namespace Api; ${get.replace("{ value: string; }", "string")}`,
    { compilerOptions: { linterRuleSet: { enable: { [rule]: true } } } },
  );
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/invalid-mark-as-lro-target",
  });
});

it("allows native-only GET LROs without changing ineffective-marker validation", async () => {
  const source = `
    @armProviderNamespace namespace Microsoft.Test;
    model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
    @armResourceOperations interface Widgets {
      read is ArmResourceRead<Widget, Response = ArmAcceptedLroResponse>;
    }
  `;
  const options = { compilerOptions: { linterRuleSet: { enable: { [rule]: true } } } };
  expectDiagnostics(await ArmTester.diagnose(source, options), []);
  expectDiagnostics(
    await ArmTester.diagnose(
      source.replace("read is", "@Azure.ClientGenerator.Core.Legacy.markAsLro read is"),
      options,
    ),
    { code: "@azure-tools/typespec-client-generator-core/mark-as-lro-ineffective" },
  );
});

it("checks concrete template-derived operations inside services", async () => {
  await tester
    .expect(
      `
      @service namespace Api;
      @get op Read<T>(): T;
      namespace Nested {
        interface Results {
          @Legacy.markAsLro @route("/result") op get is Read<{ value: string; }>;
        }
      }
    `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("keeps implicit HTTP service boundaries", async () => {
  await tester.expect(get).toEmitDiagnostics(diagnostic);
  await tester.expect(`namespace Helpers { ${get} }`).toBeValid();
});

it("excludes Legacy helpers outside an explicit service", async () => {
  await tester
    .expect(
      `
      @service namespace Api { @get op get(): string; }
      namespace Helpers { ${get} }
    `,
    )
    .toBeValid();
});

it("keeps accepted SDK LRO generation while exposing its new-rule suppression", async () => {
  const source = `
    @service namespace Api;
    #suppress "${rule}" "Approved existing API compatibility."
    ${get}
  `;
  const { program } = await SimpleTester.compile(source, {
    compilerOptions: {
      linterRuleSet: { extends: ["@azure-tools/typespec-client-generator-core/all"] },
    },
  });
  const context = await createSdkContextForTester(program);
  strictEqual(context.sdkPackage.clients[0].methods[0].kind, "lro");
  const diagnostics = await SimpleTester.diagnose(
    source.replace(rule, "@azure-tools/typespec-client-generator-core/mark-as-lro-ineffective"),
    { compilerOptions: { linterRuleSet: { enable: { [rule]: true } } } },
  );
  expectDiagnostics(diagnostics, diagnostic);
});
