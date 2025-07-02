import { createDiagnosticCollector, Diagnostic } from "@typespec/compiler";
import { prepareClientAndOperationCache } from "./cache.js";
import { createSdkClientType } from "./clients.js";
import { listClients } from "./decorators.js";
import {
  SdkEnumType,
  SdkModelType,
  SdkNamespace,
  SdkNullableType,
  SdkPackage,
  SdkServiceOperation,
  SdkUnionType,
  TCGCContext,
} from "./interfaces.js";
import { filterApiVersionsWithDecorators } from "./internal-utils.js";
import { getLicenseInfo } from "./license.js";
import { getCrossLanguagePackageId } from "./public-utils.js";
import { getAllReferencedTypes, handleAllTypes } from "./types.js";

export function createSdkPackage<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
): [SdkPackage<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
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
      apiVersion: context.apiVersion === "all" ? "all" : versions[versions.length - 1],
    },
  };
  organizeNamespaces(sdkPackage);
  return diagnostics.wrap(sdkPackage);
}

function organizeNamespaces<TServiceOperation extends SdkServiceOperation>(
  sdkPackage: SdkPackage<TServiceOperation>,
) {
  const clients = [...sdkPackage.clients];
  while (clients.length > 0) {
    const client = clients.shift()!;
    getSdkNamespace(sdkPackage, client.namespace).clients.push(client);
    if (client.children && client.children.length > 0) {
      clients.push(...client.children);
    }
  }
  for (const model of sdkPackage.models) {
    getSdkNamespace(sdkPackage, model.namespace).models.push(model);
  }
  for (const enumType of sdkPackage.enums) {
    getSdkNamespace(sdkPackage, enumType.namespace).enums.push(enumType);
  }
  for (const unionType of sdkPackage.unions) {
    getSdkNamespace(sdkPackage, unionType.namespace).unions.push(unionType);
  }
}

function getSdkNamespace<TServiceOperation extends SdkServiceOperation>(
  sdkPackage: SdkPackage<TServiceOperation>,
  namespace: string,
) {
  const segments = namespace.split(".");
  let current: SdkPackage<TServiceOperation> | SdkNamespace<TServiceOperation> = sdkPackage;
  let fullName = "";
  for (const segment of segments) {
    fullName = fullName === "" ? segment : `${fullName}.${segment}`;
    const ns: SdkNamespace<TServiceOperation> | undefined = current.namespaces.find(
      (ns) => ns.name === segment,
    );
    if (ns === undefined) {
      const newNs = {
        name: segment,
        fullName,
        clients: [],
        models: [],
        enums: [],
        unions: [],
        namespaces: [],
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
        context.getPackageVersions(),
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
