import {
  createRule,
  fileRef,
  getLifecycleVisibilityEnum,
  getLocationContext,
  getVisibilityForClass,
  isArrayModelType,
  isNeverType,
  isNullType,
  paramMessage,
  resolveEncodedName,
  walkPropertiesInherited,
  type DiagnosticTarget,
  type Model,
  type ModelProperty,
  type Type,
} from "@typespec/compiler";
import {
  createMetadataInfo,
  getAllHttpServices,
  getHttpOperation,
  isHttpFile,
  resolveRequestVisibility,
  Visibility,
  type HttpOperation,
  type HttpOperationResponse,
} from "@typespec/http";
import { getResourceOperation } from "@typespec/rest";

export const noUnsafePatchBodyPropertiesRule = createRule({
  name: "no-unsafe-patch-body-properties",
  docs: fileRef.fromPackageRoot("src/rules/no-unsafe-patch-body-properties.md"),
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-unsafe-patch-body-properties",
  description:
    "ARM PATCH input must be a partial resource shape without writable immutable properties or defaults.",
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
    const resourceProperties = new Map<Model, Map<string, ModelProperty>>();
    let services: ReturnType<typeof getAllHttpServices>[0] | undefined;

    function propertiesOf(model: Model) {
      let properties = resourceProperties.get(model);
      if (properties === undefined) {
        properties = new Map();
        for (const property of walkPropertiesInherited(model)) {
          const name = resolveEncodedName(program, property, "application/json");
          if (!isNeverType(property.type) && !properties.has(name)) {
            properties.set(name, property);
          }
        }
        resourceProperties.set(model, properties);
      }
      return properties;
    }

    function comparisonBody(operation: HttpOperation): ComparisonBody | undefined {
      const associated = getResourceOperation(program, operation.operation)?.resourceType;
      if (associated !== undefined) return { type: associated, isExplicit: false };
      const response =
        responseBody(operation.responses, 200) ?? responseBody(operation.responses, 201);
      if (response !== undefined) return response;
      services ??= getAllHttpServices(program)[0];
      const service = services.find((s) =>
        s.operations.some((o) => o.operation === operation.operation),
      );
      const get = service?.operations.find((o) => o.verb === "get" && o.path === operation.path);
      return responseBody(get?.responses, 200) ?? responseBody(get?.responses, 201);
    }

    return {
      operation(operation) {
        if (getLocationContext(program, operation).type !== "project") {
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
          if (model === undefined || isHttpFile(program, model)) return false;
          const counterpart = objectModel(state.resource);
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

          let hasProperties = false;
          for (const [name, property] of propertiesOf(model)) {
            if (!metadata.isPayloadProperty(property, state.visibility, inExplicitBody)) continue;
            hasProperties = true;
            const path = [...state.path, name];
            const target =
              getLocationContext(program, property).type === "project" ? property : state.target;
            const safety =
              state.safety && !(state.path.length === 0 && name.toLowerCase() === "identity");
            const candidate =
              counterpart === undefined ? undefined : propertiesOf(counterpart).get(name);
            const resourceProperty =
              candidate !== undefined &&
              metadata.isPayloadProperty(
                candidate,
                Visibility.All | (state.visibility & Visibility.Item),
                resource?.isExplicit,
              )
                ? candidate
                : undefined;
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
              shape: state.shape,
              safety,
              target,
            });
            if (state.shape && resourceProperty === undefined && !hasChildren) {
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
  const variants = [...type.variants.values()].map((v) => v.type).filter((t) => !isNullType(t));
  return variants.length === 1 && variants[0].kind === "Model" ? variants[0] : undefined;
}

function responseBody(
  responses: HttpOperationResponse[] | undefined,
  status: number,
): ComparisonBody | undefined {
  const response =
    responses?.find((r) => r.statusCodes === status) ??
    responses?.find(
      (r) =>
        typeof r.statusCodes === "object" &&
        status >= r.statusCodes.start &&
        status <= r.statusCodes.end,
    );
  const body = response?.responses.find((r) => r.body?.bodyKind === "single")?.body;
  return body?.bodyKind === "single" ? body : undefined;
}

interface ComparisonBody {
  type: Type;
  isExplicit: boolean;
}
