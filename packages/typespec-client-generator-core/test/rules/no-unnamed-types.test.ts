import {
  BasicTestRunner,
  createLinterRuleTester,
  LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noUnnamedTypesRule } from "../../src/rules/no-unnamed-types.rule.js";
import { createSdkTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createSdkTestRunner();
  tester = createLinterRuleTester(
    runner,
    noUnnamedTypesRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

it("anonymous model in property of another model", async () => {
  await tester
    .expect(
      `
      @service
      namespace TestService {
        @usage(Usage.input)
        model NamedModel {
          anonymousModelProp: {
            foo: string;
          };
        }
      }
      
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-client-generator-core/require-named-model",
        severity: "warning",
        message: `Anonymous model detected. Define this model separately with a proper name to improve code readability and reusability.`,
      },
    ]);
});

it("nested anonymous model", async () => {
  // should emit twice: once for each anonymous model
  await tester
    .expect(
      `
      @service
      namespace TestService {
        @usage(Usage.input)
        model NamedModel {
          nestedAnonymousModelProp: {
            firstLevelProp: {
              secondLevelProp: string;
            }
          };
        }
      }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-client-generator-core/require-named-model",
        severity: "warning",
        message: `Anonymous model detected. Define this model separately with a proper name to improve code readability and reusability.`,
      },
      {
        code: "@azure-tools/typespec-client-generator-core/require-named-model",
        severity: "warning",
        message: `Anonymous model detected. Define this model separately with a proper name to improve code readability and reusability.`,
      },
    ]);
});

it("anonymous model inline in operation request", async () => {
  await tester
    .expect(
      `
      @service
      namespace TestService {
        op foo(body: {prop: string}): void;
      }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-client-generator-core/require-named-model",
        severity: "warning",
        message: `Anonymous model detected. Define this model separately with a proper name to improve code readability and reusability.`,
      },
    ]);
});

it("anonymous model inline in operation response", async () => {
  await tester
    .expect(
      `
      @service
      namespace TestService {
        op foo(): {prop: string};
      }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-client-generator-core/require-named-model",
        severity: "warning",
        message: `Anonymous model detected. Define this model separately with a proper name to improve code readability and reusability.`,
      },
    ]);
});

it("anonymous model caused by spreading", async () => {
  await tester
    .expect(
      `
      @service
      namespace TestService {
        model Widget {
          prop: string;
        }
        model OperationStatus<StatusResult> {
          result?: StatusResult;
        }
        op foo(): AcceptedResponse & OperationStatus<Widget>;
      }
      `,
    )
    .toBeValid();
});
