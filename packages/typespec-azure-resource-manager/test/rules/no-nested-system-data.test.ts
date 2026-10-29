import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester, t, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noNestedSystemDataRule } from "../../src/rules/no-nested-system-data.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noNestedSystemDataRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const diagnostic = {
  code: "@azure-tools/typespec-azure-resource-manager/no-nested-system-data",
  severity: "warning" as const,
  message: "System data must be defined in the resource envelope, not inside the properties bag.",
};

it.each(["systemData", "SystemData"])("rejects the JSON property %s in a bag", async (name) => {
  await tester
    .expect(`model Resource { properties: { ${name}?: string }; }`)
    .toEmitDiagnostics([diagnostic]);
});

it("accepts envelope system data and unrelated property names", async () => {
  await tester
    .expect(
      `
      model Resource {
        systemData?: { createdBy?: string };
        properties: { systemDataId?: string; systemdata?: string; };
      }
      model NotABag { systemData?: string; }
    `,
    )
    .toBeValid();
});

it("checks standard ARM resource property bags", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace Microsoft.Test;
      model Widget is TrackedResource<WidgetProperties> {
        ...ResourceNameParameter<Widget>;
      }
      model WidgetProperties { systemData?: { createdBy?: string }; }
    `,
    )
    .toEmitDiagnostics([diagnostic]);
});

it("accepts standard ARM envelope system data", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace Microsoft.Test;
      model Widget is TrackedResource<WidgetProperties> {
        ...ResourceNameParameter<Widget>;
      }
      model WidgetProperties { description?: string; }
    `,
    )
    .toBeValid();
});

it("finds violations after a compliant sibling and targets every offending declaration", async () => {
  await tester
    .expect(
      t.code`
      model Resource {
        properties: {
          first?: { label?: string };
          second?: { ${t.modelProperty("systemData")}?: string };
          third?: { ${t.modelProperty("SystemData")}?: string };
        };
      }
    `,
    )
    .toEmitDiagnostics(({ systemData, SystemData }) =>
      [systemData, SystemData].map((property) => ({
        ...diagnostic,
        pos: getSourceLocation(property).pos,
        end: getSourceLocation(property).end,
      })),
    );
});

it("traverses inherited bags and inherited nested properties", async () => {
  await tester
    .expect(
      `
      model BaseEnvelope { properties: DerivedProperties; }
      model Envelope extends BaseEnvelope {}
      model BaseProperties { systemData?: string; }
      model DerivedProperties extends BaseProperties { description?: string; }
    `,
    )
    .toEmitDiagnostics([diagnostic]);
});

it("traverses arrays, dictionary values and union variants", async () => {
  await tester
    .expect(
      `
      model Resource {
        properties: {
          list?: { systemData?: string }[];
          dictionary?: Record<{ SystemData?: string }>;
          choice?: string | { systemData?: string } | null;
        };
      }
    `,
    )
    .toEmitDiagnostics([diagnostic, diagnostic, diagnostic]);
});

it("terminates cycles and reports shared offending properties only once", async () => {
  await tester
    .expect(
      t.code`
      model First { properties: Bag; }
      model Second { properties: Bag; }
      model Bag {
        next?: Bag;
        shared?: Shared;
        again?: Shared;
      }
      model Shared {
        back?: Bag;
        ${t.modelProperty("systemData")}?: string;
      }
    `,
    )
    .toEmitDiagnostics(({ systemData }) => ({
      ...diagnostic,
      pos: getSourceLocation(systemData).pos,
      end: getSourceLocation(systemData).end,
    }));
});

it("uses JSON encoded names for both bags and nested properties", async () => {
  await tester
    .expect(
      `
      model Resource {
        @encodedName("application/json", "properties")
        settings: {
          @encodedName("application/json", "systemData")
          audit?: string;
        };
      }
      model RenamedEnvelope {
        @encodedName("application/json", "settings")
        properties: {
          @encodedName("application/json", "audit")
          systemData?: string;
        };
      }
    `,
    )
    .toEmitDiagnostics([diagnostic]);
});

it("does not multiply findings when a declaration is spread into several bags", async () => {
  await tester
    .expect(
      `
      model Shared { systemData?: string; }
      model First { properties: { ...Shared }; }
      model Second { properties: { ...Shared }; }
    `,
    )
    .toEmitDiagnostics([diagnostic]);
});

it("traverses inherited dictionary indexers", async () => {
  await tester
    .expect(
      t.code`
      model Entry { ${t.modelProperty("systemData")}?: string; }
      model Values extends Record<Entry> {}
      model MoreValues extends Values {}
      model Resource { properties: { entries?: MoreValues }; }
    `,
    )
    .toEmitDiagnostics(({ systemData }) => ({
      ...diagnostic,
      pos: getSourceLocation(systemData).pos,
      end: getSourceLocation(systemData).end,
    }));
});

it("traverses applicable discriminator alternatives", async () => {
  await tester
    .expect(
      t.code`
      @discriminator("kind")
      model Bag { kind: string; }
      model Bad extends Bag {
        kind: "bad";
        ${t.modelProperty("systemData")}?: string;
      }
      model Resource { properties: Bag; }
    `,
    )
    .toEmitDiagnostics(({ systemData }) => ({
      ...diagnostic,
      pos: getSourceLocation(systemData).pos,
      end: getSourceLocation(systemData).end,
    }));
});

it("terminates shared polymorphic dictionary cycles and respects encoded names", async () => {
  await tester
    .expect(
      t.code`
      @discriminator("kind")
      model Entry { kind: string; }
      model Intermediate extends Entry {}
      model Bad extends Intermediate {
        kind: "bad";
        @encodedName("application/json", "SystemData")
        ${t.modelProperty("audit")}?: string;
        back?: Values;
      }
      model Values extends Record<Entry> {}
      model Bag { entries?: Values; again?: Entry; }
      model First { properties: Bag; }
      model Second { properties: Bag; }
    `,
    )
    .toEmitDiagnostics(({ audit }) => ({
      ...diagnostic,
      pos: getSourceLocation(audit).pos,
      end: getSourceLocation(audit).end,
    }));
});

it("excludes unrelated descendants and alternatives of a narrowed subtype", async () => {
  await tester
    .expect(
      `
      model Plain { description?: string; }
      model Unrelated extends Plain { systemData?: string; }
      model First { properties: Plain; }
      @discriminator("kind")
      model Choice { kind: string; }
      model Good extends Choice { kind: "good"; }
      model Bad extends Choice { kind: "bad"; systemData?: string; }
      model Second { properties: Good; }
      model Renamed extends Record<{
        @encodedName("application/json", "audit")
        systemData?: string;
      }> {}
      model Third { properties: { entries?: Renamed }; }
    `,
    )
    .toBeValid();
});
