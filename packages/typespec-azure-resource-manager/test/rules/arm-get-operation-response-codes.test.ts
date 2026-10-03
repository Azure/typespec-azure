import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { armGetResponseCodesRule } from "../../src/rules/arm-get-operation-response-codes.js";

const diagnosticCode =
  "@azure-tools/typespec-azure-resource-manager/arm-get-operation-response-codes";

const resource = `
  @armProviderNamespace
  namespace Microsoft.Contoso;

  model Employee is ProxyResource<{}> {
    ...ResourceNameParameter<Employee>;
  }
`;

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armGetResponseCodesRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("warns when an ARM GET only returns an error response", async () => {
  await tester
    .expect(
      `${resource}
      @armResourceOperations
      interface Employees {
        @get
        @armResourceRead(Employee)
        get(...ResourceInstanceParameters<Employee>): ErrorResponse;
      }`,
    )
    .toEmitDiagnostics({ code: diagnosticCode, target: "get" });
});

it("warns once when an ARM GET adds a 201 response", async () => {
  await tester
    .expect(
      `${resource}
      model Created {
        @statusCode statusCode: 201;
        @body body: Employee;
      }

      @armResourceOperations
      interface Employees {
        @get
        @armResourceRead(Employee)
        get(...ResourceInstanceParameters<Employee>): ArmResponse<Employee> | Created | ErrorResponse;
      }`,
    )
    .toEmitDiagnostics({ code: diagnosticCode, target: "get" });
});

it("warns once when an ARM GET adds a 204 response", async () => {
  await tester
    .expect(
      `${resource}
      model NoContent {
        @statusCode statusCode: 204;
      }

      @armResourceOperations
      interface Employees {
        @get
        @armResourceRead(Employee)
        get(...ResourceInstanceParameters<Employee>): ArmResponse<Employee> | NoContent | ErrorResponse;
      }`,
    )
    .toEmitDiagnostics({ code: diagnosticCode, target: "get" });
});

it("warns for a GET in a nested ARM namespace", async () => {
  await tester
    .expect(
      `${resource}
      namespace Nested {
        @armResourceOperations
        interface Employees {
          @get
          @armResourceRead(Employee)
          get(...ResourceInstanceParameters<Employee>): ErrorResponse;
        }
      }`,
    )
    .toEmitDiagnostics({ code: diagnosticCode, target: "get" });
});

it("accepts the standard ARM resource read template", async () => {
  await tester
    .expect(
      `${resource}
      @armResourceOperations
      interface Employees {
        get is ArmResourceRead<Employee>;
      }`,
    )
    .toBeValid();
});

it("rejects a resource read customized to return only 204", async () => {
  await tester
    .expect(
      `${resource}
      model NoContent {
        @statusCode statusCode: 204;
      }
      @armResourceOperations
      interface Employees {
        get is ArmResourceRead<Employee, Response = NoContent>;
      }`,
    )
    .toEmitDiagnostics({ code: diagnosticCode, target: "get" });
});

it("accepts a resource read customized to return 200", async () => {
  await tester
    .expect(
      `${resource}
      @armResourceOperations
      interface Employees {
        get is ArmResourceRead<Employee, Response = ArmResponse<Employee>>;
      }`,
    )
    .toBeValid();
});

it("accepts an ARM GET with only a 200 response", async () => {
  await tester
    .expect(
      `${resource}
      @armResourceOperations
      interface Employees {
        @get
        @armResourceRead(Employee)
        get(...ResourceInstanceParameters<Employee>): ArmResponse<Employee>;
      }`,
    )
    .toBeValid();
});

it("accepts an additional 202 response with a Location header", async () => {
  await tester
    .expect(
      `${resource}
      model Accepted {
        @statusCode statusCode: 202;
        @header("Location") location: string;
      }

      @armResourceOperations
      interface Employees {
        @get
        @armResourceRead(Employee)
        get(...ResourceInstanceParameters<Employee>): ArmResponse<Employee> | Accepted | ErrorResponse;
      }`,
    )
    .toBeValid();
});

it("checks a GET in an ARM service without a provider decorator", async () => {
  await tester
    .expect(
      `
      @service
      namespace Microsoft.Contoso;

      @get
      op get(): { @statusCode statusCode: 204 };
      `,
    )
    .toEmitDiagnostics({ code: diagnosticCode, target: "get" });
});

it("ignores global SDK customization operations outside the service", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso {
        model Employee is ProxyResource<{}> {
          ...ResourceNameParameter<Employee>;
        }
        @armResourceOperations
        interface Employees {
          get is ArmResourceRead<Employee>;
        }
      }
      op sdkCustomization(): { @statusCode statusCode: 204 };
      `,
    )
    .toBeValid();
});

it("ignores operations other than GET", async () => {
  await tester
    .expect(
      `${resource}
      @post
      op action(): { @statusCode statusCode: 201 };
      `,
    )
    .toBeValid();
});
