import { createDiagnosticCollector, Diagnostic, DiagnosticCollector } from "@typespec/compiler";
import { createSdkClientType } from "./clients.js";
import { listClients, listOperationGroups } from "./decorators.js";
import {
  SdkClientType,
  SdkEnumType,
  SdkModelType,
  SdkNamespace,
  SdkNullableType,
  SdkPackage,
  SdkServiceOperation,
  SdkUnionType,
  TCGCContext,
} from "./interfaces.js";
import {
  filterApiVersionsWithDecorators,
  hasExplicitClientOrOperationGroup,
} from "./internal-utils.js";
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
    clients: filterClients(context, diagnostics),
    models: allReferencedTypes.filter((x): x is SdkModelType => x.kind === "model"),
    enums: allReferencedTypes.filter((x): x is SdkEnumType => x.kind === "enum"),
    unions: allReferencedTypes.filter(
      (x): x is SdkUnionType | SdkNullableType => x.kind === "union" || x.kind === "nullable",
    ),
    crossLanguagePackageId,
    namespaces: [],
    licenseInfo: getLicenseInfo(context),
    apiVersion: context.apiVersion === "all" ? "all" : versions[versions.length - 1],
  };
  organizeNamespaces(sdkPackage);
  return diagnostics.wrap(sdkPackage);
}

function filterClients<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  diagnostics: DiagnosticCollector,
): SdkClientType<TServiceOperation>[] {
  const allClients: SdkClientType<TServiceOperation>[] = listClients(context).map((c) =>
    diagnostics.pipe(createSdkClientType(context, c)),
  );
  if (hasExplicitClientOrOperationGroup(context)) {
    return allClients;
  } else {
    return allClients.filter((c) => c.methods.length > 0 || (c.children && c.children.length > 0));
  }
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
    context.setApiVersionsForType(
      client.type,
      filterApiVersionsWithDecorators(context, client.type, context.getPackageVersions()),
    );

    const clientApiVersions = context.getApiVersionsForType(client.type);
    context.__clientToApiVersionClientDefaultValue.set(
      client.type,
      clientApiVersions[clientApiVersions.length - 1],
    );
    for (const sc of listOperationGroups(context, client, true)) {
      context.setApiVersionsForType(
        sc.type,
        filterApiVersionsWithDecorators(context, sc.type, context.getPackageVersions()),
      );

      const clientApiVersions = context.getApiVersionsForType(sc.type);
      context.__clientToApiVersionClientDefaultValue.set(
        sc.type,
        clientApiVersions[clientApiVersions.length - 1],
      );
    }
  }
}
