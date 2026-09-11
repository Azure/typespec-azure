import { getSourceLocation, type Program } from "@typespec/compiler";
import {
  createLinterRuleTester,
  type DiagnosticMatch,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { consistentPatchPropertiesRule } from "../../src/rules/consistent-patch-properties.js";
import { Tester } from "../tester.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    consistentPatchPropertiesRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

function invalid(propertyName: string): DiagnosticMatch {
  return {
    code: "@azure-tools/typespec-azure-resource-manager/consistent-patch-properties",
    severity: "warning",
    message: `The property '${propertyName}' in the request body either does not appear in the resource model or is nested at the wrong level.`,
  };
}

function targetLocation(program: Program, typeName: string) {
  const [target] = program.resolveTypeReference(typeName);
  if (target === undefined) {
    throw new Error(`Missing expected diagnostic target: ${typeName}`);
  }
  const { file, pos, end } = getSourceLocation(target);
  return { file: file.path, pos, end };
}

function service(code: string) {
  return `
    @service namespace TestService;
    ${code}
  `;
}

function armPatch(models: string, response = "ArmResponse<Widget>") {
  return `
    @armProviderNamespace
    @service namespace Microsoft.TestService;

    model Widget is ProxyResource<WidgetProperties> {
      ...ResourceNameParameter<Widget>;
    }
    ${models}

    @armResourceOperations
    interface Widgets {
      read is ArmResourceRead<Widget>;
      @patch
      @armResourceUpdate(Widget)
      update(...ResourceInstanceParameters<Widget>, @body body: WidgetPatchBody):
        ${response} | ErrorResponse;
    }
  `;
}

describe("native fixture contracts", () => {
  it("reports displayName moved out of properties in an ARM resource PATCH", async () => {
    await tester
      .expect(
        armPatch(`
          model WidgetProperties { description?: string; displayName?: string; }
          model WidgetPatchBody { displayName?: string; }
        `),
      )
      .toEmitDiagnostics(invalid("displayName"));
  });

  it("reports the nested extraPatchOnly property in an ARM resource PATCH", async () => {
    await tester
      .expect(
        armPatch(`
          model WidgetProperties { description?: string; }
          model WidgetPatchBody {
            properties?: { description?: string; extraPatchOnly?: string; };
          }
        `),
      )
      .toEmitDiagnostics(invalid("properties.extraPatchOnly"));
  });

  it("reports displayName at the wrong level in an unregistered custom PATCH", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace
        @service namespace Microsoft.TestService;
        model Widget is ProxyResource<{ displayName?: string }> {
          ...ResourceNameParameter<Widget>;
        }
        model WidgetPatchBody { displayName?: string; }
        interface CustomWidgetOperations {
          @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}")
          @patch
          update(...ResourceInstanceParameters<Widget>, @body body: WidgetPatchBody):
            ArmResponse<Widget> | ErrorResponse;
        }
      `,
      )
      .toEmitDiagnostics(invalid("displayName"));
  });

  it("uses a PATCH 201 resource response to report a moved displayName", async () => {
    await tester
      .expect(
        service(`
          model Widget { properties: { displayName?: string }; }
          model CreatedWidgetResponse { @statusCode statusCode: 201; @body body: Widget; }
          @route("/widgets") @patch
          op update(@body body: { displayName?: string }): CreatedWidgetResponse;
        `),
      )
      .toEmitDiagnostics(invalid("displayName"));
  });

  it("uses a same-path GET 201 fallback to report a moved displayName", async () => {
    await tester
      .expect(
        service(`
          model Widget { properties: { displayName?: string }; }
          model CreatedWidgetResponse { @statusCode statusCode: 201; @body body: Widget; }
          model AcceptedWidgetResponse { @statusCode statusCode: 202; }
          @route("/widgets") @get op read(): CreatedWidgetResponse;
          @route("/widgets") @patch
          op update(@body body: { displayName?: string }): AcceptedWidgetResponse;
        `),
      )
      .toEmitDiagnostics(invalid("displayName"));
  });

  it("selects a scalar PATCH 200 before a matching PATCH 201 model", async () => {
    await tester
      .expect(
        service(`
          model Widget { properties: { displayName?: string }; }
          model ScalarOkResponse { @statusCode statusCode: 200; @body body: string; }
          model CreatedWidgetResponse { @statusCode statusCode: 201; @body body: Widget; }
          @route("/widgets") @patch
          op update(@body body: { properties?: { displayName?: string } }):
            ScalarOkResponse | CreatedWidgetResponse;
        `),
      )
      .toEmitDiagnostics(invalid("properties"));
  });

  it("matches different authored property names by their JSON wireName", async () => {
    await tester
      .expect(
        armPatch(`
          model WidgetProperties {
            @encodedName("application/json", "wireName") resourceSourceName?: string;
          }
          model WidgetPatchBody { properties?: WidgetPatchProperties; }
          model WidgetPatchProperties {
            @encodedName("application/json", "wireName") patchSourceName?: string;
          }
        `),
      )
      .toBeValid();
  });

  it("reports properties.child.displayName inside mismatched nullable objects", async () => {
    await tester
      .expect(
        armPatch(`
          model WidgetProperties { child?: { description?: string } | null; }
          model WidgetPatchBody {
            properties?: { child?: { displayName?: string } | null };
          }
        `),
      )
      .toEmitDiagnostics(invalid("properties.child.displayName"));
  });

  it("accepts matching nullable child objects", async () => {
    await tester
      .expect(
        armPatch(`
          model Child { displayName?: string; }
          model WidgetProperties { child?: Child | null; }
          model WidgetPatchBody { properties?: { child?: Child | null }; }
        `),
      )
      .toBeValid();
  });

  it("accepts a same-named array PATCH property against a scalar resource property", async () => {
    await tester
      .expect(
        armPatch(`
          model WidgetProperties { values?: string; }
          model WidgetPatchBody { properties?: { values?: string[] }; }
        `),
      )
      .toBeValid();
  });

  // The four scope fixtures intentionally differ from AutoRest output. Their native
  // properties/operations remain present, so test those declarations directly without
  // loading TCGC, @scope, or an emitter/scope adapter.
  it("checks the native clientOnly property from the scoped-property fixture", async () => {
    await tester
      .expect(
        armPatch(`
          model WidgetProperties { displayName?: string; }
          model WidgetPatchBody { properties?: { clientOnly?: string }; }
        `),
      )
      .toEmitDiagnostics(invalid("properties.clientOnly"));
  });

  it("uses the native GET fallback from the scoped-get-fallback fixture", async () => {
    await tester
      .expect(
        service(`
          model Widget { properties: { displayName?: string }; }
          model AcceptedWidgetResponse { @statusCode statusCode: 202; }
          @route("/widgets") @get op read(): Widget;
          @route("/widgets") @patch
          op update(@body body: { displayName?: string }): AcceptedWidgetResponse;
        `),
      )
      .toEmitDiagnostics(invalid("displayName"));
  });

  it("checks the native PATCH endpoint from the scoped-patch-operation fixture", async () => {
    await tester
      .expect(
        service(`
          model Widget { name?: string; }
          model WidgetUpdate { extra?: string; }
          @route("/widgets") @get op read(): Widget;
          @route("/widgets") @patch op update(@body body: WidgetUpdate): Widget;
        `),
      )
      .toEmitDiagnostics(invalid("extra"));
  });

  it("accepts the native description property from the scoped-response-property fixture", async () => {
    await tester
      .expect(
        service(`
          model Widget { name?: string; description?: string; }
          @route("/widgets") @patch
          op update(@body body: { description?: string }): Widget;
        `),
      )
      .toBeValid();
  });

  it("reports a synthesized properties.details.kind discriminator on its model", async () => {
    await tester
      .expect(
        armPatch(`
          model WidgetProperties { details?: {}; }
          @discriminator("kind") model PatchDetails {}
          model WidgetPatchBody { properties?: { details?: PatchDetails }; }
        `),
      )
      .toEmitDiagnostics(({ program }) => ({
        ...invalid("properties.details.kind"),
        ...targetLocation(program, "Microsoft.TestService.PatchDetails"),
      }));
  });

  it("compares an encoded authored discriminator instead of a synthesized kind", async () => {
    await tester
      .expect(
        armPatch(`
          model WidgetProperties { details?: { kind?: string }; }
          model NestedPatch { extra?: string; }
          @discriminator("kind")
          model PatchDetails {
            @encodedName("application/json", "kind")
            discriminatorPayload?: NestedPatch;
          }
          model WidgetPatchBody { properties?: { details?: PatchDetails }; }
        `),
      )
      .toEmitDiagnostics(({ program }) => ({
        ...invalid("properties.details.kind.extra"),
        ...targetLocation(program, "Microsoft.TestService.NestedPatch.extra"),
      }));
  });

  it("accepts a same-level properties.description subset", async () => {
    await tester
      .expect(
        armPatch(`
          model WidgetProperties {
            description?: string;
            displayName?: string;
            @visibility(Lifecycle.Read) provisioningState?: ResourceProvisioningState;
          }
          model WidgetPatchBody { properties?: { description?: string }; }
        `),
      )
      .toBeValid();
  });

  it("accepts an async PATCH 202 body using the same-path ARM GET resource", async () => {
    await tester
      .expect(
        armPatch(
          `
            model WidgetProperties { description?: string; displayName?: string; }
            model WidgetPatchBody { properties?: { displayName?: string }; }
            model Accepted202WithLocation {
              @statusCode statusCode: 202;
              @header("Location") location?: string;
              @header("Retry-After") retryAfter?: int32;
            }
          `,
          "Accepted202WithLocation",
        ),
      )
      .toBeValid();
  });
});

describe("authored properties take precedence over synthesized discriminators", () => {
  function encodedDetails(inherited: boolean) {
    return `
      model Payload { extra?: string; }
      ${
        inherited
          ? `
            model Base { @encodedName("application/json", "kind") payload?: Payload; }
            model Middle extends Base {}
            @discriminator("kind") model Details extends Middle {}
          `
          : `
            @discriminator("kind") model Details {
              @encodedName("application/json", "kind") payload?: Payload;
            }
          `
      }
    `;
  }

  async function expectEncodedPatchProperty(inherited: boolean) {
    await tester
      .expect(
        service(`
          ${encodedDetails(inherited)}
          @route("/widgets") @patch
          op update(@body body: { details?: Details }): { details?: { kind?: string } };
        `),
      )
      .toEmitDiagnostics(({ program }) => ({
        ...invalid("details.kind.extra"),
        ...targetLocation(program, "TestService.Payload.extra"),
      }));
  }

  async function expectEncodedResponseProperty(inherited: boolean) {
    await tester
      .expect(
        service(`
          ${encodedDetails(inherited)}
          @route("/widgets") @patch
          op update(@body body: { details?: { kind?: { extra?: string } } }):
            { details?: Details };
        `),
      )
      .toBeValid();
  }

  it("checks the nested shape of an inline encoded PATCH property", async () => {
    await expectEncodedPatchProperty(false);
  });

  // Emitted derived scalar discriminators can override inherited allOf objects.
  // These inherited cases deliberately assert the native authored shape instead.
  it("checks the nested shape of an inherited encoded PATCH property", async () => {
    await expectEncodedPatchProperty(true);
  });

  it("uses the nested shape of an inline encoded response property", async () => {
    await expectEncodedResponseProperty(false);
  });

  it("uses the nested shape of an inherited encoded response property", async () => {
    await expectEncodedResponseProperty(true);
  });

  it("does not synthesize a second discriminator for an inherited authored name encoded differently", async () => {
    await tester
      .expect(
        service(`
          model Base { @encodedName("application/json", "wireKind") kind?: string; }
          @discriminator("kind") model Details extends Base {}
          @route("/widgets") @patch op update(@body body: Details): { wireKind?: string };
        `),
      )
      .toBeValid();
  });

  it("still reports a synthesized discriminator with no authored property", async () => {
    await tester
      .expect(
        service(`
          model Base { name?: string; }
          @discriminator("kind") model Details extends Base {}
          @route("/widgets") @patch op update(@body body: Details): { name?: string };
        `),
      )
      .toEmitDiagnostics(({ program }) => ({
        ...invalid("kind"),
        ...targetLocation(program, "TestService.Details"),
      }));
  });

  it("preserves a derived never override when synthesizing a discriminator", async () => {
    await tester
      .expect(
        service(`
          model Base {
            @encodedName("application/json", "kind") payload?: { extra?: string };
          }
          @discriminator("kind") model Details extends Base { payload?: never; }
          @route("/widgets") @patch op update(@body body: Details): { kind?: string };
        `),
      )
      .toBeValid();
  });
});

describe("inherited property overrides", () => {
  // Native never overrides hide base properties even when emitted allOf references
  // retain them. These tests intentionally assert the native contract without an emitter.
  it("ignores a never override in a top-level PATCH model", async () => {
    await tester
      .expect(
        service(`
          model Base { extra?: string; name?: string; }
          model WithoutExtra extends Base { extra?: never; }
          model Update extends WithoutExtra {}
          model Resource { name?: string; }
          @route("/widgets") @patch op update(@body body: Update): Resource;
        `),
      )
      .toBeValid();
  });

  it("ignores a never override in a nested PATCH model", async () => {
    await tester
      .expect(
        service(`
          model Base { extra?: string; name?: string; }
          model WithoutExtra extends Base { extra?: never; }
          model Update extends WithoutExtra {}
          model Resource { name?: string; }
          @route("/widgets") @patch
          op update(@body body: { properties?: Update }): { properties?: Resource };
        `),
      )
      .toBeValid();
  });

  it("reports a property removed by never in a top-level resource model", async () => {
    await tester
      .expect(
        service(`
          model Base { extra?: string; name?: string; }
          model WithoutExtra extends Base { extra?: never; }
          model Resource extends WithoutExtra {}
          model Update { extra?: string; }
          @route("/widgets") @patch op update(@body body: Update): Resource;
        `),
      )
      .toEmitDiagnostics(({ program }) => ({
        ...invalid("extra"),
        ...targetLocation(program, "TestService.Update.extra"),
      }));
  });

  it("reports a property removed by never in a nested resource model", async () => {
    await tester
      .expect(
        service(`
          model Base { extra?: string; name?: string; }
          model WithoutExtra extends Base { extra?: never; }
          model Resource extends WithoutExtra {}
          model Update { extra?: string; }
          @route("/widgets") @patch
          op update(@body body: { properties?: Update }): { properties?: Resource };
        `),
      )
      .toEmitDiagnostics(({ program }) => ({
        ...invalid("properties.extra"),
        ...targetLocation(program, "TestService.Update.extra"),
      }));
  });

  it("shadows an inherited property by source name before resolving its encoded name", async () => {
    await tester
      .expect(
        service(`
          model Base { @encodedName("application/json", "oldName") extra?: string; }
          model Update extends Base {
            @encodedName("application/json", "newName") extra?: never;
          }
          @route("/widgets") @patch op update(@body body: Update): { name?: string };
        `),
      )
      .toBeValid();
  });

  it("does not let a never property hide a differently named inherited payload property", async () => {
    await tester
      .expect(
        service(`
          model Base { @encodedName("application/json", "wireName") present?: string; }
          model Update extends Base {
            @encodedName("application/json", "wireName") removed?: never;
          }
          @route("/widgets") @patch op update(@body body: Update): { name?: string };
        `),
      )
      .toEmitDiagnostics(({ program }) => ({
        ...invalid("wireName"),
        ...targetLocation(program, "TestService.Base.present"),
      }));
  });

  it("uses a redeclared property's encoded name rather than its base declaration", async () => {
    await tester
      .expect(
        service(`
          model Base { @encodedName("application/json", "oldName") value?: string; }
          model Update extends Base {
            @encodedName("application/json", "newName") value?: string;
          }
          @route("/widgets") @patch op update(@body body: Update): { newName?: string };
        `),
      )
      .toBeValid();
  });
});

describe("response selection", () => {
  async function expectRangeResponse(verb: "patch" | "get", start: number) {
    await tester
      .expect(
        service(`
          model RangeResponse {
            @minValue(${start}) @maxValue(299) @statusCode statusCode: int32;
            @body body: { name?: string };
          }
          model AcceptedWidgetResponse { @statusCode statusCode: 202; }
          ${verb === "get" ? '@route("/widgets") @get op read(): RangeResponse;' : ""}
          @route("/widgets") @patch
          op update(@body body: { extra?: string }):
            ${verb === "patch" ? "RangeResponse" : "AcceptedWidgetResponse"};
        `),
      )
      .toEmitDiagnostics(invalid("extra"));
  }

  it("uses a PATCH response range containing 200", async () => {
    await expectRangeResponse("patch", 200);
  });

  it("uses a PATCH response range starting at 201", async () => {
    await expectRangeResponse("patch", 201);
  });

  it("uses a GET fallback response range containing 200", async () => {
    await expectRangeResponse("get", 200);
  });

  it("uses a GET fallback response range starting at 201", async () => {
    await expectRangeResponse("get", 201);
  });

  async function expectExactResponse(verb: "patch" | "get", status: number) {
    await tester
      .expect(
        service(`
          model RangeResponse {
            @minValue(${status}) @maxValue(299) @statusCode statusCode: int32;
            @body body: { extra?: string };
          }
          model ExactResponse {
            @statusCode statusCode: ${status};
            @body body: { name?: string };
          }
          model AcceptedWidgetResponse { @statusCode statusCode: 202; }
          ${
            verb === "get"
              ? '@route("/widgets") @get op read(): RangeResponse | ExactResponse;'
              : ""
          }
          @route("/widgets") @patch
          op update(@body body: { extra?: string }):
            ${verb === "patch" ? "RangeResponse | ExactResponse" : "AcceptedWidgetResponse"};
        `),
      )
      .toEmitDiagnostics(invalid("extra"));
  }

  it("prefers an exact PATCH 200 over an overlapping range", async () => {
    await expectExactResponse("patch", 200);
  });

  it("prefers an exact PATCH 201 over an overlapping range", async () => {
    await expectExactResponse("patch", 201);
  });

  it("prefers an exact GET 200 over an overlapping fallback range", async () => {
    await expectExactResponse("get", 200);
  });

  it("prefers an exact GET 201 over an overlapping fallback range", async () => {
    await expectExactResponse("get", 201);
  });

  it("prefers PATCH 200 over PATCH 201 and both GET success responses", async () => {
    await tester
      .expect(
        service(`
          model PatchOk { @statusCode statusCode: 200; @body body: { name?: string }; }
          model MatchingCreated {
            @statusCode statusCode: 201; @body body: { extra?: string };
          }
          model MatchingOk { @statusCode statusCode: 200; @body body: { extra?: string }; }
          @route("/widgets") @get op read(): MatchingOk | MatchingCreated;
          @route("/widgets") @patch
          op update(@body body: { extra?: string }): MatchingCreated | PatchOk;
        `),
      )
      .toEmitDiagnostics(invalid("extra"));
  });

  it("prefers PATCH 201 over GET 200 and GET 201", async () => {
    await tester
      .expect(
        service(`
          model PatchCreated { @statusCode statusCode: 201; @body body: { name?: string }; }
          model GetOk { @statusCode statusCode: 200; @body body: { extra?: string }; }
          model GetCreated { @statusCode statusCode: 201; @body body: { extra?: string }; }
          @route("/widgets") @get op read(): GetOk | GetCreated;
          @route("/widgets") @patch op update(@body body: { extra?: string }): PatchCreated;
        `),
      )
      .toEmitDiagnostics(invalid("extra"));
  });

  it("prefers GET 200 over GET 201 when PATCH has no comparison response", async () => {
    await tester
      .expect(
        service(`
          model GetOk { @statusCode statusCode: 200; @body body: { name?: string }; }
          model GetCreated { @statusCode statusCode: 201; @body body: { extra?: string }; }
          model AcceptedWidgetResponse { @statusCode statusCode: 202; }
          @route("/widgets") @get op read(): GetCreated | GetOk;
          @route("/widgets") @patch
          op update(@body body: { extra?: string }): AcceptedWidgetResponse;
        `),
      )
      .toEmitDiagnostics(invalid("extra"));
  });

  it("falls through a bodyless PATCH 200 to PATCH 201", async () => {
    await tester
      .expect(
        service(`
          model EmptyOk { @statusCode statusCode: 200; }
          model CreatedWidgetResponse {
            @statusCode statusCode: 201; @body body: { name?: string };
          }
          @route("/widgets") @patch
          op update(@body body: { extra?: string }): EmptyOk | CreatedWidgetResponse;
        `),
      )
      .toEmitDiagnostics(invalid("extra"));
  });

  it("does not replace a bodyless exact 200 with its overlapping range", async () => {
    await tester
      .expect(
        service(`
          model EmptyOk { @statusCode statusCode: 200; }
          model RangeResponse {
            @minValue(200) @maxValue(299) @statusCode statusCode: int32;
            @body body: { extra?: string };
          }
          model CreatedWidgetResponse {
            @statusCode statusCode: 201; @body body: { name?: string };
          }
          @route("/widgets") @patch
          op update(@body body: { extra?: string }):
            RangeResponse | EmptyOk | CreatedWidgetResponse;
        `),
      )
      .toEmitDiagnostics(invalid("extra"));
  });

  it("skips PATCH operations with no request body", async () => {
    await tester
      .expect(service('@route("/widgets") @patch op update(): { name?: string };'))
      .toBeValid();
  });

  it("skips PATCH operations with no comparison response body", async () => {
    await tester
      .expect(
        service(`
          model EmptyOk { @statusCode statusCode: 200; }
          model EmptyCreated { @statusCode statusCode: 201; }
          @route("/widgets") @get op read(): EmptyOk | EmptyCreated;
          @route("/widgets") @patch
          op update(@body body: { extra?: string }): EmptyOk | EmptyCreated;
        `),
      )
      .toBeValid();
  });

  it("does not use a GET resource from a different path", async () => {
    await tester
      .expect(
        service(`
          model AcceptedWidgetResponse { @statusCode statusCode: 202; }
          @route("/other-widgets") @get op read(): { name?: string };
          @route("/widgets") @patch
          op update(@body body: { extra?: string }): AcceptedWidgetResponse;
        `),
      )
      .toBeValid();
  });
});

describe("native property shapes", () => {
  it("reports JSON-encoded paths while targeting the authored nested property", async () => {
    await tester
      .expect(
        service(`
          model Resource { wireParent?: {}; }
          model PatchChild {
            @encodedName("application/json", "wireExtra") sourceExtra?: string;
          }
          model Update {
            @encodedName("application/json", "wireParent")
            sourceParent?: PatchChild;
          }
          @patch op update(@body body: Update): Resource;
        `),
      )
      .toEmitDiagnostics(({ program }) => ({
        ...invalid("wireParent.wireExtra"),
        ...targetLocation(program, "TestService.PatchChild.sourceExtra"),
      }));
  });

  it("accepts matching inherited JSON properties and ignores never properties", async () => {
    await tester
      .expect(
        service(`
          model ResourceBase {
            @encodedName("application/json", "wireName") resourceName?: string;
          }
          model Resource extends ResourceBase {}
          model UpdateBase {
            @encodedName("application/json", "wireName") updateName?: string;
          }
          model Update extends UpdateBase { ignored?: never; }
          @patch op update(@body body: Update): Resource;
        `),
      )
      .toBeValid();
  });

  it("reports a missing inherited property on its base declaration", async () => {
    await tester
      .expect(
        service(`
          model UpdateBase { extra?: string; }
          model Update extends UpdateBase {}
          @patch op update(@body body: Update): { name?: string };
        `),
      )
      .toEmitDiagnostics(({ program }) => ({
        ...invalid("extra"),
        ...targetLocation(program, "TestService.UpdateBase.extra"),
      }));
  });

  it("accepts matching synthesized discriminators on inherited model shapes", async () => {
    await tester
      .expect(
        service(`
          model ResourceBase { name?: string; }
          @discriminator("kind") model Resource extends ResourceBase {}
          model UpdateBase { name?: string; }
          @discriminator("kind") model Update extends UpdateBase {}
          @patch op update(@body body: Update): Resource;
        `),
      )
      .toBeValid();
  });

  async function expectSameNamedProperty(shape: string) {
    await tester
      .expect(
        service(`
          @patch op update(@body body: { values?: ${shape} }): { values?: string };
        `),
      )
      .toBeValid();
  }

  it("accepts same-named records without comparing indexer values", async () => {
    await expectSameNamedProperty("Record<{ extra?: string }>");
  });

  it("accepts same-named empty objects against scalars", async () => {
    await expectSameNamedProperty("{}");
  });

  it("accepts same-named scalars without comparing scalar types", async () => {
    await expectSameNamedProperty("int32");
  });

  async function expectBodyWithoutNamedProperties(shape: string) {
    await tester
      .expect(service(`@patch op update(@body body: ${shape}): { name?: string };`))
      .toBeValid();
  }

  it("accepts an array request body with no named properties", async () => {
    await expectBodyWithoutNamedProperties("string[]");
  });

  it("accepts a record request body with no named properties", async () => {
    await expectBodyWithoutNamedProperties("Record<string>");
  });

  it("accepts an empty-object request body with no named properties", async () => {
    await expectBodyWithoutNamedProperties("{}");
  });

  it("skips a scalar request body", async () => {
    await expectBodyWithoutNamedProperties("string");
  });

  it("reports missing array record scalar and empty-object properties as leaves", async () => {
    await tester
      .expect(
        service(`
          model Update {
            arrayValue?: string[];
            recordValue?: Record<string>;
            scalarValue?: string;
            emptyValue?: {};
          }
          @patch op update(@body body: Update):
            { @statusCode statusCode: 200; @body body: {}; };
        `),
      )
      .toEmitDiagnostics([
        invalid("arrayValue"),
        invalid("recordValue"),
        invalid("scalarValue"),
        invalid("emptyValue"),
      ]);
  });

  it("reports only top-level PATCH properties against a scalar response", async () => {
    await tester
      .expect(
        service(`
          @patch op update(@body body: { first?: { nested?: string }; second?: string }): string;
        `),
      )
      .toEmitDiagnostics([invalid("first"), invalid("second")]);
  });

  it("reports nested object leaves against a same-named scalar property", async () => {
    await tester
      .expect(
        service(`
          @patch op update(@body body: { child?: { first?: string; second?: string } }):
            { child?: string };
        `),
      )
      .toEmitDiagnostics([invalid("child.first"), invalid("child.second")]);
  });
});

describe("recursive comparisons", () => {
  it("terminates matching recursive model pairs without diagnostics", async () => {
    await tester
      .expect(
        service(`
          model Resource { name?: string; next?: Resource; }
          model Update { name?: string; next?: Update; }
          @patch op update(@body body: Update): Resource;
        `),
      )
      .toBeValid();
  });

  it("terminates recursive model pairs and reports exactly one extra path", async () => {
    await tester
      .expect(
        service(`
          model Resource { next?: Resource; }
          model Update { next?: Update; extra?: string; }
          @patch op update(@body body: Update): Resource;
        `),
      )
      .toEmitDiagnostics([invalid("extra")]);
  });

  it("terminates a missing recursive subtree with exactly two leaf paths", async () => {
    await tester
      .expect(
        service(`
          model Branch { value?: string; next?: Branch; }
          @patch op update(@body body: { missing?: Branch }):
            { @statusCode statusCode: 200; @body body: {}; };
        `),
      )
      .toEmitDiagnostics([invalid("missing.value"), invalid("missing.next")]);
  });

  it("terminates an object-to-scalar recursive subtree with exactly two paths", async () => {
    await tester
      .expect(
        service(`
          model Branch { value?: string; next?: Branch; }
          @patch op update(@body body: { child?: Branch }): { child?: string };
        `),
      )
      .toEmitDiagnostics([invalid("child.value"), invalid("child.next")]);
  });

  it("does not deduplicate the same property target across sibling model pairs", async () => {
    await tester
      .expect(
        service(`
          model ResourceChild { next?: ResourceChild; }
          model UpdateChild { next?: UpdateChild; extra?: string; }
          @patch op update(@body body: { left?: UpdateChild; right?: UpdateChild }):
            { left?: ResourceChild; right?: ResourceChild };
        `),
      )
      .toEmitDiagnostics(({ program }) => [
        {
          ...invalid("left.extra"),
          ...targetLocation(program, "TestService.UpdateChild.extra"),
        },
        {
          ...invalid("right.extra"),
          ...targetLocation(program, "TestService.UpdateChild.extra"),
        },
      ]);
  });

  it("does not deduplicate the same property target across PATCH operations", async () => {
    await tester
      .expect(
        service(`
          model Resource { name?: string; }
          model Update { extra?: string; }
          @route("/first") @patch op first(@body body: Update): Resource;
          @route("/second") @patch op second(@body body: Update): Resource;
        `),
      )
      .toEmitDiagnostics(({ program }) => [
        { ...invalid("extra"), ...targetLocation(program, "TestService.Update.extra") },
        { ...invalid("extra"), ...targetLocation(program, "TestService.Update.extra") },
      ]);
  });

  it("collects every missing subtree sibling path for a shared leaf model", async () => {
    await tester
      .expect(
        service(`
          model Leaf { extra?: string; }
          @patch op update(@body body: { missing?: { left?: Leaf; right?: Leaf } }):
            { @statusCode statusCode: 200; @body body: {}; };
        `),
      )
      .toEmitDiagnostics([invalid("missing.left.extra"), invalid("missing.right.extra")]);
  });
});

describe("applicability", () => {
  it("checks PATCH in an ordinary service namespace without provider metadata", async () => {
    await tester
      .expect(
        `
        @service namespace Ordinary;
        @route("/widgets") @patch op update(@body body: { extra?: string }): { name?: string };
      `,
      )
      .toEmitDiagnostics(invalid("extra"));
  });

  it("checks PATCH in a nested service namespace without provider metadata", async () => {
    await tester
      .expect(
        service(`
          namespace Nested {
            @route("/widgets") @patch
            op update(@body body: { extra?: string }): { name?: string };
          }
        `),
      )
      .toEmitDiagnostics(invalid("extra"));
  });

  it("ignores non-PATCH operations with mismatched request bodies", async () => {
    await tester
      .expect(
        service(`
          @route("/put") @put op replace(@body body: { extra?: string }): { name?: string };
          @route("/post") @post op create(@body body: { extra?: string }): { name?: string };
        `),
      )
      .toBeValid();
  });

  async function expectInternalOperation(namespace: string) {
    await tester
      .expect(
        `
        @service namespace ${namespace} {
          @route("/widgets") @patch
          op update(@body body: { extra?: string }): { name?: string };
        }
      `,
      )
      .toBeValid();
  }

  it("ignores internal TypeSpec library PATCH operations", async () => {
    await expectInternalOperation("TypeSpec.TestLibrary");
  });

  it("ignores internal Azure.Core library PATCH operations", async () => {
    await expectInternalOperation("Azure.Core.TestLibrary");
  });

  it("ignores internal Azure.ResourceManager library PATCH operations", async () => {
    await expectInternalOperation("Azure.ResourceManager.TestLibrary");
  });

  it("ignores uninstantiated operation and interface templates", async () => {
    await tester
      .expect(
        service(`
          @route("/operation-template") @patch
          op update<T>(@body body: { extra?: T }): { name?: string };
          @route("/interface-template")
          interface Updates<T> {
            @patch update(@body body: { extra?: T }): { name?: string };
          }
        `),
      )
      .toBeValid();
  });

  it("checks an instantiated PATCH operation template", async () => {
    await tester
      .expect(
        service(`
          @route("/widgets") @patch
          op updateTemplate<T>(@body body: { extra?: T }): { name?: string };
          op update is updateTemplate<string>;
        `),
      )
      .toEmitDiagnostics(invalid("extra"));
  });
});
