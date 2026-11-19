import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import {
  createLinterRuleTester,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noRepeatedPathInfoRule } from "../../src/rules/no-repeated-path-info.js";

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

function armResource(properties: string, parameters?: string) {
  return `
    @armProviderNamespace
    namespace Microsoft.Contoso;

    model Widget is TrackedResource<WidgetProperties> {
      @key("widgetName") @segment("widgets") @path name: string;
    }
    model WidgetProperties { ${properties} }

    @armResourceOperations
    interface Widgets {
      createOrUpdate is ArmResourceCreateOrReplaceSync<Widget${parameters === undefined ? "" : `, Parameters = ${parameters}`}>;
    }
  `;
}

const operation = `
  @put @route("/widgets/{widgetName}")
  op create(@path widgetName: string, @body body: { properties: Properties }): void;
`;

it("reports a path name repeated in ARM PUT resource properties", async () => {
  await tester
    .expect(armResource("/*repeated*/widgetName?: string;"))
    .toEmitDiagnostics(({ repeated }) => ({
      ...diagnostic(),
      pos: getSourceLocation(repeated).pos,
      end: getSourceLocation(repeated).end,
    }));
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
          TenantConfig, BaseParameters = Foundations.TenantBaseParameters
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

it("reports a JSON alias that alone repeats a path name", async () => {
  await tester
    .expect(armResource('@encodedName("application/json", "widgetName") otherName?: string;'))
    .toEmitDiagnostics([diagnostic()]);
});

it("allows an authored name when its JSON alias does not repeat a path name", async () => {
  await tester
    .expect(armResource('@encodedName("application/json", "otherName") widgetName?: string;'))
    .toBeValid();
});

it.each([false, true])(
  "targets inherited JSON names while respecting an authored override: %s",
  async (overrides) => {
    const expectation = tester.expect(`
      ${operation}
      model Base {
        @encodedName("application/json", "widgetName") /*repeated*/otherName?: string;
      }
      model Properties extends Base {
        ${overrides ? '@encodedName("application/json", "description") otherName?: string;' : ""}
      }
    `);
    if (overrides) {
      await expectation.toBeValid();
    } else {
      await expectation.toEmitDiagnostics(({ repeated }) => ({
        ...diagnostic(),
        pos: getSourceLocation(repeated).pos,
        end: getSourceLocation(repeated).end,
      }));
    }
  },
);

it("compares JSON names with query wire names, not authored identifiers", async () => {
  await tester
    .expect(
      `
      model Properties {
        @encodedName("application/json", "wireQuery") otherName?: string;
        @encodedName("application/json", "description") querySource?: string;
      }
      @put @route("/widgets")
      op create(@query("wireQuery") querySource?: string,
        @body body: { properties: Properties }): void;
    `,
    )
    .toEmitDiagnostics([diagnostic("wireQuery")]);
});

it("ignores encoded names for other media types", async () => {
  await tester
    .expect(
      `
      ${operation}
      model Properties {
        @encodedName("application/xml", "widgetName") otherName?: string;
      }
    `,
    )
    .toBeValid();
  await tester
    .expect(
      `
      ${operation}
      model Properties {
        @encodedName("application/xml", "description") widgetName?: string;
      }
    `,
    )
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

it.each([false, true])(
  "reports a shared declaration once per PUT operation with a JSON alias: %s",
  async (encoded) => {
    await tester
      .expect(
        `
      ${operation}
      model Properties {
        ${encoded ? '@encodedName("application/json", "widgetName")' : ""}
        /*repeated*/${encoded ? "otherName" : "widgetName"}?: string;
      }
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
  },
);

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

it("checks ordinary project namespaces without provider metadata", async () => {
  await tester
    .expect(`namespace Contoso; ${operation} model Properties { widgetName?: string; }`)
    .toEmitDiagnostics([diagnostic()]);
});

it.each([true, false])(
  "checks concrete inherited PUT operations with repeated properties: %s",
  async (repeats) => {
    const expectation = tester.expect(`
      model Properties { /*repeated*/${repeats ? "widgetName" : "description"}?: string; }
      interface Templates<T> {
        @put @route("/widgets/{widgetName}")
        op create(@path widgetName: string, @body body: T): void;
      }
      interface Widgets extends Templates<{ properties: Properties }> {}
    `);
    if (repeats) {
      await expectation.toEmitDiagnostics(({ repeated }) => ({
        ...diagnostic(),
        pos: getSourceLocation(repeated).pos,
        end: getSourceLocation(repeated).end,
      }));
    } else {
      await expectation.toBeValid();
    }
  },
);

describe("URI and envelope name boundaries", () => {
  it.each(["widgetName", "identity"])(
    "selects the URI name independently of envelope names with @key(%s)",
    async (parameterName) => {
      await tester
        .expect(
          `
        @armProviderNamespace
        namespace Microsoft.Contoso;
        model Widget is TrackedResource<WidgetProperties> {
          @key("${parameterName}") @segment("widgets") @path name: string;
          ...ManagedServiceIdentityProperty;
        }
        model WidgetProperties {
          /*widgetName*/widgetName?: string;
          /*identity*/identity?: string;
        }
        @armResourceOperations
        interface Widgets {
          createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
        }
      `,
        )
        .toEmitDiagnostics((targets) => ({
          ...diagnostic(parameterName),
          pos: getSourceLocation(targets[parameterName]).pos,
          end: getSourceLocation(targets[parameterName]).end,
        }));
    },
  );
});
