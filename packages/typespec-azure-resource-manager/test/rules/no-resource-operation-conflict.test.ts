import { Tester } from "#test/tester.js";
import type { DecoratorContext, Model, Operation, Program } from "@typespec/compiler";
import { unsafe_mutateSubgraph, unsafe_MutatorFlow } from "@typespec/compiler/experimental";
import {
  createLinterRuleTester,
  mockFile,
  type DiagnosticMatch,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, expect, it } from "vitest";
import {
  $armResourceAction,
  $armResourceList,
  $armResourceRead,
  getArmResourceOperationData,
} from "../../src/operations.js";
import { noResourceOperationConflictRule } from "../../src/rules/no-resource-operation-conflict.js";

let tester: LinterRuleTester;
const service = `
  @armProviderNamespace namespace Microsoft.Test;
  model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
  model Other {}
`;
const warning = {
  code: "@azure-tools/typespec-azure-resource-manager/no-resource-operation-conflict",
  severity: "warning",
  message:
    "Resource operation is registered against multiple resource models: Microsoft.Test.Other, Microsoft.Test.Widget. Use the same resource model for every registration.",
} satisfies DiagnosticMatch;
const kindWarning = {
  ...warning,
  message:
    "Resource operation is registered with different operation kinds. Use one ARM operation kind consistently; @get and @list can be applied to resource actions without @armResourceList.",
} satisfies DiagnosticMatch;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    noResourceOperationConflictRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

describe("no-resource-operation-conflict", () => {
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

  it("allows a paged GET action without resource-list registration", async () => {
    await tester
      .expect(
        `${service}
      interface Custom {
        @get @list @armResourceAction(Widget)
        run(): ResourceListResult<Widget>;
      }
    `,
      )
      .toBeValid();
  });

  it.each(["armResourceList", "armResourceAction"])(
    "warns when @%s overrides the other kind",
    async (outer) => {
      const inner = outer === "armResourceList" ? "armResourceAction" : "armResourceList";
      await tester
        .expect(
          `${service}
      interface Custom {
        @get @list @${outer}(Widget) @${inner}(Widget)
        run(): ResourceListResult<Widget>;
      }
    `,
        )
        .toEmitDiagnostics([kindWarning]);
    },
  );

  it.each(["legacyResourceOperation", "legacyExtensionResourceOperation"])(
    "warns for different kinds through private %s",
    async (family) => {
      await tester
        .expect(
          `${service}
        interface Custom {
          @get @Azure.ResourceManager.Private.${family}(Widget, "list")
          @Azure.ResourceManager.Private.${family}(Widget, "action")
          run(): void;
        }
      `,
        )
        .toEmitDiagnostics([kindWarning]);
    },
  );

  it("supports compiler suppression of a kind conflict", async () => {
    await Tester.compile(
      `${service}
      interface Custom {
        #suppress "${warning.code}" "Preserve the latest registration for this legacy operation."
        @get @armResourceList(Widget) @armResourceAction(Widget)
        run(): void;
      }
    `,
      { compilerOptions: { linterRuleSet: { enable: { [warning.code]: true } } } },
    );
  });

  it("warns once when lifecycle kinds change back to the initial kind", async () => {
    await tester
      .expect(
        `${service}
      interface Custom {
        @get @armResourceRead(Widget)
        @armResourceUpdate(Widget) @armResourceRead(Widget)
        run(): void;
      }
    `,
      )
      .toEmitDiagnostics([kindWarning]);
  });

  it("reports both resource-model and operation-kind conflicts", async () => {
    await tester
      .expect(
        `${service}
      interface Custom {
        @get @armResourceAction(Other) @armResourceList(Widget)
        run(): void;
      }
    `,
      )
      .toEmitDiagnostics([kindWarning, warning]);
  });

  it("detects kind changes made by a custom JavaScript decorator", async () => {
    const customized = Tester.files({
      "custom-kind.js": mockFile.js({
        namespace: "Microsoft.Test",
        $customKind(context: DecoratorContext, operation: Operation, model: Model) {
          context.call($armResourceAction, operation, model);
          context.call($armResourceList, operation, model);
        },
      }),
    }).import("./custom-kind.js");
    const ruleTester = createLinterRuleTester(
      await customized.createInstance(),
      noResourceOperationConflictRule,
      "@azure-tools/typespec-azure-resource-manager",
    );
    await ruleTester
      .expect(
        `${service}
      extern dec customKind(target: TypeSpec.Reflection.Operation, resource: TypeSpec.Reflection.Model);
      interface Custom { @get @customKind(Widget) run(): void; }
    `,
      )
      .toEmitDiagnostics([kindWarning]);
  });

  it("does not report kind overrides on mutated operations as source conflicts", async () => {
    let registration: { context: DecoratorContext; operation: Operation; model: Model } | undefined;
    let replayed = false;
    const customized = Tester.files({
      "mutation.js": mockFile.js({
        namespace: "Microsoft.Test",
        $capture(context: DecoratorContext, operation: Operation, model: Model) {
          registration ??= { context, operation, model };
        },
        $onValidate(program: Program) {
          if (registration === undefined) throw new Error("Missing source registration");
          const { context, operation, model } = registration;
          const projection = unsafe_mutateSubgraph(
            program,
            [
              {
                name: "Operation-only kind override",
                Model: {
                  filter: () => unsafe_MutatorFlow.DoNotMutate | unsafe_MutatorFlow.DoNotRecur,
                  mutate: () => {
                    throw new Error("The resource model must remain shared");
                  },
                },
                Operation: (_source, clone) => {
                  clone.name = "projectedAction";
                },
              },
            ],
            operation,
          );
          if (projection.type.kind !== "Operation") throw new Error("Expected an operation");
          context.call($armResourceAction, projection.type, model);
          expect(getArmResourceOperationData(program, projection.type)?.kind).toBe("action");
          expect(getArmResourceOperationData(program, operation)?.kind).toBe("read");
          replayed = true;
        },
      }),
    }).import("./mutation.js");
    const ruleTester = createLinterRuleTester(
      await customized.createInstance(),
      noResourceOperationConflictRule,
      "@azure-tools/typespec-azure-resource-manager",
    );
    await ruleTester
      .expect(
        `${service}
      extern dec capture(target: TypeSpec.Reflection.Operation, resource: TypeSpec.Reflection.Model);
      interface Custom {
        @get @capture(Widget) @armResourceRead(Widget) run(): void;
      }
    `,
      )
      .toBeValid();
    expect(replayed).toBe(true);
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
      noResourceOperationConflictRule,
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
