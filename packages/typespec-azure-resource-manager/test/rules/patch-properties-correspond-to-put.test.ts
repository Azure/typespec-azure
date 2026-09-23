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
      .toEmitDiagnostics({ ...missingProperty("patchName"), target: "name" });
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

  it.each(["", "@body body: void"])(
    "leaves missing PUT body validation to the PUT rule (%s)",
    async (parameter) => {
      await tester
        .expect(
          `
        @service namespace Test;
        @route("/widgets") @put op put(${parameter}): void;
        @route("/widgets") @patch op patch(@body body: { common?: string; }): void;
      `,
        )
        .toBeValid();
    },
  );

  it("does not synthesize a PATCH discriminator absent from PUT", async () => {
    await tester
      .expect(
        bodyPair(`
        model PutBody { name?: string; }
        @discriminator("kind") model PatchBody { name?: string; }
        model ConcretePatch extends PatchBody { kind: "concrete"; }
      `),
      )
      .toBeValid();
  });

  it("does not synthesize an inherited PATCH discriminator", async () => {
    await tester
      .expect(
        bodyPair(`
        model PutBody { name?: string; }
        @discriminator("kind") model Base { name?: string; }
        model PatchBody extends Base {}
        model ConcretePatch extends PatchBody { kind: "concrete"; }
      `),
      )
      .toBeValid();
  });

  it.each([false, true])(
    "compares effective input of a standard PUT with Create visibility (unrelated property: %s)",
    async (unrelated) => {
      await tester
        .expect(
          `
          @service @armProviderNamespace namespace Microsoft.TestService;
          model WidgetProperties {
            common?: string;
            @visibility(Lifecycle.Update) updateOnly?: string;
            ${unrelated ? "@visibility(Lifecycle.Read, Lifecycle.Query) queryOnly?: string;" : ""}
          }
          model Widget is TrackedResource<WidgetProperties> {
            @key("widgetName") @segment("widgets") @path name: string;
          }
          model WidgetPatch {
            tags?: Record<string>;
            properties?: { updateOnly?: string; };
          }
          @armResourceOperations interface Widgets {
            @parameterVisibility(Lifecycle.Create)
            create is ArmResourceCreateOrReplaceSync<Widget>;
            update is ArmCustomPatchSync<Widget, WidgetPatch>;
          }
          `,
        )
        .toEmitDiagnostics({ ...missingProperty("updateOnly"), target: "updateOnly" });
    },
  );

  it.each(["Read", "Create"])("excludes %s-only PATCH properties", async (visibility) => {
    await tester
      .expect(
        bodyPair(`
          model PutBody { common?: string; }
          model PatchBody {
            common?: string;
            @visibility(Lifecycle.${visibility}) excluded?: string;
          }
        `),
      )
      .toBeValid();
  });

  it("compares an explicitly exposed Create-only PATCH property", async () => {
    await tester
      .expect(
        `
        @service namespace Test;
        model PutBody { common?: string; }
        model PatchBody {
          common?: string;
          @visibility(Lifecycle.Create) extra?: string;
        }
        @route("/widgets") @put op put(@body body: PutBody): void;
        @parameterVisibility(Lifecycle.Create)
        @route("/widgets") @patch op patch(@body body: PatchBody): void;
        `,
      )
      .toEmitDiagnostics(missingProperty("extra"));
  });

  it("rejects a PATCH model with no effective input properties", async () => {
    await tester
      .expect(
        bodyPair(`
          model PutBody { common?: string; }
          model PatchBody { @visibility(Lifecycle.Read) common?: string; }
        `),
      )
      .toEmitDiagnostics({
        code,
        message: "The PATCH request body must contain at least one property.",
      });
  });

  it("preserves empty PATCH validation when the PUT body is missing", async () => {
    await tester
      .expect(
        `
        @service namespace Test;
        @route("/widgets") @put op put(): void;
        @route("/widgets") @patch op patch(@body body: {}): void;
      `,
      )
      .toEmitDiagnostics({
        code,
        message: "The PATCH request body must contain at least one property.",
      });
  });

  it.each(["body", "bodyRoot"])("respects HTTP metadata in an explicit @%s", async (decorator) => {
    const expectation = tester.expect(`
        @service namespace Test;
        model PutBody { common?: string; }
        model PatchBody {
          common?: string;
          ${decorator === "body" ? '#suppress "@typespec/http/metadata-ignored" "Test explicit body JSON membership."' : ""}
          @header extra?: string;
        }
        @route("/widgets") @put op put(@body body: PutBody): void;
        @route("/widgets") @patch op patch(@${decorator} body: PatchBody): void;
      `);
    if (decorator === "body") {
      await expectation.toEmitDiagnostics(missingProperty("extra"));
    } else {
      await expectation.toBeValid();
    }
  });

  it.each(["string", "First | Second", "string[]", "Record<string>"])(
    "does not interpret unsupported PUT body %s as an empty object",
    async (body) => {
      await tester
        .expect(
          bodyPair(`
            model First { common?: string; }
            model Second { other?: string; }
            alias PutBody = ${body};
            model PatchBody { extra?: string; }
          `),
        )
        .toBeValid();
    },
  );

  it("checks authored discriminator properties", async () => {
    await tester
      .expect(
        bodyPair(`
          model PutBody { common?: string; }
          @discriminator("kind") model PatchBody { common?: string; kind?: string; }
          model ConcretePatch extends PatchBody { kind: "concrete"; }
        `),
      )
      .toEmitDiagnostics(missingProperty("kind"));
  });

  it.each(["extends", "spread"])("filters inherited input visibility through %s", async (shape) => {
    await tester
      .expect(
        bodyPair(`
            model Base {
              common?: string;
              @visibility(Lifecycle.Read, Lifecycle.Create) excluded?: string;
            }
            model PutBody { common?: string; }
            ${shape === "extends" ? "model PatchBody extends Base {}" : "model PatchBody { ...Base; }"}
          `),
      )
      .toBeValid();
  });

  it("does not resurrect inherited PUT properties overridden with never", async () => {
    await tester
      .expect(
        bodyPair(`
          model Base { value?: string; common?: string; }
          model PutBody extends Base { value?: never; }
          model PatchBody { value?: string; common?: string; }
        `),
      )
      .toEmitDiagnostics(missingProperty("value"));
  });

  it.each(["body", "bodyRoot"])("respects PUT @%s membership", async (decorator) => {
    const expectation = tester.expect(`
      @service namespace Test;
      model PutBody {
        common?: string;
        ${decorator === "body" ? '#suppress "@typespec/http/metadata-ignored" "Test explicit body JSON membership."' : ""}
        @header extra?: string;
      }
      model PatchBody { common?: string; extra?: string; }
      @route("/widgets") @put op put(@${decorator} body: PutBody): void;
      @route("/widgets") @patch op patch(@body body: PatchBody): void;
    `);
    if (decorator === "body") {
      await expectation.toBeValid();
    } else {
      await expectation.toEmitDiagnostics(missingProperty("extra"));
    }
  });

  it("keeps visibility independent for operations sharing a body model", async () => {
    await tester
      .expect(
        `
        @service namespace Test;
        model Body { common?: string; @visibility(Lifecycle.Update) updateOnly?: string; }
        @parameterVisibility(Lifecycle.Create)
        @route("/create") @put op create(@body body: Body): void;
        @route("/create") @patch op patchCreate(@body body: Body): void;
        @parameterVisibility(Lifecycle.Update)
        @route("/update") @put op update(@body body: Body): void;
        @route("/update") @patch op patchUpdate(@body body: Body): void;
      `,
      )
      .toEmitDiagnostics(missingProperty("updateOnly"));
  });

  it("accepts nullable single-model bodies", async () => {
    await tester
      .expect(
        bodyPair(`
          model Body { common?: string; }
          alias PutBody = Body | null;
          alias PatchBody = Body | null;
        `),
      )
      .toBeValid();
  });

  it("terminates recursive models without hiding distinct sibling targets", async () => {
    await tester
      .expect(
        bodyPair(`
          model PutNode { common?: string; next?: PutNode; }
          model FirstPatchNode { common?: string; extra?: string; next?: FirstPatchNode; }
          model SecondPatchNode { common?: string; extra?: string; next?: SecondPatchNode; }
          model PutBody { first?: PutNode; second?: PutNode; }
          model PatchBody { first?: FirstPatchNode; second?: SecondPatchNode; }
        `),
      )
      .toEmitDiagnostics([missingProperty("extra"), missingProperty("extra")]);
  });

  it("does not validate imported ARM and Azure Core declarations", async () => {
    await tester.expect("@service namespace Test;").toBeValid();
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

  it("ignores absent discriminators on both bodies", async () => {
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

  it("compares base operation bodies instead of same-endpoint overload bodies", async () => {
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
    const expectation = tester.expect(
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
    );
    if (verb === "put") {
      await expectation.toBeValid();
    } else {
      await expectation.toEmitDiagnostics({
        code,
        message: "The PATCH operation must have a request body.",
      });
    }
  });
});
