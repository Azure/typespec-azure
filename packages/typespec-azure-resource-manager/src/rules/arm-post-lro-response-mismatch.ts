import {
  CodeFix,
  Operation,
  Program,
  Type,
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
import { $ } from "@typespec/compiler/typekit";

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
        `ArmLroLocationHeader<FinalResult = ${responseTypeName}>`,
      );
    },
  };
}

/**
 * Get the Response type from an operation's template parameter.
 * Looks at the operation's immediate sourceOperation to find a template parameter named "Response"
 * and returns the resolved type if it's a non-void Type (Model, Scalar, or UnknownType).
 * Only checks the first level of template indirection to avoid picking up internal
 * template parameters (e.g., ArmResourceActionAsyncBase's Response parameter).
 */
function getResponseTemplateParam(op: Operation): Type | undefined {
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
        !isVoidType(resolvedType as Type)
      ) {
        return resolvedType as Type;
      }
      return undefined;
    }
  }
  return undefined;
}

/**
 * Get the body payload from an HTTP response's 200 status code, if present.
 */
function getResponseBody(responses: HttpOperationResponse[]): HttpPayloadBody | undefined {
  const response200 = responses.find((r) => r.statusCodes === 200);
  if (response200 === undefined) return undefined;
  if (response200.responses.length === 0) return undefined;
  if (response200.responses[0].body !== undefined) {
    return response200.responses[0].body;
  }
  return undefined;
}

/**
 * Get a printable name for a type, if available.
 */
function getTypeName(type: Type): string | undefined {
  switch (type.kind) {
    case "Model":
      return type.name;
    case "Scalar":
      return type.name;
    case "Intrinsic":
      return type.name;
    default:
      return undefined;
  }
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
    default: `The final result type of a long-running POST operation does not match the Response parameter. Specify the FinalResult in the LroHeaders parameter to match the response type. For example: 'LroHeaders = ArmLroLocationHeader<FinalResult = ResponseType>'.`,
  },
  create(context) {
    /**
     * Checks if the finalResult type matches the expected response type.
     * Returns true if they match or if the comparison is not applicable.
     * Returns false if there is a mismatch.
     */
    function doesFinalResultMatch(finalResult: Type | "void", expectedResponseType: Type): boolean {
      if (finalResult === "void") {
        return isVoidType(expectedResponseType);
      }
      return $(context.program).type.isAssignableTo(finalResult, expectedResponseType, finalResult);
    }

    function validateOperation(op: ArmResourceOperation) {
      if (op.httpOperation.verb !== "post") {
        return;
      }
      const lroMetadata = getLroMetadata(context.program, op.operation);
      if (lroMetadata === undefined) {
        return;
      }

      const { finalResult } = lroMetadata;
      if (finalResult === undefined) {
        return;
      }

      // Get the Response type from the template parameter
      const responseType = getResponseTemplateParam(op.operation);

      if (responseType !== undefined) {
        // Template-based detection: Response template param is non-void but finalResult doesn't match
        if (!doesFinalResultMatch(finalResult, responseType)) {
          const responseTypeName = getTypeName(responseType);
          const codefixes: CodeFix[] = [];
          if (responseTypeName !== undefined) {
            const codeFix = createLroHeadersCodeFix(op.operation, responseTypeName);
            if (codeFix !== undefined) {
              codefixes.push(codeFix);
            }
          }
          context.reportDiagnostic({
            target: op.operation,
            codefixes,
          });
        }
      } else {
        // Fallback for non-template operations: check the 200 response body
        const body200 = getResponseBody(op.httpOperation.responses);
        if (body200 !== undefined && !doesFinalResultMatch(finalResult, body200.type)) {
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
