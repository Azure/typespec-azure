import { getSourceLocation, resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester, t } from "@typespec/compiler/testing";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { extensionResourcePathPatternRule as rule } from "../../src/rules/extension-resource-path-pattern.js";

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
}).importLibraries();

const prefix = "/providers/Microsoft.Parent/parents/{parentName}";
const path = `${prefix}/providers/Microsoft.Test/bindings/{bindingName}`;
const code = "tsp-lintdiff-local-linter/extension-resource-path-pattern";
const diagnostic = (value = path) => ({
  code,
  message: `RPaaS extension resource path '${value}' must use {scope}/providers/... instead of hardcoding the parent scope.`,
});

async function tester() {
  return createLinterRuleTester(await Tester.createInstance(), rule, "tsp-lintdiff-local-linter");
}

const armHeader = `
  using TypeSpec.Http;
  using TypeSpec.Versioning;
  using Azure.ResourceManager;
  @armProviderNamespace
  @service
  @versioned(Versions)
  @armCommonTypesVersion(CommonTypes.Versions.v6)
  namespace Microsoft.Test;
  enum Versions {
    @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
    v2024: "2024-01-01",
  }
`;

describe("extension-resource-path-pattern native opt-in predicate", () => {
  it.each([
    "/bindings/{bindingName}",
    "/{parentName}/providers/Microsoft.Test/bindings/{bindingName}",
  ])("accepts zero or one provider segment: %s", async (value) => {
    await (
      await tester()
    )
      .expect(
        `
        using TypeSpec.Http;
        @get @route("${value}") op read(@path parentName?: string, @path bindingName: string): void;
      `.replace(
          "@path parentName?: string, ",
          value.includes("{parentName}") ? "@path parentName: string, " : "",
        ),
      )
      .toBeValid();
  });

  it("targets the operation without requiring provider-namespace metadata", async () => {
    await (
      await tester()
    )
      .expect(
        t.code`
        using TypeSpec.Http;
        @get @route("${path}") op ${t.op("read")}(@path parentName: string, @path bindingName: string): void;
      `,
      )
      .toEmitDiagnostics(({ read }) => ({
        ...diagnostic(),
        pos: getSourceLocation(read).pos,
        end: getSourceLocation(read).end,
      }));
  });

  it("reports a path with three provider segments only once", async () => {
    const value = `${prefix}/providers/Microsoft.Middle/middles/{middleName}/providers/Microsoft.Test/bindings/{bindingName}`;
    await (
      await tester()
    )
      .expect(
        `
      using TypeSpec.Http;
      @get @route("${value}") op read(@path parentName: string, @path middleName: string, @path bindingName: string): void;
    `,
      )
      .toEmitDiagnostics([diagnostic(value)]);
  });

  it("reports separate operations sharing one HTTP path", async () => {
    await (
      await tester()
    )
      .expect(
        `
      using TypeSpec.Http;
      @get @route("${path}") op read(@path parentName: string, @path bindingName: string): void;
      @delete @route("${path}") op remove(@path parentName: string, @path bindingName: string): void;
    `,
      )
      .toEmitDiagnostics([diagnostic(), diagnostic()]);
  });

  it("skips an uninstantiated operation template", async () => {
    await (
      await tester()
    )
      .expect(
        `
      using TypeSpec.Http;
      @get @route("${path}") op read<T>(@path parentName: string, @path bindingName: string): T;
    `,
      )
      .toBeValid();
  });

  it("skips operations declared by an uninstantiated generic interface", async () => {
    await (
      await tester()
    )
      .expect(
        `
      using TypeSpec.Http;
      interface Reads<T> {
        @get @route("${path}") read(@path parentName: string, @path bindingName: string): T;
      }
    `,
      )
      .toBeValid();
  });

  it("reports only the instantiated endpoint from a generic interface", async () => {
    await (
      await tester()
    )
      .expect(
        `
      using TypeSpec.Http;
      interface Reads<T> {
        @get @route("${path}") read(@path parentName: string, @path bindingName: string): T;
      }
      interface StringReads extends Reads<string> {}
    `,
      )
      .toEmitDiagnostics([diagnostic()]);
  });

  it("still reports an instantiated operation template endpoint", async () => {
    await (
      await tester()
    )
      .expect(
        t.code`
      using TypeSpec.Http;
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
    await (
      await tester()
    )
      .expect(
        `
      using TypeSpec.Http;
      @get @route("${value}") op read(@path parentName: string, @path bindingName: string): void;
    `,
      )
      .toBeValid();
  });

  it("checks source operations rather than silently projecting to the newest version", async () => {
    await (
      await tester()
    )
      .expect(
        `
      using TypeSpec.Http;
      using TypeSpec.Versioning;
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

  it("validates both published ARM-template examples with the rule explicitly enabled", async () => {
    const document = await readFile(
      new URL("../fixtures/ExtensionResourcePathPattern/rule.md", import.meta.url),
      "utf8",
    );
    const snippets = [...document.matchAll(/```tsp\r?\n([\s\S]*?)```/g)].map((match) => match[1]);
    expect(snippets).toHaveLength(2);
    await (
      await tester()
    )
      .expect(`${armHeader}\n${snippets[0]}`)
      .toEmitDiagnostics([
        diagnostic(
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Compute/virtualMachines/{vmName}/providers/Microsoft.Test/bindings/{bindingName}",
        ),
      ]);
    await (await tester()).expect(`${armHeader}\n${snippets[1]}`).toBeValid();
  });
});
