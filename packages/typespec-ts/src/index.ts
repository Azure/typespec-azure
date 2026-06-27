// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import {
  EmitContext,
  Program,
  getBaseFileName,
  getDirectoryPath,
  joinPaths,
  resolvePath,
  type CompilerHost,
} from "@typespec/compiler";
import { provideContext, useContext } from "./context-manager.js";
import { buildRootIndex, buildSubClientIndexFile } from "./modular/build-root-index.js";
import {
  AzureCoreDependencies,
  AzureIdentityDependencies,
  AzurePollingDependencies,
  AzureTestDependencies,
} from "./modular/external-dependencies.js";
import {
  CloudSettingHelpers,
  CreateRecorderHelpers,
  MultipartHelpers,
  PagingHelpers,
  PlatformTypeHelpers,
  PollingHelpers,
  SerializationHelpers,
  SimplePollerHelpers,
  StorageCompatHelpers,
  UrlTemplateHelpers,
  XmlHelpers,
} from "./modular/static-helpers-metadata.js";
import {
  RLCModel,
  RLCOptions,
  buildApiExtractorConfig,
  buildChangelogFile,
  buildEsLintConfig,
  buildLicenseFile,
  buildPackageFile,
  buildReadmeFile,
  buildRecordedClientFile,
  buildSampleEnvFile,
  buildSampleTest,
  buildSnippets,
  buildTestBrowserTsConfig,
  buildTestNodeTsConfig,
  buildTsConfig,
  buildTsLintConfig,
  buildTsSampleConfig,
  buildTsSnippetsConfig,
  buildTsSrcBrowserConfig,
  buildTsSrcCjsConfig,
  buildTsSrcEsmConfig,
  buildTsSrcReactNativeConfig,
  buildVitestConfig,
  buildWarpConfig,
  getClientName,
  hasClientNameChanged,
  hasUnexpectedHelper,
  updatePackageFile,
  updateReadmeFile,
} from "./rlc-common/index.js";
import { emitContentByBuilder } from "./utils/emit-util.js";
import { clearDirectory, emptyDir, pathExists } from "./utils/file-system-utils.js";
import { GenerationDirDetail, SdkContext } from "./utils/interfaces.js";

import {
  SdkClientType,
  SdkServiceOperation,
  createSdkContext,
  listAllServiceNamespaces,
} from "@azure-tools/typespec-client-generator-core";
import { Project } from "ts-morph";
import { provideBinder } from "./framework/hooks/binder.js";
import { useDependencies } from "./framework/hooks/use-dependencies.js";
import { makeClientReaderLayer, runClientContextSync } from "./framework/effect-context.js";
import { provideSdkTypes } from "./framework/hooks/sdk-types.js";
import { loadStaticHelpers } from "./framework/load-static-helpers.js";
import { EmitterOptions } from "./lib.js";
import { buildClassicalClient } from "./modular/build-classical-client.js";
import { buildClassicOperationFiles } from "./modular/build-classical-operation-groups.js";
import { buildClientContext, getClientContextPath } from "./modular/build-client-context.js";
import { transformModularEmitterOptions } from "./modular/build-modular-options.js";
import { buildOperationFiles } from "./modular/build-operations.js";
import { getModuleExports } from "./modular/build-project-files.js";
import { buildRestorePoller } from "./modular/build-restore-poller.js";
import { buildSubpathIndexFile } from "./modular/build-subpath-index.js";
import { emitLoggerFile } from "./modular/emit-logger-file.js";
import { buildApiOptions } from "./modular/emit-models-options.js";
import { emitNonModelResponseTypes, emitTypes } from "./modular/emit-models.js";
import { emitSamples } from "./modular/emit-samples.js";
import { emitTests } from "./modular/emit-tests.js";
import { getClassicalClientName } from "./modular/helpers/naming-helpers.js";
import { ModularEmitterOptions } from "./modular/interfaces.js";
import { packageUsesXmlSerialization } from "./modular/serialization/build-xml-serializer-function.js";
import { transformRLCModel } from "./transform/transform.js";
import { transformRLCOptions } from "./transform/transfrom-rlc-options.js";
import {
  getClientHierarchyMap,
  getModularClientOptions,
  getRLCClients,
} from "./utils/client-utils.js";
import { generateCrossLanguageDefinitionFile } from "./utils/cross-language-def.js";

export * from "./lib.js";

export async function $onEmit(context: EmitContext) {
  if (context.program.compilerOptions.noEmit || context.program.hasError()) {
    return;
  }
  /** Shared status */
  const outputProject = new Project({ useInMemoryFileSystem: true });
  const program: Program = context.program;
  const host: CompilerHost = program.host;
  // Derive the emitter package root from the compiler's resolved emitter entry point.
  // This works correctly in both Node.js and the browser playground VFS.
  const emitterRef = program.emitters.find((e) => e.metadata.name === "@azure-tools/typespec-ts");
  const emitterPackageRoot = emitterRef
    ? resolvePath(getDirectoryPath(emitterRef.main), "../..")
    : undefined;
  const emitterOptions: EmitterOptions = context.options;
  const dpgContext = await createContextWithDefaultOptions(context);

  // Report any diagnostics from TCGC
  if (dpgContext.diagnostics?.length > 0) {
    program.reportDiagnostics(dpgContext.diagnostics);
  }

  // Enrich the dpg context with path detail and common options
  await enrichDpgContext();
  const rlcOptions = dpgContext.rlcOptions ?? {};

  const needUnexpectedHelper: Map<string, boolean> = new Map<string, boolean>();
  const serviceNameToRlcModelsMap: Map<string, RLCModel> = new Map<string, RLCModel>();
  provideContext("rlcMetaTree", new Map());
  provideContext("symbolMap", new Map());
  provideContext("outputProject", outputProject);
  provideContext("emitContext", {
    compilerContext: context,
    tcgcContext: dpgContext,
  });
  const staticHelpers = await loadStaticHelpers(
    outputProject,
    {
      ...SerializationHelpers,
      ...PagingHelpers,
      ...PollingHelpers,
      ...SimplePollerHelpers,
      ...UrlTemplateHelpers,
      ...MultipartHelpers,
      ...PlatformTypeHelpers,
      ...CloudSettingHelpers,
      ...XmlHelpers,
      ...(rlcOptions.generateTest ? CreateRecorderHelpers : {}),
      ...(rlcOptions.enableStorageCompat ? StorageCompatHelpers : {}),
    },
    {
      sourcesDir: dpgContext.generationPathDetail?.modularSourcesDir,
      rootDir: dpgContext.generationPathDetail?.rootDir,
      options: rlcOptions,
      program,
      host,
      packageRoot: emitterPackageRoot,
    },
  );
  const extraDependencies = {
    ...AzurePollingDependencies,
    ...AzureCoreDependencies,
    ...AzureIdentityDependencies,
    ...AzureTestDependencies,
  };
  const binder = provideBinder(outputProject, {
    staticHelpers,
    dependencies: {
      ...extraDependencies,
    },
    useSubpathImports: true,
  });
  provideSdkTypes(dpgContext);

  const rlcCodeModels: RLCModel[] = [];
  let modularEmitterOptions: ModularEmitterOptions;
  // 1. Clear sources folder
  await clearSrcFolder();
  // 2. Generate RLC code model
  // TODO: skip this step in modular once modular generator is sufficiently decoupled
  await buildRLCCodeModels();
  // 3. Clear samples-dev folder if generateSample is true
  await clearSamplesDevFolder();

  // 4. Generate sources
  await generateModularSources();

  // 5. Generate metadata and test files
  function getTypespecTsVersion(context: EmitContext): string | undefined {
    const emitterMetadata = context.program.emitters.find(
      (emitter) => emitter.metadata.name === "@azure-tools/typespec-ts",
    );
    return emitterMetadata?.metadata.version;
  }

  await generateMetadataAndTest(dpgContext);

  async function enrichDpgContext() {
    const generationPathDetail: GenerationDirDetail = await calculateGenerationDir();
    dpgContext.generationPathDetail = generationPathDetail;
    dpgContext.allServiceNamespaces = listAllServiceNamespaces(dpgContext);
    const options: RLCOptions = transformRLCOptions(emitterOptions, dpgContext);
    emitterOptions["generate-sample"] = options.generateSample;
    // clear output folder if needed
    if (options.clearOutputFolder) {
      // Clear output directory while preserving TempTypeSpecFiles
      await clearDirectory(host, context.emitterOutputDir, ["TempTypeSpecFiles"], program);
    }
    const hasTestFolder = await pathExists(
      host,
      joinPaths(dpgContext.generationPathDetail?.metadataDir ?? "", "test"),
    );
    options.generateTest =
      options.generateTest === true ||
      (options.generateTest === undefined && (!hasTestFolder || options.azureArm));
    dpgContext.rlcOptions = options;
  }

  async function calculateGenerationDir(): Promise<GenerationDirDetail> {
    const projectRoot = context.emitterOutputDir ?? "";
    const customizationFolder = joinPaths(projectRoot, "generated");
    const srcGeneratedFolder = joinPaths(projectRoot, "src", "generated");
    // if customization folder exists, use it as sources root
    const finalCustomizationFolder = (await pathExists(host, srcGeneratedFolder))
      ? srcGeneratedFolder
      : customizationFolder;
    const sourcesRoot = (await pathExists(host, finalCustomizationFolder))
      ? finalCustomizationFolder
      : joinPaths(projectRoot, "src");
    return {
      rootDir: projectRoot,
      metadataDir: projectRoot,
      rlcSourcesDir: sourcesRoot,
      modularSourcesDir: sourcesRoot,
    };
  }

  async function clearSrcFolder() {
    await emptyDir(
      host,
      dpgContext.generationPathDetail?.modularSourcesDir ??
        dpgContext.generationPathDetail?.rlcSourcesDir ??
        "",
    );
  }

  async function clearSamplesDevFolder() {
    if (emitterOptions["generate-sample"] === true) {
      const samplesDevPath = joinPaths(
        dpgContext.generationPathDetail?.rootDir ?? "",
        "samples-dev",
      );
      if (await pathExists(host, samplesDevPath)) {
        await emptyDir(host, samplesDevPath);
      }
    }
  }

  async function buildRLCCodeModels() {
    const clients = getRLCClients(dpgContext);
    for (const client of clients) {
      const rlcModels = await transformRLCModel(client, dpgContext);
      rlcCodeModels.push(rlcModels);
      const serviceName = client.services[0]?.name ?? "Unknown";
      serviceNameToRlcModelsMap.set(serviceName, rlcModels);
      needUnexpectedHelper.set(getClientName(rlcModels), hasUnexpectedHelper(rlcModels));
    }
  }

  async function generateModularSources() {
    const modularSourcesRoot = dpgContext.generationPathDetail?.modularSourcesDir ?? "src";
    const project = useContext("outputProject");
    const dependencies = useDependencies();
    const effectReaderLayer = makeClientReaderLayer({ project, dependencies, binder });
    modularEmitterOptions = transformModularEmitterOptions(dpgContext, modularSourcesRoot, {
      casing: "camel",
    });

    emitLoggerFile(modularEmitterOptions, modularSourcesRoot);

    const rootIndexFile = project.createSourceFile(`${modularSourcesRoot}/index.ts`, "", {
      overwrite: true,
    });

    emitTypes(dpgContext, { sourceRoot: modularSourcesRoot });
    emitNonModelResponseTypes(dpgContext, { sourceRoot: modularSourcesRoot });
    buildSubpathIndexFile(modularEmitterOptions, "models", undefined, {
      recursive: true,
    });
    const clientMap = getClientHierarchyMap(dpgContext);
    if (clientMap.length === 0) {
      // If no clients, we still need to build the root index file
      buildRootIndex(dpgContext, modularEmitterOptions, rootIndexFile);
    }
    for (const subClient of clientMap) {
      await renameClientName(subClient[1], modularEmitterOptions);
      buildApiOptions(dpgContext, subClient, modularEmitterOptions);
      buildOperationFiles(dpgContext, subClient, modularEmitterOptions);
      runClientContextSync(
        buildClientContext(dpgContext, subClient, modularEmitterOptions),
        effectReaderLayer
      );
      buildRestorePoller(dpgContext, subClient, modularEmitterOptions);
      if (dpgContext.rlcOptions?.hierarchyClient) {
        buildSubpathIndexFile(modularEmitterOptions, "api", subClient, {
          exportIndex: false,
          recursive: true,
        });
      } else {
        buildSubpathIndexFile(modularEmitterOptions, "api", subClient, {
          recursive: true,
          exportIndex: true,
        });
      }

      buildClassicalClient(dpgContext, subClient, modularEmitterOptions);
      buildClassicOperationFiles(dpgContext, subClient, modularEmitterOptions);
      buildSubpathIndexFile(modularEmitterOptions, "classic", subClient, {
        exportIndex: true,
        interfaceOnly: true,
      });
      const { subfolder } = getModularClientOptions(subClient);
      // Generate index file for clients with subfolders (multi-client scenarios and nested clients)
      if (subfolder) {
        buildSubClientIndexFile(dpgContext, subClient, modularEmitterOptions);
      }
      buildRootIndex(dpgContext, modularEmitterOptions, rootIndexFile, subClient);
    }
    // Enable modular sample generation when explicitly set to true or MPG
    if (emitterOptions["generate-sample"] === true) {
      const samples = emitSamples(dpgContext);
      // Refine the rlc sample generation logic
      // TODO: remember to remove this out when RLC is splitted from Modular
      if (samples.length > 0) {
        dpgContext.rlcOptions!.generateSample = true;
      }
    }

    binder.resolveAllReferences(modularSourcesRoot, dpgContext.generationPathDetail?.rootDir);
    if (program.compilerOptions.noEmit || program.hasError()) {
      return;
    }

    for (const file of project.getSourceFiles()) {
      await emitContentByBuilder(
        program,
        () => ({ content: file.getFullText(), path: file.getFilePath() }),
        modularEmitterOptions as any,
      );
    }
  }

  interface Metadata {
    apiVersions?: Record<string, string>;
    emitterVersion?: string;
    crossLanguageDefinitions?: {
      CrossLanguagePackageId: string;
      CrossLanguageDefinitionId: Record<string, string>;
    };
  }

  function buildMetadataJson() {
    const apiVersions = dpgContext.sdkPackage.metadata.apiVersions;
    const emitterVersion = getTypespecTsVersion(context);
    if (apiVersions === undefined && emitterVersion === undefined) {
      return;
    }
    const content: Metadata = {};
    if (apiVersions !== undefined && apiVersions.size > 0) {
      content.apiVersions = Object.fromEntries(apiVersions);
    }
    if (emitterVersion !== undefined) {
      content.emitterVersion = emitterVersion;
    }
    content.crossLanguageDefinitions = generateCrossLanguageDefinitionFile(dpgContext);
    return {
      path: "metadata.json",
      content: JSON.stringify(content, null, 2),
    };
  }

  async function generateMetadataAndTest(context: SdkContext) {
    const project = useContext("outputProject");
    if (rlcCodeModels.length === 0 || !rlcCodeModels[0]) {
      return;
    }
    const rlcClient: RLCModel = rlcCodeModels[0];
    const option = dpgContext.rlcOptions!;
    // When generateMetadata is explicitly false and the sources are generated
    // into a path ending with "generated" (e.g. src/generated), this package
    // has a manual convenience layer. Skip all metadata/test file generation
    // to avoid unexpected modifications to files like package.json, README.md,
    // warp.config.yml, and snippets.spec.ts. metadata.json is still updated.
    const sourcesDir = dpgContext.generationPathDetail?.modularSourcesDir ?? "";
    const hasManualConvenienceLayer = getBaseFileName(sourcesDir) === "generated";
    // Generate metadata
    const existingPackageFilePath = joinPaths(
      dpgContext.generationPathDetail?.metadataDir ?? "",
      "package.json",
    );
    const hasPackageFile = await pathExists(host, existingPackageFilePath);
    const existingReadmeFilePath = joinPaths(
      dpgContext.generationPathDetail?.metadataDir ?? "",
      "README.md",
    );
    const hasReadmeFile = await pathExists(host, existingReadmeFilePath);
    const existingChangelogFilePath = joinPaths(
      dpgContext.generationPathDetail?.metadataDir ?? "",
      "CHANGELOG.md",
    );
    const hasChangelogFile = await pathExists(host, existingChangelogFilePath);
    const shouldGenerateMetadata = option.generateMetadata === true || !hasPackageFile;
    const existingTestFolderPath = joinPaths(
      dpgContext.generationPathDetail?.metadataDir ?? "",
      "test",
    );
    const hasTestFolder = await pathExists(host, existingTestFolderPath);
    if (option.generateTest === undefined) {
      if (hasTestFolder) {
        option.generateTest = false;
      } else {
        option.generateTest = true;
      }
    }

    //TODO Need consider multi-client cases
    for (const subClient of dpgContext.sdkPackage.clients) {
      rlcClient.libraryName = subClient.name;
    }

    if (shouldGenerateMetadata) {
      const commonBuilders = [
        buildApiExtractorConfig,
        buildReadmeFile,
        buildLicenseFile,
        buildSampleEnvFile,
      ];
      if (option.generateTest) {
        commonBuilders.push((model) => buildVitestConfig(model, "node"));
        commonBuilders.push((model) => buildVitestConfig(model, "browser"));
        commonBuilders.push((model) => buildTestBrowserTsConfig(model));
        commonBuilders.push((model) => buildTestNodeTsConfig(model));
      }
      commonBuilders.push(buildEsLintConfig);
      if (!hasChangelogFile) {
        commonBuilders.push(buildChangelogFile);
      }
      if (
        emitterOptions["generate-test"] === true &&
        emitterOptions["generate-metadata"] === true
      ) {
        await emitTests(dpgContext, host);
      }
      let modularPackageInfo: Record<string, any> = {
        exports: getModuleExports(context, modularEmitterOptions),
      };
      {
        // Build dependencies
        const dependencies: Record<string, string> = {};
        dependencies["@azure/core-util"] = "^1.9.2";
        // Add fast-xml-parser if XML serialization is used
        if (packageUsesXmlSerialization(dpgContext.sdkPackage)) {
          dependencies["fast-xml-parser"] = "^4.5.0";
        }
        modularPackageInfo = {
          ...modularPackageInfo,
          dependencies,
          clientContextPaths: getRelativeContextPaths(context, modularEmitterOptions),
        };
      }
      commonBuilders.push((model) => buildPackageFile(model, modularPackageInfo));
      // Generate warp.config.yml for Azure monorepo ESM packages
      commonBuilders.push((model) => buildWarpConfig(model, modularPackageInfo));
      commonBuilders.push(buildTsConfig);
      commonBuilders.push(buildTsSrcEsmConfig);
      commonBuilders.push(buildTsSrcBrowserConfig);
      if (option.generateReactNativeTarget) {
        commonBuilders.push(buildTsSrcReactNativeConfig);
      }
      commonBuilders.push(buildTsSrcCjsConfig);
      if (option.generateSample) {
        commonBuilders.push(buildTsSampleConfig);
      }
      commonBuilders.push(buildTsLintConfig);

      // TODO: need support snippets generation for multi-client cases. https://github.com/Azure/autorest.typescript/issues/3048
      if (option.generateTest) {
        for (const subClient of dpgContext.sdkPackage.clients) {
          commonBuilders.push((model) => buildSnippets(model, subClient.name));
        }
        commonBuilders.push(buildTsSnippetsConfig);
      }

      // build metadata relevant files
      await emitContentByBuilder(
        program,
        commonBuilders,
        rlcClient,
        dpgContext.generationPathDetail?.metadataDir,
      );

      for (const file of project.getSourceFiles()) {
        await emitContentByBuilder(
          program,
          () => ({ content: file.getFullText(), path: file.getFilePath() }),
          modularEmitterOptions as any,
        );
      }
    } else if (hasPackageFile && !hasManualConvenienceLayer) {
      const updateBuilders = [];

      // update existing package.json file with correct dependencies
      // Additional format-specific dependencies to merge when migrating
      // (e.g. fast-xml-parser when XML serialization is used)
      const additionalDependencies: Record<string, string> = {};
      if (packageUsesXmlSerialization(dpgContext.sdkPackage)) {
        additionalDependencies["fast-xml-parser"] = "^4.5.0";
      }
      const modularPackageInfo = {
        exports: getModuleExports(context, modularEmitterOptions),
        clientContextPaths: getRelativeContextPaths(context, modularEmitterOptions),
        ...(Object.keys(additionalDependencies).length > 0 && {
          dependencies: additionalDependencies,
        }),
      };

      // Always update package.json (adds #platform/* imports) and, for modular
      // packages, exports, clientContextPaths and LRO deps.
      {
        // Read package.json content via host and pass parsed object
        const pkgSourceFile = await host.readFile(existingPackageFilePath);
        let packageInfo: Record<string, any>;
        try {
          packageInfo = JSON.parse(pkgSourceFile.text);
        } catch {
          packageInfo = {};
        }
        updateBuilders.push((model: RLCModel) =>
          updatePackageFile(model, packageInfo, modularPackageInfo),
        );
      }

      // Update warp.config.yml for Azure monorepo packages
      updateBuilders.push((model: RLCModel) => buildWarpConfig(model, modularPackageInfo));

      // If the client name changed, regenerate the README and snippets completely;
      // otherwise update only the API reference link in-place.
      if (hasReadmeFile) {
        const readmeSourceFile = await host.readFile(existingReadmeFilePath);
        const existingReadmeContent = readmeSourceFile.text;
        const clientNameChanged = hasClientNameChanged(rlcClient, existingReadmeContent);
        updateBuilders.push(
          clientNameChanged
            ? buildReadmeFile
            : (model: RLCModel) => updateReadmeFile(model, existingReadmeContent),
        );

        // Regenerate snippets.spec.ts only when the client name changed
        if (clientNameChanged) {
          for (const subClient of dpgContext.sdkPackage.clients) {
            updateBuilders.push((model: RLCModel) =>
              buildSnippets(model, getClassicalClientName(subClient)),
            );
          }
        }
      }

      // update metadata relevant files
      await emitContentByBuilder(
        program,
        updateBuilders,
        rlcClient,
        dpgContext.generationPathDetail?.metadataDir,
      );
    }
    await emitContentByBuilder(
      program,
      buildMetadataJson,
      rlcClient,
      dpgContext.generationPathDetail?.metadataDir,
    );

    // Generate test relevant files
    if (option.generateTest && !hasTestFolder) {
      await emitContentByBuilder(
        program,
        [buildRecordedClientFile, buildSampleTest],
        rlcClient,
        dpgContext.generationPathDetail?.metadataDir,
      );
    }
  }

  function getRelativeContextPaths(context: SdkContext, options: ModularEmitterOptions) {
    const clientMap = getClientHierarchyMap(context);
    return Array.from(clientMap)
      .map((subClient) => getClientContextPath(subClient, options))
      .map((path) => path.substring(path.indexOf("src")));
  }
}

export async function createContextWithDefaultOptions(
  context: EmitContext<Record<string, any>>,
): Promise<SdkContext> {
  const flattenUnionAsEnum =
    context.options["experimental-extensible-enums"] === undefined
      ? isArm(context)
      : context.options["experimental-extensible-enums"];
  const tcgcSettings = {
    "generate-protocol-methods": true,
    "generate-convenience-methods": true,
    emitters: [
      {
        main: "@azure-tools/typespec-ts",
        metadata: { name: "@azure-tools/typespec-ts" },
      },
    ],
  };
  context.options = {
    ...context.options,
    ...tcgcSettings,
  };

  return (await createSdkContext(
    context,
    context.program.emitters[0]?.metadata.name ?? "@azure-tools/typespec-ts",
    {
      flattenUnionAsEnum,
    },
  )) as SdkContext;
}

// TODO: should be removed once tcgc issue is resolved https://github.com/Azure/typespec-azure/issues/1794
function isArm(context: EmitContext<Record<string, any>>) {
  const packageName = (context?.options["package-details"] ?? {})["name"] ?? "";
  return packageName?.startsWith("@azure/arm-");
}

export async function renameClientName(
  client: SdkClientType<SdkServiceOperation>,
  emitterOptions: ModularEmitterOptions,
) {
  if (
    emitterOptions.options.typespecTitleMap &&
    emitterOptions.options.typespecTitleMap[client.name]
  ) {
    client.name = emitterOptions.options.typespecTitleMap[client.name]!;
  }
}
