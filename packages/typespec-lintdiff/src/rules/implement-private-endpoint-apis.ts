import { createRule, paramMessage, type Interface, type Model, type Operation } from "@typespec/compiler";
import {
  getArmResources,
  type ArmResourceDetails,
  type ArmResourceOperation,
} from "@azure-tools/typespec-azure-resource-manager";

const privateEndpointConnectionPathRegExp =
  /^(.*)\/privateEndpointConnections\/\{[^/]+\}$/i;
const privateEndpointConnectionsPathRegExp = /^(.*)\/privateEndpointConnections$/i;
const privateLinkResourcesPathRegExp = /^(.*)\/privateLinkResources$/i;

export const implementPrivateEndpointApisRule = createRule({
  name: "implement-private-endpoint-apis",
  description:
    "Services that expose private endpoint APIs must implement the private endpoint connection collection, point, and private link resource collection APIs together.",
  severity: "warning",
  messages: {
    default: paramMessage`The private endpoint API: ${"apiPath"} is missing.`,
  },
  create(context) {
    return {
      root: (program) => {
        const supportedResources = new Map<string, PrivateEndpointApiSet>();

        for (const armResource of getArmResources(program)) {
          collectPaths(
            supportedResources,
            armResource,
            Object.values(armResource.operations.lifecycle),
          );
          collectPaths(
            supportedResources,
            armResource,
            Object.values(armResource.operations.lists),
          );
        }

        for (const [basePath, apiSet] of supportedResources.entries()) {
          const target = getDiagnosticTarget(apiSet);
          if (!apiSet.privateEndpointConnectionPath) {
            context.reportDiagnostic({
              target,
              format: {
                apiPath: `${basePath}/privateEndpointConnections/{privateEndpointConnectionName}`,
              },
            });
          }

          if (!apiSet.privateEndpointConnectionsPath) {
            context.reportDiagnostic({
              target,
              format: {
                apiPath: `${basePath}/privateEndpointConnections`,
              },
            });
          }

          if (!apiSet.privateLinkResourcesPath) {
            context.reportDiagnostic({
              target,
              format: {
                apiPath: `${basePath}/privateLinkResources`,
              },
            });
          }
        }
      },
    };
  },
});

interface PrivateEndpointApiSet {
  privateEndpointConnectionPath?: PrivateEndpointApiTarget;
  privateEndpointConnectionsPath?: PrivateEndpointApiTarget;
  privateLinkResourcesPath?: PrivateEndpointApiTarget;
}

type PrivateEndpointApiTarget = Interface | Model | Operation;

function collectPaths(
  supportedResources: Map<string, PrivateEndpointApiSet>,
  armResource: ArmResourceDetails,
  operations: Array<ArmResourceOperation | undefined>,
): void {
  for (const operation of operations) {
    if (operation === undefined) {
      continue;
    }

    const pointPath = operation.path.match(privateEndpointConnectionPathRegExp);
    if (pointPath !== null) {
      getOrCreateApiSet(supportedResources, pointPath[1]).privateEndpointConnectionPath ??=
        getTarget(armResource, operation);
      continue;
    }

    const listPath = operation.path.match(privateEndpointConnectionsPathRegExp);
    if (listPath !== null) {
      getOrCreateApiSet(supportedResources, listPath[1]).privateEndpointConnectionsPath ??=
        getTarget(armResource, operation);
      continue;
    }

    const privateLinkPath = operation.path.match(privateLinkResourcesPathRegExp);
    if (privateLinkPath !== null) {
      getOrCreateApiSet(supportedResources, privateLinkPath[1]).privateLinkResourcesPath ??=
        getTarget(armResource, operation);
    }
  }
}

function getOrCreateApiSet(
  supportedResources: Map<string, PrivateEndpointApiSet>,
  key: string,
): PrivateEndpointApiSet {
  let apiSet = supportedResources.get(key);
  if (apiSet === undefined) {
    apiSet = {};
    supportedResources.set(key, apiSet);
  }

  return apiSet;
}

function getTarget(
  resource: ArmResourceDetails,
  operation: ArmResourceOperation,
): PrivateEndpointApiTarget {
  return operation.operation.interface ?? operation.operation ?? resource.typespecType;
}

function getDiagnosticTarget(apiSet: PrivateEndpointApiSet): PrivateEndpointApiTarget {
  return (
    apiSet.privateEndpointConnectionPath ??
    apiSet.privateEndpointConnectionsPath ??
    apiSet.privateLinkResourcesPath!
  );
}
