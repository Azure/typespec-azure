import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { collectionResponseOnlyValueAndNextLinkRule } from "../../src/rules/collection-response-only-value-and-next-link.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    collectionResponseOnlyValueAndNextLinkRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

function armGet(route: string, response: string, models: string): string {
  return `
    @armProviderNamespace
    namespace Microsoft.TestService;

    ${models}

    @route("${route}")
    @get
    op getCollection(): ${response};
  `;
}

const widgetModel = `model Widget { name: string; }`;
const diagnosticCode =
  "@azure-tools/typespec-azure-resource-manager/collection-response-only-value-and-next-link";

it("reports an extra property on a collection response", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/widgets",
        "WidgetListResult",
        `${widgetModel}
         model WidgetListResult {
           value: Widget[];
           nextLink?: string;
           totalCount?: int32;
         }`,
      ),
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});

it("reports a value-only response on an extension-scope collection path", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/widgets",
        "WidgetListResult",
        `${widgetModel}
         model WidgetListResult { value: Widget[]; }`,
      ),
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});

it("accepts a response containing only value and nextLink", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/widgets",
        "WidgetListResult",
        `${widgetModel}
         model WidgetListResult {
           value: Widget[];
           nextLink?: string;
         }`,
      ),
    )
    .toBeValid();
});

it("accepts a named array response body", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/widgets",
        "WidgetCollection",
        `${widgetModel}
         model WidgetCollection is Widget[];`,
      ),
    )
    .toBeValid();
});

it("accepts a direct array response body", async () => {
  await tester
    .expect(armGet("/scope/providers/Microsoft.TestService/widgets", "Widget[]", widgetModel))
    .toBeValid();
});

it("accepts a record response body", async () => {
  await tester
    .expect(armGet("/scope/providers/Microsoft.TestService/widgets", "Record<string>", ""))
    .toBeValid();
});

it("accepts a file response body", async () => {
  await tester
    .expect(armGet("/scope/providers/Microsoft.TestService/widgetFiles", "Http.File", ""))
    .toBeValid();
});

it("accepts a multipart response body", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/widgetArchives",
        "{ @multipartBody fields: { archive: HttpPart<Http.File>; description: HttpPart<string>; }; }",
        "",
      ),
    )
    .toBeValid();
});

it("accepts an invalid collection shape on a point path with a query suffix", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/widgets/exampleWidget?disambiguation_dummy",
        "WidgetListResult",
        `${widgetModel}
         model WidgetListResult { value: Widget[]; }`,
      ),
    )
    .toBeValid();
});

it("accepts an invalid collection shape when the raw path ends with operations", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/customoperations",
        "WidgetListResult",
        `${widgetModel}
         model WidgetListResult { value: Widget[]; }`,
      ),
    )
    .toBeValid();
});

it("reports an invalid collection shape when operations is followed by a query suffix", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/customoperations?disambiguation_dummy",
        "WidgetListResult",
        `${widgetModel}
         model WidgetListResult { value: Widget[]; }`,
      ),
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});

it("accepts an invalid collection shape when the raw path ends with default", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/customdefault",
        "WidgetListResult",
        `${widgetModel}
         model WidgetListResult { value: Widget[]; }`,
      ),
    )
    .toBeValid();
});

it("reports an invalid collection shape when default is followed by a query suffix", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/customdefault?disambiguation_dummy",
        "WidgetListResult",
        `${widgetModel}
         model WidgetListResult { value: Widget[]; }`,
      ),
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});
