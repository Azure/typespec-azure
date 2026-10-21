import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester, t, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { armResourceOperationsRule } from "../../src/rules/arm-resource-operation-response.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    armResourceOperationsRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const code = "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response";
const models = `
  @armProviderNamespace namespace Microsoft.Test;
  model Widget is TrackedResource<{
    common?: string;
    @visibility(Lifecycle.Update) updateOnly?: string;
  }> { ...ResourceNameParameter<Widget>; }
  model Other is ProxyResource<{}> { ...ResourceNameParameter<Other>; }
`;
const responseDiagnostic = {
  code,
  severity: "warning" as const,
  message: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
};
const requestDiagnostic = (request: string) => ({
  code,
  severity: "warning" as const,
  message: `PUT request body must use resource model Microsoft.Test.Widget. Found ${request}.`,
});

it.each([
  "@get @armResourceRead(Widget) read(...ResourceInstanceParameters<Widget>): ArmResponse<Other> | ErrorResponse;",
  "@put @armResourceCreateOrUpdate(Widget) create(...ResourceInstanceParameters<Widget>, @bodyRoot body: Widget): ArmResponse<Widget> | ArmCreatedResponse<Other> | ErrorResponse;",
  "@get @armResourceList(Widget) list(...Foundations.SubscriptionScope<Widget>): ArmResponse<ResourceListResult<Other>> | ErrorResponse;",
  "@patch @armResourceUpdate(Widget) update(...ResourceInstanceParameters<Widget>, @bodyRoot body: Widget): ArmResponse<Other> | ErrorResponse;",
])("preserves canonical lifecycle and list response validation: %s", async (operation) => {
  await tester
    .expect(`${models} @armResourceOperations interface Widgets { ${operation} }`)
    .toEmitDiagnostics([responseDiagnostic]);
});

describe("registered resource PUT requests", () => {
  it.each(["TrackedResource", "ProxyResource"])(
    "accepts standard %s PUT templates",
    async (base) => {
      await tester
        .expect(
          `
        @armProviderNamespace namespace Microsoft.Test;
        model Widget is ${base}<{}> { ...ResourceNameParameter<Widget>; }
        @armResourceOperations interface Widgets {
          create is ArmResourceCreateOrReplaceSync<Widget>;
        }
      `,
        )
        .toBeValid();
    },
  );

  it.each(["@body", "@bodyRoot"])(
    "compares a %s request with the canonical resource",
    async (body) => {
      await tester
        .expect(
          t.code`${models}
        model Input { value?: string; }
        @armResourceOperations interface Widgets {
          @put @armResourceCreateOrUpdate(Widget)
          ${t.op("create")}(...ResourceInstanceParameters<Widget>, ${body} body: Input):
            ArmResponse<Widget> | ArmCreatedResponse<Widget> | ErrorResponse;
        }
      `,
        )
        .toEmitDiagnostics(({ create }) => [
          {
            ...requestDiagnostic("Microsoft.Test.Input"),
            pos: getSourceLocation(create).pos,
            end: getSourceLocation(create).end,
          },
        ]);
    },
  );

  it.each(["", ", @body body: void", ", @header token: string, @query filter?: string"])(
    "requires a PUT request independently of response bodies: %s",
    async (parameters) => {
      await tester
        .expect(
          `${models}
        @armResourceOperations interface Widgets {
          @put @armResourceCreateOrUpdate(Widget)
          create(...ResourceInstanceParameters<Widget>${parameters}): void;
        }
      `,
        )
        .toEmitDiagnostics([
          {
            code,
            severity: "warning",
            message: "ARM PUT operations must have a request body.",
          },
        ]);
    },
  );

  it.each([
    "model Input { common?: string; }",
    "model Input is Widget;",
    "model Input extends Widget {}",
    "model Input { ...Widget; }",
  ])("rejects a distinct request declaration: %s", async (declaration) => {
    await tester
      .expect(
        `${models}
        ${declaration}
        @armResourceOperations interface Widgets {
          @put @armResourceCreateOrUpdate(Widget)
          create(...ResourceInstanceParameters<Widget>, @bodyRoot body: Input): ArmResponse<Widget>;
        }
      `,
      )
      .toEmitDiagnostics([requestDiagnostic("Microsoft.Test.Input")]);
  });

  it("recovers the resource from an implicit request body", async () => {
    await tester
      .expect(
        `${models}
        alias Input = Widget;
        @armResourceOperations interface Widgets {
          @put @armResourceCreateOrUpdate(Widget)
          create(...ResourceInstanceParameters<Widget>, ...Input): ArmResponse<Widget>;
        }
      `,
      )
      .toBeValid();
  });

  it("accepts an explicit alias of the registered resource", async () => {
    await tester
      .expect(
        `${models}
        alias Input = Widget;
        @armResourceOperations interface Widgets {
          @put @armResourceCreateOrUpdate(Widget)
          create(...ResourceInstanceParameters<Widget>, @bodyRoot body: Input): ArmResponse<Widget>;
        }
      `,
      )
      .toBeValid();
  });

  it("accepts the asynchronous standard template", async () => {
    await tester
      .expect(
        `${models}
        @armResourceOperations interface Widgets {
          create is ArmResourceCreateOrReplaceAsync<Widget>;
        }
      `,
      )
      .toBeValid();
  });

  it("rejects a scalar request instead of mistaking it for an absent body", async () => {
    await tester
      .expect(
        `${models}
        @armResourceOperations interface Widgets {
          @put @armResourceCreateOrUpdate(Widget)
          create(...ResourceInstanceParameters<Widget>, @body body: string): ArmResponse<Widget>;
        }
      `,
      )
      .toEmitDiagnostics([requestDiagnostic("string")]);
  });

  it("honors Create visibility without confusing PATCH input with the resource", async () => {
    await tester
      .expect(
        `${models}
        model WidgetPatch { tags?: Record<string>; properties?: { updateOnly?: string; }; }
        @armResourceOperations interface Widgets {
          @parameterVisibility(Lifecycle.Create)
          create is ArmResourceCreateOrReplaceSync<Widget>;
          update is ArmCustomPatchSync<Widget, PatchModel = WidgetPatch>;
        }
      `,
      )
      .toBeValid();
  });

  it.each(["void", "{ @statusCode status: 204; }"])(
    "compares the request even without a resource response: %s",
    async (response) => {
      await tester
        .expect(
          `${models}
          @armResourceOperations interface Widgets {
            @put @armResourceCreateOrUpdate(Widget)
            create(...ResourceInstanceParameters<Widget>, @bodyRoot body: Other): ${response};
          }
        `,
        )
        .toEmitDiagnostics([requestDiagnostic("Microsoft.Test.Other")]);
    },
  );

  it("reports independent request and response violations against the same resource", async () => {
    await tester
      .expect(
        `${models}
        @armResourceOperations interface Widgets {
          @put @armResourceCreateOrUpdate(Widget)
          create(...ResourceInstanceParameters<Widget>, @bodyRoot body: Other):
            ArmResponse<Other> | ErrorResponse;
        }
      `,
      )
      .toEmitDiagnostics([requestDiagnostic("Microsoft.Test.Other"), responseDiagnostic]);
  });

  it("checks a concrete alias of a registered template", async () => {
    await tester
      .expect(
        `${models}
        @put @armResourceCreateOrUpdate(Widget)
        op Template<T>(...ResourceInstanceParameters<Widget>, @bodyRoot body: T): ArmResponse<Widget>;
        @armResourceOperations interface Widgets { create is Template<Other>; }
      `,
      )
      .toEmitDiagnostics([requestDiagnostic("Microsoft.Test.Other")]);
  });

  it("preserves operation-level suppression for a legacy request model", async () => {
    await Tester.compile(
      `${models}
        model Input { value?: string; }
        @armResourceOperations interface Widgets {
          #suppress "${code}" "Existing API uses a separate request model."
          @put @armResourceCreateOrUpdate(Widget)
          create(...ResourceInstanceParameters<Widget>, @bodyRoot body: Input): ArmResponse<Widget>;
        }
      `,
      { compilerOptions: { linterRuleSet: { enable: { [code]: true } } } },
    );
  });

  it.each([
    "@put op custom(@bodyRoot body: Other): Widget;",
    "@put @createsOrReplacesResource(Widget) op custom(@bodyRoot body: Other): Widget;",
    "@armResourceOperations interface Custom { @put custom(@bodyRoot body: Other): Widget; }",
    "@put op custom(): Widget;",
  ])(
    "leaves unregistered custom operations to operation-registration rules: %s",
    async (operation) => {
      await tester.expect(`${models} ${operation}`).toBeValid();
    },
  );
});
