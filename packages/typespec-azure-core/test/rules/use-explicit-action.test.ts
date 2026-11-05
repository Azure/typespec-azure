import { Tester, TesterWithService } from "#test/test-host.js";
import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { useExplicitActionRule } from "../../src/rules/use-explicit-action.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await TesterWithService.createInstance();
  tester = createLinterRuleTester(
    runner,
    useExplicitActionRule,
    "@azure-tools/typespec-azure-core",
  );
});

describe("use-explicit-action", () => {
  it("warns when reusing an action changes its suffix", async () => {
    await tester
      .expect(
        `
        @autoRoute
        interface SomeInterface {
          @post
          @action
          op myOldAction(): void;
        }

        op myNewAction is SomeInterface.myOldAction;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/use-explicit-action",
          severity: "warning",
          message:
            'Reusing POST action "Azure.MyService.SomeInterface.myOldAction" as "Azure.MyService.myNewAction" changes its suffix from "myOldAction" to "myNewAction". Specify the intended suffix with @action("myOldAction").',
        },
        {
          code: "@azure-tools/typespec-azure-core/use-explicit-action",
          severity: "warning",
          message:
            'POST action "Azure.MyService.SomeInterface.myOldAction" should specify its action suffix with @action("myOldAction").',
        },
      ]);
  });

  it("warns when an action does not specify its suffix", async () => {
    await tester
      .expect(
        `
        @post
        @action
        op myAction(): void;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/use-explicit-action",
          severity: "warning",
          message:
            'POST action "Azure.MyService.myAction" should specify its action suffix with @action("myAction").',
        },
      ]);
  });

  it("does not warn when the intended action suffix is explicit", async () => {
    await tester
      .expect(
        `
        @post
        @action("myAction")
        op myAction(): void;
        `,
      )
      .toBeValid();
  });

  it("does not warn when a reused action keeps an explicit suffix", async () => {
    await tester
      .expect(
        `
        @autoRoute
        interface SomeInterface {
          @post
          @action("myOldAction")
          op myOldAction(): void;
        }

        @route("/aliases")
        interface AliasInterface {
          @action("myOldAction")
          op myNewAction is SomeInterface.myOldAction;
        }
        `,
      )
      .toBeValid();
  });

  it("does not warn for POST operations that are not actions", async () => {
    await tester
      .expect(
        `
        @post
        op createWidget(): void;
        `,
      )
      .toBeValid();
  });

  it("does not warn for GET actions", async () => {
    await tester
      .expect(
        `
        @get
        @action
        op getAction(): void;
        `,
      )
      .toBeValid();
  });

  it("does not warn for action operations in library namespaces", async () => {
    const runner = await Tester.createInstance();
    const libraryTester = createLinterRuleTester(
      runner,
      useExplicitActionRule,
      "@azure-tools/typespec-azure-core",
    );
    await libraryTester
      .expect(
        `
        namespace Azure.Core.Test {
          @route("/core")
          @post
          @action
          op coreAction(): void;
        }

        namespace Azure.ResourceManager.Test {
          @route("/resource-manager")
          @post
          @action
          op armAction(): void;
        }
        `,
      )
      .toBeValid();
  });
});
