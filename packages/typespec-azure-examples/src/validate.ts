import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import { type LoadedExampleFile, positionAt } from "./loader.js";
import { checkFilePlacement, checkSemantics, type SemanticContext } from "./rules.js";
import { ExamplesYamlSchema } from "./schema.js";
import type { ExampleDiagnostic } from "./types.js";

let cachedValidator: ValidateFunction | undefined;

function getValidator(): ValidateFunction {
  if (cachedValidator === undefined) {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    cachedValidator = ajv.compile(ExamplesYamlSchema);
  }
  return cachedValidator;
}

/** Run JSON Schema (structural) validation of a single file against the generated schema. */
export function checkStructure(file: LoadedExampleFile): ExampleDiagnostic[] {
  if (file.data === undefined) return [];
  const validate = getValidator();
  const valid = validate(file.data);
  if (valid || !validate.errors) return [];
  return validate.errors.map((error) => structuralDiagnostic(file, error));
}

function structuralDiagnostic(file: LoadedExampleFile, error: ErrorObject): ExampleDiagnostic {
  const instancePath = error.instancePath;
  const path = instancePath
    .split("/")
    .slice(1)
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"))
    .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
  const node =
    path.length > 0
      ? (file.document.getIn(path, true) as { range?: [number, number, number] })
      : undefined;
  const loc = positionAt(file, node?.range?.[0]);
  const location = instancePath === "" ? "<root>" : instancePath;
  return {
    code: "schema-validation",
    message: `${location} ${error.message ?? "is invalid"}`,
    severity: "error",
    file: file.path,
    line: loc?.line,
    col: loc?.col,
  };
}

/**
 * Validate a set of loaded example files. Runs, per file: fatal parse errors, JSON Schema
 * (structural) validation, and the RFC §3 semantic rules; then the cross-file placement rules.
 */
export function validateExampleFiles(
  files: LoadedExampleFile[],
  ctx: SemanticContext = {},
): ExampleDiagnostic[] {
  const diagnostics: ExampleDiagnostic[] = [];

  for (const file of files) {
    if (file.parseError !== undefined) {
      diagnostics.push({
        code: "yaml-parse-error",
        message: `Failed to parse YAML: ${file.parseError}`,
        severity: "error",
        file: file.path,
      });
      continue;
    }
    diagnostics.push(...checkStructure(file));
    diagnostics.push(...checkSemantics(file, ctx));
  }

  diagnostics.push(...checkFilePlacement(files));

  return diagnostics;
}
