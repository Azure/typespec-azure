import { Tester } from "#test/tester.js";
import { $minItems, type DecoratorContext, type Model } from "@typespec/compiler";
import {
  createLinterRuleTester,
  expectDiagnostics,
  mockFile,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { putResponseSchemaConsistencyRule } from "../../src/rules/put-response-schema-consistency.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    putResponseSchemaConsistencyRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const diagnostic = {
  code: "@azure-tools/typespec-azure-resource-manager/put-response-schema-consistency",
  severity: "warning" as const,
  message:
    "200 response schema does not match 201 response schema. A PUT API must always return the same response schema for both the 200 and 201 status codes.",
};

const responses = `
  model OkBody<T> { @statusCode statusCode: 200; @body body: T; }
  model CreatedBody<T> { @statusCode statusCode: 201; @body body: T; }
`;

const contentResponses = `
  ${responses}
  model ContentResponse<Status extends int32, Body, ContentType extends string> {
    @statusCode statusCode: Status;
    @header contentType: ContentType;
    @body body: Body;
  }
`;

const arm = `
  @armProviderNamespace
  @service
  namespace Microsoft.TestService;
  ${responses}
`;

const resources = `
  model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
  model WidgetCreated is TrackedResource<{ createdBy?: string }> {
    ...ResourceNameParameter<WidgetCreated>;
  }
`;

it("reports different PUT resource response schemas once on the operation", async () => {
  await tester
    .expect(
      `${arm}
    ${resources}
    @armResourceOperations
    interface Widgets {
      @put @armResourceCreateOrUpdate(Widget)
      createOrUpdate(...ResourceInstanceParameters<Widget>, @bodyRoot body: Widget):
        ArmResponse<Widget> | ArmCreatedResponse<WidgetCreated> | ErrorResponse;
    }
  `,
    )
    .toEmitDiagnostics([{ ...diagnostic, target: "createOrUpdate" }]);
});

it("allows matching PUT resource response schemas", async () => {
  await tester
    .expect(
      `${arm}
    ${resources}
    @armResourceOperations
    interface Widgets {
      @put @armResourceCreateOrUpdate(Widget)
      createOrUpdate(...ResourceInstanceParameters<Widget>, @bodyRoot body: Widget):
        ArmResponse<Widget> | ArmCreatedResponse<Widget> | ErrorResponse;
    }
  `,
    )
    .toBeValid();
});

it("ignores different PUT 200 and 202 schemas", async () => {
  await tester
    .expect(
      `${arm}
    ${resources}
    @put op createOrUpdate(): OkBody<Widget> | {
      @statusCode statusCode: 202; @body body: WidgetCreated;
    };
  `,
    )
    .toBeValid();
});

it("allows a PUT with only a 201 response", async () => {
  await tester
    .expect(
      `${arm}
    ${resources}
    @put op createOrUpdate(): CreatedBody<WidgetCreated>;
  `,
    )
    .toBeValid();
});

it("ignores different POST 200 and 201 schemas", async () => {
  await tester
    .expect(
      `${arm}
    ${resources}
    @post op doAction(): OkBody<Widget> | CreatedBody<WidgetCreated>;
  `,
    )
    .toBeValid();
});

it("allows either exact status to omit its body", async () => {
  await tester
    .expect(
      `${arm}
    model EmptyOk { @statusCode statusCode: 200; }
    model EmptyCreated { @statusCode statusCode: 201; }
    @route("/missing-200") @put op missing200(): EmptyOk | CreatedBody<string>;
    @route("/missing-201") @put op missing201(): OkBody<string> | EmptyCreated;
  `,
    )
    .toBeValid();
});

it("allows identical external common-type references", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace @service
    @armCommonTypesVersion(CommonTypes.Versions.v5)
    namespace Microsoft.TestService;
    ${responses}
    @put op createOrUpdate(): OkBody<CommonTypes.SystemData> | CreatedBody<CommonTypes.SystemData>;
  `,
    )
    .toBeValid();
});

it("allows equal inline schemas and shared scalar enum and union types", async () => {
  await tester
    .expect(
      `${arm}
    scalar CustomString extends string;
    enum State { ready, done }
    union Choice { text: string, count: int32 }
    @route("/anonymous") @put op anonymousModel():
      OkBody<{ value: string }> | CreatedBody<{ value: string }>;
    @route("/string") @put op stringBody(): OkBody<string> | CreatedBody<string>;
    @route("/literal") @put op literalBody(): OkBody<"ready"> | CreatedBody<"ready">;
    @route("/scalar") @put op scalarBody(): OkBody<CustomString> | CreatedBody<CustomString>;
    @route("/enum") @put op enumBody(): OkBody<State> | CreatedBody<State>;
    @route("/union") @put op unionBody(): OkBody<Choice> | CreatedBody<Choice>;
    @route("/array") @put op arrayBody(): OkBody<string[]> | CreatedBody<string[]>;
    @route("/tuple") @put op tupleBody(): OkBody<[string, int32]> | CreatedBody<[string, int32]>;
    @route("/unknown") @put op unknownBody(): OkBody<unknown> | CreatedBody<unknown>;
  `,
    )
    .toBeValid();
});

it("reports inline metadata defaults content types and constrained schema differences", async () => {
  await tester
    .expect(
      `${arm}
    @route("/primitive") @put op primitive(): OkBody<string> | CreatedBody<int32>;
    @route("/metadata") @put op encodedMetadata():
      OkBody<{ @encodedName("application/json", "currentValue") value: string }> |
      CreatedBody<{ @encodedName("application/json", "createdValue") value: string }>;
    @route("/defaults") @put op defaults():
      OkBody<{ value: string = "current" }> | CreatedBody<{ value: string = "created" }>;
    model BinaryOk {
      @statusCode statusCode: 200;
      @header contentType: "application/octet-stream";
      @body body: bytes;
    }
    model JsonOk {
      @statusCode statusCode: 200;
      @header contentType: "application/json";
      @body body: bytes;
    }
    model BinaryCreated {
      @statusCode statusCode: 201;
      @header contentType: "application/octet-stream";
      @body body: bytes;
    }
    model JsonCreated {
      @statusCode statusCode: 201;
      @header contentType: "application/json";
      @body body: bytes;
    }
    @route("/bytes") @put op bytesContent(): BinaryOk | JsonCreated;
    @route("/mixed") @put op mixedContent(): BinaryOk | JsonOk | BinaryCreated;
    @minItems(1) model ConstrainedUnknownArray is Array<unknown>;
    @route("/constrained") @put op constrained():
      OkBody<[string]> | CreatedBody<ConstrainedUnknownArray>;
    namespace Custom { scalar string extends TypeSpec.string; }
    @route("/custom") @put op customString():
      OkBody<TypeSpec.string> | CreatedBody<Custom.string>;
  `,
    )
    .toEmitDiagnostics(
      [
        "primitive",
        "encodedMetadata",
        "defaults",
        "bytesContent",
        "mixedContent",
        "constrained",
        "customString",
      ].map((target) => ({ ...diagnostic, target })),
    );
});

it("allows equivalent binary multipart tuple string and unknown-array schemas", async () => {
  await tester
    .expect(
      `${arm}
    model BinaryOk {
      @statusCode statusCode: 200;
      @header contentType: "application/octet-stream";
      @body body: bytes;
    }
    model BinaryCreated {
      @statusCode statusCode: 201;
      @header contentType: "application/octet-stream";
      @body body: bytes;
    }
    model MultipartOk {
      @statusCode statusCode: 200;
      @multipartBody body: { value: HttpPart<string> };
    }
    model MultipartCreated {
      @statusCode statusCode: 201;
      @multipartBody body: { count: HttpPart<int32> };
    }
    @route("/binary") @put op binaryBody(): BinaryOk | BinaryCreated;
    @route("/multipart") @put op multipartBody(): MultipartOk | MultipartCreated;
    @route("/tuple") @put op tupleBody(): OkBody<[string]> | CreatedBody<[int32, boolean]>;
    @route("/multipart-string") @put op multipartString(): MultipartOk | CreatedBody<string>;
    @route("/tuple-array") @put op tupleArray(): OkBody<[string]> | CreatedBody<unknown[]>;
  `,
    )
    .toBeValid();
});

it("allows shared schemas across multiple content variants", async () => {
  await tester
    .expect(
      `${arm}
    model Payload { value: string; }
    model Response<Status, Content> {
      @statusCode statusCode: Status;
      @header contentType: Content;
      @body body: Payload;
    }
    @put op createOrUpdate():
      Response<200, "application/json"> | Response<200, "application/xml"> |
      Response<201, "application/json"> | Response<201, "application/xml">;
  `,
    )
    .toBeValid();
});

it("checks nested and unannotated operations when the ARM rule is enabled", async () => {
  await tester
    .expect(
      `
    ${responses}
    @service namespace DataPlane {
      @put op dataPlane(): OkBody<string> | CreatedBody<int32>;
    }
    @service @armProviderNamespace namespace Microsoft.Provider {
      namespace Nested {
        interface Widgets {
          @put createOrUpdate(): OkBody<string> | CreatedBody<int32>;
        }
      }
    }
  `,
    )
    .toEmitDiagnostics([
      { ...diagnostic, target: "dataPlane" },
      { ...diagnostic, target: "createOrUpdate" },
    ]);
});

it("ignores Azure library declarations", async () => {
  await tester
    .expect(
      `
    ${responses}
    namespace Azure.Core {
      @put op coreOperation(): OkBody<string> | CreatedBody<int32>;
    }
    namespace Azure.ResourceManager {
      @put op armOperation(): OkBody<string> | CreatedBody<int32>;
    }
  `,
    )
    .toBeValid();
});

it("compares nested anonymous properties independent of order", async () => {
  await tester
    .expect(
      `${arm}
    @put op createOrUpdate():
      OkBody<{ first?: { value: string }; second: int32 }> |
      CreatedBody<{ second: int32; first?: { value: string } }>;
  `,
    )
    .toBeValid();
});

it("reports anonymous property count name optionality and nested type differences", async () => {
  await tester
    .expect(
      `${arm}
    @route("/count") @put op count():
      OkBody<{ value: string }> | CreatedBody<{ value: string; extra: int32 }>;
    @route("/name") @put op name():
      OkBody<{ value: string }> | CreatedBody<{ other: string }>;
    @route("/optional") @put op optional():
      OkBody<{ value: string }> | CreatedBody<{ value?: string }>;
    @route("/nested") @put op nested():
      OkBody<{ inner: { value: string } }> | CreatedBody<{ inner: { value: int32 } }>;
    @route("/record") @put op recordBody():
      OkBody<Record<string>> | CreatedBody<Record<int32>>;
  `,
    )
    .toEmitDiagnostics(
      ["count", "name", "optional", "nested", "recordBody"].map((target) => ({
        ...diagnostic,
        target,
      })),
    );
});

it("does not equate distinct named schemas with identical properties", async () => {
  await tester
    .expect(
      `${arm}
    model Original { value: string; }
    model Copy is Original;
    model Derived extends Original {}
    @route("/copy") @put op copy(): OkBody<Original> | CreatedBody<Copy>;
    @route("/inherited") @put op inherited(): OkBody<Original> | CreatedBody<Derived>;
  `,
    )
    .toEmitDiagnostics(["copy", "inherited"].map((target) => ({ ...diagnostic, target })));
});

it("allows a PUT with only a 200 response", async () => {
  await tester.expect(`${arm} @put op createOrUpdate(): OkBody<string>;`).toBeValid();
});

it("reports a versioned operation only once without emitter projections", async () => {
  await tester
    .expect(
      `
    @service @armProviderNamespace @versioned(Versions)
    namespace Microsoft.Provider;
    enum Versions { v1, v2 }
    ${responses}
    @put op createOrUpdate(): OkBody<string> | CreatedBody<int32>;
  `,
    )
    .toEmitDiagnostics([{ ...diagnostic, target: "createOrUpdate" }]);
});

it("checks concrete template uses without reporting the template declaration", async () => {
  await tester
    .expect(
      `${arm}
    @put op Template<T>(): OkBody<string> | CreatedBody<T>;
    @route("/same") op same is Template<string>;
    @route("/different") op different is Template<int32>;
  `,
    )
    .toEmitDiagnostics([{ ...diagnostic, target: "different" }]);
});

it("ignores unused operation and interface template declarations", async () => {
  await tester
    .expect(
      `${arm}
    @put op Template<T>(): OkBody<string> | CreatedBody<int32>;
    interface Templates<T> {
      @put put(): OkBody<string> | CreatedBody<int32>;
    }
  `,
    )
    .toBeValid();
});

it("checks concrete interface aliases of operation templates", async () => {
  await tester
    .expect(
      `${arm}
    @put op Template<T>(): OkBody<string> | CreatedBody<T>;
    interface Widgets {
      @route("/same") same is Template<string>;
      @route("/different") different is Template<int32>;
    }
  `,
    )
    .toEmitDiagnostics([{ ...diagnostic, target: "different" }]);
});

it("checks inherited concrete interface operations without duplicate template diagnostics", async () => {
  await tester
    .expect(
      `${arm}
    interface Templates<T> {
      @put put(): OkBody<string> | CreatedBody<T>;
    }
    @route("/same") interface Same extends Templates<string> {}
    @route("/different") interface Different extends Templates<int32> {}
  `,
    )
    .toEmitDiagnostics([{ ...diagnostic, target: "put" }]);
});

it("reports each concrete alias of a shared violating template instance", async () => {
  await tester
    .expect(
      `${arm}
    @put op Template<T>(): OkBody<string> | CreatedBody<T>;
    @route("/first") op first is Template<int32>;
    @route("/second") op second is Template<int32>;
  `,
    )
    .toEmitDiagnostics([
      { ...diagnostic, target: "first" },
      { ...diagnostic, target: "second" },
    ]);
});

it("checks aliases of operations on instantiated interfaces", async () => {
  await tester
    .expect(
      `${arm}
    interface Templates<T> {
      @put put(): OkBody<string> | CreatedBody<T>;
    }
    alias Same = Templates<string>;
    alias Different = Templates<int32>;
    @route("/same") op same is Same.put;
    @route("/different") op different is Different.put;
  `,
    )
    .toEmitDiagnostics([{ ...diagnostic, target: "different" }]);
});

it("normalizes explicit Array unknown and reversed tuple response schemas", async () => {
  await tester
    .expect(
      `${arm}
    @route("/explicit") @put op explicitArray():
      OkBody<[string]> | CreatedBody<Array<unknown>>;
    @route("/reversed") @put op reversedArray():
      OkBody<unknown[]> | CreatedBody<[int32, boolean]>;
  `,
    )
    .toBeValid();
});

it("keeps named constrained friendly-named and typed arrays distinct from tuples", async () => {
  await tester
    .expect(
      `${arm}
    model Named is Array<unknown>;
    @minItems(1) model Constrained<T> is Array<unknown>;
    @friendlyName("Items") model Friendly<T> is Array<T>;
    @route("/named") @put op named(): OkBody<[string]> | CreatedBody<Named>;
    @route("/constrained") @put op constrained():
      OkBody<[string]> | CreatedBody<Constrained<unknown>>;
    @route("/friendly") @put op friendly():
      OkBody<[string]> | CreatedBody<Friendly<unknown>>;
    @route("/typed") @put op typed(): OkBody<[string]> | CreatedBody<string[]>;
  `,
    )
    .toEmitDiagnostics(
      ["named", "constrained", "friendly", "typed"].map((target) => ({ ...diagnostic, target })),
    );
});

it("does not mistake a custom indexerDecorator function for the compiler intrinsic", async () => {
  const runner = await Tester.files({
    "decorators.js": mockFile.js({
      $decorators: {
        Custom: {
          indexer: function indexerDecorator(context: DecoratorContext, target: Model) {
            $minItems(context, target, 1);
          },
        },
      },
    }),
  })
    .import("./decorators.js")
    .createInstance();
  const customTester = createLinterRuleTester(
    runner,
    putResponseSchemaConsistencyRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
  await customTester
    .expect(
      `
    namespace Custom { extern dec indexer(target: TypeSpec.Reflection.Model); }
    ${responses}
    @Custom.indexer model Items<T> is Array<T>;
    @put op createOrUpdate(): OkBody<[string]> | CreatedBody<Items<unknown>>;
  `,
    )
    .toEmitDiagnostics([{ ...diagnostic, target: "createOrUpdate" }]);
});

it("preserves equality for the same constrained array type", async () => {
  await tester
    .expect(
      `${arm}
    @minItems(1) model Items<T> is Array<unknown>;
    @put op createOrUpdate(): OkBody<Items<unknown>> | CreatedBody<Items<unknown>>;
  `,
    )
    .toBeValid();
});

it("ignores conflicting body types at either exact status in either order", async () => {
  for (const [status, otherStatus] of [
    [200, 201],
    [201, 200],
  ]) {
    for (const variants of ["Json | Xml", "Xml | Json"]) {
      await tester
        .expect(
          `
          ${contentResponses}
          model Json is ContentResponse<${status}, string, "application/json">;
          model Xml is ContentResponse<${status}, int32, "application/xml">;
          model Other is ContentResponse<${otherStatus}, string, "application/json">;
          @put op createOrUpdate(): ${variants} | Other;
        `,
        )
        .toBeValid();
    }
  }
});

it("does not merge distinct anonymous body variants with equal properties", async () => {
  await tester
    .expect(
      `
      ${contentResponses}
      model Json is ContentResponse<200, { value: string }, "application/json">;
      model Xml is ContentResponse<200, { value: string }, "application/xml">;
      @put op createOrUpdate(): Json | Xml | CreatedBody<int32>;
    `,
    )
    .toBeValid();
});

it("allows shared body types across reordered content variants", async () => {
  for (const variants of ["Json | Xml", "Xml | Json"]) {
    await tester
      .expect(
        `
        ${contentResponses}
        model Payload { value: string; }
        model Json is ContentResponse<200, Payload, "application/json">;
        model Xml is ContentResponse<200, Payload, "application/xml">;
        @put op createOrUpdate(): ${variants} | CreatedBody<Payload>;
      `,
      )
      .toBeValid();
  }
});

it("reports schema differences across valid reordered response groups", async () => {
  for (const variants of ["Json | Xml", "Xml | Json"]) {
    await tester
      .expect(
        `
        ${contentResponses}
        model Payload { value: string; }
        model Other { value: int32; }
        model Json is ContentResponse<200, Payload, "application/json">;
        model Xml is ContentResponse<200, Payload, "application/xml">;
        @put op createOrUpdate(): ${variants} | CreatedBody<Other>;
      `,
      )
      .toEmitDiagnostics([{ ...diagnostic, target: "createOrUpdate" }]);
  }
});

it("aggregates JSON and binary variants at either status regardless of order", async () => {
  for (const [status, otherStatus] of [
    [200, 201],
    [201, 200],
  ]) {
    for (const variants of ["Json | Binary", "Binary | Json"]) {
      await tester
        .expect(
          `
          ${contentResponses}
          model Json is ContentResponse<${status}, bytes, "application/json">;
          model Binary is ContentResponse<${status}, bytes, "application/octet-stream">;
          model Other is ContentResponse<${otherStatus}, bytes, "application/octet-stream">;
          @put op createOrUpdate(): ${variants} | Other;
        `,
        )
        .toEmitDiagnostics([{ ...diagnostic, target: "createOrUpdate" }]);
    }
  }
});

it("does not treat bodyless variants as conflicting body types", async () => {
  for (const variants of ["Empty | OkBody<string>", "OkBody<string> | Empty"]) {
    await tester
      .expect(
        `
        ${responses}
        model Empty { @statusCode statusCode: 200; }
        @put op createOrUpdate(): ${variants} | CreatedBody<int32>;
      `,
      )
      .toEmitDiagnostics([{ ...diagnostic, target: "createOrUpdate" }]);
  }
});

it("supports suppression with the fully qualified diagnostic code", async () => {
  const options = {
    compilerOptions: {
      linterRuleSet: {
        enable: {
          "@azure-tools/typespec-azure-resource-manager/put-response-schema-consistency": true,
        },
      },
    },
  };
  const code = `
    ${responses}
    @put op createOrUpdate(): OkBody<string> | CreatedBody<int32>;
  `;
  expectDiagnostics(await Tester.diagnose(code, options), [diagnostic]);
  await Tester.compile(
    `
      ${responses}
      #suppress "@azure-tools/typespec-azure-resource-manager/put-response-schema-consistency" "Existing API contract."
      @put op createOrUpdate(): OkBody<string> | CreatedBody<int32>;
    `,
    options,
  );
});
