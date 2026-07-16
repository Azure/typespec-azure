import {
  createRule,
  getNamespaceFullName,
  ignoreDiagnostics,
  isNullType,
  isTemplateDeclaration,
  Model,
  ModelProperty,
  navigateProgram,
  Operation,
  paramMessage,
  Program,
  Type,
  Union,
} from "@typespec/compiler";
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
  description:
    "Azure services should not have anonymous models or union expressions. Define them as named declarations.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-unnamed-types",
  messages: {
    default: paramMessage`Anonymous ${"type"} should be defined as a named ${"type"} declaration.`,
  },
  create(context) {
    const program = context.program;

    // Anonymous models reachable from the client surface that should be reported.
    const flaggedModels = new Set<Model>();
    const visited = new Set<Type>();

    // Unions: flag all unnamed unions (like old no-unnamed-union rule), with exclusions.
    const excludedUnions = new Set<Union>();
    const invalidUnions = new Set<Union>();

    function enqueueAndWalk(type: Type | undefined): void {
      if (type === undefined || visited.has(type)) {
        return;
      }
      visited.add(type);
      switch (type.kind) {
        case "Model":
          walkModel(type);
          break;
        case "Union":
          walkUnionDescendants(type);
          break;
        case "ModelProperty":
          enqueueAndWalk(type.type);
          break;
        case "Tuple":
          for (const value of type.values) {
            enqueueAndWalk(value);
          }
          break;
      }
    }

    function walkModel(model: Model): void {
      if (isTemplateDeclaration(model)) {
        return;
      }
      // Named library types are never anonymous and don't contain user-defined
      // anonymous types worth reporting; stop descending for performance.
      if (model.name !== "" && isStandardLibraryType(model)) {
        return;
      }
      if (
        model.name === "" &&
        model.properties.size > 0 &&
        !isHttpEnvelope(program, model) &&
        !flaggedModels.has(model)
      ) {
        flaggedModels.add(model);
      }
      for (const property of model.properties.values()) {
        enqueueAndWalk(property.type);
      }
      if (model.indexer) {
        enqueueAndWalk(model.indexer.value);
      }
      if (model.baseModel) {
        enqueueAndWalk(model.baseModel);
      }
      for (const derived of model.derivedModels) {
        enqueueAndWalk(derived);
      }
    }

    /** Walk union descendants for model detection (does not flag the union itself here) */
    function walkUnionDescendants(union: Union): void {
      if (isTemplateDeclaration(union)) {
        return;
      }
      const nonNullVariants = [...union.variants.values()]
        .map((variant) => variant.type)
        .filter((variantType) => !isNullType(variantType));
      for (const variantType of nonNullVariants) {
        enqueueAndWalk(variantType);
      }
    }

    // Walk the bodies of an operation's HTTP responses. We resolve the actual HTTP
    // responses (via `getHttpOperation`) rather than inspecting the raw return type,
    // because the return type is the response *envelope* (status codes, headers, and
    // other metadata wrapped around the body). Clients only surface the response body,
    // so walking the resolved body types avoids flagging the status-code envelope
    // unions (e.g. `ArmResponse<T> | ErrorResponse`) that clients never expose, while
    // still catching anonymous types that appear in the real response bodies.
    function walkOperationResponses(operation: Operation): void {
      const httpOperation = ignoreDiagnostics(getHttpOperation(program, operation));
      for (const response of httpOperation.responses) {
        for (const statusCodeResponse of response.responses) {
          enqueueAndWalk(statusCodeResponse.body?.type);
        }
      }
    }

    // Seed the model walk from the client surface: user operations.
    navigateProgram(program, {
      operation: (operation: Operation) => {
        if (isTemplateDeclaration(operation) || isStandardLibraryType(operation)) {
          return;
        }
        for (const parameter of operation.parameters.properties.values()) {
          enqueueAndWalk(parameter.type);
        }
        walkOperationResponses(operation);
      },
    });

    return {
      modelProperty: (prop) => {
        // Exclude unions used in status code or content-type header positions.
        const type = prop.type;
        if (type.kind !== "Union" || type.name) {
          return;
        }
        if (
          isStatusCode(program, prop) ||
          (isHeader(program, prop) &&
            getHeaderFieldName(program, prop).toLowerCase() === "content-type")
        ) {
          excludedUnions.add(type);
        }
      },
      operation: (operation) => {
        // Exclude the top-level return type union (response envelope).
        if (operation.returnType.kind === "Union") {
          excludedUnions.add(operation.returnType);
        }
      },
      union: (union) => {
        // Flag all unnamed unions that aren't just nullable (like old no-unnamed-union).
        if (union.kind === "Union" && !union.name && !isOnlyNullableUnion(union)) {
          invalidUnions.add(union);
        }
      },
      model: (model: Model) => {
        if (flaggedModels.has(model)) {
          context.reportDiagnostic({ target: model, format: { type: "model" } });
        }
      },
      exit: () => {
        for (const union of invalidUnions) {
          if (!excludedUnions.has(union)) {
            context.reportDiagnostic({ target: union, format: { type: "union" } });
          }
        }
      },
    };
  },
});

function isStandardLibraryType(type: Model | Union | Operation): boolean {
  const namespace = type.namespace;
  if (namespace === undefined) {
    return false;
  }
  const fullName = getNamespaceFullName(namespace);
  return (
    fullName === "TypeSpec" ||
    fullName === "Azure" ||
    fullName.startsWith("TypeSpec.") ||
    fullName.startsWith("Azure.")
  );
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
