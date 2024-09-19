import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { friendlyNameRule } from "../../src/rules/friendly-name.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: friendly-name rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(runner, friendlyNameRule, "@azure-tools/typespec-azure-core");
  });

  describe("@friendlyName decorate template", () => {
    it("valid", async () => {
      await tester
        .expect(
          `
          @friendlyName("{name}Page", T)
          model Page<T> {
            size: int32;
            item: T[];
          }

          model User {
            id: string
          }
          
          @friendlyName("List{name}", T)
          op listTemplate<T>(): Page<T>;

          @friendlyName("Update{name}", T)
          op updateTemplate<T>(body: T): T;

          op list is listTemplate<User>;

          op update is updateTemplate<User>;
          `,
        )
        .toBeValid();
    });

    it("decorate non-template type", async () => {
      await tester
        .expect(
          `
          @friendlyName("FriendlyEnum")
          enum TestEnum {
            Foo,
            Bar,
          }

          @friendlyName("FriendlyModel")
          model TestModel {
          }
          `,
        )
        .toEmitDiagnostics([
          {
            code: "@azure-tools/typespec-azure-core/friendly-name",
            message: `@friendlyName should decorate template and use template parameter's properties in friendly name.`,
          },
          {
            code: "@azure-tools/typespec-azure-core/friendly-name",
            message: `@friendlyName should not decorate Enum.`,
          },
        ]);
    });

    it("friendly name without template parameter", async () => {
      await tester
        .expect(
          `
          @friendlyName("FriendlyUpdate")
          op updateTemplate<T>(body: T): T;

          model User {
            id: string
          }

          op update is updateTemplate<User>;
          `,
        )
        .toEmitDiagnostics([
          {
            code: "@azure-tools/typespec-azure-core/friendly-name",
            message: `@friendlyName should decorate template and use template parameter's properties in friendly name.`,
          },
        ]);
    });
  });
});
