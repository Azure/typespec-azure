import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

const [inputFile, outputFile] = process.argv.slice(2);
if (!inputFile || !outputFile) throw new Error("Expected input and output receipt filenames.");
const input = JSON.parse(fs.readFileSync(inputFile, "utf8"));
const { specsRepo, project, tspRules, scope } = input;
const requireFromSpecs = createRequire(path.join(specsRepo, "package.json"));
const packages = [];
let rawDiagnostics = [];
let ambientDiagnostics = [];
let compiler;

async function identify(name, baseFile = path.join(specsRepo, "package.json")) {
  const resolved =
    compiler &&
    (await compiler.resolveModule(
      {
        realpath: fs.promises.realpath,
        stat: fs.promises.stat,
        readFile: (file) => fs.promises.readFile(file, "utf8"),
      },
      name,
      { baseDir: path.dirname(baseFile), conditions: ["import"] },
    ));
  const entrypoint = fs.realpathSync(
    resolved
      ? resolved.type === "module"
        ? resolved.mainFile
        : resolved.path
      : createRequire(baseFile).resolve(name),
  );
  let directory = path.dirname(entrypoint);
  while (true) {
    const manifestPath = path.join(directory, "package.json");
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (manifest.name === name) {
        packages.push({
          name,
          version: manifest.version,
          entrypoint,
          sha256: createHash("sha256").update(fs.readFileSync(entrypoint)).digest("hex"),
        });
        return entrypoint;
      }
    }
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error(`Cannot identify installed package ${name}.`);
    directory = parent;
  }
}

async function load(name, baseFile) {
  return import(pathToFileURL(await identify(name, baseFile)).href);
}

async function run() {
  compiler = await load("@typespec/compiler");
  const { NodeHost, compile, resolveCompilerOptions, getSourceLocation, listServices } = compiler;
  for (const rule of tspRules) {
    const separator = rule.lastIndexOf("/");
    const library = await load(rule.slice(0, separator));
    if (
      !library.$linter?.rules.some((definition) => definition.name === rule.slice(separator + 1))
    ) {
      throw new Error(`The injected library does not register ${rule}.`);
    }
    const requireFromLibrary = createRequire(
      packages.find((item) => item.name === rule.slice(0, separator)).entrypoint,
    );
    if (
      fs.realpathSync(requireFromLibrary.resolve("@typespec/compiler")) !== packages[0].entrypoint
    ) {
      throw new Error(`The injected ${rule} resolves a different compiler instance.`);
    }
  }
  await identify("@azure-tools/typespec-autorest");
  await identify("autorest");
  const validatorEntrypoint = await identify("@microsoft.azure/openapi-validator");
  await identify("@microsoft.azure/openapi-validator-core", validatorEntrypoint);
  const validator = await load("@microsoft.azure/openapi-validator-rulesets", validatorEntrypoint);
  const spectralRules = {
    ...validator.spectralRulesets.azCommon.rules,
    ...validator.spectralRulesets.azARM.rules,
  };
  const nativeRules = {
    ...validator.nativeRulesets.azCommon.rules,
    ...validator.nativeRulesets.azArm.rules,
  };
  if (
    !Object.hasOwn(spectralRules, input.validatorRule) &&
    !Object.hasOwn(nativeRules, input.validatorRule)
  ) {
    throw new Error(`Unknown production ARM validator rule: ${input.validatorRule}`);
  }
  const projectDir = path.resolve(specsRepo, project.sourcePath);
  const mainPath = path.join(projectDir, "main.tsp");
  const [options, configDiagnostics] = await resolveCompilerOptions(NodeHost, {
    cwd: projectDir,
    entrypoint: mainPath,
    overrides: { emit: [], options: {} },
  });
  const defaultProgram = await compile(NodeHost, mainPath, {
    ...options,
    emit: [],
    noEmit: true,
    warningAsError: false,
  });
  const defaultTargetDiagnostics = defaultProgram.diagnostics
    .filter((diagnostic) => tspRules.includes(diagnostic.code))
    .map((diagnostic) => ({ rule: diagnostic.code, message: diagnostic.message }));
  const canonical = (name) => defaultProgram.diagnosticCodeResolver?.resolveCode(name) ?? name;
  const targetOptions = Object.fromEntries(tspRules.map((rule) => [rule, true]));
  // Opt-in changes activation, not the last configured options of a disabled rule.
  async function collectTargetOptions(ruleSet, baseDir, stack = []) {
    for (const reference of ruleSet.extends ?? []) {
      const identity = reference.startsWith("file:")
        ? path.resolve(baseDir, reference.slice("file:".length))
        : canonical(reference);
      if (stack.includes(identity)) throw new Error(`Cyclic lint ruleset: ${identity}`);
      let inherited;
      let directory = baseDir;
      if (reference.startsWith("file:")) {
        const requireFromCompiler = createRequire(packages[0].entrypoint);
        inherited = requireFromCompiler("yaml").parse(fs.readFileSync(identity, "utf8")) ?? {};
        directory = path.dirname(identity);
      } else {
        const separator = identity.lastIndexOf("/");
        const name = identity.slice(0, separator);
        if (name === "@typespec/compiler") continue;
        const library = await load(name);
        inherited =
          library.$linter &&
          compiler.resolveLinterDefinition(name, library.$linter).ruleSets[
            identity.slice(separator + 1)
          ];
        if (!inherited) throw new Error(`Cannot resolve inherited lint ruleset: ${identity}`);
      }
      await collectTargetOptions(inherited, directory, [...stack, identity]);
    }
    for (const [name, value] of Object.entries(ruleSet.enable ?? {})) {
      const rule = canonical(name);
      if (tspRules.includes(rule) && value !== false) targetOptions[rule] = value;
    }
  }
  await collectTargetOptions(options.linterRuleSet ?? {}, projectDir);
  const enable = { ...options.linterRuleSet?.enable };
  const disable = { ...options.linterRuleSet?.disable };
  for (const map of [enable, disable]) {
    for (const name of Object.keys(map)) {
      if (tspRules.includes(canonical(name))) delete map[name];
    }
  }
  const program = await compile(NodeHost, mainPath, {
    ...options,
    emit: [],
    noEmit: true,
    warningAsError: false,
    linterRuleSet: {
      ...options.linterRuleSet,
      disable,
      enable: { ...enable, ...targetOptions },
    },
  });
  const location = (target) => {
    const source = getSourceLocation(target, { locateId: true });
    if (!source || source.isSynthetic) return {};
    const position = source.file.getLineAndCharacterOfPosition(source.pos);
    return {
      sourceFile: path.relative(projectDir, source.file.path).replaceAll("\\", "/"),
      line: position.line + 1,
      column: position.character + 1,
    };
  };
  const diagnostics = [
    ...configDiagnostics,
    ...defaultProgram.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    ...program.diagnostics,
  ];
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  ambientDiagnostics = diagnostics
    .filter((diagnostic) => !tspRules.includes(diagnostic.code))
    .map((diagnostic) => ({
      rule: diagnostic.code,
      severity: diagnostic.severity,
      message: diagnostic.message,
      ...location(diagnostic.target),
    }));
  rawDiagnostics = diagnostics
    .filter((diagnostic) => tspRules.includes(diagnostic.code))
    .map((diagnostic) => ({
      rule: diagnostic.code,
      message: diagnostic.message,
      ...location(diagnostic.target),
    }));
  if (errors.length > 0) {
    return {
      project: project.sourcePath,
      status: "failed",
      error: errors.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join("\n"),
      rawDiagnostics,
      diagnostics: [],
      ambientDiagnostics,
      packages,
      defaultTargetDiagnostics,
    };
  }
  if (scope === "source") {
    return {
      project: project.sourcePath,
      status: "success",
      rawDiagnostics,
      diagnostics: rawDiagnostics,
      ambientDiagnostics,
      packages,
      defaultTargetDiagnostics,
    };
  }
  if (!project.apiVersion) throw new Error("Selected Swagger API version is missing.");
  const http = await load("@typespec/http");
  const versioning = await load("@typespec/versioning");
  const experimental = await import(
    pathToFileURL(requireFromSpecs.resolve("@typespec/compiler/experimental")).href
  );
  const typekit = await import(
    pathToFileURL(requireFromSpecs.resolve("@typespec/compiler/typekit")).href
  );
  const tk = typekit.$(program);
  const allowed = new Set();
  const key = (value) =>
    value.sourceFile === undefined
      ? undefined
      : JSON.stringify([value.sourceFile, value.line, value.column]);
  const add = (target) => {
    const identity = key(location(target));
    if (identity !== undefined) allowed.add(identity);
  };
  const boolean = (type) =>
    type?.kind === "ModelProperty"
      ? tk.scalar.isBoolean(type.type)
      : type && tk.scalar.isBoolean(type);
  const visit = (type, visited) => {
    if (!type || visited.has(type)) return;
    visited.add(type);
    if (scope === "http-reachable" || (type.kind === "ModelProperty" && boolean(type))) add(type);
    switch (type.kind) {
      case "ModelProperty":
        visit(type.type, visited);
        break;
      case "Model":
        for (const property of type.properties.values()) visit(property, visited);
        visit(type.baseModel, visited);
        visit(type.indexer?.value, visited);
        break;
      case "Union":
        for (const variant of type.variants.values()) visit(variant.type, visited);
        break;
      case "Tuple":
        for (const value of type.values) visit(value, visited);
        break;
    }
  };
  const visitBody = (body, operation, visited) => {
    if (!body) return;
    if ("type" in body) {
      if (scope === "boolean-http" && boolean(body.type)) add(body.property ?? operation);
      visit(body.type, visited);
    }
    if ("parts" in body) {
      for (const part of body.parts) visitBody(part.body, operation, visited);
    }
  };
  let serviceCount = 0;
  for (const service of listServices(program)) {
    const mutators = versioning.getVersioningMutators(program, service.type);
    let namespace = service.type;
    if (mutators?.kind === "versioned") {
      const snapshot = mutators.snapshots.find(
        (snapshot) => snapshot.version.value === project.apiVersion,
      );
      if (!snapshot) continue;
      namespace = experimental.unsafe_mutateSubgraphWithNamespace(
        program,
        [snapshot.mutator],
        namespace,
      ).type;
    } else if (mutators?.kind === "transient") {
      namespace = experimental.unsafe_mutateSubgraphWithNamespace(
        program,
        [mutators.mutator],
        namespace,
      ).type;
    }
    const [serviceGraph, httpDiagnostics] = http.getHttpService(program, namespace);
    for (const diagnostic of httpDiagnostics) {
      ambientDiagnostics.push({
        rule: diagnostic.code,
        severity: diagnostic.severity,
        message: diagnostic.message,
        ...location(diagnostic.target),
      });
    }
    if (httpDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
      throw new Error(
        "Selected-version HTTP metadata resolution failed; inspect ambient diagnostics.",
      );
    }
    serviceCount++;
    for (const operation of serviceGraph.operations) {
      const visited = new Set();
      if (scope === "http-reachable" || boolean(operation.operation.returnType))
        add(operation.operation);
      visit(operation.operation.parameters, visited);
      visit(operation.operation.returnType, visited);
      for (const parameter of operation.parameters.parameters) visit(parameter.param, visited);
      visitBody(operation.parameters.body, operation.operation, visited);
      for (const response of operation.responses) {
        for (const content of response.responses) {
          visitBody(content.body, operation.operation, visited);
        }
      }
    }
  }
  if (serviceCount === 0)
    throw new Error(`No HTTP service matched API version ${project.apiVersion}.`);
  return {
    project: project.sourcePath,
    status: "success",
    apiVersion: project.apiVersion,
    rawDiagnostics,
    diagnostics: rawDiagnostics.filter((diagnostic) => allowed.has(key(diagnostic))),
    alignment: { scope, serviceCount, locations: [...allowed].sort() },
    ambientDiagnostics,
    packages,
    defaultTargetDiagnostics,
  };
}

try {
  fs.writeFileSync(outputFile, `${JSON.stringify(await run(), null, 2)}\n`);
} catch (error) {
  fs.writeFileSync(
    outputFile,
    `${JSON.stringify(
      {
        project: project.sourcePath,
        status: "failed",
        error: error instanceof Error ? error.stack : String(error),
        rawDiagnostics,
        diagnostics: [],
        ambientDiagnostics,
        packages,
      },
      null,
      2,
    )}\n`,
  );
  process.exitCode = 1;
}
