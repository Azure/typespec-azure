import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import {
  createRule,
  getFriendlyName,
  isArrayModelType,
  isTemplateInstance,
  type Model,
  type Program,
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
          haveEquivalentEmittedSchemas(context.program, response200Body, response201Body)
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
  contentTypes: string[];
}

function getResponseBody(response: HttpOperationResponse): ResponseBody | undefined {
  let body: HttpPayloadBody | undefined;
  const contentTypes: string[] = [];
  for (const content of response.responses) {
    if (content.body !== undefined) {
      body = content.body;
      contentTypes.push(...content.body.contentTypes);
    }
  }

  return body === undefined ? undefined : { body, contentTypes };
}

function haveEquivalentEmittedSchemas(
  program: Program,
  left: ResponseBody,
  right: ResponseBody,
): boolean {
  const leftCategory = getConstantSchemaCategory(program, left);
  const rightCategory = getConstantSchemaCategory(program, right);
  if (leftCategory !== undefined || rightCategory !== undefined) {
    return leftCategory === rightCategory;
  }

  return (
    left.body.type === right.body.type ||
    arePlainAnonymousTypesEquivalent(left.body.type, right.body.type, new Map())
  );
}

function getConstantSchemaCategory(
  program: Program,
  bodyInfo: ResponseBody,
): "file" | "string" | "array-any" | undefined {
  const { body } = bodyInfo;
  if (emitsFileSchema(bodyInfo)) {
    return "file";
  }

  if (
    body.bodyKind === "multipart" ||
    (body.type.kind === "Scalar" &&
      body.type.name === "string" &&
      program.checker.isStdType(body.type))
  ) {
    return "string";
  }

  if (
    body.type.kind === "Tuple" ||
    (body.type.kind === "Model" &&
      isArrayModelType(body.type) &&
      body.type.decorators.length === 0 &&
      getFriendlyName(program, body.type) === undefined &&
      (!body.type.name || isTemplateInstance(body.type)) &&
      body.type.indexer.value.kind === "Intrinsic" &&
      body.type.indexer.value.name === "unknown")
  ) {
    return "array-any";
  }

  return undefined;
}

function emitsFileSchema({ body, contentTypes }: ResponseBody): boolean {
  return (
    body.bodyKind === "file" ||
    (body.type.kind === "Scalar" &&
      body.type.name === "bytes" &&
      contentTypes.every(
        (contentType) => contentType !== "application/json" && contentType !== "text/plain",
      ))
  );
}

function arePlainAnonymousTypesEquivalent(
  left: Type,
  right: Type,
  seen: Map<Type, Set<Type>>,
): boolean {
  if (left === right) {
    return true;
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
      !arePlainAnonymousTypesEquivalent(leftProperty.type, rightProperty.type, seen)
    ) {
      return false;
    }
  }
  return true;
}

function isPlainAnonymousModel(model: Model): boolean {
  return (
    model.name === "" &&
    model.decorators.length === 0 &&
    model.baseModel === undefined &&
    model.indexer === undefined
  );
}
