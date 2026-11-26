import { createLinterRuleTester, t, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noRedundantClientNameRule } from "../../src/rules/no-redundant-client-name.js";
import { SimpleTester } from "../tester.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await SimpleTester.createInstance(),
    noRedundantClientNameRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

const diagnostic = {
  code: "@azure-tools/typespec-client-generator-core/no-redundant-client-name",
  severity: "warning" as const,
  message: "This @clientName override does not change SDK naming. Remove the override.",
};

it("reports a redundant model property override on the authored decorator", async () => {
  await tester
    .expect(t.code`model Widget { /*target*/@clientName("name") name: string; }`)
    .toEmitDiagnostics((result) => ({
      ...diagnostic,
      pos: result.pos.target.pos,
    }));
});

it("reports a redundant query parameter override", async () => {
  await tester
    .expect(
      `@service namespace Test; @get op read(@query @clientName("filter") filter: string): void;`,
    )
    .toEmitDiagnostics(diagnostic);
});

it("accepts properties and parameters without overrides", async () => {
  await tester
    .expect(`model Widget { name: string; } @get op read(@query filter: string): Widget;`)
    .toBeValid();
});

it.each(["other", "Name"])("preserves the real or case-only rename %s", async (name) => {
  await tester.expect(`model Widget { @clientName("${name}") name: string; }`).toBeValid();
});

it("does not use a wire name difference to justify a no-effect SDK override", async () => {
  await tester
    .expect(
      `
      model Widget { @encodedName("application/json", "wire_name") @clientName("name") name: string; }
      @get op read(@query("wire_filter") @clientName("filter") filter: string): Widget;
    `,
    )
    .toEmitDiagnostics([diagnostic, diagnostic]);
});

it("preserves a scoped reset to the source name instead of a different common name", async () => {
  await tester
    .expect(
      `
      model Widget {
        @clientName("name", "python")
        @clientName("other")
        name: string;
      }
    `,
    )
    .toBeValid();
});

it("reports a scoped repeat of the common fallback", async () => {
  await tester
    .expect(
      `
      model Widget {
        @clientName("other", "python")
        @clientName("other")
        name: string;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("keeps a multi-scope override when removal changes any selected language", async () => {
  await tester
    .expect(
      `
      model Widget {
        @clientName("other", "python, java")
        @clientName("different", "java, csharp")
        @clientName("other")
        name: string;
      }
    `,
    )
    .toBeValid();
});

it("uses scope options and negation precedence", async () => {
  await tester
    .expect(
      `
      model Widget {
        @clientName("other", #{scope: "python"})
        @clientName("other", "!java")
        name: string;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("preserves a negated override with an effect outside the excluded scope", async () => {
  await tester
    .expect(
      `
      model Widget {
        @clientName("other", "!java")
        @clientName("other", "python, java")
        name: string;
      }
    `,
    )
    .toBeValid();
});

it("preserves exact naming even when the spelling is unchanged", async () => {
  await tester.expect(`model Widget { @clientName(exact("name")) name: string; }`).toBeValid();
});

it("reports an exact scoped repeat but preserves a change to exact-name policy", async () => {
  await tester
    .expect(
      `
      model Widget {
        @clientName(exact("other"), "python")
        @clientName(exact("other"))
        name: string;
        @clientName("reset", "python")
        @clientName(exact("reset"))
        second: string;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("uses friendly-name fallback rather than source-name equality", async () => {
  await tester
    .expect(
      `
      model Widget {
        @clientName("name") @friendlyName("other") name: string;
        @clientName("other") @friendlyName("other") second: string;
        @clientName(exact("other")) @friendlyName("other") third: string;
      }
    `,
    )
    .toEmitDiagnostics([diagnostic, diagnostic]);
});

it("preserves an override that differs from a friendly-name source in one language", async () => {
  await tester
    .expect(
      `
      @clientName("other", "!java") model Source {}
      model Widget {
        @clientName("other") @friendlyName("{name}", Source) name: string;
      }
    `,
    )
    .toBeValid();
});

it("reports a repeat of an inherited name on the independently authored override", async () => {
  await tester
    .expect(
      t.code`
      model Base { @clientName("other") name: string; }
      model Copy { ...Base; }
      /*target*/@@clientName(Copy.name, "other", "python");
    `,
    )
    .toEmitDiagnostics((result) => ({ ...diagnostic, pos: result.pos.target.pos }));
});

it("reports a copied authored override once and an independent override separately", async () => {
  await tester
    .expect(
      `
      model Base { @clientName("name") name: string; }
      model Derived extends Base {}
      model Copy { ...Base; }
      model Independent { @clientName("name") name: string; }
    `,
    )
    .toEmitDiagnostics([diagnostic, diagnostic]);
});

it("preserves a scoped reset to an inherited common override", async () => {
  await tester
    .expect(
      `
      model Base { @clientName("other") name: string; }
      model Copy { ...Base; }
      @@clientName(Copy.name, "name", "python");
    `,
    )
    .toBeValid();
});

it("checks semantic decorator arguments separately for instantiated templates", async () => {
  await tester
    .expect(
      `
      model Named<Name extends valueof string> {
        @clientName(Name) name: string;
      }
      model Same is Named<"name">;
      model Renamed is Named<"other">;
    `,
    )
    .toBeValid();
});

it("reports a template-authored override once when all instances are redundant", async () => {
  await tester
    .expect(
      `
      model Named<Name extends valueof string> { @clientName(Name) name: string; }
      model First is Named<"name">;
      model Second is Named<"name">;
    `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("targets an independent augmented override", async () => {
  await tester
    .expect(
      t.code`
      model Widget { name: string; }
      /*target*/@@clientName(Widget.name, "name");
    `,
    )
    .toEmitDiagnostics((result) => ({ ...diagnostic, pos: result.pos.target.pos }));
});

it("preserves dependent friendly-name SDK naming effects", async () => {
  await tester
    .expect(
      `
      model Source {
        @clientName("renamed") @friendlyName("renamed") original: string;
      }
      model Result {
        @friendlyName("{name}", Source.original) value: string;
      }
      @get op read(): Result;
    `,
    )
    .toBeValid();
});

it("preserves scoped dependent friendly-name effects even when only the consumer is reachable", async () => {
  await tester
    .expect(
      `
      model Source {
        @clientName("renamed", "python") @friendlyName("renamed") original: string;
      }
      model Result {
        @friendlyName("{name}", Source.original) value: string;
      }
      @get op read(): Result;
    `,
    )
    .toBeValid();
});

it("reports redundant overrides when dependent friendly-name consumers have no naming effect", async () => {
  await tester
    .expect(
      `
      model Source {
        @clientName("renamed") @friendlyName("renamed") original: string;
        @clientName("same") @friendlyName("fallback") same: string;
        @clientName(exact("precise"), "python")
        @clientName(exact("precise"))
        precise: string;
      }
      model Result {
        @clientName("fixed") @friendlyName("{name}", Source.original) masked: string;
        @friendlyName("{name}", Source.same) unchanged: string;
        @friendlyName("{name}", Source.precise) precise: string;
      }
      @get op read(): Result;
    `,
    )
    .toEmitDiagnostics([diagnostic, diagnostic, diagnostic]);
});
