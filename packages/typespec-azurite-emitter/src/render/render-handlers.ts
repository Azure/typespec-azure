import type { ServerModel } from "../model.js";
import { renderFileHeader } from "./type-ref.js";

export function renderHandlers(serverModel: ServerModel): string {
  const parts: string[] = [
    renderFileHeader(),
    `import type {`,
    ...serverModel.operations.map((op) => `  ${op.name}Parameters,`),
    ...serverModel.operations.map((op) => `  ${op.name}Response,`),
    `} from "./operations.js";`,
    "",
    `export interface Context {`,
    `  readonly contextId: string;`,
    `}`,
    "",
    `export interface IServiceHandler {`,
  ];

  for (const op of serverModel.operations) {
    const methodName = op.name[0].toLowerCase() + op.name.slice(1);
    if (op.doc) {
      parts.push(`  /** ${op.doc} */`);
    }
    parts.push(
      `  ${methodName}(params: ${op.name}Parameters, context: Context): Promise<${op.name}Response>;`,
    );
  }

  parts.push(`}`, "");
  return parts.join("\n");
}
