import { resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { describe, it, vi } from "vitest";
import { patchInOperationNameRule } from "../../src/rules/patch-in-operation-name.js";

vi.mock("@azure-tools/typespec-autorest", () => {
  throw new Error("Native lint must not load the AutoRest emitter.");
});
vi.mock("@azure-tools/typespec-client-generator-core", () => {
  throw new Error("ARM lint must not load TCGC.");
});

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
}).importLibraries();

const header = `
  using TypeSpec.Http;
  using TypeSpec.Rest;
  using Azure.ResourceManager;
  @armProviderNamespace @service
  @armCommonTypesVersion(CommonTypes.Versions.v5)
  namespace Arm;
`;

async function tester() {
  return createLinterRuleTester(
    await Tester.createInstance(),
    patchInOperationNameRule,
    "tsp-lintdiff-local-linter",
  );
}

function diagnostic(name: string) {
  return {
    code: "tsp-lintdiff-local-linter/patch-in-operation-name",
    message: `ARM PATCH operation '${name}' should start with 'update'.`,
  };
}

describe("patch-in-operation-name", () => {
  it.each(["patch", "modify", "create", "patch_Update"])("rejects PATCH name %s", async (name) => {
    await (
      await tester()
    )
      .expect(`${header} @patch @route("/item") op ${name}(): string;`)
      .toEmitDiagnostics([diagnostic(name)]);
  });

  it.each(["update", "updateWidget", "UpdateTags"])("accepts update prefix %s", async (name) => {
    await (
      await tester()
    )
      .expect(`${header} @patch @route("/item") op ${name}(): string;`)
      .toBeValid();
  });

  it.each([200, 201, 202, 204])("checks PATCH names for response %s", async (status) => {
    await (
      await tester()
    )
      .expect(`${header} @patch @route("/item") op modify(): { @statusCode code: ${status}; };`)
      .toEmitDiagnostics([diagnostic("modify")]);
  });

  it("ignores non-PATCH verbs", async () => {
    await (
      await tester()
    )
      .expect(`${header} @get @route("/item") op modify(): string;`)
      .toBeValid();
  });

  it("does not let an interface name mask the operation prefix", async () => {
    await (
      await tester()
    )
      .expect(`${header} @route("/item") interface UpdateWidgets { @patch op modify(): string; }`)
      .toEmitDiagnostics([diagnostic("modify")]);
  });

  it("limits the mixed runner to ARM services, including endpoints in nested namespaces", async () => {
    await (
      await tester()
    )
      .expect(
        `
        using TypeSpec.Http;
        using Azure.ResourceManager;
        @service namespace DataPlane { @patch @route("/data") op modifyData(): string; }
        @service @armProviderNamespace
        @armCommonTypesVersion(CommonTypes.Versions.v5)
        namespace Arm {
          namespace Nested { @patch @route("/arm") op modifyArm(): string; }
        }
      `,
      )
      .toEmitDiagnostics([diagnostic("modifyArm")]);
  });

  it.each(["modify", "update"])("validates the documented ARM template name %s", async (name) => {
    const expectation = (await tester()).expect(`
      ${header}
      model Widget is TrackedResource<WidgetProperties> {
        @key("widgetName") @segment("widgets") name: string;
      }
      model WidgetProperties { provisioningState?: ResourceProvisioningState; }
      @armResourceOperations interface Widgets {
        ${name} is ArmResourcePatchSync<Widget, Properties = WidgetProperties>;
      }
    `);
    if (name === "modify") {
      await expectation.toEmitDiagnostics([diagnostic(name)]);
    } else {
      await expectation.toBeValid();
    }
  });
});
