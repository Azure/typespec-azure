import { listAllServiceNamespaces } from "@azure-tools/typespec-client-generator-core";
import { EmitContext, getDirectoryPath, NodeHost, Program, resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";
import { appendFileSync } from "fs";
import path from "path";
import { format } from "prettier";
import { Project } from "ts-morph";
import { fileURLToPath } from "url";
import { assert } from "vitest";
import { provideContext } from "../../src/context-manager.js";
import { provideBinder } from "../../src/framework/hooks/binder.js";
import { provideSdkTypes } from "../../src/framework/hooks/sdk-types.js";
import { loadStaticHelpers } from "../../src/framework/load-static-helpers.js";
import { createContextWithDefaultOptions } from "../../src/index.js";
import { prettierTypeScriptOptions } from "../../src/lib.js";
import {
  AzureCoreDependencies,
  AzureIdentityDependencies,
  AzurePollingDependencies,
  AzureTestDependencies,
} from "../../src/modular/external-dependencies.js";
import {
  CreateRecorderHelpers,
  MultipartHelpers,
  PagingHelpers,
  PlatformTypeHelpers,
  PollingHelpers,
  SerializationHelpers,
  StorageCompatHelpers,
  UrlTemplateHelpers,
  XmlHelpers,
} from "../../src/modular/static-helpers-metadata.js";
import { SdkContext } from "../../src/utils/interfaces.js";

export interface ExampleJson {
  filename: string;
  rawContent: string;
}

const __dirname = getDirectoryPath(fileURLToPath(import.meta.url));

/**
 * Shared tester for compiling test TypeSpec. Unlike the old `createTestHost` —
 * which re-globs and re-reads every library's `.tsp`/`.json` from disk on
 * *every* call — the tester loads the libraries once and clones an in-memory
 * filesystem per compile, so the dominant library-load cost is amortized across
 * all distinct compilations in a worker. The package root is the resolution
 * base so the libraries resolve from this package's dependencies.
 */
const sharedTester = createTester(resolvePath(__dirname, "..", ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@typespec/xml",
    "@typespec/openapi",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-client-generator-core",
    "@azure-tools/typespec-azure-resource-manager",
    "@azure-tools/typespec-autorest",
  ],
});

/** Result of a cached TypeSpec compilation. Callers only need the `Program`. */
export interface CompiledTypeSpec {
  program: Program;
}

/**
 * Compiles `main.tsp` (plus any sibling files) through the shared tester. The
 * input already contains its own `import`/`using` statements, so we don't use
 * the tester's `.import()`/`.using()` builders. `warningAsError: false` matches
 * the prior `TestHost.compile` behavior; callers inspect `program.diagnostics`
 * themselves, so we use `compileAndDiagnose` (which never throws on
 * diagnostics).
 */
async function compileWithSharedTester(files: Record<string, string>): Promise<CompiledTypeSpec> {
  const [result] = await sharedTester.compileAndDiagnose(files, {
    compilerOptions: { warningAsError: false },
  });
  return { program: result.program };
}

export interface RLCEmitterOptions {
  needNamespaces?: boolean;
  needAzureCore?: boolean;
  needTCGC?: boolean;
  withRawContent?: boolean;
  withVersionedApiVersion?: boolean;
  needArmTemplate?: boolean;
  exampleJson?: Record<string, any>;
}

/**
 * Library usage detectors. Each matches the decorators / namespace references
 * that can only resolve to the corresponding library, so we can skip importing
 * it when a scenario doesn't use it. Kept deliberately broad (over-include
 * rather than under-include) — see `rlcEmitterFor`.
 */
const REST_USAGE =
  /@(autoRoute|segmentOf|segment|actionSegment|actionSeparator|collectionAction|action|parentResource|readsResource|createsOrReplacesResource|createsOrUpdatesResource|createsResource|updatesResource|deletesResource|listsResource|copyResourceKeyParameters|resourceLocation|resourceTypeForKeyParam|validateHasKey|validateIsError|resource)\b|\bRest\./;
const VERSIONING_USAGE =
  /@(versioned|added|removedFrom|removed|renamedFrom|madeOptional|madeRequired|typeChangedFrom|returnTypeChangedFrom|useDependency)\b|\bVersions\b|\bVersioning\./;
const XML_USAGE = /\bXml\b|@unwrapped\b|@attribute\b/;
/**
 * Usage detectors for the heavy Azure libraries that dominate
 * `compileTypeSpecFor`'s prefix cost (azure-core + ARM + TCGC account for
 * ~700 ms of the ~744 ms full-prefix compile; http/rest/versioning/xml are
 * nearly free). Each matches namespace references / decorators that can only
 * resolve to its library. Kept deliberately broad (over-include rather than
 * under-include) — a false positive just keeps an unused import (correct,
 * slightly slower), while a false negative surfaces as a loud compile failure
 * caught by the snapshot oracle.
 */
const AZURE_CORE_USAGE =
  /\bAzure\.Core\b|@(pollingOperation|finalLocation|lroStatus|pollingLocation|operationLink|pagedResult|items|nextLink|useFinalStateVia|resourceOperation)\b|\b(ResourceOperations|StandardResourceOperations|ResourceCreateOrUpdate|ResourceCreateOrReplace|ResourceCreateWithServiceProvidedName|ResourceRead|ResourceDelete|ResourceList|ResourceCollectionOperations|ResourceOperationsBase|RpcOperation|LongRunningRpcOperation|TrackedResource|ProxyResource|ExtensionResource|SingletonResourceOperations)\b/;
const ARM_USAGE =
  /\bAzure\.ResourceManager\b|@(armResourceOperations|armResourceCreateOrUpdate|armResourceRead|armResourceDelete|armResourceList|armResourceAction|armResourceCollectionAction|tenantResource|subscriptionResource|locationResource|resourceGroupResource|armProviderNamespace|armProviderNameValue|armResourceIdentifier|armCommonTypesVersion|useLibraryNamespace|identifiers|singleton)\b/;
const TCGC_USAGE =
  /\bAzure\.ClientGenerator\.Core\b|@(client|clientName|operationGroup|access|usage|convenientAPI|protocolAPI|flattenProperty|clientNamespace|paramAlias|alternateType|clientLocation|clientInitialization|override|useSystemTextJsonConverter|scope|deserializeEmptyStringAsNull)\b/;

/**
 * Compile-once-per-scenario cache: within a single scenario, every output
 * code block recompiles the *same* input TypeSpec. This cache memoizes the
 * compiled program keyed by the exact compiler input (source + imports +
 * any example files), so repeated blocks reuse one compile instead of paying
 * the full TypeSpec checker cost each time.
 *
 * The cache is cleared after every scenario by the scenario runner
 * (`clearCompileCache` in an `afterAll`) so retention stays bounded to a single
 * scenario's distinct compiles — important given the emitter's cross-call
 * memory retention.
 */
const compileCache = new Map<string, CompiledTypeSpec>();

const COMPILE_STATS = process.env.COMPILE_CACHE_STATS === "1";
let compileHits = 0;
let compileMisses = 0;

async function compileAndCache(
  cacheKey: string,
  compile: () => Promise<CompiledTypeSpec>,
): Promise<CompiledTypeSpec> {
  const cached = compileCache.get(cacheKey);
  if (cached) {
    if (COMPILE_STATS) {
      compileHits++;
    }
    return cached;
  }
  if (COMPILE_STATS) {
    compileMisses++;
  }
  const result = await compile();
  compileCache.set(cacheKey, result);
  return result;
}

/**
 * Clears the per-scenario compile cache. Called by the scenario runner after
 * each scenario completes to keep retained compiled programs bounded.
 */
export function clearCompileCache(): void {
  if (COMPILE_STATS) {
    const total = compileHits + compileMisses;
    const pct = total === 0 ? "0" : ((compileHits / total) * 100).toFixed(1);
    try {
      appendFileSync(
        process.env.COMPILE_CACHE_STATS_FILE ?? "compile-cache-stats.log",
        `hits=${compileHits} misses=${compileMisses} total=${total} hitRate=${pct}%\n`,
      );
    } catch {
      // best-effort
    }
    compileHits = 0;
    compileMisses = 0;
  }
  compileCache.clear();
}

export async function rlcEmitterFor(
  code: string,
  {
    needNamespaces = true,
    needAzureCore = false,
    needTCGC = false,
    withRawContent = false,
    withVersionedApiVersion = false,
    needArmTemplate = false,
    exampleJson = {},
  }: RLCEmitterOptions = {},
): Promise<CompiledTypeSpec> {
  const namespace = `
  #suppress "@azure-tools/typespec-azure-core/auth-required" "for test"
  ${withVersionedApiVersion ? "@versioned(Versions)" : ""}
  @service(#{
    title: "Azure TypeScript Testing"
  })

  namespace Azure.TypeScript.Testing;
  `;
  // The TypeSpec checker cost scales with the imported library surface.
  // Only import `@typespec/rest`, `@typespec/versioning` and `@typespec/xml` when
  // the scenario input actually references them, instead of importing all three
  // for every test. Detection is intentionally conservative — a false positive
  // just keeps an unused import (slower but correct), while the snapshot
  // assertions catch any false negative as a compile failure.
  const needRest = needArmTemplate || REST_USAGE.test(code);
  const needVersioning = withVersionedApiVersion || VERSIONING_USAGE.test(code);
  const needXml = XML_USAGE.test(code);
  const content = withRawContent
    ? code
    : `
import "@typespec/http";
${needRest ? 'import "@typespec/rest";' : ""}
${needVersioning ? 'import "@typespec/versioning";' : ""}
${needXml ? 'import "@typespec/xml";' : ""}
${needTCGC ? 'import "@azure-tools/typespec-client-generator-core";' : ""} 
${needAzureCore ? 'import "@azure-tools/typespec-azure-core";' : ""} 
${needArmTemplate ? 'import "@azure-tools/typespec-azure-resource-manager";' : ""}

using Http;
${needRest ? "using Rest;" : ""}
${needVersioning ? "using Versioning;" : ""}
${needXml ? "using Xml;" : ""}
${needTCGC ? "using Azure.ClientGenerator.Core;" : ""}
${needAzureCore ? "using Azure.Core;" : ""}
${needNamespaces ? namespace : ""}
${needArmTemplate ? "using Azure.ResourceManager;" : ""}
${
  withVersionedApiVersion && needNamespaces
    ? 'enum Versions { v2022_05_15_preview: "2022-05-15-preview"}'
    : ""
}
${code}
`;
  return compileAndCache(`rlc\u0000${content}\u0000${JSON.stringify(exampleJson)}`, async () => {
    const files: Record<string, string> = { "main.tsp": content };
    for (const example in exampleJson) {
      files[`./examples/${example}.json`] = exampleJson[example];
    }
    return compileWithSharedTester(files);
  });
}

export async function compileTypeSpecFor(code: string, examples: ExampleJson[] = []) {
  let prefix = "";
  if (!code.includes("import")) {
    prefix = prefix + importStatement(code);
    if (!code.includes("@service")) {
      prefix = prefix + serviceStatement();
    }
  }
  return compileAndCache(
    `compile\u0000${prefix}${code}\u0000${JSON.stringify(examples)}`,
    async () => {
      const files: Record<string, string> = { "main.tsp": `${prefix}${code}` };
      for (const example of examples) {
        files[`./examples/2021-10-01-preview/${example.filename}.json`] = example.rawContent;
      }
      return compileWithSharedTester(files);
    },
  );
}

/**
 * Builds the import/`using` prefix for `compileTypeSpecFor`. `@typespec/http`
 * and `@typespec/versioning` are always included (versioning is required by the
 * `@versioned` `serviceStatement()` and is nearly free), while the expensive
 * Azure libraries (azure-core, ARM, TCGC) and rest/xml are imported only when
 * the scenario input references them. azure-core/ARM build on rest, so detecting
 * either forces rest; ARM builds on azure-core, so it forces azure-core too.
 * See the usage detectors above for why this is safe (over-include bias +
 * snapshot oracle).
 */
function importStatement(code: string) {
  const needTCGC = TCGC_USAGE.test(code);
  const needArm = ARM_USAGE.test(code);
  const needAzureCore = needArm || AZURE_CORE_USAGE.test(code);
  const needRest = needAzureCore || REST_USAGE.test(code);
  const needXml = XML_USAGE.test(code);
  return `
import "@typespec/http";
import "@typespec/versioning";
${needRest ? 'import "@typespec/rest";' : ""}
${needTCGC ? 'import "@azure-tools/typespec-client-generator-core";' : ""}
${needAzureCore ? 'import "@azure-tools/typespec-azure-core";' : ""}
${needArm ? 'import "@azure-tools/typespec-azure-resource-manager";' : ""}
${needXml ? 'import "@typespec/xml";' : ""}

using Http;
using Versioning;
${needRest ? "using Rest;" : ""}
${needTCGC ? "using Azure.ClientGenerator.Core;" : ""}
${needAzureCore ? "using Azure.Core;" : ""}
${needArm ? "using Azure.ResourceManager;" : ""}
${needXml ? "using Xml;" : ""}`;
}

function serviceStatement() {
  return `
  @versioned(Azure.TypeScript.Testing.Versions)
  @service(#{
    title: "Azure TypeScript Testing",
  })

  namespace Azure.TypeScript.Testing;
  enum Versions {
    
    v2021_10_01_preview: "2021-10-01-preview",
  }
  
  `;
}

export async function createDpgContextTestHelper(
  program: Program,
  enableModelNamespace = false,
  configs: Record<string, unknown> = {},
): Promise<SdkContext> {
  const outputProject = new Project({ useInMemoryFileSystem: true });
  provideContext("rlcMetaTree", new Map());
  provideContext("symbolMap", new Map());
  provideContext("outputProject", outputProject);

  const context = await createContextWithDefaultOptions({
    program,
    options: configs as any,
  } as EmitContext);

  const sdkContext = {
    ...context,
    program,
    rlcOptions: {
      enableModelNamespace,
      ...configs,
    },
    emitterName: "@azure-tools/typespec-ts",
    originalProgram: program,
    allServiceNamespaces: listAllServiceNamespaces(context),
  } as SdkContext;

  provideContext("emitContext", {
    compilerContext: context as any,
    tcgcContext: sdkContext,
  });

  await provideBinderWithAzureDependencies(outputProject);
  provideSdkTypes(context);

  return sdkContext;
}

export async function assertEqualContent(
  actual: string,
  expected: string,
  ignoreWeirdLine: boolean = false,
) {
  assert.strictEqual(
    await format(
      ignoreWeirdLine ? actual.replace(/$\n^/g, "").replace(/\s+/g, " ") : actual,
      prettierTypeScriptOptions,
    ),
    await format(
      ignoreWeirdLine ? expected.replace(/$\n^/g, "").replace(/\s+/g, " ") : expected,
      prettierTypeScriptOptions,
    ),
  );
}

export type VerifyPropertyConfig = {
  additionalTypeSpecDefinition?: string;
  outputType?: string;
  additionalInputContent?: string;
  additionalOutputContent?: string;
};

/**
 * A caching wrapper around a CompilerHost that memoizes filesystem reads
 * (`readFile`, `readDir`, `stat`) by path. The static-helper assets read during
 * `loadStaticHelpers` never change during a test run, but they were previously
 * re-read and re-traversed from disk on every emit call (hundreds of times per
 * run). Caching these reads removes that redundant I/O while keeping behavior
 * identical — each test still parses the cached contents into its own ts-morph
 * Project.
 */
function createCachingHost(host: typeof NodeHost): typeof NodeHost {
  const readFileCache = new Map<string, ReturnType<typeof host.readFile>>();
  const readDirCache = new Map<string, ReturnType<typeof host.readDir>>();
  const statCache = new Map<string, ReturnType<typeof host.stat>>();

  return new Proxy(host, {
    get(target, prop, receiver) {
      if (prop === "readFile") {
        return (filePath: string) => {
          let cached = readFileCache.get(filePath);
          if (!cached) {
            cached = target.readFile(filePath);
            readFileCache.set(filePath, cached);
          }
          return cached;
        };
      }
      if (prop === "readDir") {
        return (dirPath: string) => {
          let cached = readDirCache.get(dirPath);
          if (!cached) {
            cached = target.readDir(dirPath);
            readDirCache.set(dirPath, cached);
          }
          return cached;
        };
      }
      if (prop === "stat") {
        return (statPath: string) => {
          let cached = statCache.get(statPath);
          if (!cached) {
            cached = target.stat(statPath);
            statCache.set(statPath, cached);
          }
          return cached;
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

const cachedStaticHelperHost = createCachingHost(NodeHost);

export async function provideBinderWithAzureDependencies(project: Project) {
  const packageRoot = path.resolve(__dirname, "../..");
  const helpersDirectory = path.resolve(packageRoot, "static/static-helpers");

  const extraDependencies = {
    ...AzurePollingDependencies,
    ...AzureCoreDependencies,
    ...AzureIdentityDependencies,
    ...AzureTestDependencies,
  };

  const staticHelpers = {
    ...XmlHelpers,
    ...SerializationHelpers,
    ...PagingHelpers,
    ...PollingHelpers,
    ...UrlTemplateHelpers,
    ...MultipartHelpers,
    ...PlatformTypeHelpers,
    ...CreateRecorderHelpers,
    ...StorageCompatHelpers,
  };

  const staticHelperMap = await loadStaticHelpers(project, staticHelpers, {
    helpersAssetDirectory: helpersDirectory,
    loadTestHelpers: true,
    host: cachedStaticHelperHost,
    packageRoot,
  });

  const binder = provideBinder(project, {
    staticHelpers: staticHelperMap,
    dependencies: extraDependencies,
  });

  return binder;
}
