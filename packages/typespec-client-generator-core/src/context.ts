import {
  createDiagnosticCollector,
  EmitContext,
  emitFile,
  ModelProperty,
  Namespace,
  Operation,
  Program,
  resolvePath,
  Type,
} from "@typespec/compiler";
import { HttpOperation } from "@typespec/http";
import { stringify } from "yaml";
import { defaultDecoratorsAllowList } from "./configs.js";
import { handleClientExamples } from "./example.js";
import {
  SdkContext,
  SdkEmitterOptions,
  SdkEnumType,
  SdkHttpOperation,
  SdkModelPropertyType,
  SdkModelType,
  SdkNullableType,
  SdkServiceOperation,
  SdkUnionType,
  TCGCContext,
} from "./interfaces.js";
import { handleVersioningMutationForGlobalNamespace, parseEmitterName } from "./internal-utils.js";
import { getSdkPackage } from "./package.js";

export function createTCGCContext(program: Program, emitterName?: string): TCGCContext {
  const diagnostics = createDiagnosticCollector();
  return {
    program,
    emitterName: diagnostics.pipe(
      parseEmitterName(program, emitterName ?? program.emitters[0]?.metadata?.name),
    ),
    getMutatedGlobalNamespace(): Namespace {
      let globalNamespace = this.__mutatedGlobalNamespace;
      if (!globalNamespace) {
        globalNamespace = handleVersioningMutationForGlobalNamespace(this);
        this.__mutatedGlobalNamespace = globalNamespace;
      }
      return globalNamespace;
    },
    diagnostics: diagnostics.diagnostics,
    __originalProgram: program,
    __clientToParameters: new Map(),
    __tspTypeToApiVersions: new Map(),
    __clientToApiVersionClientDefaultValue: new Map(),
    previewStringRegex: /-preview$/,
    disableUsageAccessPropagationToBase: false,
    __pagedResultSet: new Set(),
    __referencedTypeCache: new Map<
      Type,
      SdkModelType | SdkEnumType | SdkUnionType | SdkNullableType
    >(),
    __httpOperationCache: new Map<Operation, HttpOperation>(),
    __modelPropertyCache: new Map<ModelProperty, SdkModelPropertyType>(),
  };
}

interface VersioningStrategy {
  readonly strategy?: "ignore";
  readonly previewStringRegex?: RegExp; // regex to match preview versions
}

export interface CreateSdkContextOptions {
  readonly versioning?: VersioningStrategy;
  additionalDecorators?: string[];
  disableUsageAccessPropagationToBase?: boolean; // this flag is for some languages that has no need to generate base model, but generate model with composition
  exportTCGCoutput?: boolean; // this flag is for emitter to export TCGC output as yaml file
}

export async function createSdkContext<
  TOptions extends Record<string, any> = SdkEmitterOptions,
  TServiceOperation extends SdkServiceOperation = SdkHttpOperation,
>(
  context: EmitContext<TOptions>,
  emitterName?: string,
  options?: CreateSdkContextOptions,
): Promise<SdkContext<TOptions, TServiceOperation>> {
  const diagnostics = createDiagnosticCollector();
  const protocolOptions = true; // context.program.getLibraryOptions("generate-protocol-methods");
  const convenienceOptions = true; // context.program.getLibraryOptions("generate-convenience-methods");
  const generateProtocolMethods = context.options["generate-protocol-methods"] ?? protocolOptions;
  const generateConvenienceMethods =
    context.options["generate-convenience-methods"] ?? convenienceOptions;
  const tcgcContext = createTCGCContext(
    context.program,
    emitterName ?? context.options["emitter-name"],
  );
  const sdkContext: SdkContext<TOptions, TServiceOperation> = {
    ...tcgcContext,
    emitContext: context,
    sdkPackage: undefined!,
    generateProtocolMethods: generateProtocolMethods,
    generateConvenienceMethods: generateConvenienceMethods,
    packageName: context.options["package-name"],
    flattenUnionAsEnum: context.options["flatten-union-as-enum"] ?? true,
    apiVersion: options?.versioning?.strategy === "ignore" ? "all" : context.options["api-version"],
    examplesDir: context.options["examples-dir"] ?? context.options["examples-directory"],
    decoratorsAllowList: [...defaultDecoratorsAllowList, ...(options?.additionalDecorators ?? [])],
    previewStringRegex: options?.versioning?.previewStringRegex || tcgcContext.previewStringRegex,
    disableUsageAccessPropagationToBase: options?.disableUsageAccessPropagationToBase ?? false,
  };
  sdkContext.sdkPackage = diagnostics.pipe(getSdkPackage(sdkContext));
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
          return undefined; // remove credential schema
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

export async function $onEmit(context: EmitContext<SdkEmitterOptions>) {
  if (!context.program.compilerOptions.noEmit) {
    const sdkContext = await createSdkContext(context);
    await exportTCGCOutput(sdkContext);
  }
}
