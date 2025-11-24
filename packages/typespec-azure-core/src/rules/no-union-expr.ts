import { createRule, paramMessage, Program, Union } from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { getHeaderFieldName, isHeader, isStatusCode } from "@typespec/http";

export const noUnionExprRule = createRule({
  name: "no-union-expr",
  description: "Azure services should not define union expression but create a declaration.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-union-expr",
  messages: {
    default: paramMessage`Union expression should be defined as a named union declaration.`,
  },
  create(context) {
    const program = context.program;
    const excludedUnions = new Set<Union>();
    const invalidUnions = new Set<Union>();

    return {
      modelProperty: (prop) => {
        const type = prop.type;
        if (type.kind !== "Union" || type.name) {
          return;
        }

        if (
          isStatusCode(program, prop) ||
          (isHeader(program, type) &&
            getHeaderFieldName(program, type).toLowerCase() === "content-type")
        ) {
          excludedUnions.add(type);
        }
      },
      operation: (operation) => {
        if (operation.returnType.kind === "Union") {
          excludedUnions.add(operation.returnType);
        }
      },
      union: (union) => {
        if (union.kind === "Union" && !union.name && !isOnlyNullableUnion(program, union)) {
          invalidUnions.add(union);
        }
      },
      exit: () => {
        for (const union of invalidUnions) {
          if (!excludedUnions.has(union)) {
            context.reportDiagnostic({
              format: { enumName: union.name },
              target: union,
              codefixes: [],
            });
          }
        }
      },
    };
  },
});

/** Check if the union is only there to make the type nullable */
function isOnlyNullableUnion(program: Program, union: Union): boolean {
  return (
    [...union.variants.values()].filter((v) => v.type !== $(program).intrinsic.null).length === 1
  );
}
