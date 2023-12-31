import {
  Operation,
  Program,
  SyntaxKind,
  createRule,
  getNamespaceFullName,
  isTemplateDeclarationOrInstance,
  paramMessage,
} from "@typespec/compiler";
import { isExcludedCoreType } from "./utils.js";

// HACK HACK HACK: This should be removed once Azure.Core-compatible
// Azure.ResourceManager operations are added
let checkStandardOperationsEnabled = true;
export function __unsupported_enable_checkStandardOperations(enabled: boolean): void {
  checkStandardOperationsEnabled = enabled;
}

function derivesFromAzureCoreOperation(program: Program, operation: Operation): boolean {
  // Check every link in the signature chain
  while (operation.node.signature.kind === SyntaxKind.OperationSignatureReference) {
    const baseOp = program.checker.getTypeForNode(
      operation.node.signature.baseOperation
    ) as Operation;

    if (baseOp.namespace && getNamespaceFullName(baseOp.namespace) === "Azure.Core") {
      return true;
    }

    // See if the base operation ultimately derives from an Azure.Core operation
    operation = baseOp;
  }

  return false;
}

export const useStandardOperations = createRule({
  name: "use-standard-operations",
  description: "Operations should be defined using a signature from the Azure.Core namespace.",
  severity: "warning",
  messages: {
    default: paramMessage`Operation '${"name"}' should be defined using a signature from the Azure.Core namespace.`,
  },
  create(context) {
    return {
      operation: (operationContext: Operation) => {
        // HACK HACK HACK: This should be removed once Azure.Core-compatible
        // Azure.ResourceManager operations are added
        if (!checkStandardOperationsEnabled) return;

        // Can we skip this operation?  Either it or the interface it's defined in
        // has to be defined in an approved namespace, or the operation itself must
        // be templated.
        if (
          (operationContext.interface &&
            isExcludedCoreType(context.program, operationContext.interface)) ||
          (!operationContext.interface && isExcludedCoreType(context.program, operationContext)) ||
          isTemplateDeclarationOrInstance(operationContext)
        ) {
          return;
        }

        // If the operation comes from a TypeSpec.Rest.Resource interface, skip it
        // because another linting rule will mark the whole interface instead
        if (
          operationContext.interface &&
          operationContext.namespace &&
          getNamespaceFullName(operationContext.namespace) === "TypeSpec.Rest.Resource"
        ) {
          return;
        }

        // Otherwise, if the operation signature is a raw declaration or does not
        // derive from an operation in Azure.Core, it violates this linting rule.
        if (
          operationContext.node.signature.kind === SyntaxKind.OperationSignatureDeclaration ||
          !derivesFromAzureCoreOperation(context.program, operationContext)
        ) {
          context.reportDiagnostic({
            // If the namespace where the operation's interface is defined is
            // different than the namespace we're in, mark the operation's
            // interface instead so that the diagnostic doesn't end up on a
            // library operation
            target:
              operationContext.interface &&
              operationContext.interface.namespace !== operationContext.namespace
                ? operationContext.interface
                : operationContext,
            format: {
              name: operationContext.name,
            },
          });
        }
      },
    };
  },
});
