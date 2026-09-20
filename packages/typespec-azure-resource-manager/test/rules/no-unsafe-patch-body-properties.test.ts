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

describe.each([
  ["with provider metadata", "@armProviderNamespace"],
  ["without provider metadata", ""],
])("applicability %s", (_, providerDecorator) => {
  it.each([
    ["service namespace", "", ""],
    ["nested namespace", "namespace Widgets {", "}"],
    ["nested interface", "namespace Widgets { interface Operations {", "} }"],
  ])("checks PATCH bodies in a %s", async (_, beforeOperation, afterOperation) => {
    await tester
      .expect(
        `
        ${providerDecorator}
        namespace Microsoft.TestService;

        model WidgetPatchBody {
          displayName: string;
          enabled?: boolean = false;
          @visibility(Lifecycle.Create)
          createdBy?: string;
        }

        ${beforeOperation}
        @route("/widgets/{name}")
        @patch
        op update(@path name: string, @body body: WidgetPatchBody): void;
        ${afterOperation}
        `,
      )
      .toEmitDiagnostics([
        {
          code: ruleCode,
          message: "Properties of a PATCH request body must not be required, property:displayName.",
        },
        {
          code: ruleCode,
          message:
            "Properties of a PATCH request body must not have default value, property:enabled.",
        },
      ]);
  });

  it.each(["post", "put"])("ignores %s request bodies", async (verb) => {
    await tester
      .expect(
        `
        ${providerDecorator}
        namespace Microsoft.TestService;

        namespace Widgets {
          @route("/widgets")
          @${verb}
          op write(@body body: {
            displayName: string;
            enabled?: boolean = false;
            @visibility(Lifecycle.Create)
            createdBy?: string;
          }): void;
        }
        `,
      )
      .toBeValid();
  });
});

describe("payload kinds", () => {
  it.each([
    [
      "multipart model",
      `@header contentType: "multipart/form-data",
       @multipartBody body: { name: HttpPart<string>; contents: HttpPart<bytes> }`,
    ],
    [
      "multipart tuple",
      `@header contentType: "multipart/form-data",
       @multipartBody body: [HttpPart<string, #{ name: "name" }>]`,
    ],
    ["file", "@bodyRoot body: File"],
    ["single binary", '@header contentType: "application/octet-stream", @body body: bytes'],
  ])("does not inspect %s payload properties", async (_, parameters) => {
    await tester
      .expect(
        `
        namespace Microsoft.TestService;
        @route("/widgets") @patch op update(${parameters}): void;
        `,
      )
      .toBeValid();
  });

  it.each(["PatchBody", "PatchBody | null"])(
    "checks required and default properties in a single %s payload",
    async (bodyType) => {
      await tester
        .expect(
          `
          namespace Microsoft.TestService;
          model PatchBody {
            name: string;
            enabled?: boolean = false;
            @visibility(Lifecycle.Create) createdBy?: string;
          }
          @route("/widgets") @patch op update(@body body: ${bodyType}): void;
          `,
        )
        .toEmitDiagnostics([
          {
            code: ruleCode,
            message: "Properties of a PATCH request body must not be required, property:name.",
          },
          {
            code: ruleCode,
            message:
              "Properties of a PATCH request body must not have default value, property:enabled.",
          },
        ]);
    },
  );
});

describe("traversal", () => {
  it("checks inherited properties without duplicating overridden properties", async () => {
    await tester
      .expect(
        `
        ${patchOperation("WidgetPatchBody")}

        model BasePatchBody {
          displayName: string;
          /*default*/enabled?: boolean = false;
        }

        model WidgetPatchBody extends BasePatchBody {
          /*required*/displayName: "widget";
        }
        `,
      )
      .toEmitDiagnostics((x) => [
        {
          code: ruleCode,
          message: "Properties of a PATCH request body must not be required, property:displayName.",
          pos: x.pos.required.pos,
        },
        {
          code: ruleCode,
          message:
            "Properties of a PATCH request body must not have default value, property:enabled.",
          pos: x.pos.default.pos,
        },
      ]);
  });

  it("finds an inherited discriminator property without synthesizing another diagnostic", async () => {
    await tester
      .expect(
        `
        ${patchOperation("WidgetPatchBody")}

        @discriminator("kind")
        model BasePatchBody {
          /*kind*/kind: string;
        }

        model WidgetPatchBody extends BasePatchBody {
          name?: string;
        }

        model ConcretePatchBody extends WidgetPatchBody {
          kind: "widget";
        }
        `,
      )
      .toEmitDiagnostics((x) => ({
        code: ruleCode,
        message: "Properties of a PATCH request body must not be required, property:kind.",
        pos: x.pos.kind.pos,
      }));
  });

  it("checks a shared recursive body independently for each operation", async () => {
    await tester
      .expect(
        `
        ${patchOperation("WidgetPatchBody")}

        model WidgetPatchBody {
          displayName: string;
          next?: WidgetPatchBody;
        }

        @route("/other-widgets/{name}")
        @patch
        op updateOther(@path name: string, @body body: WidgetPatchBody): void;
        `,
      )
      .toEmitDiagnostics([
        {
          code: ruleCode,
          message: "Properties of a PATCH request body must not be required, property:displayName.",
        },
        {
          code: ruleCode,
          message: "Properties of a PATCH request body must not be required, property:displayName.",
        },
      ]);
  });

  it.each([true, false])(
    "keeps shared-body optionality operation-specific with implicit optionality first: %s",
    async (implicitFirst) => {
      const implicitOperation = `
        #suppress "@typespec/http/deprecated-implicit-optionality" "Test legacy PATCH transform."
        @route("/implicit")
        @patch(#{ implicitOptionality: true })
        op implicitUpdate(@body body: WidgetPatchBody): void;
      `;
      const explicitOperation = `
        @route("/explicit")
        @patch
        op explicitUpdate(@body body: WidgetPatchBody): void;
      `;
      await tester
        .expect(
          `
          model WidgetPatchBody {
            displayName: string;
          }

          ${implicitFirst ? implicitOperation : explicitOperation}
          ${implicitFirst ? explicitOperation : implicitOperation}
          `,
        )
        .toEmitDiagnostics({
          code: ruleCode,
          message: "Properties of a PATCH request body must not be required, property:displayName.",
        });
    },
  );
});

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

  it("checks only authored required discriminator properties in effective input", async () => {
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
      .toEmitDiagnostics({
        code: ruleCode,
        message: "Properties of a PATCH request body must not be required, property:derived.kind.",
      });
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

  it("checks create-only properties when request visibility explicitly includes them", async () => {
    await tester
      .expect(
        `
        model WidgetPatchBody {
          @visibility(Lifecycle.Read)
          id: string = "server";
          @visibility(Lifecycle.Create)
          createdBy?: string;
          @visibility(Lifecycle.Update)
          name: string;
        }
        @parameterVisibility(Lifecycle.Create)
        @patch op update(@body body: WidgetPatchBody): void;
        `,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message:
          "Properties of a PATCH request body must not be visible only during Lifecycle.Create, property:createdBy.",
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

  it("does not synthesize absent top-level identity discriminator properties", async () => {
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

  it("respects legacy implicit optionality and excludes create-only PATCH inputs", async () => {
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

  describe("native PATCH input regressions", () => {
    it.each(["", "@visibility(Lifecycle.Read, Lifecycle.Query) unrelated?: string;"])(
      "ignores excluded properties independently of schema sharing: %s",
      async (extra) => {
        await tester
          .expect(
            `
            ${patchOperation("PatchBody")}
            model PatchBody {
              @visibility(Lifecycle.Read) id: string;
              @visibility(Lifecycle.Create) createdBy?: string;
              name?: string;
              ${extra}
            }
            `,
          )
          .toBeValid();
      },
    );

    it.each([false, true])(
      "ignores excluded defaults with implicitOptionality %s",
      async (implicitOptionality) => {
        await tester
          .expect(
            `
            model PatchBody {
              @visibility(Lifecycle.Read) id: string = "server";
              @visibility(Lifecycle.Create) createdBy: string = "creator";
              name?: string;
            }
            ${implicitOptionality ? '#suppress "@typespec/http/deprecated-implicit-optionality" "Test legacy PATCH transform."' : ""}
            @patch(#{ implicitOptionality: ${implicitOptionality} })
            op update(@body body: PatchBody): void;
            `,
          )
          .toBeValid();
      },
    );

    it("excludes ordinary create-only PATCH inputs", async () => {
      await tester
        .expect(
          `
          ${patchOperation("PatchBody")}
          model PatchBody {
            @visibility(Lifecycle.Create) createdBy?: string;
          }
          `,
        )
        .toBeValid();
    });

    it("uses each operation's request visibility for a shared model", async () => {
      await tester
        .expect(
          `
          model PatchBody {
            @visibility(Lifecycle.Create) creator: string;
            @visibility(Lifecycle.Update) name: string;
          }
          @route("/update") @patch op update(@body body: PatchBody): void;
          @route("/create") @parameterVisibility(Lifecycle.Create)
          @patch op create(@body body: PatchBody): void;
          `,
        )
        .toEmitDiagnostics([
          {
            code: ruleCode,
            message: "Properties of a PATCH request body must not be required, property:name.",
          },
          {
            code: ruleCode,
            message: "Properties of a PATCH request body must not be required, property:creator.",
          },
          {
            code: ruleCode,
            message:
              "Properties of a PATCH request body must not be visible only during Lifecycle.Create, property:creator.",
          },
        ]);
    });

    it("exempts only the top-level encoded identity", async () => {
      await tester
        .expect(
          `
          ${patchOperation("PatchBody")}
          model PatchBody {
            @encodedName("application/json", "identity") envelope: { required: string; };
            nested?: { identity: string; };
          }
          `,
        )
        .toEmitDiagnostics({
          code: ruleCode,
          message:
            "Properties of a PATCH request body must not be required, property:nested.identity.",
        });
    });

    it.each(["", "kind?: string;", "@visibility(Lifecycle.Read) kind: string;"])(
      "does not synthesize or force an excluded or optional discriminator: %s",
      async (property) => {
        await tester
          .expect(
            `
            ${patchOperation("PatchBody")}
            @discriminator("kind") model PatchBody { ${property} name?: string; }
            `,
          )
          .toBeValid();
      },
    );

    it("checks an authored required discriminator", async () => {
      await tester
        .expect(
          `
          ${patchOperation("PatchBody")}
          @discriminator("kind") model PatchBody { /*kind*/kind: string; }
          `,
        )
        .toEmitDiagnostics((x) => ({
          code: ruleCode,
          message: "Properties of a PATCH request body must not be required, property:kind.",
          pos: x.pos.kind.pos,
        }));
    });

    it("respects legacy implicit optionality for an authored discriminator", async () => {
      await tester
        .expect(
          `
          @discriminator("kind") model PatchBody { kind: string; }
          #suppress "@typespec/http/deprecated-implicit-optionality" "Test legacy PATCH transform."
          @patch(#{ implicitOptionality: true }) op update(@body body: PatchBody): void;
          `,
        )
        .toBeValid();
    });

    it("ignores an inherited excluded discriminator", async () => {
      await tester
        .expect(
          `
          ${patchOperation("PatchBody")}
          @discriminator("kind") model Base { @visibility(Lifecycle.Read) kind: string; }
          model PatchBody extends Base { name?: string; }
          model Concrete extends PatchBody { kind: "concrete"; }
          `,
        )
        .toBeValid();
    });
  });
});
