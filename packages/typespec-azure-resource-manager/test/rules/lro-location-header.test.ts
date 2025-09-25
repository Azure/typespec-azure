import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { lroLocationHeaderRule } from "../../src/rules/lro-location-header.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    lroLocationHeaderRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("Emits a warning for LRO 202 response that does not contain a Location header", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
    namespace Microsoft.Contoso;
      model Employee is ProxyResource<EmployeeProperties> {
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }
      model EmployeeProperties {}
      
      @armResourceOperations
      interface Employees {
        @armResourceDelete(Employee)
        delete is ArmResourceDeleteWithoutOkAsync<Employee, EmployeeProperties, LroHeaders = {}>;
      }
    `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/lro-location-header",
    });
});

it("Emits a warning for custom 202 response that does not contain a Location header", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
    namespace Microsoft.Contoso;
      model Employee is ProxyResource<EmployeeProperties> {
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }
      model EmployeeProperties {}
      @armResourceOperations
      interface Employees {
        @armResourceDelete(Employee)
        delete(): { @statusCode _: 202 };
      }
    `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/lro-location-header",
    });
});

it("Does not emit a warning for LRO 202 response that contains the Location response header", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
    namespace Microsoft.Contoso;
      model Employee is ProxyResource<EmployeeProperties> {
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }
      model EmployeeProperties {}
      @armResourceOperations
      interface Employees {
        delete is ArmResourceDeleteWithoutOkAsync<Employee, EmployeeProperties>;
      }`,
    )
    .toBeValid();
});
