import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { listResponseEnvelopeRule } from "../../src/rules/list-response-envelope.js";

let tester: LinterRuleTester;
beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    listResponseEnvelopeRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
}, 30_000);
const code = "@azure-tools/typespec-azure-resource-manager/list-response-envelope";
const missingList = { code, message: "Collection GET operations must use `@list`." };
const envelope = {
  code,
  message: "Collection response models must declare exactly the `value` and `nextLink` properties.",
};
const valueArray = {
  code,
  message: "Collection responses must declare a 'value' property of array type.",
};
const pageItems = { code, message: "The collection response `value` must use `@pageItems`." };
const nextLink = { code, message: "The collection response `nextLink` must use `@nextLink`." };
const pagingNextLink = {
  code,
  message: "Collection operations must declare `@nextLink` paging metadata.",
};
const additionalProperties = {
  code,
  message: "Collection response models must not allow additional properties.",
};
const pagingName = {
  code,
  message: "Paging property TypeSpec names must match their JSON wire names.",
};

it("recognizes provider and resource action paths and operations without provider metadata", async () => {
  await tester
    .expect(
      `
    model Page { @pageItems value: string[]; @nextLink nextLink?: string; extra: string; }
    @get @route("/providers/Microsoft.Contoso/widgets") op widgets(): Page;
    @get @route("/providers/Microsoft.Contoso/operations") op operations(): Page;
    @get @route("/providers/Microsoft.Contoso/widgets/{name}/listThings") op action(@path name: string): Page;
    @get @route("/providers/Microsoft.Contoso/listThings") op providerAction(): Page;
  `,
    )
    .toEmitDiagnostics([
      missingList,
      envelope,
      missingList,
      envelope,
      missingList,
      envelope,
      missingList,
      envelope,
    ]);
});

it("ignores non-list POSTs, point paths, default paths and uninstantiated templates", async () => {
  await tester
    .expect(
      `
    model Page { extra: string; }
    @post @route("/providers/Microsoft.Contoso/widgets") op postWidgets(): Page;
    @get @route("/providers/Microsoft.Contoso/widgets/{name}") op getWidget(@path name: string): Page;
    @get @route("/providers/Microsoft.Contoso/widgets/default") op getDefault(): Page;
    interface Generic<T> { @get @route("/providers/Microsoft.Contoso/widgets") op generic(): T; }
  `,
    )
    .toBeValid();
});

it("ignores headers, status codes and create-only properties in implicit response bodies", async () => {
  await tester
    .expect(
      `
    model Page { @statusCode status: 200; @header etag: string; @visibility(Lifecycle.Create) hidden: string; @pageItems value: string[]; @nextLink nextLink?: string; }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Page;
  `,
    )
    .toBeValid();
});

it("checks an explicit response body rather than its HTTP wrapper", async () => {
  await tester
    .expect(
      `
    model Page { @pageItems value: string[]; @nextLink nextLink?: string; extra: string; }
    model WidgetResponse { @statusCode status: 200; @header etag: string; @body body: Page; }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): WidgetResponse;
  `,
    )
    .toEmitDiagnostics(envelope);
});

it("reports an invalid shared body only once across response media types", async () => {
  await tester
    .expect(
      `
    model Page { @pageItems value: string[]; @nextLink nextLink?: string; extra: string; }
    model JsonResponse { @header contentType: "application/json"; @body body: Page; }
    model XmlResponse { @header contentType: "application/xml"; @body body: Page; }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): JsonResponse | XmlResponse;
  `,
    )
    .toEmitDiagnostics(envelope);
});

it("does not inspect non-200 responses", async () => {
  await tester
    .expect(
      `
    model Page { @pageItems value: string[]; @nextLink nextLink?: string; }
    model Created { @statusCode status: 201; @body body: { extra: string }; }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Page | Created;
  `,
    )
    .toBeValid();
});

it("reports inherited extra properties but ignores hidden and HTTP metadata", async () => {
  await tester
    .expect(
      `
    model Base { extra: string; @header etag: string; @visibility(Lifecycle.Create) hidden: string; }
    model Page extends Base { @pageItems value: string[]; @nextLink nextLink?: string; }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Page;
  `,
    )
    .toEmitDiagnostics(envelope);
});

it("reports missing envelopes on named arrays, direct arrays and scalar bodies", async () => {
  await tester
    .expect(
      `
    model NamedArray is string[];
    @get @route("/providers/Microsoft.Contoso/named") op named(): NamedArray;
    @get @route("/providers/Microsoft.Contoso/widgets") op widgets(): string[];
    @get @route("/providers/Microsoft.Contoso/names") op names(): string;
  `,
    )
    .toEmitDiagnostics([
      missingList,
      valueArray,
      pageItems,
      envelope,
      pagingNextLink,
      missingList,
      valueArray,
      pageItems,
      envelope,
      pagingNextLink,
      missingList,
      valueArray,
      pageItems,
      envelope,
      pagingNextLink,
    ]);
});

it("reports missing envelopes on record, file and multipart bodies", async () => {
  await tester
    .expect(
      `
    @get @route("/providers/Microsoft.Contoso/records") op records(): Record<string>;
    @get @route("/providers/Microsoft.Contoso/files") op files(): Http.File;
    @get @route("/providers/Microsoft.Contoso/archives")
    op archives(): { @multipartBody fields: { file: HttpPart<Http.File>; }; };
  `,
    )
    .toEmitDiagnostics([
      missingList,
      valueArray,
      pageItems,
      envelope,
      additionalProperties,
      pagingNextLink,
      missingList,
      valueArray,
      pageItems,
      envelope,
      pagingNextLink,
      missingList,
      valueArray,
      pageItems,
      envelope,
      pagingNextLink,
    ]);
});

it("checks each variant of a plain 200 response union", async () => {
  await tester
    .expect(
      `
    model Good { @pageItems value: string[]; @nextLink nextLink?: string; }
    model Bad { value: string[]; nextLink?: string; extra: string; }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Good | Bad;
  `,
    )
    .toEmitDiagnostics([pageItems, nextLink, envelope]);
});

it("does not apply sibling spread-clone paging metadata to another response variant", async () => {
  await tester
    .expect(
      `
    model Base { value: string[]; nextLink?: string; }
    model Good { ...Base; }
    model Bad { ...Base; }
    @@pageItems(Good.value);
    @@nextLink(Good.nextLink);
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Good | Bad;
  `,
    )
    .toEmitDiagnostics([pageItems, nextLink]);
});

it("checks JSON wire names rather than TypeSpec property names", async () => {
  await tester
    .expect(
      `
    model Page {
      @pageItems @encodedName("application/json", "items") value: string[];
      @nextLink @encodedName("application/json", "continuation") nextLink?: string;
    }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Page;
  `,
    )
    .toEmitDiagnostics([
      valueArray,
      pageItems,
      envelope,
      envelope,
      envelope,
      pagingName,
      pagingName,
    ]);
});

it("reports alternate TypeSpec names encoded as the standard JSON names", async () => {
  await tester
    .expect(
      `
    model Page {
      @pageItems @encodedName("application/json", "value") items: string[];
      @nextLink @encodedName("application/json", "nextLink") continuation?: string;
    }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Page;
  `,
    )
    .toEmitDiagnostics([pagingName, pagingName]);
});

it("reports mismatches independently for sibling spread response variants", async () => {
  await tester
    .expect(
      `
    model Base {
      @encodedName("application/json", "value") items: string[];
      @encodedName("application/json", "nextLink") continuation?: string;
    }
    model Good { ...Base; }
    model Bad { ...Base; }
    @@pageItems(Good.items);
    @@nextLink(Good.continuation);
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Good | Bad;
  `,
    )
    .toEmitDiagnostics([pagingName, pagingName, pagingName, pagingName, pageItems, nextLink]);
});

it("targets only the paging property whose TypeSpec name differs from the JSON name", async () => {
  await tester
    .expect(
      `
    model Page {
      @pageItems value: string[];
      @nextLink @encodedName("application/json", "nextLink") /*wrong*/continuation?: string;
    }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Page;
  `,
    )
    .toEmitDiagnostics(({ wrong }) => ({
      ...pagingName,
      pos: getSourceLocation(wrong).pos,
      end: getSourceLocation(wrong).end,
    }));
});

it("reports encoded name mismatches only once in an implicit HTTP body", async () => {
  await tester
    .expect(
      `
    model Page {
      @statusCode status: 200;
      @header etag: string;
      @pageItems @encodedName("application/json", "value") items: string[];
      @nextLink @encodedName("application/json", "nextLink") continuation?: string;
    }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Page;
  `,
    )
    .toEmitDiagnostics([pagingName, pagingName]);
});

it("accepts inherited alias properties in an explicit body and ignores invisible properties", async () => {
  await tester
    .expect(
      `
    model Base {
      @pageItems @encodedName("application/xml", "items") value: string[];
      @nextLink @encodedName("application/xml", "continuation") nextLink?: string;
      @visibility(Lifecycle.Create) hidden: string;
    }
    model BaseAlias is Base;
    model Page extends BaseAlias {}
    model ResponseBody { @statusCode status: 200; @body body: Page; }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): ResponseBody;
  `,
    )
    .toBeValid();
});

it("accepts non-JSON encodings and paging markers in an implicit HTTP body", async () => {
  await tester
    .expect(
      `
    model Page {
      @statusCode status: 200;
      @header etag: string;
      @pageItems @encodedName("application/xml", "items") value: string[];
      @nextLink @encodedName("application/xml", "continuation") nextLink?: string;
      @visibility(Lifecycle.Create) hidden: string;
    }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Page;
  `,
    )
    .toBeValid();
});

it("preserves augmented paging markers in an implicit HTTP body", async () => {
  await tester
    .expect(
      `
    model Page { @statusCode status: 200; @header etag: string; value: string[]; nextLink?: string; }
    @@pageItems(Page.value);
    @@nextLink(Page.nextLink);
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Page;
  `,
    )
    .toBeValid();
});

it("accepts paging decorators copied by a model spread", async () => {
  await tester
    .expect(
      `
    model Base { @pageItems value: string[]; @nextLink nextLink?: string; }
    model Page { ...Base; }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Page;
  `,
    )
    .toBeValid();
});

it("rejects inherited indexers even on otherwise valid envelopes", async () => {
  await tester
    .expect(
      `
    model Page extends Record<unknown> {
      @pageItems value: string[];
      @nextLink nextLink?: string;
    }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Page;
  `,
    )
    .toEmitDiagnostics(additionalProperties);
});

it("reports an indexer independently of a missing nextLink", async () => {
  await tester
    .expect(
      `
    model Page extends Record<unknown> { @pageItems value: string[]; }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Page;
  `,
    )
    .toEmitDiagnostics([envelope, additionalProperties, pagingNextLink]);
});

it("checks each variant of an explicit 200 body union", async () => {
  await tester
    .expect(
      `
    model Good { @pageItems value: string[]; @nextLink nextLink?: string; }
    model Bad { value: string[]; nextLink?: string; extra: string; }
    model Result { @statusCode status: 200; @body body: Good | Bad; }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Result;
  `,
    )
    .toEmitDiagnostics([pageItems, nextLink, envelope]);
});

it("reports a bodyless 200 even when the 201 response has paging metadata", async () => {
  await tester
    .expect(
      `
    model Page { @pageItems value: string[]; @nextLink nextLink?: string; }
    model Empty { @statusCode status: 200; }
    model Created { @statusCode status: 201; @body body: Page; }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Empty | Created;
  `,
    )
    .toEmitDiagnostics([valueArray, pageItems, envelope]);
});

it("reports an empty model response", async () => {
  await tester
    .expect(
      `
    @get @route("/providers/Microsoft.Contoso/widgets") op widgets(): {};
  `,
    )
    .toEmitDiagnostics([missingList, valueArray, pageItems, envelope, pagingNextLink]);
});

it("reports an explicitly empty 200 body even with paging on the 201 response", async () => {
  await tester
    .expect(
      `
    model Page { @pageItems value: string[]; @nextLink nextLink?: string; }
    model EmptyBody {}
    model Empty { @statusCode status: 200; @body body: EmptyBody; }
    model Created { @statusCode status: 201; @body body: Page; }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Empty | Created;
  `,
    )
    .toEmitDiagnostics([valueArray, pageItems, envelope]);
});

it("reports an array variant alongside a compliant 200 envelope", async () => {
  await tester
    .expect(
      `
    model Page { @pageItems value: string[]; @nextLink nextLink?: string; }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Page | string[];
  `,
    )
    .toEmitDiagnostics([valueArray, pageItems, envelope]);
});

it("checks status ranges containing 200 but ignores ranges starting at 201", async () => {
  await tester
    .expect(
      `
    @minValue(200) @maxValue(202) scalar Includes200 extends int32;
    @minValue(201) @maxValue(299) scalar LaterSuccess extends int32;
    model Page { @pageItems value: string[]; @nextLink nextLink?: string; }
    model InRange { @statusCode status: Includes200; @body body: { value: string[]; nextLink?: string; extra: string }; }
    model Later { @statusCode status: LaterSuccess; @body body: { other: string }; }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): InRange | Later | Page;
  `,
    )
    .toEmitDiagnostics([pageItems, nextLink, envelope]);
});

it("includes 200 at the upper boundary of a status range", async () => {
  await tester
    .expect(
      `
    @minValue(199) @maxValue(200) scalar EndingAt200 extends int32;
    model Page { @pageItems value: string[]; @nextLink nextLink?: string; extra: string; }
    model Result { @statusCode status: EndingAt200; @body body: Page; }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Result;
  `,
    )
    .toEmitDiagnostics(envelope);
});

it("targets the actual invalid value and extra properties", async () => {
  await tester
    .expect(
      `
    model Page { /*badValue*/value: string; @pageItems /*items*/items: string[]; @nextLink nextLink?: string; /*extra*/extra: string; }
    @get @list @route("/widgets") op widgets(): Page;
  `,
    )
    .toEmitDiagnostics(({ badValue, extra, items }) => [
      { ...valueArray, pos: getSourceLocation(badValue).pos, end: getSourceLocation(badValue).end },
      { ...pageItems, pos: getSourceLocation(badValue).pos, end: getSourceLocation(badValue).end },
      { ...envelope, pos: getSourceLocation(items).pos, end: getSourceLocation(items).end },
      { ...envelope, pos: getSourceLocation(extra).pos, end: getSourceLocation(extra).end },
    ]);
});

it("targets the unmarked collection operation", async () => {
  await tester
    .expect(
      `
    model Page { @pageItems value: string[]; @nextLink nextLink?: string; }
    @get @route("/providers/Microsoft.Contoso/widgets") op /*widgets*/widgets(): Page;
  `,
    )
    .toEmitDiagnostics(({ widgets }) => ({
      ...missingList,
      pos: getSourceLocation(widgets).pos,
      end: getSourceLocation(widgets).end,
    }));
});

it("does not confuse a query suffix with a point route", async () => {
  await tester
    .expect(
      `
    @get @route("/providers/Microsoft.Contoso/widgets/example?disambiguation_dummy") op point(): { extra: string };
  `,
    )
    .toBeValid();
});

it("checks extension-scope collections in nested provider namespaces", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace namespace Microsoft.Contoso {
      namespace Inventory {
        model Page { @pageItems value: string[]; @nextLink nextLink?: string; extra: string; }
        @get @route("/{resourceUri}/providers/Microsoft.Contoso/widgets")
        op list(@path resourceUri: string): Page;
      }
    }
  `,
    )
    .toEmitDiagnostics([missingList, envelope]);
});

it("ignores dynamic provider paths and provider-free noncollection GETs", async () => {
  await tester
    .expect(
      `
    model Page { extra: string; }
    @get @route("/providers/{providerNamespace}/widgets")
    op dynamicProvider(@path providerNamespace: string): Page;
    @get @route("/widgets") op providerFree(): Page;
  `,
    )
    .toBeValid();
});

it("classifies custom suffixes identically with or without query strings", async () => {
  await tester
    .expect(
      `
    model Page { @pageItems value: string[]; @nextLink nextLink?: string; }
    @get @route("/providers/Microsoft.Contoso/customoperations") op a(): Page;
    @get @route("/providers/Microsoft.Contoso/customoperations?disambiguation_dummy") op b(): Page;
    @get @route("/providers/Microsoft.Contoso/customdefault") op c(): Page;
    @get @route("/providers/Microsoft.Contoso/customdefault?disambiguation_dummy") op d(): Page;
    @get @route("/providers/Microsoft.Contoso/widgets/default?disambiguation_dummy") op point(): Page;
  `,
    )
    .toEmitDiagnostics([missingList, missingList, missingList, missingList]);
});
