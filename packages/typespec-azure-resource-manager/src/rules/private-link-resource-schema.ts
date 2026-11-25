import {
  createRule,
  fileRef,
  isArrayModelType,
  isNeverType,
  isNullType,
  paramMessage,
  resolveEncodedName,
  walkPropertiesInherited,
  type ModelProperty,
  type Operation,
  type Program,
  type Type,
} from "@typespec/compiler";
import { createMetadataInfo, Visibility, type HttpStatusCodesEntry } from "@typespec/http";
import type { ArmResourceOperation } from "../operations.js";
import { resolveArmResources } from "../resource.js";

type SchemaKind = "connection" | "link";
type Metadata = ReturnType<typeof createMetadataInfo>;

const connectionPath = /\/privateEndpointConnections(\/\{[^/]+\})*$/;
const linkCollectionPath = /\/privateLinkResources$/;

export const privateLinkResourceSchemaRule = createRule({
  name: "private-link-resource-schema",
  docs: fileRef.fromPackageRoot("src/rules/private-link-resource-schema.md"),
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/private-link-resource-schema",
  description:
    "Private endpoint connection and private link resource responses must contain the expected properties.",
  severity: "warning",
  messages: {
    default: paramMessage`The ${"kind"} GET response must contain ${"expected"}.`,
  },
  create(context) {
    const program = context.program;
    const metadata = createMetadataInfo(program);

    return {
      exit() {
        const checked = new Set<Operation>();
        for (const resource of resolveArmResources(program).resources ?? []) {
          const operations = [
            ...Object.values(resource.operations.lifecycle).flatMap((items) => items ?? []),
            ...resource.operations.lists,
            ...resource.operations.actions,
            ...(resource.associatedOperations ?? []),
          ];
          for (const operation of operations) {
            if (checked.has(operation.operation)) continue;
            checked.add(operation.operation);
            checkOperation(operation);
          }
        }
      },
    };

    function checkOperation(operation: ArmResourceOperation): void {
      const { httpOperation } = operation;
      if (httpOperation.verb !== "get") return;
      const path = httpOperation.path.split("?")[0];
      const kind: SchemaKind | undefined = connectionPath.test(path)
        ? "connection"
        : linkCollectionPath.test(path)
          ? "link"
          : undefined;
      if (kind === undefined) return;
      const collection = kind === "link" || path.endsWith("/privateEndpointConnections");
      for (const response of httpOperation.responses) {
        if (!includes200(response.statusCodes)) continue;
        for (const { body } of response.responses) {
          if (body === undefined || body.bodyKind !== "single") continue;
          if (
            !isValidResponse(
              program,
              metadata,
              body.type,
              body.isExplicit && body.containsMetadataAnnotations,
              kind,
              collection,
            )
          ) {
            const fields =
              kind === "connection"
                ? "`properties.privateEndpoint` and `properties.privateLinkServiceConnectionState`"
                : "`properties.groupId`, `properties.requiredMembers`, and `properties.requiredZoneNames`";
            context.reportDiagnostic({
              target: operation.operation,
              format: {
                kind:
                  kind === "connection" ? "private endpoint connection" : "private link resource",
                expected: collection ? `a \`value\` array with items containing ${fields}` : fields,
              },
            });
            return;
          }
        }
      }
    }
  },
});

function includes200(status: HttpStatusCodesEntry): boolean {
  return status === 200 || (typeof status === "object" && status.start <= 200 && status.end >= 200);
}

function isValidResponse(
  program: Program,
  metadata: Metadata,
  type: Type,
  isExplicit: boolean,
  kind: SchemaKind,
  collection: boolean,
): boolean {
  type = unwrapNullable(type);
  if (type.kind === "Union") {
    return [...type.variants.values()].every((variant) =>
      isValidResponse(program, metadata, variant.type, isExplicit, kind, collection),
    );
  }
  let resource: Type = type;
  if (collection) {
    const value = getPayloadProperty(program, metadata, type, "value", isExplicit);
    const array = value && unwrapNullable(value.type);
    if (array?.kind !== "Model" || !isArrayModelType(array) || !array.indexer) {
      return false;
    }
    resource = array.indexer.value;
  }
  const properties = getPayloadProperty(program, metadata, resource, "properties", isExplicit);
  if (!properties) return false;
  const required =
    kind === "connection"
      ? ["privateEndpoint", "privateLinkServiceConnectionState"]
      : ["groupId", "requiredMembers", "requiredZoneNames"];
  return required.every((name) =>
    getPayloadProperty(program, metadata, properties.type, name, isExplicit),
  );
}

function getPayloadProperty(
  program: Program,
  metadata: Metadata,
  type: Type,
  name: string,
  isExplicit: boolean,
): ModelProperty | undefined {
  type = unwrapNullable(type);
  if (type.kind !== "Model" || isArrayModelType(type)) return undefined;
  return [...walkPropertiesInherited(type)].find(
    (property) =>
      metadata.isPayloadProperty(property, Visibility.Read, isExplicit) &&
      !isNeverType(property.type) &&
      resolveEncodedName(program, property, "application/json") === name,
  );
}

function unwrapNullable(type: Type): Type {
  if (type.kind !== "Union") return type;
  const nonNull = [...type.variants.values()]
    .map((variant) => variant.type)
    .filter((t) => !isNullType(t));
  return nonNull.length === 1 ? nonNull[0] : type;
}
