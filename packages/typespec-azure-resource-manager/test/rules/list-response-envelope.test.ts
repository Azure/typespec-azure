import { Tester } from "#test/tester.js";
import { type LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { listResponseEnvelopeRule } from "../../src/rules/list-response-envelope.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    listResponseEnvelopeRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const diagnosticCode = "@azure-tools/typespec-azure-resource-manager/list-response-envelope";
const widgetModel = `
  model Widget is ProxyResource<{}> {
    ...ResourceNameParameter<Widget>;
  }
`;

function armList(
  models: string,
  response = "ArmResponse<WidgetListResult>",
  listOperations = `listByParent is Legacy.ArmListSinglePageByParent<Widget, Response = ${response}>;`,
): string {
  return `
    @service
    @armProviderNamespace
    namespace Microsoft.TestService;

    ${widgetModel}
    ${models}

    @armResourceOperations
    interface Widgets {
      read is ArmResourceRead<Widget>;
      ${listOperations}
    }
  `;
}

it.each([
  ["an extra property", "value: Widget[]; nextLink?: string; totalCount?: int32;"],
  ["a missing nextLink", "value: Widget[];"],
  ["a missing value", "nextLink?: string;"],
  ["a custom next-link name", "value: Widget[]; continuationLink?: string;"],
])("reports %s on a resolved resource list response", async (_, properties) => {
  await tester
    .expect(armList(`model WidgetListResult { ${properties} }`))
    .toEmitDiagnostics({ code: diagnosticCode });
});

it("reports every extra property without a redundant missing-property diagnostic", async () => {
  await tester
    .expect(
      armList(`
        model WidgetListResult {
          value: Widget[];
          totalCount?: int32;
          metadata?: string;
        }
      `),
    )
    .toEmitDiagnostics([{ code: diagnosticCode }, { code: diagnosticCode }]);
});

it.each(["string", "Widget", "Record<string>"])(
  "reports a non-array value of type %s",
  async (type) => {
    await tester
      .expect(armList(`model WidgetListResult { value: ${type}; nextLink?: string; }`))
      .toEmitDiagnostics({
        code: diagnosticCode,
        message: "List responses must declare a 'value' property of array type.",
      });
  },
);

it("accepts the standard ARM list template response", async () => {
  await tester
    .expect(armList("", "", "listByParent is ArmResourceListByParent<Widget>;"))
    .toBeValid();
});

it("accepts a response containing only value and nextLink", async () => {
  await tester
    .expect(armList("model WidgetListResult { value: Widget[]; nextLink?: string; }"))
    .toBeValid();
});

it("checks paged resource list templates as well as single-page lists", async () => {
  await tester
    .expect(
      armList(
        `
          model WidgetListResult {
            @pageItems value: Widget[];
            @nextLink nextLink?: url;
            totalCount?: int32;
          }
        `,
        "",
        "listByParent is ArmResourceListByParent<Widget, Response = ArmResponse<WidgetListResult>>;",
      ),
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});

it("checks registered resource lists without @list or paging metadata", async () => {
  await tester
    .expect(
      armList(
        "model WidgetListResult { value: Widget[]; }",
        "",
        `
          @armResourceList(Widget)
          @route("/providers/Microsoft.TestService/widgets")
          @get
          listWidgets(): WidgetListResult;
        `,
      ),
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});

it.each(["customoperations", "customdefault"])(
  "checks resource lists even when their collection segment ends in %s",
  async (segment) => {
    await tester
      .expect(
        armList("model WidgetListResult { value: Widget[]; }").replace(
          "ResourceNameParameter<Widget>",
          `ResourceNameParameter<Widget, SegmentName = "${segment}">`,
        ),
      )
      .toEmitDiagnostics({ code: diagnosticCode });
  },
);

it("checks lists in nested provider namespaces", async () => {
  await tester
    .expect(
      `
      @service
      @armProviderNamespace
      namespace Microsoft.TestService {
        namespace V1 {
          ${widgetModel}
          model WidgetListResult { value: Widget[]; }
          @armResourceOperations
          interface Widgets {
            read is ArmResourceRead<Widget>;
            listByParent is Legacy.ArmListSinglePageByParent<Widget, Response = ArmResponse<WidgetListResult>>;
          }
        }
      }
    `,
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});

it("checks every resource list, including subscription lists after a valid parent list", async () => {
  await tester
    .expect(
      armList(
        "model WidgetListResult { value: Widget[]; }",
        "",
        `
          listByParent is ArmResourceListByParent<Widget>;
          listBySubscription is Legacy.ArmListSinglePageBySubscription<Widget, Response = ArmResponse<WidgetListResult>>;
        `,
      ),
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});

it("checks lists on multiple resources", async () => {
  await tester
    .expect(
      `
      ${armList("model WidgetListResult { value: Widget[]; }")}
      model Gadget is ProxyResource<{}> {
        ...ResourceNameParameter<Gadget>;
      }
      model GadgetListResult { value: Gadget[]; }
      @armResourceOperations
      interface Gadgets {
        read is ArmResourceRead<Gadget>;
        listByParent is Legacy.ArmListSinglePageByParent<Gadget, Response = ArmResponse<GadgetListResult>>;
      }
    `,
    )
    .toEmitDiagnostics([{ code: diagnosticCode }, { code: diagnosticCode }]);
});

it("accepts inherited envelope properties", async () => {
  await tester
    .expect(
      armList(`
        model PageBase { value: Widget[]; nextLink?: string; }
        model WidgetListResult extends PageBase {}
      `),
    )
    .toBeValid();
});

it("reports invalid inherited envelope properties even without own properties", async () => {
  await tester
    .expect(
      armList(`
        model PageBase { value: Widget[]; nextLink?: string; totalCount?: int32; }
        model WidgetListResult extends PageBase {}
      `),
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});

it.each([
  ["a named array", "model WidgetCollection is Widget[];", "{ @body body: WidgetCollection; }"],
  ["a direct array", "", "{ @body body: Widget[]; }"],
  ["a record", "", "Record<string>"],
  ["a file", "", "Http.File"],
  [
    "a multipart body",
    "",
    "{ @multipartBody fields: { archive: HttpPart<Http.File>; description: HttpPart<string>; }; }",
  ],
])("preserves the exclusion for %s response bodies", async (_, models, response) => {
  await tester.expect(armList(models, response)).toBeValid();
});

it("ignores non-200 response bodies", async () => {
  await tester
    .expect(
      armList(
        "model WidgetListResult { value: Widget[]; }",
        "{ @statusCode statusCode: 202; @body body: WidgetListResult; }",
      ),
    )
    .toBeValid();
});

it("ignores resources without list operations", async () => {
  await tester.expect(armList("model WidgetListResult { value: Widget[]; }", "", "")).toBeValid();
});

it("ignores collection-shaped GET paths not registered as resource lists", async () => {
  await tester
    .expect(
      `
      ${armList("model WidgetListResult { value: Widget[]; }", "", "")}
      @route("/providers/Microsoft.TestService/widgets")
      @get
      op getCollection(): WidgetListResult;
    `,
    )
    .toBeValid();
});

it.each(["get", "post"])("checks unassociated @list %s operations", async (verb) => {
  await tester
    .expect(
      `
      ${armList("", "", "")}
      model WidgetListResult {
        @pageItems value: Widget[];
        @nextLink nextLink?: url;
        totalCount?: int32;
      }
      @list
      @route("/providers/Microsoft.TestService/widgets/search")
      @${verb}
      op search(): WidgetListResult;
    `,
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});

it("checks list operations without ARM resources", async () => {
  await tester
    .expect(
      `
      @service
      namespace Contoso;
      model Page {
        @pageItems value: string[];
        @nextLink nextLink?: url;
        totalCount?: int32;
      }
      @list
      @get
      op list(): Page;
    `,
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});

it("checks @list operations without a next-link marker", async () => {
  await tester
    .expect(
      `
      @service
      namespace Contoso;
      model Page { @pageItems value: string[]; }
      @list
      @get
      op list(): Page;
    `,
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});

it("accepts non-resource list responses with the standard envelope", async () => {
  await tester
    .expect(
      `
      @service
      namespace Contoso;
      model Page {
        @pageItems value: string[];
        nextLink?: url;
      }
      @list
      @post
      op list(): Page;
    `,
    )
    .toBeValid();
});

it.each([
  ["value: Widget[];", false],
  ["value: Widget[]; nextLink?: string;", true],
])("checks REST lists without @list or ARM resource metadata: %s", async (properties, valid) => {
  const result = tester.expect(`
    @service
    namespace Contoso;
    model Widget { name: string; }
    model Page { ${properties} }
    @listsResource(Widget)
    @get
    op list(): Page;
  `);
  if (valid) {
    await result.toBeValid();
  } else {
    await result.toEmitDiagnostics({ code: diagnosticCode });
  }
});

it("checks ARM lists even without resource lifecycle operations", async () => {
  await tester
    .expect(
      armList("model WidgetListResult { value: Widget[]; }").replace(
        "read is ArmResourceRead<Widget>;",
        "",
      ),
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});

it("ignores uninstantiated list operation and interface templates", async () => {
  await tester
    .expect(
      `
      model Page<T> {
        @pageItems value: T[];
        nextLink?: url;
        totalCount?: int32;
      }
      @list
      @get
      op list<T>(): Page<T>;
      interface Collections<T> {
        @list
        @get
        list(): Page<T>;
      }
    `,
    )
    .toBeValid();
});

it("checks instantiated list interfaces once", async () => {
  await tester
    .expect(
      `
      @service
      namespace Contoso;
      model Page<T> {
        @pageItems value: T[];
        nextLink?: url;
        totalCount?: int32;
      }
      interface Collections<T> {
        @list
        @get
        list(): Page<T>;
      }
      interface Widgets extends Collections<string> {}
    `,
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});

it("does not infer lists from paging properties alone", async () => {
  await tester
    .expect(
      `
      model Page {
        @pageItems value: string[];
        @nextLink nextLink?: url;
        totalCount?: int32;
      }
      @get
      op read(): Page;
    `,
    )
    .toBeValid();
});
