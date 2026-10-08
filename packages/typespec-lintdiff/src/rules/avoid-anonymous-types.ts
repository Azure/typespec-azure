import {
  createRule,
  getEffectiveModelType,
  getLocationContext,
  isTemplateDeclaration,
  isTemplateInstance,
  type Model,
  type Operation,
  type Type,
} from "@typespec/compiler";
import { SyntaxKind } from "@typespec/compiler/ast";
import { getHttpOperation, isHeader, isStatusCode } from "@typespec/http";

export const avoidAnonymousTypesRule = createRule({
  name: "avoid-anonymous-types",
  description:
    "Operation response bodies should use named models instead of anonymous inline model expressions.",
  severity: "warning",
  messages: {
    default:
      "Operation response body should use a named model instead of an anonymous inline model expression.",
  },
  create(context) {
    const reported = new Set<Model>();
    return {
      operation: (operation) => {
        if (
          shouldSkipOperation(operation) ||
          getLocationContext(context.program, operation).type !== "project"
        ) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        const originals = new Set(getModelConstituents(operation.returnType));
        for (const response of httpOperation.responses) {
          for (const content of response.responses) {
            // Property-position bodies belong to Azure Core's no-unnamed-types rule.
            if (!content.body || content.body.property) {
              continue;
            }
            for (const bodyType of getModelConstituents(content.body.type)) {
              if (
                bodyType.properties.size === 0 ||
                getEffectiveModelType(
                  context.program,
                  bodyType,
                  (property) =>
                    !isHeader(context.program, property) &&
                    !isStatusCode(context.program, property),
                ).name !== ""
              ) {
                continue;
              }
              for (const responseType of getOriginalModels(bodyType, originals)) {
                if (!isAnonymousModel(responseType) || reported.has(responseType)) {
                  continue;
                }
                reported.add(responseType);
                context.reportDiagnostic({ target: responseType });
              }
            }
          }
        }
      },
    };
  },
});

function* getModelConstituents(type: Type, visited = new Set<Type>()): Iterable<Model> {
  if (visited.has(type)) return;
  visited.add(type);
  if (type.kind === "Model") {
    yield type;
  } else if (type.kind === "Union") {
    for (const variant of type.variants.values()) {
      yield* getModelConstituents(variant.type, visited);
    }
  }
}

function* getOriginalModels(
  model: Model,
  originals: Set<Model>,
  visited = new Set<Model>(),
): Iterable<Model> {
  if (visited.has(model)) return;
  visited.add(model);
  if (originals.has(model)) {
    yield model;
  } else {
    // HTTP-filtered payloads preserve their original model in compiler provenance.
    for (const source of model.sourceModels) {
      yield* getOriginalModels(source.model, originals, visited);
    }
  }
}

function shouldSkipOperation(operation: Operation): boolean {
  return (
    isTemplateInstance(operation) ||
    isTemplateDeclaration(operation) ||
    isTemplatedInterfaceOperation(operation)
  );
}

function isTemplatedInterfaceOperation(target: Operation): boolean {
  return (
    target.node?.kind === SyntaxKind.OperationStatement &&
    target.interface !== undefined &&
    isTemplateDeclaration(target.interface)
  );
}

function isAnonymousModel(type: Type | undefined): type is Model {
  return type?.kind === "Model" && type.name === "";
}
