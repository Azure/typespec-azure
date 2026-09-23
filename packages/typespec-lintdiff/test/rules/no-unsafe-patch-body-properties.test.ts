import { resolvePath } from "@typespec/compiler";
import {
  createLinterRuleTester,
  createTester,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it } from "vitest";
import { patchOperationsRule } from "../../../typespec-azure-resource-manager/src/rules/arm-resource-patch.js";
import { patchEnvelopePropertiesRules } from "../../../typespec-azure-resource-manager/src/rules/patch-envelope-properties.js";
import { $linter } from "../../src/linter.js";
import { noUnsafePatchBodyPropertiesRule } from "../../src/rules/no-unsafe-patch-body-properties.js";

const BaseTester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
});
const Tester = BaseTester.importLibraries();

let tester: LinterRuleTester;
beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    noUnsafePatchBodyPropertiesRule,
    "tsp-lintdiff-local-linter",
  );
});

const service = `
  using TypeSpec.Http;
  @Azure.ResourceManager.armProviderNamespace
  @service namespace Microsoft.TestService;
`;
const code = "tsp-lintdiff-local-linter/no-unsafe-patch-body-properties";
const required = (path: string) => ({
  code,
  message: `Properties of a PATCH request body must not be required, property:${path}.`,
});
const defaultValue = (path: string) => ({
  code,
  message: `Properties of a PATCH request body must not have default value, property:${path}.`,
});
const missing = (path: string) => ({
  code,
  message: `The property '${path}' in the request body either does not appear in the resource model or is nested at the wrong level.`,
});
const immutable = (path: string) => ({
  code,
  message: `PATCH request body property '${path}' is immutable and must be excluded from PATCH input.`,
});
const visibility = (path: string) => ({
  code,
  message: `PATCH request body property '${path}' must include Lifecycle.Update visibility.`,
});
const legacyPatch = `
  #suppress "@typespec/http/deprecated-implicit-optionality" "Exercise supported legacy PATCH optionality."
`;

describe("partial resource layout", () => {
  it.each([false, true])("compares nullable model layouts, extra: %s", async (extra) => {
    const expectation = tester.expect(`${service}
      @patch op update(@body body: { details?: { value?: string; ${extra ? "extra?: string;" : ""} } | null } | null):
        { details: { value: string } | null };
    `);
    if (extra) await expectation.toEmitDiagnostics(missing("details.extra"));
    else await expectation.toBeValid();
  });
  it("accepts the documented standard ARM template example", async () => {
    const documentation = await readFile(
      new URL("../../src/rules/no-unsafe-patch-body-properties.md", import.meta.url),
      "utf8",
    );
    const example = documentation.match(/```tsp\r?\n([\s\S]*?)```/)?.[1];
    if (!example) throw new Error("The rule documentation must contain a TypeSpec example.");
    const documentationTester = createLinterRuleTester(
      await BaseTester.createInstance(),
      noUnsafePatchBodyPropertiesRule,
      "tsp-lintdiff-local-linter",
    );
    await documentationTester.expect(example).toBeValid();
  });
  it("excludes transport headers from an associated resource layout", async () => {
    await tester
      .expect(
        `${service}
      model Resource { @header extra?: string; value?: string; }
      @TypeSpec.Rest.updatesResource(Resource) @patch
      op update(@body body: { extra?: string }): Resource;
    `,
      )
      .toEmitDiagnostics(missing("extra"));
  });
  it("preserves metadata properties in explicit response bodies and array items", async () => {
    await tester
      .expect(
        `${service}
      model Resource {
        #suppress "@typespec/http/metadata-ignored" "Explicit JSON response property."
        @header extra?: string;
      }
      @patch op update(@body body: { extra?: string }): { @body body: Resource };
      @route("/array") @patch
      op updateArray(@bodyRoot body: { items?: { extra?: string }[] }): { items: Resource[] };
    `,
      )
      .toBeValid();
  });
  it("allows partial resource layouts without checking type assignability", async () => {
    await tester
      .expect(
        `${service}
      model Resource { required: string; properties: { value: int32; omitted: string; }; }
      @patch op update(@body body: { properties?: { value?: string } }): Resource;
    `,
      )
      .toBeValid();
  });

  it.each([
    ["extra?: string;", "extra"],
    ["value?: string;", "value"],
    ["properties?: { extra?: string; };", "properties.extra"],
    ["extra?: { nested?: { leaf?: string } };", "extra.nested.leaf"],
    ["properties?: { value?: { nested?: string } };", "properties.value.nested"],
  ])("reports missing or misnested layout: %s", async (properties, path) => {
    await tester
      .expect(
        `${service}
      @patch op update(@body body: { ${properties} }):
        { properties: { value: string; } };
    `,
      )
      .toEmitDiagnostics(missing(path));
  });

  it("matches encoded names and inherited overrides, including never", async () => {
    await tester
      .expect(
        `${service}
      model Base { @encodedName("application/json", "old") value?: string; removed?: string; }
      model Patch extends Base {
        @encodedName("application/json", "wire") value?: string;
        removed?: never;
      }
      model Middle extends Patch {}
      @patch op update(@body body: Middle): { wire: int32 };
    `,
      )
      .toBeValid();
  });

  it("does not let a never declaration hide an unrelated inherited encoded property", async () => {
    await tester
      .expect(
        `${service}
      model Base { @encodedName("application/json", "wire") present?: string; }
      model Patch extends Base { @encodedName("application/json", "wire") removed?: never; }
      @patch op update(@body body: Patch): { value: string };
    `,
      )
      .toEmitDiagnostics(missing("wire"));
  });

  it("reports a resource property hidden by an inherited never override", async () => {
    await tester
      .expect(
        `${service}
      model Base { extra?: string; }
      model Removed extends Base { extra?: never; }
      model Resource extends Removed {}
      @patch op update(@body body: { extra?: string }): Resource;
    `,
      )
      .toEmitDiagnostics(missing("extra"));
  });

  it("targets the authored encoded nested property", async () => {
    await tester
      .expect(
        `${service}
      model Patch { @encodedName("application/json", "bag") details?: {
        /*extra*/@encodedName("application/json", "wire") extra?: string;
      }; }
      @patch op update(@body body: Patch): { bag: {} };
    `,
      )
      .toEmitDiagnostics((x) => ({ ...missing("bag.wire"), pos: x.pos.extra.pos }));
  });

  it.each(["Patch", "Patch | null"])("unwraps nullable models in %s", async (body) => {
    await tester
      .expect(
        `${service}
      model Patch { properties?: { extra?: string } | null; }
      @patch op update(@body body: ${body}): { properties: { value: string } | null };
    `,
      )
      .toEmitDiagnostics(missing("properties.extra"));
  });

  it("compares a shared nested model against every resource counterpart", async () => {
    await tester
      .expect(
        `${service}
      model Shared { value?: string; extra?: string; }
      @patch op update(@body body: { first?: Shared; second?: Shared; }):
        { first: { value: string }; second: { extra: string }; };
    `,
      )
      .toEmitDiagnostics([missing("first.extra"), missing("second.value")]);
  });

  it("keeps sibling paths even when resource counterparts and source targets are shared", async () => {
    await tester
      .expect(
        `${service}
      model Shared { extra?: string; }
      model Resource {}
      @patch op update(@body body: { first?: Shared; second?: Shared; }):
        { first: Resource; second: Resource; };
    `,
      )
      .toEmitDiagnostics([missing("first.extra"), missing("second.extra")]);
  });
});

describe("immutable paths and effective input", () => {
  it("checks inherited encoded immutable envelope names", async () => {
    await tester
      .expect(
        `${service}
        model Base { @encodedName("application/json", "location") region?: string; }
        model Patch extends Base {}
        @patch op update(@body body: Patch): void;
      `,
      )
      .toEmitDiagnostics(immutable("location"));
  });
  it("checks ignored HTTP annotations in explicit PATCH JSON bodies", async () => {
    await tester
      .expect(
        `${service}
      model Patch {
        #suppress "@typespec/http/metadata-ignored" "Explicit JSON body property."
        @header location?: string;
        #suppress "@typespec/http/metadata-ignored" "Explicit JSON body property."
        @header value: string = "fixed";
      }
      @patch op update(@body body: Patch): void;
    `,
      )
      .toEmitDiagnostics([immutable("location"), required("value"), defaultValue("value")]);
  });
  it("does not inspect transport headers from bodyRoot as JSON fields", async () => {
    await tester
      .expect(
        `${service}
      model Patch { @header location?: string; @header value: string = "fixed"; actual?: string; }
      @patch op update(@bodyRoot body: Patch): void;
    `,
      )
      .toBeValid();
  });
  it.each(["id", "name", "type", "location"])("rejects writable top-level %s", async (name) => {
    await tester
      .expect(
        `${service}
      @patch op update(@body body: { ${name}?: string }): void;
    `,
      )
      .toEmitDiagnostics(immutable(name));
  });

  it("rejects the encoded provisioning-state path only at its reserved level", async () => {
    await tester
      .expect(
        `${service}
      model Base { @encodedName("application/json", "provisioningState") state?: string; }
      @patch op update(@body body: {
        @encodedName("application/json", "properties") bag?: Base;
        nested?: { id?: string; name?: string; type?: string; location?: string; provisioningState?: string };
        provisioningState?: string;
        @encodedName("application/json", "properties.provisioningState") dotted?: string;
      }): void;
    `,
      )
      .toEmitDiagnostics(immutable("properties.provisioningState"));
  });

  it.each(["Read", "Create", "Read, Lifecycle.Create"])(
    "excludes %s properties and descendants",
    async (vis) => {
      await tester
        .expect(
          `${service}
      model Patch {
        @visibility(Lifecycle.${vis}) location: string = "west";
        @visibility(Lifecycle.${vis}) ignored: { required: string; enabled?: boolean = false; };
        value?: string;
      }
      @patch op update(@body body: Patch): { value: string };
    `,
        )
        .toBeValid();
    },
  );

  it.each(["", "@visibility(Lifecycle.Read, Lifecycle.Query) unrelated?: string;"])(
    "does not let an unrelated Read/Query field change existing warnings: %s",
    async (extra) => {
      await tester
        .expect(
          `${service}
        model Patch {
          @visibility(Lifecycle.Read) id: string = "server";
          @visibility(Lifecycle.Create) creator?: string;
          value: string;
          ${extra}
        }
        @patch op update(@body body: Patch): void;
      `,
        )
        .toEmitDiagnostics(required("value"));
    },
  );

  it.each(["Read", "Create", "Query", "Delete"])(
    "checks exposed non-Update %s input",
    async (vis) => {
      await tester
        .expect(
          `${service}
      model Patch { @visibility(Lifecycle.${vis}) value?: string; }
      @parameterVisibility(Lifecycle.${vis}) @patch op update(@body body: Patch): void;
    `,
        )
        .toEmitDiagnostics(visibility("value"));
    },
  );

  it("does not let Update visibility permit an immutable field", async () => {
    await tester
      .expect(
        `${service}
      @patch op update(@body body: { @visibility(Lifecycle.Update) id?: string }): void;
    `,
      )
      .toEmitDiagnostics(immutable("id"));
  });

  it("reports independent categories without suppressing a finding", async () => {
    await tester
      .expect(
        `${service}
      @parameterVisibility(Lifecycle.Create) @patch
      op update(@body body: { @visibility(Lifecycle.Create) id: string = "fixed" }): { value: string };
    `,
      )
      .toEmitDiagnostics([
        immutable("id"),
        required("id"),
        defaultValue("id"),
        visibility("id"),
        missing("id"),
      ]);
  });

  it.each([false, true])(
    "isolates shared models in both visibility orders (%s)",
    async (reverse) => {
      const ordinary = '@route("/ordinary") @patch op ordinary(@body body: Patch): void;';
      const override =
        '@route("/override") @parameterVisibility(Lifecycle.Create) @patch op override(@body body: Patch): void;';
      await tester
        .expect(
          `${service}
      model Patch {
        @visibility(Lifecycle.Create) creator: string;
        @visibility(Lifecycle.Update) value: string;
      }
      ${reverse ? override + ordinary : ordinary + override}
    `,
        )
        .toEmitDiagnostics(
          reverse
            ? [required("creator"), visibility("creator"), required("value")]
            : [required("value"), required("creator"), visibility("creator")],
        );
    },
  );
});

describe("partial-update safety and traversal policies", () => {
  it.each([false, true])("checks required nullable input, nested: %s", async (nested) => {
    await tester
      .expect(
        `${service}
        model Details { value: string; }
        @patch op update(@body body: ${nested ? "{ details?: Details | null }" : "Details | null"}): void;
      `,
      )
      .toEmitDiagnostics(required(nested ? "details.value" : "value"));
  });
  it("does not exempt identity encoded away from the envelope path", async () => {
    await tester
      .expect(
        `${service}
        @patch op update(@body body: {
          @encodedName("application/json", "configuration") identity: { value: string };
        }): void;
      `,
      )
      .toEmitDiagnostics([required("configuration"), required("configuration.value")]);
  });
  it.each([
    ["boolean", "false"],
    ["int32", "0"],
    ["string", '""'],
    ["string", '"value"'],
  ])("checks %s default %s", async (type, value) => {
    await tester
      .expect(
        `${service}
        @patch op update(@body body: { value?: ${type} = ${value} }): void;
      `,
      )
      .toEmitDiagnostics(defaultValue("value"));
  });

  it.each([false, true])(
    "isolates explicit/implicit optionality in both orders (%s)",
    async (reverse) => {
      const explicit =
        '@route("/explicit") @patch(#{implicitOptionality: false}) op explicit(@body body: Patch): void;';
      const implicit = `${legacyPatch} @route("/implicit") @patch(#{implicitOptionality: true}) op implicit(@body body: Patch): void;`;
      await tester
        .expect(
          `${service}
      model Patch { value: string; }
      ${reverse ? implicit + explicit : explicit + implicit}
    `,
        )
        .toEmitDiagnostics(required("value"));
    },
  );

  it.each(["identity", "IDENTITY"])(
    "exempts top-level encoded %s safety, not shape",
    async (name) => {
      await tester
        .expect(
          `${service}
      @patch op update(@body body: {
        @encodedName("application/json", "${name}") envelope: { required: string; extra?: boolean = false; };
        nested?: { identity: string };
      }): { ${name}: { required: string }; nested: { identity: string }; };
    `,
        )
        .toEmitDiagnostics([missing(`${name}.extra`), required("nested.identity")]);
    },
  );

  it("applies safety outside identity when a model is shared across policies", async () => {
    await tester
      .expect(
        `${service}
      model Shared { value: string; enabled?: boolean = false; }
      @patch op update(@body body: { identity: Shared; other?: Shared }): void;
    `,
      )
      .toEmitDiagnostics([required("other.value"), defaultValue("other.enabled")]);
  });

  it("retargets every imported Page occurrence to its local use", async () => {
    await tester
      .expect(
        `${service}
      model Item { value?: string; }
      @patch op update(@body body: {
        /*first*/first?: Azure.Core.Page<Item>;
        /*second*/second?: Azure.Core.Page<Item>;
        identity: Azure.ResourceManager.CommonTypes.ManagedServiceIdentity;
      }): void;
    `,
      )
      .toEmitDiagnostics((x) => [
        { ...required("first.value"), pos: x.pos.first.pos },
        { ...required("second.value"), pos: x.pos.second.pos },
      ]);
  });

  it("terminates recursive layout comparison without skipping later siblings", async () => {
    await tester
      .expect(
        `${service}
      model Node { next?: Node; extra?: string; }
      model Resource { next?: Resource; }
      @patch op update(@body body: { first?: Node; second?: Node }):
        { first: Resource; second: Resource };
    `,
      )
      .toEmitDiagnostics([missing("first.extra"), missing("second.extra")]);
  });

  it("checks recursive policy transitions under identity and array elements", async () => {
    await tester
      .expect(
        `${service}
      model Node { value: string; next?: Node; }
      @patch op update(@body body: { identity: Node; nodes?: Node[]; other?: Node }): void;
    `,
      )
      .toEmitDiagnostics(required("other.value"));
  });

  it("permits required array element descendants but checks defaults and shape", async () => {
    await tester
      .expect(
        `${service}
      model Item { id: string; nested: { value: string }; enabled?: boolean = false; extra?: string; }
      @patch op update(@body body: { items?: Item[] }):
        { items: { id: string; nested: { value: string }; enabled: boolean }[] };
    `,
      )
      .toEmitDiagnostics([defaultValue("items[].enabled"), missing("items[].extra")]);
  });

  it("keeps visibility and HTTP item metadata active for array elements", async () => {
    await tester
      .expect(
        `${service}
      model Item { @header header: string; @visibility(Lifecycle.Create) created: string; }
      @parameterVisibility(Lifecycle.Create) @patch
      op update(@bodyRoot body: { items?: Item[] }): { items: { header: string; created: string }[] };
    `,
      )
      .toEmitDiagnostics(visibility("items[].created"));
  });

  it("does not exempt required array properties themselves", async () => {
    await tester
      .expect(
        `${service}
      @patch op update(@body body: { items: { value: string }[] }): void;
    `,
      )
      .toEmitDiagnostics(required("items"));
  });

  it.each([
    "Record<{ required: string; enabled?: boolean = false }>",
    "[{ required: string; enabled?: boolean = false }]",
    "{ a: string } | { b: string }",
  ])("does not expand excluded collection/union values: %s", async (type) => {
    await tester
      .expect(
        `${service}
      @patch op update(@body body: { value?: ${type} }): { value: string };
    `,
      )
      .toBeValid();
  });

  it("does not add array-versus-scalar type equality checks", async () => {
    await tester
      .expect(
        `${service}
      @patch op update(@body body: { value?: { id: string }[] }): { value: string };
    `,
      )
      .toBeValid();
  });
});

describe("native discriminators", () => {
  it.each(["", "kind?: string;", "@visibility(Lifecycle.Read) kind: string;"])(
    "does not synthesize or force discriminator properties: %s",
    async (property) => {
      await tester
        .expect(
          `${service}
        @discriminator("kind") model Patch { ${property} value?: string; }
        @patch op update(@body body: Patch): { kind?: string; value?: string; };
      `,
        )
        .toBeValid();
    },
  );
  it("does not synthesize a missing PATCH discriminator for shape comparison", async () => {
    await tester
      .expect(
        `${service}
      @discriminator("kind") model Patch { value?: string; }
      @patch op update(@body body: Patch): { value?: string };
    `,
      )
      .toBeValid();
  });
  it("does not synthesize a missing resource discriminator", async () => {
    await tester
      .expect(
        `${service}
      @discriminator("kind") model Resource { value?: string; }
      @patch op update(@body body: { kind?: string }): Resource;
    `,
      )
      .toEmitDiagnostics(missing("kind"));
  });
  it("checks an inherited required authored discriminator at its declaration", async () => {
    await tester
      .expect(
        `${service}
      @discriminator("kind") model Base { /*kind*/kind: string; }
      model Patch extends Base {}
      model Concrete extends Patch { kind: "concrete"; }
      @patch op update(@body body: Patch): Base;
    `,
      )
      .toEmitDiagnostics((x) => ({ ...required("kind"), pos: x.pos.kind.pos }));
  });
  it("respects implicit optionality for authored discriminators", async () => {
    await tester
      .expect(
        `${service}
      @discriminator("kind") model Patch { kind: string; }
      ${legacyPatch} @patch(#{implicitOptionality: true})
      op update(@body body: Patch): Patch;
    `,
      )
      .toBeValid();
  });
  it("excludes an inherited Read-only discriminator and respects never overrides", async () => {
    await tester
      .expect(
        `${service}
      @discriminator("kind") model Base { @visibility(Lifecycle.Read) kind: string; }
      model Patch extends Base { extra?: never; }
      model Concrete extends Patch { kind: "concrete"; }
      @patch op update(@body body: Patch): { value: string };
    `,
      )
      .toBeValid();
  });
  it("compares the authored inherited encoded object instead of synthetic metadata", async () => {
    await tester
      .expect(
        `${service}
      model Base { @encodedName("application/json", "kind") value?: { extra?: string }; }
      @discriminator("kind") model Patch extends Base {}
      @patch op update(@body body: { details?: Patch }): { details: { kind: string } };
    `,
      )
      .toEmitDiagnostics(missing("details.kind.extra"));
  });
  it("uses the authored inherited encoded resource discriminator shape", async () => {
    await tester
      .expect(
        `${service}
        model Base { @encodedName("application/json", "kind") value?: { extra?: string }; }
        @discriminator("kind") model Resource extends Base {}
        @patch op update(@body body: { details?: { kind?: { extra?: string } } }):
          { details: Resource };
      `,
      )
      .toBeValid();
  });
});

describe("resource selection", () => {
  it.each([200, 201])("uses PATCH %s", async (status) => {
    await tester
      .expect(
        `${service}
      @route("/widgets") @patch op update(@body body: { extra?: string }):
        { @statusCode status: ${status}; @body body: { value: string }; };
    `,
      )
      .toEmitDiagnostics(missing("extra"));
  });
  it.each([200, 201])("uses same-path GET %s for asynchronous PATCH", async (status) => {
    await tester
      .expect(
        `${service}
      @route("/widgets") @patch op update(@body body: { extra?: string }): AcceptedResponse;
      @route("/widgets") @get op read():
        { @statusCode status: ${status}; @body body: { value: string }; };
    `,
      )
      .toEmitDiagnostics(missing("extra"));
  });
  it("prefers PATCH 200 over PATCH 201 and GET", async () => {
    await tester
      .expect(
        `${service}
      @route("/widgets") @patch op update(@body body: { extra?: string }):
        { @statusCode status: 200; @body body: string } |
        { @statusCode status: 201; @body body: { extra: string } };
      @route("/widgets") @get op read(): { extra: string };
    `,
      )
      .toEmitDiagnostics(missing("extra"));
  });
  it.each(["", '@route("/different") @get op read(): { value: string };'])(
    "skips only shape when no comparison resource exists: %s",
    async (get) => {
      await tester
        .expect(
          `${service}
        @route("/widgets") @patch op update(@body body: { value: string }): AcceptedResponse;
        ${get}
      `,
        )
        .toEmitDiagnostics(required("value"));
    },
  );
  it.each([false, true])("prefers explicit resource association, async: %s", async (async) => {
    await tester
      .expect(
        `${service}
      model Resource { value: string; }
      @TypeSpec.Rest.updatesResource(Resource)
      @route("/widgets") @patch op update(@body body: { extra?: string }):
        ${async ? "AcceptedResponse" : "{ extra: string }"};
      @route("/widgets") @get op read(): { extra: string };
    `,
      )
      .toEmitDiagnostics(missing("extra"));
  });
  it("uses an associated resource for 202-only PATCH without GET", async () => {
    await tester
      .expect(
        `${service}
      model Resource { value: string; }
      @TypeSpec.Rest.updatesResource(Resource) @patch
      op update(@body body: { extra?: string }): AcceptedResponse;
    `,
      )
      .toEmitDiagnostics(missing("extra"));
  });
  it.each([false, true])("uses status ranges after exact codes (exact: %s)", async (exact) => {
    await tester
      .expect(
        `${service}
      model Range {
        @minValue(200) @maxValue(299) @statusCode status: int32;
        @body body: { ${exact ? "extra" : "value"}: string };
      }
      model Exact { @statusCode status: 200; @body body: { value: string }; }
      @patch op update(@body body: { extra?: string }): Range ${exact ? "| Exact" : ""};
    `,
      )
      .toEmitDiagnostics(missing("extra"));
  });
  it("prefers PATCH 201 over same-path GET 200", async () => {
    await tester
      .expect(
        `${service}
      @route("/widgets") @patch op update(@body body: { extra?: string }):
        { @statusCode status: 201; @body body: { value: string } };
      @route("/widgets") @get op read(): { extra: string };
    `,
      )
      .toEmitDiagnostics(missing("extra"));
  });
  it("prefers GET 200 over GET 201", async () => {
    await tester
      .expect(
        `${service}
      @route("/widgets") @patch op update(@body body: { extra?: string }): AcceptedResponse;
      @route("/widgets") @get op read():
        { @statusCode status: 200; @body body: { value: string } } |
        { @statusCode status: 201; @body body: { extra: string } };
    `,
      )
      .toEmitDiagnostics(missing("extra"));
  });
});

describe("scope and registration", () => {
  it("excludes imported library operations but checks project operations", async () => {
    const instance = await Tester.files({
      "node_modules/patch-library/package.json": JSON.stringify({
        name: "patch-library",
        version: "1.0.0",
        tspMain: "./lib.tsp",
      }),
      "node_modules/patch-library/lib.tsp": `
        import "@typespec/http";
        import "@azure-tools/typespec-azure-resource-manager";
        @Azure.ResourceManager.armProviderNamespace
        namespace Microsoft.Imported {
          @TypeSpec.Http.patch op update(@TypeSpec.Http.body body: { libraryOnly: string }): void;
        }
      `,
    })
      .import("patch-library")
      .createInstance();
    const libraryTester = createLinterRuleTester(
      instance,
      noUnsafePatchBodyPropertiesRule,
      "tsp-lintdiff-local-linter",
    );
    await libraryTester
      .expect(`${service} @patch op update(@body body: { value: string }): void;`)
      .toEmitDiagnostics(required("value"));
  });
  it("excludes uninstantiated templates without skipping concrete project operations", async () => {
    await tester
      .expect(
        `${service}
        @patch op template<T>(@body body: { templateOnly: string; detail?: T }): void;
        @patch op update(@body body: { value: string }): void;
      `,
      )
      .toEmitDiagnostics(required("value"));
  });
  it.each([
    '@header contentType: "multipart/form-data", @multipartBody body: { required: HttpPart<string> }',
    '@header contentType: "multipart/form-data", @multipartBody body: [HttpPart<string, #{name: "required"}>]',
    "@bodyRoot body: File",
    '@header contentType: "application/octet-stream", @body body: bytes',
  ])("does not inspect transport payload: %s", async (parameters) => {
    await tester.expect(`${service} @patch op update(${parameters}): void;`).toBeValid();
  });

  describe("native scope independent of emitter settings", () => {
    beforeEach(async () => {
      const instance = await createTester(resolvePath(import.meta.dirname, "../.."), {
        libraries: [
          "@typespec/http",
          "@typespec/openapi",
          "@typespec/rest",
          "@typespec/versioning",
          "@azure-tools/typespec-azure-core",
          "@azure-tools/typespec-azure-resource-manager",
          "@azure-tools/typespec-client-generator-core",
        ],
      })
        .importLibraries()
        .createInstance();
      tester = createLinterRuleTester(
        instance,
        noUnsafePatchBodyPropertiesRule,
        "tsp-lintdiff-local-linter",
      );
    });
    it.each([
      [
        "property",
        'model Patch { @Azure.ClientGenerator.Core.scope("csharp") extra?: string; } @patch op update(@body body: Patch): { value: string };',
      ],
      [
        "operation",
        '@Azure.ClientGenerator.Core.scope("csharp") @patch op update(@body body: { extra?: string }): { value: string };',
      ],
      [
        "GET fallback",
        '@route("/widgets") @patch op update(@body body: { extra?: string }): AcceptedResponse; @route("/widgets") @Azure.ClientGenerator.Core.scope("csharp") @get op read(): { value: string };',
      ],
    ])("checks %s scoped away from AutoRest", async (_, snippet) => {
      await tester.expect(`${service}${snippet}`).toEmitDiagnostics(missing("extra"));
    });
    it("uses a matching response property scoped away from AutoRest", async () => {
      await tester
        .expect(
          `${service}
        model Resource { @Azure.ClientGenerator.Core.scope("csharp") value: string; }
        @patch op update(@body body: { value?: string }): Resource;
      `,
        )
        .toBeValid();
    });
  });

  describe("existing ARM rule interactions", () => {
    const definitions = `${service}
      using TypeSpec.Rest;
      using Azure.ResourceManager;
      model Widget is TrackedResource<{ value?: string }> {
        @key("widgetName") @segment("widgets") @path name: string;
      }
    `;
    it("preserves overlapping arm-resource-patch subset diagnostics", async () => {
      const snippet = `${definitions}
        model Patch { tags?: Record<string>; extra?: string; }
        @armResourceOperations interface Widgets {
          update is ArmCustomPatchSync<Widget, Patch>;
        }
      `;
      await tester.expect(snippet).toEmitDiagnostics(missing("extra"));
      const existing = createLinterRuleTester(
        await Tester.createInstance(),
        patchOperationsRule,
        "@azure-tools/typespec-azure-resource-manager",
      );
      await existing.expect(snippet).toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-patch",
        message:
          "Resource PATCH models must be a subset of the resource type. The following properties: [extra] do not exist in resource Model 'Widget'.",
      });
    });
    it("leaves required envelope presence to patch-envelope", async () => {
      const snippet = `${definitions}
        model Patch { properties?: { value?: string }; }
        @armResourceOperations interface Widgets {
          createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
          update is ArmCustomPatchSync<Widget, Patch>;
        }
      `;
      await tester.expect(snippet).toBeValid();
      const existing = createLinterRuleTester(
        await Tester.createInstance(),
        patchEnvelopePropertiesRules,
        "@azure-tools/typespec-azure-resource-manager",
      );
      await existing.expect(snippet).toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/patch-envelope",
        message:
          "The Resource PATCH request for resource 'Widget' is missing envelope properties:  [tags]. Since these properties are supported in the resource, they must also be updatable via PATCH.",
      });
    });
  });
  it("checks nested provider namespaces and excludes unrelated services", async () => {
    await tester
      .expect(
        `
      using TypeSpec.Http;
      @service namespace Other { @patch op other(@body body: { value: string }): void; }
      @Azure.ResourceManager.armProviderNamespace @service namespace Microsoft.TestService {
        namespace Nested { @patch op update(@body body: { value: string }): void; }
      }
    `,
      )
      .toEmitDiagnostics(required("value"));
  });
  it("registers only the combined rule and leaves PATCH-to-PUT separate", () => {
    const names = $linter.rules.map((r) => r.name);
    expect(names).toContain("no-unsafe-patch-body-properties");
    expect(names).toContain("patch-properties-correspond-to-put-properties");
    expect(names).not.toContain("patch-body-parameters-schema");
    expect(names).not.toContain("consistent-patch-properties");
    expect(names).not.toContain("unsupported-patch-properties");
  });
});
