import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import {
  createLinterRuleTester,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, expect, it, vi } from "vitest";
import { noRepeatedPathInfoRule } from "../../src/rules/no-repeated-path-info.js";

vi.mock("@azure-tools/typespec-autorest", () => {
  throw new Error("Native lint must not load the AutoRest emitter.");
});
vi.mock("@azure-tools/typespec-client-generator-core", () => {
  throw new Error("Native lint must not load TCGC.");
});

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noRepeatedPathInfoRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

function diagnostic(name = "widgetName") {
  return {
    code: "@azure-tools/typespec-azure-resource-manager/no-repeated-path-info",
    severity: "warning" as const,
    message: `Request body property '${name}' repeats information already carried in the path or query.`,
  };
}

function armResource(properties: string, parameters = "{}") {
  return `
    @armProviderNamespace
    namespace Microsoft.Contoso;

    model Widget is TrackedResource<WidgetProperties> {
      @key("widgetName") @segment("widgets") @path name: string;
    }
    model WidgetProperties { ${properties} }

    @armResourceOperations
    interface Widgets {
      createOrUpdate is ArmResourceCreateOrReplaceSync<
        Widget, Foundations.DefaultBaseParameters<Widget>, ${parameters}
      >;
    }
  `;
}

const operation = `
  @put @route("/widgets/{widgetName}")
  op create(@path widgetName: string, @body body: { properties: Properties }): void;
`;

it("reports a path name repeated in ARM PUT resource properties", async () => {
  await tester.expect(armResource("widgetName?: string;")).toEmitDiagnostics([diagnostic()]);
});

it("targets the repeated authored property, including inherited properties", async () => {
  await tester
    .expect(
      `
      ${operation}
      model Base { /*repeated*/widgetName?: string; }
      model Properties extends Base {}
    `,
    )
    .toEmitDiagnostics(({ repeated }) => ({
      ...diagnostic(),
      pos: getSourceLocation(repeated).pos,
      end: getSourceLocation(repeated).end,
    }));
});

it("reports a query name repeated in ARM PUT resource properties", async () => {
  await tester
    .expect(armResource("mode?: string;", "{ @query mode?: string; }"))
    .toEmitDiagnostics([diagnostic("mode")]);
});

it("reports each repeated ARM path name", async () => {
  await tester
    .expect(armResource("widgetName?: string; resourceGroupName?: string;"))
    .toEmitDiagnostics([diagnostic(), diagnostic("resourceGroupName")]);
});

it("reports a repeated tenant resource path name", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      @tenantResource
      model TenantConfig is ProxyResource<{ configName?: string; setting?: string; }> {
        @key("configName") @segment("configurations") @path name: string;
      }
      @armResourceOperations
      interface TenantConfigs {
        createOrUpdate is ArmResourceCreateOrReplaceSync<
          TenantConfig, Foundations.TenantBaseParameters
        >;
      }
    `,
    )
    .toEmitDiagnostics([diagnostic("configName")]);
});

it("allows ARM PUT properties with no repeated names", async () => {
  await tester.expect(armResource("description?: string; sku?: string;")).toBeValid();
});

it("ignores repeated top-level body properties", async () => {
  await tester
    .expect(
      `
      @put @route("/widgets/{widgetName}")
      op create(@path widgetName: string,
        @body body: { widgetName?: string; properties: { description?: string } }): void;
    `,
    )
    .toBeValid();
});

it("ignores repeated properties in PATCH bodies", async () => {
  await tester
    .expect(
      `
      @patch @route("/widgets/{widgetName}")
      op update(@path widgetName: string,
        @body body: { properties: { widgetName?: string } }): void;
    `,
    )
    .toBeValid();
});

it("allows a JSON alias that alone repeats a path name", async () => {
  await tester
    .expect(armResource('@encodedName("application/json", "widgetName") otherName?: string;'))
    .toBeValid();
});

it("reports an authored name even when its JSON alias differs", async () => {
  await tester
    .expect(armResource('@encodedName("application/json", "otherName") widgetName?: string;'))
    .toEmitDiagnostics([diagnostic()]);
});

it("uses supported HTTP parameter names rather than parameter source identifiers", async () => {
  await tester
    .expect(
      `
      model Properties { wirePath?: string; wireQuery?: string; pathSource?: string; }
      @put @route("/widgets/{wirePath}")
      op create(@path("wirePath") pathSource: string, @query("wireQuery") querySource: string,
        @body body: { properties: Properties }): void;
    `,
    )
    .toEmitDiagnostics([diagnostic("wirePath"), diagnostic("wireQuery")]);
});

it("classifies a path/query wire-name collision as already rejected by HTTP", async () => {
  const [, diagnostics] = await runner.compileAndDiagnose(`
    ${operation.replace("@body body:", '@query("widgetName") queryName: string, @body body:')}
    model Properties { widgetName?: string; }
  `);
  expect(diagnostics.map(({ code }) => code)).toEqual(["@typespec/http/incompatible-uri-param"]);
});

it("does not recurse into cycles or shared sibling models", async () => {
  await tester
    .expect(
      `
      ${operation}
      model Nested { widgetName?: string; parent?: Properties; }
      model Properties { self?: Properties; first?: Nested; second?: Nested; }
    `,
    )
    .toBeValid();
});

it("reports a shared declaration once per PUT operation at the same source target", async () => {
  await tester
    .expect(
      `
      ${operation}
      model Properties { /*repeated*/widgetName?: string; }
      @put @route("/other/{widgetName}")
      op other(@path widgetName: string, @body body: { properties: Properties }): void;
    `,
    )
    .toEmitDiagnostics(({ repeated }) =>
      [1, 2].map(() => ({
        ...diagnostic(),
        pos: getSourceLocation(repeated).pos,
        end: getSourceLocation(repeated).end,
      })),
    );
});

it("reports project-imported properties at their imported declaration", async () => {
  const importedTester = createLinterRuleTester(
    await Tester.import("./models.tsp").createInstance(),
    noRepeatedPathInfoRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
  await importedTester
    .expect({
      "main.tsp": operation,
      "models.tsp": "model Properties { /*repeated*/widgetName?: string; }",
    })
    .toEmitDiagnostics(({ repeated }) => ({
      ...diagnostic(),
      pos: getSourceLocation(repeated).pos,
      end: getSourceLocation(repeated).end,
    }));
});

it("ignores missing bodies, non-model bodies, and missing or non-model properties bags", async () => {
  await tester
    .expect(
      `
      @put @route("/none/{widgetName}")
      op noBody(@path widgetName: string): void;
      @put @route("/string/{widgetName}")
      op stringBody(@path widgetName: string, @body body: string): void;
      @put @route("/missing/{widgetName}")
      op missingBag(@path widgetName: string, @body body: { description?: string }): void;
      @put @route("/scalar/{widgetName}")
      op scalarBag(@path widgetName: string, @body body: { properties: string }): void;
    `,
    )
    .toBeValid();
});

it("skips template sources but checks their concrete aliases", async () => {
  await tester
    .expect(
      `
      model Properties { widgetName?: string; }
      @put op Template<T>(@path widgetName: string, @body body: { properties: T }): void;
      interface Templates<T> {
        @put op create(@path widgetName: string, @body body: { properties: T }): void;
      }
      @route("/widgets/{widgetName}") op create is Template<Properties>;
    `,
    )
    .toEmitDiagnostics([diagnostic()]);
});

it("checks ordinary project namespaces without provider metadata", async () => {
  await tester
    .expect(`namespace Contoso; ${operation} model Properties { widgetName?: string; }`)
    .toEmitDiagnostics([diagnostic()]);
});

it("checks nested project namespaces without provider metadata", async () => {
  await tester
    .expect(`namespace Contoso.Nested; ${operation} model Properties { widgetName?: string; }`)
    .toEmitDiagnostics([diagnostic()]);
});
