import {
  Extractor,
  ExtractorConfig,
  ExtractorLogLevel,
  IExtractorConfigPrepareOptions,
} from "@microsoft/api-extractor";
import { existsSync } from "fs";
import * as fs from "fs/promises";
import { createRequire } from "module";
import { dirname, join as joinPath } from "path";
import { CompilerOptions, createProgram } from "typescript";
import { fileURLToPath } from "url";
import { createTaskLogger } from "./logger.js";
import { runCommand } from "./run-command.js";

// Resolve the TypeSpec compiler CLI entry (cmd/tsp.js) once per process and invoke it
// directly with `node`. Spawning `npx tsp` re-resolves the package on every call, which
// adds ~5s of pure boot overhead per spec; `node <entry>` keeps the same subprocess
// isolation (one fresh process per compile) without that tax.
let cachedTspCliPath: string | undefined;
function resolveTspCliPath(): string {
  if (cachedTspCliPath) {
    return cachedTspCliPath;
  }
  const require = createRequire(import.meta.url);
  let dir = dirname(require.resolve("@typespec/compiler"));
  for (let i = 0; i < 8; i++) {
    const candidate = joinPath(dir, "cmd", "tsp.js");
    if (existsSync(candidate)) {
      cachedTspCliPath = candidate;
      return candidate;
    }
    dir = dirname(dir);
  }
  throw new Error("Could not resolve @typespec/compiler CLI entry (cmd/tsp.js)");
}

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

// Which generation steps to run for a spec.
// - "client": emit the client sources the integration tests import (steps the test
//   suite needs: emitClient + gitignore + test tsconfig).
// - "declarations": emit the public-surface baseline (tsc .d.ts + api-extractor rollup
//   into src/index.d.ts). Only `check:tree` consumes these, so they can run off the
//   test critical path.
// - "all": run everything (used by regen-test-baselines and any single-pass caller).
export type GenPhase = "client" | "declarations" | "all";

interface GenEnv {
  readonly logger: () => any;
  readonly phase: () => GenPhase;
  readonly sourceTypespec: () => any;
  readonly targetFolder: () => any;
  readonly scriptDir: () => string;
  readonly declarationSubpath: () => string;
}

function genEnv(config: any, phase: GenPhase): GenEnv {
  const { inputPath: sourceTypespec, outputPath: targetFolder } = config;

  const __filename = fileURLToPath(import.meta.url);
  const testRoot = dirname(__filename);

  const logger = createTaskLogger();

  const declarationDir = "types";

  return {
    logger: () => logger,
    phase: () => phase,
    sourceTypespec: () => sourceTypespec,
    targetFolder: () => targetFolder,
    scriptDir: () => testRoot,
    declarationSubpath: () => declarationDir,
  } as const;
}

export async function runTypespec(config: any, phase: GenPhase = "all") {
  const env = genEnv(config, phase);
  await runTypespecHelper(env);
}

async function runTypespecHelper(env: GenEnv): Promise<void> {
  await (async () => {
    let error;
    const logger = env.logger();
    const phase = env.phase();
    const runClient = phase === "client" || phase === "all";
    const runDeclarations = phase === "declarations" || phase === "all";
    logger.log(`=== Start ${env.targetFolder()} (${phase}) ===`);
    try {
      if (runClient) {
        await emitClient();
        logger.log("=== Emitting gitignore ===");
        await emitGitignore();
        logger.log("=== Emitting test tsconfig ===");
        await emitTestTsconfig();
      }
      if (runDeclarations) {
        logger.log("=== Emitting declaration files ===");
        await emitDeclarationFiles();
        logger.log("=== Emitting API summary ===");
        await emitDeclarationRollup();
      }
      logger.log(`=== End ${env.targetFolder()} ===`);
    } catch (e: any) {
      logger.error(e.toString());
      error = e;
    } finally {
      logger.flush();
    }
    if (error) {
      throw error;
    }
  })();

  async function emitClient() {
    const logger = env.logger();

    const workingDir = outputPath();
    const commandArguments = [
      resolveTspCliPath(),
      "compile",
      `${await entryPath()}`,
      "--config tspconfig.yaml ",
    ];

    await runCommand("node", commandArguments, workingDir, logger);
  }

  async function emitGitignore(): Promise<void> {
    const gitignorePath = joinPath(outputPath(), "./.gitignore");
    await fs.writeFile(
      gitignorePath,
      `/**
!/src
/src/**
!/src/index.d.ts
!/.gitignore
!/tspconfig.yaml
`,
    );
  }

  async function emitTestTsconfig(): Promise<void> {
    // The emitter produces a monorepo-style tsconfig.json (project references into
    // ./config/*.json that `extends` the azure-sdk-for-js repo's shared eng/tsconfigs).
    // Those base configs don't exist in this repo, so vite/oxc can't load the config
    // chain when it transforms the generated sources during integration tests. Overwrite
    // the package tsconfig with a self-contained one so each generated package is
    // transformable here. tsconfig.json is not part of the committed baseline, so this
    // only affects local/CI test runs.
    const tsconfigPath = joinPath(outputPath(), "tsconfig.json");
    const tsconfig = {
      compilerOptions: {
        target: "es2022",
        module: "esnext",
        moduleResolution: "bundler",
        verbatimModuleSyntax: false,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
      include: ["src/**/*.ts"],
    };
    await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2) + "\n");
  }

  async function emitDeclarationFiles(): Promise<void> {
    const logger = env.logger();
    const program = createProgram({
      options: tsconfig().compilerOptions,
      rootNames: [joinPath(outputPath(), "src/index.ts")],
    });

    // side effect: loads source files into memory
    // nothing will be emitted if this is omitted
    program.getSourceFiles();

    const { diagnostics } = program.emit();

    if (diagnostics.length) {
      logger.log(`Compiler diagnostics for ${outputPath()}`);
      diagnostics.forEach((diagnostic) => logger.log(diagnostic.messageText));
    }
  }

  async function emitDeclarationRollup(): Promise<void> {
    const logger = env.logger();
    Extractor.invoke(extractorConfig(), {
      localBuild: true,
      messageCallback: (message) => {
        switch (message.logLevel) {
          case ExtractorLogLevel.None:
            break;
          default:
            logger.log(message.formatMessageWithLocation(outputPath()));
        }
        message.handled = true;
      },
    });
  }

  function extractorConfig(): ExtractorConfig {
    const projectFolder = outputPath();
    const mainEntryPointFilePath = joinPath(
      "<projectFolder>",
      env.declarationSubpath(),
      "src/index.d.ts",
    );
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
        overrideTsconfig: tsconfig(),
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

  function tsconfig(): Record<"compilerOptions", CompilerOptions> {
    return {
      compilerOptions: {
        declaration: true,
        emitDeclarationOnly: true,
        declarationMap: true,
        removeComments: true,
        declarationDir: joinPath(outputPath(), env.declarationSubpath()),
        rootDir: outputPath(),
      },
    };
  }

  async function entryPath(): Promise<string> {
    const specPath = joinPath(emitterRoot(), "./temp/specs", env.sourceTypespec());
    const possibleEntryPaths = ["client.tsp", "main.tsp"].map((filename) =>
      joinPath(specPath, filename),
    );
    const entryPath =
      (await findAsync(possibleEntryPaths, entryFileExists)) ??
      // if find fails, specPath should point to the entry file itself
      specPath;

    return entryPath;

    async function entryFileExists(entryFilePath: string): Promise<boolean> {
      const fileExists = await exists(entryFilePath);
      if (fileExists) {
        env.logger().log(`Existing the entry file: ${entryFilePath}`);
      }
      return fileExists;
    }
  }

  function outputPath() {
    const outputPath = joinPath(
      testRoot(),
      "azure-modular-integration",
      "generated",
      env.targetFolder(),
    );

    return outputPath;
  }

  function testRoot() {
    return joinPath(env.scriptDir(), "..");
  }

  function emitterRoot() {
    return joinPath(testRoot(), "..");
  }
}

async function exists(filePath: any) {
  try {
    await fs.access(filePath);
    return true;
  } catch (err) {
    return false;
  }
}

async function findAsync<T>(
  array: T[],
  predicate: (x: T) => Promise<boolean>,
): Promise<T | undefined> {
  for (const x of array) {
    if (await predicate(x)) {
      return x;
    }
  }
  return;
}
