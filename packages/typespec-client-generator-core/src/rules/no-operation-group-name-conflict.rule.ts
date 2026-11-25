import { createRule, fileRef, paramMessage } from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import { AllScopes } from "../internal-utils.js";
import { getLibraryName } from "../public-utils.js";
import { getDefinedLanguageScopes } from "../validations/types.js";

export const noOperationGroupNameConflictRule = createRule({
  name: "no-operation-group-name-conflict",
  docs: fileRef.fromPackageRoot("src/rules/no-operation-group-name-conflict.md"),
  description: "Operation group names should not conflict with type names in the same namespace.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/no-operation-group-name-conflict",
  messages: {
    default: paramMessage`Operation group '${"groupName"}' conflicts with type '${"typeName"}'. Rename the group, for example by using a plural name.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      { mutateNamespace: false },
    );
    const scopes = new Set<string | typeof AllScopes>([
      AllScopes,
      ...getDefinedLanguageScopes(context.program),
    ]);
    return {
      namespace(namespace) {
        const types = [
          ...namespace.models.values(),
          ...namespace.scalars.values(),
          ...namespace.enums.values(),
          ...namespace.unions.values(),
        ];
        const groups = [...namespace.interfaces.values(), ...namespace.namespaces.values()].filter(
          (group) => group.operations.size > 0,
        );
        const reported = new Set<(typeof groups)[number]>();
        for (const scope of scopes) {
          const names = new Set(types.map((type) => getLibraryName(tcgcContext, type, scope)));
          for (const group of groups) {
            if (reported.has(group)) continue;
            const groupName = getLibraryName(tcgcContext, group, scope);
            if (!names.has(groupName)) continue;
            reported.add(group);
            context.reportDiagnostic({
              target: group,
              format: { groupName, typeName: groupName },
            });
          }
        }
      },
    };
  },
});
