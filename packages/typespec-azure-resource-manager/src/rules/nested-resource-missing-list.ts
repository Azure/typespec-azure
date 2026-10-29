import {
  createRule,
  fileRef,
  isArrayModelType,
  paramMessage,
  type Program,
} from "@typespec/compiler";
import {
  createMetadataInfo,
  getAllHttpServices,
  type HttpOperation,
  type MetadataInfo,
  Visibility,
} from "@typespec/http";
import { getActionDetails, getParentResource, getResourceOperation } from "@typespec/rest";
import { getArmProviderNamespace } from "../namespace.js";
import { getArmOperationList } from "../operations.js";
import { getResourceBaseType, ResourceBaseType } from "../resource.js";
import { walkJsonProperties } from "./model-utils.js";

export const nestedResourceMissingListRule = createRule({
  name: "nested-resource-missing-list",
  description: "Nested ARM resources must provide a list operation at their parent collection.",
  docs: fileRef.fromPackageRoot("src/rules/nested-resource-missing-list.md"),
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/nested-resource-missing-list",
  messages: {
    default: paramMessage`Nested resource '${"name"}' must have a list operation at its parent collection.`,
  },
  create(context) {
    const metadata = createMetadataInfo(context.program, { canonicalVisibility: Visibility.Read });
    const [services] = getAllHttpServices(context.program);
    const httpServices = services
      .filter(
        (service) => getArmProviderNamespace(context.program, service.namespace) !== undefined,
      )
      .map(({ operations }) => ({
        operations,
        collectionPaths: new Set(
          operations
            .filter((op) => isCollectionGet(op, metadata, context.program))
            .map((op) => normalizeRoute(op.path)),
        ),
      }));

    return {
      model(model) {
        if (!getParentResource(context.program, model)) return;
        const baseType = getResourceBaseType(context.program, model);
        if (
          baseType !== ResourceBaseType.ResourceGroup &&
          baseType !== ResourceBaseType.Subscription &&
          baseType !== ResourceBaseType.Location
        ) {
          return;
        }

        const registeredLifecycle = new Set(
          [...(getArmOperationList(context.program, model) ?? [])]
            .filter((op) => op.kind !== "list" && op.kind !== "action" && op.kind !== "other")
            .map((op) => op.operation),
        );
        const lifecycle = httpServices.flatMap(({ operations, collectionPaths }) =>
          operations
            .filter((op) => {
              if (getActionDetails(context.program, op.operation) !== undefined) return false;
              const resourceOperation = getResourceOperation(context.program, op.operation);
              return (
                registeredLifecycle.has(op.operation) ||
                (resourceOperation?.resourceType === model &&
                  resourceOperation.operation !== "list")
              );
            })
            .map((op) => ({ op, collectionPaths })),
        );
        if (lifecycle.length === 0) return;

        if (
          lifecycle.every(({ op, collectionPaths }) =>
            collectionPaths.has(normalizeRoute(op.path.slice(0, op.path.lastIndexOf("/")))),
          )
        ) {
          return;
        }

        context.reportDiagnostic({
          target: lifecycle[0].op.operation.interface ?? model,
          format: { name: model.name },
        });
      },
    };
  },
});

function normalizeRoute(path: string): string {
  return path.replace(/\{[^}]+\}/g, "{}").replace(/\/+$/, "");
}

function isCollectionGet(
  operation: HttpOperation,
  metadata: MetadataInfo,
  program: Program,
): boolean {
  return (
    operation.verb === "get" &&
    operation.responses.some(
      (response) =>
        typeof response.statusCodes === "number" &&
        response.statusCodes >= 200 &&
        response.statusCodes < 300 &&
        response.responses.some(({ body }) => {
          if (body?.bodyKind !== "single" || body.type.kind !== "Model") return false;
          for (const [name, property] of walkJsonProperties(program, body.type)) {
            if (
              name === "value" &&
              metadata.isPayloadProperty(property, Visibility.Read, body.isExplicit) &&
              property.type.kind === "Model" &&
              isArrayModelType(property.type)
            ) {
              return true;
            }
          }
          return false;
        }),
    )
  );
}
