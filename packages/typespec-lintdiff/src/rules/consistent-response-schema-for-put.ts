import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import {
  createRule,
  isTemplateDeclarationOrInstance,
  type Model,
  type Tuple,
  type Type,
} from "@typespec/compiler";
import { getHttpOperation, type HttpOperationResponse, type HttpPayloadBody } from "@typespec/http";

export const consistentResponseSchemaForPutRule = createRule({
  name: "consistent-response-schema-for-put",
  description: "ARM PUT operations must return the same schema for 200 and 201 responses.",
  severity: "warning",
  messages: {
    default:
      "200 response schema does not match 201 response schema. A PUT API must always return the same response schema for both the 200 and 201 status codes.",
  },
  create(context) {
    return {
      operation: (operation) => {
        // The walker also visits sourceOperation templates, which are not endpoints.
        if (
          isTemplateDeclarationOrInstance(operation) ||
          (operation.interface !== undefined &&
            isTemplateDeclarationOrInstance(operation.interface))
        ) {
          return;
        }

        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (resolveProviderNamespace(context.program, namespace) === undefined) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "put") {
          return;
        }

        const response200 = httpOperation.responses.find(
          (response) => response.statusCodes === 200,
        );
        const response201 = httpOperation.responses.find(
          (response) => response.statusCodes === 201,
        );
        if (response200 === undefined || response201 === undefined) {
          return;
        }

        const response200Body = getResponseBody(response200);
        const response201Body = getResponseBody(response201);
        if (
          response200Body === undefined ||
          response201Body === undefined ||
          haveEquivalentNativeBodies(response200Body, response201Body)
        ) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
        });
      },
    };
  },
});

interface ResponseBody {
  body: HttpPayloadBody;
}

function getResponseBody(response: HttpOperationResponse): ResponseBody | undefined {
  let body: HttpPayloadBody | undefined;
  for (const content of response.responses) {
    if (content.body !== undefined) {
      // Cross-status equality is undefined when one status has multiple native bodies.
      if (
        body !== undefined &&
        (body.type !== content.body.type || body.bodyKind !== content.body.bodyKind)
      ) {
        return undefined;
      }
      body = content.body;
    }
  }

  return body === undefined ? undefined : { body };
}

function haveEquivalentNativeBodies(left: ResponseBody, right: ResponseBody): boolean {
  return (
    left.body.bodyKind === right.body.bodyKind &&
    areNativeTypesEquivalent(left.body.type, right.body.type, new Map())
  );
}

function areNativeTypesEquivalent(left: Type, right: Type, seen: Map<Type, Set<Type>>): boolean {
  if (left === right) {
    return true;
  }
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.kind === "Tuple" && right.kind === "Tuple") {
    return areTuplesEquivalent(left, right, seen);
  }
  if (left.kind !== "Model" || right.kind !== "Model") {
    return false;
  }

  if (!isPlainAnonymousModel(left) || !isPlainAnonymousModel(right)) {
    return false;
  }

  const seenRight = seen.get(left);
  if (seenRight?.has(right) === true) {
    return true;
  }
  if (seenRight === undefined) {
    seen.set(left, new Set([right]));
  } else {
    seenRight.add(right);
  }

  if (left.properties.size !== right.properties.size) {
    return false;
  }
  for (const [name, leftProperty] of left.properties) {
    const rightProperty = right.properties.get(name);
    if (
      rightProperty === undefined ||
      leftProperty.optional !== rightProperty.optional ||
      leftProperty.defaultValue !== undefined ||
      rightProperty.defaultValue !== undefined ||
      leftProperty.decorators.length > 0 ||
      rightProperty.decorators.length > 0 ||
      !areNativeTypesEquivalent(leftProperty.type, rightProperty.type, seen)
    ) {
      return false;
    }
  }
  return true;
}

function areTuplesEquivalent(left: Tuple, right: Tuple, seen: Map<Type, Set<Type>>): boolean {
  return (
    left.values.length === right.values.length &&
    left.values.every((value, index) => areNativeTypesEquivalent(value, right.values[index], seen))
  );
}

function isPlainAnonymousModel(model: Model): boolean {
  return (
    model.name === "" &&
    model.decorators.length === 0 &&
    model.baseModel === undefined &&
    model.indexer === undefined
  );
}
