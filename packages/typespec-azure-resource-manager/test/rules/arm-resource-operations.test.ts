import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester, t, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { armResourceOperationsRule } from "../../src/rules/arm-resource-operation-response.js";

let tester: LinterRuleTester;
const code = "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response";
const models = `
  @armProviderNamespace namespace Microsoft.Test;
  model Widget is TrackedResource<{
    common?: string;
    @visibility(Lifecycle.Update) updateOnly?: string;
  }> { ...ResourceNameParameter<Widget>; }
  model Other is ProxyResource<{}> { ...ResourceNameParameter<Other>; }
`;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    armResourceOperationsRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

describe("native PUT response resources", () => {
  const service = `${models}
    model Unmarked { value?: string; }
    model Lookalike { ...Widget; }
    @armVirtualResource("Microsoft.External")
    model External {
      @path @key("externalName") @segment("externals")
      name: string;
    }
  `;
  const nonResourceDiagnostic = {
    code,
    severity: "warning" as const,
    message: "ARM PUT success responses must return a resource model.",
  };
  const put = (response: string) => `
    interface Custom {
      @put @route("/providers/Microsoft.Test/custom/{customName}")
      replace(@path customName: string, @body body: Unmarked): ${response};
    }
  `;

  it.each(["Unmarked", "Unmarked[]", "string", "unknown", "Lookalike"])(
    "rejects a non-resource body without a canonical association: %s",
    async (body) => {
      await tester
        .expect(`${service} ${put(`ArmResponse<${body}>`)}`)
        .toEmitDiagnostics([nonResourceDiagnostic]);
    },
  );

  it.each([
    "ArmResponse<Widget>",
    "ArmCreatedResponse<Widget>",
    "CommonTypes.ProxyResource",
    "ArmResponse<External>",
  ])(
    "accepts native resource identity without resolved lifecycle operations: %s",
    async (response) => {
      await tester.expect(`${service} ${put(response)}`).toBeValid();
    },
  );

  it.each(["true", "false"])(
    "recognizes an explicit custom resource independently of its marker option: %s",
    async (option) => {
      await tester
        .expect(
          `${service}
          model CustomResource is Azure.ResourceManager.Legacy.CustomAzureResource<${option}> {
            value?: string;
          }
          ${put("ArmResponse<CustomResource>")}
        `,
        )
        .toBeValid();
    },
  );

  it.each([
    "ArmCreatedResponse<Unmarked>",
    "{ @statusCode status: 200; } | ArmCreatedResponse<Unmarked>",
    "{ @statusCode status: 200; @bodyRoot body: void; } | ArmCreatedResponse<Unmarked>",
  ])("checks 201 when 200 has no response body: %s", async (response) => {
    await tester.expect(`${service} ${put(response)}`).toEmitDiagnostics([nonResourceDiagnostic]);
  });

  it.each([
    "ArmResponse<Widget> | ArmCreatedResponse<Unmarked>",
    "ArmResponse<Unmarked> | ArmCreatedResponse<Widget>",
    "ArmResponse<Unmarked> | ArmCreatedResponse<Unmarked>",
  ])("requires resource bodies for both 200 and 201, reporting once: %s", async (response) => {
    await tester
      .expect(
        t.code`${service}
        interface Custom {
          @put @route("/providers/Microsoft.Test/custom/{customName}")
          ${t.op("replace")}(@path customName: string, @body body: Unmarked): ${response};
        }
      `,
      )
      .toEmitDiagnostics(({ replace }) => [
        {
          ...nonResourceDiagnostic,
          pos: getSourceLocation(replace).pos,
          end: getSourceLocation(replace).end,
        },
      ]);
  });

  it("accepts resource bodies at both 200 and 201", async () => {
    await tester
      .expect(`${service} ${put("ArmResponse<Widget> | ArmCreatedResponse<Widget>")}`)
      .toBeValid();
  });

  it("reports all failing content variants as one response-contract violation", async () => {
    await tester
      .expect(
        `${service}
        model OtherPayload { other?: string; }
        ${put("ArmResponse<Unmarked> | ArmResponse<OtherPayload>")}
      `,
      )
      .toEmitDiagnostics([nonResourceDiagnostic]);
  });

  it.each(["AcceptedResponse", "NoContentResponse", "void"])(
    "leaves bodyless/status requirements to their existing owners: %s",
    async (response) => {
      await tester.expect(`${service} ${put(response)}`).toBeValid();
    },
  );

  it("does not apply ARM resource policy to data-plane operations", async () => {
    await tester
      .expect(
        "@service namespace DataPlane; interface Custom { @put replace(@body body: string): string; }",
      )
      .toBeValid();
  });
});

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

describe("resource models used at multiple scopes", () => {
  const scopedModels = `
    @armProviderNamespace namespace Microsoft.Test;
    @subscriptionResource
    model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
    model Other is ProxyResource<{}> { ...ResourceNameParameter<Other>; }
    alias SubscriptionOps = Azure.ResourceManager.Legacy.LegacyOperations<
      {...ApiVersionParameter, ...SubscriptionIdParameter, ...Azure.ResourceManager.Legacy.Provider},
      {@path @key @segment("widgets") widgetName: string;},
      ResourceName = "Widgets"
    >;
    alias TenantOps = Azure.ResourceManager.Legacy.LegacyOperations<
      {...ApiVersionParameter, ...Azure.ResourceManager.Legacy.Provider},
      {@path @key @segment("widgets") widgetName: string;},
      ResourceName = "Widgets"
    >;
  `;

  it("accepts the same resource at subscription and tenant scopes", async () => {
    await tester
      .expect(
        `${scopedModels}
        @armResourceOperations interface Subscriptions {
          read is SubscriptionOps.Read<Widget>;
          create is SubscriptionOps.CreateOrUpdateSync<Widget>;
          list is SubscriptionOps.List<Widget>;
        }
        @armResourceOperations interface Tenants {
          read is TenantOps.Read<Widget>;
          create is TenantOps.CreateOrUpdateSync<Widget>;
          list is TenantOps.List<Widget>;
        }
      `,
      )
      .toBeValid();
  });

  it("does not hide an offending scope behind a compliant occurrence of the same model", async () => {
    await tester
      .expect(
        t.code`${scopedModels}
        model Input { value?: string; }
        @armResourceOperations interface Subscriptions {
          create is SubscriptionOps.CreateOrUpdateSync<Widget>;
        }
        @armResourceOperations interface Tenants {
          ${t.op("create")} is TenantOps.CreateOrUpdateSync<Widget, Request = Input>;
          ${t.op("read")} is TenantOps.Read<Widget, Response = ArmResponse<Other>>;
        }
      `,
      )
      .toEmitDiagnostics(({ create, read }) => [
        {
          ...responseDiagnostic,
          pos: getSourceLocation(read).pos,
          end: getSourceLocation(read).end,
        },
        {
          ...requestDiagnostic("Microsoft.Test.Input"),
          pos: getSourceLocation(create).pos,
          end: getSourceLocation(create).end,
        },
      ]);
  });

  it("reports separate offending operations at both scopes", async () => {
    await tester
      .expect(
        t.code`${scopedModels}
        @armResourceOperations interface Subscriptions {
          ${t.op("subscriptionRead")} is SubscriptionOps.Read<Widget, Response = ArmResponse<Other>>;
        }
        @armResourceOperations interface Tenants {
          ${t.op("tenantRead")} is TenantOps.Read<Widget, Response = ArmResponse<Other>>;
        }
      `,
      )
      .toEmitDiagnostics(({ subscriptionRead, tenantRead }) =>
        [tenantRead, subscriptionRead].map((operation) => ({
          ...responseDiagnostic,
          pos: getSourceLocation(operation).pos,
          end: getSourceLocation(operation).end,
        })),
      );
  });

  it("reports shared list associations once per offending operation", async () => {
    await tester
      .expect(
        t.code`${scopedModels}
        @armResourceOperations interface Subscriptions {
          read is SubscriptionOps.Read<Widget>;
          ${t.op("subscriptionList")} is SubscriptionOps.List<Widget, Response = ArmResponse<ResourceListResult<Other>>>;
        }
        @armResourceOperations interface Tenants {
          read is TenantOps.Read<Widget>;
          ${t.op("tenantList")} is TenantOps.List<Widget, Response = ArmResponse<ResourceListResult<Other>>>;
        }
      `,
      )
      .toEmitDiagnostics(({ subscriptionList, tenantList }) =>
        [subscriptionList, tenantList].map((operation) => ({
          ...responseDiagnostic,
          pos: getSourceLocation(operation).pos,
          end: getSourceLocation(operation).end,
        })),
      );
  });
});

it.each([
  [
    "@get @armResourceRead(Widget) read(...ResourceInstanceParameters<Widget>): ArmResponse<Other> | ErrorResponse;",
    "",
  ],
  [
    "@put @armResourceCreateOrUpdate(Widget) create(...ResourceInstanceParameters<Widget>, @bodyRoot body: Widget): ArmResponse<Widget> | ArmCreatedResponse<Other> | ErrorResponse;",
    "",
  ],
  [
    "list is ArmListBySubscription<Widget, Response = ArmResponse<ResourceListResult<Other>>>;",
    "readSupport is ArmResourceRead<Widget>;",
  ],
  [
    "@patch @armResourceUpdate(Widget) update(...ResourceInstanceParameters<Widget>, @bodyRoot body: Widget): ArmResponse<Other> | ErrorResponse;",
    "readSupport is ArmResourceRead<Widget>;",
  ],
])("preserves resolved lifecycle and list response validation: %s", async (operation, support) => {
  await tester
    .expect(`${models} @armResourceOperations interface Widgets { ${support} ${operation} }`)
    .toEmitDiagnostics([responseDiagnostic]);
});

it.each([
  [
    "@get @armResourceRead(Widget) read(...ResourceInstanceParameters<Widget>): ArmResponse<Unregistered>;",
    "",
  ],
  [
    "@put @armResourceCreateOrUpdate(Widget) create(...ResourceInstanceParameters<Widget>, @bodyRoot body: Widget): ArmResponse<Unregistered>;",
    "",
  ],
  [
    "list is ArmListBySubscription<Widget, Response = ArmResponse<ResourceListResult<Unregistered>>>;",
    "readSupport is ArmResourceRead<Widget>;",
  ],
])("rejects an unrelated unregistered success body: %s", async (operation, support) => {
  await tester
    .expect(
      `${models}
      model Unregistered { properties?: { state?: string; }; }
      @armResourceOperations interface Widgets { ${support} ${operation} }
    `,
    )
    .toEmitDiagnostics([responseDiagnostic]);
});

it.each([
  "list is ArmListBySubscription<Widget, Response = ArmResponse<ResourceListResult<Other>>>;",
  "@patch @armResourceUpdate(Widget) update(...ResourceInstanceParameters<Widget>, @bodyRoot body: Widget): ArmResponse<Other>;",
])("does not infer a resource occurrence from LIST/PATCH alone: %s", async (operation) => {
  await tester
    .expect(`${models} @armResourceOperations interface Widgets { ${operation} }`)
    .toBeValid();
});

it.each([true, false])(
  "accepts resource subtypes only with discriminated ancestry: %s",
  async (discriminated) => {
    const result = tester.expect(`
      @armProviderNamespace namespace Microsoft.Test;
      ${discriminated ? '@discriminator("kind")' : ""}
      model Widget is ProxyResource<{}> {
        ...ResourceNameParameter<Widget>;
        kind: string;
      }
      model Variant extends Widget { kind: "variant"; }
      @armResourceOperations interface Widgets {
        @get @armResourceRead(Widget)
        read(...ResourceInstanceParameters<Widget>): ArmResponse<Variant>;
      }
    `);
    if (discriminated) {
      await result.toBeValid();
    } else {
      await result.toEmitDiagnostics([responseDiagnostic]);
    }
  },
);

it("ignores non-success response bodies", async () => {
  await tester
    .expect(
      `${models}
      model Failure { @statusCode status: 409; @bodyRoot body: { message: string; }; }
      @armResourceOperations interface Widgets {
        @get @armResourceRead(Widget)
        read(...ResourceInstanceParameters<Widget>): ArmResponse<Widget> | Failure;
      }
    `,
    )
    .toBeValid();
});

it("checks responses of every registered lifecycle operation", async () => {
  await tester
    .expect(
      `${models}
      model Result { value?: string; }
      @route("/first") @armResourceOperations interface First {
        @put @armResourceCreateOrUpdate(Widget)
        create(...ResourceInstanceParameters<Widget>, @bodyRoot body: Widget): ArmResponse<Result>;
      }
      @route("/second") @armResourceOperations interface Second {
        create is ArmResourceCreateOrReplaceSync<Widget>;
      }
    `,
    )
    .toEmitDiagnostics([responseDiagnostic]);
});

it.each(["ArmResponse<Widget[]>", "ArmResponse<{ value: Widget[]; nextLink?: string; }>"])(
  "compares collection item types without requiring paging annotations: %s",
  async (response) => {
    await tester
      .expect(
        `${models}
      @armResourceOperations interface Widgets {
          read is ArmResourceRead<Widget>;
          @get @autoRoute @segmentOf(Widget) @armResourceList(Widget)
          list(...Foundations.SubscriptionScope<Widget>): ${response};
      }
    `,
      )
      .toBeValid();
  },
);

describe("registered resource PUT requests", () => {
  const legacyOperations = `
    @armResourceOperations interface LegacyOps extends Azure.ResourceManager.Legacy.LegacyOperations<
      {...ApiVersionParameter, ...SubscriptionIdParameter, ...ResourceGroupParameter, ...Azure.ResourceManager.Legacy.Provider},
      {@path @segment("widgets") @key widgetName: string;}
    > {}
  `;

  it("checks legacy PUT aliases even when their list-map names collide", async () => {
    await tester
      .expect(
        `${models}
        ${legacyOperations}
        model Input { value?: string; }
        @route("/first") @armResourceOperations interface First {
          create is LegacyOps.CreateOrUpdateAsync<Widget, Request = Input>;
        }
        @route("/second") @armResourceOperations interface Second {
          create is LegacyOps.CreateOrUpdateSync<Widget, Request = Input>;
        }
      `,
      )
      .toEmitDiagnostics([
        requestDiagnostic("Microsoft.Test.Input"),
        requestDiagnostic("Microsoft.Test.Input"),
      ]);
  });

  it("checks the request of every registered PUT", async () => {
    await tester
      .expect(
        t.code`${models}
        model Input { value?: string; }
        @route("/first") @armResourceOperations interface First {
          @put @armResourceCreateOrUpdate(Widget)
          ${t.op("create")}(...ResourceInstanceParameters<Widget>, @bodyRoot body: Input): ArmResponse<Widget>;
        }
        @route("/second") @armResourceOperations interface Second {
          create is ArmResourceCreateOrReplaceSync<Widget>;
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
  });

  it("reports once for duplicate registrations of the same resource operation", async () => {
    await tester
      .expect(
        `${models}
        model Input { value?: string; }
        @armResourceOperations interface Widgets {
          @put @armResourceCreateOrUpdate(Widget) @armResourceCreateOrUpdate(Widget)
          create(...ResourceInstanceParameters<Widget>, @bodyRoot body: Input): ArmResponse<Widget>;
        }
      `,
      )
      .toEmitDiagnostics([requestDiagnostic("Microsoft.Test.Input")]);
  });

  it("accepts a legacy PUT using its canonical resource", async () => {
    await tester
      .expect(
        `${models}
        ${legacyOperations}
        @armResourceOperations interface Widgets {
          create is LegacyOps.CreateOrUpdateAsync<Widget>;
        }
      `,
      )
      .toBeValid();
  });

  it.each([
    "@post @armResourceCreateOrUpdate(Widget) create(...ResourceInstanceParameters<Widget>, @bodyRoot body: Other): ArmResponse<Widget>;",
    "@put @armResourceCreateOrUpdate(Widget) create(...ResourceInstanceParameters<Widget>, @multipartBody body: { part: HttpPart<Other> }): ArmResponse<Widget>;",
  ])("preserves non-PUT and multipart exclusions: %s", async (operation) => {
    await tester
      .expect(`${models} @armResourceOperations interface Widgets { ${operation} }`)
      .toBeValid();
  });

  it("accepts the standard synchronous PUT template", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace Microsoft.Test;
        model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
        @armResourceOperations interface Widgets {
          create is ArmResourceCreateOrReplaceSync<Widget>;
        }
      `,
      )
      .toBeValid();
  });

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

  it("compares the request even without a response body", async () => {
    await tester
      .expect(
        `${models}
          @armResourceOperations interface Widgets {
            @put @armResourceCreateOrUpdate(Widget)
            create(...ResourceInstanceParameters<Widget>, @bodyRoot body: Other): void;
          }
        `,
      )
      .toEmitDiagnostics([requestDiagnostic("Microsoft.Test.Other")]);
  });

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
