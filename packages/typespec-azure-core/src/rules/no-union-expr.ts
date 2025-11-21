import { createRule, paramMessage } from "@typespec/compiler";
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
    return {
      modelProperty: (prop) => {
        const type = prop.type;
        if (
          type.kind === "Union" &&
          !type.name &&
          !isStatusCode(program, prop) &&
          !(
            isHeader(program, prop) &&
            getHeaderFieldName(program, prop).toLowerCase() === "content-type"
          ) &&
          [...type.variants.values()].filter((v) => v.type !== $(program).intrinsic.null).length > 1
        ) {
          context.reportDiagnostic({
            format: { enumName: type.name },
            target: prop,
            codefixes: [],
          });
        }
      },
    };
  },
});
