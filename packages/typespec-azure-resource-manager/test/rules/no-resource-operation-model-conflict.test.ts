import { Tester } from "#test/tester.js";
import type { DecoratorContext, Model, Operation } from "@typespec/compiler";
import {
  createLinterRuleTester,
  mockFile,
  type DiagnosticMatch,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { $armResourceRead } from "../../src/operations.js";
import { noResourceOperationModelConflictRule } from "../../src/rules/no-resource-operation-model-conflict.js";

let tester: LinterRuleTester;
const service = `
  @armProviderNamespace namespace Microsoft.Test;
  model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
  model Other {}
`;
const warning = {
  code: "@azure-tools/typespec-azure-resource-manager/no-resource-operation-model-conflict",
  severity: "warning",
  message:
    "Resource operation is registered against multiple resource models: Microsoft.Test.Other, Microsoft.Test.Widget. Use the same resource model for every registration.",
} satisfies DiagnosticMatch;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    noResourceOperationModelConflictRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

describe("no-resource-operation-model-conflict", () => {
  it("ignores internal library operations", async () => {
    await tester.expect("").toBeValid();
  });

  it("allows grouping overrides and independent operations", async () => {
    await tester
      .expect(
        `${service}
      interface Custom {
        @get @route("/one")
        @armResourceRead(Widget, "NamedWidgets")
        @armResourceRead(Widget)
        read(): void;
        @get @route("/two") @armResourceRead(Other) other(): void;
      }
    `,
      )
      .toBeValid();
  });

  for (const decorator of [
    "armResourceRead",
    "armResourceCreateOrUpdate",
    "armResourceUpdate",
    "armResourceDelete",
    "armResourceList",
    "armResourceAction",
    "armResourceCheckExistence",
  ]) {
    it.each(["Widget,Other", "Other,Widget"])(
      `warns for @${decorator} with distinct models in order %s`,
      async (order) => {
        const [first, second] = order.split(",");
        await tester
          .expect(
            `${service}
          interface Custom {
            @route("/one")
            @${decorator}(${first})
            @${decorator}(${second})
            run(): void;
          }
        `,
          )
          .toEmitDiagnostics([warning]);
      },
    );
  }

  for (const family of [
    "extensionResourceOperation",
    "builtInResourceOperation",
    "legacyResourceOperation",
    "legacyExtensionResourceOperation",
  ]) {
    const prefix = family.startsWith("legacy") ? "" : "Extension.Subscription, ";
    it(`warns for private ${family}`, async () => {
      await tester
        .expect(
          `${service}
        interface Custom {
          @get @route("/one")
          @Azure.ResourceManager.Private.${family}(${prefix}Widget, "read")
          @Azure.ResourceManager.Private.${family}(${prefix}Other, "read")
          run(): void;
        }
      `,
        )
        .toEmitDiagnostics([warning]);
    });
  }

  it("supports compiler suppression", async () => {
    await Tester.compile(
      `${service}
      interface Custom {
        #suppress "${warning.code}" "Approved exception."
        @get @route("/one")
        @armResourceRead(Widget)
        @armResourceRead(Other)
        run(): void;
      }
    `,
      {
        compilerOptions: { linterRuleSet: { enable: { [warning.code]: true } } },
      },
    );
  });

  it("recognizes an alias as the same resource model", async () => {
    await tester
      .expect(
        `${service}
      alias SameWidget = Widget;
      interface Custom {
        @get @armResourceRead(SameWidget, "NamedWidgets")
        @armResourceRead(Widget) read(): void;
      }
    `,
      )
      .toBeValid();
  });

  it("distinguishes generic instances with the same declaration name", async () => {
    await tester
      .expect(
        `${service}
      model Box<T> { value: T; }
      interface Custom {
        @get @armResourceRead(Box<string>)
        @armResourceRead(Box<int32>) read(): void;
      }
    `,
      )
      .toEmitDiagnostics([
        {
          ...warning,
          message:
            /Resource operation is registered against multiple resource models: .*Box<.*int32.*>, .*Box<.*string.*>/,
        },
      ]);
  });

  it("checks registrations inherited through an operation alias", async () => {
    await tester
      .expect(
        `${service}
      interface Base {
        @get @route("/base") @armResourceRead(Widget) read(): void;
      }
      interface Derived {
        @get @route("/derived") @armResourceRead(Other) read is Base.read;
      }
    `,
      )
      .toEmitDiagnostics([warning]);
  });

  it("checks registrations made by a custom JavaScript decorator", async () => {
    const customized = Tester.files({
      "custom.js": mockFile.js({
        namespace: "Microsoft.Test",
        $customRead(context: DecoratorContext, operation: Operation, first: Model, second: Model) {
          context.call($armResourceRead, operation, first);
          context.call($armResourceRead, operation, second);
        },
      }),
    }).import("./custom.js");
    const customRuleTester = createLinterRuleTester(
      await customized.createInstance(),
      noResourceOperationModelConflictRule,
      "@azure-tools/typespec-azure-resource-manager",
    );
    await customRuleTester
      .expect(
        `
      ${service}
      extern dec customRead(target: TypeSpec.Reflection.Operation,
        first: TypeSpec.Reflection.Model, second: TypeSpec.Reflection.Model);
      interface Custom {
        @get @customRead(Widget, Other) read(): void;
      }
    `,
      )
      .toEmitDiagnostics([warning]);
  });
});
