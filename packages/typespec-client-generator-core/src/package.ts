import {
  createDiagnosticCollector,
  getNamespaceFullName,
  ignoreDiagnostics,
  type Diagnostic,
  type Namespace,
} from "@typespec/compiler";

import { prepareClientAndOperationCache } from "./cache.js";
import { createSdkClientType } from "./clients.js";
import { getClientNamespace, listClients } from "./decorators.js";
import type {
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
import { getLicenseInfo } from "./license.js";
import { getCrossLanguagePackageId, getNamespaceFromType } from "./public-utils.js";
import { getAllReferencedTypes, handleAllTypes } from "./types.js";

export async function createSdkPackage<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
): Promise<[SdkPackage<TServiceOperation>, readonly Diagnostic[]]> {
  const diagnostics = createDiagnosticCollector();
  populateApiVersionInformation(context);
  diagnostics.pipe(handleAllTypes(context));
  const crossLanguagePackageId = diagnostics.pipe(getCrossLanguagePackageId(context));
  const allReferencedTypes = getAllReferencedTypes(context);
  const versions = context.getPackageVersions();

  // Create apiVersions map for multiple services
  const apiVersionsMap = new Map<string, string>();
  for (const [namespace, versionList] of versions.entries()) {
    const fullName = getNamespaceFullName(namespace);
    const latestVersion = versionList.at(-1);
    if (latestVersion) {
      // When apiVersion config is "all" for single service, store "all" in the map as well
      const versionValue =
        context.apiVersion === "all" && versions.size === 1 ? "all" : latestVersion;
      apiVersionsMap.set(fullName, versionValue);
    }
  }

  const sdkPackage: SdkPackage<TServiceOperation> = {
    clients: listClients(context).map((c) => diagnostics.pipe(createSdkClientType(context, c))),
    models: allReferencedTypes.filter((x): x is SdkModelType => x.kind === "model"),
    enums: allReferencedTypes.filter((x): x is SdkEnumType => x.kind === "enum"),
    unions: allReferencedTypes.filter(
      (x): x is SdkUnionType | SdkNullableType => x.kind === "union" || x.kind === "nullable",
    ),
    crossLanguagePackageId,
    crossLanguageVersion: "", // Placeholder, computed after package is fully built
    namespaces: [],
    licenseInfo: getLicenseInfo(context),
    metadata: {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      apiVersion:
        context.apiVersion === "all" && versions.size === 1
          ? "all"
          : versions.size === 1
            ? [...versions.values()][0].at(-1)
            : undefined,
      apiVersions: apiVersionsMap,
    },
  };
  organizeNamespaces(context, sdkPackage);

  // Compute cross-language version hash from source files
  sdkPackage.crossLanguageVersion = await computeCrossLanguageVersion(context);

  return diagnostics.wrap(sdkPackage);
}

function organizeNamespaces<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  sdkPackage: SdkPackage<TServiceOperation>,
) {
  const namespaceDecoratorSources = new Map<SdkNamespace<TServiceOperation>, Set<Namespace>>();
  const clients = [...sdkPackage.clients];
  let clientIdx = 0;
  while (clientIdx < clients.length) {
    const client = clients[clientIdx++];
    getSdkNamespace(context, sdkPackage, client, namespaceDecoratorSources).clients.push(client);
    if (client.children && client.children.length > 0) {
      clients.push(...client.children);
    }
  }
  for (const model of sdkPackage.models) {
    getSdkNamespace(context, sdkPackage, model, namespaceDecoratorSources).models.push(model);
  }
  for (const enumType of sdkPackage.enums) {
    getSdkNamespace(context, sdkPackage, enumType, namespaceDecoratorSources).enums.push(enumType);
  }
  for (const unionType of sdkPackage.unions) {
    getSdkNamespace(context, sdkPackage, unionType, namespaceDecoratorSources).unions.push(
      unionType,
    );
  }
  preserveDynamicModelScope(context, sdkPackage, namespaceDecoratorSources);
}

function getSdkNamespace<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  sdkPackage: SdkPackage<TServiceOperation>,
  type: SdkType | SdkClientType<TServiceOperation>,
  namespaceDecoratorSources: Map<SdkNamespace<TServiceOperation>, Set<Namespace>>,
) {
  if (!("namespace" in type)) {
    return sdkPackage;
  }

  const namespace = type.namespace;
  const sourceNamespace = getNamespaceFromType(type.__raw);
  const segments = namespace.split(".");
  let current: SdkPackage<TServiceOperation> | SdkNamespace<TServiceOperation> = sdkPackage;
  let fullName = "";
  const sdkNamespaces: SdkNamespace<TServiceOperation>[] = [];
  for (const segment of segments) {
    fullName = fullName === "" ? segment : `${fullName}.${segment}`;
    const ns: SdkNamespace<TServiceOperation> | undefined = current.namespaces.find(
      (ns) => ns.name === segment,
    );
    if (ns === undefined) {
      let rawNamespace = sourceNamespace;
      while (rawNamespace && getClientNamespace(context, rawNamespace) !== fullName) {
        rawNamespace = rawNamespace.namespace;
      }
      const newNs = {
        __raw: rawNamespace,
        name: segment,
        fullName,
        clients: [],
        models: [],
        enums: [],
        unions: [],
        namespaces: [],
        decorators: [],
      };
      current.namespaces.push(newNs);
      current = newNs;
    } else {
      current = ns;
    }
    sdkNamespaces.push(current as SdkNamespace<TServiceOperation>);
  }

  let rawNamespace = sourceNamespace;
  while (rawNamespace) {
    const mappedNamespace = getClientNamespace(context, rawNamespace);
    const namespaceIndex = sdkNamespaces.findIndex((ns) => ns.fullName === mappedNamespace);
    const targetNamespace =
      sdkNamespaces[namespaceIndex < 0 ? sdkNamespaces.length - 1 : namespaceIndex];
    if (targetNamespace) {
      let sources = namespaceDecoratorSources.get(targetNamespace);
      if (!sources) {
        sources = new Set();
        namespaceDecoratorSources.set(targetNamespace, sources);
      }
      if (!sources.has(rawNamespace)) {
        sources.add(rawNamespace);
        targetNamespace.decorators.push(
          ...ignoreDiagnostics(getTypeDecorators(context, rawNamespace)),
        );
      }
    }
    rawNamespace = rawNamespace.namespace;
  }
  return current;
}

function preserveDynamicModelScope<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  sdkPackage: SdkPackage<TServiceOperation>,
  namespaceDecoratorSources: Map<SdkNamespace<TServiceOperation>, Set<Namespace>>,
) {
  const dynamicModelDecoratorName = "Azure.ClientGenerator.Core.@dynamicModel";
  const getNamespaceModels = (namespace: SdkNamespace<TServiceOperation>): SdkModelType[] => [
    ...namespace.models,
    ...namespace.namespaces.flatMap(getNamespaceModels),
  ];
  const isWithinNamespace = (model: SdkModelType, sourceNamespace: Namespace) => {
    let namespace = getNamespaceFromType(model.__raw);
    while (namespace) {
      if (namespace === sourceNamespace) {
        return true;
      }
      namespace = namespace.namespace;
    }
    return false;
  };
  const sameDecorator = (
    left: SdkModelType["decorators"][number],
    right: SdkModelType["decorators"][number],
  ) =>
    left.name === right.name && JSON.stringify(left.arguments) === JSON.stringify(right.arguments);

  const namespaces = [...sdkPackage.namespaces];
  while (namespaces.length > 0) {
    const namespace = namespaces.pop()!;
    namespaces.push(...namespace.namespaces);
    const sourceDecorators = [...(namespaceDecoratorSources.get(namespace) ?? [])].flatMap(
      (sourceNamespace) =>
        ignoreDiagnostics(getTypeDecorators(context, sourceNamespace))
          .filter((decorator) => decorator.name === dynamicModelDecoratorName)
          .map((decorator) => ({ sourceNamespace, decorator })),
    );
    if (sourceDecorators.length === 0) {
      continue;
    }

    const models = getNamespaceModels(namespace);
    for (const { sourceNamespace, decorator } of sourceDecorators) {
      const applicableModels = models.filter((model) => isWithinNamespace(model, sourceNamespace));
      if (applicableModels.length === models.length || models.length === 0) {
        continue;
      }

      const namespaceDecoratorIndex = namespace.decorators.findIndex((existing) =>
        sameDecorator(existing, decorator),
      );
      if (namespaceDecoratorIndex >= 0) {
        namespace.decorators.splice(namespaceDecoratorIndex, 1);
      }
      for (const model of applicableModels) {
        if (!model.decorators.some((existing) => sameDecorator(existing, decorator))) {
          model.decorators.push(decorator);
        }
      }
    }
  }
}

function populateApiVersionInformation(context: TCGCContext): void {
  if (context.__rawClientsCache === undefined) {
    prepareClientAndOperationCache(context);
  }

  // Get the package versions map once (this handles both single and multi-service scenarios)
  const packageVersions = context.getPackageVersions();

  for (const client of context.__rawClientsCache!.values()) {
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

/**
 * Computes a cross-language version hash from all API-affecting elements in the package.
 * The hash is a SHA256 digest truncated to 12 hex characters.
 *
 * Creates a normalized API snapshot capturing:
 * - Clients, methods, and parameters (with optionality and types)
 * - Models and properties (with optionality and types)
 * - Enums and their values
 * - Unions
 * - HTTP operation details (verb, path, parameter locations)
 */
async function computeCrossLanguageVersion(context: TCGCContext): Promise<string> {
  // Concatenate all source file contents
  const content = [...context.program.sourceFiles.values()]
    .filter((script) => {
      const locationContext = context.program.getSourceFileLocationContext(script.file);
      return locationContext.type === "project";
    })
    .map((script) => script.file.text)
    .join("");

  // Hash the combined content using Web Crypto API (browser-compatible)
  const encoded = new TextEncoder().encode(content);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.substring(0, 12);
}
