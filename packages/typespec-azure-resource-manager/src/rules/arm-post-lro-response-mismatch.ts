import {
  CodeFix,
  Model,
  Operation,
  Program,
  createRule,
  getSourceLocation,
  isVoidType,
} from "@typespec/compiler";
import {
  type OperationSignatureReferenceNode,
  type OperationStatementNode,
  SyntaxKind,
  type TemplateArgumentNode,
} from "@typespec/compiler/ast";

import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import { HttpOperationResponse, HttpPayloadBody } from "@typespec/http";
import { ArmResourceOperation } from "../operations.js";
import { resolveArmResources } from "../resource.js";

function createLroHeadersCodeFix(op: Operation, responseTypeName: string): CodeFix | undefined {
  const node = op.node;
  if (node === undefined || node.kind !== SyntaxKind.OperationStatement) {
    return undefined;
  }

  const opNode = node as OperationStatementNode;
  const signature = opNode.signature;
  if (signature.kind !== SyntaxKind.OperationSignatureReference) {
    return undefined;
  }

  const sigRef = signature as OperationSignatureReferenceNode;
  const templateArgs: readonly TemplateArgumentNode[] = sigRef.baseOperation.arguments;
  const lroHeadersArg = templateArgs.find((arg) => arg.name?.sv === "LroHeaders");

  if (lroHeadersArg === undefined) {
    return undefined;
  }

  return {
    id: "arm-post-lro-set-final-result",
    label: `Set FinalResult to ${responseTypeName} in LroHeaders`,
    fix(context) {
      const argValueLocation = getSourceLocation(lroHeadersArg.argument);
      return context.replaceText(
        argValueLocation,
        `ArmLroLocationHeader<Azure.Core.StatusMonitorPollingOptions<ArmOperationStatus>, ${responseTypeName}>`,
      );
    },
  };
}

/**
 * Get the Response type from an operation's template parameter.
 * Looks at the operation's immediate sourceOperation to find a template parameter named "Response"
 * and returns the resolved type if it's a non-void Model.
 * Only checks the first level of template indirection to avoid picking up internal
 * template parameters (e.g., ArmResourceActionAsyncBase's Response parameter).
 */
function getResponseTemplateParam(op: Operation): Model | undefined {
  // The operation itself is a resolved instance, so we need to look at the
  // sourceOperation (the template). The templateMapper on sourceOperation
  // contains the resolved template arguments.
  const sourceOp: Operation | undefined = op.sourceOperation;
  const mapper = sourceOp?.templateMapper;
  if (sourceOp === undefined || mapper === undefined) {
    return undefined;
  }

  const templateParams = sourceOp.node?.templateParameters;
  if (templateParams === undefined) {
    return undefined;
  }

  for (let i = 0; i < templateParams.length; i++) {
    if (templateParams[i].id.sv === "Response") {
      const resolvedType = mapper.args[i];
      if (
        typeof resolvedType === "object" &&
        "kind" in resolvedType &&
        resolvedType.kind === "Model" &&
        !isVoidType(resolvedType)
      ) {
        return resolvedType as Model;
      }
      return undefined;
    }
  }
  return undefined;
}

/**
 * Get the body payload from an HTTP response, if present.
 */
function getResponseBody(response: HttpOperationResponse | undefined): HttpPayloadBody | undefined {
  if (response === undefined) return undefined;
  if (response.responses.length > 1) {
    throw new Error("Multiple responses are not supported.");
  }
  if (response.responses[0].body !== undefined) {
    return response.responses[0].body;
  }
  return undefined;
}

/**
 * Verify that the final result of an ARM LRO POST operation matches the Response parameter.
 */
export const armPostLroResponseMismatchRule = createRule({
  name: "arm-post-lro-response-mismatch",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/post-lro-response-mismatch",
  description:
    "Ensure that the final result of a long-running POST operation matches the Response parameter.",
  messages: {
    default: `The final result type of a long-running POST operation does not match the Response parameter. Specify the FinalResult in the LroHeaders parameter to match the response type. For example: 'LroHeaders = ArmLroLocationHeader<Azure.Core.StatusMonitorPollingOptions<ArmOperationStatus>, ResponseType>'.`,
  },
  create(context) {
    function validateOperation(op: ArmResourceOperation) {
      if (op.httpOperation.verb !== "post") {
        return;
      }
      const lroMetadata = getLroMetadata(context.program, op.operation);
      if (lroMetadata === undefined) {
        return;
      }

      // Get the Response type from the template parameter
      const responseType = getResponseTemplateParam(op.operation);

      if (responseType !== undefined) {
        // Template-based detection: Response template param is non-void but finalResult is void
        if (lroMetadata.finalResult === "void") {
          const responseTypeName = responseType.name;
          const codefixes: CodeFix[] = [];
          const codeFix = createLroHeadersCodeFix(op.operation, responseTypeName);
          if (codeFix !== undefined) {
            codefixes.push(codeFix);
          }
          context.reportDiagnostic({
            target: op.operation,
            codefixes,
          });
        }
      } else {
        // Fallback for non-template operations: check the 200 response body
        const response200 = op.httpOperation.responses.find((r) => r.statusCodes === 200);
        const body200 = getResponseBody(response200);
        if (body200 !== undefined && lroMetadata.finalResult === "void") {
          context.reportDiagnostic({
            target: op.operation,
          });
        }
      }
    }

    return {
      root: (program: Program) => {
        const provider = resolveArmResources(program);

        // Check resource-level actions
        for (const resource of provider.resources ?? []) {
          for (const op of resource.operations.actions) {
            validateOperation(op);
          }
        }

        // Check provider-level actions
        for (const op of provider.providerOperations ?? []) {
          validateOperation(op);
        }
      },
    };
  },
});
