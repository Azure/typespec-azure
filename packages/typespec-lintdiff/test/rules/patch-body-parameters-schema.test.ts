import { resolvePath } from "@typespec/compiler";
import {
  createLinterRuleTester,
  createTester,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { patchBodyParametersSchemaRule } from "../../src/rules/patch-body-parameters-schema.js";

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
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    patchBodyParametersSchemaRule,
    "tsp-lintdiff-local-linter",
  );
});

const service = `
  using TypeSpec.Http;
  @Azure.ResourceManager.armProviderNamespace
  @service namespace Microsoft.TestService;
`;

describe("patch-body-parameters-schema payload kinds", () => {
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
      .expect(`${service} @route("/widgets") @patch op update(${parameters}): void;`)
      .toBeValid();
  });

  it.each(["PatchBody", "PatchBody | null"])(
    "checks required and default properties in a single %s payload",
    async (bodyType) => {
      await tester
        .expect(
          `${service}
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
            code: "tsp-lintdiff-local-linter/patch-body-parameters-schema",
            message: "Properties of a PATCH request body must not be required, property:name.",
          },
          {
            code: "tsp-lintdiff-local-linter/patch-body-parameters-schema",
            message:
              "Properties of a PATCH request body must not have default value, property:enabled.",
          },
        ]);
    },
  );
});

const code = "tsp-lintdiff-local-linter/patch-body-parameters-schema";
const required = (property: string) => ({
  code,
  message: `Properties of a PATCH request body must not be required, property:${property}.`,
});
const legacyPatch = `
  #suppress "@typespec/http/deprecated-implicit-optionality" "Exercise supported legacy PATCH optionality."
`;

describe("native PATCH input", () => {
  it.each(["", "@visibility(Lifecycle.Read, Lifecycle.Query) unrelated?: string;"])(
    "ignores excluded properties independently of schema sharing: %s",
    async (extra) => {
      await tester
        .expect(
          `${service}
        model PatchBody {
          @visibility(Lifecycle.Read) id: string;
          @visibility(Lifecycle.Create) createdBy?: string;
          name?: string;
          ${extra}
        }
        @patch op update(@body body: PatchBody): void;
      `,
        )
        .toBeValid();
    },
  );

  it.each(["false", "true"])(
    "ignores read-only defaults with implicitOptionality %s",
    async (option) => {
      await tester
        .expect(
          `${service}
      model PatchBody {
        @visibility(Lifecycle.Read) id: string = "server";
        @visibility(Lifecycle.Create) createdBy: string = "creator";
        name?: string;
      }
      ${option === "true" ? legacyPatch : ""}
      @patch(#{ implicitOptionality: ${option} }) op update(@body body: PatchBody): void;
    `,
        )
        .toBeValid();
    },
  );

  it("checks create-only properties only when request visibility explicitly includes them", async () => {
    await tester
      .expect(
        `${service}
      model PatchBody {
        @visibility(Lifecycle.Read) id: string = "server";
        @visibility(Lifecycle.Create) createdBy?: string;
        @visibility(Lifecycle.Update) name: string;
      }
      @parameterVisibility(Lifecycle.Create)
      @patch op update(@body body: PatchBody): void;
    `,
      )
      .toEmitDiagnostics({
        code,
        message:
          "Properties of a PATCH request body must not be visible only during Lifecycle.Create, property:createdBy.",
      });
  });

  it.each([false, true])(
    "keeps traversal and optionality per operation (implicit first: %s)",
    async (implicitFirst) => {
      const explicit =
        '@route("/explicit") @patch(#{ implicitOptionality: false }) op explicit(@body body: PatchBody): void;';
      const implicit = `${legacyPatch} @route("/implicit") @patch(#{ implicitOptionality: true }) op implicit(@body body: PatchBody): void;`;
      await tester
        .expect(
          `${service}
      model PatchBody { name: string; next?: PatchBody; }
      ${implicitFirst ? implicit + explicit : explicit + implicit}
    `,
        )
        .toEmitDiagnostics(required("name"));
    },
  );

  it("uses each operation's request visibility for a shared model", async () => {
    await tester
      .expect(
        `${service}
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
        required("name"),
        required("creator"),
        {
          code,
          message:
            "Properties of a PATCH request body must not be visible only during Lifecycle.Create, property:creator.",
        },
      ]);
  });

  it("preserves inherited property targets and overrides", async () => {
    await tester
      .expect(
        `${service}
      model Base {
        name: string;
        /*default*/enabled?: boolean = false;
      }
      model PatchBody extends Base { /*required*/name: "widget"; }
      @patch op update(@body body: PatchBody): void;
    `,
      )
      .toEmitDiagnostics((x) => [
        { ...required("name"), pos: x.pos.required.pos },
        {
          code,
          message:
            "Properties of a PATCH request body must not have default value, property:enabled.",
          pos: x.pos.default.pos,
        },
      ]);
  });

  it("exempts only the top-level encoded identity", async () => {
    await tester
      .expect(
        `${service}
      model PatchBody {
        @encodedName("application/json", "identity") envelope: { required: string; };
        nested?: { identity: string; };
      }
      @patch op update(@body body: PatchBody): void;
    `,
      )
      .toEmitDiagnostics(required("nested.identity"));
  });
});

describe("native discriminators", () => {
  it.each(["", "kind?: string;", "@visibility(Lifecycle.Read) kind: string;"])(
    "does not synthesize or force an excluded or optional discriminator: %s",
    async (property) => {
      await tester
        .expect(
          `${service}
        @discriminator("kind") model PatchBody { ${property} name?: string; }
        @patch op update(@body body: PatchBody): void;
      `,
        )
        .toBeValid();
    },
  );

  it("checks an authored required discriminator", async () => {
    await tester
      .expect(
        `${service}
      @discriminator("kind") model PatchBody { /*kind*/kind: string; }
      @patch op update(@body body: PatchBody): void;
    `,
      )
      .toEmitDiagnostics((x) => ({ ...required("kind"), pos: x.pos.kind.pos }));
  });

  it("respects legacy implicit optionality for an authored discriminator", async () => {
    await tester
      .expect(
        `${service}
      @discriminator("kind") model PatchBody { kind: string; }
      ${legacyPatch}
      @patch(#{ implicitOptionality: true }) op update(@body body: PatchBody): void;
    `,
      )
      .toBeValid();
  });

  it("checks an inherited required discriminator without synthesizing a duplicate", async () => {
    await tester
      .expect(
        `${service}
      @discriminator("kind") model Base { /*kind*/kind: string; }
      model PatchBody extends Base { name?: string; }
      model Concrete extends PatchBody { kind: "concrete"; }
      @patch op update(@body body: PatchBody): void;
    `,
      )
      .toEmitDiagnostics((x) => ({ ...required("kind"), pos: x.pos.kind.pos }));
  });

  it("ignores an inherited excluded discriminator", async () => {
    await tester
      .expect(
        `${service}
      @discriminator("kind") model Base { @visibility(Lifecycle.Read) kind: string; }
      model PatchBody extends Base { name?: string; }
      model Concrete extends PatchBody { kind: "concrete"; }
      @patch op update(@body body: PatchBody): void;
    `,
      )
      .toBeValid();
  });
});
