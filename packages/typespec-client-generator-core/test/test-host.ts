import { Diagnostic, EmitContext, Program, Type } from "@typespec/compiler";
import {
  BasicTestRunner,
  TestHost,
  TypeSpecTestLibrary,
  createTestHost,
  createTestWrapper,
  resolveVirtualPath,
} from "@typespec/compiler/testing";
import { HttpTestLibrary } from "@typespec/http/testing";
import { RestTestLibrary } from "@typespec/rest/testing";
import { VersioningTestLibrary } from "@typespec/versioning/testing";
import { CreateSdkContextOptions, createSdkContext } from "../src/context.js";
import { SdkContext, SdkHttpOperation, SdkServiceOperation } from "../src/interfaces.js";
import { BrandedSdkEmitterOptionsInterface } from "../src/internal-utils.js";
import { SdkTestLibrary } from "../src/testing/index.js";

export interface CreateSdkTestRunnerOptions extends BrandedSdkEmitterOptionsInterface {
  emitterName?: string;
  librariesToAdd?: TypeSpecTestLibrary[];
  autoImports?: string[];
  autoUsings?: string[];
  packageName?: string;
}

export async function createSdkTestHost(options: CreateSdkTestRunnerOptions = {}) {
  let libraries = [SdkTestLibrary, HttpTestLibrary, RestTestLibrary, VersioningTestLibrary];
  if (options.librariesToAdd) {
    libraries = libraries.concat(options.librariesToAdd);
  }
  return createTestHost({
    libraries: libraries,
  });
}

export async function createSdkTestRunner(
  options: CreateSdkTestRunnerOptions = {},
  sdkContextOption?: CreateSdkContextOptions,
): Promise<SdkTestRunner> {
  const host = await createSdkTestHost(options);
  let autoUsings = [
    "Azure.ClientGenerator.Core",
    "TypeSpec.Rest",
    "TypeSpec.Http",
    "TypeSpec.Versioning",
  ];
  if (options.autoUsings) {
    autoUsings = autoUsings.concat(options.autoUsings);
  }
  let autoImports = host.libraries
    .filter((x) => x.name !== "@typespec/compiler")
    .map((x) => x.name);
  if (options.autoImports) {
    autoImports = autoImports.concat(options.autoImports);
  }
  const sdkTestRunner = createTestWrapper(host, {
    autoImports,
    autoUsings,
  }) as SdkTestRunner;

  sdkTestRunner.host = host;

  const baseCompile = sdkTestRunner.compile;
  const baseDiagnose = sdkTestRunner.diagnose;
  const baseCompileAndDiagnose = sdkTestRunner.compileAndDiagnose;

  // compile
  sdkTestRunner.compile = async (code, compileOptions?) => {
    const result = await baseCompile(code, compileOptions);
    sdkTestRunner.context = await createSdkContextTestHelper(
      sdkTestRunner.program,
      options,
      sdkContextOption,
    );
    return result;
  };

  // diagnose
  sdkTestRunner.diagnose = async (code, compileOptions?) => {
    const result = await baseDiagnose(code, compileOptions);
    sdkTestRunner.context = await createSdkContextTestHelper(
      sdkTestRunner.program,
      options,
      sdkContextOption,
    );
    return result;
  };

  // compile and diagnose
  sdkTestRunner.compileAndDiagnose = async (code, compileOptions?) => {
    const result = await baseCompileAndDiagnose(code, compileOptions);
    sdkTestRunner.context = await createSdkContextTestHelper(
      sdkTestRunner.program,
      options,
      sdkContextOption,
    );
    return result;
  };

  // compile with dummy service definition
  sdkTestRunner.compileWithBuiltInService = async (code) => {
    const result = await baseCompile(
      `@service(#{title: "Test Service"}) namespace TestService;
    ${code}`,
      {
        noEmit: true,
      },
    );
    sdkTestRunner.context = await createSdkContextTestHelper(
      sdkTestRunner.program,
      options,
      sdkContextOption,
    );
    return result;
  };

  // compile with dummy service definition
  sdkTestRunner.compileWithBuiltInAzureCoreService = async (code) => {
    const result = await baseCompile(
      `
      @useDependency(Versions.v1_0_Preview_2)
      @server("http://localhost:3000", "endpoint")
      @service()
      namespace My.Service;
      ${code}`,
      {
        noEmit: true,
      },
    );
    sdkTestRunner.context = await createSdkContextTestHelper(
      sdkTestRunner.program,
      options,
      sdkContextOption,
    );
    return result;
  };

  // compile with dummy arm service definition
  sdkTestRunner.compileWithBuiltInAzureResourceManagerService = async (code) => {
    const result = await baseCompile(
      `
    @armProviderNamespace("My.Service")
    @server("http://localhost:3000", "endpoint")
    @service(#{title: "My.Service"})
    @versioned(Versions)
    @armCommonTypesVersion(CommonTypes.Versions.v5)
    namespace My.Service;

    /** Api versions */
    enum Versions {
      /** 2024-04-01-preview api version */
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      V2024_04_01_PREVIEW: "2024-04-01-preview",
    }
    ${code}`,
      {
        noEmit: true,
      },
    );
    sdkTestRunner.context = await createSdkContextTestHelper(
      sdkTestRunner.program,
      options,
      sdkContextOption,
    );
    return result;
  };

  // compile with versioned service
  sdkTestRunner.compileWithVersionedService = async (code) => {
    const result = await baseCompile(
      `
      @service
      @versioned(Versions)
      @server(
        "{endpoint}/versioning/api-version:{version}",
        "Testserver endpoint",
        {
          endpoint: url,
          version: Versions,
        }
      )
      namespace Versioning;
      enum Versions {
        v1: "v1",
        v2: "v2",
      }
      
      ${code}`,
      {
        noEmit: true,
      },
    );
    sdkTestRunner.context = await createSdkContextTestHelper(
      sdkTestRunner.program,
      options,
      sdkContextOption,
    );
    return result;
  };

  const mainAutoCode = [
    ...host.libraries.map((x) => x.name).map((x) => `import "${x}";`),
    ...autoUsings.map((x) => `using ${x};`),
  ].join("\n");

  const clientAutoCode = [
    ...host.libraries.map((x) => x.name).map((x) => `import "${x}";`),
    `import "./main.tsp";`,
    ...autoUsings.map((x) => `using ${x};`),
  ].join("\n");

  // compile with client.tsp
  sdkTestRunner.compileWithCustomization = async (mainCode, clientCode) => {
    host.addTypeSpecFile("./main.tsp", `${mainAutoCode}${mainCode}`);
    host.addTypeSpecFile("./client.tsp", `${clientAutoCode}${clientCode}`);
    const result = await host.compile("./client.tsp");
    sdkTestRunner.context = await createSdkContextTestHelper(
      sdkTestRunner.program,
      options,
      sdkContextOption,
    );
    return result;
  };

  // compile and diagnose with client.tsp
  sdkTestRunner.compileAndDiagnoseWithCustomization = async (mainCode, clientCode) => {
    host.addTypeSpecFile("./main.tsp", `${mainAutoCode}${mainCode}`);
    host.addTypeSpecFile("./client.tsp", `${clientAutoCode}${clientCode}`);
    const result = await host.compileAndDiagnose("./client.tsp");
    sdkTestRunner.context = await createSdkContextTestHelper(
      sdkTestRunner.program,
      options,
      sdkContextOption,
    );
    return result;
  };

  return sdkTestRunner;
}

export interface SdkTestRunner extends BasicTestRunner {
  host: TestHost;
  context: SdkContext<CreateSdkTestRunnerOptions, SdkHttpOperation>;
  compileWithBuiltInService(code: string): Promise<Record<string, Type>>;
  compileWithBuiltInAzureCoreService(code: string): Promise<Record<string, Type>>;
  compileWithBuiltInAzureResourceManagerService(code: string): Promise<Record<string, Type>>;
  compileWithVersionedService(code: string): Promise<Record<string, Type>>;
  compileWithCustomization(mainCode: string, clientCode: string): Promise<Record<string, Type>>;
  compileAndDiagnoseWithCustomization(
    mainCode: string,
    clientCode: string,
  ): Promise<[Record<string, Type>, readonly Diagnostic[]]>;
}

export async function createSdkContextTestHelper<
  TOptions extends Record<string, any> = CreateSdkTestRunnerOptions,
  TServiceOperation extends SdkServiceOperation = SdkHttpOperation,
>(
  program: Program,
  options: TOptions,
  sdkContextOption?: CreateSdkContextOptions,
): Promise<SdkContext<TOptions, TServiceOperation>> {
  const emitContext: EmitContext<TOptions> = {
    program: program,
    emitterOutputDir: resolveVirtualPath("tsp-output"),
    options: options,
  };
  return await createSdkContext(
    emitContext,
    options.emitterName ?? "@azure-tools/typespec-csharp",
    sdkContextOption,
  );
}
