import { Entity, Program, resolvePath } from "@typespec/compiler";
import {
  TestCompileResult,
  TesterInstance,
  createTester,
  resolveVirtualPath,
} from "@typespec/compiler/testing";
import { CreateSdkContextOptions, createSdkContext } from "../src/context.js";
import { SdkContext, SdkHttpOperation, SdkServiceOperation } from "../src/interfaces.js";
import { BrandedSdkEmitterOptionsInterface } from "../src/internal-utils.js";

export interface SdkTesterOptions extends BrandedSdkEmitterOptionsInterface {
  emitterName?: string;
  autoImports?: string[];
  autoUsings?: string[];
  packageName?: string;
}

export const TcgcTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-client-generator-core",
  ],
})
  .importLibraries()
  .using("Http", "Rest", "Versioning", "Azure.ClientGenerator.Core");

export interface TcgcTesterInstance extends TesterInstance {
  context: SdkContext<SdkTesterOptions, SdkHttpOperation>;
  compileWithBuiltInService(code: string): Promise<TestCompileResult<Record<string, Entity>>>;
}

export async function createTcgcTesterInstance(
  options: SdkTesterOptions = {},
  sdkContextOption?: CreateSdkContextOptions,
): Promise<TcgcTesterInstance> {
  const instance = (await TcgcTester.createInstance()) as TcgcTesterInstance;

  // Store original methods
  const originalCompile = instance.compile.bind(instance);
  const originalDiagnose = instance.diagnose.bind(instance);
  const originalCompileAndDiagnose = instance.compileAndDiagnose.bind(instance);

  // Helper to create SDK context
  async function createSdkContextTestHelper<
    TOptions extends Record<string, any> = SdkTesterOptions,
    TServiceOperation extends SdkServiceOperation = SdkHttpOperation,
  >(
    program: Program,
    options: TOptions,
    sdkContextOption?: CreateSdkContextOptions,
  ): Promise<SdkContext<TOptions, TServiceOperation>> {
    const emitContext = {
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

  // Override compile to create SDK context
  instance.compile = async (code, compileOptions?) => {
    const result = await originalCompile(code, compileOptions);
    instance.context = await createSdkContextTestHelper(
      instance.program,
      options,
      sdkContextOption,
    );
    return result;
  };

  // Override diagnose to create SDK context
  instance.diagnose = async (code, compileOptions?) => {
    const result = await originalDiagnose(code, compileOptions);
    instance.context = await createSdkContextTestHelper(
      instance.program,
      options,
      sdkContextOption,
    );
    return result;
  };

  // Override compileAndDiagnose to create SDK context
  instance.compileAndDiagnose = async (code, compileOptions?) => {
    const result = await originalCompileAndDiagnose(code, compileOptions);
    instance.context = await createSdkContextTestHelper(
      instance.program,
      options,
      sdkContextOption,
    );
    return result;
  };

  // Add compileWithBuiltInService method
  instance.compileWithBuiltInService = async (code: string) => {
    const result = await originalCompile(
      `@service(#{title: "Test Service"}) namespace TestService;
    ${code}`,
      {
        compilerOptions: {
          noEmit: true,
        },
      },
    );
    instance.context = await createSdkContextTestHelper(
      instance.program,
      options,
      sdkContextOption,
    );
    return result;
  };

  return instance;
}
