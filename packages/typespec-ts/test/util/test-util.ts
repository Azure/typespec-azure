import { AutorestTestLibrary } from "@azure-tools/typespec-autorest/testing";
import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { AzureResourceManagerTestLibrary } from "@azure-tools/typespec-azure-resource-manager/testing";
import { listAllServiceNamespaces } from "@azure-tools/typespec-client-generator-core";
import { SdkTestLibrary } from "@azure-tools/typespec-client-generator-core/testing";
import { EmitContext, getDirectoryPath, NodeHost, Program } from "@typespec/compiler";
import { appendFileSync } from "fs";
import { createTestHost, TestHost } from "@typespec/compiler/testing";
import { HttpTestLibrary } from "@typespec/http/testing";
import { OpenAPITestLibrary } from "@typespec/openapi/testing";
import { RestTestLibrary } from "@typespec/rest/testing";
import { VersioningTestLibrary } from "@typespec/versioning/testing";
import { XmlTestLibrary } from "@typespec/xml/testing";
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

export async function createRLCEmitterTestHost() {
  return createTestHost({
    libraries: [
      HttpTestLibrary,
      RestTestLibrary,
      VersioningTestLibrary,
      AzureCoreTestLibrary,
      SdkTestLibrary,
      XmlTestLibrary,
      AzureResourceManagerTestLibrary,
      OpenAPITestLibrary,
      AutorestTestLibrary,
    ],
  });
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
 * Phase 2 (compile once per scenario): within a single scenario, every output
 * code block recompiles the *same* input TypeSpec. This cache memoizes the
 * compiled `TestHost` keyed by the exact compiler input (source + imports +
 * any example files), so repeated blocks reuse one compile instead of paying
 * the full TypeSpec checker cost each time.
 *
 * The cache is cleared after every scenario by the scenario runner
 * (`clearCompileCache` in an `afterAll`) so retention stays bounded to a single
 * scenario's distinct compiles — important given the emitter's cross-call
 * memory retention.
 */
const compileCache = new Map<string, TestHost>();

const COMPILE_STATS = process.env.COMPILE_CACHE_STATS === "1";
let compileHits = 0;
let compileMisses = 0;

async function compileAndCache(
  cacheKey: string,
  compile: () => Promise<TestHost>,
): Promise<TestHost> {
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
  const host = await compile();
  compileCache.set(cacheKey, host);
  return host;
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
): Promise<TestHost> {
  const namespace = `
  #suppress "@azure-tools/typespec-azure-core/auth-required" "for test"
  ${withVersionedApiVersion ? "@versioned(Versions)" : ""}
  @service(#{
    title: "Azure TypeScript Testing"
  })

  namespace Azure.TypeScript.Testing;
  `;
  const content = withRawContent
    ? code
    : `
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@typespec/xml";
${needTCGC ? 'import "@azure-tools/typespec-client-generator-core";' : ""} 
${needAzureCore ? 'import "@azure-tools/typespec-azure-core";' : ""} 
${needArmTemplate ? 'import "@azure-tools/typespec-azure-resource-manager";' : ""}

using Rest; 
using Http;
using Versioning;
using Xml;
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
    const host: TestHost = await createRLCEmitterTestHost();
    host.addTypeSpecFile("main.tsp", content);
    for (const example in exampleJson) {
      host.addTypeSpecFile(`./examples/${example}.json`, exampleJson[example]);
    }
    await host.compile("./", {
      warningAsError: false,
    });
    return host;
  });
}

export async function compileTypeSpecFor(code: string, examples: ExampleJson[] = []) {
  let prefix = "";
  if (!code.includes("import")) {
    prefix = prefix + importStatement();
    if (!code.includes("@service")) {
      prefix = prefix + serviceStatement();
    }
  }
  return compileAndCache(`compile\u0000${prefix}${code}\u0000${JSON.stringify(examples)}`, async () => {
    const host: TestHost = await createRLCEmitterTestHost();
    host.addTypeSpecFile("main.tsp", `${prefix}${code}`);
    for (const example of examples) {
      host.addTypeSpecFile(
        `./examples/2021-10-01-preview/${example.filename}.json`,
        example.rawContent,
      );
    }
    await host.compile("./", {
      warningAsError: false,
    });
    return host;
  });
}

function importStatement() {
  return `
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-client-generator-core";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
import "@typespec/xml";

using Rest; 
using Http;
using Versioning;
using Azure.ClientGenerator.Core;
using Azure.Core;
using Azure.ResourceManager;
using Xml;`;
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
