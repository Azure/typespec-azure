import { Tester } from "#test/tester.js";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { patchPropertiesCorrespondToPutRule } from "../../src/rules/patch-properties-correspond-to-put.js";

const code = "@azure-tools/typespec-azure-resource-manager/patch-properties-correspond-to-put";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    patchPropertiesCorrespondToPutRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

describe("patch-properties-correspond-to-put", () => {
  it.each(["shared", "distinct"] as const)(
    "deduplicates cross-service findings by property target with %s PATCH models",
    async (models) => {
      const missingNames =
        models === "shared" ? ["extra", "other"] : ["extra", "other", "extra", "other"];
      await tester
        .expect(
          `
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

          @service namespace FirstService {
            @route("/first/widgets") @put op create(@body body: PutBody): void;
            @route("/first/widgets") @patch op update(@body body: FirstPatchBody): void;
          }

          @service namespace SecondService {
            @route("/second/widgets") @put op create(@body body: PutBody): void;
            @route("/second/widgets")
            @patch op update(@body body: ${models === "shared" ? "FirstPatchBody" : "SecondPatchBody"}): void;
          }
          `,
        )
        .toEmitDiagnostics(missingNames.map(missingProperty));
    },
  );

  it("reports a nested PATCH leaf absent from PUT without provider metadata", async () => {
    await tester
      .expect(
        bodyPair(`
        model PutBody { properties?: { common?: string; }; }
        model PatchBody { properties?: { common?: string; missing?: string; }; }
      `),
      )
      .toEmitDiagnostics(missingProperty("missing"));
  });

  it("compares operations in nested namespaces without provider metadata", async () => {
    await tester
      .expect(
        `
        @service namespace Test {
          namespace Nested {
            model PutBody { common?: string; }
            model PatchBody { common?: string; missing?: string; }
            @route("/widgets") @put op put(@body body: PutBody): void;
            @route("/widgets") @patch op patch(@body body: PatchBody): void;
          }
        }
      `,
      )
      .toEmitDiagnostics(missingProperty("missing"));
  });

  it("reports different JSON names for the same authored property", async () => {
    await tester
      .expect(
        bodyPair(`
        model PutBody { @encodedName("application/json", "putName") name?: string; }
        model PatchBody { @encodedName("application/json", "patchName") name?: string; }
      `),
      )
      .toEmitDiagnostics(missingProperty("patchName"));
  });

  it("retains inherited-only nested wrappers as leaves", async () => {
    await tester
      .expect(
        bodyPair(`
        model Shared { value?: string; }
        model PutWrapper extends Shared {}
        model PatchWrapper extends Shared {}
        model PutBody { putWrapper?: PutWrapper; }
        model PatchBody { patchWrapper?: PatchWrapper; }
      `),
      )
      .toEmitDiagnostics(missingProperty("patchWrapper"));
  });

  it("requires a PATCH request body", async () => {
    await tester
      .expect(
        `
        @service namespace Test;
        @route("/widgets") @put op put(@body body: { common?: string; }): void;
        @route("/widgets") @patch op patch(): void;
      `,
      )
      .toEmitDiagnostics({ code, message: "The PATCH operation must have a request body." });
  });

  it("treats a void PATCH body as missing", async () => {
    await tester
      .expect(
        bodyPair(`
        model PutBody { common?: string; }
        alias PatchBody = void;
      `),
      )
      .toEmitDiagnostics({ code, message: "The PATCH operation must have a request body." });
  });

  it("rejects a PATCH body with no properties", async () => {
    await tester
      .expect(
        bodyPair(`
        model PutBody { common?: string; }
        model PatchBody {}
      `),
      )
      .toEmitDiagnostics({
        code,
        message: "The PATCH request body must contain at least one property.",
      });
  });

  it("requires a PUT body when PATCH has a body", async () => {
    await tester
      .expect(
        `
        @service namespace Test;
        @route("/widgets") @put op put(): void;
        @route("/widgets") @patch op patch(@body body: { common?: string; }): void;
      `,
      )
      .toEmitDiagnostics({
        code,
        message: "A PATCH request body requires the corresponding PUT operation to have a body.",
      });
  });

  it("reports a synthesized PATCH discriminator absent from PUT", async () => {
    await tester
      .expect(
        bodyPair(`
        model PutBody { name?: string; }
        @discriminator("kind") model PatchBody { name?: string; }
        model ConcretePatch extends PatchBody { kind: "concrete"; }
      `),
      )
      .toEmitDiagnostics(missingProperty("kind"));
  });

  it("reports an inherited synthesized PATCH discriminator", async () => {
    await tester
      .expect(
        bodyPair(`
        model PutBody { name?: string; }
        @discriminator("kind") model Base { name?: string; }
        model PatchBody extends Base {}
        model ConcretePatch extends PatchBody { kind: "concrete"; }
      `),
      )
      .toEmitDiagnostics(missingProperty("kind"));
  });

  it("accepts a PATCH subset of PUT", async () => {
    await tester
      .expect(
        bodyPair(`
        model PutBody { name?: string; extra?: string; }
        model PatchBody { name?: string; }
      `),
      )
      .toBeValid();
  });

  it("accepts matching leaf names at different nesting levels", async () => {
    await tester
      .expect(
        bodyPair(`
        model PutBody { properties?: { name?: string; }; }
        model PatchBody { name?: string; }
      `),
      )
      .toBeValid();
  });

  it("accepts different authored names with the same JSON name", async () => {
    await tester
      .expect(
        bodyPair(`
        model PutBody { @encodedName("application/json", "shared") putName?: string; }
        model PatchBody { @encodedName("application/json", "shared") patchName?: string; }
      `),
      )
      .toBeValid();
  });

  it("ignores documentation differences on matching properties", async () => {
    await tester
      .expect(
        bodyPair(`
        model PutBody { @doc("Create the name.") name?: string; }
        model PatchBody { @doc("Update the name.") name?: string; }
      `),
      )
      .toBeValid();
  });

  it("accepts matching synthesized discriminators", async () => {
    await tester
      .expect(
        bodyPair(`
        @discriminator("kind") model PutBody { name?: string; }
        model ConcretePut extends PutBody { kind: "concrete"; }
        @discriminator("kind") model PatchBody { name?: string; }
        model ConcretePatch extends PatchBody { kind: "concrete"; }
      `),
      )
      .toBeValid();
  });

  it("accepts matching scalar and array leaves", async () => {
    await tester
      .expect(
        bodyPair(`
        model PutBody { name?: string; count?: int32; items?: string[]; }
        model PatchBody { name?: string; count?: int32; items?: string[]; }
      `),
      )
      .toBeValid();
  });

  it("preserves fallback behavior for non-ARM payload shapes", async () => {
    await tester
      .expect(
        bodyPair(`
        model First { first?: string; }
        model Second { second?: string; }
        union Choice { First, Second }
        model PutBody {
          dictionary?: Record<string>;
          choice?: Choice;
          nullable?: First | null;
          empty?: {};
        }
        model PatchBody {
          dictionary?: Record<string>;
          choice?: Choice;
          nullable?: First | null;
          empty?: {};
        }
      `),
      )
      .toBeValid();
  });

  it("does not compare routes without a corresponding PUT", async () => {
    await tester
      .expect(
        `
        @service namespace Test;
        @route("/other") @put op put(@body body: { common?: string; }): void;
        @route("/widgets") @patch op patch(@body body: { missing?: string; }): void;
      `,
      )
      .toBeValid();
  });

  it("deduplicates a shared missing property across operation pairs", async () => {
    await tester
      .expect(
        bodyPair(`
        model PutBody { common?: string; }
        model PatchBody { missing?: string; }
        @route("/other") @put op otherPut(@body body: PutBody): void;
        @route("/other") @patch op otherPatch(@body body: PatchBody): void;
      `),
      )
      .toEmitDiagnostics(missingProperty("missing"));
  });

  it("compares emitted operation bodies instead of same-endpoint overload bodies", async () => {
    await tester
      .expect(
        `
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

  function bodyPair(models: string): string {
    return `
      @service namespace Test;
      ${models}
      @route("/widgets") @put op put(@body body: PutBody): void;
      @route("/widgets") @patch op patch(@body body: PatchBody): void;
    `;
  }

  function missingProperty(property: string) {
    return {
      code,
      message: `The property '${property}' in the PATCH body does not correspond to a property in the PUT body.`,
    };
  }

  it("compares body properties in every declared service version", async () => {
    await tester
      .expect(
        `
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
          code,
          message:
            "The property 'historicalProperty' in the PATCH body does not correspond to a property in the PUT body.",
        },
        {
          code,
          message:
            "The property 'currentProperty' in the PATCH body does not correspond to a property in the PUT body.",
        },
      ]);
  });

  it.each(["extends", "spread"])("respects %s properties in nested namespaces", async (shape) => {
    await tester
      .expect(
        `
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
        code,
        message:
          "The property 'missing' in the PATCH body does not correspond to a property in the PUT body.",
      });
  });

  it("resolves dependency versions instead of using service version indices", async () => {
    await tester
      .expect(
        `
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
        code,
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
        code,
        message:
          verb === "put"
            ? "A PATCH request body requires the corresponding PUT operation to have a body."
            : "The PATCH operation must have a request body.",
      });
  });
});
