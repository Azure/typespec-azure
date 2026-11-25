import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import {
  createLinterRuleTester,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { useStandardResponseCodesRule } from "../../src/rules/use-standard-response-codes.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.files({ "extra.tsp": "" }).import("./extra.tsp").createInstance();
  tester = createLinterRuleTester(
    runner,
    useStandardResponseCodesRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const header = `
  @service
  namespace Contoso.Example;
`;

const resource = `
  @service @armProviderNamespace
  namespace Microsoft.Example;
  model Properties { @visibility(Lifecycle.Read) provisioningState?: ResourceProvisioningState; }
  model Widget is TrackedResource<Properties> {
    ...ResourceNameParameter<Widget>;
  }
`;

function diagnostic(operationName: string, statusCode: number | string) {
  return {
    code: "@azure-tools/typespec-azure-resource-manager/use-standard-response-codes",
    message: `Operation '${operationName}' defines disallowed response status '${statusCode}'. Use only 200, 201, 202, 204, or default responses.`,
  };
}

it.each([200, 201, 202, 204])("accepts allowed status %s", async (status) => {
  await tester.expect(`${header} @post op read(): { @statusCode status: ${status}; };`).toBeValid();
});

it.each([203, 206, 302, 400, 404, 500])("rejects disallowed status %s", async (status) => {
  await tester
    .expect(`${header} @post op read(): { @statusCode status: ${status}; };`)
    .toEmitDiagnostics([diagnostic("read", status)]);
});

it("accepts a standard default error response", async () => {
  await tester.expect(`${header} @get op read(): string | CommonTypes.ErrorResponse;`).toBeValid();
});

it.each([
  [200, 299],
  [300, 399],
  [400, 499],
])("rejects status range %s-%s", async (start, end) => {
  await tester
    .expect(
      `${header}
      model Response {
        @statusCode @minValue(${start}) @maxValue(${end}) status: int32;
      }
      @post op read(): Response;
    `,
    )
    .toEmitDiagnostics([diagnostic("read", `${start}-${end}`)]);
});

it("accepts a singleton allowed range", async () => {
  await tester
    .expect(
      `${header}
      model Response { @statusCode @minValue(200) @maxValue(200) status: int32; }
      @post op read(): Response;
    `,
    )
    .toBeValid();
});

it("rejects a singleton disallowed range", async () => {
  await tester
    .expect(
      `${header}
      model Response { @statusCode @minValue(404) @maxValue(404) status: int32; }
      @post op read(): Response;
    `,
    )
    .toEmitDiagnostics([diagnostic("read", 404)]);
});

it("reports each disallowed response code once across body variants", async () => {
  await tester
    .expect(
      `${header}
      model TextResponse { @statusCode status: 404; @body body: string; }
      model NumericResponse { @statusCode status: 404; @body body: int32; }
      @post op read(): TextResponse | NumericResponse | { @statusCode status: 500; };
    `,
    )
    .toEmitDiagnostics([diagnostic("read", 404), diagnostic("read", 500)]);
});

it("reports concrete endpoints, not the shared template instance", async () => {
  await tester
    .expect(
      `${header}
      @post op Template<T>(): { @statusCode status: 404; @body body: T; };
      @route("/one") op /*read*/read is Template<string>;
      @route("/two") op /*readAgain*/readAgain is Template<string>;
    `,
    )
    .toEmitDiagnostics(({ read, readAgain }) =>
      [read, readAgain].map((operation) => ({
        ...diagnostic(operation.name, 404),
        pos: getSourceLocation(operation).pos,
        end: getSourceLocation(operation).end,
      })),
    );
});

it("checks operations without service metadata", async () => {
  await tester
    .expect("@get op read(): { @statusCode status: 404; };")
    .toEmitDiagnostics([diagnostic("read", 404)]);
});

it("checks operations outside a declared service", async () => {
  await tester
    .expect(
      `
        @service namespace Service {
          @get op read(): { @statusCode status: 200; };
        }
        namespace Outside {
          @get op readOutside(): { @statusCode status: 404; };
        }
      `,
    )
    .toEmitDiagnostics([diagnostic("readOutside", 404)]);
});

it("rejects an explicit error response on a standard ARM action", async () => {
  await tester
    .expect(
      `${resource}
      @armResourceOperations interface Widgets {
        check is ArmResourceActionSync<Widget, void, ArmResponse<Widget>, Error = NotFoundResponse>;
      }
    `,
    )
    .toEmitDiagnostics([diagnostic("check", 404)]);
});

it("accepts a standard ARM action with the default error response", async () => {
  await tester
    .expect(
      `${resource}
      @armResourceOperations interface Widgets {
        check is ArmResourceActionSync<Widget, void, ArmResponse<Widget>>;
      }
    `,
    )
    .toBeValid();
});

it("rejects a redirect response on a standard ARM action", async () => {
  await tester
    .expect(
      `${resource}
      model RedirectResponse {
        @statusCode status: 302;
        @header("Location") location: string;
      }
      @armResourceOperations interface Widgets {
        redirect is ArmResourceActionSync<Widget, void, ArmResponse<Widget> | RedirectResponse>;
      }
    `,
    )
    .toEmitDiagnostics([diagnostic("redirect", 302)]);
});

it("rejects a status range on a standard ARM action", async () => {
  await tester
    .expect(
      `${resource}
      model RedirectRangeResponse {
        @statusCode @minValue(300) @maxValue(399) status: int32;
        @header("Location") location: string;
      }
      @armResourceOperations interface Widgets {
        redirect is ArmResourceActionSync<Widget, void, ArmResponse<Widget> | RedirectRangeResponse>;
      }
    `,
    )
    .toEmitDiagnostics([diagnostic("redirect", "300-399")]);
});

const examples = [
  `import "@typespec/http";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using Azure.ResourceManager;

@service
@armProviderNamespace
namespace Microsoft.Contoso;

model WidgetProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget, Error = NotFoundResponse>;
}
`,
  `import "@typespec/http";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using Azure.ResourceManager;

@service
@armProviderNamespace
namespace Microsoft.Contoso;

model WidgetProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
}
`,
];

it("diagnoses the incorrect template fixture", async () => {
  await tester.expect({ "main.tsp": "", "extra.tsp": examples[0] }).toEmitDiagnostics([
    {
      code: "@azure-tools/typespec-azure-resource-manager/use-standard-response-codes",
      message:
        "GET operations must include a 200 response and may only use 202 and default as additional response codes.",
    },
  ]);
});

it("accepts the correct template fixture", async () => {
  await tester.expect({ "main.tsp": "", "extra.tsp": examples[1] }).toBeValid();
});

describe("ARM GET response codes", () => {
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

  it("rejects an extra 201 response even when 200 is present", async () => {
    await tester
      .expect(
        `
      @service namespace Microsoft.Contoso;
      @get op read(): { @statusCode code: 200; } | { @statusCode code: 201; };
    `,
      )
      .toEmitDiagnostics({ code: diagnosticCode, target: "read" });
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

  it("rejects a non-singleton range containing 200", async () => {
    await tester
      .expect(
        `
        @service namespace Microsoft.Contoso;
        model Additional {
          @statusCode @minValue(200) @maxValue(202) code: int32;
        }
        @get op read(): { @statusCode code: 200; @body body: string; } | Additional;
      `,
      )
      .toEmitDiagnostics({ code: diagnosticCode, target: "read" });
  });
});
