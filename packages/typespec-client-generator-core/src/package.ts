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
import {
  filterApiVersionsWithDecorators,
  getActualClientType,
  getTypeDecorators,
  validateCrossNamespaceNamesWithFlag,
} from "./internal-utils.js";
import { getLicenseInfo } from "./license.js";
import { getCrossLanguagePackageId, getNamespaceFromType } from "./public-utils.js";
import { getAllReferencedTypes, handleAllTypes } from "./types.js";

export function createSdkPackage<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
): [SdkPackage<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();

  // Validate cross-namespace names if namespace flag is set (flattens namespaces)
  // Can't validate in $onValidate bc we don't have access to the namespace flag
  validateCrossNamespaceNamesWithFlag(context, diagnostics);

  populateApiVersionInformation(context);
  diagnostics.pipe(handleAllTypes(context));
  const crossLanguagePackageId = diagnostics.pipe(getCrossLanguagePackageId(context));
  const allReferencedTypes = getAllReferencedTypes(context);
  const versions = context.getPackageVersions();
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
      apiVersion:
        context.apiVersion === "all" && versions.size === 1
          ? "all"
          : versions.size === 1
            ? [...versions.values()][0].at(-1)
            : undefined,
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

  for (const client of context.__rawClientsOperationGroupsCache!.values()) {
    const clientType = getActualClientType(client);

    // Multiple service case. Set empty result.
    if (client.services.length > 1) {
      context.setApiVersionsForType(clientType, []);
      context.__clientApiVersionDefaultValueCache.set(client, undefined);
    } else {
      const versions = filterApiVersionsWithDecorators(
        context,
        clientType,
        packageVersions.get(client.services[0]) || [],
      );
      context.setApiVersionsForType(clientType, versions);

      context.__clientApiVersionDefaultValueCache.set(client, versions[versions.length - 1]);
    }
  }
}
