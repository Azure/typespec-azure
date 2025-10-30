import { createDiagnosticCollector, Diagnostic, ignoreDiagnostics } from "@typespec/compiler";
import { prepareClientAndOperationCache } from "./cache.js";
import { createSdkClientType } from "./clients.js";
import { listClients } from "./decorators.js";
import {
  SdkClientType,
  SdkEnumType,
  SdkModelType,
  SdkNamespace,
  SdkNullableType,
  SdkPackage,
  SdkServiceOperation,
  SdkType,
  SdkUnionType,
  TCGCContext,
} from "./interfaces.js";
import { filterApiVersionsWithDecorators, getTypeDecorators } from "./internal-utils.js";
import { getLicenseInfo } from "./license.js";
import { getCrossLanguagePackageId, getNamespaceFromType } from "./public-utils.js";
import { getAllReferencedTypes, handleAllTypes } from "./types.js";

export function createSdkPackage<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
): [SdkPackage<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  populateApiVersionInformation(context);
  diagnostics.pipe(handleAllTypes(context));
  const crossLanguagePackageId = diagnostics.pipe(getCrossLanguagePackageId(context));
  const allReferencedTypes = getAllReferencedTypes(context);
  const versions = context.getApiVersions();
  const sdkPackage: SdkPackage<TServiceOperation> = {
    clients: diagnostics.pipe(createClients(context)),
    models: allReferencedTypes.filter((x): x is SdkModelType => x.kind === "model"),
    enums: allReferencedTypes.filter((x): x is SdkEnumType => x.kind === "enum"),
    unions: allReferencedTypes.filter(
      (x): x is SdkUnionType | SdkNullableType => x.kind === "union" || x.kind === "nullable",
    ),
    crossLanguagePackageId,
    namespaces: [],
    licenseInfo: getLicenseInfo(context),
    metadata: {
      apiVersion: context.apiVersion === "all" ? "all" : versions[versions.length - 1],
    },
  };
  organizeNamespaces(context, sdkPackage);
  return diagnostics.wrap(sdkPackage);
}

function createClients<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
): [SdkClientType<TServiceOperation>[], readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  if (context.__clientTypesCache) {
    return diagnostics.wrap(context.__clientTypesCache as SdkClientType<TServiceOperation>[]);
  }

  const allClients = listClients(context).map((c) =>
    diagnostics.pipe(createSdkClientType<TServiceOperation>(context, c)),
  );

  // Build parent-child relationships
  // Create a map for quick lookup
  const clientMap = new Map<SdkClientType<TServiceOperation>, SdkClientType<TServiceOperation>>();
  for (const client of allClients) {
    clientMap.set(client, client);
  }

  // Populate children arrays for each client based on parent relationships
  for (const client of allClients) {
    if (client.parent) {
      // Find the parent client in our map
      const parentClient = clientMap.get(client.parent);
      if (parentClient) {
        if (!parentClient.children) {
          parentClient.children = [];
        }
        parentClient.children.push(client);
      }
    }
  }

  // Filter to only include root-level clients (those without a parent)
  // Child clients will only appear in their parent's .children property
  const rootClients = allClients.filter((client) => !client.parent);

  context.__clientTypesCache = rootClients;
  return diagnostics.wrap(rootClients);
}

function organizeNamespaces<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  sdkPackage: SdkPackage<TServiceOperation>,
) {
  const clients = [...sdkPackage.clients];
  while (clients.length > 0) {
    const client = clients.shift()!;
    getSdkNamespace(context, sdkPackage, client).clients.push(client);
    if (client.children && client.children.length > 0) {
      clients.push(...client.children);
    }
  }
  for (const model of sdkPackage.models) {
    getSdkNamespace(context, sdkPackage, model).models.push(model);
  }
  for (const enumType of sdkPackage.enums) {
    getSdkNamespace(context, sdkPackage, enumType).enums.push(enumType);
  }
  for (const unionType of sdkPackage.unions) {
    getSdkNamespace(context, sdkPackage, unionType).unions.push(unionType);
  }
}

function getSdkNamespace<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  sdkPackage: SdkPackage<TServiceOperation>,
  type: SdkType | SdkClientType<TServiceOperation>,
) {
  if (!("namespace" in type)) {
    return sdkPackage;
  }

  const namespace = type.namespace;
  const segments = namespace.split(".");
  let current: SdkPackage<TServiceOperation> | SdkNamespace<TServiceOperation> = sdkPackage;
  let fullName = "";
  for (const segment of segments) {
    fullName = fullName === "" ? segment : `${fullName}.${segment}`;
    const ns: SdkNamespace<TServiceOperation> | undefined = current.namespaces.find(
      (ns) => ns.name === segment,
    );
    if (ns === undefined) {
      const rawNamespace = getNamespaceFromType(type.__raw);
      const newNs = {
        __raw: rawNamespace,
        name: segment,
        fullName,
        clients: [],
        models: [],
        enums: [],
        unions: [],
        namespaces: [],
        decorators: rawNamespace ? ignoreDiagnostics(getTypeDecorators(context, rawNamespace)) : [],
      };
      current.namespaces.push(newNs);
      current = newNs;
    } else {
      current = ns;
    }
  }
  return current;
}

function populateApiVersionInformation(context: TCGCContext): void {
  if (context.__rawClientsOperationGroupsCache === undefined) {
    prepareClientAndOperationCache(context);
  }
  for (const clientOperationGroup of context.__rawClientsOperationGroupsCache!.values()) {
    context.setApiVersionsForType(
      clientOperationGroup.type ?? clientOperationGroup.service,
      filterApiVersionsWithDecorators(
        context,
        clientOperationGroup.type ?? clientOperationGroup.service,
        context.getApiVersions(clientOperationGroup.service),
      ),
    );

    const clientApiVersions = context.getApiVersionsForType(
      clientOperationGroup.type ?? clientOperationGroup.service,
    );
    context.__clientApiVersionDefaultValueCache.set(
      clientOperationGroup,
      clientApiVersions[clientApiVersions.length - 1],
    );
  }
}
