import { Tester } from "#test/tester.js";
import { getSourceLocation, navigateProgram } from "@typespec/compiler";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, expect, it } from "vitest";
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
const pagingMetadata = {
  code,
  message:
    "Collection responses must use JSON-named `value` and `nextLink` properties with `@pageItems` and `@nextLink` metadata.",
};
const valueArray = {
  code,
  message: "Collection responses must declare a 'value' property of array type.",
};
const invalidEnvelope = {
  code,
  message: "Collection response models must contain exactly `value` and `nextLink` properties.",
};

it("reports missing @list and extra response properties independently", async () => {
  await tester
    .expect(
      `
    @route("/providers/Microsoft.Contoso/widgets") @get op widgets(): Page;
    model Page { value: string[]; nextLink?: string; extra: string; other: string; }
  `,
    )
    .toEmitDiagnostics([missingList, invalidEnvelope]);
});

it("does not report missing paging annotations on an unmarked operation", async () => {
  await tester
    .expect(
      `
    @route("/providers/Microsoft.Contoso/widgets") @get op listWidgets(): Page;
    model Page { value: string[]; @nextLink nextLink?: string; extra: string; }
  `,
    )
    .toEmitDiagnostics([missingList, invalidEnvelope]);
});

it("does not apply the pageable value-array check to an unmarked operation", async () => {
  await tester
    .expect(
      `
    @route("/providers/Microsoft.Contoso/widgets") @get op widgets(): Page;
    model Page { value: string; nextLink?: string; }
  `,
    )
    .toEmitDiagnostics(missingList);
});

it("reports an invalid value array and extra properties independently", async () => {
  await tester
    .expect(
      `
    @route("/single") @post @list op listWidgets(): Page;
    model Page { value: string; @pageItems items: string[]; @nextLink nextLink?: string; extra: int32; }
  `,
    )
    .toEmitDiagnostics([valueArray, invalidEnvelope]);
});

it("reports paging and envelope warnings for a missing nextLink and extra properties", async () => {
  await tester
    .expect(
      `
    @route("/single") @get @list op listWidgets(): Page;
    model Page { @pageItems value: string[]; extra: string; }
  `,
    )
    .toEmitDiagnostics([invalidEnvelope, pagingMetadata]);
});

it("reports an unmarked collection operation and its missing response nextLink", async () => {
  await tester
    .expect(
      `
    @route("/providers/Microsoft.Contoso/widgets") @get op /*widgets*/widgets(): Page;
    model /*Page*/Page { @pageItems value: string[]; }
  `,
    )
    .toEmitDiagnostics(({ widgets, Page }) => [
      { ...missingList, pos: getSourceLocation(widgets).pos, end: getSourceLocation(widgets).end },
      { ...invalidEnvelope, pos: getSourceLocation(Page).pos, end: getSourceLocation(Page).end },
    ]);
});

it("reports missing pageable metadata on a list operation and its invalid envelope", async () => {
  await tester
    .expect(
      `
    @route("/providers/Microsoft.Contoso/widgets") @get @list op /*widgets*/widgets(): Page;
    model /*Page*/Page { @pageItems value: string[]; }
  `,
    )
    .toEmitDiagnostics(({ widgets, Page }) => [
      {
        ...pagingMetadata,
        pos: getSourceLocation(widgets).pos,
        end: getSourceLocation(widgets).end,
      },
      { ...invalidEnvelope, pos: getSourceLocation(Page).pos, end: getSourceLocation(Page).end },
    ]);
});

it("reports missing pageable metadata even when a response property has a paging defect", async () => {
  const runner = await Tester.createInstance();
  await runner.compileAndDiagnose(`
    @route("/providers/Microsoft.Contoso/widgets") @get @list op widgets(): Page;
    model Page { value: string[]; extra: string; }
  `);
  const messages: string[] = [];
  const listener = listResponseEnvelopeRule.create({
    program: runner.program,
    options: {},
    reportDiagnostic: (diagnostic) => messages.push(diagnostic.messageId ?? "default"),
  });
  navigateProgram(runner.program, listener);
  expect(messages).toEqual(["pagingMetadata", "pagingMetadata", "invalidEnvelope"]);
});

it("requires nextLink metadata even when runtime page items exist", async () => {
  await tester
    .expect(
      `
    @route("/single") @get @list op listWidgets(): Page;
    model Page { @pageItems value: string[]; nextLink?: string; }
  `,
    )
    .toEmitDiagnostics(pagingMetadata);
});

it("requires nextLink metadata when the only response is 201", async () => {
  await tester
    .expect(
      `
    model Created { @statusCode status: 201; @pageItems value: string[]; }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Created;
  `,
    )
    .toEmitDiagnostics(pagingMetadata);
});

it("prioritizes missing @list over missing page items on a 201", async () => {
  await tester
    .expect(
      `
    model Created { @statusCode status: 201; value: string[]; @nextLink nextLink?: string; }
    @get @route("/providers/Microsoft.Contoso/widgets") op widgets(): Created;
  `,
    )
    .toEmitDiagnostics(missingList);
});

it("accepts paging metadata on a 201 without imposing the 200 envelope check", async () => {
  await tester
    .expect(
      `
    model Created { @statusCode status: 201; @pageItems items: string[]; @nextLink continuation?: string; }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Created;
  `,
    )
    .toBeValid();
});

it("reports paging property names that differ from JSON names on a 201", async () => {
  await tester
    .expect(
      `
    model Created {
      @statusCode status: 201;
      @pageItems @encodedName("application/json", "value") items: string[];
      @nextLink @encodedName("application/json", "nextLink") continuation?: string;
    }
    @get @list @route("/providers/Microsoft.Contoso/widgets") op widgets(): Created;
  `,
    )
    .toEmitDiagnostics([pagingMetadata, pagingMetadata]);
});

it("accepts inherited metadata on authored lists and standard ARM templates", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace namespace Microsoft.Contoso;
    model BasePage { @pageItems value: string[]; @nextLink nextLink?: string; }
    model Page extends BasePage {}
    @route("/single") @post @list op listWidgets(): Page;
    model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
    @armResourceOperations interface Widgets { listByParent is ArmResourceListByParent<Widget>; }
  `,
    )
    .toBeValid();
});

it("ignores an implicit generic operation instance used by a compliant authored list", async () => {
  await tester
    .expect(
      `
    model Page<T> { @pageItems value: T[]; @nextLink nextLink?: string; }
    @get @route("/providers/Microsoft.Contoso/widgets") op generic<T>(): Page<T>;
    @list op widgets is generic<string>;
  `,
    )
    .toBeValid();
});

it("checks authored generic operation instantiations once", async () => {
  await tester
    .expect(
      `
    model Page<T> { @pageItems value: T[]; @nextLink nextLink?: string; extra: string; }
    @get @route("/providers/Microsoft.Contoso/widgets") op generic<T>(): Page<T>;
    @list op one is generic<string>;
  `,
    )
    .toEmitDiagnostics(invalidEnvelope);
});

it("reports an unmarked authored generic operation instead of its implicit instance", async () => {
  await tester
    .expect(
      `
    model Page<T> { @pageItems value: T[]; @nextLink nextLink?: string; }
    @get @route("/providers/Microsoft.Contoso/widgets") op generic<T>(): Page<T>;
    op /*one*/one is generic<string>;
  `,
    )
    .toEmitDiagnostics(({ one }) => ({
      ...missingList,
      pos: getSourceLocation(one).pos,
      end: getSourceLocation(one).end,
    }));
});

it("checks operations authored through a generic interface", async () => {
  await tester
    .expect(
      `
    model Page<T> { @pageItems value: T[]; @nextLink nextLink?: string; extra: string; }
    interface Generic<T> { @get @route("/providers/Microsoft.Contoso/widgets") op widgets(): Page<T>; }
    interface Widgets extends Generic<string> {}
    @@list(Widgets.widgets);
  `,
    )
    .toEmitDiagnostics(invalidEnvelope);
});

it("accepts a compliant operation authored through a generic interface", async () => {
  await tester
    .expect(
      `
    model Page<T> { @pageItems value: T[]; @nextLink nextLink?: string; }
    interface Generic<T> { @get @route("/providers/Microsoft.Contoso/widgets") op widgets(): Page<T>; }
    interface Widgets extends Generic<string> {}
    @@list(Widgets.widgets);
  `,
    )
    .toBeValid();
});

it("validates an authored ARM template instantiation with an invalid response override", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace namespace Microsoft.Contoso;
    model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
    model Page { @pageItems items: Widget[]; @nextLink nextLink?: string; }
    @armResourceOperations interface Widgets {
      listByParent is ArmResourceListByParent<Widget, Response = ArmResponse<Page>>;
    }
  `,
    )
    .toEmitDiagnostics([valueArray, invalidEnvelope]);
});

it("checks legacy library operations inherited by a project interface", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace @service namespace Microsoft.Contoso;
    model /*Page*/Page {
      @pageItems /*items*/items: string[];
      @nextLink nextLink?: string;
      /*extra*/extra: string;
    }
    interface Operations extends Azure.ResourceManager.Legacy.Operations<ArmResponse<Page>> {}
  `,
    )
    .toEmitDiagnostics(({ Page }) => [
      { ...valueArray, pos: getSourceLocation(Page).pos, end: getSourceLocation(Page).end },
      { ...invalidEnvelope, pos: getSourceLocation(Page).pos, end: getSourceLocation(Page).end },
    ]);
});

it("accepts a project interface inheriting the standard library operations", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace @service namespace Microsoft.Contoso;
    interface Operations extends Azure.ResourceManager.Operations {}
  `,
    )
    .toBeValid();
});

it("targets the project interface when an inherited response is library-owned", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace @service namespace Microsoft.Contoso;
    alias LibraryPage = Azure.ResourceManager.CommonTypes.OperationListResult;
    @@encodedName(LibraryPage.value, "application/json", "items");
    interface /*Operations*/Operations extends Azure.ResourceManager.Legacy.Operations<ArmResponse<LibraryPage>> {}
  `,
    )
    .toEmitDiagnostics(({ Operations }) =>
      [valueArray, invalidEnvelope, pagingMetadata].map((diagnostic) => ({
        ...diagnostic,
        pos: getSourceLocation(Operations).pos,
        end: getSourceLocation(Operations).end,
      })),
    );
});

it("does not report unrelated library-only operations", async () => {
  await tester.expect(`@service namespace Microsoft.Contoso;`).toBeValid();
});

it("reports an inherited non-array value on a template response override", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace namespace Microsoft.Contoso;
    model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
    model BasePage { /*badValue*/value: string; @pageItems /*items*/items: Widget[]; @nextLink nextLink?: string; }
    model /*Page*/Page extends BasePage {}
    @armResourceOperations interface Widgets {
      listByParent is ArmResourceListByParent<Widget, Response = ArmResponse<Page>>;
    }
  `,
    )
    .toEmitDiagnostics(({ badValue, Page }) => [
      { ...valueArray, pos: getSourceLocation(badValue).pos, end: getSourceLocation(badValue).end },
      { ...invalidEnvelope, pos: getSourceLocation(Page).pos, end: getSourceLocation(Page).end },
    ]);
});

it("reports a custom next-link name on an ARM list response", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace namespace Microsoft.Contoso;
    model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
    model Page { @pageItems value: Widget[]; @nextLink /*nextPage*/nextPage?: string; }
    @armResourceOperations interface Widgets {
      listByParent is ArmResourceListByParent<Widget, Response = ArmResponse<Page>>;
    }
  `,
    )
    .toEmitDiagnostics(invalidEnvelope);
});

it("checks a paginated ARM POST action template with no value property", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace namespace Microsoft.Contoso;
    model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
    model Page { @pageItems items: Widget[]; @nextLink nextLink?: string; }
    @armResourceOperations interface Widgets {
      @list listCustom is ArmResourceActionSync<Widget, void, ArmResponse<Page>>;
    }
  `,
    )
    .toEmitDiagnostics([valueArray, invalidEnvelope]);
});

it("keeps metadata and body defects separate for each operation", async () => {
  await tester
    .expect(
      `
    model Page { @pageItems value: string[]; @nextLink nextLink?: string; extra: string; }
    @route("/one") @get @list op one(): Page;
    @route("/two") @post @list op two(): Page;
  `,
    )
    .toEmitDiagnostics([invalidEnvelope, invalidEnvelope]);
});

it("does not claim a decorated nextLink is missing when compiler paging metadata is invalid", async () => {
  const runner = await Tester.createInstance();
  const [, diagnostics] = await runner.compileAndDiagnose(`
    @get @list @route("/single") op widgets(): Page;
    model Page { value: string[]; @nextLink nextLink?: string; extra: string; }
  `);
  const messages: string[] = [];
  const listener = listResponseEnvelopeRule.create({
    program: runner.program,
    options: {},
    reportDiagnostic: (diagnostic) => messages.push(diagnostic.messageId ?? "default"),
  });
  navigateProgram(runner.program, listener);
  expect(messages).toEqual(["pagingMetadata", "invalidEnvelope"]);
  expect(diagnostics.some((x) => x.code === "missing-paging-items")).toBe(true);
});

it("does not claim decorated envelope properties are undecorated when markers are duplicated", async () => {
  const runner = await Tester.createInstance();
  const [, diagnostics] = await runner.compileAndDiagnose(`
    @get @list @route("/single") op widgets(): Page;
    model Page {
      @pageItems value: string[];
      @nextLink nextLink?: string;
      @pageItems items: string[];
      @nextLink otherLink?: string;
    }
  `);
  const messages: string[] = [];
  const listener = listResponseEnvelopeRule.create({
    program: runner.program,
    options: {},
    reportDiagnostic: (diagnostic) => messages.push(diagnostic.messageId ?? "default"),
  });
  navigateProgram(runner.program, listener);
  expect(messages).toEqual(["invalidEnvelope"]);
  expect(diagnostics.some((x) => x.code === "duplicate-paging-prop")).toBe(true);
});
