import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import {
  createLinterRuleTester,
  t,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";

import { beforeEach, expect, it } from "vitest";
import { $linter } from "../../src/linter.js";
import { useScopeForExtensionRoutingRule as rule } from "../../src/rules/use-scope-for-extension-routing.js";

const code = "@azure-tools/typespec-azure-resource-manager/use-scope-for-extension-routing";
const prefix = "/providers/Microsoft.Parent/parents/{parentName}";
const path = `${prefix}/providers/Microsoft.Test/bindings/{bindingName}`;
const diagnostic = (value = path) => ({
  code,
  message: `RPaaS extension resource path '${value}' must use {scope}/providers/... instead of hardcoding the parent scope.`,
});

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(runner, rule, "@azure-tools/typespec-azure-resource-manager");
});

function examples() {
  return [
    `@armProviderNamespace
@service
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v6)
namespace Microsoft.Test;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2024: "2024-01-01",
}

model Binding is ExtensionResource<BindingProperties> {
  ...ResourceNameParameter<Binding>;
}

model BindingProperties {
  label?: string;
}

alias VirtualMachine = Extension.ExternalResource<"Microsoft.Compute", "virtualMachines", "vmName">;

@armResourceOperations
interface Bindings {
  read is Extension.Read<VirtualMachine, Binding>;
}
`,
    `@armProviderNamespace
@service
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v6)
namespace Microsoft.Test;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2024: "2024-01-01",
}

model Binding is ExtensionResource<BindingProperties> {
  ...ResourceNameParameter<Binding>;
}

model BindingProperties {
  label?: string;
}

@armResourceOperations
interface Bindings {
  read is Extension.Read<Extension.ScopeParameter, Binding>;
}
`,
  ];
}

it("accepts a route without provider segments", async () => {
  await tester
    .expect(`@get @route("/bindings/{bindingName}") op read(@path bindingName: string): void;`)
    .toBeValid();
});

it("accepts an arbitrary scope with one provider segment", async () => {
  await tester
    .expect(
      `
    @get @route("/{scope}/providers/Microsoft.Test/bindings/{bindingName}")
    op read(@path scope: string, @path bindingName: string): void;
  `,
    )
    .toBeValid();
});

it("targets a hardcoded-parent operation without provider-namespace metadata", async () => {
  await tester
    .expect(
      t.code`
    @get @route("${path}")
    op ${t.op("read")}(@path parentName: string, @path bindingName: string): void;
  `,
    )
    .toEmitDiagnostics(({ read }) => ({
      ...diagnostic(),
      pos: getSourceLocation(read).pos,
      end: getSourceLocation(read).end,
    }));
});

it("reports three provider segments only once", async () => {
  const value = `${prefix}/providers/Microsoft.Middle/middles/{middleName}/providers/Microsoft.Test/bindings/{bindingName}`;
  await tester
    .expect(
      `
    @get @route("${value}")
    op read(@path parentName: string, @path middleName: string, @path bindingName: string): void;
  `,
    )
    .toEmitDiagnostics([diagnostic(value)]);
});

it("reports separate operations sharing one HTTP path", async () => {
  await tester
    .expect(
      `
    @get @route("${path}") op read(@path parentName: string, @path bindingName: string): void;
    @delete @route("${path}") op remove(@path parentName: string, @path bindingName: string): void;
  `,
    )
    .toEmitDiagnostics([diagnostic(), diagnostic()]);
});

it("skips an uninstantiated operation template", async () => {
  await tester
    .expect(
      `
    @get @route("${path}") op read<T>(@path parentName: string, @path bindingName: string): T;
  `,
    )
    .toBeValid();
});

it("skips operations declared by an uninstantiated generic interface", async () => {
  await tester
    .expect(
      `
    interface Reads<T> {
      @get @route("${path}") read(@path parentName: string, @path bindingName: string): T;
    }
  `,
    )
    .toBeValid();
});

it("reports only the instantiated endpoint from a generic interface", async () => {
  await tester
    .expect(
      `
    interface Reads<T> {
      @get @route("${path}") read(@path parentName: string, @path bindingName: string): T;
    }
    interface StringReads extends Reads<string> {}
  `,
    )
    .toEmitDiagnostics([diagnostic()]);
});

it("still reports an instantiated operation template endpoint", async () => {
  await tester
    .expect(
      t.code`
    @get @route("${path}") op read<T>(@path parentName: string, @path bindingName: string): T;
    op ${t.op("concrete")} is read<string>;
  `,
    )
    .toEmitDiagnostics(({ concrete }) => ({
      ...diagnostic(),
      pos: getSourceLocation(concrete).pos,
      end: getSourceLocation(concrete).end,
    }));
});

it("matches literal lowercase provider segments, not lookalikes", async () => {
  const value = path.replace("/providers/Microsoft.Parent", "/Providers/Microsoft.Parent");
  await tester
    .expect(
      `
    @get @route("${value}") op read(@path parentName: string, @path bindingName: string): void;
  `,
    )
    .toBeValid();
});

it("checks source operations without projecting to the newest version", async () => {
  await tester
    .expect(
      `
    @service @versioned(Versions) namespace Example;
    enum Versions { v1, v2 }
    @removed(Versions.v2)
    @get @route("${path}") op oldRead(@path parentName: string, @path bindingName: string): void;
    @added(Versions.v2)
    @get @route("${path}/details") op currentRead(@path parentName: string, @path bindingName: string): void;
  `,
    )
    .toEmitDiagnostics([diagnostic(), diagnostic(`${path}/details`)]);
});

it("warns for the standard specific-parent ARM extension template", async () => {
  const snippets = await examples();
  await tester
    .expect(snippets[0])
    .toEmitDiagnostics([
      diagnostic(
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Compute/virtualMachines/{vmName}/providers/Microsoft.Test/bindings/{bindingName}",
      ),
    ]);
});

it("accepts the standard arbitrary-scope ARM extension template", async () => {
  const snippets = await examples();
  await tester.expect(snippets[1]).toBeValid();
});

it("keeps existing ARM all rules active while the new rule stays disabled", () => {
  const all = $linter.ruleSets?.all.enable;
  expect(all?.[code]).toBe(false);
  for (const existing of $linter.rules.filter((item) => item.name !== rule.name)) {
    expect(all?.[`@azure-tools/typespec-azure-resource-manager/${existing.name}`]).toBe(true);
  }
});

it.each([[], ["@azure-tools/typespec-azure-resource-manager/all"]])(
  "accepts specific-parent ARM endpoints without explicit enablement: %j",
  async (...extendsRulesets) => {
    const snippets = await examples();
    const [, diagnostics] = await runner.compileAndDiagnose(snippets[0], {
      compilerOptions: { linterRuleSet: { extends: extendsRulesets } },
    });
    expect(diagnostics.filter((item) => item.severity === "error")).toEqual([]);
    expect(diagnostics.filter((item) => item.code === code)).toEqual([]);
  },
);

it("honors explicit enablement when extending ARM all", async () => {
  const snippets = await examples();
  const [, diagnostics] = await runner.compileAndDiagnose(snippets[0], {
    compilerOptions: {
      linterRuleSet: {
        extends: ["@azure-tools/typespec-azure-resource-manager/all"],
        enable: { [code]: true },
      },
    },
  });
  expect(diagnostics.filter((item) => item.severity === "error")).toEqual([]);
  expect(diagnostics.filter((item) => item.code === code)).toHaveLength(1);
});
