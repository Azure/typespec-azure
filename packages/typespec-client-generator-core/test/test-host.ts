import { Diagnostic, EmitContext, Program, Type } from "@typespec/compiler";
import {
  BasicTestRunner,
  StandardTestLibrary,
  TypeSpecTestLibrary,
  createTestHost,
  createTestWrapper,
} from "@typespec/compiler/testing";
import { HttpTestLibrary } from "@typespec/http/testing";
import { RestTestLibrary } from "@typespec/rest/testing";
import { VersioningTestLibrary } from "@typespec/versioning/testing";
import { createSdkContext } from "../src/decorators.js";
import { SdkContext, SdkEmitterOptions } from "../src/interfaces.js";
import { SdkTestLibrary } from "../src/testing/index.js";

export async function createSdkTestHost(options: CreateSdkTestRunnerOptions = {}) {
  let libraries = [SdkTestLibrary, HttpTestLibrary, RestTestLibrary, VersioningTestLibrary];
  if (options.librariesToAdd) {
    libraries = libraries.concat(options.librariesToAdd);
  }
  return createTestHost({
    libraries: libraries,
  });
}

export interface SdkTestRunner extends BasicTestRunner {
  context: SdkContext<CreateSdkTestRunnerOptions>;
  compileWithBuiltInService(code: string): Promise<Record<string, Type>>;
  compileWithCustomization(mainCode: string, clientCode: string): Promise<Record<string, Type>>;
  compileAndDiagnoseWithCustomization(
    mainCode: string,
    clientCode: string
  ): Promise<[Record<string, Type>, readonly Diagnostic[]]>;
}

export function createSdkContextTestHelper<TOptions extends object = CreateSdkTestRunnerOptions>(
  program: Program,
  options: TOptions,
  emitterName?: string
): SdkContext<TOptions> {
  const emitContext: EmitContext<TOptions> = {
    program: program,
    emitterOutputDir: "dummy",
    options: options,
    getAssetEmitter: null as any,
  };
  return createSdkContext(emitContext, emitterName ?? "@azure-tools/typespec-csharp");
}

export interface CreateSdkTestRunnerOptions extends SdkEmitterOptions {
  emitterName?: string;
  librariesToAdd?: TypeSpecTestLibrary[];
  autoUsings?: string[];
}

export async function createSdkTestRunner(
  options: CreateSdkTestRunnerOptions = {}
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
  const sdkTestRunner = createTestWrapper(host, {
    autoUsings: autoUsings,
  }) as SdkTestRunner;

  // compile
  const baseCompile = sdkTestRunner.compile;
  sdkTestRunner.compile = async function compile(code, compileOptions?) {
    const result = await baseCompile(code, compileOptions);
    sdkTestRunner.context = createSdkContextTestHelper(
      sdkTestRunner.program,
      options,
      options.emitterName
    );
    return result;
  };

  // diagnose
  const baseDiagnose = sdkTestRunner.diagnose;
  sdkTestRunner.diagnose = async function diagnose(code, compileOptions?) {
    const result = await baseDiagnose(code, compileOptions);
    sdkTestRunner.context = createSdkContextTestHelper(
      sdkTestRunner.program,
      options,
      options.emitterName
    );
    return result;
  };

  // compile and diagnose
  const baseCompileAndDiagnose = sdkTestRunner.compileAndDiagnose;
  sdkTestRunner.compileAndDiagnose = async function compileAndDiagnose(code, compileOptions?) {
    const result = await baseCompileAndDiagnose(code, compileOptions);
    sdkTestRunner.context = createSdkContextTestHelper(
      sdkTestRunner.program,
      options,
      options.emitterName
    );
    return result;
  };

  // compile with dummy service definition
  sdkTestRunner.compileWithBuiltInService = async function compileWithBuiltInService(code) {
    const result = await baseCompile(
      `@service({title: "Test Service"}) namespace TestService;
    ${code}`,
      {
        noEmit: true,
      }
    );
    sdkTestRunner.context = createSdkContextTestHelper(
      sdkTestRunner.program,
      options,
      options.emitterName
    );
    return result;
  };

  const mainAutoCode = [
    ...host.libraries
      .filter((x) => x !== StandardTestLibrary)
      .map((x) => x.name)
      .map((x) => `import "${x}";`),
    ...(autoUsings ?? []).map((x) => `using ${x};`),
  ].join("\n");

  const clientAutoCode = [
    ...host.libraries
      .filter((x) => x !== StandardTestLibrary)
      .map((x) => x.name)
      .map((x) => `import "${x}";`),
    `import "./main.tsp";`,
    ...(autoUsings ?? []).map((x) => `using ${x};`),
  ].join("\n");

  // compile with client.tsp
  sdkTestRunner.compileWithCustomization = async function (mainCode, clientCode) {
    host.addTypeSpecFile("./main.tsp", `${mainAutoCode}${mainCode}`);
    host.addTypeSpecFile("./client.tsp", `${clientAutoCode}${clientCode}`);
    const result = await host.compile("./client.tsp");
    sdkTestRunner.context = createSdkContextTestHelper(
      sdkTestRunner.program,
      options,
      options.emitterName
    );
    return result;
  };

  // compile and diagnose with client.tsp
  sdkTestRunner.compileAndDiagnoseWithCustomization = async function (mainCode, clientCode) {
    host.addTypeSpecFile("./main.tsp", `${mainAutoCode}${mainCode}`);
    host.addTypeSpecFile("./client.tsp", `${clientAutoCode}${clientCode}`);
    const result = await host.compileAndDiagnose("./client.tsp");
    sdkTestRunner.context = createSdkContextTestHelper(
      sdkTestRunner.program,
      options,
      options.emitterName
    );
    return result;
  };

  return sdkTestRunner;
}

export async function createTcgcTestRunnerForEmitter(emitterName: string): Promise<SdkTestRunner> {
  const runner = await createSdkTestRunner({ emitterName });
  return runner;
}
