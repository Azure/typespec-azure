import { buildApiOptions } from "../../src/modular/emit-models-options.js";
import {
  emitNonModelResponseTypes,
  emitTypes,
  getModelsPath,
} from "../../src/modular/emit-models.js";
import {
  compileTypeSpecFor,
  createDpgContextTestHelper,
  ExampleJson,
  rlcEmitterFor,
} from "./test-util.js";

import { expectDiagnosticEmpty } from "@typespec/compiler/testing";
import { useContext } from "../../src/context-manager.js";
import { useBinder } from "../../src/framework/hooks/binder.js";
import { renameClientName } from "../../src/index.js";
import { buildClassicalClient } from "../../src/modular/build-classical-client.js";
import { buildClassicOperationFiles } from "../../src/modular/build-classical-operation-groups.js";
import { buildClientContext } from "../../src/modular/build-client-context.js";
import { transformModularEmitterOptions } from "../../src/modular/build-modular-options.js";
import { buildOperationFiles } from "../../src/modular/build-operations.js";
import { buildRootIndex } from "../../src/modular/build-root-index.js";
import { buildSubpathIndexFile } from "../../src/modular/build-subpath-index.js";
import { emitSamples } from "../../src/modular/emit-samples.js";
import { emitTests } from "../../src/modular/emit-tests.js";
import { getClientHierarchyMap } from "../../src/utils/client-utils.js";
import { ClientOptions } from "../../src/interfaces.js";

export interface ModelConfigOptions extends ClientOptions {
  needOptions?: boolean;
  withRawContent?: boolean;
  needAzureCore?: boolean;
  needNamespaces?: boolean;
  mustEmptyDiagnostic?: boolean;
  withVersionedApiVersion?: boolean;
  [key: string]: any;
}

export async function emitModularModelsFromTypeSpec(
  tspContent: string,
  options: ModelConfigOptions = {},
) {
  const {
    needOptions = false,
    withRawContent = false,
    needAzureCore = false,
    mustEmptyDiagnostic = true,
    needTCGC = false,
    withVersionedApiVersion = false,
    needArmTemplate = false,
  } = options;
  if (options["experimental-extensible-enums"] === undefined) {
    options["experimental-extensible-enums"] = false;
  }
  if (options["compatibility-mode"] === undefined) {
    options["compatibility-mode"] = false;
  }
  const context = await rlcEmitterFor(tspContent, {
    needNamespaces: true,
    needAzureCore,
    needTCGC,
    withRawContent,
    withVersionedApiVersion,
    needArmTemplate,
  });
  const dpgContext = await createDpgContextTestHelper(context.program, false, options);
  const binder = useBinder();
  let modelFile: any;
  const includeResponseHeaders = options["include-headers-in-response"] === true;
  dpgContext.rlcOptions!.includeHeadersInResponse = includeResponseHeaders;
  dpgContext.rlcOptions!.compatibilityMode = options["compatibility-mode"];
  dpgContext.rlcOptions!.experimentalExtensibleEnums = options["experimental-extensible-enums"];
  dpgContext.rlcOptions!.ignoreNullableOnOptional = options["ignore-nullable-on-optional"] ?? true;
  if (options["wrap-non-model-return"] !== undefined) {
    dpgContext.rlcOptions!.wrapNonModelReturn = options["wrap-non-model-return"] === true;
  }
  if (options["treat-unknown-as-record"] !== undefined) {
    dpgContext.rlcOptions!.treatUnknownAsRecord = options["treat-unknown-as-record"] === true;
  }
  const modularEmitterOptions = transformModularEmitterOptions(dpgContext, "", {
    casing: "camel",
  });
  if (needOptions) {
    emitTypes(dpgContext, { sourceRoot: "" });
    const clientMap = Array.from(getClientHierarchyMap(dpgContext));
    modelFile = buildApiOptions(dpgContext, clientMap[0]!, modularEmitterOptions);
    binder.resolveAllReferences("/");
    if (modelFile.length > 0) {
      modelFile[0]!.fixUnusedIdentifiers();
    }
  } else {
    const emittedFiles = emitTypes(dpgContext, { sourceRoot: "" });
    emitNonModelResponseTypes(dpgContext, { sourceRoot: "" });
    binder.resolveAllReferences("/");
    // After emitNonModelResponseTypes, the models file may have been updated or created
    const project = useContext("outputProject");
    const modelsFile = project.getSourceFile(getModelsPath(""));
    if (modelsFile) {
      modelsFile.fixUnusedIdentifiers();
      modelFile = modelsFile;
    } else {
      modelFile = emittedFiles[0];
    }
  }
  if (mustEmptyDiagnostic && dpgContext.program.diagnostics.length > 0) {
    throw dpgContext.program.diagnostics;
  }
  if (Array.isArray(modelFile)) {
    return modelFile[0];
  }
  return modelFile;
}

export async function emitRootIndexFromTypeSpec(
  tspContent: string,
  options: ModelConfigOptions = {},
) {
  const {
    withRawContent = false,
    needAzureCore = false,
    mustEmptyDiagnostic = true,
    needTCGC = false,
  } = options;
  if (options["experimental-extensible-enums"] === undefined) {
    options["experimental-extensible-enums"] = false;
  }
  if (options["compatibility-mode"] === undefined) {
    options["compatibility-mode"] = false;
  }
  const context = await rlcEmitterFor(tspContent, {
    needNamespaces: true,
    needAzureCore,
    needTCGC,
    withRawContent,
  });
  const dpgContext = await createDpgContextTestHelper(context.program, false, options);
  const binder = useBinder();
  const project = useContext("outputProject");
  const includeResponseHeaders = options["include-headers-in-response"] === true;
  dpgContext.rlcOptions!.includeHeadersInResponse = includeResponseHeaders;
  dpgContext.rlcOptions!.compatibilityMode = options["compatibility-mode"];
  dpgContext.rlcOptions!.experimentalExtensibleEnums = options["experimental-extensible-enums"];
  // need to specify the root path for this case
  const modularEmitterOptions = transformModularEmitterOptions(dpgContext, "/any/path", {
    casing: "camel",
  });
  const rootIndexFile = project.createSourceFile(
    `${modularEmitterOptions.modularOptions.sourceRoot}/index.ts`,
    "",
    {
      overwrite: true,
    },
  );
  emitTypes(dpgContext, modularEmitterOptions.modularOptions);
  buildSubpathIndexFile(modularEmitterOptions, "models", undefined, {
    recursive: true,
  });
  if (
    dpgContext.sdkPackage.clients &&
    dpgContext.sdkPackage.clients.length > 0 &&
    dpgContext.sdkPackage.clients[0]
  ) {
    const clientMap = Array.from(getClientHierarchyMap(dpgContext));
    buildRootIndex(dpgContext, modularEmitterOptions, rootIndexFile, clientMap[0]!);

    if (options.mustEmptyDiagnostic && dpgContext.program.diagnostics.length > 0) {
      throw dpgContext.program.diagnostics;
    }
    binder.resolveAllReferences("/");
  }
  if (dpgContext.sdkPackage.clients.length === 0) {
    buildRootIndex(dpgContext, modularEmitterOptions, rootIndexFile);
  }
  if (mustEmptyDiagnostic && dpgContext.program.diagnostics.length > 0) {
    throw dpgContext.program.diagnostics;
  }
  return rootIndexFile;
}

export async function emitModularOperationsFromTypeSpec(
  tspContent: string,
  options: ModelConfigOptions = {},
) {
  if (options.mustEmptyDiagnostic === undefined) {
    options.mustEmptyDiagnostic = true;
  }
  if (options.needNamespaces === undefined) {
    options.needNamespaces = true;
  }
  if (options["experimental-extensible-enums"] === undefined) {
    options["experimental-extensible-enums"] = false;
  }
  const context = await rlcEmitterFor(tspContent, {
    needNamespaces: options.needNamespaces,
    needAzureCore: options.needAzureCore ? true : false,
    needTCGC: options["needTCGC"] ? true : false,
    withRawContent: options.withRawContent ? true : false,
    withVersionedApiVersion: options.withVersionedApiVersion ? true : false,
  });
  const dpgContext = await createDpgContextTestHelper(context.program);
  const binder = useBinder();
  const includeResponseHeaders = options["include-headers-in-response"] === true;
  dpgContext.rlcOptions!.includeHeadersInResponse = includeResponseHeaders;
  dpgContext.rlcOptions!.experimentalExtensibleEnums = options["experimental-extensible-enums"];
  if (options["wrap-non-model-return"] !== undefined) {
    dpgContext.rlcOptions!.wrapNonModelReturn = options["wrap-non-model-return"] === true;
  }
  dpgContext.rlcOptions!.enableStorageCompat = options["enable-storage-compat"] === true;
  if (options["treat-unknown-as-record"] !== undefined) {
    dpgContext.rlcOptions!.treatUnknownAsRecord = options["treat-unknown-as-record"] === true;
  }
  const modularEmitterOptions = transformModularEmitterOptions(dpgContext, "", {
    casing: "camel",
  });
  if (
    dpgContext.sdkPackage.clients &&
    dpgContext.sdkPackage.clients.length > 0 &&
    dpgContext.sdkPackage.clients[0]
  ) {
    emitTypes(dpgContext, { sourceRoot: "" });
    emitNonModelResponseTypes(dpgContext, { sourceRoot: "" });
    const clientMap = Array.from(getClientHierarchyMap(dpgContext));
    const res = buildOperationFiles(dpgContext, clientMap[0]!, modularEmitterOptions);
    buildApiOptions(dpgContext, clientMap[0]!, modularEmitterOptions);
    if (options.mustEmptyDiagnostic && dpgContext.program.diagnostics.length > 0) {
      throw dpgContext.program.diagnostics;
    }
    binder.resolveAllReferences("/");
    for (const file of res) {
      file.fixUnusedIdentifiers();
    }
    return res;
  }
  return undefined;
}

export async function emitModularClientContextFromTypeSpec(
  tspContent: string,
  options: ModelConfigOptions = {},
) {
  const context = await rlcEmitterFor(tspContent, {
    needNamespaces: true,
    needAzureCore: false,
    needTCGC: false,
    withRawContent: options.withRawContent ? true : false,
    withVersionedApiVersion: options.withVersionedApiVersion ? true : false,
  });
  const dpgContext = await createDpgContextTestHelper(context.program);
  const binder = useBinder();
  const includeResponseHeaders = options["include-headers-in-response"] === true;
  dpgContext.rlcOptions!.includeHeadersInResponse = includeResponseHeaders;
  dpgContext.rlcOptions!.typespecTitleMap = options["typespec-title-map"];
  const modularEmitterOptions = transformModularEmitterOptions(dpgContext, "", {
    casing: "camel",
  });
  if (
    dpgContext.sdkPackage.clients &&
    dpgContext.sdkPackage.clients.length > 0 &&
    dpgContext.sdkPackage.clients[0]
  ) {
    emitTypes(dpgContext, { sourceRoot: "" });
    renameClientName(dpgContext.sdkPackage.clients[0], modularEmitterOptions);
    const clientMap = Array.from(getClientHierarchyMap(dpgContext));
    const res = buildClientContext(dpgContext, clientMap[0]!, modularEmitterOptions);
    binder.resolveAllReferences("/");
    return res;
  }
  expectDiagnosticEmpty(dpgContext.program.diagnostics);
  return undefined;
}

export async function emitModularClientFromTypeSpec(
  tspContent: string,
  options: ModelConfigOptions = {},
) {
  const context = await rlcEmitterFor(tspContent, {
    needNamespaces: true,
    needAzureCore: false,
    needTCGC: false,
    withRawContent: options.withRawContent ? true : false,
    withVersionedApiVersion: options.withVersionedApiVersion ? true : false,
  });
  const dpgContext = await createDpgContextTestHelper(context.program);
  const binder = useBinder();
  const includeResponseHeaders = options["include-headers-in-response"] === true;
  dpgContext.rlcOptions!.includeHeadersInResponse = includeResponseHeaders;
  dpgContext.rlcOptions!.typespecTitleMap = options["typespec-title-map"];
  dpgContext.rlcOptions!.hierarchyClient = options["hierarchy-client"] ?? true;
  const modularEmitterOptions = transformModularEmitterOptions(dpgContext, "", {
    casing: "camel",
  });
  if (
    dpgContext.sdkPackage.clients &&
    dpgContext.sdkPackage.clients.length > 0 &&
    dpgContext.sdkPackage.clients[0]
  ) {
    emitTypes(dpgContext, { sourceRoot: "" });
    renameClientName(dpgContext.sdkPackage.clients[0], modularEmitterOptions);
    const clientMap = Array.from(getClientHierarchyMap(dpgContext));
    buildApiOptions(dpgContext, clientMap[0]!, modularEmitterOptions);
    buildOperationFiles(dpgContext, clientMap[0]!, modularEmitterOptions);
    buildClassicOperationFiles(dpgContext, clientMap[0]!, modularEmitterOptions);
    const res = buildClassicalClient(dpgContext, clientMap[0]!, modularEmitterOptions);
    binder.resolveAllReferences("/");
    return res;
  }
  expectDiagnosticEmpty(dpgContext.program.diagnostics);
  return undefined;
}

export async function emitSamplesFromTypeSpec(
  tspContent: string,
  examples: ExampleJson[],
  configs: Record<string, any> = {},
) {
  const context = await compileTypeSpecFor(tspContent, examples);
  configs["typespecTitleMap"] = configs["typespec-title-map"];
  configs["hierarchyClient"] = configs["hierarchy-client"];
  configs["enableOperationGroup"] = configs["enable-operation-group"];
  const dpgContext = await createDpgContextTestHelper(context.program, false, {
    "examples-directory": `./examples`,
    packageDetails: {
      name: "@azure/internal-test",
    },
    ...configs,
  });
  dpgContext.rlcOptions!.ignoreNullableOnOptional = configs["ignore-nullable-on-optional"] ?? true;
  const modularEmitterOptions = transformModularEmitterOptions(dpgContext, "", {
    casing: "camel",
  });
  for (const subClient of dpgContext.sdkPackage.clients) {
    await renameClientName(subClient, modularEmitterOptions);
  }
  const files = await emitSamples(dpgContext);
  useBinder().resolveAllReferences("/");
  return files;
}

export async function emitTestsFromTypeSpec(
  tspContent: string,
  examples: ExampleJson[],
  configs: Record<string, any> = {},
) {
  const context = await compileTypeSpecFor(tspContent, examples);
  configs["typespecTitleMap"] = configs["typespec-title-map"];
  configs["hierarchyClient"] = configs["hierarchy-client"];
  configs["enableOperationGroup"] = configs["enable-operation-group"];
  const dpgContext = await createDpgContextTestHelper(context.program, false, {
    "examples-directory": `./examples`,
    packageDetails: {
      name: "@azure/internal-test",
    },
    ...configs,
  });
  const modularEmitterOptions = transformModularEmitterOptions(dpgContext, "", {
    casing: "camel",
  });
  for (const subClient of dpgContext.sdkPackage.clients) {
    await renameClientName(subClient, modularEmitterOptions);
  }
  const files = await emitTests(dpgContext);
  useBinder().resolveAllReferences("/");
  return files;
}
