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
  getHttpOperation,
  isBody,
  isBodyRoot,
  isMetadata,
  isMultipartBodyProperty,
  isStatusCode,
} from "@typespec/http";
import { createTCGCContext } from "../context.js";
import { getUsageOverride } from "../decorators.js";

export const noUnnamedTypesRule = createRule({
  name: "no-unnamed-types",
  description: "Requires types to be named rather than defined anonymously or inline.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/no-unnamed-types",
  messages: {
    default: paramMessage`Anonymous ${"type"} detected in the client surface. Define this ${"type"} separately with a proper name to improve code readability and reusability.`,
  },
  create(context) {
    const program = context.program;
    // Lightweight context used only to read the explicit `@usage` overrides that
    // seed orphan (operation-less) types. It intentionally does NOT run the full
    // TCGC type-handling pass, which is expensive (see issue #2803). Instead we walk
    // the raw type graph directly. This favors performance over complete coverage:
    // some anonymous types may slip through, but common cases are still reported.
    const tcgcContext = createTCGCContext(program, "@azure-tools/typespec-client-generator-core", {
      mutateNamespace: false,
    });

    // Anonymous models/unions reachable from the client surface that should be reported.
    const flagged = new Set<Model | Union>();
    const visited = new Set<Type>();

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
          walkUnion(type);
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
        !flagged.has(model)
      ) {
        flagged.add(model);
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

    function walkUnion(union: Union): void {
      if (isTemplateDeclaration(union)) {
        return;
      }
      const nonNullVariants = [...union.variants.values()]
        .map((variant) => variant.type)
        .filter((variantType) => !isNullType(variantType));
      // A union with a single non-null option is a nullable type of that option and
      // does not itself require a name. Unions where every option is a plain scalar
      // (e.g. `string | int32`) are also left alone.
      if (
        union.name === undefined &&
        nonNullVariants.length >= 2 &&
        !nonNullVariants.every((variantType) => variantType.kind === "Scalar") &&
        !flagged.has(union)
      ) {
        flagged.add(union);
      }
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

    // Seed the walk from the client surface: user operations and any type that was
    // explicitly given a usage via `@usage` (which keeps orphan types reachable).
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
      model: (model: Model) => {
        if (getUsageOverride(tcgcContext, model) !== undefined) {
          enqueueAndWalk(model);
        }
      },
      union: (union: Union) => {
        if (getUsageOverride(tcgcContext, union) !== undefined) {
          enqueueAndWalk(union);
        }
      },
    });

    return {
      model: (model: Model) => {
        if (flagged.has(model)) {
          context.reportDiagnostic({ target: model, format: { type: "model" } });
        }
      },
      union: (union: Union) => {
        if (flagged.has(union)) {
          context.reportDiagnostic({ target: union, format: { type: "union" } });
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
