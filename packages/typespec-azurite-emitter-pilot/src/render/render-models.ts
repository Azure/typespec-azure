import type { ServerModel } from "../model.js";
import { renderFileHeader, renderTypeRef } from "./type-ref.js";

/**
 * Renders the `models.ts` artifact: one TypeScript interface per named data model
 * referenced by the service's operations (request/response bodies).
 */
export function renderModels(serverModel: ServerModel): string {
  const parts: string[] = [renderFileHeader()];

  for (const model of serverModel.models) {
    if (model.doc) {
      parts.push(`/** ${model.doc} */`);
    }
    parts.push(`export interface ${model.name} {`);
    for (const prop of model.properties) {
      if (prop.doc) {
        parts.push(`  /** ${prop.doc} */`);
      }
      parts.push(`  ${prop.name}${prop.optional ? "?" : ""}: ${renderTypeRef(prop.type)};`);
    }
    parts.push(`}`, "");
  }

  return parts.join("\n");
}
