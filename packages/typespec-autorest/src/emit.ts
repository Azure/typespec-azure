import { createTCGCContext } from "@azure-tools/typespec-client-generator-core";
import {
  compilerAssert,
  EmitContext,
  emitFile,
  getDirectoryPath,
  getNamespaceFullName,
  getService,
  interpolatePath,
  listServices,
  NoTarget,
  Program,
  reportDeprecated,
  resolvePath,
  Service,
} from "@typespec/compiler";
import {
  unsafe_mutateSubgraphWithNamespace,
  unsafe_MutatorWithNamespace,
} from "@typespec/compiler/experimental";
import { resolveInfo } from "@typespec/openapi";
import { getVersioningMutators } from "@typespec/versioning";
import { AutorestEmitterOptions, getTracer, reportDiagnostic } from "./lib.js";
import {
  AutorestDocumentEmitterOptions,
  getOpenAPIForService,
  sortOpenAPIDocument,
} from "./openapi.js";
import type {
  AutorestEmitterResult,
  AutorestServiceRecord,
  AutorestVersionedServiceRecord,
} from "./types.js";
import { AutorestEmitterContext } from "./utils.js";

/**
 * Extended options specific to the emitting of the typespec-autorest emitter
 */
interface ResolvedAutorestEmitterOptions extends AutorestDocumentEmitterOptions {
  readonly azureResourceProviderFolder?: string;

  /**
   * Set the newline character for emitting files.
   * @default lf
   */
  readonly newLine?: "crlf" | "lf";

  readonly outputDir: string;
  readonly outputFile: string;
  readonly version?: string;
}

const defaultOptions = {
  "output-file":
    "{azure-resource-provider-folder}/{service-name}/{version-status}/{version}/openapi.json",
  "new-line": "lf",
  "include-x-typespec-name": "never",
} as const;

export async function $onEmit(context: EmitContext<AutorestEmitterOptions>) {
  const tracer = getTracer(context.program);

  const options = resolveAutorestOptions(
    context.program,
    context.emitterOutputDir,
    context.options,
  );
  tracer.trace("options", JSON.stringify(options, null, 2));

  await emitAllServiceAtAllVersions(context.program, options);
}

export function resolveAutorestOptions(
  program: Program,
  emitterOutputDir: string,
  options: AutorestEmitterOptions,
): ResolvedAutorestEmitterOptions {
  const resolvedOptions = {
    ...defaultOptions,
    ...options,
  };
  const armTypesDir = interpolatePath(
    resolvedOptions["arm-types-dir"] ?? "{project-root}/../../common-types/resource-management",
    {
      "project-root": program.projectRoot,
      "emitter-output-dir": emitterOutputDir,
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  if (resolvedOptions["examples-directory"]) {
    reportDeprecated(
      program,
      `examples-directory option is deprecated use examples-dir instead or remove it if examples are located in {project-root}/examples`,
      NoTarget,
    );
  }

  return {
    outputFile: resolvedOptions["output-file"],
    outputDir: emitterOutputDir,
    azureResourceProviderFolder: resolvedOptions["azure-resource-provider-folder"],
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    examplesDirectory: resolvedOptions["examples-dir"] ?? resolvedOptions["examples-directory"],
    version: resolvedOptions["version"],
    newLine: resolvedOptions["new-line"],
    omitUnreachableTypes: resolvedOptions["omit-unreachable-types"],
    versionEnumStrategy: resolvedOptions["version-enum-strategy"],
    includeXTypeSpecName: resolvedOptions["include-x-typespec-name"],
    armTypesDir,
    useReadOnlyStatusSchema: resolvedOptions["use-read-only-status-schema"],
    emitLroOptions: resolvedOptions["emit-lro-options"],
    armResourceFlattening: resolvedOptions["arm-resource-flattening"],
    emitCommonTypesSchema: resolvedOptions["emit-common-types-schema"],
  };
}

export async function getAllServicesAtAllVersions(
  program: Program,
  options: ResolvedAutorestEmitterOptions,
): Promise<AutorestServiceRecord[]> {
  const tcgcSdkContext = createTCGCContext(program, "@azure-tools/typespec-autorest");

  const services = listServices(program);
  if (services.length === 0) {
    services.push({ type: program.getGlobalNamespaceType() });
  }

  const serviceRecords: AutorestServiceRecord[] = [];
  for (const service of services) {
    const versions = getVersioningMutators(program, service.type);

    if (versions === undefined) {
      const context: AutorestEmitterContext = {
        program,
        outputFile: resolveOutputFile(program, service, services.length > 1, options),
        service: service,
        tcgcSdkContext,
      };

      const result = await getOpenAPIForService(context, options);
      serviceRecords.push({
        service,
        versioned: false,
        ...result,
      });
    } else if (versions.kind === "transient") {
      const context: AutorestEmitterContext = {
        program,
        outputFile: resolveOutputFile(program, service, services.length > 1, options),
        service: service,
        tcgcSdkContext,
      };

      const result = await getVersionSnapshotDocument(context, versions.mutator, options);
      serviceRecords.push({
        service,
        versioned: false,
        ...result,
      });
    } else {
      const filteredVersions = versions.snapshots.filter(
        (v) => !options.version || options.version === v.version?.value,
      );

      if (filteredVersions.length === 0 && options.version) {
        reportDiagnostic(program, { code: "no-matching-version-found", target: service.type });
      }
      const serviceRecord: AutorestVersionedServiceRecord = {
        service,
        versioned: true,
        versions: [],
      };
      serviceRecords.push(serviceRecord);

      for (const record of filteredVersions) {
        const context: AutorestEmitterContext = {
          program,
          outputFile: resolveOutputFile(
            program,
            service,
            services.length > 1,
            options,
            record.version?.value,
          ),
          service,
          version: record.version?.value,
          tcgcSdkContext,
        };

        const result = await getVersionSnapshotDocument(context, record.mutator, options);
        serviceRecord.versions.push({
          ...result,
          service,
          version: record.version!.value,
        });
      }
    }
  }

  return serviceRecords;
}

async function getVersionSnapshotDocument(
  context: AutorestEmitterContext,
  mutator: unsafe_MutatorWithNamespace,
  options: ResolvedAutorestEmitterOptions,
) {
  const subgraph = unsafe_mutateSubgraphWithNamespace(
    context.program,
    [mutator],
    context.service.type,
  );

  compilerAssert(subgraph.type.kind === "Namespace", "Should not have mutated to another type");
  const document = await getOpenAPIForService(
    { ...context, service: getService(context.program, subgraph.type)! },
    options,
  );

  return document;
}

async function emitAllServiceAtAllVersions(
  program: Program,
  options: ResolvedAutorestEmitterOptions,
) {
  const services = await getAllServicesAtAllVersions(program, options);
  if (program.compilerOptions.dryRun || program.hasError()) {
    return;
  }
  for (const serviceRecord of services) {
    if (serviceRecord.versioned) {
      for (const documentRecord of serviceRecord.versions) {
        await emitOutput(program, documentRecord, options);
      }
    } else {
      await emitOutput(program, serviceRecord, options);
    }
  }
}

async function emitOutput(
  program: Program,
  result: AutorestEmitterResult,
  options: ResolvedAutorestEmitterOptions,
) {
  const sortedDocument = sortOpenAPIDocument(result.document);

  // Write out the OpenAPI document to the output path
  await emitFile(program, {
    path: result.outputFile,
    content: prettierOutput(JSON.stringify(sortedDocument, null, 2)),
    newLine: options.newLine,
  });

  // Copy examples to the output directory
  if (result.operationExamples.length > 0) {
    const examplesPath = resolvePath(getDirectoryPath(result.outputFile), "examples");
    await program.host.mkdirp(examplesPath);
    for (const { examples } of result.operationExamples) {
      if (examples) {
        for (const { relativePath, file } of Object.values(examples)) {
          await emitFile(program, {
            path: resolvePath(examplesPath, relativePath),
            content: file.text,
            newLine: options.newLine,
          });
        }
      }
    }
  }
}
function prettierOutput(output: string) {
  return output + "\n";
}

function resolveOutputFile(
  program: Program,
  service: Service,
  multipleServices: boolean,
  options: ResolvedAutorestEmitterOptions,
  version?: string,
): string {
  const azureResourceProviderFolder = options.azureResourceProviderFolder;
  if (azureResourceProviderFolder) {
    const info = resolveInfo(program, service.type);
    version = version ?? info?.version ?? "0000-00-00";
  }
  const interpolated = interpolatePath(options.outputFile, {
    "azure-resource-provider-folder": azureResourceProviderFolder,
    "service-name":
      multipleServices || azureResourceProviderFolder
        ? getNamespaceFullName(service.type)
        : undefined,
    "version-status": azureResourceProviderFolder
      ? version?.includes("preview")
        ? "preview"
        : "stable"
      : undefined,
    version,
  });

  return resolvePath(options.outputDir, interpolated);
}
