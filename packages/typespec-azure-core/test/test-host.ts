import { Diagnostic, listServices, Model, Namespace, Program } from "@typespec/compiler";
import { unsafe_mutateSubgraphWithNamespace } from "@typespec/compiler/experimental";
import { BasicTestRunner, createTestHost, createTestWrapper } from "@typespec/compiler/testing";
import {
  getAllHttpServices,
  HttpOperation,
  HttpOperationParameter,
  HttpVerb,
} from "@typespec/http";
import { HttpTestLibrary } from "@typespec/http/testing";
import { OpenAPITestLibrary } from "@typespec/openapi/testing";
import { RestTestLibrary } from "@typespec/rest/testing";
import { getVersioningMutators } from "@typespec/versioning";
import { VersioningTestLibrary } from "@typespec/versioning/testing";
import { strictEqual } from "assert";
import { AzureCoreTestLibrary } from "../src/testing/index.js";

export async function createAzureCoreTestHost() {
  return createTestHost({
    libraries: [
      AzureCoreTestLibrary,
      HttpTestLibrary,
      RestTestLibrary,
      VersioningTestLibrary,
      OpenAPITestLibrary,
    ],
  });
}
const CommonCode = `
  import "${AzureCoreTestLibrary.name}";
  import "${HttpTestLibrary.name}";
  import "${RestTestLibrary.name}";
  import "${VersioningTestLibrary.name}";
  import "${OpenAPITestLibrary.name}";
  using TypeSpec.Http;
  using TypeSpec.Rest;
  using TypeSpec.Versioning;
  using Azure.Core;\n`;

export function getRunnerPosOffset(pos: number): number {
  return CommonCode.length + pos;
}
export async function createAzureCoreTestRunner(
  options: {
    omitServiceNamespace?: boolean;
  } = {},
): Promise<BasicTestRunner> {
  const host = await createAzureCoreTestHost();
  const serviceNamespace = options.omitServiceNamespace
    ? ""
    : `@useDependency(Azure.Core.Versions.v1_0_Preview_2) @service namespace Azure.MyService;\n`;
  return createTestWrapper(host, {
    autoImports: [],
    wrapper: (code) => `${CommonCode}${serviceNamespace}${code}`,
    compilerOptions: {
      miscOptions: { "disable-linter": true },
    },
  });
}

export async function getOperations(
  code: string,
): Promise<[HttpOperation[], readonly Diagnostic[], BasicTestRunner]> {
  const runner = await createAzureCoreTestRunner();
  await runner.compileAndDiagnose(code, { noEmit: true });
  const [services] = getAllHttpServices(runner.program);
  return [services[0].operations, runner.program.diagnostics, runner];
}

export interface SimpleHttpOperation {
  name: string;
  verb: HttpVerb;
  path: string;
  params: {
    params: Array<{ name: string; type: HttpOperationParameter["type"] }>;
    /**
     * name of explicit `@body` parameter or array of unannotated parameter names that make up the body.
     */
    body?: string | string[];
  };
  responseProperties: string[];
}

export async function getSimplifiedOperations(
  code: string,
): Promise<[SimpleHttpOperation[], readonly Diagnostic[]]> {
  const [routes, diagnostics] = await getOperations(code);

  const details = routes.map((r) => {
    return {
      name: r.operation.name,
      verb: r.verb,
      path: r.path,
      params: {
        params: r.parameters.parameters.map(({ type, name }) => ({ type, name })),
        body:
          r.parameters.body?.property?.name ??
          (r.parameters.body?.type?.kind === "Model"
            ? Array.from(r.parameters.body.type.properties.keys())
            : undefined),
      },
      responseProperties: Array.from((r.responses[0].type as Model).properties ?? []).map(
        ([k, v]) => k,
      ),
    };
  });

  return [details, diagnostics];
}

export function getServiceForVersion(program: Program, version: string): Namespace {
  const services = listServices(program);
  const result = getVersioningMutators(program, services[0].type);
  strictEqual(result?.kind, "versioned");
  const snapshot = result.snapshots.find(
    (v) => v.version.value === version || v.version.name === version,
  );

  if (snapshot) {
    const subgraph = unsafe_mutateSubgraphWithNamespace(
      program,
      [snapshot.mutator],
      services[0].type,
    );
    return subgraph.type as Namespace;
  }

  throw new Error(`Version '${version}' not found!`);
}
