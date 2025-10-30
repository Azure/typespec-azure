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
import { getVersions } from "@typespec/versioning";
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
