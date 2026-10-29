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
  isHttpFile,
  listHttpOperationsIn,
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
} from "./http-response-utils.js";
import { getSingleNonNullMember, walkJsonProperties } from "./model-utils.js";
import { isTemplatedInterfaceOperation } from "./utils.js";

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
    const modelProperties = new Map<Model, [string, ModelProperty][]>();
    let services: ReturnType<typeof getAllHttpServices>[0] | undefined;

    function propertiesOf(
      model: Model,
      visibility: Visibility,
      isExplicit: boolean,
      writableVisibility?: Visibility,
      skipFileMembers = false,
    ) {
      let candidates = modelProperties.get(model);
      if (candidates === undefined) {
        candidates = [...walkJsonProperties(program, model)];
        modelProperties.set(model, candidates);
      }
      const properties = new Map<string, ModelProperty>();
      for (const [name, property] of candidates) {
        if (
          !isNeverType(property.type) &&
          !properties.has(name) &&
          !(skipFileMembers && property.model && isHttpFile(program, property.model)) &&
          (metadata.isPayloadProperty(property, visibility, isExplicit) ||
            (writableVisibility !== undefined &&
              metadata.isPayloadProperty(property, writableVisibility, isExplicit)))
        ) {
          properties.set(name, property);
        }
      }
      return properties;
    }

    function comparisonBodies(operation: HttpOperation): (ComparisonBody | undefined)[] {
      const associated = getResourceOperation(program, operation.operation)?.resourceType;
      if (associated !== undefined) {
        return [{ type: associated, isExplicit: false, visibility: Visibility.All }];
      }
      const response = responseBodies(operation.responses, 200);
      if (response.length > 0) return response;
      const created = responseBodies(operation.responses, 201);
      if (created.length > 0) return created;
      services ??= getAllHttpServices(program)[0];
      const service = services.find((s) =>
        s.operations.some((o) => o.operation === operation.operation),
      );
      const operations =
        service?.operations ??
        listHttpOperationsIn(
          program,
          operation.operation.namespace ?? program.getGlobalNamespaceType(),
          { listOptions: { recursive: false } },
        )[0];
      const responses = operations
        .filter((o) => o.verb === "get" && o.path === operation.path)
        .flatMap((o) => o.responses);
      const read = responseBodies(responses, 200);
      return read.length > 0 ? read : responseBodies(responses, 201);
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
        const resources = comparisonBodies(http);
        let resource: ComparisonBody | undefined;
        let diagnostics: PatchDiagnostic[];
        const active: TraversalFrame[] = [];

        function report(
          messageId: PatchDiagnostic["messageId"],
          target: DiagnosticTarget,
          path: string[],
        ) {
          diagnostics.push({ messageId, target, path });
        }

        // The active stack, rather than a global visited set, preserves sibling uses.
        function visit(type: Type, state: TraversalState): boolean {
          const model = objectModel(type);
          if (model === undefined || isHttpFile(program, model)) return false;
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

          const resourceProperties =
            counterpart === undefined
              ? undefined
              : propertiesOf(
                  counterpart,
                  (resource?.visibility ?? Visibility.All) | (state.visibility & Visibility.Item),
                  resource?.isExplicit ?? false,
                  resource?.visibility === Visibility.Read ? state.visibility : undefined,
                );
          let hasProperties = false;
          for (const [name, property] of propertiesOf(
            model,
            state.visibility,
            inExplicitBody,
            undefined,
            true,
          )) {
            hasProperties = true;
            const path = [...state.path, name];
            const target =
              getLocationContext(program, property).type === "project" ? property : state.target;
            const safety =
              state.safety && !(state.path.length === 0 && name.toLowerCase() === "identity");
            const resourceProperty = resourceProperties?.get(name);
            const indexed =
              resourceProperty === undefined &&
              counterpart !== undefined &&
              isRecordModelType(counterpart);
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
              shape: state.shape && !indexed,
              safety,
              target,
            });
            if (state.shape && resourceProperty === undefined && !indexed && !hasChildren) {
              report("missing", target, path);
            }
          }
          active.pop();
          return hasProperties;
        }

        const results = (resources.length === 0 ? [undefined] : resources).map((candidate) => {
          resource = candidate;
          diagnostics = [];
          visit(patchBody.type, {
            path: [],
            visibility: resolveRequestVisibility(program, operation, "patch"),
            resource: resource?.type,
            shape: resource !== undefined,
            safety: true,
            target: operation,
          });
          return diagnostics;
        });
        const targets = new Map<DiagnosticTarget, number>();
        function diagnosticKey(diagnostic: PatchDiagnostic): string {
          let target = targets.get(diagnostic.target);
          if (target === undefined) {
            target = targets.size;
            targets.set(diagnostic.target, target);
          }
          return JSON.stringify([target, diagnostic.messageId, diagnostic.path]);
        }
        const missing = results.map(
          (result) => new Set(result.filter((d) => d.messageId === "missing").map(diagnosticKey)),
        );
        const reported = new Set<string>();
        // Keep definite layout errors across candidates without repeating independent safety checks.
        for (const [index, result] of results.entries()) {
          for (const diagnostic of result) {
            const key = diagnosticKey(diagnostic);
            if (
              diagnostic.messageId === "missing"
                ? index !== 0 || !missing.every((keys) => keys.has(key))
                : index !== 0 && reported.has(key)
            ) {
              continue;
            }
            reported.add(key);
            context.reportDiagnostic({
              messageId: diagnostic.messageId,
              target: diagnostic.target,
              format: { propertyName: diagnostic.path.join(".") },
            });
          }
        }
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

function responseBodies(
  responses: HttpOperationResponse[],
  status: number,
): (ComparisonBody | undefined)[] {
  const exact = responses.filter((r) => matchesStatusCode(r.statusCodes, status));
  const preferred =
    exact.length > 0 ? exact : responses.filter((r) => containsStatusCode(r.statusCodes, status));
  const bodies: ComparisonBody[] = [];
  let ambiguous = false;
  for (const response of preferred) {
    const selection = selectResponseBody(
      response.responses.flatMap(({ body }) => (body === undefined ? [] : [body])),
    );
    if (selection.kind === "body" && selection.body.bodyKind === "single") {
      bodies.push({ ...selection.body, visibility: Visibility.Read });
    } else if (selection.kind !== "missing") {
      ambiguous = true;
    }
  }
  return bodies.length > 0 && ambiguous ? [...bodies, undefined] : bodies;
}

interface ComparisonBody {
  type: Type;
  isExplicit: boolean;
  visibility: Visibility;
}

interface PatchDiagnostic {
  messageId: "missing" | "immutable" | "required" | "default" | "visibility";
  target: DiagnosticTarget;
  path: string[];
}
