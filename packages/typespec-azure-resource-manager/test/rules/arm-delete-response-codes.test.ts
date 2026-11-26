import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";

import { armDeleteResponseCodesRule } from "../../src/rules/arm-delete-response-codes.js";
import { useStandardResponseCodesRule } from "../../src/rules/use-standard-response-codes.js";

describe.each([armDeleteResponseCodesRule, useStandardResponseCodesRule])("$name", (rule) => {
  let runner: TesterInstance;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await Tester.createInstance();
    tester = createLinterRuleTester(runner, rule, "@azure-tools/typespec-azure-resource-manager");
  });

  it("Emits a warning for synchronous delete operation that does not contain the appropriate response codes", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
      
      model EmployeeProperties {}
      
      @armResourceOperations
      interface Employees {
        @armResourceDelete(Employee)
        delete(...ApiVersionParameter): {
          @statusCode _: 200;
          result: boolean;
        }
      }
    `,
      )
      .toEmitDiagnostics({
        code: `@azure-tools/typespec-azure-resource-manager/${rule.name}`,
        message:
          rule === useStandardResponseCodesRule
            ? "Synchronous delete operations must have 200 and 204 responses. They must not have any other response codes. Consider using the 'ArmResourceDeleteSync' template."
            : "Synchronous delete operations must have 200, 204 and default responses. They must not have any other responses. Consider using the 'ArmResourceDeleteSync' template.",
      });
  });

  it("Does not emit a warning for synchronous delete operation that contains the appropriate response codes", async () => {
    await tester
      .expect(
        `
    @armProviderNamespace
    namespace Microsoft.Contoso;
    
    model Employee is ProxyResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
    }
    
    model EmployeeProperties {}
    
    @armResourceOperations
    interface Employees {
      @armResourceDelete(Employee)
      delete(...ApiVersionParameter): {
        @statusCode _: 200;
        result: boolean;
      } | {
        @statusCode _: 204;
        result: boolean;
      } | ErrorResponse
    }`,
      )
      .toBeValid();
  });

  it("Does not emit a warning for synchronous delete operation that uses the `ArmResourceDeleteSync` template.", async () => {
    await tester
      .expect(
        `
    @armProviderNamespace
    namespace Microsoft.Contoso;
    
    model Employee is ProxyResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
    }
    
    model EmployeeProperties {}
    
    @armResourceOperations
    interface Employees {
      delete is ArmResourceDeleteSync<Employee>;
    }`,
      )
      .toBeValid();
  });

  it("Emits a warning for long-running delete operation that does not contain the appropriate response codes", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
      
      model EmployeeProperties {}
      
      @armResourceOperations
      interface Employees {
        #suppress "deprecated" "test"
        delete is ArmResourceDeleteAsync<Employee>;
      }
    `,
      )
      .toEmitDiagnostics({
        code: `@azure-tools/typespec-azure-resource-manager/${rule.name}`,
        message:
          rule === useStandardResponseCodesRule
            ? "Long-running delete operations must have 202 and 204 responses. They must not have any other response codes. Consider using the 'ArmResourceDeleteWithoutOkAsync' template."
            : "Long-running delete operations must have 202, 204 and default responses. They must not have any other responses. Consider using the 'ArmResourceDeleteWithoutOkAsync' template.",
      });
  });

  it("Does not emit a warning for long-running delete operation that uses the `ArmResourceDeleteWithoutOkAsync` template.", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }

      model EmployeeProperties {}

      @armResourceOperations
      interface Employees {
        delete is ArmResourceDeleteWithoutOkAsync<Employee>;
      }`,
      )
      .toBeValid();
  });
});
