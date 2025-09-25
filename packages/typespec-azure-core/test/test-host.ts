import {
  Diagnostic,
  listServices,
  Model,
  Namespace,
  Program,
  resolvePath,
} from "@typespec/compiler";
import { unsafe_mutateSubgraphWithNamespace } from "@typespec/compiler/experimental";
import { createTester, TesterInstance } from "@typespec/compiler/testing";
import {
  getAllHttpServices,
  HttpOperation,
  HttpOperationParameter,
  HttpVerb,
} from "@typespec/http";
import { getVersioningMutators } from "@typespec/versioning";
import { strictEqual } from "assert";

export const Tester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@typespec/openapi",
    "@azure-tools/typespec-azure-core",
  ],
})
  .import(
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
  )
  .using("Http", "Rest", "Versioning", "Azure.Core");

export const TesterWithService = Tester.wrap((code) => {
  return `
    @service namespace Azure.MyService;
    ${code}
  `;
});

export async function getOperations(
  code: string,
): Promise<[HttpOperation[], readonly Diagnostic[], TesterInstance]> {
  const tester = await TesterWithService.createInstance();
  const [{ program }] = await tester.compileAndDiagnose(code);
  const [services] = getAllHttpServices(program);
  return [services[0].operations, program.diagnostics, tester];
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
