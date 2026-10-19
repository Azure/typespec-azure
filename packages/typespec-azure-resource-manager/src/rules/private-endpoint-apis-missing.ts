import {
  createRule,
  fileRef,
  navigateProgram,
  paramMessage,
  type Interface,
  type Operation,
} from "@typespec/compiler";
import { getArmResourceOperationData, type ArmResourceOperation } from "../operations.js";
import { getResourceOperation } from "../resource.js";

const privateEndpointConnectionPathRegExp = /^(.*)\/privateEndpointConnections\/\{[^/]+\}$/i;
const privateEndpointConnectionsPathRegExp = /^(.*)\/privateEndpointConnections$/i;
const privateLinkResourcesPathRegExp = /^(.*)\/privateLinkResources$/i;

export const privateEndpointApisMissingRule = createRule({
  name: "private-endpoint-apis-missing",
  docs: fileRef.fromPackageRoot("src/rules/private-endpoint-apis-missing.md"),
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/private-endpoint-apis-missing",
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

        navigateProgram(program, {
          operation(operation) {
            if (getArmResourceOperationData(program, operation) === undefined) {
              return;
            }

            const resourceOperation = getResourceOperation(program, operation);
            if (resourceOperation !== undefined) {
              collectPath(supportedResources, resourceOperation);
            }
          },
        });

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

type PrivateEndpointApiTarget = Interface | Operation;

function collectPath(
  supportedResources: Map<string, PrivateEndpointApiSet>,
  operation: ArmResourceOperation,
): void {
  const target = operation.operation.interface ?? operation.operation;
  const pointPath = operation.path.match(privateEndpointConnectionPathRegExp);
  if (pointPath !== null) {
    getOrCreateApiSet(supportedResources, pointPath[1]).privateEndpointConnectionPath ??= target;
    return;
  }

  const listPath = operation.path.match(privateEndpointConnectionsPathRegExp);
  if (listPath !== null) {
    getOrCreateApiSet(supportedResources, listPath[1]).privateEndpointConnectionsPath ??= target;
    return;
  }

  const privateLinkPath = operation.path.match(privateLinkResourcesPathRegExp);
  if (privateLinkPath !== null) {
    getOrCreateApiSet(supportedResources, privateLinkPath[1]).privateLinkResourcesPath ??= target;
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

function getDiagnosticTarget(apiSet: PrivateEndpointApiSet): PrivateEndpointApiTarget {
  return (
    apiSet.privateEndpointConnectionPath ??
    apiSet.privateEndpointConnectionsPath ??
    apiSet.privateLinkResourcesPath!
  );
}
