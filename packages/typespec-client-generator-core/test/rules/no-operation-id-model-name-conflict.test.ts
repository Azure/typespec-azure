import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it, vi } from "vitest";
import { noOperationIdModelNameConflictRule } from "../../src/rules/no-operation-id-model-name-conflict.js";
import { ArmTester } from "../tester.js";

vi.mock("@azure-tools/typespec-autorest", () => {
  throw new Error("The native rule must not load the AutoRest emitter.");
});

let tester: LinterRuleTester;
const header = `@service namespace Example;`;
const diagnostic = (noun: string) => ({
  code: "@azure-tools/typespec-client-generator-core/no-operation-id-model-name-conflict",
  message: `Operation ID noun '${noun}' conflicts with the schema type '${noun}'. Consider a plural noun to avoid disambiguation in generated clients.`,
});

beforeEach(async () => {
  const runner = await ArmTester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noOperationIdModelNameConflictRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

describe("no-operation-id-model-name-conflict", () => {
  it("reports an interface group colliding with a reachable response model", async () => {
    await tester
      .expect(
        `${header}
      model Widget { id: string; }
      namespace Operations {
        interface Widget { @get @route("/widgets") op read(): Example.Widget; }
      }`,
      )
      .toEmitDiagnostics([diagnostic("Widget")]);
  });

  it("finds request-body types referenced by another operation", async () => {
    await tester
      .expect(
        `${header}
      model Widget { id: string; }
      namespace Operations {
        interface Widget { @get @route("/widgets") op read(): string; }
        interface Updates { @post @route("/updates") op update(@body body: Example.Widget): string; }
      }`,
      )
      .toEmitDiagnostics([diagnostic("Widget")]);
  });

  it("does not count scalar types used only in query parameters or response headers", async () => {
    await tester
      .expect(
        `${header}
      scalar Widget extends string;
      namespace Operations {
        interface Widget {
          @get @route("/widgets") op read(@query query: Example.Widget): {
            @header value: Example.Widget;
          };
        }
      }`,
      )
      .toBeValid();
  });

  it("uses the nested namespace for operations without an interface", async () => {
    await tester
      .expect(
        `${header}
      model Widget { id: string; }
      namespace Operations.Widget {
        @get @route("/widgets") op read(): Example.Widget;
      }`,
      )
      .toEmitDiagnostics([diagnostic("Widget")]);
  });

  it("uses an AutoRest-scoped client location and its first ID segment", async () => {
    await tester
      .expect(
        `${header}
      model Widget { id: string; }
      interface Widgets { @get @route("/widgets") op read(): Widget; }
      @@clientLocation(Widgets.read, "Widget_Admin", "!javascript");`,
      )
      .toEmitDiagnostics([diagnostic("Widget")]);
  });

  it("uses the first segment of an underscored interface name", async () => {
    await tester
      .expect(
        `${header}
      model Widget { id: string; }
      interface Widget_Admin { @get @route("/widgets") op read(): Widget; }`,
      )
      .toEmitDiagnostics([diagnostic("Widget")]);
  });

  it("uses an overridden interface name or a typed client location", async () => {
    await tester
      .expect(
        `${header}
      model Widget { id: string; }
      interface Widgets { @get @route("/widgets") op read(): Widget; }
      @@clientName(Widgets, "Widget");`,
      )
      .toEmitDiagnostics([diagnostic("Widget")]);
    await tester
      .expect(
        `${header}
      model Widget { id: string; }
      interface Widgets { @get @route("/widgets") op read(): Widget; }
      interface OtherGroup {}
      @@clientName(OtherGroup, "Widget", "!javascript");
      @@clientLocation(Widgets.read, OtherGroup, "!javascript");`,
      )
      .toEmitDiagnostics([diagnostic("Widget")]);
  });

  it("ignores client overrides scoped exclusively to other emitters", async () => {
    await tester
      .expect(
        `${header}
      model Widget { id: string; }
      interface Widgets { @get @route("/widgets") op read(): Widget; }
      @@clientName(Widgets, "Widget", "javascript");`,
      )
      .toBeValid();
  });

  it("recognizes an underscored direct operation or an overridden operation name", async () => {
    await tester
      .expect(
        `${header}
      model Widget { id: string; }
      @get @route("/widgets") op Widget_read(): Widget;`,
      )
      .toEmitDiagnostics([diagnostic("Widget")]);
    await tester
      .expect(
        `${header}
      model Widget { id: string; }
      @get @route("/widgets") op read(): Widget;
      @@clientName(read, "Widget_read", "!javascript");`,
      )
      .toEmitDiagnostics([diagnostic("Widget")]);
  });

  it("uses the direct operation name when its location is the service namespace", async () => {
    await tester
      .expect(
        `${header}
      model Widget { id: string; }
      namespace Operations {
        interface Widgets { @get @route("/widgets") op Widget_read(): Example.Widget; }
      }
      @@clientLocation(Operations.Widgets.Widget_read, Example, "!javascript");`,
      )
      .toEmitDiagnostics([diagnostic("Widget")]);
  });

  it("does not infer an operation group from the service namespace", async () => {
    await tester
      .expect(
        `${header}
      model Example { id: string; }
      @get @route("/example") op read(): Example;`,
      )
      .toBeValid();
  });

  it("recognizes an explicit location for a direct service operation", async () => {
    await tester
      .expect(
        `${header}
      model Widget { id: string; }
      @get @route("/widgets") op read(): Widget;
      @@clientLocation(read, "Widget");`,
      )
      .toEmitDiagnostics([diagnostic("Widget")]);
  });

  it("uses model client names rather than authored names", async () => {
    await tester
      .expect(
        `${header}
      model Widget { id: string; }
      interface Widgets { @get @route("/widgets") op read(): Widget; }
      @@clientName(Widget, "Widgets");`,
      )
      .toEmitDiagnostics([diagnostic("Widgets")]);
    await tester
      .expect(
        `${header}
      model Widget { id: string; }
      namespace Operations {
        interface Widget { @get @route("/widgets") op read(): Example.Widget; }
      }
      @@clientName(Example.Widget, "widget");`,
      )
      .toBeValid();
  });

  it("does not apply model names scoped only to other emitters", async () => {
    await tester
      .expect(
        `${header}
      model Widget { id: string; }
      namespace Operations {
        interface Widget { @get @route("/widgets") op read(): Example.Widget; }
      }
      @@clientName(Example.Widget, "widget", "javascript");`,
      )
      .toEmitDiagnostics([diagnostic("Widget")]);
  });

  it("reports named scalar, enum and union definitions when used as bodies", async () => {
    for (const declaration of [
      "scalar Widget extends string;",
      "enum Widget { one }",
      'union Widget { "one", "two" }',
    ]) {
      await tester
        .expect(
          `${header}
        ${declaration}
        namespace Operations {
          interface Widget { @get @route("/widgets") op read(): Example.Widget; }
        }`,
        )
        .toEmitDiagnostics([diagnostic("Widget")]);
    }
  });

  it("excludes ARM common models while retaining service-local models", async () => {
    await tester
      .expect(
        `${header}
      @@armProviderNamespace(Example, "Microsoft.Example");
      model Widget is PrivateEndpointConnectionResource;
      model Operation { id: string; }
      namespace Operations {
        interface Widget { @get @route("/widgets") op read(): Example.Widget; }
        interface Operation { @get @route("/operations") op read(): Example.Operation; }
      }`,
      )
      .toEmitDiagnostics([diagnostic("Operation")]);
  });

  it("continues into children of ARM common types", async () => {
    await tester
      .expect(
        `${header}
      using Azure.ResourceManager.CommonTypes.Private;
      model Child { id: string; }
      @armCommonDefinition("Widget")
      model Widget { child: Child; }
      namespace Operations {
        interface Child { @get @route("/widgets") op read(): Example.Widget; }
      }`,
      )
      .toEmitDiagnostics([diagnostic("Child")]);
  });

  it("counts derived response models but not uninstantiated derived templates", async () => {
    await tester
      .expect(
        `${header}
      model Base { id: string; }
      model Widget extends Base { name: string; }
      namespace Operations {
        interface Widget { @get @route("/widgets") op read(): Base; }
      }`,
      )
      .toEmitDiagnostics([diagnostic("Widget")]);
    await tester
      .expect(
        `${header}
      model Base { id: string; }
      model Widget<T> extends Base { value: T; }
      namespace Operations {
        interface Widget { @get @route("/widgets") op read(): Base; }
      }`,
      )
      .toBeValid();
  });

  it("avoids unused, nested and other-service schema names", async () => {
    await tester
      .expect(
        `${header}
      model Widget { id: string; }
      namespace Operations {
        interface Widget { @get @route("/widgets") op read(): string; }
      }
      namespace Models { model Token { id: string; } }
      interface Token { @get @route("/tokens") op read(): Models.Token; }`,
      )
      .toBeValid();
    await tester
      .expect(
        `@service namespace First {
        model Widget { id: string; }
        @get @route("/first") op read(): Widget;
      }
      @service namespace Second {
        interface Widget { @get @route("/second") op read(): string; }
      }`,
      )
      .toBeValid();
  });

  it("traverses cycles and shared models once while reporting per colliding operation", async () => {
    await tester
      .expect(
        `${header}
      model Widget { next?: Widget; left?: Child; right?: Child; }
      model Child { parent?: Widget; }
      namespace Operations {
        interface Widget {
          @get @route("/widgets") op first(): Example.Widget;
          @get @route("/widgets/second") op second(): Example.Widget;
        }
      }`,
      )
      .toEmitDiagnostics([diagnostic("Widget"), diagnostic("Widget")]);
  });

  it("accepts a plural group and a renamed noncolliding group", async () => {
    await tester
      .expect(
        `${header}
      model Widget { id: string; }
      namespace Operations {
        interface Widgets {
          @get @route("/widgets") op read(): Example.Widget;
        }
      }`,
      )
      .toBeValid();
    await tester
      .expect(
        `${header}
      model Widget { id: string; }
      namespace Operations {
        interface Widget {
          @get @route("/widgets") op read(): Example.Widget;
        }
      }
      @@clientLocation(Operations.Widget.read, "Widgets");`,
      )
      .toBeValid();
  });
});
