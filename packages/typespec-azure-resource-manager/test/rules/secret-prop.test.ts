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

describe("emit warning for property containing words", () => {
  it.each(["Auth", "Password", "Token", "Secret"])("for keyword %s", async (keyword) => {
    await tester
      .expect(`model Test { some${keyword}Info: string; }; op test(): Test;`)
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/secret-prop",
        message: `Property 'some${keyword}Info' looks like it contains sensitive information. Consider marking it with @secret decorator to ensure it is handled securely.`,
      });
  });
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
          somePasswordInfo: string;
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
          somePasswordInfo: myPassword;
        }
        
        @secret
        scalar myPassword extends string;
        `,
    )
    .toBeValid();
});
