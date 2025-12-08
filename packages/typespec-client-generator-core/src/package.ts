import { createDiagnosticCollector, Diagnostic, ignoreDiagnostics } from "@typespec/compiler";
import { getVersionDependencies } from "@typespec/versioning";
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
import {
  filterApiVersionsWithDecorators,
  getClientNamespaceType,
  getTypeDecorators,
} from "./internal-utils.js";
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
  const versions = context.getPackageVersions().values().next().value!;
  const sdkPackage: SdkPackage<TServiceOperation> = {
    clients: listClients(context).map((c) => diagnostics.pipe(createSdkClientType(context, c))),
    models: allReferencedTypes.filter((x): x is SdkModelType => x.kind === "model"),
    enums: allReferencedTypes.filter((x): x is SdkEnumType => x.kind === "enum"),
    unions: allReferencedTypes.filter(
      (x): x is SdkUnionType | SdkNullableType => x.kind === "union" || x.kind === "nullable",
    ),
    crossLanguagePackageId,
    namespaces: [],
    licenseInfo: getLicenseInfo(context),
    metadata: {
      apiVersion: context.apiVersion === "all" || !versions ? "all" : versions[versions.length - 1],
    },
  };
  organizeNamespaces(context, sdkPackage);
  return diagnostics.wrap(sdkPackage);
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
  
  // Get the package versions map once (this handles both single and multi-service scenarios)
  const packageVersions = context.getPackageVersions();
  
  for (const clientOperationGroup of context.__rawClientsOperationGroupsCache!.values()) {
    const clientOperationGroupType = getClientNamespaceType(clientOperationGroup);
    
    // Get the appropriate versions for this client/operation group
    const services = Array.isArray(clientOperationGroup.service) 
      ? clientOperationGroup.service 
      : [clientOperationGroup.service];
    
    const versionsToUse: string[] = [];
    
    // For multi-service clients with @useDependency, filter to only dependency versions
    const isMultiServiceClient = clientOperationGroup.kind === "SdkClient" && Array.isArray(clientOperationGroup.service);
    const versionDependencies = isMultiServiceClient && clientOperationGroupType.kind === "Namespace"
      ? getVersionDependencies(context.program, clientOperationGroupType)
      : undefined;
    
    for (const service of services) {
      // Try to find versions in the map - use the service namespace name as fallback
      let serviceVersions = packageVersions.get(service);
      
      // If not found by object identity, try to find by namespace name
      if (!serviceVersions) {
        for (const [ns, versions] of packageVersions.entries()) {
          if (ns.name === service.name) {
            serviceVersions = versions;
            break;
          }
        }
      }
      
      if (serviceVersions) {
        // If this is a multi-service client with @useDependency, filter to only the dependency version
        if (versionDependencies) {
          const versionDep = versionDependencies.get(service);
          if (versionDep && "name" in versionDep) {
            versionsToUse.push(versionDep.value as string);
          } else {
            versionsToUse.push(...serviceVersions);
          }
        } else {
          versionsToUse.push(...serviceVersions);
        }
      }
    }
    
    context.setApiVersionsForType(
      clientOperationGroupType,
      filterApiVersionsWithDecorators(
        context,
        clientOperationGroupType,
        versionsToUse,
      ),
    );

    const clientApiVersions = context.getApiVersionsForType(clientOperationGroupType);
    context.__clientApiVersionDefaultValueCache.set(
      clientOperationGroup,
      clientApiVersions[clientApiVersions.length - 1],
    );
  }
}
