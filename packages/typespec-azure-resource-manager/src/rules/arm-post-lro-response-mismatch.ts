import {
  CodeFix,
  Model,
  Operation,
  Program,
  createRule,
  getSourceLocation,
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
import { getArmResources } from "../resource.js";

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
 * Verify that the final result of an ARM LRO POST operation matches the 200 response body.
 */
export const armPostLroResponseMismatchRule = createRule({
  name: "arm-post-lro-response-mismatch",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/post-lro-response-mismatch",
  description:
    "Ensure that the final result of a long-running POST operation matches the 200 response body.",
  messages: {
    default: `The final result type of a long-running POST operation does not match the 200 response body. Specify the FinalResult in the LroHeaders parameter to match the response type. For example: 'LroHeaders = ArmLroLocationHeader<Azure.Core.StatusMonitorPollingOptions<ArmOperationStatus>, ResponseType>'.`,
  },
  create(context) {
    function getResponseBody(
      response: HttpOperationResponse | undefined,
    ): HttpPayloadBody | undefined {
      if (response === undefined) return undefined;
      if (response.responses.length > 1) {
        return undefined;
      }
      if (response.responses[0].body !== undefined) {
        return response.responses[0].body;
      }
      return undefined;
    }

    function getResponseBodyType(op: ArmResourceOperation): Model | undefined {
      const response200 = op.httpOperation.responses.find((r) => r.statusCodes === 200);
      const body200 = getResponseBody(response200);
      if (body200 === undefined) return undefined;
      const bodyType = body200.type;
      if (bodyType.kind === "Model") {
        return bodyType;
      }
      return undefined;
    }

    return {
      root: (program: Program) => {
        const resources = getArmResources(program);
        for (const resource of resources) {
          const operations = [
            resource.operations.lifecycle.createOrUpdate,
            resource.operations.lifecycle.update,
            ...Object.values(resource.operations.actions),
          ];
          for (const op of operations) {
            if (op === undefined || op.httpOperation.verb !== "post") {
              continue;
            }
            const lroMetadata = getLroMetadata(context.program, op.operation);
            if (lroMetadata === undefined) {
              continue;
            }

            const responseBodyType = getResponseBodyType(op);
            if (responseBodyType === undefined) {
              // No 200 response body - nothing to check
              continue;
            }

            // If the final result is "void" but there is a 200 response body, this is a mismatch
            if (lroMetadata.finalResult === "void") {
              const responseTypeName = responseBodyType.name;
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
          }
        }
      },
    };
  },
});
