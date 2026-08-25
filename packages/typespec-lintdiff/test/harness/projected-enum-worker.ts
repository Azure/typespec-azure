import {
  NodeHost,
  compile,
  getLocationContext,
  getSourceLocation,
  listServices,
  navigateTypesInNamespace,
  resolveCompilerOptions,
  resolveEncodedName,
  type DiagnosticTarget,
  type Operation,
  type Program,
  type Type,
} from "@typespec/compiler";
import { unsafe_mutateSubgraphWithNamespace } from "@typespec/compiler/experimental";
import { getHttpService, type HttpOperation, type HttpPayloadBody } from "@typespec/http";
import { getVersioningMutators } from "@typespec/versioning";
import * as path from "path";
import { pathToFileURL } from "url";
import { isPointOperationPath } from "../../src/rules/point-operation-path.js";

export interface ProjectedHttpGraphResult {
  apiVersion: string;
  serviceCount: number;
  reachableLocations: Array<{
    sourceFile: string;
    line: number;
    column: number;
  }>;
  locations: Array<{
    sourceFile: string;
    line: number;
    column: number;
    emittedName: string;
  }>;
  queryParameterLocations: Array<{
    sourceFile: string;
    line: number;
    column: number;
    name: string;
    verb: string;
  }>;
}

export type ProjectedEnumResult = ProjectedHttpGraphResult;

const pointOperationVerbs = new Set(["get", "put", "patch", "delete"]);

function isBooleanScalar(type: Type): boolean {
  return type.kind === "ModelProperty"
    ? isBooleanScalar(type.type)
    : type.kind === "Scalar" && type.name === "boolean";
}

function relativeSourcePath(sourceFile: string, projectDir: string): string {
  const relative = path.relative(projectDir, sourceFile).replace(/\\/g, "/");
  if (relative && !path.isAbsolute(relative)) {
    return relative;
  }
  return sourceFile.replace(/\\/g, "/");
}

function locationKey(
  program: Program,
  target: DiagnosticTarget,
  projectDir: string,
): { key: string; sourceFile: string; line: number; column: number } | undefined {
  const location = getSourceLocation(target, { locateId: true });
  if (!location || getLocationContext(program, target).type !== "project") {
    return undefined;
  }
  const position = location.file.getLineAndCharacterOfPosition(location.pos);
  const sourceFile = relativeSourcePath(location.file.path, projectDir);
  const line = position.line + 1;
  const column = position.character + 1;
  return {
    key: `${sourceFile}\0${line}\0${column}`,
    sourceFile,
    line,
    column,
  };
}

function addTarget(
  program: Program,
  target: DiagnosticTarget,
  emittedName: string,
  projectDir: string,
  locations: Map<string, ProjectedEnumResult["locations"][number]>,
): void {
  const location = locationKey(program, target, projectDir);
  if (location) {
    locations.set(location.key, {
      sourceFile: location.sourceFile,
      line: location.line,
      column: location.column,
      emittedName,
    });
  }
}

function addReachableTarget(
  program: Program,
  target: DiagnosticTarget,
  projectDir: string,
  locations: Map<string, ProjectedHttpGraphResult["reachableLocations"][number]>,
): void {
  const location = locationKey(program, target, projectDir);
  if (location) {
    locations.set(location.key, {
      sourceFile: location.sourceFile,
      line: location.line,
      column: location.column,
    });
  }
}

function visitType(
  program: Program,
  type: Type,
  projectDir: string,
  locations: Map<string, ProjectedEnumResult["locations"][number]>,
  reachableLocations: Map<string, ProjectedHttpGraphResult["reachableLocations"][number]>,
  visited: Set<Type>,
): void {
  if (visited.has(type)) {
    return;
  }
  visited.add(type);
  addReachableTarget(program, type, projectDir, reachableLocations);

  switch (type.kind) {
    case "ModelProperty":
      if (isBooleanScalar(type)) {
        addTarget(
          program,
          type,
          resolveEncodedName(program, type, "application/json"),
          projectDir,
          locations,
        );
      }
      visitType(program, type.type, projectDir, locations, reachableLocations, visited);
      return;
    case "Model":
      for (const property of type.properties.values()) {
        visitType(program, property, projectDir, locations, reachableLocations, visited);
      }
      if (type.baseModel) {
        visitType(program, type.baseModel, projectDir, locations, reachableLocations, visited);
      }
      if (type.indexer) {
        visitType(program, type.indexer.value, projectDir, locations, reachableLocations, visited);
      }
      return;
    case "Union":
      for (const variant of type.variants.values()) {
        visitType(program, variant.type, projectDir, locations, reachableLocations, visited);
      }
      return;
    case "Tuple":
      for (const value of type.values) {
        visitType(program, value, projectDir, locations, reachableLocations, visited);
      }
      return;
    default:
      return;
  }
}

function visitBody(
  program: Program,
  body: HttpPayloadBody | undefined,
  operation: Operation,
  projectDir: string,
  locations: Map<string, ProjectedEnumResult["locations"][number]>,
  reachableLocations: Map<string, ProjectedHttpGraphResult["reachableLocations"][number]>,
  visited: Set<Type>,
): void {
  if (!body) {
    return;
  }
  if ("type" in body) {
    if (isBooleanScalar(body.type)) {
      addTarget(
        program,
        body.property ?? operation,
        body.property ? resolveEncodedName(program, body.property, "application/json") : "$direct",
        projectDir,
        locations,
      );
    } else {
      visitType(program, body.type, projectDir, locations, reachableLocations, visited);
    }
  }
  if ("parts" in body) {
    for (const part of body.parts) {
      visitBody(program, part.body, operation, projectDir, locations, reachableLocations, visited);
    }
  }
}

function visitHttpOperation(
  program: Program,
  operation: HttpOperation,
  projectDir: string,
  locations: Map<string, ProjectedEnumResult["locations"][number]>,
  reachableLocations: Map<string, ProjectedHttpGraphResult["reachableLocations"][number]>,
): void {
  const visited = new Set<Type>();
  addReachableTarget(program, operation.operation, projectDir, reachableLocations);
  visitType(
    program,
    operation.operation.parameters,
    projectDir,
    locations,
    reachableLocations,
    visited,
  );
  visitType(
    program,
    operation.operation.returnType,
    projectDir,
    locations,
    reachableLocations,
    visited,
  );

  for (const property of operation.parameters.properties) {
    visitType(program, property.property, projectDir, locations, reachableLocations, visited);
  }

  visitBody(
    program,
    operation.parameters.body,
    operation.operation,
    projectDir,
    locations,
    reachableLocations,
    visited,
  );

  for (const response of operation.responses) {
    if (isBooleanScalar(response.type)) {
      addTarget(program, operation.operation, "$direct", projectDir, locations);
    }
    for (const content of response.responses) {
      for (const property of content.properties) {
        visitType(program, property.property, projectDir, locations, reachableLocations, visited);
      }
      visitBody(
        program,
        content.body,
        operation.operation,
        projectDir,
        locations,
        reachableLocations,
        visited,
      );
    }
  }
}

function collectQueryParameterLocations(
  program: Program,
  operation: HttpOperation,
  projectDir: string,
  locations: Map<string, ProjectedEnumResult["queryParameterLocations"][number]>,
): void {
  if (!pointOperationVerbs.has(operation.verb) || !isPointOperationPath(operation.path)) {
    return;
  }

  for (const parameter of operation.parameters.parameters) {
    if (parameter.type !== "query" || parameter.name.toLowerCase() === "api-version") {
      continue;
    }
    const location = locationKey(program, parameter.param, projectDir);
    if (location) {
      locations.set(location.key, {
        sourceFile: location.sourceFile,
        line: location.line,
        column: location.column,
        name: parameter.name,
        verb: operation.verb,
      });
    }
  }
}

async function compileProgram(mainPath: string, configPath: string): Promise<Program> {
  const projectDir = path.dirname(mainPath);
  const [options, configDiagnostics] = await resolveCompilerOptions(NodeHost, {
    cwd: projectDir,
    entrypoint: mainPath,
    configPath,
    overrides: {
      emit: [],
      options: {},
    },
  });
  const configErrors = configDiagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (configErrors.length > 0) {
    throw new Error(`Unable to resolve TypeSpec configuration: ${configErrors[0].message}`);
  }
  return compile(NodeHost, mainPath, {
    ...options,
    emit: [],
    noEmit: true,
    warningAsError: false,
  });
}

export async function collectProjectedEnumLocations(
  mainPath: string,
  configPath: string,
  apiVersion: string,
): Promise<ProjectedEnumResult> {
  const projectDir = path.dirname(mainPath);
  const program = await compileProgram(mainPath, configPath);
  if (program.hasError()) {
    const error = program.diagnostics.find((diagnostic) => diagnostic.severity === "error");
    throw new Error(`Projected TypeSpec compilation failed: ${error?.message ?? "unknown error"}`);
  }

  const locations = new Map<string, ProjectedEnumResult["locations"][number]>();
  const reachableLocations = new Map<
    string,
    ProjectedHttpGraphResult["reachableLocations"][number]
  >();
  const queryParameterLocations = new Map<
    string,
    ProjectedEnumResult["queryParameterLocations"][number]
  >();
  let serviceCount = 0;
  for (const service of listServices(program)) {
    const versioning = getVersioningMutators(program, service.type);
    if (versioning?.kind === "versioned") {
      const snapshot = versioning.snapshots.find(
        (candidate) => candidate.version.value === apiVersion,
      );
      if (!snapshot) {
        continue;
      }
      const projected = unsafe_mutateSubgraphWithNamespace(
        program,
        [snapshot.mutator],
        service.type,
      );
      const [httpService] = getHttpService(program, projected.type);
      serviceCount++;
      navigateTypesInNamespace(projected.type, {
        modelProperty: (property) => {
          if (isBooleanScalar(property)) {
            addTarget(
              program,
              property,
              resolveEncodedName(program, property, "application/json"),
              projectDir,
              locations,
            );
          }
        },
      });
      for (const operation of httpService.operations) {
        visitHttpOperation(program, operation, projectDir, locations, reachableLocations);
        collectQueryParameterLocations(program, operation, projectDir, queryParameterLocations);
      }
      continue;
    }

    const namespace =
      versioning?.kind === "transient"
        ? unsafe_mutateSubgraphWithNamespace(program, [versioning.mutator], service.type).type
        : service.type;
    const [httpService] = getHttpService(program, namespace);
    serviceCount++;
    navigateTypesInNamespace(namespace, {
      modelProperty: (property) => {
        if (isBooleanScalar(property)) {
          addTarget(
            program,
            property,
            resolveEncodedName(program, property, "application/json"),
            projectDir,
            locations,
          );
        }
      },
    });
    for (const operation of httpService.operations) {
      visitHttpOperation(program, operation, projectDir, locations, reachableLocations);
      collectQueryParameterLocations(program, operation, projectDir, queryParameterLocations);
    }
  }

  if (serviceCount === 0) {
    throw new Error(`No service matched selected API version ${apiVersion}.`);
  }

  return {
    apiVersion,
    serviceCount,
    reachableLocations: [...reachableLocations.values()].sort(
      (left, right) =>
        left.sourceFile.localeCompare(right.sourceFile) ||
        left.line - right.line ||
        left.column - right.column,
    ),
    locations: [...locations.values()].sort(
      (left, right) =>
        left.sourceFile.localeCompare(right.sourceFile) ||
        left.line - right.line ||
        left.column - right.column,
    ),
    queryParameterLocations: [...queryParameterLocations.values()].sort(
      (left, right) =>
        left.sourceFile.localeCompare(right.sourceFile) ||
        left.line - right.line ||
        left.column - right.column,
    ),
  };
}

async function main(): Promise<void> {
  const [mainPath, configPath, apiVersion] = process.argv.slice(2);
  if (!mainPath || !configPath || !apiVersion) {
    throw new Error("Usage: projected-enum-worker.ts <main.tsp> <tspconfig.yaml> <api-version>");
  }
  process.stdout.write(
    JSON.stringify(
      await collectProjectedEnumLocations(
        path.resolve(mainPath),
        path.resolve(configPath),
        apiVersion,
      ),
    ),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  });
}
