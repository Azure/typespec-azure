import { Tester } from "#test/test-host.js";
import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noLegacyUsage } from "../../src/rules/no-legacy-usage.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(runner, noLegacyUsage, "@azure-tools/typespec-azure-core");
});

it("emits a warning diagnostic if using type from Azure.Core.Legacy", async () => {
  await tester
    .expect(
      `        
          namespace MyService {
        model Input {
          input: string;
        }
        model Foo {
          bar: Azure.Core.Legacy.parameterizedNextLink<[Input.input]>
        }
      }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/no-legacy-usage",
        message: 'Referencing elements inside Legacy namespace "Azure.Core.Legacy" is not allowed.',
      },
    ]);
});
