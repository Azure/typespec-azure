import {
  CodeFix,
  createRule,
  getNamespaceFullName,
  getSourceLocation,
  isVoidType,
  Operation,
  Program,
  Type,
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
 * and returns the resolved type. The Response type can be a Model, Scalar, UnknownType, or void
 * (as per the constraint on ArmResourceActionAsync: `Response extends Model | unknown | void`).
 * Only checks the first level of template indirection to avoid picking up internal
 * template parameters (e.g., ArmResourceActionAsyncBase's Response parameter).
 */
function getResponseTemplateParam(op: Operation): Type | undefined {
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
      if (typeof resolvedType === "object" && "kind" in resolvedType) {
        return resolvedType as Type;
      }
      return undefined;
    }
  }
  return undefined;
}

/**
 * Get the 200 response from HTTP responses, if present.
 */
function get200Response(responses: HttpOperationResponse[]): HttpOperationResponse | undefined {
  return responses.find((r) => r.statusCodes === 200);
}

/**
 * Get the body payload from an HTTP response, if present.
 */
function getResponseBodyType(response: HttpOperationResponse): HttpPayloadBody | undefined {
  if (response.responses.length === 0) return undefined;
  return response.responses[0].body;
}

/**
 * Check if there is a 204 (No Content) response among the HTTP responses.
 */
function has204Response(responses: HttpOperationResponse[]): boolean {
  return responses.some((r) => r.statusCodes === 204);
}

/**
 * Check if the only 2XX response is a 202 (Accepted).
 */
function hasOnly202Response(responses: HttpOperationResponse[]): boolean {
  const twoXXResponses = responses.filter((r) => {
    if (typeof r.statusCodes === "number") {
      return r.statusCodes >= 200 && r.statusCodes < 300;
    }
    return false;
  });
  return twoXXResponses.length === 1 && twoXXResponses[0].statusCodes === 202;
}

/**
 * Get a printable name for a type, if available.
 * Handles Model, Scalar, and Intrinsic types (including void, unknown, etc.).
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
    "Ensure that the final result of a long-running POST operation matches the response.",
  messages: {
    default: `The final result type of a long-running POST operation does not match the response. Specify the FinalResult in the LroHeaders parameter to match the response type. For example: 'LroHeaders = ArmLroLocationHeader<FinalResult = ResponseType>'.`,
    conflictingResponses: `A POST operation should not contain both a 204 (NoContent) response and a 200 (OK) response with a non-empty body.`,
  },
  create(context) {
    /**
     * Gets the namespace-qualified name for a named type (Model or Scalar).
     * Returns undefined for anonymous types or non-Model/Scalar kinds.
     */
    function getQualifiedTypeName(type: Type): string | undefined {
      if (
        (type.kind === "Model" || type.kind === "Scalar") &&
        type.name !== undefined &&
        type.name !== ""
      ) {
        const nsPrefix =
          type.namespace !== undefined ? getNamespaceFullName(type.namespace) + "." : "";
        return nsPrefix + type.name;
      }
      return undefined;
    }

    /**
     * Checks if the finalResult type matches the expected response type.
     * For named types, verifies that namespace-qualified names match before
     * checking structural compatibility via isAssignableTo.
     */
    function doesFinalResultMatch(finalResult: Type | "void", expectedResponseType: Type): boolean {
      if (finalResult === "void") {
        return isVoidType(expectedResponseType);
      }

      // For named types, check that the namespace-qualified names match
      const finalResultName = getQualifiedTypeName(finalResult);
      const expectedName = getQualifiedTypeName(expectedResponseType);
      if (finalResultName !== undefined && expectedName !== undefined) {
        if (finalResultName !== expectedName) {
          return false;
        }
      }

      const tk = $(context.program).type;
      return (
        tk.isAssignableTo(finalResult, expectedResponseType, finalResult) ||
        tk.isAssignableTo(expectedResponseType, finalResult, expectedResponseType)
      );
    }

    function reportMismatch(op: ArmResourceOperation, responseType?: Type) {
      const codefixes: CodeFix[] = [];
      if (responseType !== undefined) {
        const responseTypeName = getTypeName(responseType);
        if (responseTypeName !== undefined) {
          const codeFix = createLroHeadersCodeFix(op.operation, responseTypeName);
          if (codeFix !== undefined) {
            codefixes.push(codeFix);
          }
        }
      }
      context.reportDiagnostic({
        target: op.operation,
        codefixes,
      });
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

      const responses = op.httpOperation.responses;
      const response200 = get200Response(responses);
      const has204 = has204Response(responses);

      // Case 1: Operation has a 200 response
      if (response200 !== undefined) {
        const body200 = getResponseBodyType(response200);
        const bodyIsVoidOrEmpty = body200 === undefined || isVoidType(body200.type);

        if (bodyIsVoidOrEmpty) {
          // 200 with void/empty body (with or without 204): finalResult should be void
          if (finalResult !== "void") {
            reportMismatch(op);
          }
        } else if (has204) {
          // 200 with non-void body AND 204: conflicting responses
          context.reportDiagnostic({
            target: op.operation,
            messageId: "conflictingResponses",
          });
        } else {
          // 200 with non-void body, no 204: body should match finalResult
          if (!doesFinalResultMatch(finalResult, body200.type)) {
            reportMismatch(op, body200.type);
          }
        }
        return;
      }

      // Case 2: 204 response without 200
      if (has204) {
        if (finalResult !== "void") {
          reportMismatch(op);
        }
        return;
      }

      // Case 3: Only 202 — check if it's an ActionAsync template instantiation
      if (hasOnly202Response(responses)) {
        const sourceOp = op.operation.sourceOperation;
        if (
          sourceOp !== undefined &&
          sourceOp.templateMapper !== undefined &&
          sourceOp.name === "ActionAsync" &&
          sourceOp.namespace !== undefined &&
          getNamespaceFullName(sourceOp.namespace) === "Azure.ResourceManager"
        ) {
          const responseType = getResponseTemplateParam(op.operation);
          if (responseType !== undefined && !doesFinalResultMatch(finalResult, responseType)) {
            reportMismatch(op, responseType);
          }
        }
        // Not an ActionAsync template or no Response param — skip
        return;
      }

      // No recognizable response pattern — skip
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
