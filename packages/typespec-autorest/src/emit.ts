import { createSdkContext } from "@azure-tools/typespec-client-generator-core";
import {
  EmitContext,
  Namespace,
  Program,
  Service,
  emitFile,
  getDirectoryPath,
  getNamespaceFullName,
  getService,
  interpolatePath,
  listServices,
  projectProgram,
  resolvePath,
} from "@typespec/compiler";
import { resolveInfo } from "@typespec/openapi";
import { buildVersionProjections } from "@typespec/versioning";
import { AutorestEmitterOptions, getTracer } from "./lib.js";
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
    context.options
  );
  tracer.trace("options", JSON.stringify(options, null, 2));

  await emitAllServiceAtAllVersions(context.program, options);
}

export function resolveAutorestOptions(
  program: Program,
  emitterOutputDir: string,
  options: AutorestEmitterOptions
): ResolvedAutorestEmitterOptions {
  const resolvedOptions = { ...defaultOptions, ...options };
  const armTypesDir = interpolatePath(
    resolvedOptions["arm-types-dir"] ?? "{project-root}/../../common-types/resource-management",
    {
      "project-root": program.projectRoot,
      "emitter-output-dir": emitterOutputDir,
    }
  );
  return {
    outputFile: resolvedOptions["output-file"],
    outputDir: emitterOutputDir,
    azureResourceProviderFolder: resolvedOptions["azure-resource-provider-folder"],
    examplesDirectory: resolvedOptions["examples-directory"],
    version: resolvedOptions["version"],
    newLine: resolvedOptions["new-line"],
    omitUnreachableTypes: resolvedOptions["omit-unreachable-types"],
    versionEnumStrategy: resolvedOptions["version-enum-strategy"],
    includeXTypeSpecName: resolvedOptions["include-x-typespec-name"],
    armTypesDir,
    useReadOnlyStatusSchema: resolvedOptions["use-read-only-status-schema"],
  };
}

export async function getAllServicesAtAllVersions(
  program: Program,
  options: ResolvedAutorestEmitterOptions
): Promise<AutorestServiceRecord[]> {
  const tcgcSdkContext = createSdkContext(
    { program, options: {} } as any,
    "@azure-tools/typespec-autorest",
    {
      versionStrategy: "ignore",
    }
  );

  const services = listServices(program);
  if (services.length === 0) {
    services.push({ type: program.getGlobalNamespaceType() });
  }

  const serviceRecords: AutorestServiceRecord[] = [];
  for (const service of services) {
    const originalProgram = program;
    const versions = buildVersionProjections(program, service.type).filter(
      (v) => !options.version || options.version === v.version
    );

    if (versions.length === 1 && versions[0].version === undefined) {
      let projectedProgram;
      if (versions[0].projections.length > 0) {
        projectedProgram = program = projectProgram(originalProgram, versions[0].projections);
      }
      const projectedServiceNs: Namespace = projectedProgram
        ? (projectedProgram.projector.projectedTypes.get(service.type) as Namespace)
        : service.type;
      const projectedService =
        projectedServiceNs === program.getGlobalNamespaceType()
          ? { type: program.getGlobalNamespaceType() }
          : getService(program, projectedServiceNs)!;
      const context: AutorestEmitterContext = {
        program,
        outputFile: resolveOutputFile(program, service, services.length > 1, options),
        service: projectedService,
        tcgcSdkContext,
      };

      const result = await getOpenAPIForService(context, options);
      serviceRecords.push({
        service,
        versioned: false,
        ...result,
      });
    } else {
      const serviceRecord: AutorestVersionedServiceRecord = {
        service,
        versioned: true,
        versions: [],
      };
      serviceRecords.push(serviceRecord);

      for (const record of versions) {
        const projectedProgram = (program = projectProgram(originalProgram, record.projections));

        const projectedServiceNs: Namespace = projectedProgram
          ? (projectedProgram.projector.projectedTypes.get(service.type) as Namespace)
          : service.type;
        const projectedService =
          projectedServiceNs === program.getGlobalNamespaceType()
            ? { type: program.getGlobalNamespaceType() }
            : getService(program, projectedServiceNs)!;
        const context: AutorestEmitterContext = {
          program,
          outputFile: resolveOutputFile(
            program,
            projectedService,
            services.length > 1,
            options,
            record.version
          ),
          service: projectedService,
          version: record.version,
          tcgcSdkContext,
        };
        const result = await getOpenAPIForService(context, options);
        serviceRecord.versions.push({
          ...result,
          service: projectedService,
          version: record.version!,
        });
      }
    }
  }

  return serviceRecords;
}

async function emitAllServiceAtAllVersions(
  program: Program,
  options: ResolvedAutorestEmitterOptions
) {
  const services = await getAllServicesAtAllVersions(program, options);
  if (program.compilerOptions.noEmit || program.hasError()) {
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
  options: ResolvedAutorestEmitterOptions
) {
  const sortedDocument = sortOpenAPIDocument(result.document);

  // Write out the OpenAPI document to the output path
  await emitFile(program, {
    path: result.outputFile,
    content: prettierOutput(JSON.stringify(sortedDocument, null, 2)),
    newLine: options.newLine,
  });

  // Copy examples to the output directory
  if (options.examplesDirectory && result.operationExamples.length > 0) {
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
  version?: string
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
