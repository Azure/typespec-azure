import {
  createRule,
  fileRef,
  getEffectiveModelType,
  getLocationContext,
  ignoreDiagnostics,
  isNullType,
  isTemplateDeclaration,
  type Model,
  type ModelProperty,
  paramMessage,
  type Program,
  type Type,
  type Union,
} from "@typespec/compiler";
import { SyntaxKind } from "@typespec/compiler/ast";
import {
  getHeaderFieldName,
  getHttpOperation,
  isBody,
  isBodyRoot,
  isHeader,
  isMetadata,
  isMultipartBodyProperty,
  isStatusCode,
} from "@typespec/http";

export const noUnnamedTypesRule = createRule({
  name: "no-unnamed-types",
  docs: fileRef.fromPackageRoot("src/rules/no-unnamed-types.md"),
  description:
    "Azure services should not have anonymous models, union expressions, enum expressions, or scalar expressions. Define them as named declarations.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-unnamed-types",
  messages: {
    default: paramMessage`Anonymous ${"type"} should be defined as a named ${"type"} declaration.`,
  },
  create(context) {
    const program = context.program;

    // Unions: collect all unnamed unions, then exclude specific patterns.
    const excludedUnions = new Set<Union>();
    const invalidUnions = new Set<Union>();

    // Models: collect anonymous property types, request bodies and implicit responses.
    const invalidModels = new Set<Model>();
    const excludedModels = new Set<Model>();

    return {
      modelProperty: (prop) => {
        const type = prop.type;

        // Exclude unions used in status code or content-type header positions.
        if (type.kind === "Union" && !type.name) {
          if (
            isStatusCode(program, prop) ||
            (isHeader(program, prop) &&
              getHeaderFieldName(program, prop).toLowerCase() === "content-type")
          ) {
            excludedUnions.add(type);
          }
        }

        // Flag anonymous models used as property types.
        if (
          needsModelName(program, type) &&
          !isInsideTemplateArgument(type) &&
          !isMultipartBodyProperty(program, prop)
        ) {
          invalidModels.add(type);
        }

        // Flag anonymous enums used as property types.
        if (type.kind === "Enum" && !type.name && !isInsideTemplateArgument(type)) {
          context.reportDiagnostic({ target: type, format: { type: "enum" } });
        }

        // Flag anonymous scalars used as property types.
        if (type.kind === "Scalar" && !type.name && !isInsideTemplateArgument(type)) {
          context.reportDiagnostic({ target: type, format: { type: "scalar" } });
        }
      },
      operation: (operation) => {
        // Exclude the top-level return type union (response envelope).
        if (operation.returnType.kind === "Union") {
          excludedUnions.add(operation.returnType);
        }

        const httpOperation = ignoreDiagnostics(getHttpOperation(program, operation));
        const { body } = httpOperation.parameters;
        if (
          body?.bodyKind === "single" &&
          body.property !== undefined &&
          needsModelName(program, body.type) &&
          isInsideTemplateArgument(body.type)
        ) {
          invalidModels.add(body.type);
        }

        if (
          isTemplateDeclaration(operation) ||
          (operation.interface !== undefined && isTemplateDeclaration(operation.interface)) ||
          getLocationContext(program, operation).type !== "project"
        ) {
          return;
        }

        const originals = new Set(getModelConstituents(operation.returnType));
        for (const response of httpOperation.responses) {
          for (const content of response.responses) {
            // Explicit bodies are already checked as property types.
            if (!content.body || content.body.property) {
              continue;
            }
            for (const bodyType of getModelConstituents(content.body.type)) {
              if (
                bodyType.properties.size === 0 ||
                getEffectiveModelType(
                  program,
                  bodyType,
                  (property) => !isHeader(program, property) && !isStatusCode(program, property),
                ).name !== ""
              ) {
                continue;
              }
              for (const responseType of getOriginalModels(bodyType, originals)) {
                if (responseType.name === "") {
                  invalidModels.add(responseType);
                }
              }
            }
          }
        }
      },
      union: (union) => {
        if (!union.name && !isOnlyNullableUnion(union)) {
          invalidUnions.add(union);
        }
      },
      exit: () => {
        for (const union of invalidUnions) {
          if (!excludedUnions.has(union)) {
            context.reportDiagnostic({ target: union, format: { type: "union" } });
          }
        }
        for (const model of invalidModels) {
          if (!excludedModels.has(model)) {
            context.reportDiagnostic({ target: model, format: { type: "model" } });
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

function needsModelName(program: Program, type: Type): type is Model {
  return (
    type.kind === "Model" &&
    type.name === "" &&
    type.properties.size > 0 &&
    !isHttpEnvelope(program, type)
  );
}

/** Check if the type's source node is inside a template argument position */
function isInsideTemplateArgument(type: { node?: { kind: SyntaxKind; parent?: any } }): boolean {
  let node: { kind: SyntaxKind; parent?: any } | undefined = type.node;
  while (node) {
    if (node.kind === SyntaxKind.TemplateArgument) {
      return true;
    }
    node = node.parent;
  }
  return false;
}

function isHttpEnvelope(program: Program, model: Model): boolean {
  for (const property of model.properties.values()) {
    if (
      isMetadata(program, property) ||
      isStatusCode(program, property as ModelProperty) ||
      isBody(program, property) ||
      isBodyRoot(program, property) ||
      isMultipartBodyProperty(program, property)
    ) {
      return true;
    }
  }
  return false;
}

/** Check if the union is only there to make the type nullable */
function isOnlyNullableUnion(union: Union): boolean {
  const nonNullVariants = [...union.variants.values()].filter((v) => !isNullType(v.type));
  return nonNullVariants.length <= 1;
}
