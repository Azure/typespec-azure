import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { useModelRequestBodyRule } from "../../src/rules/use-model-request-body.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner: TesterInstance = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    useModelRequestBodyRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const diagnostic = {
  code: "@azure-tools/typespec-azure-resource-manager/use-model-request-body",
  message: "Request bodies must use models. Replace this non-model body type with a model.",
};

it("reports a primitive POST request body", async () => {
  await tester
    .expect(
      `
      @post
      op submit(@body body: string): void;
    `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("reports a primitive PUT request body", async () => {
  await tester
    .expect(
      `
      @put
      op update(@body body: string): void;
    `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("reports a string enum union request body", async () => {
  await tester
    .expect(
      `
      union ActionMode {
        "fast",
        "safe",
      }

      @post
      op submit(@body body: ActionMode): void;
    `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("reports a named array model used by an ARM action", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @service(#{ title: "Test service" })
      @versioned(Versions)
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
      namespace Microsoft.Test;

      enum Versions {
        @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
        v2024_01_01: "2024-01-01",
      }

      model StringList is Array<string>;

      model Widget is TrackedResource<WidgetProperties> {
        ...ResourceNameParameter<
          Resource = Widget,
          KeyName = "widgetName",
          SegmentName = "widgets",
          NamePattern = ""
        >;
      }

      model WidgetProperties {
        @visibility(Lifecycle.Read)
        provisioningState?: ResourceProvisioningState;
      }

      interface Operations extends Azure.ResourceManager.Operations {}

      @armResourceOperations
      interface Widgets {
        get is ArmResourceRead<Widget>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        update is ArmResourcePatchAsync<Widget, WidgetProperties>;
        delete is ArmResourceDeleteWithoutOkAsync<Widget>;
        listByResourceGroup is ArmResourceListByParent<Widget>;

        @action("submitItems")
        submitItems is ArmResourceActionSync<Widget, StringList, ArmResponse<Widget>>;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("allows a named object request body", async () => {
  await tester
    .expect(
      `
      model SubmitRequest {
        value: string;
      }

      @post
      op submit(@body body: SubmitRequest): void;
    `,
    )
    .toBeValid();
});

it("allows an inline object request body", async () => {
  await tester
    .expect(
      `
      @post
      op submit(@body body: { value: string }): void;
    `,
    )
    .toBeValid();
});

it("allows a nullable object request body", async () => {
  await tester
    .expect(
      `
      model SubmitRequest {
        value: string;
      }

      @post
      op submit(@body body: SubmitRequest | null): void;
    `,
    )
    .toBeValid();
});

it("allows a singleton object union request body", async () => {
  await tester
    .expect(
      `
      model SubmitRequest {
        value: string;
      }

      union SubmitRequestUnion {
        SubmitRequest,
      }

      @post
      op submit(@body body: SubmitRequestUnion): void;
    `,
    )
    .toBeValid();
});

it("allows a nullable unknown request body", async () => {
  await tester
    .expect(
      `
      @post
      op submit(@body body: unknown | null): void;
    `,
    )
    .toBeValid();
});

it("allows an unsupported model union request body", async () => {
  await tester
    .expect(
      `
      model FirstRequest {
        first: string;
      }

      model SecondRequest {
        second: string;
      }

      union RequestUnion {
        FirstRequest,
        SecondRequest,
      }

      @post
      op submit(@body body: RequestUnion): void;
    `,
    )
    .toBeValid();
});

it("allows an ARM action with a synthetic void request body", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @service(#{ title: "Test service" })
      @versioned(Versions)
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v6)
      namespace Microsoft.Test;

      enum Versions {
        @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
        v2024_01_01: "2024-01-01",
      }

      model Widget is TrackedResource<WidgetProperties> {
        ...ResourceNameParameter<
          Resource = Widget,
          KeyName = "widgetName",
          SegmentName = "widgets",
          NamePattern = ""
        >;
      }

      model WidgetProperties {
        @visibility(Lifecycle.Read)
        provisioningState?: ResourceProvisioningState;
      }

      interface Operations extends Azure.ResourceManager.Operations {}

      @armResourceOperations
      interface Widgets {
        get is ArmResourceRead<Widget>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        update is ArmResourcePatchAsync<Widget, WidgetProperties>;
        delete is ArmResourceDeleteWithoutOkAsync<Widget>;
        listByResourceGroup is ArmResourceListByParent<Widget>;

        @action("run")
        run is ArmResourceActionSync<Widget, void, ArmResponse<Widget>>;
      }
    `,
    )
    .toBeValid();
});

it("allows an unknown request body", async () => {
  await tester
    .expect(
      `
      @post
      op run(@body body: unknown): void;
    `,
    )
    .toBeValid();
});

it("reports request bodies with every directly emitted non-object schema type", async () => {
  await tester
    .expect(
      `
      scalar StringRequest extends string;

      enum RequestMode {
        fast: "fast",
      }

      union RequestChoice {
        fast: "fast",
      }

      @route("/scalar") @post op submitScalar(@body body: StringRequest): void;
      @route("/enum") @post op submitEnum(@body body: RequestMode): void;
      @route("/enum-member") @post op submitEnumMember(@body body: RequestMode.fast): void;
      @route("/union-variant") @post op submitUnionVariant(@body body: RequestChoice.fast): void;
      @route("/tuple") @post op submitTuple(@body body: [string, string]): void;
      @route("/literal") @post op submitLiteral(@body body: "fixed"): void;
      @route("/string-template") @post op submitStringTemplate(@body body: "prefix-\${string}"): void;
      @route("/binary") @post op submitBinaryBytes(
        @header contentType: "application/octet-stream",
        @body body: bytes,
      ): void;
    `,
    )
    .toEmitDiagnostics(Array.from({ length: 8 }, () => diagnostic));
});

it("reports a file body used by an ARM action", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @service(#{ title: "Test service" })
      @versioned(Versions)
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v6)
      namespace Microsoft.Test;

      enum Versions {
        @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
        v2024_01_01: "2024-01-01",
      }

      model UploadRequest extends TypeSpec.Http.File {}

      model Widget is TrackedResource<WidgetProperties> {
        ...ResourceNameParameter<
          Resource = Widget,
          KeyName = "widgetName",
          SegmentName = "widgets",
          NamePattern = ""
        >;
      }

      model WidgetProperties {
        @visibility(Lifecycle.Read)
        provisioningState?: ResourceProvisioningState;
      }

      interface Operations extends Azure.ResourceManager.Operations {}

      @armResourceOperations
      interface Widgets {
        get is ArmResourceRead<Widget>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        delete is ArmResourceDeleteWithoutOkAsync<Widget>;

        @post
        @armResourceAction(Widget)
        upload(
          ...ResourceInstanceParameters<Widget>,
          @body body: UploadRequest,
        ): ArmResponse<Widget> | ErrorResponse;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("reports scalar and inline-property encodings that emit a schema type", async () => {
  await tester
    .expect(
      `
      @encode("custom", int32)
      scalar EncodedRequest;

      @encode("", int32)
      scalar EmptyEncodedIntegerRequest;

      @encode("unsupported", string)
      scalar UnsupportedEncodedRequest;

      model InlineEncodedWire {
        @encode("custom", int32)
        payload: {
          value: string;
        };

        @encode("custom", int32)
        templatePayload: TemplatePayload<string>;
      }

      model TemplatePayload<T> {
        value: T;
      }

      @route("/encoded") @post op submitEncodedScalar(@body body: EncodedRequest): void;
      @route("/empty-integer") @post op submitEmptyEncodedInteger(@body body: EmptyEncodedIntegerRequest): void;
      @route("/unsupported") @post op submitUnsupportedEncoding(@body body: UnsupportedEncodedRequest): void;
      @route("/inline") @post op submitInlineEncodedProperty(@body body: InlineEncodedWire.payload): void;
      @route("/template") @post op submitInlineTemplateEncodedProperty(
        @body body: InlineEncodedWire.templatePayload,
      ): void;
    `,
    )
    .toEmitDiagnostics(Array.from({ length: 5 }, () => diagnostic));
});

it("reports typed nested encodings and ignores untyped replacements", async () => {
  await tester
    .expect(
      `
      @encode("custom", int32)
      scalar NestedWire;

      @encode("", NestedWire)
      scalar NestedEncodedRequest;

      scalar UntypedWire;

      @encode("unsupported", UntypedWire)
      scalar UnsupportedWire;

      @encode("", UnsupportedWire)
      scalar UnsupportedNestedEncodingRequest extends string;

      @secret
      scalar SecretWire;

      @encode("", SecretWire)
      scalar DateTimeSecretEncodedRequest extends utcDateTime;

      @route("/nested") @post op submitNestedEncoding(@body body: NestedEncodedRequest): void;
      @route("/unsupported-nested") @post op submitUnsupportedNestedEncoding(
        @body body: UnsupportedNestedEncodingRequest,
      ): void;
      @route("/date-time") @post op submitDateTimeSecretEncoding(
        @body body: DateTimeSecretEncodedRequest,
      ): void;
    `,
    )
    .toEmitDiagnostics(Array.from({ length: 2 }, () => diagnostic));
});

it("allows schema-less scalar, enum, and encoded scalar request bodies", async () => {
  await tester
    .expect(
      `
      scalar OpaqueRequest;
      enum EmptyRequest {}

      scalar UntypedWire;

      @encode("unsupported", UntypedWire)
      scalar BasedEncodedAsUntypedRequest extends string;

      @encode("", string)
      scalar EmptyEncodedRequest;

      @secret
      scalar SecretWire;

      @encode("", SecretWire)
      scalar SecretEncodedRequest extends string;

      @route("/opaque") @post op submitOpaque(@body body: OpaqueRequest): void;
      @route("/empty-enum") @post op submitEmptyEnum(@body body: EmptyRequest): void;
      @route("/untyped") @post op submitUntypedReplacement(@body body: BasedEncodedAsUntypedRequest): void;
      @route("/empty-encoding") @post op submitEmptyEncoding(@body body: EmptyEncodedRequest): void;
      @route("/secret") @post op submitSecretEncoding(@body body: SecretEncodedRequest): void;
    `,
    )
    .toBeValid();
});

it("follows referenced schemas and inline untyped property-encoding replacements", async () => {
  await tester
    .expect(
      `
      scalar PropertyRequest;

      @friendlyName("FriendlyTemplatePayload")
      model FriendlyTemplatePayload<T> {
        value: T;
      }

      enum RequestMode {
        automatic: "Automatic",
        manual: "Manual",
      }

      union RequestKind {
        standard: "Standard",
        premium: "Premium",
      }

      model EncodedWire {
        @encode("custom", int32)
        payload: PropertyRequest;

        @encode("custom", int32)
        choice: ObjectChoice;

        @encode("custom", int32)
        friendlyTemplatePayload: FriendlyTemplatePayload<string>;

        @encode("custom", PropertyRequest)
        inlinePrimitive: string;

        @encode("custom", PropertyRequest)
        defaultedEnum: RequestMode = RequestMode.automatic;

        @encode("custom", PropertyRequest)
        defaultedUnion: RequestKind = RequestKind.standard;

        @Azure.ResourceManager.CommonTypes.Private.inlineAzureType
        @encode("custom", PropertyRequest)
        inlineAzureScalar: Azure.Core.azureLocation;
      }

      union ObjectChoice {
        value: {
          value: string,
        },
      }

      @route("/encoded") @post op submitEncodedProperty(@body body: EncodedWire.payload): void;
      @route("/nullable") @post op submitNullableEncodedProperty(@body body: EncodedWire.payload | null): void;
      @route("/union") @post op submitNamedUnionEncodedProperty(@body body: EncodedWire.choice): void;
      @route("/friendly") @post op submitFriendlyTemplateEncodedProperty(
        @body body: EncodedWire.friendlyTemplatePayload,
      ): void;
      @route("/inline") @post op submitInlineUntypedEncodedProperty(
        @body body: EncodedWire.inlinePrimitive,
      ): void;
      @route("/defaulted-enum") @post op submitDefaultedEnumEncodedProperty(
        @body body: EncodedWire.defaultedEnum,
      ): void;
      @route("/defaulted-union") @post op submitDefaultedUnionEncodedProperty(
        @body body: EncodedWire.defaultedUnion,
      ): void;
      @route("/azure-scalar") @post op submitInlineAzureScalarEncodedProperty(
        @body body: EncodedWire.inlineAzureScalar,
      ): void;
    `,
    )
    .toBeValid();
});

it("allows multipart request bodies", async () => {
  await tester
    .expect(
      `
      model UploadForm {
        name: HttpPart<string>;
        contents: HttpPart<bytes>;
      }

      @post op upload(
        @header contentType: "multipart/form-data",
        @multipartBody body: UploadForm,
      ): void;
    `,
    )
    .toBeValid();
});
