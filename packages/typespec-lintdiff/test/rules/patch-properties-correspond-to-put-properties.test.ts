import { resolvePath } from "@typespec/compiler";
import {
  createLinterRuleTester,
  createTester,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { patchPropertiesCorrespondToPutPropertiesRule } from "../../src/rules/patch-properties-correspond-to-put-properties.js";

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

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    patchPropertiesCorrespondToPutPropertiesRule,
    "tsp-lintdiff-local-linter",
  );
});

describe("patch-properties-correspond-to-put-properties", () => {
  it.each(["shared", "distinct"] as const)(
    "deduplicates cross-service findings by property target with %s PATCH models",
    async (models) => {
      const missingNames =
        models === "shared" ? ["extra", "other"] : ["extra", "other", "extra", "other"];
      await tester
        .expect(
          `
          using TypeSpec.Http;

          model PutBody {
            common?: string;
          }
          model FirstPatchBody {
            common?: string;
            extra?: string;
            other?: string;
          }
          model SecondPatchBody {
            common?: string;
            extra?: string;
            other?: string;
          }

          @Azure.ResourceManager.armProviderNamespace
          @service
          namespace Microsoft.FirstService {
            @route("/first/widgets")
            @put op create(@body body: PutBody): void;
            @route("/first/widgets")
            @patch op update(@body body: FirstPatchBody): void;
          }

          @Azure.ResourceManager.armProviderNamespace
          @service
          namespace Microsoft.SecondService {
            @route("/second/widgets")
            @put op create(@body body: PutBody): void;
            @route("/second/widgets")
            @patch op update(@body body: ${models === "shared" ? "FirstPatchBody" : "SecondPatchBody"}): void;
          }
          `,
        )
        .toEmitDiagnostics(
          missingNames.map((propertyName) => ({
            code: "tsp-lintdiff-local-linter/patch-properties-correspond-to-put-properties",
            message: `The property '${propertyName}' in the PATCH body does not correspond to a property in the PUT body.`,
          })),
        );
    },
  );

  it("compares emitted operation bodies instead of same-endpoint overload bodies", async () => {
    await tester
      .expect(
        `
        using TypeSpec.Http;

        @Azure.ResourceManager.armProviderNamespace
        @service
        namespace Microsoft.TestService;

        model PutBody {
          emittedProperty?: string;
        }

        model PatchBody {
          emittedProperty?: string;
        }

        model PutOverloadBody {
          putOverloadOnly?: string;
        }

        model PatchOverloadBody {
          patchOverloadOnly?: string;
        }

        interface Widgets {
          @route("/widgets/{name}")
          @put
          createOrUpdate(@path name: string, @body body: PutBody): void;

          @route("/widgets/{name}")
          @put
          @overload(Widgets.createOrUpdate)
          createOrUpdateOverload(@path name: string, @body body: PutOverloadBody): void;

          @route("/widgets/{name}")
          @patch
          update(@path name: string, @body body: PatchBody): void;

          @route("/widgets/{name}")
          @patch
          @overload(Widgets.update)
          updateOverload(@path name: string, @body body: PatchOverloadBody): void;
        }
      `,
      )
      .toBeValid();
  });

  it("compares body properties in every declared service version", async () => {
    await tester
      .expect(
        `
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @Azure.ResourceManager.armProviderNamespace
        @service
        @versioned(Versions)
        namespace Microsoft.TestService;

        enum Versions {
          v1,
          v2,
        }

        model PutCurrentBody {
          @removed(Versions.v2)
          currentProperty?: string;
        }

        model PatchCurrentBody {
          currentProperty?: string;
        }

        model PutHistoricalBody {
          commonProperty?: string;
        }

        model PatchHistoricalBody {
          commonProperty?: string;

          @removed(Versions.v2)
          historicalProperty?: string;
        }

        interface Widgets {
          @route("/current/{name}")
          @put
          createOrUpdateCurrent(@path name: string, @body body: PutCurrentBody): void;

          @route("/current/{name}")
          @patch
          updateCurrent(@path name: string, @body body: PatchCurrentBody): void;

          @route("/historical/{name}")
          @put
          createOrUpdateHistorical(@path name: string, @body body: PutHistoricalBody): void;

          @route("/historical/{name}")
          @patch
          updateHistorical(@path name: string, @body body: PatchHistoricalBody): void;
        }
      `,
      )
      .toEmitDiagnostics([
        {
          code: "tsp-lintdiff-local-linter/patch-properties-correspond-to-put-properties",
          message:
            "The property 'historicalProperty' in the PATCH body does not correspond to a property in the PUT body.",
        },
        {
          code: "tsp-lintdiff-local-linter/patch-properties-correspond-to-put-properties",
          message:
            "The property 'currentProperty' in the PATCH body does not correspond to a property in the PUT body.",
        },
      ]);
  });

  it.each(["extends", "spread"])("respects %s properties in nested namespaces", async (shape) => {
    await tester
      .expect(
        `
        using TypeSpec.Http;
        using TypeSpec.Versioning;
        @Azure.ResourceManager.armProviderNamespace
        @service @versioned(Versions)
        namespace Microsoft.TestService {
          enum Versions { v1, v2 }
          namespace Nested {
            model Original {
              common?: string;
              @removed(Versions.v2) missing?: string;
            }
            ${shape === "extends" ? "model PutBody extends Original {}" : "model PutBody { ...Original; }"}
            model PatchBody { common?: string; missing?: string; }
            @route("/widgets") @put op put(@body body: PutBody): void;
            @route("/widgets") @patch op patch(@body body: PatchBody): void;
          }
        }
      `,
      )
      .toEmitDiagnostics({
        code: "tsp-lintdiff-local-linter/patch-properties-correspond-to-put-properties",
        message:
          "The property 'missing' in the PATCH body does not correspond to a property in the PUT body.",
      });
  });

  it("resolves dependency versions instead of using service version indices", async () => {
    await tester
      .expect(
        `
        using TypeSpec.Http;
        using TypeSpec.Versioning;
        @versioned(Versions)
        namespace Shared {
          enum Versions { v1, v2, v3 }
          model PutBody {
            common?: string;
            @added(Versions.v2) @removed(Versions.v3) missing?: string;
          }
        }
        @Azure.ResourceManager.armProviderNamespace
        @service @versioned(Versions)
        namespace Microsoft.TestService {
          enum Versions {
            @useDependency(Shared.Versions.v2) first,
            @useDependency(Shared.Versions.v3) current,
          }
          model PatchBody { common?: string; missing?: string; }
          @route("/widgets") @put op put(@body body: Shared.PutBody): void;
          @route("/widgets") @patch op patch(@body body: PatchBody): void;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "tsp-lintdiff-local-linter/patch-properties-correspond-to-put-properties",
        message:
          "The property 'missing' in the PATCH body does not correspond to a property in the PUT body.",
      });
  });

  it.each(["operation", "interface"])(
    "does not pair nonconcurrent %s declarations",
    async (shape) => {
      await tester
        .expect(
          `
        using TypeSpec.Http;
        using TypeSpec.Versioning;
        @Azure.ResourceManager.armProviderNamespace
        @service @versioned(Versions)
        namespace Microsoft.TestService {
          enum Versions { v1, v2 }
          model PutBody { common?: string; }
          model PatchBody { missing?: string; }
          @removed(Versions.v2)
          ${shape === "interface" ? "interface Previous {" : ""}
          @route("/widgets") @put ${shape === "interface" ? "" : "op"} put(@body body: PutBody): void;
          ${shape === "interface" ? "}" : ""}
          @added(Versions.v2)
          @route("/widgets") @patch op patch(@body body: PatchBody): void;
        }
      `,
        )
        .toBeValid();
    },
  );

  it("does not report a mismatch when both properties are added together", async () => {
    await tester
      .expect(
        `
        using TypeSpec.Http;
        using TypeSpec.Versioning;
        @Azure.ResourceManager.armProviderNamespace
        @service @versioned(Versions)
        namespace Microsoft.TestService {
          enum Versions { v1, v2 }
          model PutBody { common?: string; @added(Versions.v2) added?: string; }
          model PatchBody { common?: string; @added(Versions.v2) added?: string; }
          @route("/widgets") @put op put(@body body: PutBody): void;
          @route("/widgets") @patch op patch(@body body: PatchBody): void;
        }
      `,
      )
      .toBeValid();
  });

  it.each(["put", "patch"])("recognizes removed explicit %s body parameters", async (verb) => {
    await tester
      .expect(
        `
        using TypeSpec.Http;
        using TypeSpec.Versioning;
        @Azure.ResourceManager.armProviderNamespace
        @service @versioned(Versions)
        namespace Microsoft.TestService {
          enum Versions { v1, v2 }
          model Body { common?: string; }
          @route("/widgets") @put op put(
            ${verb === "put" ? "@removed(Versions.v2)" : ""} @body body: Body
          ): void;
          @route("/widgets") @patch op patch(
            ${verb === "patch" ? "@removed(Versions.v2)" : ""} @body body: Body
          ): void;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "tsp-lintdiff-local-linter/patch-properties-correspond-to-put-properties",
        message:
          verb === "put"
            ? "A PATCH request body requires the corresponding PUT operation to have a body."
            : "The PATCH operation must have a request body.",
      });
  });
});
