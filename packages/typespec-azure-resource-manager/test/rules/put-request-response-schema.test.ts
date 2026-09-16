import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import { type LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { putRequestResponseSchemaRule } from "../../src/rules/put-request-response-schema.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    putRequestResponseSchemaRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const diagnostic = {
  code: "@azure-tools/typespec-azure-resource-manager/put-request-response-schema",
  severity: "warning" as const,
  message: "PUT request body schema should match the 200 response schema.",
};

const resources = `
  @armProviderNamespace
  namespace Microsoft.Test;
  model WidgetProperties { description?: string; }
  model AlternateProperties { description?: string; extra?: string; }
  model Widget is TrackedResource<WidgetProperties> {
    ...ResourceNameParameter<Widget>;
  }
  model Alternate is TrackedResource<AlternateProperties> {
    ...ResourceNameParameter<Alternate, KeyName = "widgetName", SegmentName = "widgets">;
  }
`;

it.each([
  ["extra: string;", "extra: int32;"],
  ["extra: string;", "extra?: string;"],
  ["extra: string;", ""],
  ["next?: Request; value: string;", "next?: Result; value: int32;"],
])(
  "reports named-property differences despite equal indexers (%s versus %s)",
  async (left, right) => {
    await tester
      .expect(
        `
      model Request is Record<unknown> { ${left} }
      model Result is Record<unknown> { ${right} }
      @put @route("/widgets") op create(@body body: Request): Result;
    `,
      )
      .toEmitDiagnostics(diagnostic);
  },
);

it.each([
  ["", ""],
  ["extra: string;", "extra: string;"],
  ["next?: Request;", "next?: Result;"],
])("accepts equal indexers and named properties (%s)", async (left, right) => {
  await tester
    .expect(
      `
    model Request is Record<unknown> { ${left} }
    model Result is Record<unknown> { ${right} }
    @put @route("/widgets") op create(@body body: Request): Result;
  `,
    )
    .toBeValid();
});

it.each([
  ["Record<string>", "Record<int32>"],
  ["Record<unknown>", "{}"],
  ["{}", "Record<unknown>"],
  ["string[]", "int32[]"],
])("preserves indexer and array mismatches (%s versus %s)", async (left, right) => {
  await tester
    .expect(
      `
    model Request { value: ${left}; }
    model Result { value: ${right}; }
    @put @route("/widgets") op create(@body body: Request): Result;
  `,
    )
    .toEmitDiagnostics(diagnostic);
});

it.each([
  ["string", "int32"],
  ["int32", "int64"],
  ["float32", "int32"],
])("reports same-named scalars with different bases (%s versus %s)", async (left, right) => {
  await tester
    .expect(
      `
    namespace A { scalar Value extends ${left}; }
    namespace B { scalar Value extends ${right}; }
    model Request { value: A.Value; }
    model Result { value: B.Value; }
    @put @route("/widgets") op create(@body body: Request): Result;
  `,
    )
    .toEmitDiagnostics(diagnostic);
});

it.each(["string", "int32"])("accepts same-named scalars with equal bases (%s)", async (base) => {
  await tester
    .expect(
      `
    namespace A { scalar Value extends ${base}; }
    namespace B { scalar Value extends ${base}; }
    model Request { value: A.Value; }
    model Result { value: B.Value; }
    @put @route("/widgets") op create(@body body: Request): Result;
  `,
    )
    .toBeValid();
});

it("compares scalar base chains beyond the immediate base name", async () => {
  await tester
    .expect(
      `
    namespace A { scalar Base extends string; scalar Value extends Base; }
    namespace B { scalar Base extends int32; scalar Value extends Base; }
    model Request { value: A.Value; }
    model Result { value: B.Value; }
    @put @route("/widgets") op create(@body body: Request): Result;
  `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("accepts equivalent independently declared scalar base chains", async () => {
  await tester
    .expect(
      `
    namespace A { scalar Base extends string; scalar Value extends Base; }
    namespace B { scalar Base extends string; scalar Value extends Base; }
    model Request { value: A.Value; }
    model Result { value: B.Value; }
    @put @route("/widgets") op create(@body body: Request): Result;
  `,
    )
    .toBeValid();
});

it("does not equate a shadowing scalar with its namesake standard scalar", async () => {
  await tester
    .expect(
      `
    namespace A { scalar string extends int32; }
    model Request { value: A.string; }
    model Result { value: string; }
    @put @route("/widgets") op create(@body body: Request): Result;
  `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("accepts matching standard ARM create-or-replace templates", async () => {
  await tester
    .expect(
      `${resources}
    @armResourceOperations interface Widgets {
      createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
    }
  `,
    )
    .toBeValid();
});

it("reports a different resource in the 200 response", async () => {
  await tester
    .expect(
      `${resources}
    @armResourceOperations interface Widgets {
      @put @armResourceCreateOrUpdate(Widget)
      createOrUpdate(...ResourceInstanceParameters<Widget>, @bodyRoot body: Widget):
        ArmResponse<Alternate> | ArmCreatedResponse<Alternate> | ErrorResponse;
    }
  `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("reports a different resource in the 201 fallback", async () => {
  await tester
    .expect(
      `${resources}
    @armResourceOperations interface Widgets {
      @put @armResourceCreateOrUpdate(Widget)
      createOrUpdate(...ResourceInstanceParameters<Widget>, @bodyRoot body: Widget):
        ArmCreatedResponse<Alternate> | ErrorResponse;
    }
  `,
    )
    .toEmitDiagnostics({
      ...diagnostic,
      message: "PUT request body schema should match the 201 response schema.",
    });
});

it("reports a request-only mismatch with the canonical resource response", async () => {
  await tester
    .expect(
      `${resources}
    @armResourceOperations interface Widgets {
      @put @armResourceCreateOrUpdate(Widget)
      createOrUpdate(...ResourceInstanceParameters<Widget>, @bodyRoot body: Alternate):
        ArmResponse<Widget> | ArmCreatedResponse<Widget> | ErrorResponse;
    }
  `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("accepts matching resource shapes without OpenAPI extension metadata", async () => {
  await tester
    .expect(
      `${resources}
    @armResourceOperations interface Widgets {
      @put @armResourceCreateOrUpdate(Widget)
      createOrUpdate(...ResourceInstanceParameters<Widget>, @bodyRoot body: Widget):
        ArmResponse<Widget> | ArmCreatedResponse<Widget> | ErrorResponse;
    }
  `,
    )
    .toBeValid();
});

it("accepts equivalent open unions in separate ARM resource models", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace namespace Microsoft.Test;
    union RequestState { string, active: "active", inactive: "inactive" }
    union ResponseState { inactive: "inactive", active: "active", string }
    model RequestProperties { state?: RequestState; }
    model ResponseProperties { state?: ResponseState; }
    model Widget is TrackedResource<ResponseProperties> {
      ...ResourceNameParameter<Widget>;
    }
    model Request is TrackedResource<RequestProperties> {
      ...ResourceNameParameter<Request, KeyName = "widgetName", SegmentName = "widgets">;
    }
    @armResourceOperations interface Widgets {
      @put @armResourceCreateOrUpdate(Widget)
      createOrUpdate(...ResourceInstanceParameters<Widget>, @bodyRoot body: Request):
        ArmResponse<Widget> | ArmCreatedResponse<Widget> | ErrorResponse;
    }
  `,
    )
    .toBeValid();
});

it.each(["", "@body body: void"])("skips an absent request body (%s)", async (parameters) => {
  await tester
    .expect(
      `
    model Widget { description?: string; }
    @put @route("/widgets") op create(${parameters}): Widget;
  `,
    )
    .toBeValid();
});

it.each(["", "namespace Nested {", "@armProviderNamespace namespace Microsoft.Test {"])(
  "reports mismatches in ordinary, nested, and provider namespaces (%s)",
  async (namespace) => {
    await tester
      .expect(
        `
      ${namespace}
      model Request { description?: string; extra?: string; }
      model Result { description?: string; }
      @put @route("/widgets") op /*create*/create(@body body: Request): Result;
      ${namespace ? "}" : ""}
    `,
      )
      .toEmitDiagnostics(({ create }) => ({
        ...diagnostic,
        pos: getSourceLocation(create).pos,
        end: getSourceLocation(create).end,
      }));
  },
);

it.each(["get", "post", "patch", "delete"])("skips %s operations", async (verb) => {
  await tester
    .expect(
      `
    model Request { value: string; }
    model Result { other: int32; }
    @${verb} @route("/widgets") op operation(@body body: Request): Result;
  `,
    )
    .toBeValid();
});

it("does not lint library declarations or uninstantiated templates", async () => {
  await tester
    .expect(
      `
    namespace Azure.Core.TestLibrary {
      @put @route("/core") op create(@body body: string): int32;
    }
    namespace Azure.ResourceManager.TestLibrary {
      @put @route("/arm") op create(@body body: string): int32;
    }
    @put @route("/template") op create<T>(@body body: T): string;
    interface PutOperations<T> {
      @put @route("/interface-template") create(@body body: T): string;
    }
  `,
    )
    .toBeValid();
});

it("checks instantiated operation and interface templates", async () => {
  await tester
    .expect(
      `
    model Request { value: string; }
    model Result { other: int32; }
    @put @route("/operation") op Template<T>(@body body: T): Result;
    op create is Template<Request>;
    interface PutOperations<T> {
      @put @route("/interface") create(@body body: T): Result;
    }
    interface Widgets extends PutOperations<Request> {}
  `,
    )
    .toEmitDiagnostics([diagnostic, diagnostic]);
});

it("prefers 200 over a different 201 response", async () => {
  await tester
    .expect(
      `
    model Request { value: string; }
    @put @route("/widgets") op create(@body body: Request):
      { @statusCode status: 200; @body body: Request; } |
      { @statusCode status: 201; @body body: int32; };
  `,
    )
    .toBeValid();
});

it("reports only the 200 mismatch when 201 matches", async () => {
  await tester
    .expect(
      `
    model Request { value: string; }
    @put @route("/widgets") op create(@body body: Request):
      { @statusCode status: 200; @body body: int32; } |
      { @statusCode status: 201; @body body: Request; };
  `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("skips bodyless 200 without falling back to a 201 body", async () => {
  await tester
    .expect(
      `
    model Request { value: string; }
    @put @route("/widgets") op create(@body body: Request):
      OkResponse | { @statusCode status: 201; @body body: int32; };
  `,
    )
    .toBeValid();
});

it("skips responses without 200 or 201", async () => {
  await tester
    .expect(
      `
    model Request { value: string; }
    @put @route("/widgets") op create(@body body: Request):
      { @statusCode status: 202; @body body: int32; };
  `,
    )
    .toBeValid();
});

it.each([
  ['string, "active", "inactive"', '"inactive", string, "active"'],
  ['string, active: "active"', 'active: "active", string'],
])("accepts separate equivalent open unions (%s)", async (left, right) => {
  await tester
    .expect(
      `
    union RequestState { ${left} }
    union ResponseState { ${right} }
    model Request { state?: RequestState; }
    model Result { state?: ResponseState; }
    @put @route("/widgets") op create(@body body: Request): Result;
  `,
    )
    .toBeValid();
});

it.each([
  ['string, "active"', 'string, "inactive"'],
  ['string, "active"', 'boolean, "active"'],
  ['string, active: "active"', 'string, active: "inactive"'],
  ['string, active: "active"', 'string, other: "active"'],
  ['string, "active"', 'string, "active", "inactive"'],
])("reports different union members (%s versus %s)", async (left, right) => {
  await tester
    .expect(
      `
    union RequestState { ${left} }
    union ResponseState { ${right} }
    model Request { state?: RequestState; }
    model Result { state?: ResponseState; }
    @put @route("/widgets") op create(@body body: Request): Result;
  `,
    )
    .toEmitDiagnostics(diagnostic);
});

it.each([
  ["state", 'state: "state"'],
  ['state: "state"', "state"],
  ["state: 0", "state: 0"],
  ['state: ""', 'state: ""'],
  ['state, inactive: "inactive"', 'inactive: "inactive", state: "state"'],
])("accepts direct enums with equal effective values (%s versus %s)", async (left, right) => {
  await tester
    .expect(
      `
    enum RequestState { ${left} }
    enum ResponseState { ${right} }
    model Request { state: RequestState; }
    model Result { state: ResponseState; }
    @put @route("/widgets") op create(@body body: Request): Result;
  `,
    )
    .toBeValid();
});

it.each([
  ["state", 'state: "active"'],
  ["state: 0", 'state: "0"'],
  ["state: 0", "state: 1"],
  ['state: "state"', 'other: "state"'],
  ["state", "state, other"],
  ['state: ""', "state"],
])("reports genuinely different direct enums (%s versus %s)", async (left, right) => {
  await tester
    .expect(
      `
    enum RequestState { ${left} }
    enum ResponseState { ${right} }
    model Request { state: RequestState; }
    model Result { state: ResponseState; }
    @put @route("/widgets") op /*create*/create(@body body: Request): Result;
  `,
    )
    .toEmitDiagnostics(({ create }) => ({
      ...diagnostic,
      pos: getSourceLocation(create).pos,
      end: getSourceLocation(create).end,
    }));
});

it("accepts models sharing the same enum", async () => {
  await tester
    .expect(
      `
    enum State { state }
    model Request { state: State; }
    model Result { state: State; }
    @put @route("/widgets") op create(@body body: Request): Result;
  `,
    )
    .toBeValid();
});

it("accepts implicit and explicit enum defaults in separate ARM resource models", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace namespace Microsoft.Test;
    enum RequestState { state }
    enum ResponseState { state: "state" }
    model RequestProperties { state?: RequestState; }
    model ResponseProperties { state?: ResponseState; }
    model Widget is TrackedResource<ResponseProperties> {
      ...ResourceNameParameter<Widget>;
    }
    model Request is TrackedResource<RequestProperties> {
      ...ResourceNameParameter<Request, KeyName = "widgetName", SegmentName = "widgets">;
    }
    @armResourceOperations interface Widgets {
      @put @armResourceCreateOrUpdate(Widget)
      createOrUpdate(...ResourceInstanceParameters<Widget>, @bodyRoot body: Request):
        ArmResponse<Widget> | ArmCreatedResponse<Widget> | ErrorResponse;
    }
  `,
    )
    .toBeValid();
});

it.each([
  ["string", "state", 'state: "state"'],
  ["int32", "state: 1", "state: 1"],
])("accepts equal enum-member effective values (%s)", async (base, left, right) => {
  await tester
    .expect(
      `
    enum Left { ${left} }
    enum Right { ${right} }
    union RequestState { ${base}, Left.state }
    union ResponseState { ${base}, Right.state }
    model Request { state: RequestState; }
    model Result { state: ResponseState; }
    @put @route("/widgets") op create(@body body: Request): Result;
  `,
    )
    .toBeValid();
});

it.each([
  ["string", '"active"', '"inactive"'],
  ["int32", "1", "2"],
])("reports different enum-member values (%s)", async (base, left, right) => {
  await tester
    .expect(
      `
    enum Left { state: ${left} }
    enum Right { state: ${right} }
    union RequestState { ${base}, Left.state }
    union ResponseState { ${base}, Right.state }
    model Request { state: RequestState; }
    model Result { state: ResponseState; }
    @put @route("/widgets") op create(@body body: Request): Result;
  `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("matches unnamed variants one-to-one without retaining failed candidates", async () => {
  await tester
    .expect(
      `
    model LeftA { value: string; }
    model LeftB { value: string; }
    model RightA { value: string; }
    model RightB { value: int32; }
    union RequestChoice { LeftA, LeftB }
    union ResponseChoice { RightB, RightA }
    model Request { choice: RequestChoice; }
    model Result { choice: ResponseChoice; }
    @put @route("/widgets") op create(@body body: Request): Result;
  `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("accepts reordered equivalent unnamed model variants", async () => {
  await tester
    .expect(
      `
    model LeftA { value: string; }
    model LeftB { count: int32; }
    model RightA { value: string; }
    model RightB { count: int32; }
    union RequestChoice { LeftA, LeftB }
    union ResponseChoice { RightB, RightA }
    model Request { choice: RequestChoice; }
    model Result { choice: ResponseChoice; }
    @put @route("/widgets") op create(@body body: Request): Result;
  `,
    )
    .toBeValid();
});

it("terminates on equivalent recursive unnamed union members", async () => {
  await tester
    .expect(
      `
    union RequestChoice { string, RequestNode }
    union ResponseChoice { ResponseNode, string }
    model RequestNode { next?: RequestChoice; }
    model ResponseNode { next?: ResponseChoice; }
    model Request { choice: RequestChoice; }
    model Result { choice: ResponseChoice; }
    @put @route("/widgets") op create(@body body: Request): Result;
  `,
    )
    .toBeValid();
});

it("reports extra properties alongside equivalent recursive unions", async () => {
  await tester
    .expect(
      `
    union RequestState { string, active: "active" }
    union ResponseState { string, active: "active" }
    model Request { state: RequestState; next?: Request; }
    model Result { state: ResponseState; next?: Result; extra?: string; }
    @put @route("/widgets") op create(@body body: Request): Result;
  `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("compares inherited properties and array element shapes", async () => {
  await tester
    .expect(
      `
    model LeftBase { value: string; }
    model RightBase { value: string; }
    model Left extends LeftBase { children?: Left[]; }
    model Right extends RightBase { children?: Right[]; }
    @put @route("/widgets") op create(@body body: Left): Right;
  `,
    )
    .toBeValid();
});

it.each([
  ["value: string", "value?: string"],
  ["value: string[]", "value: int32[]"],
  ["value: string", "value: int32"],
])("reports property shape mismatches (%s versus %s)", async (left, right) => {
  await tester
    .expect(
      `
    model Request { ${left}; }
    model Result { ${right}; }
    @put @route("/widgets") op create(@body body: Request): Result;
  `,
    )
    .toEmitDiagnostics(diagnostic);
});
