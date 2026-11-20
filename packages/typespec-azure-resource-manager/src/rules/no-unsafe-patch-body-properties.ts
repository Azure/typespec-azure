import {
  createRule,
  fileRef,
  getLifecycleVisibilityEnum,
  getLocationContext,
  getVisibilityForClass,
  isArrayModelType,
  isNeverType,
  isRecordModelType,
  isTemplateDeclarationOrInstance,
  paramMessage,
  type DiagnosticTarget,
  type Model,
  type ModelProperty,
  type Type,
} from "@typespec/compiler";
import {
  createMetadataInfo,
  getAllHttpServices,
  getHttpOperation,
  isOrExtendsHttpFile,
  resolveRequestVisibility,
  Visibility,
  type HttpOperation,
  type HttpOperationResponse,
} from "@typespec/http";
import { getResourceOperation } from "@typespec/rest";
import {
  containsStatusCode,
  matchesStatusCode,
  selectResponseBody,
  type ResponseBodySelection,
} from "./http-response-utils.js";
import { getSingleNonNullMember, walkJsonProperties } from "./model-utils.js";
import { isTemplatedInterfaceOperation } from "./utils.js";

export const noUnsafePatchBodyPropertiesRule = createRule({
  name: "no-unsafe-patch-body-properties",
  docs: fileRef.fromPackageRoot("src/rules/no-unsafe-patch-body-properties.md"),
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-unsafe-patch-body-properties",
  description:
    "ARM PATCH request bodies should use partial resource shapes with optional fields, no immutable properties, and no defaults.",
  severity: "warning",
  messages: {
    missing: paramMessage`The property '${"propertyName"}' in the request body either does not appear in the resource model or is nested at the wrong level.`,
    immutable: paramMessage`PATCH request body property '${"propertyName"}' is immutable and must be excluded from PATCH input.`,
    required: paramMessage`Properties of a PATCH request body must not be required, property:${"propertyName"}.`,
    default: paramMessage`Properties of a PATCH request body must not have default value, property:${"propertyName"}.`,
    visibility: paramMessage`PATCH request body property '${"propertyName"}' must include Lifecycle.Update visibility.`,
  },
  create(context) {
    const { program } = context;
    const metadata = createMetadataInfo(program);
    const lifecycle = getLifecycleVisibilityEnum(program);
    const update = lifecycle.members.get("Update")!;
    const modelProperties = new Map<Model, [string, ModelProperty][]>();
    let services: ReturnType<typeof getAllHttpServices>[0] | undefined;

    function* propertiesOf(model: Model, visibility: Visibility, isExplicit: boolean) {
      let candidates = modelProperties.get(model);
      if (candidates === undefined) {
        candidates = [...walkJsonProperties(program, model)];
        modelProperties.set(model, candidates);
      }
      for (const entry of candidates) {
        const [, property] = entry;
        if (
          !isNeverType(property.type) &&
          metadata.isPayloadProperty(property, visibility, isExplicit)
        ) {
          yield entry;
        }
      }
    }

    function comparisonBody(operation: HttpOperation): ComparisonBody | undefined {
      const associated = getResourceOperation(program, operation.operation)?.resourceType;
      if (associated !== undefined) {
        return { type: associated, isExplicit: false };
      }
      const response = responseBody(operation.responses);
      if (response.kind !== "missing") {
        return response.kind === "body" && response.body.bodyKind === "single"
          ? response.body
          : undefined;
      }
      services ??= getAllHttpServices(program)[0];
      const service = services.find((s) =>
        s.operations.some((o) => o.operation === operation.operation),
      );
      if (service === undefined) return undefined;
      const responses = service.operations
        .filter((o) => o.verb === "get" && o.path === operation.path)
        .flatMap((o) => o.responses);
      const read = responseBody(responses);
      return read.kind === "body" && read.body.bodyKind === "single" ? read.body : undefined;
    }

    return {
      operation(operation) {
        if (
          getLocationContext(program, operation).type !== "project" ||
          isTemplateDeclarationOrInstance(operation) ||
          isTemplatedInterfaceOperation(operation)
        ) {
          return;
        }
        const [http] = getHttpOperation(program, operation);
        const patchBody = http.parameters.body;
        if (http.verb !== "patch" || patchBody?.bodyKind !== "single") return;
        const inExplicitBody = patchBody.isExplicit;
        const resource = comparisonBody(http);
        const active: TraversalFrame[] = [];

        function report(
          messageId: "missing" | "immutable" | "required" | "default" | "visibility",
          target: DiagnosticTarget,
          path: string[],
        ) {
          context.reportDiagnostic({
            messageId,
            target,
            format: { propertyName: path.join(".") },
          });
        }

        // The active stack, rather than a global visited set, preserves sibling uses.
        function visit(type: Type, state: TraversalState): boolean {
          const model = objectModel(type);
          if (model === undefined || isOrExtendsHttpFile(program, model)) return false;
          const counterpart = objectModel(state.resource);
          // An unsupported union is not an absent resource property.
          if (state.resource?.kind === "Union" && counterpart === undefined) {
            state = { ...state, shape: false };
          }
          const role =
            state.path.length === 0
              ? "root"
              : state.path.length === 1 && state.path[0] === "properties"
                ? "properties"
                : "nested";
          if (
            active.some(
              (frame) =>
                frame.model === model &&
                frame.resource === counterpart &&
                frame.shape === state.shape &&
                frame.safety === state.safety &&
                frame.visibility === state.visibility &&
                frame.role === role,
            )
          )
            return false;
          active.push({ ...state, model, resource: counterpart, role });

          if (isArrayModelType(model)) {
            const resourceItem =
              counterpart !== undefined && isArrayModelType(counterpart)
                ? counterpart.indexer.value
                : undefined;
            const path = [...state.path];
            if (path.length === 0) path.push("[]");
            else path[path.length - 1] += "[]";
            visit(model.indexer.value, {
              ...state,
              path,
              visibility: state.visibility | Visibility.Item,
              resource: resourceItem,
              shape: state.shape && resourceItem !== undefined,
            });
            active.pop();
            return false;
          }

          const resourceProperties = new Map<string, ModelProperty | undefined>();
          if (counterpart !== undefined) {
            for (const [name, property] of propertiesOf(
              counterpart,
              Visibility.All | (state.visibility & Visibility.Item),
              resource?.isExplicit ?? false,
            )) {
              // Conflicting encoded members do not identify a definite descendant layout.
              resourceProperties.set(name, resourceProperties.has(name) ? undefined : property);
            }
          }
          let hasProperties = false;
          const names = new Set<string>();
          for (const [name, property] of propertiesOf(model, state.visibility, inExplicitBody)) {
            if (names.has(name)) continue;
            names.add(name);
            hasProperties = true;
            const path = [...state.path, name];
            const target =
              getLocationContext(program, property).type === "project" ? property : state.target;
            const safety =
              state.safety && !(state.path.length === 0 && name.toLowerCase() === "identity");
            const hasResourceProperty = resourceProperties.has(name);
            const resourceProperty = resourceProperties.get(name);
            const indexed =
              !hasResourceProperty && counterpart !== undefined && isRecordModelType(counterpart);
            if (isImmutablePath(path)) report("immutable", target, path);
            if (safety) {
              if (
                !(state.visibility & Visibility.Item) &&
                !metadata.isOptional(property, state.visibility)
              ) {
                report("required", target, path);
              }
              if (property.defaultValue !== undefined) report("default", target, path);
              if (!getVisibilityForClass(program, property, lifecycle).has(update)) {
                report("visibility", target, path);
              }
            }
            const hasChildren = visit(property.type, {
              path,
              visibility: state.visibility,
              resource: resourceProperty?.type,
              shape:
                state.shape && !indexed && (!hasResourceProperty || resourceProperty !== undefined),
              safety,
              target,
            });
            if (state.shape && !hasResourceProperty && !indexed && !hasChildren) {
              report("missing", target, path);
            }
          }
          active.pop();
          return hasProperties;
        }

        visit(patchBody.type, {
          path: [],
          visibility: resolveRequestVisibility(program, operation, "patch"),
          resource: resource?.type,
          shape: resource !== undefined,
          safety: true,
          target: operation,
        });
      },
    };
  },
});

interface TraversalState {
  path: string[];
  visibility: Visibility;
  resource: Type | undefined;
  shape: boolean;
  safety: boolean;
  target: DiagnosticTarget;
}

interface TraversalFrame extends TraversalState {
  model: Model;
  resource: Model | undefined;
  role: "root" | "properties" | "nested";
}

function isImmutablePath(path: string[]): boolean {
  return (
    (path.length === 1 && ["id", "name", "type", "location"].includes(path[0])) ||
    (path.length === 2 && path[0] === "properties" && path[1] === "provisioningState")
  );
}

function objectModel(type: Type | undefined): Model | undefined {
  if (type?.kind === "Model") return type;
  if (type?.kind !== "Union") return undefined;
  const member = getSingleNonNullMember(type);
  return member?.kind === "Model" ? member : undefined;
}

function responseBody(responses: HttpOperationResponse[]): ResponseBodySelection {
  for (const status of [200, 201]) {
    const exact = responses.filter((r) => matchesStatusCode(r.statusCodes, status));
    const preferred =
      exact.length > 0 ? exact : responses.filter((r) => containsStatusCode(r.statusCodes, status));
    const selection = selectResponseBody(
      preferred.flatMap((r) =>
        r.responses.flatMap(({ body }) => (body === undefined ? [] : [body])),
      ),
    );
    if (selection.kind !== "missing") return selection;
  }
  return { kind: "missing" };
}

interface ComparisonBody {
  type: Type;
  isExplicit: boolean;
}
