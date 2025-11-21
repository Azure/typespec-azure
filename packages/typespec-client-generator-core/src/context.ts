import {
  createDiagnosticCollector,
  EmitContext,
  emitFile,
  Interface,
  listServices,
  Model,
  ModelProperty,
  Namespace,
  Operation,
  Program,
  resolvePath,
  Type,
  Union,
} from "@typespec/compiler";
import { HttpOperation } from "@typespec/http";
import { getVersionDependencies, getVersions } from "@typespec/versioning";
import { stringify } from "yaml";
import { prepareClientAndOperationCache } from "./cache.js";
import { defaultDecoratorsAllowList } from "./configs.js";
import { handleClientExamples } from "./example.js";
import {
  getKnownScalars,
  SdkArrayType,
  SdkClient,
  SdkContext,
  SdkDictionaryType,
  SdkEnumType,
  SdkHttpOperation,
  SdkMethodParameter,
  SdkModelPropertyType,
  SdkModelType,
  SdkNullableType,
  SdkOperationGroup,
  SdkServiceOperation,
  SdkServiceResponseHeader,
  SdkUnionType,
  TCGCContext,
} from "./interfaces.js";
import {
  BrandedSdkEmitterOptionsInterface,
  handleVersioningMutationForGlobalNamespace,
  parseEmitterName,
  removeVersionsLargerThanExplicitlySpecified,
  TCGCEmitterOptions,
  TspLiteralType,
} from "./internal-utils.js";
import { reportDiagnostic } from "./lib.js";
import { createSdkPackage } from "./package.js";

interface CreateTCGCContextOptions {
  mutateNamespace?: boolean; // whether to mutate global namespace for versioning
}

function validateMultiServiceVersionDependencies(context: TCGCContext): boolean {
  const clients = context.getClients();

  // Find the top-level client (root client without parent)
  const topLevelClient = clients.find((client) => !client.parent);

  if (!topLevelClient) {
    // No top-level client found
    return false;
  }

  // Get all sub-clients (clients with parents)
  const subClients = clients.filter((client) => client.parent);

  if (subClients.length === 0) {
    // No sub-services, validation passes
    return true;
  }

  // Get version dependencies for the top-level client
  const versionDependencies = getVersionDependencies(
    context.program,
    topLevelClient.type as Namespace,
  );

  // Check if @useDependency decorator is used properly
  // This would be where you check if the top-level client has @useDependency
  // and if each sub-service has its version specified

  for (const subClient of subClients) {
    // Check if this sub-service has version dependencies specified
    if (!versionDependencies || !versionDependencies.get(subClient.service)) {
      // Sub-service version not specified in @useDependency
      return false;
    }
  }

  return true;
}

export function createTCGCContext(
  program: Program,
  emitterName?: string,
  options?: CreateTCGCContextOptions,
): TCGCContext {
  const diagnostics = createDiagnosticCollector();
  return {
    program,
    diagnostics: diagnostics.diagnostics,
    emitterName: diagnostics.pipe(
      parseEmitterName(program, emitterName ?? program.emitters[0]?.metadata?.name),
    ),

    previewStringRegex: /-preview$/,
    disableUsageAccessPropagationToBase: false,
    generateProtocolMethods: true,
    generateConvenienceMethods: true,
    __referencedTypeCache: new Map<
      Type,
      SdkModelType | SdkEnumType | SdkUnionType | SdkNullableType
    >(),
    __arrayDictionaryCache: new Map<Type, SdkDictionaryType | SdkArrayType>(),
    __methodParameterCache: new Map<ModelProperty, SdkMethodParameter>(),
    __modelPropertyCache: new Map<ModelProperty, SdkModelPropertyType>(),
    __responseHeaderCache: new Map<ModelProperty, SdkServiceResponseHeader>(),
    __generatedNames: new Map<Union | Model | TspLiteralType, string>(),
    __httpOperationCache: new Map<Operation, HttpOperation>(),
    __clientParametersCache: new Map(),
    __tspTypeToApiVersions: new Map(),
    __clientApiVersionDefaultValueCache: new Map(),
    __knownScalars: getKnownScalars(),
    __httpOperationExamples: new Map(),
    __pagedResultSet: new Set(),

    getMutatedGlobalNamespace(): Namespace {
      if (options?.mutateNamespace === false) {
        // If we are not mutating the global namespace, return the original global namespace type.
        return program.getGlobalNamespaceType();
      }
      let globalNamespace = this.__mutatedGlobalNamespace;
      if (!globalNamespace) {
        globalNamespace = handleVersioningMutationForGlobalNamespace(this);
        this.__mutatedGlobalNamespace = globalNamespace;
      }
      return globalNamespace;
    },
    getApiVersionsForType(type): string[] {
      const cachedVersions = this.__tspTypeToApiVersions.get(type);
      if (cachedVersions && cachedVersions.length > 0) {
        return cachedVersions;
      }

      // Check if this is a multi-service client with @useDependency
      if (type.kind === "Namespace") {
        const services = listServices(this.program);
        if (services.length > 1) {
          const versionDependencies = getVersionDependencies(this.program, type);
          if (versionDependencies && versionDependencies.size > 0) {
            const allVersions: string[] = [];
            for (const [_service, versions] of versionDependencies.entries()) {
              // The versions might be enum members, so we need to extract the value
              if (Array.isArray(versions)) {
                for (const version of versions) {
                  if (typeof version === "string") {
                    allVersions.push(version);
                  } else if (version && typeof version === "object" && "value" in version) {
                    // Handle enum member case
                    allVersions.push(String(version.value));
                  } else if (version && typeof version === "object" && "name" in version) {
                    // Handle enum member case with name
                    allVersions.push(String(version.name));
                  }
                }
              } else if (typeof versions === "string") {
                allVersions.push(versions);
              } else if (versions && typeof versions === "object" && "value" in versions) {
                // Handle single enum member case
                allVersions.push(String(versions.value));
              } else if (versions && typeof versions === "object" && "name" in versions) {
                // Handle single enum member case with name
                allVersions.push(String(versions.name));
              }
            }
            // Cache and return the version dependencies
            if (allVersions.length > 0) {
              this.__tspTypeToApiVersions.set(type, allVersions);
              return allVersions;
            }
          }
        }
      }

      // Fall back to normal versioning logic for single service types
      const [_namespace, versionMap] = getVersions(this.program, type);
      if (versionMap) {
        const versions = versionMap.getVersions().map((v) => v.value);
        this.__tspTypeToApiVersions.set(type, versions);
        return versions;
      }

      return this.__tspTypeToApiVersions.get(type) ?? [];
    },
    setApiVersionsForType(type, apiVersions: string[]): void {
      const existingApiVersions = this.__tspTypeToApiVersions.get(type) ?? [];
      const mergedApiVersions = [...existingApiVersions];
      for (const apiVersion of apiVersions) {
        if (!mergedApiVersions.includes(apiVersion)) {
          mergedApiVersions.push(apiVersion);
        }
      }
      this.__tspTypeToApiVersions.set(type, mergedApiVersions);
    },
    getApiVersions(service?: Namespace): string[] {
      if (!this.__serviceToVersions) {
        this.__serviceToVersions = new Map<Namespace | undefined, string[]>();
      }

      // If no service specified, try to get from undefined key (global) or the first service
      if (!service) {
        // Check if we have global versions cached (undefined key)
        const globalVersions = this.__serviceToVersions.get(undefined);
        if (globalVersions?.length) {
          return globalVersions;
        }
        const services = listServices(this.program);
        if (services.length === 0) {
          return [];
        }
        if (services.length === 1) {
          service = services[0].type;
        } else {
          const clients = this.getClients();
          if (clients.length !== 0) {
            // In this case, there needs to be one top-level client with a service, and that is decorated with `@useDependency`
            if (!validateMultiServiceVersionDependencies(this)) {
              reportDiagnostic(this.program, {
                code: "multiple-services-require-use-dependency",
                format: { services: services.map((s) => s.type.name).join(", ") },
                target: services[0].type,
              });
            }
            // Process all services and cache their versions
            for (const svc of services) {
              const svcNamespace = svc.type;
              // Check if already cached
              if (!this.__serviceToVersions.has(svcNamespace)) {
                const versions = getVersions(program, svcNamespace)[1]?.getVersions();
                if (versions) {
                  removeVersionsLargerThanExplicitlySpecified(this, versions);
                  const serviceVersions = versions.map((version) => version.value);
                  this.__serviceToVersions.set(svcNamespace, serviceVersions);
                  // Also cache in __tspTypeToApiVersions so getApiVersionsForType can find it
                  this.__tspTypeToApiVersions.set(svcNamespace, serviceVersions);
                }
              }
            }

            // Get version dependencies from the top-level client and extract all version strings
            const versionDependencies = getVersionDependencies(
              this.program,
              clients[0].type as Namespace,
            );
            if (versionDependencies) {
              const allVersions: string[] = [];
              for (const versions of versionDependencies.values()) {
                if (Array.isArray(versions)) {
                  allVersions.push(...versions);
                } else if (typeof versions === "string") {
                  allVersions.push(versions);
                }
              }
              this.__serviceToVersions.set(undefined, allVersions);

              return allVersions;
            }
            return [];
          }
        }
        // Try to get from the first service
        const firstService = listServices(program)[0]?.type;
        if (firstService) {
          service = firstService;
        } else {
          return [];
        }
      }

      // Check cache for this specific service
      const cachedVersions = this.__serviceToVersions.get(service);
      if (cachedVersions?.length) {
        return cachedVersions;
      }

      const versions = getVersions(program, service)[1]?.getVersions();
      if (!versions) {
        return [];
      }

      removeVersionsLargerThanExplicitlySpecified(this, versions);

      const serviceVersions = versions.map((version) => version.value);
      this.__serviceToVersions.set(service, serviceVersions);

      // Also cache as global versions if we don't have any global versions yet
      if (!this.__serviceToVersions.has(undefined)) {
        this.__serviceToVersions.set(undefined, serviceVersions);
      }

      if (
        this.apiVersion !== undefined &&
        this.apiVersion !== "latest" &&
        this.apiVersion !== "all" &&
        !serviceVersions.includes(this.apiVersion)
      ) {
        reportDiagnostic(this.program, {
          code: "api-version-undefined",
          format: { version: this.apiVersion },
          target: service,
        });
        this.apiVersion = serviceVersions[serviceVersions.length - 1];
      }
      return serviceVersions;
    },
    getClients(): SdkClient[] {
      if (!this.__rawClientsOperationGroupsCache) {
        prepareClientAndOperationCache(this);
      }
      return Array.from(this.__rawClientsOperationGroupsCache!.values()).filter(
        (item) => item.kind === "SdkClient",
      );
    },
    getClientOrOperationGroup(
      type: Namespace | Interface,
    ): SdkClient | SdkOperationGroup | undefined {
      if (!this.__rawClientsOperationGroupsCache) {
        prepareClientAndOperationCache(this);
      }
      return this.__rawClientsOperationGroupsCache!.get(type);
    },
    getOperationsForClient(client: SdkClient | SdkOperationGroup): Operation[] {
      if (!this.__clientToOperationsCache) {
        prepareClientAndOperationCache(this);
      }
      return this.__clientToOperationsCache!.get(client)!;
    },
    getClientForOperation(operation: Operation): SdkClient | SdkOperationGroup {
      if (!this.__operationToClientCache) {
        prepareClientAndOperationCache(this);
      }
      return this.__operationToClientCache!.get(operation)!;
    },
  };
}

interface VersioningStrategy {
  readonly previewStringRegex?: RegExp; // regex to match preview versions
}

export interface CreateSdkContextOptions {
  readonly versioning?: VersioningStrategy;
  additionalDecorators?: string[];
  disableUsageAccessPropagationToBase?: boolean; // this flag is for some languages that has no need to generate base model, but generate model with composition
  exportTCGCoutput?: boolean; // this flag is for emitter to export TCGC output as yaml file
  flattenUnionAsEnum?: boolean; // this flag is for emitter to decide whether tcgc should flatten union as enum
  enableLegacyHierarchyBuilding?: boolean; // this flag is for emitter to decide whether tcgc should respect the `@hierarchyBuilding` decorator
}

export async function createSdkContext<
  TOptions extends Record<string, any> = BrandedSdkEmitterOptionsInterface,
  TServiceOperation extends SdkServiceOperation = SdkHttpOperation,
>(
  context: EmitContext<TOptions>,
  emitterName?: string,
  options?: CreateSdkContextOptions,
): Promise<SdkContext<TOptions, TServiceOperation>> {
  const diagnostics = createDiagnosticCollector();
  const tcgcContext = createTCGCContext(
    context.program,
    emitterName ?? context.options["emitter-name"],
  );
  const generateProtocolMethods =
    context.options["generate-protocol-methods"] ?? tcgcContext.generateProtocolMethods;
  const generateConvenienceMethods =
    context.options["generate-convenience-methods"] ?? tcgcContext.generateConvenienceMethods;
  const sdkContext: SdkContext<TOptions, TServiceOperation> = {
    ...tcgcContext,
    emitContext: context,
    sdkPackage: undefined!,
    generateProtocolMethods: generateProtocolMethods,
    generateConvenienceMethods: generateConvenienceMethods,
    examplesDir: context.options["examples-dir"],
    namespaceFlag: context.options["namespace"],
    apiVersion: context.options["api-version"],
    license: context.options["license"],
    decoratorsAllowList: [...defaultDecoratorsAllowList, ...(options?.additionalDecorators ?? [])],
    previewStringRegex: options?.versioning?.previewStringRegex || tcgcContext.previewStringRegex,
    disableUsageAccessPropagationToBase: options?.disableUsageAccessPropagationToBase ?? false,
    flattenUnionAsEnum: options?.flattenUnionAsEnum ?? true,
    enableLegacyHierarchyBuilding: options?.enableLegacyHierarchyBuilding ?? true,
  };
  sdkContext.sdkPackage = diagnostics.pipe(createSdkPackage(sdkContext));
  for (const client of sdkContext.sdkPackage.clients) {
    diagnostics.pipe(await handleClientExamples(sdkContext, client));
  }
  sdkContext.diagnostics = sdkContext.diagnostics.concat(diagnostics.diagnostics);

  if (options?.exportTCGCoutput) {
    await exportTCGCOutput(sdkContext);
  }
  return sdkContext;
}

async function exportTCGCOutput(context: SdkContext) {
  await emitFile(context.program, {
    path: resolvePath(context.emitContext.emitterOutputDir, "tcgc-output.yaml"),
    content: stringify(
      context.sdkPackage,
      (k, v) => {
        if (typeof k === "string" && k.startsWith("__")) {
          return undefined; // skip keys starting with "__" from the output
        }
        if (k === "scheme") {
          const { model, ...rest } = v;
          return rest; // remove credential schema's model property
        }
        if (k === "rawExample") {
          return undefined; // remove raw example
        }
        return v;
      },
      { lineWidth: 0 },
    ),
  });
}

export async function $onEmit(context: EmitContext<TCGCEmitterOptions>) {
  if (!context.program.compilerOptions.noEmit) {
    const sdkContext = await createSdkContext(context, undefined, { exportTCGCoutput: true });
    context.program.reportDiagnostics(sdkContext.diagnostics);
  }
}
