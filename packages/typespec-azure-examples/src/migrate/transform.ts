import type { MigratedRequest, MigratedResponse, MigratedVariant } from "./model.js";
import type { ParameterLocation, XmsExampleDoc } from "./swagger-types.js";

/**
 * Convert one `x-ms-examples` document into a {@link MigratedVariant}, using a map of
 * parameter-name → location (built from the operation's Swagger parameter definitions) to bucket
 * each example parameter into `request.path` / `query` / `headers` / `body`.
 *
 * The implicit `api-version` parameter is dropped. Parameters whose location is unknown (not
 * declared on the operation) default to `query`.
 */
export function transformExample(
  doc: XmsExampleDoc,
  paramLocations: ReadonlyMap<string, ParameterLocation>,
): MigratedVariant {
  const request: MigratedRequest = {};

  for (const [name, value] of Object.entries(doc.parameters ?? {})) {
    if (name.toLowerCase() === "api-version") continue;

    const location = paramLocations.get(name) ?? "query";
    switch (location) {
      case "body":
        request.body = value;
        break;
      case "path":
        (request.path ??= {})[name] = value;
        break;
      case "header":
        (request.headers ??= {})[name] = value;
        break;
      case "query":
      case "formData":
      default:
        (request.query ??= {})[name] = value;
        break;
    }
  }

  const responses: Record<string, MigratedResponse> = {};
  for (const [code, response] of Object.entries(doc.responses ?? {})) {
    const mapped: MigratedResponse = {};
    if (response && typeof response === "object") {
      if (response.headers !== undefined) mapped.headers = response.headers;
      if (response.body !== undefined) mapped.body = response.body;
    }
    responses[code] = mapped;
  }

  return { request, responses };
}
