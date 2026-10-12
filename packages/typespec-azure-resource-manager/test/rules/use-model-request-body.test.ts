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
  message:
    "Request bodies must use plain models. Replace this body type with a model without an indexer.",
};

it("reports primitive request bodies", async () => {
  await tester
    .expect(
      `
      @route("/post") @post op submit(@body body: string): void;
      @route("/put") @put op update(@body body: int32): void;
    `,
    )
    .toEmitDiagnostics([diagnostic, diagnostic]);
});

it("reports non-model request body types", async () => {
  await tester
    .expect(
      `
      scalar OpaqueRequest;

      enum RequestMode {
        fast,
      }

      union RequestChoice {
        first: { first: string },
        second: { second: string },
      }

      @route("/scalar") @post op submitScalar(@body body: OpaqueRequest): void;
      @route("/enum") @post op submitEnum(@body body: RequestMode): void;
      @route("/union") @post op submitUnion(@body body: RequestChoice): void;
      @route("/unknown") @post op submitUnknown(@body body: unknown): void;
      @route("/tuple") @post op submitTuple(@body body: [string, string]): void;
      @route("/literal") @post op submitLiteral(@body body: "fixed"): void;
    `,
    )
    .toEmitDiagnostics(Array.from({ length: 6 }, () => diagnostic));
});

it("reports array and record request bodies", async () => {
  await tester
    .expect(
      `
      model StringList is Array<string>;
      model StringMap is Record<string>;

      @route("/array") @post op submitArray(@body body: string[]): void;
      @route("/named-array") @post op submitNamedArray(@body body: StringList): void;
      @route("/record") @post op submitRecord(@body body: Record<string>): void;
      @route("/named-record") @post op submitNamedRecord(@body body: StringMap): void;
    `,
    )
    .toEmitDiagnostics(Array.from({ length: 4 }, () => diagnostic));
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

it("allows named and inline model request bodies", async () => {
  await tester
    .expect(
      `
      model SubmitRequest {
        value: string;
      }

      @route("/named") @post op submit(@body body: SubmitRequest): void;
      @route("/inline") @post op submitInline(@body body: { value: string }): void;
    `,
    )
    .toBeValid();
});

it("allows a model property that references a model", async () => {
  await tester
    .expect(
      `
      model SubmitRequest {
        value: string;
      }

      model RequestTypes {
        submit: SubmitRequest;
      }

      @post
      op submit(@body body: RequestTypes.submit): void;
    `,
    )
    .toBeValid();
});

it("allows a plain model containing collection properties", async () => {
  await tester
    .expect(
      `
      model SubmitRequest {
        items: string[];
        metadata: Record<string>;
      }

      @post
      op submit(@body body: SubmitRequest): void;
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

it("reports file request bodies", async () => {
  await tester
    .expect(
      `
      model UploadRequest extends TypeSpec.Http.File {
        contentType: "application/octet-stream";
      }

      @post
      op upload(@bodyRoot body: UploadRequest): void;
    `,
    )
    .toEmitDiagnostics(diagnostic);
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
