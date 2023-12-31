import { Union, createRule, ignoreDiagnostics } from "@typespec/compiler";
import { getUnionAsEnum } from "../helpers/union-enums.js";

export const noClosedLiteralUnionRule = createRule({
  name: "no-closed-literal-union",
  description: "Unions of literals should include the base scalar type to mark them as open enum.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-closed-literal-union",
  messages: {
    default: `Union of literals should include the base scalar as a variant to make it an open enum. (ex: \`union Choice { Yes: "yes", No: "no", string };\`).`,
  },
  create(context) {
    return {
      union: (union: Union) => {
        const e = ignoreDiagnostics(getUnionAsEnum(union));
        if (e === undefined) {
          return;
        }
        if (!e.open) {
          context.reportDiagnostic({
            target: union,
          });
        }
      },
    };
  },
});
