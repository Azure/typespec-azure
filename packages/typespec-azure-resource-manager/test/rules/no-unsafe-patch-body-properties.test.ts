import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noUnsafePatchBodyPropertiesRule } from "../../src/rules/no-unsafe-patch-body-properties.js";

const ruleCode = "@azure-tools/typespec-azure-resource-manager/no-unsafe-patch-body-properties";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noUnsafePatchBodyPropertiesRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

function patchOperation(bodyType: string): string {
  return `
    @armProviderNamespace
    namespace Microsoft.TestService;

    @route("/widgets/{name}")
    @patch
    op update(@path name: string, @body body: ${bodyType}): void;
  `;
}

describe("invalid cases", () => {
  it("emits diagnostics for required PATCH body properties", async () => {
    await tester
      .expect(
        `
        ${patchOperation("WidgetPatchBody")}

        model WidgetPatchBody {
          displayName: string;
        }
        `,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message: "Properties of a PATCH request body must not be required, property:displayName.",
      });
  });

  it("emits diagnostics for required properties in nullable top-level PATCH bodies", async () => {
    await tester
      .expect(
        `
        ${patchOperation("WidgetPatchBody | null")}

        model WidgetPatchBody {
          displayName: string;
        }
        `,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message: "Properties of a PATCH request body must not be required, property:displayName.",
      });
  });

  it("emits diagnostics for required properties in nullable nested PATCH models", async () => {
    await tester
      .expect(
        `
        ${patchOperation("WidgetPatchBody")}

        model WidgetPatchBody {
          details?: WidgetPatchDetails | null;
        }

        model WidgetPatchDetails {
          displayName: string;
        }
        `,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message:
          "Properties of a PATCH request body must not be required, property:details.displayName.",
      });
  });

  it("emits diagnostics for discriminator properties that Autorest requires", async () => {
    await tester
      .expect(
        `
        ${patchOperation("WidgetPatchBody")}

        model WidgetPatchBody {
          optional?: OptionalDiscriminator;
          synthesized?: SynthesizedDiscriminator;
          derived?: DerivedDiscriminator;
        }

        @discriminator("kind")
        model OptionalDiscriminator {
          kind?: string;
        }

        @discriminator("kind")
        model SynthesizedDiscriminator {}

        @discriminator("kind")
        model BaseSynthesizedDiscriminator {}

        model DerivedDiscriminator extends BaseSynthesizedDiscriminator {
          kind: "derived";
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: ruleCode,
          message:
            "Properties of a PATCH request body must not be required, property:optional.kind.",
        },
        {
          code: ruleCode,
          message:
            "Properties of a PATCH request body must not be required, property:synthesized.kind.",
        },
        {
          code: ruleCode,
          message:
            "Properties of a PATCH request body must not be required, property:derived.kind.",
        },
      ]);
  });

  it("emits diagnostics for PATCH body properties with defaults", async () => {
    await tester
      .expect(
        `
        ${patchOperation("WidgetPatchBody")}

        model WidgetPatchBody {
          enabled?: boolean = false;
          count?: int32 = 0;
          label?: string = "";
          mode?: string = "active";
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: ruleCode,
          message:
            "Properties of a PATCH request body must not have default value, property:enabled.",
        },
        {
          code: ruleCode,
          message:
            "Properties of a PATCH request body must not have default value, property:count.",
        },
        {
          code: ruleCode,
          message:
            "Properties of a PATCH request body must not have default value, property:label.",
        },
        {
          code: ruleCode,
          message: "Properties of a PATCH request body must not have default value, property:mode.",
        },
      ]);
  });

  it("emits diagnostics for PATCH body properties that are only visible on create", async () => {
    await tester
      .expect(
        `
        ${patchOperation("WidgetPatchBody")}

        model WidgetPatchBody {
          @visibility(Lifecycle.Create)
          createdBy?: string;
        }
        `,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message:
          'Properties of a PATCH request body must not be x-ms-mutability: ["create"], property:createdBy.',
      });
  });

  it("emits diagnostics for authored identity properties encoded away from top-level identity", async () => {
    await tester
      .expect(
        `
        ${patchOperation("WidgetPatchBody")}

        model WidgetPatchBody {
          @encodedName("application/json", "notIdentity")
          identity: string;
        }
        `,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message: "Properties of a PATCH request body must not be required, property:notIdentity.",
      });
  });

  it("reports library property diagnostics on project properties", async () => {
    await tester
      .expect(
        `
        ${patchOperation("WidgetPatchBody")}

        model Item {}

        model WidgetPatchBody {
          /*core*/page?: Azure.Core.Page<Item>;
          /*arm*/managedIdentity?: Azure.ResourceManager.CommonTypes.ManagedServiceIdentity;
          identity: Azure.ResourceManager.CommonTypes.ManagedServiceIdentity;
        }
        `,
      )
      .toEmitDiagnostics((x) => [
        {
          code: ruleCode,
          message: "Properties of a PATCH request body must not be required, property:page.value.",
          pos: x.pos.core.pos,
        },
        {
          code: ruleCode,
          message:
            "Properties of a PATCH request body must not be required, property:managedIdentity.type.",
          pos: x.pos.arm.pos,
        },
      ]);
  });
});

describe("valid cases", () => {
  it("allows optional PATCH body properties", async () => {
    await tester
      .expect(
        `
        ${patchOperation("WidgetPatchBody")}

        model WidgetPatchBody {
          displayName?: string;
        }
        `,
      )
      .toBeValid();
  });

  it("allows unsupported unions with multiple model variants", async () => {
    await tester
      .expect(
        `
        ${patchOperation("FirstPatchBody | SecondPatchBody")}

        model FirstPatchBody {
          first: string;
        }

        model SecondPatchBody {
          second: string;
        }
        `,
      )
      .toBeValid();
  });

  it("allows required PATCH body properties omitted because their type is never", async () => {
    await tester
      .expect(
        `
        ${patchOperation("WidgetPatchBody")}

        model WidgetPatchBody {
          omitted: never;
        }
        `,
      )
      .toBeValid();
  });

  it("allows top-level identity PATCH body properties", async () => {
    await tester
      .expect(
        `
        ${patchOperation("WidgetPatchBody")}

        model WidgetPatchBody {
          identity: string;
        }
        `,
      )
      .toBeValid();
  });

  it("allows top-level identity discriminator properties synthesized by Autorest", async () => {
    await tester
      .expect(
        `
        ${patchOperation("WidgetPatchBody")}

        @discriminator("identity")
        model WidgetPatchBody {}
        `,
      )
      .toBeValid();
  });

  it("allows PATCH body properties encoded as top-level identity", async () => {
    await tester
      .expect(
        `
        ${patchOperation("WidgetPatchBody")}

        model WidgetPatchBody {
          @encodedName("application/json", "identity")
          tenantIdentity: string;
        }
        `,
      )
      .toBeValid();
  });

  it("allows required and create-only source properties removed from the emitted PATCH schema", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace
        namespace Microsoft.TestService;

        model WidgetProperties {
          displayName: string;
          @visibility(Lifecycle.Create)
          createdBy: string;
        }

        #suppress "@typespec/http/deprecated-implicit-optionality" "Test legacy PATCH transform."
        @route("/widgets/{name}")
        @patch(#{ implicitOptionality: true })
        op update(@path name: string, @body body: WidgetProperties): void;
        `,
      )
      .toBeValid();
  });
});
