import { isArmCommonType } from "@azure-tools/typespec-azure-resource-manager";
import {
  createTCGCContext,
  getClientLocation,
  getClientNameOverride,
  type TCGCContext,
} from "@azure-tools/typespec-client-generator-core";
import {
  createRule,
  isGlobalNamespace,
  isService,
  isTemplateDeclaration,
  paramMessage,
  type Interface,
  type Namespace,
  type Operation,
  type Program,
  type Type,
} from "@typespec/compiler";
import { capitalize } from "@typespec/compiler/casing";
import { getAllHttpServices } from "@typespec/http";

export const operationIdNounConflictingModelNamesRule = createRule({
  name: "operation-id-noun-conflicting-model-names",
  description: "Operation ID nouns should not conflict with service schema type names.",
  severity: "warning",
  messages: {
    default: paramMessage`Operation ID noun '${"noun"}' conflicts with the schema type '${"noun"}'. Consider a plural noun to avoid disambiguation in generated clients.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(context.program, "@azure-tools/typespec-autorest", {
      mutateNamespace: false,
    });
    return {
      root: () => {
        const [services] = getAllHttpServices(context.program);
        for (const service of services) {
          const schemaNames = new Set<string>();
          const visited = new Set<Type>();
          for (const httpOperation of service.operations) {
            const requestBody = httpOperation.parameters.body;
            if (requestBody?.bodyKind === "single") {
              collectSchemas(
                requestBody.type,
                service.namespace,
                tcgcContext,
                schemaNames,
                visited,
              );
            }
            for (const response of httpOperation.responses) {
              for (const content of response.responses) {
                if (content.body?.bodyKind === "single") {
                  collectSchemas(
                    content.body.type,
                    service.namespace,
                    tcgcContext,
                    schemaNames,
                    visited,
                  );
                }
              }
            }
          }

          for (const httpOperation of service.operations) {
            const operation = httpOperation.operation;
            const noun = getOperationGroup(context.program, tcgcContext, operation);
            if (noun && schemaNames.has(noun)) {
              context.reportDiagnostic({ target: operation, format: { noun } });
            }
          }
        }
      },
    };
  },
});

function getOperationGroup(
  program: Program,
  tcgcContext: TCGCContext,
  operation: Operation,
): string | undefined {
  const location = getClientLocation(tcgcContext, operation);
  if (location) {
    if (typeof location === "string") return getOperationIdNoun(location);
    if (
      location.kind === "Namespace" &&
      (isGlobalNamespace(program, location) || isService(program, location))
    ) {
      return getOperationNameNoun(tcgcContext, operation);
    }
    return getOperationIdNoun(getClientName(tcgcContext, location));
  }

  if (operation.interface) {
    return getOperationIdNoun(getClientName(tcgcContext, operation.interface));
  }
  const namespace = operation.namespace;
  if (!namespace || isGlobalNamespace(program, namespace) || isService(program, namespace)) {
    return getOperationNameNoun(tcgcContext, operation);
  }
  return getOperationIdNoun(getClientName(tcgcContext, namespace));
}

function getClientName(tcgcContext: TCGCContext, type: Interface | Namespace | Operation): string {
  return getClientNameOverride(tcgcContext, type) ?? type.name;
}

function getOperationNameNoun(tcgcContext: TCGCContext, operation: Operation): string | undefined {
  const name = getClientName(tcgcContext, operation);
  return name.includes("_") ? getOperationIdNoun(name) : undefined;
}

function getOperationIdNoun(groupName: string): string | undefined {
  const noun = groupName.split("_", 1)[0];
  return noun ? capitalize(noun) : undefined;
}

function collectSchemas(
  type: Type,
  service: Namespace,
  tcgcContext: TCGCContext,
  names: Set<string>,
  visited: Set<Type>,
): void {
  if (visited.has(type)) return;
  visited.add(type);

  switch (type.kind) {
    case "Model":
      if (type.name && type.namespace === service && !isArmCommonType(type)) {
        names.add(getClientNameOverride(tcgcContext, type) ?? type.name);
      }
      if (type.baseModel) collectSchemas(type.baseModel, service, tcgcContext, names, visited);
      for (const derivedModel of type.derivedModels) {
        if (!isTemplateDeclaration(derivedModel)) {
          collectSchemas(derivedModel, service, tcgcContext, names, visited);
        }
      }
      if (type.indexer) collectSchemas(type.indexer.value, service, tcgcContext, names, visited);
      for (const property of type.properties.values()) {
        collectSchemas(property.type, service, tcgcContext, names, visited);
      }
      break;
    case "Scalar":
    case "Enum":
    case "Union":
      if (type.name && type.namespace === service && !isArmCommonType(type)) {
        names.add(getClientNameOverride(tcgcContext, type) ?? type.name);
      }
      if (type.kind !== "Union") break;
      for (const variant of type.variants.values()) {
        collectSchemas(variant.type, service, tcgcContext, names, visited);
      }
      break;
    case "Tuple":
      for (const value of type.values) {
        collectSchemas(value, service, tcgcContext, names, visited);
      }
      break;
  }
}
