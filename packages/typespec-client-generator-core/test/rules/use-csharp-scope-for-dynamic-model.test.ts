import {
  createLinterRuleTester,
  mockFile,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { useCsharpScopeForDynamicModelRule } from "../../src/rules/use-csharp-scope-for-dynamic-model.js";
import { ArmTester, AzureCoreTester, SimpleTester } from "../tester.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(runner, useCsharpScopeForDynamicModelRule, libraryName);
});

const libraryName = "@azure-tools/typespec-client-generator-core";
const ruleCode = `${libraryName}/use-csharp-scope-for-dynamic-model`;

describe("use-csharp-scope-for-dynamic-model", () => {
  it("is valid with an explicit C# scope on a model", async () => {
    await tester.expect(`@dynamicModel("csharp") model Example {}`).toBeValid();
  });

  it("is valid with an options-bag C# scope on a namespace", async () => {
    await tester.expect(`@dynamicModel(#{ scope: "csharp" }) namespace Example;`).toBeValid();
  });

  it("is valid when C# is one of multiple positive scopes", async () => {
    await tester.expect(`@dynamicModel("python, csharp") model Example {}`).toBeValid();
  });

  it("reports an unscoped model decorator", async () => {
    await tester.expect(`@dynamicModel model Example {}`).toEmitDiagnostics({
      code: ruleCode,
      severity: "warning",
      message: 'The @dynamicModel decorator should specify the C# scope ("csharp").',
    });
  });

  it("reports a namespace decorator scoped to another language", async () => {
    await tester
      .expect(`@dynamicModel("python") namespace Example;`)
      .toEmitDiagnostics({ code: ruleCode });
  });

  it("reports an options-bag scope that does not include C#", async () => {
    await tester
      .expect(`@dynamicModel(#{ scope: "python" }) model Example {}`)
      .toEmitDiagnostics({ code: ruleCode });
  });

  it("does not report when the decorator is absent", async () => {
    await tester.expect(`model Example {}`).toBeValid();
  });

  it.each(["model Example {}", "namespace Example {}"])(
    "does not report the legacy C# decorator on %s",
    async (target) => {
      const runner = await SimpleTester.files({
        "csharp.js": mockFile.js({
          namespace: "TypeSpec.HttpClient.CSharp",
          $dynamicModel: function $dynamicModel() {},
        }),
        "csharp.tsp": `
          import "./csharp.js";
          using TypeSpec.Reflection;
          namespace TypeSpec.HttpClient.CSharp {
            extern dec dynamicModel(target: Model | Namespace);
          }
        `,
      })
        .import("./csharp.tsp")
        .createInstance();
      const legacyTester = createLinterRuleTester(
        runner,
        useCsharpScopeForDynamicModelRule,
        libraryName,
      );
      await legacyTester.expect(`@TypeSpec.HttpClient.CSharp.dynamicModel ${target}`).toBeValid();
    },
  );

  it("does not report library types from Azure.Core", async () => {
    const runner = await AzureCoreTester.createInstance();
    const azureCoreTester = createLinterRuleTester(
      runner,
      useCsharpScopeForDynamicModelRule,
      libraryName,
    );
    await azureCoreTester.expect(`alias StandardError = Foundations.ErrorResponse;`).toBeValid();
  });

  it("does not report library types from Azure.ResourceManager", async () => {
    const runner = await ArmTester.createInstance();
    const armTester = createLinterRuleTester(
      runner,
      useCsharpScopeForDynamicModelRule,
      libraryName,
    );
    await armTester
      .expect(`alias StandardError = Azure.ResourceManager.CommonTypes.ErrorResponse;`)
      .toBeValid();
  });
});
