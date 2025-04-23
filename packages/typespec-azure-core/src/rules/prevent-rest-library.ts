import {
  Interface,
  Operation,
  Program,
  createRule,
  getNamespaceFullName,
} from "@typespec/compiler";
import { TypeReferenceNode } from "@typespec/compiler/ast";
import { isExcludedCoreType } from "./utils.js";

function getTypeReferenceNamespace(program: Program, ref: TypeReferenceNode): string {
  const baseOperation = program.checker.getTypeForNode(ref) as Operation;
  return baseOperation.namespace ? getNamespaceFullName(baseOperation.namespace) : "";
}

export const preventRestLibraryInterfaces = createRule({
  name: "no-rest-library-interfaces",
  description:
    "Resource interfaces from the TypeSpec.Rest.Resource library are incompatible with Azure.Core.",
  severity: "warning",
  messages: {
    default: `Resource interfaces from the TypeSpec.Rest.Resource library are incompatible with Azure.Core.`,
  },
  create(context) {
    return {
      interface: (interfaceContext: Interface) => {
        // If the interface itself is defined in an approved namespace, skip it
        if (isExcludedCoreType(context.program, interfaceContext)) {
          return;
        }

        // If any interface in the `extends` list comes from `TypeSpec.Rest.Resource`, mark it
        const restInterface = interfaceContext.node?.extends.find(
          (i) => getTypeReferenceNamespace(context.program, i) === "TypeSpec.Rest.Resource",
        );

        if (restInterface) {
          context.reportDiagnostic({
            target: interfaceContext,
          });
        }
      },
    };
  },
});
