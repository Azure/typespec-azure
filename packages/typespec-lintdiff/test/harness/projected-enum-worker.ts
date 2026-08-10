import {
  NodeHost,
  compile,
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

export interface ProjectedEnumResult {
  apiVersion: string;
  serviceCount: number;
  locations: Array<{
    sourceFile: string;
    line: number;
    column: number;
    emittedName: string;
  }>;
}

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
  if (
    !location ||
    program.getSourceFileLocationContext(location.file).type !== "project"
  ) {
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

function visitType(
  program: Program,
  type: Type,
  projectDir: string,
  locations: Map<string, ProjectedEnumResult["locations"][number]>,
  visited: Set<Type>,
): void {
  if (visited.has(type)) {
    return;
  }
  visited.add(type);

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
      visitType(program, type.type, projectDir, locations, visited);
      return;
    case "Model":
      for (const property of type.properties.values()) {
        visitType(program, property, projectDir, locations, visited);
      }
      if (type.baseModel) {
        visitType(program, type.baseModel, projectDir, locations, visited);
      }
      if (type.indexer) {
        visitType(program, type.indexer.value, projectDir, locations, visited);
      }
      return;
    case "Union":
      for (const variant of type.variants.values()) {
        visitType(program, variant.type, projectDir, locations, visited);
      }
      return;
    case "Tuple":
      for (const value of type.values) {
        visitType(program, value, projectDir, locations, visited);
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
        body.property
          ? resolveEncodedName(program, body.property, "application/json")
          : "$direct",
        projectDir,
        locations,
      );
    } else {
      visitType(program, body.type, projectDir, locations, visited);
    }
  }
  if ("parts" in body) {
    for (const part of body.parts) {
      visitBody(program, part.body, operation, projectDir, locations, visited);
    }
  }
}

function visitHttpOperation(
  program: Program,
  operation: HttpOperation,
  projectDir: string,
  locations: Map<string, ProjectedEnumResult["locations"][number]>,
): void {
  const visited = new Set<Type>();
  visitType(program, operation.operation.parameters, projectDir, locations, visited);
  visitType(program, operation.operation.returnType, projectDir, locations, visited);

  for (const property of operation.parameters.properties) {
    visitType(program, property.property, projectDir, locations, visited);
  }
  visitBody(
    program,
    operation.parameters.body,
    operation.operation,
    projectDir,
    locations,
    visited,
  );

  for (const response of operation.responses) {
    if (isBooleanScalar(response.type)) {
      addTarget(program, operation.operation, "$direct", projectDir, locations);
    }
    for (const content of response.responses) {
      for (const property of content.properties) {
        visitType(program, property.property, projectDir, locations, visited);
      }
      visitBody(
        program,
        content.body,
        operation.operation,
        projectDir,
        locations,
        visited,
      );
    }
  }
}

async function compileProgram(
  mainPath: string,
  configPath: string,
): Promise<Program> {
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
        visitHttpOperation(program, operation, projectDir, locations);
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
      visitHttpOperation(program, operation, projectDir, locations);
    }
  }

  if (serviceCount === 0) {
    throw new Error(`No service matched selected API version ${apiVersion}.`);
  }

  return {
    apiVersion,
    serviceCount,
    locations: [...locations.values()].sort(
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
    throw new Error(
      "Usage: projected-enum-worker.ts <main.tsp> <tspconfig.yaml> <api-version>",
    );
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
