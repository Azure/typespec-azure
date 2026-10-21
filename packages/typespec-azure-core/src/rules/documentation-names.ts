import {
  ignoreDiagnostics,
  isArrayModelType,
  resolveEncodedName,
  type Program,
} from "@typespec/compiler";
import {
  getHeaderFieldName,
  getHttpOperation,
  getHttpPart,
  getPathParamName,
  getQueryParamName,
} from "@typespec/http";
import { type DocumentationTarget } from "./documentation.js";

export function getDocumentationName(
  program: Program,
  target: DocumentationTarget,
  doc: string,
): string | undefined {
  switch (target.kind) {
    case "UnionVariant":
      return typeof target.name === "string"
        ? target.name
        : target.type.kind === "String"
          ? target.type.value
          : undefined;
    case "Operation":
      if (normalizeDocumentation(doc) === normalizeDocumentation(target.name)) {
        return target.name;
      }
      // HTTP validation owns resolution diagnostics; this rule only checks documentation.
      return ignoreDiagnostics(getHttpOperation(program, target)).verb;
    case "ModelProperty": {
      const emittedName =
        getPathParamName(program, target) ??
        getQueryParamName(program, target) ??
        getHeaderFieldName(program, target);
      if (emittedName !== undefined) {
        return emittedName;
      }
      const partType =
        target.type.kind === "Model" && isArrayModelType(target.type)
          ? target.type.indexer.value
          : target.type;
      const httpPart = getHttpPart(program, partType);
      return httpPart
        ? (httpPart.options.name ?? target.name)
        : resolveEncodedName(program, target, "application/json");
    }
    default:
      return "name" in target && typeof target.name === "string" ? target.name : undefined;
  }
}

export function normalizeDocumentation(value: string): string {
  return value.trim().replace(/\./g, "").toLowerCase();
}
