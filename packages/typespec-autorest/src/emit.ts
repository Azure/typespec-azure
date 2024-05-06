import { SdkContext, createSdkContext } from "@azure-tools/typespec-client-generator-core";
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
  const resolvedOptions = { ...defaultOptions, ...context.options };
  const armTypesDir = interpolatePath(
    resolvedOptions["arm-types-dir"] ?? "{project-root}/../../common-types/resource-management",
    {
      "project-root": context.program.projectRoot,
      "emitter-output-dir": context.emitterOutputDir,
    }
  );
  const options: ResolvedAutorestEmitterOptions = {
    outputFile: resolvedOptions["output-file"],
    outputDir: context.emitterOutputDir,
    azureResourceProviderFolder: resolvedOptions["azure-resource-provider-folder"],
    examplesDirectory: resolvedOptions["examples-directory"],
    version: resolvedOptions["version"],
    newLine: resolvedOptions["new-line"],
    omitUnreachableTypes: resolvedOptions["omit-unreachable-types"],
    includeXTypeSpecName: resolvedOptions["include-x-typespec-name"],
    armTypesDir,
    useReadOnlyStatusSchema: resolvedOptions["use-read-only-status-schema"],
  };
  const tracer = getTracer(context.program);
  tracer.trace("options", JSON.stringify(options, null, 2));

  const tcgcSdkContext = createSdkContext(context, "@azure-tools/typespec-autorest", { versionStrategy: "ignore" });

  await emitAllServiceAtAllVersions(context.program, tcgcSdkContext, options);
}

export async function emitAllServiceAtAllVersions(
  program: Program,
  tcgcSdkContext: SdkContext,
  options: ResolvedAutorestEmitterOptions
) {
  const services = listServices(program);
  if (services.length === 0) {
    services.push({ type: program.getGlobalNamespaceType() });
  }

  for (const service of services) {
    const originalProgram = program;
    const versions = buildVersionProjections(program, service.type).filter(
      (v) => !options.version || options.version === v.version
    );
    for (const record of versions) {
      let projectedProgram;
      if (record.projections.length > 0) {
        projectedProgram = program = projectProgram(originalProgram, record.projections);
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
      if (!program.compilerOptions.noEmit && !program.hasError()) {
        // Sort the document
        const sortedDocument = sortOpenAPIDocument(result.document);

        // Write out the OpenAPI document to the output path
        await emitFile(program, {
          path: context.outputFile,
          content: prettierOutput(JSON.stringify(sortedDocument, null, 2)),
          newLine: options.newLine,
        });

        // Copy examples to the output directory
        if (options.examplesDirectory && result.operationExamples.length > 0) {
          const examplesPath = resolvePath(getDirectoryPath(context.outputFile), "examples");
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
