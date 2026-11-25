import {
  createLinterRuleTester,
  expectDiagnostics,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noLocalizedDocLinksRule } from "../../src/rules/no-localized-doc-links.js";
import { Tester } from "../test-host.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    noLocalizedDocLinksRule,
    "@azure-tools/typespec-azure-core",
  );
});

const diagnostic = {
  code: "@azure-tools/typespec-azure-core/no-localized-doc-links",
  severity: "warning",
  message: "Remove the locale from the Microsoft documentation link.",
} as const;

describe("no-localized-doc-links", () => {
  it.each([
    ["operation", "DECORATOR op read(): string;"],
    ["model", "DECORATOR model Widget {}"],
    ["model property", "model Widget { DECORATOR name: string; }"],
    ["operation parameter", "op read(DECORATOR name: string): string;"],
    ["scalar", "DECORATOR scalar WidgetName extends string;"],
    ["enum", "DECORATOR enum Color { red }"],
    ["enum member", "enum Color { DECORATOR red }"],
    ["union", "DECORATOR union Color { red: string }"],
    ["union variant", "union Color { DECORATOR red: string }"],
    ["interface", "DECORATOR interface Widgets {}"],
    ["namespace", "DECORATOR namespace Widgets {}"],
  ])("reports localized documentation on %s", async (_, source) => {
    await tester
      .expect(
        source.replace(
          "DECORATOR",
          '@doc("See https://docs.microsoft.com/en-us/azure/widgets for details.")',
        ),
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("reports links in doc comments and other locales", async () => {
    await tester
      .expect("/** See https://docs.microsoft.com/fr-fr/azure/widgets. */ model Widget {}")
      .toEmitDiagnostics([diagnostic]);
  });

  it.each(["returnsDoc", "errorsDoc"])("reports localized @%s", async (decorator) => {
    await tester
      .expect(
        `@${decorator}("See https://docs.microsoft.com/en-us/azure/widgets") op read(): string;`,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("reports links in response doc comments", async () => {
    await tester
      .expect(
        `
        /**
         * @returns See https://docs.microsoft.com/en-us/azure/widgets.
         */
        op read(): string;
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("reports a spread property's documentation once at its source", async () => {
    await tester
      .expect(
        `
        model Source {
          /** https://docs.microsoft.com/en-us/azure/widgets */
          name: string;
        }
        model One { ...Source; }
        model Two { ...Source; }
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("reports a spread property's @doc decorator once at its source", async () => {
    await tester
      .expect(
        `
        model Source {
          @doc("https://docs.microsoft.com/en-us/azure/widgets")
          name: string;
        }
        model One { ...Source; }
        model Two { ...Source; }
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("honors suppression on a source @doc decorator through property spreads", async () => {
    const [, diagnostics] = await Tester.compileAndDiagnose(
      `
        model Source {
          #suppress "@azure-tools/typespec-azure-core/no-localized-doc-links" "Exception."
          @doc("https://docs.microsoft.com/en-us/azure/widgets")
          name: string;
        }
        model One { ...Source; }
        model Two { ...Source; }
      `,
      {
        compilerOptions: {
          linterRuleSet: {
            enable: { "@azure-tools/typespec-azure-core/no-localized-doc-links": true },
          },
        },
      },
    );
    expectDiagnostics(diagnostics, []);
  });

  it.each([
    [
      "augment",
      'model Copy { ...Source; } @@doc(Copy.name, "https://docs.microsoft.com/en-us/azure/source");',
    ],
    [
      "property comment",
      "/** @prop name https://docs.microsoft.com/en-us/azure/copy */ model Copy { ...Source; }",
    ],
  ])(
    "reports an independently documented %s even when its source is suppressed",
    async (_, copy) => {
      const [, diagnostics] = await Tester.compileAndDiagnose(
        `
        model Source {
          #suppress "@azure-tools/typespec-azure-core/no-localized-doc-links" "Source exception."
          /** https://docs.microsoft.com/en-us/azure/source */
          name: string;
        }
        ${copy}
      `,
        {
          compilerOptions: {
            linterRuleSet: {
              enable: { "@azure-tools/typespec-azure-core/no-localized-doc-links": true },
            },
          },
        },
      );
      expectDiagnostics(diagnostics, [diagnostic]);
    },
  );

  it("reports inherited property documentation only at its author", async () => {
    await tester
      .expect(
        `
        model Source { name: string; }
        /** @prop name https://docs.microsoft.com/en-us/azure/widgets */
        model Middle { ...Source; }
        model Copy { ...Middle; }
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("reports copied operation parameter documentation at its author", async () => {
    const [, diagnostics] = await Tester.compileAndDiagnose(
      `
        @route("/source")
        op source(
          #suppress "@azure-tools/typespec-azure-core/no-localized-doc-links" "Source exception."
          name: string
        ): void;
        /** @param name https://docs.microsoft.com/en-us/azure/widgets */
        @route("/copy")
        op copy is source;
        @route("/next")
        op next is copy;
      `,
      {
        compilerOptions: {
          linterRuleSet: {
            enable: { "@azure-tools/typespec-azure-core/no-localized-doc-links": true },
          },
        },
      },
    );
    expectDiagnostics(diagnostics, [diagnostic]);
  });

  it("honors operation documentation suppression when its parameters are spread", async () => {
    const [, diagnostics] = await Tester.compileAndDiagnose(
      `
        @route("/source")
        op source(name: string): void;
        /** @param name https://docs.microsoft.com/en-us/azure/widgets */
        #suppress "@azure-tools/typespec-azure-core/no-localized-doc-links" "Exception."
        @route("/copy")
        op copy is source;
        model Parameters { ...copy::parameters; }
      `,
      {
        compilerOptions: {
          linterRuleSet: {
            enable: { "@azure-tools/typespec-azure-core/no-localized-doc-links": true },
          },
        },
      },
    );
    expectDiagnostics(diagnostics, []);
  });

  it("does not treat an empty property tag as the documentation author", async () => {
    const [, diagnostics] = await Tester.compileAndDiagnose(
      `
        model Source {
          #suppress "@azure-tools/typespec-azure-core/no-localized-doc-links" "Exception."
          /** https://docs.microsoft.com/en-us/azure/widgets */
          name: string;
        }
        /** @prop name */
        model Copy { ...Source; }
      `,
      {
        compilerOptions: {
          linterRuleSet: {
            enable: { "@azure-tools/typespec-azure-core/no-localized-doc-links": true },
          },
        },
      },
    );
    expectDiagnostics(diagnostics, []);
  });

  it("reports once when multiple documentation strings contain localized links", async () => {
    await tester
      .expect(
        `
        @doc("https://docs.microsoft.com/en-us/azure/widgets")
        @returnsDoc("https://docs.microsoft.com/zh-cn/azure/widgets")
        op read(): string;
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it.each([
    "https://docs.microsoft.com/azure/widgets",
    "https://docs.microsoft.com/en-us/dotnet/api",
    "https://learn.microsoft.com/en-us/azure/widgets",
    "https://example.com/en-us/azure/widgets",
    "http://docs.microsoft.com/en-us/azure/widgets",
    "ordinary documentation",
  ])("accepts documentation outside the Swagger link scope: %s", async (doc) => {
    await tester.expect(`@doc("${doc}") model Widget {}`).toBeValid();
  });

  it("does not check summaries", async () => {
    await tester
      .expect('@summary("https://docs.microsoft.com/en-us/azure/widgets") op read(): string;')
      .toBeValid();
  });
});
