import { Tester, TesterWithService } from "#test/test-host.js";
import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { useExplicitActionRule } from "../../src/rules/use-explicit-action.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await TesterWithService.createInstance(),
    useExplicitActionRule,
    "@azure-tools/typespec-azure-core",
  );
});

describe("use-explicit-action", () => {
  it.each([
    ["post", ""],
    ["post", '@action("myNewAction")'],
    ["get", ""],
  ])("warns only on reuse that changes the action segment (%s, %s)", async (verb, decorator) => {
    await tester
      .expect(
        `
          @autoRoute
          interface SomeInterface {
            @${verb}
            @action
            op myOldAction(): void;
          }

          ${decorator}
          op myNewAction is SomeInterface.myOldAction;
          `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/use-explicit-action",
          severity: "warning",
          message:
            'Reusing action "Azure.MyService.SomeInterface.myOldAction" as "Azure.MyService.myNewAction" changes its suffix from "myOldAction" to "myNewAction". Specify the intended suffix with @action("myOldAction").',
        },
      ]);
  });

  it.each(["", '@action("myAction")'])(
    "does not warn for an action that is not reused (%s)",
    async (decorator) => {
      await tester
        .expect(
          `
          @autoRoute
          @post
          ${decorator || "@action"}
          op myAction(): void;
          `,
        )
        .toBeValid();
    },
  );

  it.each([
    ["myOldAction", "", ""],
    ["myNewAction", '@action("myOldAction")', ""],
    ["myNewAction", "", '@action("myOldAction")'],
  ])(
    "does not warn when reuse preserves the action segment (%s, %s, %s)",
    async (name, sourceDecorator, targetDecorator) => {
      await tester
        .expect(
          `
          @autoRoute
          interface SomeInterface {
            @post
            ${sourceDecorator || "@action"}
            op myOldAction(): void;
          }

          @route("/aliases")
          interface AliasInterface {
            ${targetDecorator}
            op ${name} is SomeInterface.myOldAction;
          }
          `,
        )
        .toBeValid();
    },
  );

  it("does not warn when action metadata changes but explicit routes do not use it", async () => {
    await tester
      .expect(
        `
        @route("/original")
        interface SomeInterface {
          @post
          @action
          op myOldAction(): void;
        }

        @route("/aliases")
        interface AliasInterface {
          op myNewAction is SomeInterface.myOldAction;
        }
        `,
      )
      .toBeValid();
  });

  it("does not warn when the resolved path is unchanged", async () => {
    await tester
      .expect(
        `
        @route("/actions")
        @autoRoute
        interface SomeInterface {
          @post
          @sharedRoute
          @action("widgets/myOldAction")
          op myOldAction(): void;
        }

        @route("/actions/widgets")
        interface AliasInterface {
          @action("myOldAction")
          op myNewAction is SomeInterface.myOldAction;
        }
        `,
      )
      .toBeValid();
  });

  it("compares each reuse with its immediate source", async () => {
    await tester
      .expect(
        `
        @route("/original")
        @autoRoute
        interface SomeInterface {
          @post
          @action
          op myOldAction(): void;
        }

        @action("myOldAction")
        op actionAlias is SomeInterface.myOldAction;

        @action("myNewAction")
        op myNewAction is actionAlias;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/use-explicit-action",
          severity: "warning",
          message:
            'Reusing action "Azure.MyService.actionAlias" as "Azure.MyService.myNewAction" changes its suffix from "myOldAction" to "myNewAction". Specify the intended suffix with @action("myOldAction").',
        },
      ]);
  });

  it("does not warn for reused non-actions", async () => {
    await tester
      .expect(
        `
        @autoRoute
        interface SomeInterface {
          @post op createWidget(): void;
        }

        @route("/aliases") op createAlias is SomeInterface.createWidget;
        `,
      )
      .toBeValid();
  });

  it("does not warn for uninstantiated action templates", async () => {
    await tester
      .expect(
        `
        @autoRoute @post @action
        op genericAction<T>(@body body: T): void;
        op genericAlias<T> is genericAction<T>;

        @autoRoute
        interface Actions<T> {
          op actionAlias is genericAction<T>;
        }
        `,
      )
      .toBeValid();
  });

  it("does not treat template instantiation as reusing a concrete action", async () => {
    await tester
      .expect(
        `
        model Request { value: string; }

        @autoRoute @action
        op genericAction<T>(@body body: T): void;
        op concreteAction is genericAction<Request>;

        @route("/interfaces")
        @autoRoute
        interface Actions<T> {
          @action op original(@body body: T): void;
        }
        alias ConcreteActions = Actions<Request>;
        op renamedAction is ConcreteActions.original;
        `,
      )
      .toBeValid();
  });

  it("checks subsequent reuse of a concrete action created from a template", async () => {
    await tester
      .expect(
        `
        @autoRoute @action
        op genericAction<T>(@body body: T): void;
        op concreteAction is genericAction<string>;
        op renamedAction is concreteAction;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/use-explicit-action",
          severity: "warning",
          message:
            'Reusing action "Azure.MyService.concreteAction" as "Azure.MyService.renamedAction" changes its suffix from "concreteAction" to "renamedAction". Specify the intended suffix with @action("concreteAction").',
        },
      ]);
  });

  it("does not warn for reused actions in library namespaces", async () => {
    const libraryTester = createLinterRuleTester(
      await Tester.createInstance(),
      useExplicitActionRule,
      "@azure-tools/typespec-azure-core",
    );
    await libraryTester
      .expect(
        `
        namespace Azure.Core.Test {
          @autoRoute @post @action op coreAction(): void;
          op renamedCoreAction is coreAction;
        }

        namespace Azure.ResourceManager.Test {
          @autoRoute @post @action op armAction(): void;
          op renamedArmAction is armAction;
        }
        `,
      )
      .toBeValid();
  });
});
