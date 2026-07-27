/* eslint-disable no-console */
// postCompileDeclarations hook: run once per spec by the shared spector-runner
// engine in the `declarations` phase (SPECTOR_OUTPUT_DIR points at the generated
// folder). Emits the public-surface baseline — tsc `.d.ts` files plus the
// api-extractor rollup into `src/index.d.ts` (the only committed generated file).
// This is a plain `tsc + api-extractor` pass over already-generated sources, so
// it runs off the client/test critical path.
import type { IExtractorConfigPrepareOptions } from "@microsoft/api-extractor";
import { Extractor, ExtractorConfig, ExtractorLogLevel } from "@microsoft/api-extractor";
import { join as joinPath } from "path";
import type { CompilerOptions } from "typescript";
import { createProgram } from "typescript";
import { createTaskLogger } from "./logger.js";

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

const declarationSubpath = "types";

/**
 * Emit the public-surface baseline for a generated package: tsc `.d.ts` files
 * plus the api-extractor rollup into `src/index.d.ts`.
 */
export function emitDeclarations(outputPath: string): void {
  const logger = createTaskLogger();
  logger.log(`=== Start declarations ${outputPath} ===`);
  try {
    logger.log("=== Emitting declaration files ===");
    emitDeclarationFiles(outputPath, logger);
    logger.log("=== Emitting API summary ===");
    emitDeclarationRollup(outputPath, logger);
    logger.log(`=== End declarations ${outputPath} ===`);
  } catch (e: any) {
    logger.error(e.toString());
    logger.flush();
    throw e;
  }
  logger.flush();
}

function emitDeclarationFiles(
  outputPath: string,
  logger: ReturnType<typeof createTaskLogger>,
): void {
  const program = createProgram({
    options: declarationTsconfig(outputPath).compilerOptions,
    rootNames: [joinPath(outputPath, "src/index.ts")],
  });

  // side effect: loads source files into memory
  // nothing will be emitted if this is omitted
  program.getSourceFiles();

  const { diagnostics } = program.emit();

  if (diagnostics.length) {
    logger.log(`Compiler diagnostics for ${outputPath}`);
    diagnostics.forEach((diagnostic) => logger.log(diagnostic.messageText));
  }
}

function emitDeclarationRollup(
  outputPath: string,
  logger: ReturnType<typeof createTaskLogger>,
): void {
  Extractor.invoke(extractorConfig(outputPath), {
    localBuild: true,
    messageCallback: (message) => {
      switch (message.logLevel) {
        case ExtractorLogLevel.None:
          break;
        default:
          logger.log(message.formatMessageWithLocation(outputPath));
      }
      message.handled = true;
    },
  });
}

function extractorConfig(outputPath: string): ExtractorConfig {
  const projectFolder = outputPath;
  const mainEntryPointFilePath = joinPath("<projectFolder>", declarationSubpath, "src/index.d.ts");
  const untrimmedFilePath = joinPath("<projectFolder>", "src/index.d.ts");
  const packageJsonFullPath = joinPath(projectFolder, "package.json");

  const baseConfigObject = {
    apiReport: {
      enabled: false,
    },
    docModel: {
      enabled: true,
    },
    dtsRollup: {
      enabled: true,
      untrimmedFilePath,
    },
    compiler: {
      overrideTsconfig: declarationTsconfig(outputPath),
    },
    mainEntryPointFilePath,
    messages: {
      compilerMessageReporting: {
        default: {
          logLevel: ExtractorLogLevel.None,
        },
      },
      extractorMessageReporting: {
        default: {
          logLevel: ExtractorLogLevel.None,
        },
      },
      tsdocMessageReporting: {
        default: {
          logLevel: ExtractorLogLevel.None,
        },
      },
    },
    newlineKind: "lf",
    projectFolder,
  };

  // Defaults are merged in api-extractor when the config file is read from disk with
  // `ExtractorConfig.loadFile`. This is derived from that method.
  // https://github.com/microsoft/rushstack/blob/1a92f17fa537b55529adbec80203bd99afd8cd24/apps/api-extractor/src/api/ExtractorConfig.ts#L624-L627
  const configObject = deepMerge(
    structuredClone((ExtractorConfig as any)._defaultConfig),
    baseConfigObject,
  );
  ExtractorConfig.jsonSchema.validateObject(configObject, "api extractor config object");

  const config: IExtractorConfigPrepareOptions = {
    configObject,
    packageJsonFullPath,
    configObjectFullPath: null as unknown as undefined,
  };

  return ExtractorConfig.prepare(config);
}

function declarationTsconfig(outputPath: string): Record<"compilerOptions", CompilerOptions> {
  return {
    compilerOptions: {
      declaration: true,
      emitDeclarationOnly: true,
      declarationMap: true,
      removeComments: true,
      declarationDir: joinPath(outputPath, declarationSubpath),
      rootDir: outputPath,
    },
  };
}

const outputPath = process.env.SPECTOR_OUTPUT_DIR;
if (!outputPath) {
  console.error("SPECTOR_OUTPUT_DIR is not set; run this through spector-runner.");
  process.exit(1);
}
emitDeclarations(outputPath);
