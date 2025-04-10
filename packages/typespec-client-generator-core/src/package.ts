import { createDiagnosticCollector, Diagnostic } from "@typespec/compiler";
import { resolveVersions } from "@typespec/versioning";
import { createSdkClientType } from "./clients.js";
import { listClients, listOperationGroups } from "./decorators.js";
import {
  SdkClient,
  SdkClientType,
  SdkEnumType,
  SdkModelType,
  SdkNamespace,
  SdkNullableType,
  SdkOperationGroup,
  SdkPackage,
  SdkServiceOperation,
  SdkUnionType,
  TCGCContext,
} from "./interfaces.js";
import { filterApiVersionsWithDecorators } from "./internal-utils.js";
import { getLicenseInfo } from "./license.js";
import { getCrossLanguagePackageId, getDefaultApiVersion } from "./public-utils.js";
import { getAllReferencedTypes, handleAllTypes } from "./types.js";

export function createSdkPackage<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
): [SdkPackage<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  populateApiVersionInformation(context);
  diagnostics.pipe(handleAllTypes(context));
  const crossLanguagePackageId = diagnostics.pipe(getCrossLanguagePackageId(context));
  const allReferencedTypes = getAllReferencedTypes(context);

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
  for (const client of listClients(context)) {
    let clientApiVersions = resolveVersions(context.program, client.service)
      .filter((x) => x.rootVersion)
      .map((x) => x.rootVersion!.value);
    context.setApiVersionsForType(
      client.type,
      filterApiVersionsWithDecorators(context, client.type, clientApiVersions),
    );

    context.__clientToApiVersionClientDefaultValue.set(
      client.type,
      getClientDefaultApiVersion(context, client),
    );
    for (const sc of listOperationGroups(context, client, true)) {
      clientApiVersions = resolveVersions(context.program, sc.service)
        .filter((x) => x.rootVersion)
        .map((x) => x.rootVersion!.value);
      context.setApiVersionsForType(
        sc.type,
        filterApiVersionsWithDecorators(context, sc.type, clientApiVersions),
      );

      context.__clientToApiVersionClientDefaultValue.set(
        sc.type,
        getClientDefaultApiVersion(context, sc),
      );
    }
  }
}

function getClientDefaultApiVersion(
  context: TCGCContext,
  client: SdkClient | SdkOperationGroup,
): string | undefined {
  if (context.apiVersion && !["latest", "all"].includes(context.apiVersion)) {
    return context.apiVersion;
  }
  return getDefaultApiVersion(context, client.service)?.value;
}
