import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";

import { armPutResponseCodesRule } from "../../src/rules/arm-put-response-codes.js";
import { useStandardResponseCodesRule } from "../../src/rules/use-standard-response-codes.js";

describe.each([armPutResponseCodesRule, useStandardResponseCodesRule])("$name", (rule) => {
  let runner: TesterInstance;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await Tester.createInstance();
    tester = createLinterRuleTester(runner, rule, "@azure-tools/typespec-azure-resource-manager");
  });

  it("Emits a warning for put operation that does not contain the appropriate response codes", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<{}> {
        ...ResourceNameParameter<Employee>;
      }
      
      @armResourceOperations
      interface Employees {
        @put
        @armResourceCreateOrUpdate(Employee)
        createOrUpdate(...ApiVersionParameter): {
          @statusCode _: 207;
          result: boolean;
        }
      }
      `,
      )
      .toEmitDiagnostics({
        code: `@azure-tools/typespec-azure-resource-manager/${rule.name}`,
      });
  });

  it("Emits a warning for put action that does not contain the appropriate response codes", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<{}> {
        ...ResourceNameParameter<Employee>;
      }
      
      @armResourceOperations
      interface Employees {
        @put
        @armResourceAction(Employee)
        hire(...ApiVersionParameter): {
          @statusCode _: 207;
          result: boolean;
        }
      }
      `,
      )
      .toEmitDiagnostics({
        code: `@azure-tools/typespec-azure-resource-manager/${rule.name}`,
      });
  });

  it("Does not emit a warning for put operation that contains the appropriate response codes", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<{}> {
        ...ResourceNameParameter<Employee>;
      }
      
      @armResourceOperations
      interface Employees {
        @put
        @armResourceCreateOrUpdate(Employee)
        createOrUpdate(...ApiVersionParameter): {
          @statusCode _: 200;
          result: boolean;
        } | {
          @statusCode _: 201;
          result: boolean;
        } | ErrorResponse;
      }
    `,
      )
      .toBeValid();
  });

  it("leaves missing default responses to the error response rule only in the combined rule", async () => {
    const result = tester.expect(
      `
        @armProviderNamespace
        namespace Microsoft.Contoso;
        model Employee is ProxyResource<{}> {
          ...ResourceNameParameter<Employee>;
        }
        @armResourceOperations
        interface Employees {
          @put @armResourceCreateOrUpdate(Employee)
          createOrUpdate(...ApiVersionParameter):
            { @statusCode code: 200; @body body: Employee; }
            | { @statusCode code: 201; @body body: Employee; };
        }
      `,
    );
    if (rule === useStandardResponseCodesRule) {
      await result.toBeValid();
    } else {
      await result.toEmitDiagnostics({
        code: `@azure-tools/typespec-azure-resource-manager/${rule.name}`,
        message:
          "Put operations must have 200, 201 and default responses. They must not have any other responses.",
        target: "createOrUpdate",
      });
    }
  });

  it("Does not emit a warning for operation that uses the 'ArmResourceCreateOrUpdateAsync' template.", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<{}> {
        ...ResourceNameParameter<Employee>;
      }
      
      @armResourceOperations
      interface Employees {
        createOrUpdate is ArmResourceCreateOrUpdateAsync<Employee>;
      }
    `,
      )
      .toBeValid();
  });

  it("Does not emit a warning for operation that uses the 'ArmResourceCreateOrReplaceAsync' template.", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<{}> {
        ...ResourceNameParameter<Employee>;
      }
      
      @armResourceOperations
      interface Employees {
        createOrReplace is ArmResourceCreateOrReplaceAsync<Employee>;
      }
    `,
      )
      .toBeValid();
  });

  it("Does not emit a warning for operation that uses the 'ArmResourceCreateOrReplaceSync' template.", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<{}> {
        ...ResourceNameParameter<Employee>;
      }
      
      @armResourceOperations
      interface Employees {
        createOrReplace is ArmResourceCreateOrReplaceSync<Employee>;
      }
    `,
      )
      .toBeValid();
  });

  it("Does not emit a warning for put action that contains the appropriate response codes", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<{}> {
        ...ResourceNameParameter<Employee>;
      }
      
      @armResourceOperations
      interface Employees {
        @put
        @armResourceAction(Employee)
        hire(...ApiVersionParameter): {
          @statusCode _: 200;
          result: boolean;
        } | {
          @statusCode _: 201;
          result: boolean;
        } | ErrorResponse;
      }
    `,
      )
      .toBeValid();
  });
});
