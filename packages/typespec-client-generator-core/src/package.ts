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
} from "./internal-utils.js";
import { createDiagnostic } from "./lib.js";
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
  diagnostics.pipe(validateClientInitializationParameters(context, sdkPackage));
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
    if (Array.isArray(client.service)) {
      context.setApiVersionsForType(clientType, []);
      context.__clientApiVersionDefaultValueCache.set(client, undefined);
    } else {
      const versions = filterApiVersionsWithDecorators(
        context,
        clientType,
        packageVersions.get(client.service) || [],
      );
      context.setApiVersionsForType(clientType, versions);

      context.__clientApiVersionDefaultValueCache.set(client, versions[versions.length - 1]);
    }
  }
}

/**
 * Validates that all client initialization parameters are actually used in at least one operation
 * of the client or its sub-clients.
 */
function validateClientInitializationParameters<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  sdkPackage: SdkPackage<TServiceOperation>,
): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Process all top-level clients
  for (const client of sdkPackage.clients) {
    diagnostics.push(...validateClientInitializationParametersRecursive(context, client));
  }

  return diagnostics;
}

/**
 * Recursively validates client initialization parameters for a client and all its children.
 */
function validateClientInitializationParametersRecursive<
  TServiceOperation extends SdkServiceOperation,
>(context: TCGCContext, client: SdkClientType<TServiceOperation>): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Get the raw entity (Namespace or Interface) to report diagnostics on
  const target = client.__raw.type;
  if (!target) {
    // If there's no target, skip validation for this client
    return diagnostics;
  }

  // Collect all operation parameters from this client and all sub-clients
  const allOperationParameterNames = new Set<string>();
  collectOperationParameterNames(client, allOperationParameterNames);

  // Check each client initialization parameter
  for (const param of client.clientInitialization.parameters) {
    // Skip built-in parameters like endpoint and credential
    if (param.kind === "endpoint" || param.kind === "credential") {
      continue;
    }

    // Check if this parameter is used in any operation
    if (!allOperationParameterNames.has(param.name)) {
      diagnostics.push(
        createDiagnostic({
          code: "unused-client-initialization-parameter",
          target: target,
          format: {
            parameterName: param.name,
            clientName: client.name,
          },
        }),
      );
    }
  }

  // Recursively validate sub-clients
  if (client.children) {
    for (const child of client.children) {
      diagnostics.push(...validateClientInitializationParametersRecursive(context, child));
    }
  }

  return diagnostics;
}

/**
 * Collects all parameter names used in operations of a client and all its sub-clients.
 */
function collectOperationParameterNames<TServiceOperation extends SdkServiceOperation>(
  client: SdkClientType<TServiceOperation>,
  parameterNames: Set<string>,
): void {
  // Collect parameters from all methods in this client
  for (const method of client.methods) {
    if (method.kind === "clientaccessor") {
      // Client accessors don't have operations, skip them
      continue;
    }

    // Check operation parameters
    if (method.operation && method.operation.kind === "http") {
      for (const param of method.operation.parameters) {
        // Check correspondingMethodParams to find the client initialization parameter
        if (param.correspondingMethodParams) {
          for (const methodParam of param.correspondingMethodParams) {
            if (methodParam.kind === "method" && methodParam.onClient) {
              parameterNames.add(methodParam.name);
            }
          }
        }
      }

      // Also check body parameter
      if (method.operation.bodyParam) {
        const bodyParam = method.operation.bodyParam;
        if (bodyParam.correspondingMethodParams) {
          for (const methodParam of bodyParam.correspondingMethodParams) {
            if (methodParam.kind === "method" && methodParam.onClient) {
              parameterNames.add(methodParam.name);
            }
          }
        }
      }
    }
  }

  // Recursively collect from sub-clients
  if (client.children) {
    for (const child of client.children) {
      collectOperationParameterNames(child, parameterNames);
    }
  }
}
