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

it("emits a warning diagnostic if using type from Azure.Core.Foundations.Private", async () => {
  await tester
    .expect(
      `        
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      namespace MyService {
        model Foo {
          bar: Azure.Core.Foundations.Private.ArmResourceIdentifierConfigOptions
        }
      }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/no-private-usage",
        message:
          'Referencing elements inside Private namespace "Azure.Core.Foundations.Private" is not allowed.',
      },
    ]);
});

it("emits a warning diagnostic if using decorators from Azure.Core.Foundations.Private", async () => {
  await tester
    .expect(
      `
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      namespace MyService {
        @Azure.Core.Foundations.Private.embeddingVector(string)
        model Foo {}
      }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/no-private-usage",
        message:
          'Referencing elements inside Private namespace "Azure.Core.Foundations.Private" is not allowed.',
      },
    ]);
});

it("ok using item from Private namespace in the project", async () => {
  await tester
    .expect(
      `
      namespace MyService {
        model Foo {
          bar: MyLib.Private.Bar;
        }
      }

      namespace MyLib.Private {
        model Bar {}
      }
      `,
    )
    .toBeValid();
});
