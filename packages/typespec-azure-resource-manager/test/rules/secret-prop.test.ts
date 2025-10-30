import { Tester } from "#test/tester.js";
import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { secretProprule } from "../../src/rules/secret-prop.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    secretProprule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

describe("emit warning for property ending with words", () => {
  it.each(["Auth", "Password", "Token", "Secret"])("for keyword %s", async (keyword) => {
    await tester
      .expect(`model Test { some${keyword}: string; }; op test(): Test;`)
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/secret-prop",
        message: `Property 'some${keyword}' looks like it contains sensitive information. Consider marking it with @secret decorator to ensure it is handled securely.`,
      });
  });
});

describe("doesn't excluded suffix", async () => {
  it.each(["publicKey"])("for keyword %s", async (keyword) => {
    await tester.expect(`model Test { some${keyword}: string; }; op test(): Test;`).toBeValid();
  });
});

it("doesn't flag if the property is only used in the middle", async () => {
  await tester
    .expect(
      `
      model Test { passwordConfig: string; }
      op test(test: Test, key: string): void;
    `,
    )
    .toBeValid();
});

it("doesn't flag if the property is not used in output", async () => {
  await tester
    .expect(
      `
    model Test { password: string; }
    op test(test: Test, key: string): void;
  `,
    )
    .toBeValid();
});

it("valid if the property has @secret", async () => {
  await tester
    .expect(
      `
        model Test {
          @secret
          somePassword: string;
        }
        `,
    )
    .toBeValid();
});

it("valid if the property type has @secret", async () => {
  await tester
    .expect(
      `
        model Test {
          somePassword: myPassword;
        }
        
        @secret
        scalar myPassword extends string;
        `,
    )
    .toBeValid();
});

describe("codefix", () => {
  it("add @secret on the property", async () => {
    await tester
      .expect(
        `
        model Test {
          somePassword: string;
        }
        op test(): Test;
      `,
      )
      .applyCodeFix("add-decorator-secret").toEqual(`
        model FooModel {
          @secret
          somePassword: string;
        }
        op test(): Test;
      `);
  });
});
