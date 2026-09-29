import { resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { describe, it, vi } from "vitest";
import { operationIdNounConflictingModelNamesRule } from "../../src/rules/operation-id-noun-conflicting-model-names.js";

vi.mock("@azure-tools/typespec-autorest", () => {
  throw new Error("Native lint must not load the AutoRest emitter.");
});

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
    "@azure-tools/typespec-client-generator-core",
  ],
}).importLibraries();

async function tester() {
  return createLinterRuleTester(
    await Tester.createInstance(),
    operationIdNounConflictingModelNamesRule,
    "tsp-lintdiff-local-linter",
  );
}

const header = `
using TypeSpec.Http;
using Azure.ClientGenerator.Core;
@service namespace Example;
`;

const diagnostic = {
  code: "tsp-lintdiff-local-linter/operation-id-noun-conflicting-model-names",
  message:
    "Operation ID noun 'Widget' conflicts with the schema type 'Widget'. Consider a plural noun to avoid disambiguation in generated clients.",
};

describe("operation-id-noun-conflicting-model-names", () => {
  it("reports an interface group that collides with a reachable response model", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget { id: string; }
        namespace Operations {
          interface Widget {
            @get @route("/widgets") op read(): Example.Widget;
          }
        }`,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("finds request models referenced by another operation", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget { id: string; }
        namespace Operations {
          interface Widget {
            @get @route("/widgets") op read(): string;
          }
          interface Updates {
            @post @route("/updates") op update(@body body: Example.Widget): string;
          }
        }`,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("ignores schema types used only by non-body parameters", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        scalar Widget extends string;
        namespace Operations {
          interface Widget {
            @get @route("/widgets") op read(@query query: Example.Widget): string;
          }
        }`,
      )
      .toBeValid();
  });

  it("ignores schema types used only by response headers", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        scalar Widget extends string;
        namespace Operations {
          interface Widget {
            @get @route("/widgets") op read(): {
              @header widget: Example.Widget;
            };
          }
        }`,
      )
      .toBeValid();
  });

  it("uses the containing namespace for operations without an interface", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget { id: string; }
        namespace Operations.Widget {
          @get @route("/widgets") op read(): Example.Widget;
        }`,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("reports an overridden client location colliding with a model", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget { id: string; }
        interface Widgets {
          @get @route("/widgets") op read(): Widget;
        }
        @@clientLocation(Widgets.read, "Widget", "!javascript");
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("uses the first operation ID segment of an underscored client location", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget { id: string; }
        interface Widgets {
          @get @route("/widgets") op read(): Widget;
        }
        @@clientLocation(Widgets.read, "Widget_Admin", "!javascript");
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("uses the first operation ID segment of an underscored interface name", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget { id: string; }
        interface Widget_Admin {
          @get @route("/widgets") op read(): Widget;
        }
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("uses the client name override of an operation's interface", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget { id: string; }
        interface Widgets {
          @get @route("/widgets") op read(): Widget;
        }
        @@clientName(Widgets, "Widget");
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("uses an underscored direct operation name as the effective operation ID", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget { id: string; }
        @get @route("/widgets") op Widget_read(): Widget;
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("uses an underscored client name override on a direct operation", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget { id: string; }
        @get @route("/widgets") op read(): Widget;
        @@clientName(read, "Widget_read", "!javascript");
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("uses the operation name when a client location is the service namespace", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget { id: string; }
        namespace Operations {
          interface Widgets {
            @get @route("/widgets") op Widget_read(): Example.Widget;
          }
        }
        @@clientLocation(Operations.Widgets.Widget_read, Example, "!javascript");
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("uses the overridden name of a typed client location", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget { id: string; }
        interface Widgets {
          @get @route("/widgets") op read(): Widget;
        }
        interface OtherGroup {}
        @@clientName(OtherGroup, "Widget", "!javascript");
        @@clientLocation(Widgets.read, OtherGroup, "!javascript");
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("ignores a client name override scoped only to another emitter", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget { id: string; }
        interface Widgets {
          @get @route("/widgets") op read(): Widget;
        }
        @@clientName(Widgets, "Widget", "javascript");
      `,
      )
      .toBeValid();
  });

  it("compares the effective model name when it is overridden", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget { id: string; }
        interface Widgets {
          @get @route("/widgets") op read(): Widget;
        }
        @@clientName(Widget, "Widgets");
      `,
      )
      .toEmitDiagnostics([
        {
          ...diagnostic,
          message:
            "Operation ID noun 'Widgets' conflicts with the schema type 'Widgets'. Consider a plural noun to avoid disambiguation in generated clients.",
        },
      ]);
  });

  it("does not warn when a model client name removes an authored name collision", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget { id: string; }
        namespace Operations {
          interface Widget {
            @get @route("/widgets") op read(): Example.Widget;
          }
        }
        @@clientName(Example.Widget, "widget");
      `,
      )
      .toBeValid();
  });

  it("does not apply a model name override scoped only to another emitter", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget { id: string; }
        namespace Operations {
          interface Widget {
            @get @route("/widgets") op read(): Example.Widget;
          }
        }
        @@clientName(Example.Widget, "widget", "javascript");
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("reports a named scalar definition colliding with an operation group", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        scalar Widget extends string;
        namespace Operations {
          interface Widget {
            @get @route("/widgets") op read(): Example.Widget;
          }
        }
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("reports a named enum definition colliding with an operation group", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        enum Widget { one }
        namespace Operations {
          interface Widget {
            @get @route("/widgets") op read(): Example.Widget;
          }
        }
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("reports a named union definition colliding with an operation group", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        union Widget { "one", "two" }
        namespace Operations {
          interface Widget {
            @get @route("/widgets") op read(): Example.Widget;
          }
        }
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("does not count an ARM common-type model as a local definition", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        using Azure.ResourceManager;
        @@armProviderNamespace(Example, "Microsoft.Example");
        model Widget is PrivateEndpointConnectionResource;
        namespace Operations {
          interface Widget {
            @get @route("/widgets") op read(): Example.Widget;
          }
        }`,
      )
      .toBeValid();
  });

  it("still reports a local model alongside an ARM common-type model", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        using Azure.ResourceManager;
        @@armProviderNamespace(Example, "Microsoft.Example");
        model Widget is PrivateEndpointConnectionResource;
        model Operation { id: string; }
        namespace Operations {
          interface Widget {
            @get @route("/widgets") op read(): Example.Widget;
          }
          interface Operation {
            @get @route("/operations") op read(): Example.Operation;
          }
        }`,
      )
      .toEmitDiagnostics([
        {
          ...diagnostic,
          message:
            "Operation ID noun 'Operation' conflicts with the schema type 'Operation'. Consider a plural noun to avoid disambiguation in generated clients.",
        },
      ]);
  });

  it("traverses local child models referenced by ARM common types", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        using Azure.ResourceManager.CommonTypes.Private;
        model Child { id: string; }
        @armCommonDefinition("Widget")
        model Widget { child: Child; }
        namespace Operations {
          interface Child {
            @get @route("/widgets") op read(): Example.Widget;
          }
        }`,
      )
      .toEmitDiagnostics([
        {
          ...diagnostic,
          message:
            "Operation ID noun 'Child' conflicts with the schema type 'Child'. Consider a plural noun to avoid disambiguation in generated clients.",
        },
      ]);
  });

  it("recognizes a client location on a direct service operation", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget { id: string; }
        @get @route("/widgets") op read(): Widget;
        @@clientLocation(read, "Widget");
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("does not warn when an override moves a colliding interface to a different group", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget { id: string; }
        namespace Operations {
          interface Widget {
            @get @route("/widgets") op read(): Example.Widget;
          }
        }
        @@clientLocation(Operations.Widget.read, "Widgets");
      `,
      )
      .toBeValid();
  });

  it("does not treat the service namespace as an operation group", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Example { id: string; }
        @get @route("/example") op read(): Example;
      `,
      )
      .toBeValid();
  });

  it("reports a derived response model emitted with its base model", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Base { id: string; }
        model Widget extends Base { name: string; }
        namespace Operations {
          interface Widget {
            @get @route("/widgets") op read(): Example.Base;
          }
        }`,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("ignores a derived template declaration that is not emitted", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Base { id: string; }
        model Widget<T> extends Base { value: T; }
        namespace Operations {
          interface Widget {
            @get @route("/widgets") op read(): Example.Base;
          }
        }`,
      )
      .toBeValid();
  });

  it("ignores unused declarations and differently named groups", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget { id: string; }
        interface Widgets {
          @get @route("/widgets") op read(): string;
        }
        namespace Operations {
          interface Widget {
            @get @route("/other") op read(): string;
          }
        }`,
      )
      .toBeValid();
  });

  it("does not mistake a nested model name for a root service model", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        namespace Models { model Widget { id: string; } }
        interface Widget {
          @get @route("/widgets") op read(): Models.Widget;
        }`,
      )
      .toBeValid();
  });

  it("does not compare an operation with models from another service", async () => {
    await (
      await tester()
    )
      .expect(
        `
        using TypeSpec.Http;
        @service namespace First {
          model Widget { id: string; }
          @get @route("/first") op read(): Widget;
        }
        @service namespace Second {
          interface Widget {
            @get @route("/second") op read(): string;
          }
        }`,
      )
      .toBeValid();
  });

  it("handles recursive models without reporting multiple times", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Widget { next?: Widget; }
        namespace Operations {
          interface Widget {
            @get @route("/widgets") op read(): Example.Widget;
          }
        }`,
      )
      .toEmitDiagnostics([diagnostic]);
  });
});
