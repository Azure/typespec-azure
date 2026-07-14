import { createLinterRuleTester, LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { csharpUseStandardAcronymsRule } from "../../src/rules/csharp-use-standard-acronyms.js";
import { SimpleBaseTester, SimpleTester } from "../tester.js";

const libraryName = "@azure-tools/typespec-client-generator-core";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(runner, csharpUseStandardAcronymsRule, libraryName);
});

it("emits warning for model name with Ip", async () => {
  await tester.expect(`model IpAddress { value: string; }`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/csharp-use-standard-acronyms",
    message:
      "Name 'IpAddress' should use standard C# acronym casing (e.g. 'IPAddress'). Use @clientName(\"IPAddress\", \"csharp\") to rename it for C#.",
  });
});

it("emits warning for model name with Db", async () => {
  await tester.expect(`model CosmosDb { id: string; }`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/csharp-use-standard-acronyms",
  });
});

it("emits warning for property name with Os", async () => {
  await tester.expect(`model VmProfile { osProfile: string; }`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/csharp-use-standard-acronyms",
  });
});

it("emits warning when @clientName introduces non-standard acronym casing", async () => {
  await tester
    .expect(`@clientName("IpConfig", "csharp") model IPConfig { id: string; }`)
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/csharp-use-standard-acronyms",
    });
});

it("is valid when acronyms are already standard", async () => {
  await tester.expect(`model IPAddress { name: string; }`).toBeValid();
});

it("is valid when C# client name fixes acronym casing", async () => {
  await tester.expect(`@clientName("IPAddress", "csharp") model IpAddress {}`).toBeValid();
});

it("does not flag words that merely start with an acronym's letters", async () => {
  await tester
    .expect(
      `model Oslo {}
      model Ipsum {}
      model Osmosis {}`,
    )
    .toBeValid();
});

it("does not flag a property whose name embeds an acronym in a larger word", async () => {
  await tester.expect(`model Foo { osmosis: string; }`).toBeValid();
});

it("after applying the codefix, the diagnostic disappears", async () => {
  await tester
    .expect(
      `model IpAddress { value: string; }
@@clientName(IpAddress, "IPAddress", "csharp");`,
    )
    .toBeValid();
});

describe("codefix", () => {
  it("writes @@clientName for model to client.tsp", async () => {
    const baseRunner = await SimpleBaseTester.createInstance();
    const baseTester = createLinterRuleTester(
      baseRunner,
      csharpUseStandardAcronymsRule,
      libraryName,
    );

    await baseTester
      .expect({
        "main.tsp": `model IpAddress { value: string; }`,
        "client.tsp": ``,
      })
      .applyCodeFix("add-clientName-in-client-tsp")
      .toEqual({
        "client.tsp": `import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;

@@clientName(IpAddress, "IPAddress", "csharp");
`,
      });
  });

  it("writes @@clientName for property to client.tsp", async () => {
    const baseRunner = await SimpleBaseTester.createInstance();
    const baseTester = createLinterRuleTester(
      baseRunner,
      csharpUseStandardAcronymsRule,
      libraryName,
    );

    await baseTester
      .expect({
        "main.tsp": `model VmProfile { osProfile: string; }`,
        "client.tsp": ``,
      })
      .applyCodeFix("add-clientName-in-client-tsp")
      .toEqual({
        "client.tsp": `import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;

@@clientName(VmProfile.osProfile, "OSProfile", "csharp");
`,
      });
  });
});
