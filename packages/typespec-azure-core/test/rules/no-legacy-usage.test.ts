import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noPrivateUsage } from "../../src/rules/no-private-usage.js";
import { createAzureCoreTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureCoreTestRunner({ omitServiceNamespace: true });
  tester = createLinterRuleTester(runner, noPrivateUsage, "@azure-tools/typespec-azure-core");
});

it("emits a warning diagnostic if using type from Azure.Core.Legacy", async () => {
  await tester
    .expect(
      `        
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
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
