import {
  AutorestDocumentEmitterOptions,
  AutorestEmitterContext,
  getOpenAPIForService,
  sortOpenAPIDocument,
} from "@azure-tools/typespec-autorest";
import { isArmCommonType } from "@azure-tools/typespec-azure-resource-manager";
import { SdkContext, createSdkContext } from "@azure-tools/typespec-client-generator-core";
import {
  EmitContext,
  Namespace,
  Program,
  Service,
  Type,
  emitFile,
  getDirectoryPath,
  getNamespaceFullName,
  interpolatePath,
  listServices,
  navigateType,
  resolvePath,
} from "@typespec/compiler";
import {
  getRenamedFrom,
  getReturnTypeChangedFrom,
  getTypeChangedFrom,
  getVersion,
} from "@typespec/versioning";
import { AutorestCanonicalEmitterOptions, reportDiagnostic } from "./lib.js";

const defaultOptions = {
  "output-file": "{azure-resource-provider-folder}/{service-name}/canonical/openapi.json",
  "new-line": "lf",
  "include-x-typespec-name": "never",
} as const;

export const canonicalVersion = "canonical";

interface ResolvedAutorestCanonicalEmitterOptions extends AutorestDocumentEmitterOptions {
  outputFile: string;
  outputDir: string;
  azureResourceProviderFolder?: string;

  /**
   * Set the newline character for emitting files.
   * @default lf
   */
  readonly newLine?: "crlf" | "lf";
}

export async function $onEmit(context: EmitContext<AutorestCanonicalEmitterOptions>) {
  const resolvedOptions = { ...defaultOptions, ...context.options };
  const tcgcSdkContext = createSdkContext(context, "@azure-tools/typespec-autorest-canonical");
  const armTypesDir = interpolatePath(
    resolvedOptions["arm-types-dir"] ?? "{project-root}/../../common-types/resource-management",
    {
      "project-root": context.program.projectRoot,
      "emitter-output-dir": context.emitterOutputDir,
    }
  );
  const options: ResolvedAutorestCanonicalEmitterOptions = {
    outputFile: resolvedOptions["output-file"],
    outputDir: context.emitterOutputDir,
    azureResourceProviderFolder: resolvedOptions["azure-resource-provider-folder"],
    newLine: resolvedOptions["new-line"],
    omitUnreachableTypes: resolvedOptions["omit-unreachable-types"],
    includeXTypeSpecName: resolvedOptions["include-x-typespec-name"],
    armTypesDir,
    useReadOnlyStatusSchema: true,
  };

  await emitAllServices(context.program, tcgcSdkContext, options);
}

async function emitAllServices(
  program: Program,
  tcgcSdkContext: SdkContext<any, any>,
  options: ResolvedAutorestCanonicalEmitterOptions
) {
  const services = listServices(program);
  if (services.length === 0) {
    services.push({ type: program.getGlobalNamespaceType() });
  }

  for (const service of services) {
    validateUnsupportedVersioning(program, service.type);
    const context: AutorestEmitterContext = {
      program,
      outputFile: resolveOutputFile(service, services.length > 1, options),
      service,
      version: canonicalVersion,
      tcgcSdkContext,
    };
    const result = await getOpenAPIForService(context, options);
    const includedVersions = getVersion(program, service.type)
      ?.getVersions()
      ?.map((item) => item.name);
    result.document.info["x-canonical-included-versions"] = includedVersions;
    result.document.info["x-typespec-generated"] = [
      {
        emitter: "@azure-tools/typespec-autorest-canonical",
      },
    ];

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
            for (const [fileName, { file }] of Object.entries(examples)) {
              await emitFile(program, {
                path: resolvePath(examplesPath, fileName),
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

function resolveOutputFile(
  service: Service,
  multipleServices: boolean,
  options: ResolvedAutorestCanonicalEmitterOptions
): string {
  const azureResourceProviderFolder = options.azureResourceProviderFolder;
  const interpolated = interpolatePath(options.outputFile, {
    "azure-resource-provider-folder": azureResourceProviderFolder,
    "service-name":
      multipleServices || azureResourceProviderFolder
        ? getNamespaceFullName(service.type)
        : undefined,
  });

  return resolvePath(options.outputDir, interpolated);
}

function prettierOutput(output: string) {
  return output + "\n";
}

function validateUnsupportedVersioning(program: Program, namespace: Namespace) {
  navigateType(
    namespace,
    {
      operation: (operation) => {
        if (getReturnTypeChangedFrom(program, operation)) {
          reportDisallowedDecorator("returnTypeChangedFrom", operation);
        }
      },
      modelProperty: (prop) => {
        if (isArmCommonType(prop) || (prop.model && isArmCommonType(prop.model))) {
          return;
        }

        if (getRenamedFrom(program, prop)) {
          reportDisallowedDecorator("renamedFrom", prop);
        }

        if (getTypeChangedFrom(program, prop)) {
          reportDisallowedDecorator("typeChangedFrom", prop);
        }
      },
    },
    {}
  );

  function reportDisallowedDecorator(decorator: string, type: Type): void {
    reportDiagnostic(program, {
      code: "unsupported-versioning-decorator",
      format: { decorator },
      target: type,
    });
  }
}
