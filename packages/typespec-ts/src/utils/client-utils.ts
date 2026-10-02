import {
  InitializedByFlags,
  listAllServiceNamespaces,
  listClients,
  type SdkClient,
  type SdkClientType,
  type SdkServiceOperation,
} from "@azure-tools/typespec-client-generator-core";
import {
  getNamespaceFullName,
  type Interface,
  isTemplateDeclaration,
  isTemplateDeclarationOrInstance,
  type Namespace,
  NoTarget,
  type Operation,
} from "@typespec/compiler";
import type { ClientModuleInfo } from "../modular/interfaces.js";
import type { SdkContext } from "./interfaces.js";
import { NameType, normalizeSdkName, reportInvalidExactName } from "./name-utils.js";

export function getClients(dpgContext: SdkContext): SdkClient[] {
  const clients = listClients(dpgContext);
  const rawServiceNamespaces =
    dpgContext.allServiceNamespaces ?? listAllServiceNamespaces(dpgContext);

  // For one client: Return the client from listClients with multi-service support
  if (clients.length === 1) {
    return clients.map((client) => {
      const services = client.services;
      return {
        ...client,
        services: services,
        crossLanguageDefinitionId: `${getNamespaceFullName(services[0]!)}.${client.name}`,
      };
    });
  } else {
    // For multiple clients:
    // Flatten all services and return one client per service
    const services = new Set<Namespace>();
    clients.forEach((c) => {
      const clientService = c.services;
      clientService.forEach((ns) => services.add(ns));
    });

    if (services.size > 0) {
      return [...services.values()].map((service) => {
        const clientName = service.name + "Client";
        return {
          kind: "SdkClient",
          name: clientName,
          service: service,
          type: service,
          services: [service],
          subClients: [],
          clientPath: clientName,
          arm: Boolean(dpgContext.arm),
          crossLanguageDefinitionId: `${getNamespaceFullName(service)}.${clientName}`,
          subOperationGroups: [],
        };
      });
    }
  }

  // Fallback to raw service namespaces if no clients found
  return rawServiceNamespaces.map((service) => {
    const clientName = service.name + "Client";
    return {
      kind: "SdkClient",
      name: clientName,
      service: service,
      type: service,
      services: [service],
      subClients: [],
      clientPath: clientName,
      arm: Boolean(dpgContext.arm),
      crossLanguageDefinitionId: `${getNamespaceFullName(service)}.${clientName}`,
      subOperationGroups: [],
    };
  });
}

export function listOperationsUnderClient(client: SdkClient): Operation[] {
  const operations = [];
  const serviceArray = client.services;
  const queue: (Namespace | Interface)[] = [...serviceArray];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (
      current.decorators.some(
        (d) =>
          d.definition?.name === "@client" &&
          getNamespaceFullName(d.definition?.namespace) === "Azure.ClientGenerator.Core",
      ) &&
      !serviceArray.includes(current as Namespace)
    ) {
      continue;
    }
    operations.push(
      ...[...current.operations.values()].filter(
        (op) => isTemplateDeclarationOrInstance(op) === false,
      ),
    );
    if (current.kind === "Namespace") {
      queue.push(...current.namespaces.values());
      queue.push(
        ...[...current.interfaces.values()].filter((i) => isTemplateDeclaration(i) === false),
      );
    }
  }
  return operations;
}

export function isMultiEndpointClient(dpgContext: SdkContext): boolean {
  return getClients(dpgContext).length > 1;
}

export function getClientModuleInfo(clientMap: [string[], SdkClientType<SdkServiceOperation>]) {
  const [hierarchy, client] = clientMap;
  const clientName = client.name.replace(/Client$/, "");
  const clientModuleInfo: ClientModuleInfo = {
    clientName: `${clientName}Context`,
  };
  clientModuleInfo.subfolder = hierarchy.join("/");
  return clientModuleInfo;
}

export function getClientHierarchyMap(
  context: SdkContext,
): [string[], SdkClientType<SdkServiceOperation>][] {
  const clientMap: [string[], SdkClientType<SdkServiceOperation>][] = [];
  const individualClients = context.sdkPackage.clients.filter((client) => {
    return client.clientInitialization.initializedBy & InitializedByFlags.Individually;
  });
  const clients = individualClients.map((client) => {
    return [
      context.sdkPackage.clients.length > 1
        ? [
            normalizeSdkName(client, NameType.File, {
              nameOverride: client.name.replace(/Client$/, ""),
            }),
          ]
        : [],
      client,
    ];
  }) as [string[], SdkClientType<SdkServiceOperation>][];
  for (let i = 0; i < clients.length; i++) {
    const [hierarchy, client] = clients[i]!;
    reportInvalidExactName(
      context.program,
      client,
      NameType.Class,
      "client",
      client.__raw.type ?? NoTarget,
    );
    for (const parameter of client.clientInitialization.parameters) {
      reportInvalidExactName(
        context.program,
        parameter,
        NameType.Parameter,
        "parameter",
        parameter.__raw ?? NoTarget,
      );
    }
    clientMap.push([hierarchy, client]);
    const childClientsToGenerate = client.children?.filter((child) => {
      return (
        child.clientInitialization.initializedBy & InitializedByFlags.Individually ||
        child.clientInitialization.initializedBy & InitializedByFlags.Parent
      );
    });
    if (childClientsToGenerate && childClientsToGenerate.length > 0) {
      childClientsToGenerate.forEach((child) => {
        const childHierarchy = [
          ...hierarchy,
          normalizeSdkName(child, NameType.File, {
            nameOverride: child.name.replace(/Client$/, ""),
          }),
        ];
        clients.push([childHierarchy, child]);
      });
    }
  }
  return clientMap;
}
