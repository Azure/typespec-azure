import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { useStandardResponseCodesRule } from "../../src/rules/use-standard-response-codes.js";

const diagnosticCode = "@azure-tools/typespec-azure-resource-manager/use-standard-response-codes";

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
    useStandardResponseCodesRule,
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

it("preserves the general allowlist for GET operations outside services", async () => {
  await tester
    .expect(
      `
      @route("/customization") @get op customization(): { @statusCode code: 204; };
      @route("/rejected") @get op rejected(): { @statusCode code: 404; };
    `,
    )
    .toEmitDiagnostics({
      code: diagnosticCode,
      message:
        "Operation 'rejected' defines disallowed response status '404'. Use only 200, 201, 202, 204, or default responses.",
      target: "rejected",
    });
});

it("reports one GET diagnostic for missing 200 and multiple disallowed codes", async () => {
  await tester
    .expect(
      `
      @service namespace Microsoft.Contoso;
      @get op read(): { @statusCode code: 201; }
        | { @statusCode code: 404; } | { @statusCode code: 500; };
    `,
    )
    .toEmitDiagnostics({
      code: diagnosticCode,
      message:
        "GET operations must include a 200 response and may only use 202 and default as additional response codes.",
      target: "read",
    });
});

it("checks the combined GET and non-GET policies without duplicate diagnostics", async () => {
  await tester
    .expect(
      `
      @service namespace Microsoft.Contoso;
      @get op read(): { @statusCode code: 200; } | { @statusCode code: 204; }
        | { @statusCode code: 404; };
      @post op create(): { @statusCode code: 201; } | { @statusCode code: 404; };
    `,
    )
    .toEmitDiagnostics([
      {
        code: diagnosticCode,
        message:
          "GET operations must include a 200 response and may only use 202 and default as additional response codes.",
        target: "read",
      },
      {
        code: diagnosticCode,
        message:
          "Operation 'create' defines disallowed response status '404'. Use only 200, 201, 202, 204, or default responses.",
        target: "create",
      },
    ]);
});

it("allows 202 without requiring a Location header when 200 exists", async () => {
  await tester
    .expect(
      `
      @service namespace Microsoft.Contoso;
      @get op read(): { @statusCode code: 200; } | { @statusCode code: 202; };
    `,
    )
    .toBeValid();
});

it("rejects a GET with only 202 and default responses", async () => {
  await tester
    .expect(
      `
      @service namespace Microsoft.Contoso;
      @get op read(): { @statusCode code: 202; } | ErrorResponse;
    `,
    )
    .toEmitDiagnostics({ code: diagnosticCode, target: "read" });
});

it("retains 201 for non-GET operations", async () => {
  await tester
    .expect(
      `${resource}
      @post
      op action(): { @statusCode statusCode: 201 };
      `,
    )
    .toBeValid();
});

it.each(["@statusCode @minValue(200) @maxValue(200) code: int32;", "@statusCode code: 200;"])(
  "accepts equivalent literal and singleton 200 responses: %s",
  async (status) => {
    await tester
      .expect(
        `
      @service namespace Microsoft.Contoso;
      model Result { ${status} @body body: string; }
      @get op read(): Result;
    `,
      )
      .toBeValid();
  },
);

it("accepts a singleton 202 range in addition to 200", async () => {
  await tester
    .expect(
      `
      @service namespace Microsoft.Contoso;
      model Accepted {
        @statusCode @minValue(202) @maxValue(202) code: int32;
      }
      @get op read(): { @statusCode code: 200; @body body: string; } | Accepted;
    `,
    )
    .toBeValid();
});

it.each([
  [200, 202],
  [201, 201],
  [204, 204],
])("rejects disallowed status range %s-%s", async (start, end) => {
  await tester
    .expect(
      `
        @service namespace Microsoft.Contoso;
        model Additional {
          @statusCode @minValue(${start}) @maxValue(${end}) code: int32;
        }
        @get op read(): { @statusCode code: 200; @body body: string; } | Additional;
      `,
    )
    .toEmitDiagnostics({ code: diagnosticCode, target: "read" });
});
